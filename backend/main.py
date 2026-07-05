import io
import json
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from contextlib import asynccontextmanager
from pypdf import PdfReader
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from database import engine, Base, get_db, settings
from models import User, Conversation, Message, Resume, MindMap, InterviewSession
from schemas import (
    UserCreate, UserLogin, Token, ChatMessage, ChatResponse,
    ConversationOut, ConversationDetail, ResumeOut, ResumeListItem,
    PolishRequest, PolishResponse, ResumeBuildRequest,
    MindMapCreateRequest, MindMapOut, MindMapListItem,
    InterviewStartResponse, TranscriptEntry, InterviewAnswerResponse,
    InterviewOut, InterviewListItem, InterviewFinishResponse,
)
from auth import hash_password, verify_password, create_access_token, get_current_user

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://ai-career-coach-delta-two.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

client = genai.Client(api_key=settings.gemini_api_key)

SYSTEM_PROMPT = (
    "You are a helpful, encouraging AI career coach. "
    "Give practical, specific career advice on resumes, interviews, "
    "career transitions, and workplace growth."
)

RESUME_ANALYSIS_PROMPT = (
    "You are an expert resume reviewer and career coach. Analyze the following "
    "resume text and give structured, practical feedback. Format your response "
    "with these exact sections:\n\n"
    "## Strengths\n(2-4 bullet points on what's working well)\n\n"
    "## Areas to Improve\n(2-4 bullet points on specific weaknesses)\n\n"
    "## ATS & Formatting Tips\n(2-3 bullet points on applicant tracking system optimization)\n\n"
    "## Overall Score\n(A score out of 10, with a one-sentence justification)\n\n"
    "Be specific and reference actual content from the resume, not generic advice.\n\n"
    "Resume text:\n"
)

POLISH_PROMPTS = {
    "summary": (
        "Rewrite this resume summary to be more professional, concise, and impactful. "
        "Keep it to 2-3 sentences. Return ONLY the rewritten text, no explanation, no quotes.\n\n"
    ),
    "bullet": (
        "Rewrite this resume bullet point to be more impactful using strong action verbs "
        "and quantifiable results where possible. Return ONLY the rewritten bullet point, "
        "no explanation, no quotes, no leading dash.\n\n"
    ),
    "skills": (
        "Clean up and organize this list of skills for a resume. Return ONLY a comma-separated "
        "list, no explanation, no quotes.\n\n"
    ),
}

MIND_MAP_PROMPT = (
    "You are a career planning expert. Generate a career path mind map as a JSON tree. "
    "The root node should be the career goal. Its children should be major skill areas or "
    "milestones needed to reach that goal. Each of those can have children representing "
    "sub-skills or steps. Go up to 3 levels deep. Keep it focused: 3-5 children per node max.\n\n"
    "Return ONLY valid JSON (no markdown, no code fences, no explanation) matching exactly "
    "this structure:\n"
    '{"label": "string", "description": "short string", "children": [ ...same structure... ]}\n\n'
    "Career goal: {goal}\n"
    "Current skills/background: {skills}\n"
)

INTERVIEW_QUESTIONS_PROMPT = (
    "You are an experienced career coach running a mock job interview. Generate 5 solid, "
    "generic interview questions covering a mix of behavioral questions (e.g. teamwork, "
    "conflict, leadership) and general career questions (e.g. strengths/weaknesses, why "
    "should we hire you, career goals). Keep each question concise, one sentence.\n\n"
    "Return ONLY valid JSON (no markdown, no code fences, no explanation): a JSON array "
    "of 5 question strings, like [\"question 1\", \"question 2\", ...]"
)

TRANSCRIBE_PROMPT = (
    "Transcribe the following audio recording of a spoken interview answer as accurately "
    "as possible. Return ONLY the transcribed text, nothing else, no explanation, no quotes. "
    "If the audio is silent or unintelligible, return an empty string."
)

INTERVIEW_SCORE_PROMPT = (
    "You are an experienced career coach evaluating a completed mock job interview. "
    "Below is the full list of interview questions and the candidate's spoken answers "
    "(transcribed from audio, so minor transcription errors may exist). Give an overall "
    "score out of 10 and constructive written feedback covering: what the candidate did "
    "well, specific areas to improve, and one or two concrete tips for next time.\n\n"
    "Return ONLY valid JSON (no markdown, no code fences, no explanation) matching exactly "
    "this structure:\n"
    '{"score": "X/10", "feedback": "multi-paragraph feedback string"}\n\n'
    "Interview transcript:\n"
)

@app.get("/")
def read_root():
    return {"message": "AI Career Coach API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/register", response_model=Token)
@limiter.limit("5/minute")
async def register(request: Request, response: Response, user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    token = create_access_token({"sub": new_user.email})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    return Token(access_token=token)

@app.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, user: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": db_user.email})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    return Token(access_token=token)

@app.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out"}

@app.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    msg: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if msg.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == msg.conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(user_id=current_user.id, title=msg.message[:50])
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    user_msg = Message(conversation_id=conversation.id, role="user", content=msg.message)
    db.add(user_msg)
    await db.commit()

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history = result.scalars().all()[-20:]

    conversation_text = "\n".join(f"{m.role}: {m.content}" for m in history)
    full_prompt = f"{SYSTEM_PROMPT}\n\n{conversation_text}\nassistant:"

    response_ai = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=full_prompt,
    )
    reply_text = response_ai.text

    assistant_msg = Message(conversation_id=conversation.id, role="assistant", content=reply_text)
    db.add(assistant_msg)
    await db.commit()

    return ChatResponse(reply=reply_text, conversation_id=conversation.id)

@app.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()

@app.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.refresh(conversation, ["messages"])
    return conversation

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conversation)
    await db.commit()
    return {"message": "Conversation deleted"}

@app.post("/resume/analyze", response_model=ResumeOut)
@limiter.limit("10/minute")
async def analyze_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_bytes = await file.read()
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read PDF file")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in PDF")

    prompt = RESUME_ANALYSIS_PROMPT + extracted_text[:15000]

    response_ai = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    analysis_text = response_ai.text

    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        extracted_text=extracted_text[:15000],
        analysis=analysis_text,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return resume

@app.get("/resume", response_model=list[ResumeListItem])
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    return result.scalars().all()

@app.get("/resume/{resume_id}", response_model=ResumeOut)
async def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@app.post("/resume/polish", response_model=PolishResponse)
@limiter.limit("10/minute")
async def polish_text(
    request: Request,
    req: PolishRequest,
    current_user: User = Depends(get_current_user),
):
    if not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    prompt_prefix = POLISH_PROMPTS.get(req.section_type, POLISH_PROMPTS["bullet"])
    prompt = prompt_prefix + req.raw_text

    response_ai = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    polished = response_ai.text.strip().strip('"')

    return PolishResponse(polished_text=polished)

@app.post("/resume/generate-pdf")
async def generate_resume_pdf(
    data: ResumeBuildRequest,
    current_user: User = Depends(get_current_user),
):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
    )
    styles = getSampleStyleSheet()

    name_style = ParagraphStyle('Name', parent=styles['Title'], fontSize=20, spaceAfter=2)
    contact_style = ParagraphStyle('Contact', parent=styles['Normal'], fontSize=10, textColor=colors.grey, spaceAfter=14)
    heading_style = ParagraphStyle('SectionHeading', parent=styles['Heading2'], fontSize=13,
                                    textColor=colors.HexColor("#2A4D69"), spaceBefore=14, spaceAfter=6)
    job_title_style = ParagraphStyle('JobTitle', parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold', spaceAfter=2)
    date_style = ParagraphStyle('Date', parent=styles['Normal'], fontSize=9, textColor=colors.grey, spaceAfter=4)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=6)
    bullet_style = ParagraphStyle('Bullet', parent=styles['Normal'], fontSize=10, leading=14, leftIndent=14, spaceAfter=3)

    story = []
    story.append(Paragraph(data.full_name, name_style))

    contact_parts = [p for p in [data.email, data.phone, data.location, data.linkedin] if p]
    story.append(Paragraph(" | ".join(contact_parts), contact_style))

    if data.summary:
        story.append(Paragraph("Summary", heading_style))
        story.append(Paragraph(data.summary, body_style))

    if data.experience:
        story.append(Paragraph("Experience", heading_style))
        for exp in data.experience:
            story.append(Paragraph(f"{exp.job_title} — {exp.company}", job_title_style))
            story.append(Paragraph(exp.dates, date_style))
            for bullet in exp.bullets:
                if bullet.strip():
                    story.append(Paragraph(f"• {bullet}", bullet_style))

    if data.education:
        story.append(Paragraph("Education", heading_style))
        for edu in data.education:
            story.append(Paragraph(f"{edu.degree} — {edu.school}", job_title_style))
            story.append(Paragraph(edu.dates, date_style))

    if data.skills:
        story.append(Paragraph("Skills", heading_style))
        story.append(Paragraph(data.skills, body_style))

    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={data.full_name.replace(' ', '_')}_Resume.pdf"},
    )

@app.post("/mindmap/generate", response_model=MindMapOut)
@limiter.limit("10/minute")
async def generate_mind_map(
    request: Request,
    req: MindMapCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Career goal is required")

    prompt = MIND_MAP_PROMPT.replace("{goal}", req.goal).replace("{skills}", req.current_skills or "Not specified")

    response_ai = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )

    try:
        tree_data = json.loads(response_ai.text)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=502, detail="AI returned invalid data, please try again")

    mind_map = MindMap(
        user_id=current_user.id,
        title=req.goal[:50],
        goal=req.goal,
        map_data=json.dumps(tree_data),
    )
    db.add(mind_map)
    await db.commit()
    await db.refresh(mind_map)

    return MindMapOut(
        id=mind_map.id,
        title=mind_map.title,
        goal=mind_map.goal,
        map_data=tree_data,
        created_at=mind_map.created_at,
    )

