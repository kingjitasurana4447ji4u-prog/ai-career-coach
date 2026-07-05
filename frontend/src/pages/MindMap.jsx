import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function MindMapTree({ node }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: 20 }}>
      <div
        onClick={() => hasChildren && setCollapsed(!collapsed)}
        style={{
          display: "inline-block",
          background: "#1E2530",
          color: "#E8E6E1",
          padding: "10px 14px",
          borderRadius: 10,
          margin: "6px 0",
          cursor: hasChildren ? "pointer" : "default",
          borderLeft: "3px solid #E8A758",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {hasChildren ? (collapsed ? "â–¶ " : "â–¼ ") : ""}
          {node.label}
        </div>
        {node.description && (
          <div style={{ fontSize: 12.5, color: "#8B93A1", marginTop: 4 }}>
            {node.description}
          </div>
        )}
      </div>

      {hasChildren && !collapsed && (
        <div style={{ borderLeft: "1px dashed #2A3240", paddingLeft: 10 }}>
          {node.children.map((child, i) => (
            <MindMapTree key={i} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function MindMap() {
  const [goal, setGoal] = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeMap, setActiveMap] = useState(null);
  const [mindMaps, setMindMaps] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");
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

  const fetchMindMaps = async () => {
    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/mindmap", {
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setMindMaps(data);
    } catch (err) {
      console.error("Failed to load mind maps", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchMindMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMindMap = async (id) => {
    try {
      const res = await fetch(`https://ai-career-coach-djum.onrender.com/mindmap/${id}`, {
        headers: jsonHeaders,
        credentials: "include",
      });
      if (handleAuthFail(res)) return;
      const data = await res.json();
      setActiveMap(data);
    } catch (err) {
      console.error("Failed to load mind map", err);
    }
  };

  const generateMindMap = async (e) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setGenerating(true);
    setError("");

    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/mindmap/generate", {
        method: "POST",
        headers: jsonHeaders,
        credentials: "include",
        body: JSON.stringify({
          goal: goal,
          current_skills: currentSkills,
        }),
      });

      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to generate mind map");

      const data = await res.json();
      setActiveMap(data);
      fetchMindMaps();
    } catch (err) {
      setError("Could not generate mind map. Please try again.");
    } finally {
      setGenerating(false);
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
    listWrap: {
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
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
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
      padding: "40px 6%",
      overflowY: "auto",
    },
    formCard: {
      background: "#171E27",
      borderRadius: 14,
      padding: 24,
      marginBottom: 30,
    },
    label: {
      fontSize: 13,
      color: "#8B93A1",
      marginBottom: 6,
      display: "block",
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #2A3240",
      background: "#1B222B",
      color: "#E8E6E1",
      outline: "none",
      fontSize: 14,
      marginBottom: 16,
      boxSizing: "border-box",
    },
    generateBtn: {
      padding: "12px 22px",
      borderRadius: 24,
      border: "none",
      background: "#E8A758",
      color: "#10151A",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
    },
    emptyState: {
      color: "#5C6675",
      textAlign: "center",
      marginTop: 60,
      fontSize: 15,
      fontFamily: "'Fraunces', serif",
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
          <div style={styles.navTab(true)}>Mind Map</div>
        </div>

        <div style={styles.listWrap}>
          {loadingList && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              Loading...
            </p>
          )}
          {!loadingList && mindMaps.length === 0 && (
            <p style={{ color: "#5C6675", fontSize: 13, padding: "0 12px" }}>
              No mind maps yet
            </p>
          )}
          {mindMaps.map((m) => (
            <div
              key={m.id}
              onClick={() => loadMindMap(m.id)}
              style={styles.listItem(activeMap && activeMap.id === m.id)}
            >
              {m.title}
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
        <div style={styles.formCard}>
          <label style={styles.label}>Career Goal</label>
          <input
            type="text"
            style={styles.input}
            placeholder="e.g. Become a Data Scientist"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />

          <label style={styles.label}>Current Skills / Background (optional)</label>
          <input
            type="text"
            style={styles.input}
            placeholder="e.g. Basic Python, Excel, some SQL"
            value={currentSkills}
            onChange={(e) => setCurrentSkills(e.target.value)}
          />

          <button
            style={styles.generateBtn}
            onClick={generateMindMap}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Mind Map"}
          </button>

          {error && (
            <p style={{ color: "#E85858", fontSize: 13, marginTop: 12 }}>{error}</p>
          )}
        </div>

        {activeMap ? (
          <MindMapTree node={activeMap.map_data} />
        ) : (
          <p style={styles.emptyState}>
            Enter a career goal above to generate your mind map.
          </p>
        )}
      </div>
    </div>
  );
}

export default MindMap;
