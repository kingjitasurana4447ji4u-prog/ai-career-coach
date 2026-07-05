import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

function Resume() {
  const [resumes, setResumes] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleAuthFail = (res) => {
    if (res.status === 401) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/resume", {
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setResumes(data);
    } catch (err) {
      console.error("Failed to load resumes", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }

    setError("");
    setAnalyzing(true);
    setSelectedResume(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/resume/analyze", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (handleAuthFail(res)) return;

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to analyze resume");
      }

      const data = await res.json();
      setSelectedResume(data);
      fetchResumes();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadResume = async (id) => {
    try {
      const res = await fetch(`https://ai-career-coach-djum.onrender.com/resume/${id}`, {
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setSelectedResume(data);
    } catch (err) {
      console.error("Failed to load resume", err);
    }
  };

  const formatAnalysis = (text) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} style={styles.sectionHeading}>
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.trim().startsWith("*")) {
        return (
          <li key={i} style={styles.bulletItem}>
            {line.replace(/^\*+\s*/, "")}
          </li>
        );
      }
      if (line.trim() === "") return null;
      return (
        <p key={i} style={styles.paragraph}>
          {line}
        </p>
      );
    });
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
    navLink: (active) => ({
      flex: "1 1 40%",
      textAlign: "center",
      padding: "8px 10px",
      borderRadius: 8,
      fontSize: 13,
      textDecoration: "none",
      color: active ? "#10151A" : "#8B93A1",
      background: active ? "#E8A758" : "#171E27",
      fontWeight: 600,
    }),
    uploadBtn: {
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
    },
    convoList: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 10px",
    },
    convoItem: (active) => ({
      padding: "11px 12px",
      marginBottom: 3,
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 13.5,
      color: active ? "#F3EFE9" : "#8B93A1",
      background: active ? "#171E27" : "transparent",
      borderLeft: active ? "3px solid #E8A758" : "3px solid transparent",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "#151B22",
      padding: "40px 12%",
      overflowY: "auto",
    },
    emptyState: {
      color: "#5C6675",
      textAlign: "center",
      marginTop: 120,
      fontSize: 15,
      fontFamily: "'Fraunces', serif",
    },
    analyzingState: {
      color: "#E8A758",
      textAlign: "center",
      marginTop: 120,
      fontSize: 15,
    },
    resultBox: {
      background: "#1E2530",
      borderRadius: 14,
      padding: "28px 32px",
      color: "#E8E6E1",
      lineHeight: 1.6,
    },
    filename: {
      fontFamily: "'Fraunces', serif",
      fontSize: 20,
      marginBottom: 20,
      color: "#F3EFE9",
    },
    sectionHeading: {
      fontFamily: "'Fraunces', serif",
      color: "#E8A758",
      fontSize: 17,
      marginTop: 20,
      marginBottom: 8,
    },
    bulletItem: {
      marginLeft: 20,
      marginBottom: 6,
      fontSize: 14.5,
    },
    paragraph: {
      fontSize: 14.5,
      marginBottom: 6,
    },
    errorBox: {
      background: "#2A1B1B",
      color: "#E8927D",
      padding: "12px 16px",
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 14,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>AI Career Coach</div>

        <div style={styles.navRow}>
          <Link to="/chat" style={styles.navLink(false)}>
            Chat
          </Link>
          <Link to="/resume" style={styles.navLink(true)}>
            Resume
          </Link>
          <Link to="/resume-builder" style={styles.navLink(false)}>
            Builder
          </Link>
          <Link to="/mind-map" style={styles.navLink(false)}>
            Mind Map
          </Link>
          <Link to="/interview" style={styles.navLink(false)}>
            Interview
          </Link>
        </div>

        <button
          style={styles.uploadBtn}
          onClick={() => fileInputRef.current.click()}
          disabled={analyzing}
        >
          {analyzing ? "Analyzing..." : "+ Upload Resume (PDF)"}
        </button>
        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div style={styles.convoList}>
          {loadingList && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              Loading...
            </p>
          )}
          {!loadingList && resumes.length === 0 && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              No resumes uploaded yet
            </p>
          )}
          {resumes.map((r) => (
            <div
              key={r.id}
              onClick={() => loadResume(r.id)}
              style={styles.convoItem(selectedResume?.id === r.id)}
            >
              {r.filename}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.main}>
        {error && <div style={styles.errorBox}>{error}</div>}

        {analyzing && (
          <p style={styles.analyzingState}>Analyzing your resume...</p>
        )}

        {!analyzing && !selectedResume && (
          <p style={styles.emptyState}>
            Upload a PDF resume to get instant AI feedback on strengths,
            weaknesses, and ATS optimization.
          </p>
        )}

        {!analyzing && selectedResume && (
          <div style={styles.resultBox}>
            <div style={styles.filename}>{selectedResume.filename}</div>
            {formatAnalysis(selectedResume.analysis)}
          </div>
        )}
      </div>
    </div>
  );
}

export default Resume;
