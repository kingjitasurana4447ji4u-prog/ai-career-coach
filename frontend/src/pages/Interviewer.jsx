import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function Interviewer() {
  const [interviews, setInterviews] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [interviewId, setInterviewId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | in_progress | completed
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { score, feedback }
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const navigate = useNavigate();

  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  const handleLogout = async () => {
    try {
      await fetch("https://ai-career-coach-djum.onrender.com/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout request failed", err);
    } finally {
      navigate("/login");
    }
  };

  const handleAuthFail = (res) => {
    if (res.status === 401) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchInterviews = async () => {
    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/interview", {
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setInterviews(data);
    } catch (err) {
      console.error("Failed to load interviews", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const startNewInterview = async () => {
    setError("");
    setResult(null);
    setTranscript([]);
    setCurrentIndex(0);
    setStatus("idle");

    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/interview/start", {
        method: "POST",
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to start interview");

      const data = await res.json();
      setInterviewId(data.id);
      setQuestions(data.questions);
      setStatus("in_progress");
      setTimeout(() => speak(data.questions[0]), 400);
    } catch (err) {
      setError("Could not start interview. Please try again.");
    }
  };

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        submitAnswer(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const submitAnswer = async (blob) => {
    if (!interviewId) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", blob, "answer.webm");

      const res = await fetch(
        `https://ai-career-coach-djum.onrender.com/interview/${interviewId}/answer`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to submit answer");

      const data = await res.json();
      setTranscript((prev) => [...prev, data.transcript_entry]);

      if (data.completed) {
        setStatus("completed");
      } else {
        setCurrentIndex((prev) => prev + 1);
        setTimeout(() => speak(data.next_question), 400);
      }
    } catch (err) {
      setError("Could not submit answer. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const getScore = async () => {
    if (!interviewId) return;
    setUploading(true);
    setError("");

    try {
      const res = await fetch(
        `https://ai-career-coach-djum.onrender.com/interview/${interviewId}/finish`,
        {
          method: "POST",
          headers: jsonHeaders,
          credentials: "include",
        }
      );
      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to finish interview");

      const data = await res.json();
      setResult(data);
      fetchInterviews();
    } catch (err) {
      setError("Could not get score. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const loadInterview = async (id) => {
    setError("");
    setResult(null);
    try {
      const res = await fetch(`https://ai-career-coach-djum.onrender.com/interview/${id}`, {
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();

      setInterviewId(data.id);
      setQuestions(data.questions);
      setTranscript(data.transcript);
      setCurrentIndex(data.transcript.length);
      setStatus(data.status);
      if (data.status === "completed") {
        setResult({ score: data.score, feedback: data.feedback });
      }
    } catch (err) {
      console.error("Failed to load interview", err);
    }
  };

  const styles = {
    page: {
      display: "flex",
      height: "100vh",
      background: "#10151A",
      fontFamily: "'Inter', sans-serif",
    },
    sidebar: {
      width: 270,
      background: "#0B0F13",
      color: "#E8E6E1",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #1E2530",
    },
    logo: {
      padding: "22px 20px",
      fontFamily: "'Fraunces', serif",
      fontSize: 20,
      fontWeight: 600,
      color: "#F3EFE9",
      borderBottom: "1px solid #1E2530",
    },
    navRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      padding: "14px 16px",
    },
    navTab: (active) => ({
      flex: "1 1 40%",
      textAlign: "center",
      padding: "8px 10px",
      borderRadius: 8,
      fontSize: 13,
      color: active ? "#10151A" : "#8B93A1",
      background: active ? "#E8A758" : "#171E27",
      fontWeight: 600,
      cursor: "pointer",
    }),
    newBtn: {
      margin: "6px 16px 14px 16px",
      padding: "11px 14px",
      background: "linear-gradient(135deg, #E8A758, #D98A3D)",
      color: "#10151A",
      border: "none",
      borderRadius: 10,
      cursor: "pointer",
      textAlign: "left",
      fontWeight: 600,
      fontSize: 14,
      letterSpacing: 0.2,
    },
    list: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 10px",
    },
    listItem: (active) => ({
      padding: "11px 12px",
      marginBottom: 3,
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 13.5,
      color: active ? "#F3EFE9" : "#8B93A1",
      background: active ? "#171E27" : "transparent",
      borderLeft: active ? "3px solid #E8A758" : "3px solid transparent",
    }),
    logoutWrap: {
      padding: 14,
      borderTop: "1px solid #1E2530",
    },
    logoutBtn: {
      width: "100%",
      padding: "9px 12px",
      background: "transparent",
      color: "#8B93A1",
      border: "1px solid #1E2530",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 13,
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "#151B22",
      padding: "40px 18%",
      overflowY: "auto",
    },
    heading: {
      color: "#F3EFE9",
      fontFamily: "'Fraunces', serif",
      fontSize: 22,
      marginBottom: 20,
    },
    emptyState: {
      color: "#5C6675",
      textAlign: "center",
      marginTop: 100,
      fontSize: 15,
      fontFamily: "'Fraunces', serif",
    },
    startBtn: {
      padding: "13px 26px",
      borderRadius: 24,
      border: "none",
      background: "#E8A758",
      color: "#10151A",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14.5,
      alignSelf: "center",
      marginTop: 20,
    },
    questionCard: {
      background: "#1B222B",
      border: "1px solid #2A3240",
      borderRadius: 14,
      padding: "24px 28px",
      color: "#E8E6E1",
      fontSize: 16,
      marginBottom: 24,
      lineHeight: 1.5,
    },
    progressText: {
      color: "#8B93A1",
      fontSize: 13,
      marginBottom: 10,
    },
    recordBtn: (isRecording) => ({
      padding: "14px 30px",
      borderRadius: 24,
      border: "none",
      background: isRecording ? "#C0392B" : "#E8A758",
      color: isRecording ? "#F3EFE9" : "#10151A",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14.5,
      alignSelf: "flex-start",
    }),
    transcriptBlock: {
      marginTop: 30,
    },
    transcriptEntry: {
      marginBottom: 16,
      padding: "14px 16px",
      background: "#171E27",
      borderRadius: 10,
      border: "1px solid #1E2530",
    },
    qLabel: {
      color: "#E8A758",
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 4,
    },
    aLabel: {
      color: "#E8E6E1",
      fontSize: 14,
      lineHeight: 1.5,
    },
    scoreText: {
      color: "#E8A758",
      fontFamily: "'Fraunces', serif",
      fontSize: 20,
      marginBottom: 10,
    },
    feedbackText: {
      color: "#E8E6E1",
      fontSize: 14.5,
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
    },
    secondaryBtn: {
      marginTop: 24,
      padding: "11px 22px",
      borderRadius: 20,
      border: "1px solid #2A3240",
      background: "transparent",
      color: "#8B93A1",
      cursor: "pointer",
      fontSize: 13.5,
      alignSelf: "flex-start",
    },
    errorText: {
      color: "#E07A5F",
      fontSize: 13.5,
      marginBottom: 14,
    },
    uploadingText: {
      color: "#5C6675",
      fontSize: 13.5,
      fontStyle: "italic",
      marginTop: 10,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>AI Career Coach</div>

        <div style={styles.navRow}>
          <div style={styles.navTab(false)} onClick={() => navigate("/chat")}>
            Chat
          </div>
          <div style={styles.navTab(false)} onClick={() => navigate("/resume")}>
            Resume
          </div>
          <div style={styles.navTab(false)} onClick={() => navigate("/resume-builder")}>
            Builder
          </div>
          <div style={styles.navTab(false)} onClick={() => navigate("/mind-map")}>
            Mind Map
          </div>
          <div style={styles.navTab(true)}>Interview</div>
        </div>

        <button style={styles.newBtn} onClick={startNewInterview}>
          + Start Mock Interview
        </button>

        <div style={styles.list}>
          {loadingList && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              Loading...
            </p>
          )}
          {!loadingList && interviews.length === 0 && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              No interviews yet
            </p>
          )}
          {interviews.map((iv) => (
            <div
              key={iv.id}
              onClick={() => loadInterview(iv.id)}
              style={styles.listItem(iv.id === interviewId)}
            >
              {iv.status === "completed" ? `Score: ${iv.score}` : "In progress"}
            </div>
          ))}
        </div>

        <div style={styles.logoutWrap}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      <div style={styles.main}>
        <h2 style={styles.heading}>Mock Interview</h2>

        {error && <p style={styles.errorText}>{error}</p>}

        {status === "idle" && !result && (
          <p style={styles.emptyState}>
            Click "Start Mock Interview" to begin a 5-question voice interview.
          </p>
        )}

        {status === "in_progress" && questions[currentIndex] && (
          <>
            <p style={styles.progressText}>
              Question {currentIndex + 1} of {questions.length}
            </p>
            <div style={styles.questionCard}>{questions[currentIndex]}</div>

            {uploading ? (
              <p style={styles.uploadingText}>Processing your answer...</p>
            ) : (
              <button
                style={styles.recordBtn(recording)}
                onClick={recording ? stopRecording : startRecording}
              >
                {recording ? "Stop Recording" : "Record Answer"}
              </button>
            )}
          </>
        )}

        {status === "completed" && !result && (
          <>
            <p style={styles.emptyState}>
              You've answered all questions. Ready to see your score?
            </p>
            <button
              style={styles.startBtn}
              onClick={getScore}
              disabled={uploading}
            >
              {uploading ? "Scoring..." : "Get My Score"}
            </button>
          </>
        )}

        {result && (
          <>
            <p style={styles.scoreText}>Score: {result.score}</p>
            <p style={styles.feedbackText}>{result.feedback}</p>
            <button style={styles.secondaryBtn} onClick={startNewInterview}>
              Start New Interview
            </button>
          </>
        )}

        {transcript.length > 0 && (
          <div style={styles.transcriptBlock}>
            {transcript.map((t, i) => (
              <div key={i} style={styles.transcriptEntry}>
                <p style={styles.qLabel}>Q: {t.question}</p>
                <p style={styles.aLabel}>{t.answer || "(no answer detected)"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Interviewer;
