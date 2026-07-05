import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
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
      console.error("Logout failed", err);
    }
    navigate("/login");
  };

  const handleAuthFail = (res) => {
    if (res.status === 401) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/conversations", {
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoadingConvos(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  const loadConversation = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`https://ai-career-coach-djum.onrender.com/conversations/${id}`, {
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setConversationId(data.id);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/chat", {
        method: "POST",
        credentials: "include",
        headers: jsonHeaders,
        body: JSON.stringify({
          message: userMessage.text,
          conversation_id: conversationId,
        }),
      });

      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      const isNewConversation = conversationId === null;
      setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);

      if (isNewConversation) {
        fetchConversations();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error: could not reach the server." },
      ]);
    } finally {
      setLoading(false);
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
    newChatBtn: {
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
      transition: "all 0.15s ease",
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
    },
    messagesArea: {
      flex: 1,
      overflowY: "auto",
      padding: "40px 18%",
    },
    emptyState: {
      color: "#5C6675",
      textAlign: "center",
      marginTop: 120,
      fontSize: 15,
      fontFamily: "'Fraunces', serif",
    },
    row: (isUser) => ({
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: "flex-end",
      gap: 10,
      marginBottom: 18,
    }),
    avatar: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #E8A758, #6B5B95)",
      flexShrink: 0,
    },
    bubble: (isUser) => ({
      display: "inline-block",
      background: isUser ? "#E8A758" : "#1E2530",
      color: isUser ? "#10151A" : "#E8E6E1",
      padding: "11px 16px",
      borderRadius: 16,
      borderBottomRightRadius: isUser ? 4 : 16,
      borderBottomLeftRadius: isUser ? 16 : 4,
      maxWidth: "75%",
      whiteSpace: "pre-wrap",
      lineHeight: 1.55,
      fontSize: 14.5,
    }),
    thinking: {
      color: "#5C6675",
      fontSize: 13.5,
      fontStyle: "italic",
      marginLeft: 38,
    },
    formWrap: {
      display: "flex",
      padding: "18px 18%",
      borderTop: "1px solid #1E2530",
      gap: 10,
    },
    input: {
      flex: 1,
      padding: "13px 16px",
      borderRadius: 24,
      border: "1px solid #2A3240",
      background: "#1B222B",
      color: "#E8E6E1",
      outline: "none",
      fontSize: 14.5,
      fontFamily: "'Inter', sans-serif",
    },
    sendBtn: {
      padding: "0 24px",
      borderRadius: 24,
      border: "none",
      background: "#E8A758",
      color: "#10151A",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>AI Career Coach</div>

        <div style={styles.navRow}>
          <div style={styles.navTab(true)}>Chat</div>
          <div style={styles.navTab(false)} onClick={() => navigate("/resume")}>
            Resume
          </div>
          <div style={styles.navTab(false)} onClick={() => navigate("/resume-builder")}>
            Builder
          </div>
          <div style={styles.navTab(false)} onClick={() => navigate("/mind-map")}>
            Mind Map
          </div>
          <div style={styles.navTab(false)} onClick={() => navigate("/interview")}>
            Interview
          </div>
        </div>

        <button style={styles.newChatBtn} onClick={startNewChat}>
          + New Chat
        </button>

        <div style={styles.convoList}>
          {loadingConvos && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              Loading...
            </p>
          )}
          {!loadingConvos && conversations.length === 0 && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              No conversations yet
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              style={styles.convoItem(c.id === conversationId)}
            >
              {c.title || "New Conversation"}
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
        <div style={styles.messagesArea}>
          {messages.length === 0 && (
            <p style={styles.emptyState}>
              Ask me anything about your career, resume, or job search...
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={styles.row(msg.role === "user")}>
              {msg.role === "ai" && <div style={styles.avatar} />}
              <span style={styles.bubble(msg.role === "user")}>{msg.text}</span>
            </div>
          ))}
          {loading && <p style={styles.thinking}>Thinking...</p>}
        </div>

        <form onSubmit={sendMessage} style={styles.formWrap}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            style={styles.input}
          />
          <button type="submit" style={styles.sendBtn} disabled={loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
