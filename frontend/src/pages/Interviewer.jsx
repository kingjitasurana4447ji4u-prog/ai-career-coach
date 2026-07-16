import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const CURATED_QUESTIONS = [
  "Tell me about yourself and your background.",
  "Why do you want to work at this company?",
  "Describe a challenging project you worked on and how you handled it.",
  "What are your greatest professional strengths and weaknesses?",
  "How do you handle conflict or disagreements within a team?",
  "Where do you see yourself in five years?"
];

function CircularRating({ rating }) {
  const score = parseFloat(rating) || 0;
  const percentage = (score / 10) * 100;
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "20px 0" }}>
      <div style={{ position: "relative", width: radius * 2, height: radius * 2 }}>
        <svg height={radius * 2} width={radius * 2} style={{ transform: "rotate(-90deg)" }}>
          <circle
            stroke="rgba(255,255,255,0.06)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="url(#scoreGradient)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease-in-out" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EB1B23" />
              <stop offset="100%" stopColor="#D20A0A" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Oswald', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#F5F5F5",
            textShadow: "0 0 10px rgba(235,27,35,0.4)"
          }}
        >
          {score.toFixed(1)}
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: "'Oswald', sans-serif",
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#8A8A8A"
        }}
      >
        Score Rating
      </div>
    </div>
  );
}

