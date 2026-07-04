from fastapi import FastAPI

app = FastAPI(title="AI Career Coach API")


@app.get("/")
def read_root():
    return {"message": "AI Career Coach API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