@app.get("/mindmap", response_model=list[MindMapListItem])
async def list_mind_maps(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MindMap)
        .where(MindMap.user_id == current_user.id)
        .order_by(MindMap.created_at.desc())
    )
    return result.scalars().all()

@app.get("/mindmap/{mind_map_id}", response_model=MindMapOut)
async def get_mind_map(
    mind_map_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MindMap).where(
            MindMap.id == mind_map_id,
            MindMap.user_id == current_user.id,
        )
    )
    mind_map = result.scalar_one_or_none()
    if not mind_map:
        raise HTTPException(status_code=404, detail="Mind map not found")

    return MindMapOut(
        id=mind_map.id,
        title=mind_map.title,
        goal=mind_map.goal,
        map_data=json.loads(mind_map.map_data),
        created_at=mind_map.created_at,
    )

@app.delete("/mindmap/{mind_map_id}")
async def delete_mind_map(
    mind_map_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MindMap).where(
            MindMap.id == mind_map_id,
            MindMap.user_id == current_user.id,
        )
    )
    mind_map = result.scalar_one_or_none()
    if not mind_map:
        raise HTTPException(status_code=404, detail="Mind map not found")
    await db.delete(mind_map)
    await db.commit()
    return {"message": "Mind map deleted"}

@app.post("/interview/start", response_model=InterviewStartResponse)
@limiter.limit("10/minute")
async def start_interview(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    response_ai = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=INTERVIEW_QUESTIONS_PROMPT,
        config={"response_mime_type": "application/json"},
    )

    try:
        questions = json.loads(response_ai.text)
        if not isinstance(questions, list) or not questions:
            raise ValueError("Empty or invalid questions list")
    except (json.JSONDecodeError, TypeError, ValueError):
        raise HTTPException(status_code=502, detail="AI returned invalid data, please try again")

    session = InterviewSession(
        user_id=current_user.id,
        questions=json.dumps(questions),
        transcript="[]",
        status="in_progress",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return InterviewStartResponse(id=session.id, questions=questions)

@app.post("/interview/{interview_id}/answer", response_model=InterviewAnswerResponse)
@limiter.limit("10/minute")
async def submit_interview_answer(
    request: Request,
    interview_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == interview_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This interview is already completed")

    questions = json.loads(session.questions)
    transcript = json.loads(session.transcript)

    current_index = len(transcript)
    if current_index >= len(questions):
        raise HTTPException(status_code=400, detail="All questions have already been answered")

    current_question = questions[current_index]

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio data received")
    mime_type = file.content_type or "audio/webm"

    response_ai = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            TRANSCRIBE_PROMPT,
        ],
    )
    answer_text = response_ai.text.strip() if response_ai.text else ""

    entry = {"question": current_question, "answer": answer_text}
    transcript.append(entry)
    session.transcript = json.dumps(transcript)
    await db.commit()

    next_index = current_index + 1
    if next_index < len(questions):
        return InterviewAnswerResponse(
            transcript_entry=TranscriptEntry(**entry),
            next_question=questions[next_index],
            completed=False,
        )
    else:
        return InterviewAnswerResponse(
            transcript_entry=TranscriptEntry(**entry),
            next_question=None,
            completed=True,
        )

@app.post("/interview/{interview_id}/finish", response_model=InterviewFinishResponse)
@limiter.limit("10/minute")
async def finish_interview(
    request: Request,
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == interview_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    transcript = json.loads(session.transcript)
    if not transcript:
        raise HTTPException(status_code=400, detail="No answers have been given yet")

    transcript_text = "\n\n".join(
        f"Q: {t['question']}\nA: {t['answer']}" for t in transcript
    )
    prompt = INTERVIEW_SCORE_PROMPT + transcript_text

    response_ai = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )

    try:
        result_data = json.loads(response_ai.text)
        score = result_data["score"]
        feedback = result_data["feedback"]
    except (json.JSONDecodeError, TypeError, KeyError):
        raise HTTPException(status_code=502, detail="AI returned invalid data, please try again")

    session.score = score
    session.feedback = feedback
    session.status = "completed"
    await db.commit()

    return InterviewFinishResponse(score=score, feedback=feedback)

@app.get("/interview", response_model=list[InterviewListItem])
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    return result.scalars().all()

@app.get("/interview/{interview_id}", response_model=InterviewOut)
async def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == interview_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    return InterviewOut(
        id=session.id,
        questions=json.loads(session.questions),
        transcript=[TranscriptEntry(**t) for t in json.loads(session.transcript)],
        status=session.status,
        score=session.score,
        feedback=session.feedback,
        created_at=session.created_at,
    )

@app.delete("/interview/{interview_id}")
async def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == interview_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    await db.delete(session)
    await db.commit()
    return {"message": "Interview session deleted"}