function Interviewer() {
  const [interviews, setInterviews] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  
  // App-wide Modes: "qa" | "practice"
  const [mode, setMode] = useState("qa");

  // Voice Coach Q&A States
  const [qaSessionId, setQaSessionId] = useState(null);
  const [qaTranscript, setQaTranscript] = useState([]);
  const [qaStatus, setQaStatus] = useState("idle"); // idle | active | completed
  const [qaSummary, setQaSummary] = useState("");

  // Practice Practice States
  const [practiceSessionId, setPracticeSessionId] = useState(null);
  const [practiceQuestion, setPracticeQuestion] = useState(CURATED_QUESTIONS[0]);
  const [practiceStatus, setPracticeStatus] = useState("idle"); // idle | active | completed
  const [practiceResult, setPracticeResult] = useState(null); // { score, feedback, answer }
  const [practiceInputType, setPracticeInputType] = useState("select"); // select | custom
  const [customPracticeQuestion, setCustomPracticeQuestion] = useState("");

  // Audio Recording States
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [glowActive, setGlowActive] = useState(false);
  const [error, setError] = useState("");
  const [liveListening, setLiveListening] = useState(false);
  const [liveThinking, setLiveThinking] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const liveSessionActiveRef = useRef(false);
  const isHandlingTurnRef = useRef(false);

  const navigate = useNavigate();

  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout request failed", err);
    } finally {
      localStorage.removeItem("active_conversation_id");
      navigate("/login");
    }
  };

  const handleAuthFail = (res) => {
    if (res.status === 401) {
      localStorage.removeItem("active_conversation_id");
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchInterviews = async () => {
    try {
      const res = await fetch(`${API_URL}/interview`, {
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [qaTranscript, uploading]);

  useEffect(() => {
    if (mode === "qa" && qaStatus === "idle" && !qaSessionId) {
      void startNewQA();
    }
  }, [mode, qaStatus, qaSessionId]);

  useEffect(() => {
    return () => {
      cleanupLiveSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const cleanupLiveSession = () => {
    liveSessionActiveRef.current = false;
    setLiveListening(false);
    setLiveThinking(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore cleanup errors
      }
      recognitionRef.current.onstart = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore cleanup errors
      }
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setRecording(false);
  };

  const beginTurnRecording = () => {
    if (!streamRef.current || !streamRef.current.active) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") return;

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (blob.size > 0) {
        void submitVoice(blob);
      }
    };

    recorder.start();
    setRecording(true);
  };

  const stopCurrentRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const startLiveRecognition = async () => {
    cleanupLiveSession();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        setError("Live voice listening is unavailable in this browser. You can still use the microphone button.");
        return;
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;
      liveSessionActiveRef.current = true;

      recognition.onstart = () => {
        setLiveListening(true);
        beginTurnRecording();
      };

      recognition.onresult = (event) => {
        const transcriptText = Array.from(event.results)
          .filter((result) => result.isFinal)
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();

        if (!transcriptText) return;

        if (isHandlingTurnRef.current) return;
        isHandlingTurnRef.current = true;
        setLiveThinking(true);
        setLiveListening(false);
        stopCurrentRecording();

        setQaTranscript((prev) => [...prev, { question: transcriptText, answer: "Thinking..." }]);
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed") {
          setError("Microphone permission is required for live voice chat.");
        } else if (event.error !== "aborted") {
          setError("Speech recognition interrupted. Please try again.");
        }
        cleanupLiveSession();
      };

      recognition.onend = () => {
        if (liveSessionActiveRef.current) {
          window.setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch {
              // ignore restart errors
            }
          }, 250);
        }
      };

      recognition.start();
    } catch (err) {
      setError("Microphone access is required for live voice chat.");
      cleanupLiveSession();
    }
  };

  const startNewQA = async () => {
    setError("");
    setQaTranscript([]);
    setQaSummary("");
    setQaStatus("idle");
    setQaSessionId(null);
    setPracticeSessionId(null);
    setMode("qa");
    setLiveThinking(false);
    setLiveListening(false);

    try {
      const res = await fetch(`${API_URL}/interview/start-qa`, {
        method: "POST",
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to start QA session");

      const data = await res.json();
      setQaSessionId(data.id);
      setQaStatus("active");
      await startLiveRecognition();
      setTimeout(() => speak("Hi, I am your voice coach. How can I help you today?"), 400);
    } catch (err) {
      setError("Could not start voice session. Please try again.");
    }
  };

  const finishQA = async () => {
    if (!qaSessionId) return;
    setUploading(true);
    setError("");

    try {
      cleanupLiveSession();
      const res = await fetch(`${API_URL}/interview/${qaSessionId}/finish-qa`, {
        method: "POST",
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to finish QA session");

      const data = await res.json();
      setQaSummary(data.feedback);
      setQaStatus("completed");
      speak("Session ended. I've prepared a brief summary of our discussion.");
      fetchInterviews();
    } catch (err) {
      setError("Could not finish session. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const startNewPractice = async () => {
    setError("");
    setPracticeResult(null);
    setPracticeStatus("idle");
    setQaSessionId(null);
    setPracticeSessionId(null);
    setMode("practice");

    const activeQuestion = practiceInputType === "custom" ? customPracticeQuestion : practiceQuestion;
    if (!activeQuestion.trim()) {
      setError("Please select or enter an interview question to practice.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/interview/start-practice`, {
        method: "POST",
        headers: jsonHeaders,
        credentials: "include",
        body: JSON.stringify({ question: activeQuestion }),
      });
      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to start practice");

      const data = await res.json();
      setPracticeSessionId(data.id);
      setPracticeStatus("active");
      setTimeout(() => speak(`Here is your question: ${activeQuestion}. Please speak your answer when ready.`), 400);
    } catch (err) {
      setError("Could not start practice. Please try again.");
    }
  };

  const startRecording = async () => {
    setError("");
    try {
      if (!streamRef.current || !streamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      beginTurnRecording();
    } catch (err) {
      setError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    stopCurrentRecording();
  };

  const submitVoice = async (blob) => {
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", blob, "voice.webm");

      if (mode === "qa") {
        const res = await fetch(`${API_URL}/interview/${qaSessionId}/qa-ask`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (handleAuthFail(res)) return;
        if (!res.ok) throw new Error("Failed to submit question");

        const data = await res.json();
        setQaTranscript((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          updated[updated.length - 1] = { question: updated[updated.length - 1].question, answer: data.answer };
          return updated;
        });
        speak(data.answer);
      } else {
        const res = await fetch(`${API_URL}/interview/${practiceSessionId}/practice-submit`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (handleAuthFail(res)) return;
        if (!res.ok) throw new Error("Failed to submit answer");

        const data = await res.json();
        setPracticeResult({
          score: data.score,
          feedback: data.feedback,
          answer: data.transcribed_answer,
        });
        setPracticeStatus("completed");
        speak(`Rating is ${data.score}. Here is a summary of the feedback: ${data.feedback.slice(0, 120)}`);
        fetchInterviews();
      }
    } catch (err) {
      setError("Could not process voice input. Please speak clearly and try again.");
    } finally {
      setUploading(false);
      setLiveThinking(false);
      setLiveListening(true);
      isHandlingTurnRef.current = false;
    }
  };

  const loadInterview = async (id) => {
    setError("");
    setPracticeResult(null);
    setQaSummary("");
    setQaTranscript([]);
    
    try {
      const res = await fetch(`${API_URL}/interview/${id}`, {
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();

      if (data.score === "Q&A") {
        setMode("qa");
        setQaSessionId(data.id);
        setQaTranscript(data.transcript);
        setQaStatus("completed");
        setQaSummary(data.feedback);
      } else {
        setMode("practice");
        setPracticeSessionId(data.id);
        setPracticeQuestion(data.questions[0] || "");
        setPracticeStatus("completed");
        setPracticeResult({
          score: data.score,
          feedback: data.feedback,
          answer: data.transcript[0]?.answer || "",
        });
      }
    } catch (err) {
      console.error("Failed to load interview", err);
    }
  };

  const startNewSession = () => {
    if (mode === "qa") {
      startNewQA();
    } else {
      setPracticeStatus("idle");
      setPracticeResult(null);
      setPracticeSessionId(null);
    }
  };

  const styles = {
    page: {
      display: "flex",
      height: "100vh",
      background: "radial-gradient(ellipse 1200px 600px at 50% -10%, #1A0808 0%, #0A0A0A 45%), #0A0A0A",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
      isolation: "isolate",
    },
    sidebar: {
      width: 272,
      background: "rgba(10, 10, 10, 0.12)",
      color: "#F5F5F5",
      display: "flex",
      flexDirection: "column",
      borderRight: glowActive ? "2px solid rgba(255,255,255,0.62)" : "1px solid rgba(255,255,255,0.18)",
      boxShadow: glowActive
        ? "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 0 1px rgba(255,255,255,0.16), 0 0 24px rgba(255,255,255,0.22), 0 0 58px rgba(210,10,10,0.34), 0 20px 56px rgba(0,0,0,0.42)"
        : "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.07), 0 0 16px rgba(210,10,10,0.16), 0 20px 46px rgba(0,0,0,0.3)",
      zIndex: 2,
      backdropFilter: "blur(4px)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    logo: {
      padding: "24px 22px",
      fontFamily: "'Oswald', sans-serif",
      fontSize: 19,
      fontWeight: 700,
      fontStyle: "italic",
      textTransform: "uppercase",
      color: "#F5F5F5",
      borderTop: "3px solid rgba(245,245,245,0.22)",
      borderBottom: "1px solid rgba(255,255,255,0.14)",
      display: "flex",
      alignItems: "center",
      gap: 12,
      letterSpacing: 0.8,
      textShadow: "0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(210,10,10,0.16)",
    },
    logoMark: {
      width: 14,
      height: 14,
      flexShrink: 0,
      background: "#D20A0A",
      clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      boxShadow: "0 0 14px rgba(210,10,10,0.8)",
    },
    navRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      padding: "16px 16px 14px",
    },
    navTab: (active) => ({
      flex: "1 1 40%",
      textAlign: "center",
      padding: "9px 10px",
      borderRadius: 6,
      fontSize: 12.5,
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: active ? "#F5F5F5" : "#9A9A9A",
      background: active ? "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)" : "#161616",
      border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.16)",
      boxShadow: active
        ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.38)"
        : "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.2)",
      cursor: "pointer",
      transition: "all 0.18s ease",
      textShadow: active
        ? "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)"
        : "0 0 7px rgba(255,255,255,0.14), 0 0 12px rgba(210,10,10,0.16)",
    }),
    newBtn: {
      margin: "4px 16px 16px 16px",
      padding: "12px 14px",
      background: "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)",
      color: "#F5F5F5",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: 6,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      fontSize: 13,
      textTransform: "uppercase",
      letterSpacing: 1,
      boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.35)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      textShadow: "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)",
    },
    list: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 10px",
    },
    listItem: (active) => ({
      padding: "11px 12px",
      marginBottom: 5,
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "'Inter', sans-serif",
      color: active ? "#F5F5F5" : "#9A9A9A",
      background: active ? "rgba(22, 22, 22, 0.74)" : "transparent",
      borderLeft: active ? "3px solid #D20A0A" : "3px solid transparent",
      border: "1px solid " + (active ? "rgba(255,255,255,0.16)" : "transparent"),
      boxShadow: active ? "0 0 12px rgba(210,10,10,0.22)" : "none",
      transition: "all 0.15s ease",
    }),
    logoutWrap: {
      padding: 14,
      borderTop: "1px solid #2A2A2A",
    },
    logoutBtn: {
      width: "100%",
      padding: "10px 12px",
      background: "rgba(22, 22, 22, 0.4)",
      color: "#9A9A9A",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 6,
      cursor: "pointer",
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
      transition: "all 0.15s ease",
      boxShadow: "0 0 8px rgba(255,255,255,0.04)",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "rgba(8, 8, 8, 0.06)",
      padding: "36px 14%",
      overflowY: "auto",
      backdropFilter: "blur(4px)",
      borderLeft: glowActive ? "2px solid rgba(255,255,255,0.62)" : "1px solid rgba(255,255,255,0.18)",
      boxShadow: glowActive
        ? "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 0 1px rgba(255,255,255,0.16), 0 0 24px rgba(255,255,255,0.22), 0 0 58px rgba(210,10,10,0.34), 0 20px 56px rgba(0,0,0,0.42)"
        : "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.07), 0 0 16px rgba(210,10,10,0.16), 0 20px 46px rgba(0,0,0,0.3)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    heading: {
      color: "#F5F5F5",
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 1,
      fontSize: 22,
      marginBottom: 6,
    },
    subtitle: {
      color: "#8A8A8A",
      fontSize: 14,
      marginBottom: 24,
    },
    modeSwitchWrap: {
      display: "flex",
      gap: 12,
      marginBottom: 28,
    },
    modeBtn: (active) => ({
      padding: "10px 20px",
      borderRadius: 6,
      border: active ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.08)",
      background: active ? "rgba(210, 10, 10, 0.16)" : "rgba(22, 22, 22, 0.4)",
      color: active ? "#F5F5F5" : "#8A8A8A",
      cursor: "pointer",
      fontFamily: "'Oswald', sans-serif",
      fontSize: 13.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      transition: "all 0.18s ease",
      boxShadow: active ? "0 0 15px rgba(210, 10, 10, 0.25)" : "none",
    }),
    card: {
      background: "rgba(22, 22, 22, 0.54)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "28px",
      color: "#F5F5F5",
      boxShadow: "0 0 30px rgba(0, 0, 0, 0.25)",
      backdropFilter: "blur(8px)",
      display: "flex",
      flexDirection: "column",
      marginBottom: 28,
    },
    micPanel: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "36px 0",
      gap: 16,
    },
    micBtn: (isRec) => ({
      width: 80,
      height: 80,
      borderRadius: "50%",
      border: isRec ? "3px solid #EB1B23" : "1px solid rgba(255,255,255,0.2)",
      background: isRec 
        ? "radial-gradient(circle, #EB1B23 0%, #A00808 100%)" 
        : "rgba(255, 255, 255, 0.04)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: "#F5F5F5",
      fontSize: 28,
      boxShadow: isRec 
        ? "0 0 28px rgba(235, 27, 35, 0.7)" 
        : "0 4px 16px rgba(0,0,0,0.3)",
      transition: "all 0.3s ease",
      animation: isRec ? "micPulse 1.8s infinite ease-in-out" : "none",
    }),
    qaThread: {
      maxHeight: 280,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      padding: "10px 6px",
      marginBottom: 20,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    qaBubble: (isUser) => ({
      alignSelf: isUser ? "flex-end" : "flex-start",
      background: isUser ? "rgba(210, 10, 10, 0.16)" : "rgba(255, 255, 255, 0.04)",
      border: isUser ? "1px solid rgba(210, 10, 10, 0.35)" : "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: isUser ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
      padding: "12px 16px",
      maxWidth: "80%",
      fontSize: 14,
      lineHeight: 1.55,
      animation: "msgIn 0.25s ease-out",
    }),
    qTag: {
      fontSize: 11,
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      textTransform: "uppercase",
      color: "#EB1B23",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    aTag: {
      fontSize: 11,
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      textTransform: "uppercase",
      color: "#A0A0A0",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    practiceControls: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: "#8A8A8A",
    },
    select: {
      padding: "11px 14px",
      background: "rgba(22, 22, 22, 0.9)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 6,
      color: "#F5F5F5",
      outline: "none",
      fontSize: 14,
    },
    input: {
      padding: "11px 14px",
      background: "rgba(22, 22, 22, 0.9)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 6,
      color: "#F5F5F5",
      outline: "none",
      fontSize: 14,
    },
    actionBtn: (disabled) => ({
      padding: "12px 24px",
      background: disabled ? "#3A1414" : "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)",
      color: disabled ? "#8A5A5A" : "#F5F5F5",
      border: disabled ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.22)",
      borderRadius: 6,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      fontSize: 13.5,
      textTransform: "uppercase",
      letterSpacing: 1,
      alignSelf: "flex-start",
      boxShadow: disabled ? "none" : "0 0 15px rgba(210,10,10,0.3)",
      transition: "all 0.15s ease",
    }),
    secondaryBtn: {
      padding: "10px 20px",
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 6,
      color: "#9A9A9A",
      cursor: "pointer",
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      fontSize: 12.5,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      alignSelf: "flex-start",
      transition: "all 0.15s ease",
    },
    practiceResultWrap: {
      marginTop: 18,
      paddingTop: 18,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    errorText: {
      color: "#EB1B23",
      background: "#1D0E0E",
      border: "1px solid #3A1414",
      borderRadius: 6,
      padding: "10px 14px",
      fontSize: 13.5,
      marginBottom: 16,
    },
    infoText: {
      color: "#8A8A8A",
      fontSize: 13.5,
      fontStyle: "italic",
      textAlign: "center",
      margin: 0,
    }
  };

  function ParticleBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      let animationId;
      let particles = [];

      const DENSITY = 9000;
      const MAX_LINK_DIST = 130;
      const COLORS = ["#D20A0A", "#EB1B23", "#F5F5F5"];

      const resize = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const count = Math.max(24, Math.floor((canvas.width * canvas.height) / DENSITY));
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.6 + 0.6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: Math.random() * 0.5 + 0.3,
        }));
      };

      const step = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MAX_LINK_DIST) {
              ctx.strokeStyle = `rgba(210,10,10,${0.16 * (1 - dist / MAX_LINK_DIST)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          }
        }

        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        animationId = requestAnimationFrame(step);
      };

      resize();
      step();
      window.addEventListener("resize", resize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", resize);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <div
      style={styles.page}
      onMouseEnter={() => setGlowActive(true)}
      onMouseMove={() => setGlowActive(true)}
      onMouseLeave={() => setGlowActive(false)}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');

        .cc-iv-navtab:hover { border-color: #EB1B23 !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; text-shadow: 0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.22) !important; }
        .cc-iv-newbtn:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #EB1B23 0%, #B30909 100%) !important;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important;
        }
        .cc-iv-listitem:hover { border-color: rgba(255,255,255,0.3) !important; background: rgba(22, 22, 22, 0.74) !important; color: #F5F5F5 !important; }
        .cc-iv-logout:hover { border-color: #EB1B23 !important; color: #F5F5F5 !important; box-shadow: 0 0 10px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16) !important; }
        .cc-iv-modebtn:hover { border-color: rgba(255,255,255,0.3) !important; color: #F5F5F5 !important; }
        
        @keyframes micPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(235, 27, 35, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(235, 27, 35, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(235, 27, 35, 0); }
        }

        @keyframes waveAnimation {
          0%, 100% { height: 8px; }
          50% { height: 32px; }
        }
        .audio-wave {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 40px;
          margin-top: 14px;
        }
        .wave-bar {
          width: 4px;
          height: 8px;
          background: #EB1B23;
          border-radius: 2px;
          animation: waveAnimation 1.2s ease-in-out infinite;
        }
        .bar-1 { animation-delay: 0s; }
        .bar-2 { animation-delay: 0.15s; }
        .bar-3 { animation-delay: 0.3s; }
        .bar-4 { animation-delay: 0.45s; }
        .bar-5 { animation-delay: 0.6s; }

        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cc-iv-list::-webkit-scrollbar { width: 6px; }
        .cc-iv-list::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        .cc-iv-thread::-webkit-scrollbar { width: 6px; }
        .cc-iv-thread::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }

        .cc-iv-navtab:focus-visible,
        .cc-iv-newbtn:focus-visible,
        .cc-iv-listitem:focus-visible,
        .cc-iv-logout:focus-visible,
        .cc-iv-modebtn:focus-visible {
          outline: 2px solid #EB1B23;
          outline-offset: 2px;
        }
      `}</style>

      <ParticleBackground />

      {/* Sidebar Section */}
      <div className="cc-i-sidebar" style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoMark} />
          AI Career Coach
        </div>

        <div style={styles.navRow}>
          <div className="cc-iv-navtab" style={styles.navTab(false)} onClick={() => navigate("/chat")}>
            Chat
          </div>
          <div className="cc-iv-navtab" style={styles.navTab(false)} onClick={() => navigate("/resume")}>
            Resume
          </div>
          <div className="cc-iv-navtab" style={styles.navTab(false)} onClick={() => navigate("/resume-builder")}>
            Builder
          </div>
          <div className="cc-iv-navtab" style={styles.navTab(false)} onClick={() => navigate("/mind-map")}>
            Mind Map
          </div>
          <div className="cc-iv-navtab" style={styles.navTab(true)}>Interview</div>
        </div>

        <button className="cc-iv-newbtn" style={styles.newBtn} onClick={startNewSession}>
          {mode === "qa" ? "+ Start Voice Coach" : "+ Practice Question"}
        </button>

        <div className="cc-iv-list" style={styles.list}>
          {loadingList && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px", fontFamily: "'Inter', sans-serif" }}>
              Loading...
            </p>
          )}
          {!loadingList && interviews.length === 0 && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px", fontFamily: "'Inter', sans-serif" }}>
              No history found
            </p>
          )}
          {interviews.map((iv) => (
            <div
              key={iv.id}
              className="cc-iv-listitem"
              onClick={() => loadInterview(iv.id)}
              style={styles.listItem(iv.id === (mode === "qa" ? qaSessionId : practiceSessionId))}
            >
              <div style={{ fontSize: 11, fontFamily: "'Oswald', sans-serif", color: "#EB1B23", textTransform: "uppercase", letterSpacing: 0.6 }}>
                {iv.score === "Q&A" ? "Voice Coach Q&A" : "Practice Rating"}
              </div>
              <div style={{ color: "#F5F5F5", fontSize: 13, marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {iv.score === "Q&A" ? "Career Q&A Session" : (iv.questions?.[0] || "Custom Question")}
              </div>
              <div style={{ color: "#8A8A8A", fontSize: 11, marginTop: 4 }}>
                {iv.score === "Q&A" ? "Completed" : `Score: ${iv.score || "Pending"}`}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.logoutWrap}>
          <button className="cc-iv-logout" style={styles.logoutBtn} onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="cc-i-main" style={styles.main}>
        <h2 style={styles.heading}>Voice Mock Interview & Coach</h2>
        <p style={styles.subtitle}>
          Have a live, speech-to-speech Q&A session with our AI Coach, or practice specific questions and get rated.
        </p>

        {/* Mode Switcher */}
        <div style={styles.modeSwitchWrap}>
          <button
            className="cc-iv-modebtn"
            style={styles.modeBtn(mode === "qa")}
            onClick={() => {
              setMode("qa");
              setError("");
              void startNewQA();
            }}
          >
            Live Voice Coach Q&A
          </button>
          <button
            className="cc-iv-modebtn"
            style={styles.modeBtn(mode === "practice")}
            onClick={() => {
              setMode("practice");
              setError("");
            }}
          >
            Practice Rating
          </button>
        </div>

        {error && <div style={styles.errorText}>{error}</div>}

        {/* Mode 1: Voice Coach Q&A Interface */}
        {mode === "qa" && (
          <div>
            {qaStatus === "idle" && (
              <div style={styles.card}>
                <p style={{ margin: "0 0 20px 0", textAlign: "center", color: "#9A9A9A" }}>
                  Start a dynamic speech-to-speech discussion with the Career Coach. Speak any topic, question, or career advice prompt you like.
                </p>
                <button className="cc-iv-newbtn" style={{ ...styles.actionBtn(false), alignSelf: "center" }} onClick={startNewQA}>
                  Start Live Voice Coach
                </button>
              </div>
            )}

            {qaStatus === "active" && (
              <div style={styles.card}>
                <div className="cc-iv-thread" ref={scrollRef} style={styles.qaThread}>
                  {qaTranscript.length === 0 ? (
                    <p style={{ color: "#8A8A8A", textAlign: "center", fontStyle: "italic", margin: "20px 0" }}>
                      AI Coach: "Hi, I am your voice coach. How can I help you today?"
                    </p>
                  ) : (
                    qaTranscript.map((t, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={styles.qaBubble(true)}>
                          <div style={styles.qTag}>You (Spoken)</div>
                          {t.question}
                        </div>
                        <div style={styles.qaBubble(false)}>
                          <div style={styles.aTag}>AI Career Coach</div>
                          {t.answer}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={styles.micPanel}>
                  {uploading ? (
                    <p style={styles.infoText}>Thinking of coach advice...</p>
                  ) : (
                    <>
                      <button
                        style={styles.micBtn(recording)}
                        onClick={recording ? stopRecording : startRecording}
                        title={recording ? "Stop Speaking" : "Start Speaking"}
                      >
                        🎙️
                      </button>
                      <p style={styles.infoText}>
                        {liveThinking
                          ? "Coach is responding..."
                          : liveListening
                            ? "Listening live. Speak naturally and the coach will reply aloud."
                            : recording
                              ? "Listening... click again to stop speaking."
                              : "Speak naturally when you are ready; the coach is listening."}
                      </p>
                    </>
                  )}

                  {recording && (
                    <div className="audio-wave">
                      <span className="wave-bar bar-1"></span>
                      <span className="wave-bar bar-2"></span>
                      <span className="wave-bar bar-3"></span>
                      <span className="wave-bar bar-4"></span>
                      <span className="wave-bar bar-5"></span>
                    </div>
                  )}

                  <button
                    className="cc-iv-secondary"
                    style={{ ...styles.secondaryBtn, marginTop: 18, alignSelf: "center" }}
                    onClick={finishQA}
                    disabled={uploading || recording}
                  >
                    Finish & Summarize Session
                  </button>
                </div>
              </div>
            )}

            {qaStatus === "completed" && (
              <div style={styles.card}>
                <h3 style={{ ...styles.label, color: "#F5F5F5", fontSize: 16, marginBottom: 12 }}>Voice Coach Summary</h3>
                <p style={{ color: "#E0E0E0", lineHeight: 1.6, fontSize: 14.5, whiteSpace: "pre-wrap", marginBottom: 20 }}>
                  {qaSummary || "No summary was generated."}
                </p>
                <button className="cc-iv-newbtn" style={styles.actionBtn(false)} onClick={startNewQA}>
                  Start New Session
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Practice Rating Interface */}
        {mode === "practice" && (
          <div>
            {practiceStatus === "idle" && (
              <div style={styles.card}>
                <div style={styles.practiceControls}>
                  <label style={styles.label}>Choose Question Input Style</label>
                  <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <button
                      className="cc-iv-modebtn"
                      style={styles.modeBtn(practiceInputType === "select")}
                      onClick={() => setPracticeInputType("select")}
                    >
                      Select Curated Question
                    </button>
                    <button
                      className="cc-iv-modebtn"
                      style={styles.modeBtn(practiceInputType === "custom")}
                      onClick={() => setPracticeInputType("custom")}
                    >
                      Enter Custom Question
                    </button>
                  </div>

                  {practiceInputType === "select" ? (
                    <>
                      <label style={styles.label}>Select Interview Question</label>
                      <select
                        style={styles.select}
                        value={practiceQuestion}
                        onChange={(e) => setPracticeQuestion(e.target.value)}
                      >
                        {CURATED_QUESTIONS.map((q, i) => (
                          <option key={i} value={q}>{q}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label style={styles.label}>Custom Interview Question</label>
                      <input
                        type="text"
                        style={styles.input}
                        placeholder="e.g. Tell me about your experience with React..."
                        value={customPracticeQuestion}
                        onChange={(e) => setCustomPracticeQuestion(e.target.value)}
                      />
                    </>
                  )}

                  <button
                    className="cc-iv-newbtn"
                    style={{ ...styles.actionBtn(false), marginTop: 12 }}
                    onClick={startNewPractice}
                  >
                    Start Answer Practice
                  </button>
                </div>
              </div>
            )}

            {practiceStatus === "active" && (
              <div style={styles.card}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  <span style={styles.label}>Question to Practice</span>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#F5F5F5", lineHeight: 1.5 }}>
                    {practiceInputType === "custom" ? customPracticeQuestion : practiceQuestion}
                  </div>
                </div>

                <div style={styles.micPanel}>
                  {uploading ? (
                    <p style={styles.infoText}>Transcribing and evaluating your answer...</p>
                  ) : (
                    <>
                      <button
                        style={styles.micBtn(recording)}
                        onClick={recording ? stopRecording : startRecording}
                        title={recording ? "Stop Recording" : "Record Answer"}
                      >
                        🎙️
                      </button>
                      <p style={styles.infoText}>
                        {recording ? "Recording answer... click again to finish." : "Click microphone and speak your answer."}
                      </p>
                    </>
                  )}

                  {recording && (
                    <div className="audio-wave">
                      <span className="wave-bar bar-1"></span>
                      <span className="wave-bar bar-2"></span>
                      <span className="wave-bar bar-3"></span>
                      <span className="wave-bar bar-4"></span>
                      <span className="wave-bar bar-5"></span>
                    </div>
                  )}

                  <button
                    className="cc-iv-secondary"
                    style={{ ...styles.secondaryBtn, marginTop: 18, alignSelf: "center" }}
                    onClick={() => setPracticeStatus("idle")}
                    disabled={uploading || recording}
                  >
                    Change Question
                  </button>
                </div>
              </div>
            )}

            {practiceStatus === "completed" && practiceResult && (
              <div style={styles.card}>
                <div style={{ marginBottom: 16 }}>
                  <span style={styles.label}>Question</span>
                  <div style={{ fontSize: 15, color: "#9A9A9A", marginTop: 4 }}>
                    {practiceQuestion}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <span style={styles.label}>Your Transcribed Answer</span>
                  <div style={{ fontSize: 14, color: "#E0E0E0", marginTop: 4, fontStyle: "italic" }}>
                    "{practiceResult.answer || "(No speech detected)"}"
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
                  <CircularRating rating={practiceResult.score} />
                  
                  <div style={{ flex: 1 }}>
                    <span style={styles.label}>Constructive Feedback</span>
                    <p style={{ color: "#E0E0E0", lineHeight: 1.6, fontSize: 14.5, marginTop: 6, margin: 0 }}>
                      {practiceResult.feedback}
                    </p>
                  </div>
                </div>

                <button
                  className="cc-iv-newbtn"
                  style={{ ...styles.actionBtn(false), marginTop: 24 }}
                  onClick={() => {
                    setPracticeStatus("idle");
                    setPracticeResult(null);
                  }}
                >
                  Practice Another Question
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Interviewer;