from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChatMessage(BaseModel):
    message: str
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: int


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(ConversationOut):
    messages: list[MessageOut]


class ResumeOut(BaseModel):
    id: int
    filename: str
    analysis: str
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeListItem(BaseModel):
    id: int
    filename: str
    created_at: datetime

    class Config:
        from_attributes = True


class PolishRequest(BaseModel):
    section_type: str
    raw_text: str


class PolishResponse(BaseModel):
    polished_text: str


class ExperienceEntry(BaseModel):
    job_title: str
    company: str
    dates: str
    bullets: list[str]


class EducationEntry(BaseModel):
    degree: str
    school: str
    dates: str


class ResumeBuildRequest(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    summary: str = ""
    experience: list[ExperienceEntry] = []
    education: list[EducationEntry] = []
    skills: str = ""


class MindMapNode(BaseModel):
    label: str
    description: str = ""
    children: list["MindMapNode"] = []


MindMapNode.model_rebuild()


class MindMapCreateRequest(BaseModel):
    goal: str
    current_skills: str = ""


class MindMapOut(BaseModel):
    id: int
    title: str
    goal: str
    map_data: MindMapNode
    created_at: datetime

    class Config:
        from_attributes = True


class MindMapListItem(BaseModel):
    id: int
    title: str
    goal: str
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewStartResponse(BaseModel):
    id: int
    questions: list[str]


class TranscriptEntry(BaseModel):
    question: str
    answer: str


class InterviewAnswerResponse(BaseModel):
    transcript_entry: TranscriptEntry
    next_question: str | None = None
    completed: bool = False


class InterviewOut(BaseModel):
    id: int
    questions: list[str]
    transcript: list[TranscriptEntry]
    status: str
    score: str | None = None
    feedback: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewListItem(BaseModel):
    id: int
    status: str
    score: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewFinishResponse(BaseModel):
    score: str
    feedback: str


class PracticeStartRequest(BaseModel):
    question: str


class PracticeSubmitResponse(BaseModel):
    transcribed_answer: str
    score: str
    feedback: str


class QAsubmitResponse(BaseModel):
    question: str
    answer: str


class QAfinishResponse(BaseModel):
    feedback: str


class AssistantChatResponse(BaseModel):
    transcribed_input: str
    ai_response: str


class AssistantFinishResponse(BaseModel):
    score: str
    feedback: str