import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const SUGGESTIONS = [
  "How do I make my resume stand out?",
  "What questions should I expect in a PM interview?",
  "Help me plan a career switch into tech",
  "Review my LinkedIn headline",
];

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

function Chat() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("active_chat_messages");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState(() => {
    return localStorage.getItem("chat_draft_input") || "";
  });
  const [loading, setLoading] = useState(false);
  const [glowActive, setGlowActive] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    const saved = localStorage.getItem("active_conversation_id");
    return (saved && saved !== "pending") ? parseInt(saved, 10) : null;
  });
  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

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
      console.error("Logout failed", err);
    }
    localStorage.removeItem("active_conversation_id");
    localStorage.removeItem("active_chat_messages");
    localStorage.removeItem("chat_draft_input");
    navigate("/login");
  };

  const handleAuthFail = (res) => {
    if (res.status === 401) {
      localStorage.removeItem("active_conversation_id");
      localStorage.removeItem("active_chat_messages");
      localStorage.removeItem("chat_draft_input");
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, {
        credentials: "include",
      });
      if (handleAuthFail(res)) return null;
      const data = await res.json();
      setConversations(data);
      return data;
    } catch (err) {
      console.error("Failed to load conversations", err);
      return null;
    } finally {
      setLoadingConvos(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const convos = await fetchConversations();
      if (convos) {
        const saved = localStorage.getItem("active_conversation_id");
        if (saved === "pending") {
          if (convos.length > 0) {
            loadConversation(convos[0].id);
          } else {
            localStorage.removeItem("active_conversation_id");
            setConversationId(null);
            setMessages([]);
          }
        } else if (saved) {
          loadConversation(parseInt(saved, 10));
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages && messages.length > 0) {
      localStorage.setItem("active_chat_messages", JSON.stringify(messages));
    } else {
      localStorage.removeItem("active_chat_messages");
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const startNewChat = () => {
    setConversationId(null);
    localStorage.removeItem("active_conversation_id");
    setMessages([]);
    setInput("");
    localStorage.removeItem("chat_draft_input");
    inputRef.current?.focus();
  };

  const loadConversation = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/conversations/${id}`, {
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setConversationId(data.id);
      localStorage.setItem("active_conversation_id", data.id);
      setMessages(
        data.messages.map((m) => ({
          role: m.role === "user" ? "user" : "ai",
          text: m.content,
        }))
      );
    } catch (err) {
      console.error("Failed to load conversation", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e, textOverride) => {
    e?.preventDefault();
    const text = (textOverride ?? input).trim();
    if (!text) return;

    const userMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    localStorage.removeItem("chat_draft_input");
    setLoading(true);

    const isNew = conversationId === null;
    if (isNew) {
      localStorage.setItem("active_conversation_id", "pending");
    }

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        credentials: "include",
        headers: jsonHeaders,
        body: JSON.stringify({
          message: userMessage.text,
          conversation_id: isNew ? null : conversationId,
        }),
      });

      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      setConversationId(data.conversation_id);
      localStorage.setItem("active_conversation_id", data.conversation_id);
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);

      if (isNew) {
        fetchConversations();
      }
    } catch (err) {
      if (isNew) {
        localStorage.removeItem("active_conversation_id");
      }
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error: could not reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const activeTitle =
    conversations.find((c) => c.id === conversationId)?.title || "New conversation";

  const renderMessageText = (text) => {
    const lines = text
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const isBulletList = lines.some((line) => /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line));

    if (!isBulletList || lines.length === 0) {
      return <div style={styles.messageText}>{text}</div>;
    }

    return (
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          display: "grid",
          gap: 6,
          color: "#F5F5F5",
        }}
      >
        {lines.map((line, index) => {
          const cleanLine = line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "");
          return (
            <li key={`${line}-${index}`} style={{ lineHeight: 1.7 }}>
              {cleanLine}
            </li>
          );
        })}
      </ul>
    );
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
      background: "rgba(10, 10, 10, 0.08)",
      color: "#F5F5F5",
      display: "flex",
      flexDirection: "column",
      borderRight: glowActive ? "2px solid rgba(255,255,255,0.42)" : "1px solid rgba(255,255,255,0.14)",
      borderTop: "3px solid rgba(245,245,245,0.22)",
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
      borderBottom: "1px solid #2A2A2A",
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
    navTab: (active) => ({
      flex: "1 1 40%",
      textAlign: "center",
      padding: "9px 10px",
      borderRadius: 6,
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 12.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: active ? "#F5F5F5" : "#8A8A8A",
      background: active ? "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)" : "#161616",
      cursor: "pointer",
      border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.16)",
      boxShadow: active
        ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.38)"
        : "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.2)",
      transition: "all 0.18s ease",
      textShadow: active
        ? "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)"
        : "0 0 7px rgba(255,255,255,0.14), 0 0 12px rgba(210,10,10,0.16)",
    }),
    newChatBtn: {
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
      background: active ? "#161616" : "transparent",
      borderLeft: active ? "3px solid #D20A0A" : "3px solid transparent",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      transition: "all 0.15s ease",
      textShadow: active ? "0 0 8px rgba(255,255,255,0.16)" : "0 0 6px rgba(255,255,255,0.12)",
    }),
    logoutWrap: {
      padding: 14,
      borderTop: "1px solid #2A2A2A",
    },
    logoutBtn: {
      width: "100%",
      padding: "10px 12px",
      background: "rgba(22, 22, 22, 0.9)",
      color: "#8A8A8A",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 6,
      cursor: "pointer",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 12.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 1,
      transition: "all 0.15s ease",
      textShadow: "0 0 7px rgba(255,255,255,0.14), 0 0 12px rgba(210,10,10,0.16)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.18)",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "rgba(8, 8, 8, 0.06)",
      minWidth: 0,
      position: "relative",
      zIndex: 1,
      borderTop: "3px solid rgba(245,245,245,0.22)",
      borderLeft: glowActive ? "2px solid rgba(255,255,255,0.42)" : "1px solid rgba(255,255,255,0.14)",
      boxShadow: glowActive
        ? "0 0 0 1px rgba(255,255,255,0.12), 0 0 22px rgba(255,255,255,0.26), 0 0 48px rgba(210,10,10,0.32), 0 20px 50px rgba(0,0,0,0.35)"
        : "0 20px 50px rgba(0,0,0,0.35)",
      backdropFilter: "blur(4px)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    header: {
      padding: "18px 18%",
      borderBottom: "1px solid #2A2A2A",
      color: "#8A8A8A",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 12.5,
      fontWeight: 600,
      letterSpacing: 2,
      textTransform: "uppercase",
      textShadow: "0 0 8px rgba(255,255,255,0.14)",
    },
    messagesArea: {
      flex: 1,
      overflowY: "auto",
      padding: "40px 18%",
    },
    emptyState: {
      textAlign: "center",
      marginTop: 90,
    },
    emptyIconRing: {
      width: 88,
      height: 88,
      margin: "0 auto 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid #2A2A2A",
      clipPath:
        "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      position: "relative",
    },
    emptyIcon: {
      width: 64,
      height: 64,
      background: "#D20A0A",
      clipPath:
        "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      margin: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 700,
      fontSize: 18,
      letterSpacing: 1,
      color: "#F5F5F5",
      position: "relative",
      boxShadow: "0 8px 30px rgba(210,10,10,0.4)",
      animation: "iconPulse 2.4s ease-in-out infinite",
    },
    emptyTitle: {
      color: "#F5F5F5",
      fontSize: 24,
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 600,
      marginBottom: 8,
      letterSpacing: 1,
      textTransform: "uppercase",
      textShadow: "0 0 10px rgba(255,255,255,0.2), 0 0 22px rgba(210,10,10,0.15)",
    },
    emptySubtitle: {
      color: "#9A9A9A",
      fontSize: 14.5,
      lineHeight: 1.6,
      marginBottom: 28,
      textShadow: "0 0 6px rgba(255,255,255,0.12)",
    },
    chipRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center",
      maxWidth: 520,
      margin: "0 auto",
    },
    row: (isUser) => ({
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: "flex-end",
      gap: 10,
      marginBottom: 18,
      animation: "msgIn 0.25s ease-out",
    }),
    messageText: {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      fontSize: 14.5,
      lineHeight: 1.7,
      whiteSpace: "pre-wrap",
      color: "#F5F5F5",
      textShadow: "0 0 6px rgba(255,255,255,0.08)",
    },
    avatar: (isUser) => ({
      width: 28,
      height: 28,
      clipPath:
        "polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)",
      background: isUser ? "#161616" : "#D20A0A",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      fontWeight: 800,
      color: isUser ? "#8A8A8A" : "#F5F5F5",
      border: isUser ? "1px solid #2A2A2A" : "none",
      boxShadow: isUser ? "none" : "0 2px 10px rgba(210,10,10,0.35)",
    }),
    bubble: (isUser) => ({
      display: "inline-block",
      background: isUser
        ? "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)"
        : "rgba(22, 22, 22, 0.74)",
      color: "#F5F5F5",
      padding: "12px 17px",
      borderRadius: 8,
      borderBottomRightRadius: isUser ? 2 : 8,
      borderBottomLeftRadius: isUser ? 8 : 2,
      border: "1px solid rgba(255,255,255,0.16)",
      boxShadow: isUser
        ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.14), 0 0 24px rgba(210,10,10,0.25)"
        : "0 0 0 1px rgba(255,255,255,0.06), 0 0 10px rgba(255,255,255,0.1), 0 0 22px rgba(210,10,10,0.2)",
      maxWidth: "75%",
      whiteSpace: "pre-wrap",
      lineHeight: 1.65,
      fontSize: 14.5,
      letterSpacing: 0.1,
      textShadow: "0 0 6px rgba(255,255,255,0.12)",
      transition: "transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease",
    }),
    typingBubble: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "rgba(22, 22, 22, 0.9)",
      padding: "14px 17px",
      borderRadius: 8,
      borderBottomLeftRadius: 2,
      border: "1px solid rgba(255,255,255,0.16)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 0 10px rgba(255,255,255,0.1), 0 0 22px rgba(210,10,10,0.2)",
    },
    dot: (delay) => ({
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "#8A8A8A",
      animation: `typingDot 1.2s ${delay}s infinite ease-in-out`,
    }),
    formWrap: {
      display: "flex",
      padding: "20px 18%",
      borderTop: "1px solid #2A2A2A",
      gap: 10,
    },
    input: {
      flex: 1,
      padding: "13px 17px",
      borderRadius: 6,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(22, 22, 22, 0.9)",
      color: "#F5F5F5",
      outline: "none",
      fontSize: 14.5,
      fontFamily: "'Inter', sans-serif",
      transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.2s ease",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16)",
    },
    sendBtn: (disabled) => ({
      padding: "0 26px",
      borderRadius: 6,
      border: disabled ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.28)",
      background: disabled
        ? "#3A1414"
        : "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)",
      color: disabled ? "#8A5A5A" : "#F5F5F5",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 13.5,
      textTransform: "uppercase",
      letterSpacing: 1,
      boxShadow: disabled
        ? "none"
        : "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.35)",
      transition: "all 0.15s ease",
      textShadow: disabled
        ? "none"
        : "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)",
    }),
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
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes iconPulse {
          0%, 100% { box-shadow: 0 8px 30px rgba(210,10,10,0.4); }
          50% { box-shadow: 0 8px 40px rgba(210,10,10,0.65); }
        }
        .cc-chat-sidebar, .cc-chat-main {
          transition: box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cc-chat-sidebar:hover {
          border-color: rgba(255,255,255,0.78) !important;
          box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        .cc-chat-main:hover {
          border-color: rgba(255,255,255,0.78) !important;
          box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        .cc-navtab { box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.2); }
        .cc-navtab:hover { border-color: #EB1B23 !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; text-shadow: 0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.22) !important; }
        .cc-navtab:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-convo:hover { background: #161616 !important; color: #F5F5F5 !important; text-shadow: 0 0 8px rgba(255,255,255,0.2) !important; }
        .cc-newchat { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.35); }
        .cc-newchat:hover { background: linear-gradient(135deg, #EB1B23 0%, #B30909 100%) !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 32px rgba(210,10,10,0.42) !important; text-shadow: 0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.22) !important; }
        .cc-newchat:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-logout { box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.18); }
        .cc-logout:hover { border-color: #EB1B23 !important; color: #F5F5F5 !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.28) !important; text-shadow: 0 0 8px rgba(255,255,255,0.2), 0 0 12px rgba(210,10,10,0.16) !important; }
        .cc-chip { box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.18); }
        .cc-chip:hover { background: #1D1D1D !important; border-color: #D20A0A !important; color: #F5F5F5 !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.28) !important; text-shadow: 0 0 8px rgba(255,255,255,0.2) !important; }
        .cc-chat-bubble:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.7) !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 28px rgba(210,10,10,0.28) !important; }
        .cc-chip:focus-visible { outline: 2px solid #D20A0A; outline-offset: 2px; }
        .cc-input {
          transition: border-color 0.4s ease, box-shadow 0.4s ease;
        }
        .cc-input:hover {
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3) !important;
          transform: translateY(-1px);
        }
        .cc-input:focus {
          border-color: rgba(255,255,255,1) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3);
          transform: translateY(-1px);
        }
        .cc-chat-bubble:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 28px rgba(210,10,10,0.28) !important;
        }
        .cc-input:focus-visible { outline: none; }
        .cc-send:hover:not(:disabled) { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.2), 0 0 28px rgba(210,10,10,0.35) !important; transform: translateY(-1px); }
        .cc-send:active:not(:disabled) { transform: scale(0.96); }
        .cc-send:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-messages::-webkit-scrollbar { width: 8px; }
        .cc-messages::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        .cc-convolist::-webkit-scrollbar { width: 6px; }
        .cc-convolist::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
      `}</style>

      <ParticleBackground />

      <div className="cc-chat-sidebar" style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoDot} />
          AI Career Coach
        </div>

        <div style={styles.navRow}>
          <div className="cc-navtab" style={styles.navTab(true)}>
            Chat
          </div>
          <div
            className="cc-navtab"
            style={styles.navTab(false)}
            onClick={() => navigate("/resume")}
          >
            Resume
          </div>
          <div
            className="cc-navtab"
            style={styles.navTab(false)}
            onClick={() => navigate("/resume-builder")}
          >
            Builder
          </div>
          <div
            className="cc-navtab"
            style={styles.navTab(false)}
            onClick={() => navigate("/mind-map")}
          >
            Mind Map
          </div>
          <div
            className="cc-navtab"
            style={styles.navTab(false)}
            onClick={() => navigate("/interview")}
          >
            Interview
          </div>
        </div>

        <button className="cc-newchat" style={styles.newChatBtn} onClick={startNewChat}>
          + New Chat
        </button>

        <div className="cc-convolist" style={styles.convoList}>
          {loadingConvos && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px" }}>
              Loading...
            </p>
          )}
          {!loadingConvos && conversations.length === 0 && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px" }}>
              No conversations yet
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className="cc-convo"
              onClick={() => loadConversation(c.id)}
              style={styles.convoItem(c.id === conversationId)}
            >
              {c.title || "New Conversation"}
            </div>
          ))}
        </div>

        <div style={styles.logoutWrap}>
          <button className="cc-logout" style={styles.logoutBtn} onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      <div className="cc-chat-main" style={styles.main}>
        <div style={styles.header}>{activeTitle}</div>

        <div className="cc-messages" ref={scrollRef} style={styles.messagesArea}>
          {messages.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIconRing}>
                <div style={styles.emptyIcon}>AC</div>
              </div>
              <div style={styles.emptyTitle}>What's on your mind?</div>
              <div style={styles.emptySubtitle}>
                Ask about your resume, interviews, or your next career move.
              </div>
              <div style={styles.chipRow}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="cc-chip"
                    onClick={(e) => sendMessage(e, s)}
                    style={{
                      padding: "10px 15px",
                      borderRadius: 6,
                      border: "1px solid #2A2A2A",
                      background: "#161616",
                      color: "#B0B0B0",
                      fontSize: 13.5,
                      letterSpacing: 0.1,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 16px rgba(210,10,10,0.18)",
                      textShadow: "0 0 8px rgba(255,255,255,0.18), 0 0 12px rgba(210,10,10,0.16)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={styles.row(msg.role === "user")}>
              {msg.role === "ai" && <div style={styles.avatar(false)}>AI</div>}
              <div className="cc-chat-bubble" style={styles.bubble(msg.role === "user")}>
                {renderMessageText(msg.text)}
              </div>
              {msg.role === "user" && <div style={styles.avatar(true)}>You</div>}
            </div>
          ))}

          {loading && (
            <div style={styles.row(false)}>
              <div style={styles.avatar(false)}>AI</div>
              <div style={styles.typingBubble}>
                <span style={styles.dot(0)} />
                <span style={styles.dot(0.15)} />
                <span style={styles.dot(0.3)} />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} style={styles.formWrap}>
          <input
            ref={inputRef}
            className="cc-input"
            type="text"
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              setInput(val);
              localStorage.setItem("chat_draft_input", val);
            }}
            placeholder="Type your message..."
            style={styles.input}
          />
          <button
            className="cc-send"
            type="submit"
            style={styles.sendBtn(loading)}
            disabled={loading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;