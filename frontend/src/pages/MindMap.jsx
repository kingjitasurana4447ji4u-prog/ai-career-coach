import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

// ---------- layout constants ----------
const COL_W = 300; // horizontal distance between node columns
const NODE_W = 220;
const NODE_H = 72; // fixed card height -> guarantees clean, non-overlapping rows
const ROW_H = NODE_H + 34; // vertical distance between sibling leaves
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.2;

// color palette used to tint each top-level branch so the graph reads
// clearly at a glance instead of everything looking the same. Tuned to
// stay legible against a near-black background while keeping the
// red/black/gold "fight night" mood instead of soft pastels.
const BRANCH_COLORS = [
  "#D20A0A", // crimson / root accent
  "#D4A017", // championship gold
  "#4A9EDB", // steel blue
  "#8BC34A", // sage
  "#E8590C", // ember orange
  "#B33A3A", // rust
  "#9A9A9A", // silver
  "#C2185B", // magenta
];

// ---------- helpers ----------

// give every node a stable id (based on tree position) and a branch color
// that's inherited down from its top-level ancestor
function assignIds(node, path = "root", depth = 0, color = BRANCH_COLORS[0]) {
  const branchColor =
    depth === 1 ? BRANCH_COLORS[hashIndex(path) % BRANCH_COLORS.length] : color;
  return {
    ...node,
    id: path,
    color: branchColor,
    children: node.children
      ? node.children.map((child, i) =>
          assignIds(child, `${path}-${i}`, depth + 1, branchColor)
        )
      : undefined,
  };
}

// deterministic index so branch colors stay stable across re-renders
function hashIndex(path) {
  const n = parseInt(path.split("-").pop(), 10);
  return Number.isNaN(n) ? 0 : n;
}

// nodes start with only the root expanded; everything below is collapsed
// until the user clicks into it
function getInitialCollapsed(node, depth = 0, set = new Set()) {
  if (node.children && node.children.length) {
    if (depth >= 1) set.add(node.id);
    node.children.forEach((child) => getInitialCollapsed(child, depth + 1, set));
  }
  return set;
}

// walks the (possibly collapsed) tree and produces absolute positions for
// every visible node, plus the parent -> child edges between them.
// Because every card is a fixed NODE_H, sibling rows can never overlap.
function computeLayout(root, collapsedIds) {
  const positions = [];
  const edges = [];
  let cursorY = 0;

  function visit(node, depth) {
    const collapsed = collapsedIds.has(node.id);
    const hasChildren = !!(node.children && node.children.length);
    const visibleChildren = collapsed ? [] : node.children || [];

    let y;
    if (visibleChildren.length === 0) {
      y = cursorY;
      cursorY += ROW_H;
    } else {
      const childYs = visibleChildren.map((child) => visit(child, depth + 1));
      y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }

    positions.push({
      id: node.id,
      label: node.label,
      description: node.description,
      color: node.color,
      x: depth * COL_W,
      y,
      hasChildren,
      collapsed: hasChildren && collapsed,
    });

    visibleChildren.forEach((child) => {
      edges.push({ parentId: node.id, childId: child.id });
    });

    return y;
  }

  visit(root, 0);

  const posMap = new Map(positions.map((p) => [p.id, p]));
  const resolvedEdges = edges.map((e) => ({
    from: posMap.get(e.parentId),
    to: posMap.get(e.childId),
  }));

  const maxX = Math.max(...positions.map((p) => p.x)) + NODE_W;
  const maxY = Math.max(...positions.map((p) => p.y)) + NODE_H;
  const minY = Math.min(...positions.map((p) => p.y)) - NODE_H / 2;

  return { positions, edges: resolvedEdges, maxX, maxY, minY };
}

