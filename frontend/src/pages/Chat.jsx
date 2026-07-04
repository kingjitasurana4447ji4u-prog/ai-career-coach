import { useNavigate } from "react-router-dom";

function Chat() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>AI Career Coach</h2>
        <button onClick={handleLogout}>Log Out</button>
      </div>
      <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 20, marginTop: 20, minHeight: 300 }}>
        <p style={{ color: "#888" }}>Chat coming soon in Day 4...</p>
      </div>
    </div>
  );
}

export default Chat;