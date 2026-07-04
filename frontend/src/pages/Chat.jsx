import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "Error: could not reach the server." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>AI Career Coach</h2>
        <button onClick={handleLogout}>Log Out</button>
      </div>

      <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 20, marginTop: 20, minHeight: 400, maxHeight: 500, overflowY: "auto" }}>
        {messages.length === 0 && (
          <p style={{ color: "#888" }}>Ask me anything about your career, resume, or job search...</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12, textAlign: msg.role === "user" ? "right" : "left" }}>
            <span
              style={{
                display: "inline-block",
                background: msg.role === "user" ? "#0084ff" : "#f0f0f0",
                color: msg.role === "user" ? "white" : "black",
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
        {loading && <p style={{ color: "#888" }}>Thinking...</p>}
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", marginTop: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit" style={{ padding: "10px 20px" }} disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;