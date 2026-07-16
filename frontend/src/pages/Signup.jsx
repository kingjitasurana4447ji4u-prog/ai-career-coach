import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

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
      }}
    />
  );
}

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Signup failed");
      }
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "radial-gradient(ellipse 1200px 600px at 50% -10%, #1A0808 0%, #0A0A0A 45%), #0A0A0A",
      fontFamily: "'Inter', sans-serif",
      WebkitFontSmoothing: "antialiased",
      padding: 20,
      position: "relative",
      overflow: "hidden",
    },
    card: {
      width: "100%",
      maxWidth: 380,
      background: "#161616",
      borderRadius: 8,
      padding: "38px 32px",
      border: "1px solid #2A2A2A",
      borderTop: "3px solid rgba(245,245,245,0.22)",
      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      position: "relative",
      zIndex: 1,
    },
    logoRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: 8,
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
    logo: {
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 22,
      fontWeight: 700,
      fontStyle: "italic",
      color: "#F5F5F5",
      textAlign: "center",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    subtitle: {
      color: "#9A9A9A",
      fontSize: 13.5,
      textAlign: "center",
      marginBottom: 32,
    },
    label: {
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 12,
      fontWeight: 600,
      color: "#8A8A8A",
      marginBottom: 7,
      display: "block",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 6,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "#0A0A0A",
      color: "#F5F5F5",
      outline: "none",
      fontSize: 14,
      marginBottom: 16,
      boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif",
      transition: "border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16)",
    },
    passwordRow: {
      position: "relative",
    },
    toggleBtn: {
      position: "absolute",
      right: 14,
      top: 12,
      background: "none",
      border: "none",
      color: "#8A8A8A",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      cursor: "pointer",
      padding: 0,
    },
    hint: {
      color: "#8A8A8A",
      fontSize: 12,
      marginTop: -12,
      marginBottom: 16,
    },
    submitBtn: {
      width: "100%",
      padding: "13px 22px",
      borderRadius: 6,
      border: "none",
      background: loading
        ? "#3A1414"
        : "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)",
      color: loading ? "#8A5A5A" : "#F5F5F5",
      cursor: loading ? "not-allowed" : "pointer",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: 4,
      boxShadow: loading ? "none" : "0 4px 14px rgba(210,10,10,0.3)",
      transition: "all 0.15s ease",
    },
    error: {
      color: "#EB1B23",
      fontSize: 13,
      marginTop: -6,
      marginBottom: 14,
    },
    footer: {
      color: "#8A8A8A",
      fontSize: 13,
      textAlign: "center",
      marginTop: 24,
    },
    link: {
      color: "#D20A0A",
      textDecoration: "none",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');

        .cc-signup-card {
          transition: box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cc-signup-card:hover {
          border-color: rgba(255,255,255,0.78) !important;
          box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important;
        }

        .cc-signup-input {
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
        }
        .cc-signup-input:hover {
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3) !important;
          transform: translateY(-1px);
        }
        .cc-signup-input:focus {
          border-color: rgba(255,255,255,1) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3);
          transform: translateY(-1px);
        }
        .cc-signup-input:focus-visible { outline: none; }

        .cc-signup-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(235,27,35,0.45) !important; background: linear-gradient(135deg, #EB1B23 0%, #B30909 100%) !important; }
        .cc-signup-submit:active:not(:disabled) { transform: scale(0.98); }
        .cc-signup-submit:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-signup-link:hover { color: #EB1B23 !important; text-decoration: underline; }
        .cc-signup-toggle:hover { color: #F5F5F5 !important; }
      `}</style>

      <ParticleBackground />

      <div className="cc-signup-card" style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoDot} />
          <div style={styles.logo}>AI Career Coach</div>
        </div>
        <div style={styles.subtitle}>Create an account to get started</div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            className="cc-signup-input"
            required
          />

          <label style={styles.label}>Password</label>
          <div style={styles.passwordRow}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              className="cc-signup-input"
              required
              minLength={8}
            />
            <button
              type="button"
              className="cc-signup-toggle"
              style={styles.toggleBtn}
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <p style={styles.hint}>Use at least 8 characters.</p>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            className="cc-signup-submit"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <a href="/login" className="cc-signup-link" style={styles.link}>
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}

export default Signup;