function bezierPath(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

// ---------- graph view ----------

function MindMapGraph({ root }) {
  const [collapsedIds, setCollapsedIds] = useState(() => getInitialCollapsed(root));
  const [transform, setTransform] = useState({ x: 50, y: 0, scale: 1 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);
  const dragState = useRef(null);
  const animTimer = useRef(null);

  // keep state in sync with the browser's actual fullscreen status
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  // reset + center whenever a brand-new map loads, or the view resizes
  // (fullscreen toggle). Computed directly rather than via memoized state
  // so there's no stale-layout flicker on the first frame.
  const recenter = (forRoot, containerEl) => {
    const initial = getInitialCollapsed(forRoot);
    const layout = computeLayout(forRoot, initial);
    const height = containerEl ? containerEl.clientHeight : 500;
    const contentHeight = layout.maxY - layout.minY;
    setCollapsedIds(initial);
    setTransform({
      x: 50,
      y: Math.max(30, (height - contentHeight) / 2 - layout.minY),
      scale: 1,
    });
  };

  useEffect(() => {
    recenter(root, containerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  useEffect(() => {
    const id = requestAnimationFrame(() => recenter(root, containerRef.current));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  const { positions, edges, maxX, maxY, minY } = useMemo(
    () => computeLayout(root, collapsedIds),
    [root, collapsedIds]
  );

  const toggleNode = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // smoothly animates a transform change triggered by a button (not by
  // live drag/scroll, which need to track the pointer with zero lag)
  const withAnimation = (fn) => {
    setIsAnimating(true);
    fn();
    clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => setIsAnimating(false), 260);
  };

  // zoom while keeping a specific screen point anchored in place, so the
  // content under the cursor (or the button) never "jumps"
  const zoomAtPoint = (clientX, clientY, factor) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    setTransform((t) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
      const canvasX = (px - t.x) / t.scale;
      const canvasY = (py - t.y) / t.scale;
      return { scale: newScale, x: px - canvasX * newScale, y: py - canvasY * newScale };
    });
  };

  const zoomButton = (factor) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    withAnimation(() =>
      zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, factor)
    );
  };

  // scrolling pans the canvas (like Figma/Miro); hold Ctrl/Cmd or pinch
  // on a trackpad to zoom instead - so casual scrolling never feels like
  // it's fighting you
  const onWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      zoomAtPoint(e.clientX, e.clientY, factor);
    } else {
      setTransform((t) => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
    }
  };

  const onMouseDown = (e) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: transform };
  };
  const onMouseMove = (e) => {
    if (!dragState.current) return;
    const { startX, startY, origin } = dragState.current;
    setTransform((t) => ({
      ...t,
      x: origin.x + (e.clientX - startX),
      y: origin.y + (e.clientY - startY),
    }));
  };
  const stopDrag = () => {
    dragState.current = null;
  };

  const resetView = () => withAnimation(() => recenter(root, containerRef.current));

  const styles = {
    container: {
      position: "relative",
      flex: 1,
      overflow: "hidden",
      background: "#0A0A0A",
      borderRadius: isFullscreen ? 0 : 8,
      border: isFullscreen ? "none" : "1px solid #2A2A2A",
      boxShadow: isFullscreen ? "none" : "0 20px 50px rgba(0,0,0,0.5)",
      cursor: dragState.current ? "grabbing" : "grab",
      minHeight: 480,
      width: isFullscreen ? "100vw" : "auto",
      height: isFullscreen ? "100vh" : "auto",
      WebkitUserSelect: "none",
      userSelect: "none",
    },
    controls: {
      position: "absolute",
      top: 14,
      right: 14,
      zIndex: 2,
      display: "flex",
      gap: 6,
    },
    ctrlBtn: {
      width: 30,
      height: 30,
      borderRadius: 6,
      border: "1px solid #2A2A2A",
      background: "#161616",
      color: "#F5F5F5",
      cursor: "pointer",
      fontSize: 15,
      lineHeight: "28px",
      transition: "all 0.15s ease",
    },
    zoomLabel: {
      display: "flex",
      alignItems: "center",
      padding: "0 8px",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontSize: 12,
      fontWeight: 600,
      color: "#8A8A8A",
      background: "#161616",
      border: "1px solid #2A2A2A",
      borderRadius: 6,
    },
    canvas: {
      position: "absolute",
      top: 0,
      left: 0,
      transformOrigin: "0 0",
    },
    node: (color, hasChildren) => ({
      position: "absolute",
      width: NODE_W,
      height: NODE_H,
      transform: "translateY(-50%)",
      background: "#161616",
      color: "#F5F5F5",
      padding: "9px 14px",
      borderRadius: 8,
      borderLeft: `3px solid ${color}`,
      cursor: hasChildren ? "pointer" : "default",
      boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      overflow: "hidden",
      boxSizing: "border-box",
      animation: "nodePop 0.2s ease-out",
    }),
    label: {
      fontWeight: 600,
      fontSize: 13.5,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      lineHeight: 1.25,
    },
    description: {
      fontSize: 11.5,
      color: "#8A8A8A",
      marginTop: 3,
      display: "-webkit-box",
      WebkitLineClamp: 1,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
    badge: (color) => ({
      position: "absolute",
      right: -10,
      top: "50%",
      transform: "translateY(-50%)",
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: color,
      color: "#0A0A0A",
      fontSize: 13,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
    }),
  };

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <style>{`
        @keyframes nodePop {
          from { opacity: 0; transform: translateY(-50%) scale(0.85); }
          to { opacity: 1; transform: translateY(-50%) scale(1); }
        }
        .cc-mm-ctrl:hover { border-color: #EB1B23 !important; color: #EB1B23 !important; }
        .cc-mm-ctrl:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
      `}</style>

      <div style={styles.controls}>
        <span style={styles.zoomLabel}>{Math.round(transform.scale * 100)}%</span>
        <button className="cc-mm-ctrl" style={styles.ctrlBtn} onClick={() => zoomButton(1.2)} title="Zoom in">
          +
        </button>
        <button className="cc-mm-ctrl" style={styles.ctrlBtn} onClick={() => zoomButton(1 / 1.2)} title="Zoom out">
          −
        </button>
        <button className="cc-mm-ctrl" style={styles.ctrlBtn} onClick={resetView} title="Reset view">
          ⤾
        </button>
        <button
          className="cc-mm-ctrl"
          style={styles.ctrlBtn}
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          {isFullscreen ? "⤢" : "⛶"}
        </button>
      </div>

      <div
        style={{
          ...styles.canvas,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isAnimating ? "transform 0.25s cubic-bezier(0.4,0,0.2,1)" : "none",
          width: maxX,
          height: maxY - minY,
        }}
      >
        <svg
          width={maxX}
          height={maxY - minY}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
        >
          {edges.map(({ from, to }, i) => (
            <path
              key={i}
              d={bezierPath(from.x + NODE_W, from.y - minY, to.x, to.y - minY)}
              fill="none"
              stroke={to.color}
              strokeOpacity={0.55}
              strokeWidth={2}
            />
          ))}
        </svg>

        {positions.map((p) => (
          <div
            key={p.id}
            style={{ ...styles.node(p.color, p.hasChildren), left: p.x, top: p.y - minY }}
            title={p.description ? `${p.label} — ${p.description}` : p.label}
            onClick={(e) => {
              if (!p.hasChildren) return;
              e.stopPropagation();
              toggleNode(p.id);
            }}
          >
            <div style={styles.label}>{p.label}</div>
            {p.description && <div style={styles.description}>{p.description}</div>}
            {p.hasChildren && (
              <div style={styles.badge(p.color)}>{p.collapsed ? "+" : "–"}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- main page ----------

function MindMap() {
  const [goal, setGoal] = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeMap, setActiveMap] = useState(null);
  const [glowActive, setGlowActive] = useState(false);
  const [mindMaps, setMindMaps] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");
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

  const fetchMindMaps = async () => {
    try {
      const res = await fetch(`${API_URL}/mindmap`, {
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
      const res = await fetch(`${API_URL}/mindmap/${id}`, {
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
      const res = await fetch(`${API_URL}/mindmap/generate`, {
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

  // build a version of the active map with stable ids + branch colors,
  // memoized so the graph doesn't reset on unrelated re-renders
  const idTree = useMemo(
    () => (activeMap ? assignIds(activeMap.map_data) : null),
    [activeMap]
  );

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
    listWrap: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 10px",
    },
    listItem: (active) => ({
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
    logoutWrap: {
      padding: 14,
      borderTop: "1px solid #2A2A2A",
    },
    logoutBtn: {
      width: "100%",
      padding: "10px 12px",
      background: "rgba(22, 22, 22, 0.4)",
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
      boxShadow: "0 0 8px rgba(255,255,255,0.04)",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "rgba(8, 8, 8, 0.06)",
      padding: "40px 6%",
      overflow: "hidden",
      backdropFilter: "blur(4px)",
      borderLeft: glowActive ? "2px solid rgba(255,255,255,0.62)" : "1px solid rgba(255,255,255,0.18)",
      boxShadow: glowActive
        ? "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 0 1px rgba(255,255,255,0.16), 0 0 24px rgba(255,255,255,0.22), 0 0 58px rgba(210,10,10,0.34), 0 20px 56px rgba(0,0,0,0.42)"
        : "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.07), 0 0 16px rgba(210,10,10,0.16), 0 20px 46px rgba(0,0,0,0.3)",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    formCard: {
      background: "rgba(22, 22, 22, 0.74)",
      borderRadius: 8,
      padding: 26,
      marginBottom: 30,
      flexShrink: 0,
      border: "1px solid rgba(255,255,255,0.16)",
      borderTop: "3px solid rgba(245,245,245,0.22)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 0 10px rgba(255,255,255,0.1), 0 0 22px rgba(210,10,10,0.2)",
      transition: "transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease",
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
      background: "rgba(10, 10, 10, 0.72)",
      color: "#F5F5F5",
      outline: "none",
      fontSize: 14,
      marginBottom: 16,
      boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif",
      transition: "border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 0 8px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16)",
    },
    generateBtn: {
      padding: "12px 24px",
      borderRadius: 6,
      border: "1px solid rgba(255,255,255,0.28)",
      background: generating
        ? "#3A1414"
        : "linear-gradient(135deg, #D20A0A 0%, #A00808 100%)",
      color: generating ? "#8A5A5A" : "#F5F5F5",
      cursor: generating ? "not-allowed" : "pointer",
      fontFamily: "'Oswald', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 13.5,
      letterSpacing: 1,
      textTransform: "uppercase",
      boxShadow: generating
        ? "none"
        : "0 0 0 1px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.16), 0 0 24px rgba(210,10,10,0.35)",
      transition: "all 0.15s ease",
      textShadow: generating ? "none" : "0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.2)",
    },
    emptyState: {
      color: "#8A8A8A",
      textAlign: "center",
      marginTop: 60,
      fontSize: 15,
      lineHeight: 1.6,
      fontFamily: "'Inter', sans-serif",
    },
    hint: {
      color: "#8A8A8A",
      fontSize: 12,
      marginBottom: 10,
    },
  };

  // Particle background (matches Resume/Builder pages)
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
        .cc-mm-navtab:hover { border-color: #EB1B23 !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; text-shadow: 0 0 10px rgba(255,255,255,0.24), 0 0 16px rgba(210,10,10,0.22) !important; }
        .cc-mm-navtab:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-mm-listitem:hover { background: rgba(22, 22, 22, 0.74) !important; color: #F5F5F5 !important; text-shadow: 0 0 8px rgba(255,255,255,0.2) !important; }
        .cc-mm-logout:hover { border-color: #EB1B23 !important; color: #F5F5F5 !important; box-shadow: 0 0 10px rgba(255,255,255,0.08), 0 0 18px rgba(210,10,10,0.16) !important; }
        .cc-mm-input {
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
        }
        .cc-mm-input:hover {
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3) !important;
          transform: translateY(-1px);
        }
        .cc-mm-input:focus {
          border-color: rgba(255,255,255,1) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.2), 0 0 30px rgba(210,10,10,0.3);
          transform: translateY(-1px);
        }
        .cc-mm-sidebar, .cc-mm-main {
          transition: box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cc-mm-sidebar:hover {
          border-color: rgba(255,255,255,0.78) !important;
          box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        .cc-mm-main:hover {
          border-color: rgba(255,255,255,0.78) !important;
          box-shadow: 0 0 65px 12px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        .cc-mm-formcard {
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
        }
        .cc-mm-formcard:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.7) !important;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 28px rgba(210,10,10,0.28) !important;
        }
        .cc-mm-generate:hover:not(:disabled) { background: linear-gradient(135deg, #EB1B23 0%, #B30909 100%) !important; transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(255,255,255,0.18), 0 0 30px rgba(210,10,10,0.4) !important; }
        .cc-mm-generate:focus-visible { outline: 2px solid #EB1B23; outline-offset: 2px; }
        .cc-mm-list::-webkit-scrollbar { width: 6px; }
        .cc-mm-list::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
      `}</style>

      <ParticleBackground />

      <div className="cc-mm-sidebar" style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoDot} />
          AI Career Coach
        </div>

        <div style={styles.navRow}>
          <div className="cc-mm-navtab" style={styles.navTab(false)} onClick={() => navigate("/chat")}>
            Chat
          </div>
          <div className="cc-mm-navtab" style={styles.navTab(false)} onClick={() => navigate("/resume")}>
            Resume
          </div>
          <div className="cc-mm-navtab" style={styles.navTab(false)} onClick={() => navigate("/resume-builder")}>
            Builder
          </div>
          <div className="cc-mm-navtab" style={styles.navTab(true)}>Mind Map</div>
          <div className="cc-mm-navtab" style={styles.navTab(false)} onClick={() => navigate("/interview")}>
            Interview
          </div>
        </div>

        <div className="cc-mm-list" style={styles.listWrap}>
          {loadingList && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px" }}>
              Loading...
            </p>
          )}
          {!loadingList && mindMaps.length === 0 && (
            <p style={{ color: "#8A8A8A", fontSize: 13, padding: "0 12px" }}>
              No mind maps yet
            </p>
          )}
          {mindMaps.map((m) => (
            <div
              key={m.id}
              className="cc-mm-listitem"
              onClick={() => loadMindMap(m.id)}
              style={styles.listItem(activeMap && activeMap.id === m.id)}
            >
              {m.title}
            </div>
          ))}
        </div>

        <div style={styles.logoutWrap}>
          <button className="cc-mm-logout" style={styles.logoutBtn} onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      <div className="cc-mm-main" style={styles.main}>
        <div className="cc-mm-formcard" style={styles.formCard}>
          <label style={styles.label}>Career Goal</label>
          <input
            type="text"
            className="cc-mm-input"
            style={styles.input}
            placeholder="e.g. Become a Data Scientist"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />

          <label style={styles.label}>Current Skills / Background (optional)</label>
          <input
            type="text"
            className="cc-mm-input"
            style={styles.input}
            placeholder="e.g. Basic Python, Excel, some SQL"
            value={currentSkills}
            onChange={(e) => setCurrentSkills(e.target.value)}
          />

          <button
            className="cc-mm-generate"
            style={styles.generateBtn}
            onClick={generateMindMap}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Mind Map"}
          </button>

          {error && (
            <p style={{ color: "#EB1B23", fontSize: 13, marginTop: 12 }}>{error}</p>
          )}
        </div>

        {idTree ? (
          <>
            <p style={styles.hint}>
              Click a node to expand it. Scroll to pan, Ctrl/Cmd + scroll (or pinch) to zoom.
            </p>
            <MindMapGraph root={idTree} />
          </>
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