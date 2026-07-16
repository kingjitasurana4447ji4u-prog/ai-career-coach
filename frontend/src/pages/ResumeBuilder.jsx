import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

let idCounter = 1;
const nextId = () => idCounter++;

function ResumeBuilder() {
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const [personal, setPersonal] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
  });

  const [summary, setSummary] = useState("");

  const [experience, setExperience] = useState([
    { id: nextId(), company: "", role: "", dates: "", bullets: "" },
  ]);

  const [education, setEducation] = useState([
    { id: nextId(), school: "", degree: "", dates: "" },
  ]);

  const [skills, setSkills] = useState("");
  const [glowActive, setGlowActive] = useState(false);

  const updatePersonal = (field, value) =>
    setPersonal((p) => ({ ...p, [field]: value }));

  const updateExperience = (id, field, value) =>
    setExperience((list) =>
      list.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

  const addExperience = () =>
    setExperience((list) => [
      ...list,
      { id: nextId(), company: "", role: "", dates: "", bullets: "" },
    ]);

  const removeExperience = (id) =>
    setExperience((list) => list.filter((item) => item.id !== id));

  const updateEducation = (id, field, value) =>
    setEducation((list) =>
      list.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

  const addEducation = () =>
    setEducation((list) => [
      ...list,
      { id: nextId(), school: "", degree: "", dates: "" },
    ]);

  const removeEducation = (id) =>
    setEducation((list) => list.filter((item) => item.id !== id));

  const handleDownloadPdf = () => {
    window.print();
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
    sidebarInfo: {
      padding: "16px",
      color: "#8A8A8A",
      fontSize: 13,
      lineHeight: 1.6,
    },
    downloadBtn: {
      margin: "6px 16px 16px 16px",
      padding: "12px 14px",
      background: "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)",
      color: "#F5F5F5",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: 6,
      cursor: "pointer",
      textAlign: "center",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 13.5,
      letterSpacing: 1,
      textTransform: "uppercase",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.35)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      marginTop: "auto",
      textShadow: "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)",
    },
    main: {
      flex: 1,
      display: "flex",
      minWidth: 0,
      background: "rgba(8, 8, 8, 0.06)",
      backdropFilter: "blur(4px)",
      borderLeft: glowActive ? "2px solid rgba(255,255,255,0.42)" : "1px solid rgba(255,255,255,0.14)",
      boxShadow: glowActive
        ? "0 0 0 1px rgba(255,255,255,0.12), 0 0 22px rgba(255,255,255,0.26), 0 0 48px rgba(210,10,10,0.32), 0 20px 50px rgba(0,0,0,0.35)"
        : "0 20px 50px rgba(0,0,0,0.35)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    formPane: {
      width: "48%",
      overflowY: "auto",
      padding: "36px 32px",
      borderRight: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(10, 10, 10, 0.14)",
    },
    previewPane: {
      width: "52%",
      overflowY: "auto",
      padding: "36px 32px",
      display: "flex",
      justifyContent: "center",
      background: "rgba(10, 10, 10, 0.1)",
    },
    sectionTitle: {
      fontFamily: "'Oswald', 'Inter', sans-serif",
      color: "#F5F5F5",
      fontSize: 15,
      fontWeight: 700,
      marginBottom: 14,
      marginTop: 30,
      letterSpacing: 1,
      textTransform: "uppercase",
      borderBottom: "1px solid rgba(255,255,255,0.16)",
      paddingBottom: 8,
      textShadow: "0 0 8px rgba(255,255,255,0.14)",
    },
    label: {
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 11.5,
      fontWeight: 600,
      color: "#8A8A8A",
      marginBottom: 6,
      display: "block",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    input: {
      width: "100%",
      padding: "10px 13px",
      borderRadius: 6,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(22, 22, 22, 0.72)",
      color: "#F5F5F5",
      outline: "none",
      fontSize: 13.5,
      marginBottom: 12,
      boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif",
      transition: "border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16)",
    },
    textarea: {
      width: "100%",
      padding: "10px 13px",
      borderRadius: 6,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(22, 22, 22, 0.72)",
      color: "#F5F5F5",
      outline: "none",
      fontSize: 13.5,
      marginBottom: 12,
      boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif",
      resize: "vertical",
      minHeight: 70,
      lineHeight: 1.5,
      transition: "border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16)",
    },
    row2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    },
    entryCard: {
      background: "rgba(16, 16, 16, 0.72)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 8,
      padding: "16px",
      marginBottom: 14,
      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 10px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.14)",
      transition: "transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease",
    },
    entryHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    removeBtn: {
      background: "none",
      border: "none",
      color: "#8A8A8A",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      cursor: "pointer",
      padding: "2px 6px",
    },
    addBtn: {
      padding: "10px 14px",
      borderRadius: 6,
      border: "1px dashed rgba(255,255,255,0.2)",
      background: "rgba(22, 22, 22, 0.4)",
      color: "#8A8A8A",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 12.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      cursor: "pointer",
      width: "100%",
      transition: "all 0.15s ease",
      boxShadow: "0 0 8px rgba(255,255,255,0.04)",
    },
    /* --- Printable resume sheet: kept as a clean, professional document
       rather than the app's red/black theme, since this is the actual
       resume the user downloads and sends to employers. --- */
    resumeSheet: {
      background: "#FAFAF9",
      color: "#1C1C1C",
      width: "100%",
      maxWidth: 620,
      minHeight: 800,
      borderRadius: 8,
      padding: "48px 46px",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.45)",
      fontFamily: "'Inter', sans-serif",
    },
    resumeName: {
      fontFamily: "'Inter', sans-serif",
      fontSize: 26,
      fontWeight: 700,
      marginBottom: 2,
      letterSpacing: 0.2,
    },
    resumeTitle: {
      fontSize: 14,
      color: "#5A5A5A",
      marginBottom: 10,
    },
    resumeContact: {
      fontSize: 12,
      color: "#5A5A5A",
      marginBottom: 22,
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
    },
    resumeSectionTitle: {
      fontFamily: "'Inter', sans-serif",
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      color: "#1C1C1C",
      borderBottom: "2px solid #1C1C1C",
      paddingBottom: 4,
      marginTop: 22,
      marginBottom: 10,
    },
    resumeSummary: {
      fontSize: 13,
      lineHeight: 1.6,
      color: "#2A2A2A",
    },
    resumeEntry: {
      marginBottom: 14,
    },
    resumeEntryTop: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      fontWeight: 600,
      color: "#1C1C1C",
    },
    resumeEntrySub: {
      fontSize: 12.5,
      color: "#5A5A5A",
      marginBottom: 4,
    },
    resumeBullets: {
      fontSize: 12.5,
      lineHeight: 1.6,
      color: "#2A2A2A",
      whiteSpace: "pre-line",
      paddingLeft: 16,
    },
    resumeSkills: {
      fontSize: 12.5,
      lineHeight: 1.7,
      color: "#2A2A2A",
    },
  };

  // Particle background copied from Resume.jsx for consistent effect
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
        .cc-rb-navlink:hover { border-color: #EB1B23 !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; text-shadow: 0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.22) !important; }
        .cc-rb-navlink:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-rb-input {
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
        }
        .cc-rb-input:hover {
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3) !important;
          transform: translateY(-1px);
        }
        .cc-rb-input:focus {
          border-color: rgba(255,255,255,1) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3);
          transform: translateY(-1px);
        }
        .cc-rb-sidebar, .cc-rb-main {
          transition: box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cc-rb-sidebar:hover {
          border-color: rgba(255,255,255,0.78) !important;
          box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        .cc-rb-main:hover {
          border-color: rgba(255,255,255,0.78) !important;
          box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        .cc-rb-entry-card {
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
        }
        .cc-rb-entry-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 28px rgba(210,10,10,0.28) !important;
        }
        .cc-rb-add:hover { border-color: #D20A0A !important; color: #F5F5F5 !important; box-shadow: 0 0 10px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16) !important; }
        .cc-rb-remove:hover { color: #EB1B23 !important; }
        .cc-rb-download:hover { background: linear-gradient(135deg, #EB1B23 0%, #B30909 100%) !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; }
        .cc-rb-download:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-rb-form::-webkit-scrollbar, .cc-rb-preview::-webkit-scrollbar { width: 8px; }
        .cc-rb-form::-webkit-scrollbar-thumb, .cc-rb-preview::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }

        @media print {
          body * { visibility: hidden; }
          .cc-rb-printable, .cc-rb-printable * { visibility: visible; }
          .cc-rb-printable {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            box-shadow: none !important;
          }
        }
      `}</style>

      <ParticleBackground />

      <div className="cc-rb-sidebar" style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoDot} />
          AI Career Coach
        </div>

        <div style={styles.navRow}>
          <Link className="cc-rb-navlink" to="/chat" style={styles.navLink(false)}>
            Chat
          </Link>
          <Link className="cc-rb-navlink" to="/resume" style={styles.navLink(false)}>
            Resume
          </Link>
          <Link className="cc-rb-navlink" to="/resume-builder" style={styles.navLink(true)}>
            Builder
          </Link>
          <Link className="cc-rb-navlink" to="/mind-map" style={styles.navLink(false)}>
            Mind Map
          </Link>
          <Link className="cc-rb-navlink" to="/interview" style={styles.navLink(false)}>
            Interview
          </Link>
        </div>

        <p style={styles.sidebarInfo}>
          Fill in your details on the left. Your resume builds itself in a
          live preview on the right — download it as a PDF whenever you're
          ready.
        </p>

        <button
          className="cc-rb-download"
          style={styles.downloadBtn}
          onClick={handleDownloadPdf}
        >
          Download as PDF
        </button>
      </div>

      <div className="cc-rb-main" style={styles.main}>
        <div className="cc-rb-form" style={styles.formPane}>
          <div style={{ ...styles.sectionTitle, marginTop: 0 }}>
            Personal Info
          </div>
          <label style={styles.label}>Full Name</label>
          <input
            className="cc-rb-input"
            style={styles.input}
            value={personal.name}
            onChange={(e) => updatePersonal("name", e.target.value)}
            placeholder="Jordan Patel"
          />
          <label style={styles.label}>Professional Title</label>
          <input
            className="cc-rb-input"
            style={styles.input}
            value={personal.title}
            onChange={(e) => updatePersonal("title", e.target.value)}
            placeholder="Product Manager"
          />
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Email</label>
              <input
                className="cc-rb-input"
                style={styles.input}
                value={personal.email}
                onChange={(e) => updatePersonal("email", e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label style={styles.label}>Phone</label>
              <input
                className="cc-rb-input"
                style={styles.input}
                value={personal.phone}
                onChange={(e) => updatePersonal("phone", e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Location</label>
              <input
                className="cc-rb-input"
                style={styles.input}
                value={personal.location}
                onChange={(e) => updatePersonal("location", e.target.value)}
                placeholder="Austin, TX"
              />
            </div>
            <div>
              <label style={styles.label}>LinkedIn</label>
              <input
                className="cc-rb-input"
                style={styles.input}
                value={personal.linkedin}
                onChange={(e) => updatePersonal("linkedin", e.target.value)}
                placeholder="linkedin.com/in/you"
              />
            </div>
          </div>

          <div style={styles.sectionTitle}>Summary</div>
          <textarea
            className="cc-rb-input"
            style={styles.textarea}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="A short 2-3 sentence pitch about your experience and strengths."
          />

          <div style={styles.sectionTitle}>Experience</div>
          {experience.map((exp) => (
            <div key={exp.id} className="cc-rb-entry-card" style={styles.entryCard}>
              <div style={styles.entryHeader}>
                <label style={styles.label}>Role & Company</label>
                {experience.length > 1 && (
                  <button
                    className="cc-rb-remove"
                    style={styles.removeBtn}
                    onClick={() => removeExperience(exp.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div style={styles.row2}>
                <input
                  className="cc-rb-input"
                  style={styles.input}
                  value={exp.role}
                  onChange={(e) =>
                    updateExperience(exp.id, "role", e.target.value)
                  }
                  placeholder="Senior PM"
                />
                <input
                  className="cc-rb-input"
                  style={styles.input}
                  value={exp.company}
                  onChange={(e) =>
                    updateExperience(exp.id, "company", e.target.value)
                  }
                  placeholder="Acme Corp"
                />
              </div>
              <input
                className="cc-rb-input"
                style={styles.input}
                value={exp.dates}
                onChange={(e) =>
                  updateExperience(exp.id, "dates", e.target.value)
                }
                placeholder="Jan 2022 — Present"
              />
              <textarea
                className="cc-rb-input"
                style={styles.textarea}
                value={exp.bullets}
                onChange={(e) =>
                  updateExperience(exp.id, "bullets", e.target.value)
                }
                placeholder={"One achievement per line, e.g.\nLed launch of X, increasing signups 30%"}
              />
            </div>
          ))}
          <button className="cc-rb-add" style={styles.addBtn} onClick={addExperience}>
            + Add Experience
          </button>

          <div style={styles.sectionTitle}>Education</div>
          {education.map((edu) => (
            <div key={edu.id} className="cc-rb-entry-card" style={styles.entryCard}>
              <div style={styles.entryHeader}>
                <label style={styles.label}>School & Degree</label>
                {education.length > 1 && (
                  <button
                    className="cc-rb-remove"
                    style={styles.removeBtn}
                    onClick={() => removeEducation(edu.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                className="cc-rb-input"
                style={styles.input}
                value={edu.school}
                onChange={(e) =>
                  updateEducation(edu.id, "school", e.target.value)
                }
                placeholder="University of Texas"
              />
              <div style={styles.row2}>
                <input
                  className="cc-rb-input"
                  style={styles.input}
                  value={edu.degree}
                  onChange={(e) =>
                    updateEducation(edu.id, "degree", e.target.value)
                  }
                  placeholder="B.S. Computer Science"
                />
                <input
                  className="cc-rb-input"
                  style={styles.input}
                  value={edu.dates}
                  onChange={(e) =>
                    updateEducation(edu.id, "dates", e.target.value)
                  }
                  placeholder="2018 — 2022"
                />
              </div>
            </div>
          ))}
          <button className="cc-rb-add" style={styles.addBtn} onClick={addEducation}>
            + Add Education
          </button>

          <div style={styles.sectionTitle}>Skills</div>
          <textarea
            className="cc-rb-input"
            style={styles.textarea}
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Comma-separated, e.g. SQL, Roadmapping, A/B Testing, Figma"
          />
          <div style={{ height: 20 }} />
        </div>

        <div className="cc-rb-preview" style={styles.previewPane}>
          <div
            className="cc-rb-printable"
            ref={previewRef}
            style={styles.resumeSheet}
          >
            <div style={styles.resumeName}>
              {personal.name || "Your Name"}
            </div>
            {personal.title && (
              <div style={styles.resumeTitle}>{personal.title}</div>
            )}
            <div style={styles.resumeContact}>
              {personal.email && <span>{personal.email}</span>}
              {personal.phone && <span>{personal.phone}</span>}
              {personal.location && <span>{personal.location}</span>}
              {personal.linkedin && <span>{personal.linkedin}</span>}
            </div>

            {summary && (
              <>
                <div style={styles.resumeSectionTitle}>Summary</div>
                <div style={styles.resumeSummary}>{summary}</div>
              </>
            )}

            {experience.some((e) => e.role || e.company) && (
              <>
                <div style={styles.resumeSectionTitle}>Experience</div>
                {experience.map((exp) =>
                  exp.role || exp.company ? (
                    <div key={exp.id} style={styles.resumeEntry}>
                      <div style={styles.resumeEntryTop}>
                        <span>
                          {exp.role}
                          {exp.role && exp.company ? " — " : ""}
                          {exp.company}
                        </span>
                        <span>{exp.dates}</span>
                      </div>
                      {exp.bullets && (
                        <ul style={styles.resumeBullets}>
                          {exp.bullets
                            .split("\n")
                            .filter((b) => b.trim())
                            .map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ) : null
                )}
              </>
            )}

            {education.some((e) => e.school || e.degree) && (
              <>
                <div style={styles.resumeSectionTitle}>Education</div>
                {education.map((edu) =>
                  edu.school || edu.degree ? (
                    <div key={edu.id} style={styles.resumeEntry}>
                      <div style={styles.resumeEntryTop}>
                        <span>{edu.degree}</span>
                        <span>{edu.dates}</span>
                      </div>
                      <div style={styles.resumeEntrySub}>{edu.school}</div>
                    </div>
                  ) : null
                )}
              </>
            )}

            {skills && (
              <>
                <div style={styles.resumeSectionTitle}>Skills</div>
                <div style={styles.resumeSkills}>{skills}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResumeBuilder;