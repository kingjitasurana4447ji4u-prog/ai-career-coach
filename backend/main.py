from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from contextlib import asynccontextmanager
from database import engine, Base, get_db, settings
from models import User
from schemas import UserCreate, UserLogin, Token, ChatMessage, ChatResponse
from auth import hash_password, verify_password, create_access_token

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=settings.gemini_api_key)

@app.get("/")
def read_root():
    return {"message": "AI Career Coach API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/register", response_model=Token)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    token = create_access_token({"sub": new_user.email})
    return Token(access_token=token)

@app.post("/login", response_model=Token)
async def login(user: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": db_user.email})
    return Token(access_token=token)

@app.post("/chat", response_model=ChatResponse)
async def chat(msg: ChatMessage):
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"You are a helpful, encouraging AI career coach. Give practical, specific career advice.\n\nUser: {msg.message}",
    )
    return ChatResponse(reply=response.text)