import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];

    const DENSITY = 9000; // px^2 per particle
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
        opacity: 1,
        display: "block",
        background: "transparent",
      }}
    />
  );
}

function Resume() {
  const [resumes, setResumes] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [error, setError] = useState("");
  const [glowActive, setGlowActive] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleAuthFail = (res) => {
    if (res.status === 401) {
      localStorage.removeItem("active_conversation_id");
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch(`${API_URL}/resume`, {
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
      const res = await fetch(`${API_URL}/resume/analyze`, {
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
      const res = await fetch(`${API_URL}/resume/${id}`, {
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
      background:
        "radial-gradient(ellipse 1200px 600px at 50% -10%, #1A0808 0%, #0A0A0A 45%), #0A0A0A",
      fontFamily: "'Inter', sans-serif",
      WebkitFontSmoothing: "antialiased",
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
      borderRight: glowActive ? "2px solid rgba(255,255,255,0.42)" : "1px solid rgba(255,255,255,0.14)",
      boxShadow: glowActive
        ? "0 0 0 1px rgba(255,255,255,0.12), 0 0 22px rgba(255,255,255,0.26), 0 0 48px rgba(210,10,10,0.32), 0 20px 50px rgba(0,0,0,0.35)"
        : "0 20px 50px rgba(0,0,0,0.35)",
      zIndex: 2,
      position: "relative",
      backdropFilter: "blur(4px)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    logo: {
      padding: "26px 22px",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 22,
      fontWeight: 700,
      fontStyle: "italic",
      color: "#F5F5F5",
      borderBottom: "1px solid rgba(255,255,255,0.14)",
      borderTop: "3px solid rgba(245,245,245,0.22)",
      display: "flex",
      alignItems: "center",
      gap: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      position: "relative",
      textShadow: "0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(210,10,10,0.16)",
    },
    logoDot: {
      width: 14,
      height: 14,
      background: "#D20A0A",
      clipPath:
        "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      boxShadow: "0 0 14px rgba(210,10,10,0.8)",
      flexShrink: 0,
    },
    navRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      padding: "16px 16px 14px",
    },
    navLink: (active) => ({
      flex: "1 1 40%",
      textAlign: "center",
      padding: "9px 10px",
      borderRadius: 6,
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 12.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 1,
      textDecoration: "none",
      display: "block",
      color: active ? "#F5F5F5" : "#8A8A8A",
      background: active ? "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)" : "#161616",
      border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.16)",
      boxShadow: active
        ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.38)"
        : "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.2)",
      transition: "all 0.18s ease",
      textShadow: active
        ? "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)"
        : "0 0 7px rgba(255,255,255,0.14), 0 0 12px rgba(210,10,10,0.16)",
    }),
    uploadBtn: {
      margin: "4px 16px 16px 16px",
      padding: "12px 14px",
      background: "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)",
      color: "#F5F5F5",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: 6,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 13.5,
      letterSpacing: 1,
      textTransform: "uppercase",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.35)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      textShadow: "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)",
    },
    convoList: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 10px",
    },
    convoItem: (active) => ({
      padding: "11px 12px",
      marginBottom: 3,
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 13.5,
      fontWeight: active ? 500 : 400,
      letterSpacing: 0.1,
      color: active ? "#F5F5F5" : "#9A9A9A",
      background: active ? "rgba(22, 22, 22, 0.74)" : "transparent",
      borderLeft: active ? "3px solid #D20A0A" : "3px solid transparent",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      transition: "all 0.15s ease",
      textShadow: active ? "0 0 8px rgba(255,255,255,0.16)" : "0 0 6px rgba(255,255,255,0.12)",
    }),
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "rgba(8, 8, 8, 0.06)",
      padding: "40px 12%",
      overflowY: "auto",
      position: "relative",
      zIndex: 1,
      backdropFilter: "blur(4px)",
      borderLeft: glowActive ? "2px solid rgba(255,255,255,0.42)" : "1px solid rgba(255,255,255,0.14)",
      boxShadow: glowActive
        ? "0 0 0 1px rgba(255,255,255,0.12), 0 0 22px rgba(255,255,255,0.26), 0 0 48px rgba(210,10,10,0.32), 0 20px 50px rgba(0,0,0,0.35)"
        : "0 20px 50px rgba(0,0,0,0.35)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    emptyState: {
      color: "#8A8A8A",
      textAlign: "center",
      marginTop: 120,
      fontSize: 15,
      lineHeight: 1.6,
      fontFamily: "'Inter', sans-serif",
    },
    analyzingState: {
      color: "#D20A0A",
      textAlign: "center",
      marginTop: 120,
      fontSize: 15,
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 600,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    resultBox: {
      background: "rgba(22, 22, 22, 0.74)",
      borderRadius: 8,
      padding: "30px 34px",
      color: "#F5F5F5",
      lineHeight: 1.6,
      border: "1px solid rgba(255,255,255,0.16)",
      borderTop: "3px solid rgba(245,245,245,0.22)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 0 10px rgba(255,255,255,0.1), 0 0 22px rgba(210,10,10,0.2)",
      transition: "transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease",
    },
    filename: {
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 20,
      fontWeight: 700,
      marginBottom: 22,
      color: "#F5F5F5",
      letterSpacing: 0.4,
    },
    sectionHeading: {
      fontFamily: "'Oswald', 'Inter', sans-serif",
      color: "#D20A0A",
      fontSize: 15,
      fontWeight: 700,
      marginTop: 22,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 1,
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
      background: "#1D0E0E",
      color: "#EB1B23",
      padding: "13px 17px",
      borderRadius: 6,
      marginBottom: 16,
      fontSize: 14,
      border: "1px solid #3A1414",
    },
  };

  return (
    <div
      style={styles.page}
      onMouseEnter={() => setGlowActive(true)}
      onMouseMove={() => setGlowActive(true)}
      onMouseLeave={() => setGlowActive(false)}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');
        .cc-r-navlink:hover { border-color: #EB1B23 !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; text-shadow: 0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.22) !important; }
        .cc-r-navlink:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-r-convo:hover { background: rgba(22, 22, 22, 0.74) !important; color: #F5F5F5 !important; text-shadow: 0 0 8px rgba(255,255,255,0.2) !important; }
        .cc-r-upload:hover:not(:disabled) { background: linear-gradient(135deg, #EB1B23 0%, #B30909 100%) !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; }
        .cc-r-upload:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-r-sidebar, .cc-r-main { transition: box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .cc-r-sidebar:hover { border-color: rgba(255,255,255,0.78) !important; box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important; }
        .cc-r-main:hover { border-color: rgba(255,255,255,0.78) !important; box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important; }
        .cc-r-resultbox {
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
        }
        .cc-r-resultbox:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 28px rgba(210,10,10,0.28) !important;
        }
        .cc-r-list::-webkit-scrollbar { width: 6px; }
        .cc-r-list::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        .cc-r-main::-webkit-scrollbar { width: 8px; }
        .cc-r-main::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
      `}</style>

      <ParticleBackground />

      <div className="cc-r-sidebar" style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoDot} />
          AI Career Coach
        </div>

        <div style={styles.navRow}>
          <Link className="cc-r-navlink" to="/chat" style={styles.navLink(false)}>
            Chat
          </Link>
          <Link className="cc-r-navlink" to="/resume" style={styles.navLink(true)}>
            Resume
          </Link>
          <Link className="cc-r-navlink" to="/resume-builder" style={styles.navLink(false)}>
            Builder
          </Link>
          <Link className="cc-r-navlink" to="/mind-map" style={styles.navLink(false)}>
            Mind Map
          </Link>
          <Link className="cc-r-navlink" to="/interview" style={styles.navLink(false)}>
            Interview
          </Link>
        </div>

        <button
          className="cc-r-upload"
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

        <div className="cc-r-list" style={styles.convoList}>
          {loadingList && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px" }}>
              Loading...
            </p>
          )}
          {!loadingList && resumes.length === 0 && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px" }}>
              No resumes uploaded yet
            </p>
          )}
          {resumes.map((r) => (
            <div
              key={r.id}
              className="cc-r-convo"
              onClick={() => loadResume(r.id)}
              style={styles.convoItem(selectedResume?.id === r.id)}
            >
              {r.filename}
            </div>
          ))}
        </div>
      </div>

      <div className="cc-r-main" style={styles.main}>
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
          <div className="cc-r-resultbox" style={styles.resultBox}>
            <div style={styles.filename}>{selectedResume.filename}</div>
            {formatAnalysis(selectedResume.analysis)}
          </div>
        )}
      </div>
    </div>
  );
}

export default Resume;