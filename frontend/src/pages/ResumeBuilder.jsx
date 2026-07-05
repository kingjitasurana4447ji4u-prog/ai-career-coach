import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function ResumeBuilder() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState([
    { job_title: "", company: "", dates: "", bullets: [""] },
  ]);
  const [education, setEducation] = useState([
    { degree: "", school: "", dates: "" },
  ]);
  const [skills, setSkills] = useState("");
  const [polishingKey, setPolishingKey] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  const handleAuthFail = (res) => {
    if (res.status === 401) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const polish = async (sectionType, text, onResult, key) => {
    if (!text.trim()) return;
    setPolishingKey(key);
    setError("");
    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/resume/polish", {
        method: "POST",
        headers: jsonHeaders,
        credentials: "include",
        body: JSON.stringify({ section_type: sectionType, raw_text: text }),
      });
      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to polish text");
      const data = await res.json();
      onResult(data.polished_text);
    } catch (err) {
      setError("Could not polish this section. Try again.");
    } finally {
      setPolishingKey(null);
    }
  };

  const updateExperience = (index, field, value) => {
    const updated = [...experience];
    updated[index][field] = value;
    setExperience(updated);
  };

  const updateBullet = (expIndex, bulletIndex, value) => {
    const updated = [...experience];
    updated[expIndex].bullets[bulletIndex] = value;
    setExperience(updated);
  };

  const addBullet = (expIndex) => {
    const updated = [...experience];
    updated[expIndex].bullets.push("");
    setExperience(updated);
  };

  const removeBullet = (expIndex, bulletIndex) => {
    const updated = [...experience];
    updated[expIndex].bullets.splice(bulletIndex, 1);
    setExperience(updated);
  };

  const addExperience = () => {
    setExperience([...experience, { job_title: "", company: "", dates: "", bullets: [""] }]);
  };

  const removeExperience = (index) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  const updateEducation = (index, field, value) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };

  const addEducation = () => {
    setEducation([...education, { degree: "", school: "", dates: "" }]);
  };

  const removeEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleDownload = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    setDownloading(true);
    setError("");

    const payload = {
      full_name: fullName,
      email,
      phone,
      location,
      linkedin,
      summary,
      experience: experience.filter((e) => e.job_title || e.company),
      education: education.filter((e) => e.degree || e.school),
      skills,
    };

    try {
      const res = await fetch("https://ai-career-coach-djum.onrender.com/resume/generate-pdf", {
        method: "POST",
        headers: jsonHeaders,
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (handleAuthFail(res)) return;
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fullName.replace(/\s+/g, "_")}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
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
      flexShrink: 0,
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
      flexDirection: "column",
      gap: 8,
      padding: "14px 16px",
    },
    navLink: (active) => ({
      textAlign: "center",
      padding: "10px 10px",
      borderRadius: 8,
      fontSize: 13,
      textDecoration: "none",
      color: active ? "#10151A" : "#8B93A1",
      background: active ? "#E8A758" : "#171E27",
      fontWeight: 600,
    }),
    main: {
      flex: 1,
      display: "flex",
      overflow: "hidden",
    },
    formPanel: {
      flex: 1,
      overflowY: "auto",
      padding: "32px 40px",
      background: "#151B22",
    },
    previewPanel: {
      flex: 1,
      overflowY: "auto",
      padding: "32px 40px",
      background: "#10151A",
      borderLeft: "1px solid #1E2530",
    },
    sectionTitle: {
      fontFamily: "'Fraunces', serif",
      color: "#E8A758",
      fontSize: 18,
      marginTop: 24,
      marginBottom: 12,
    },
    label: {
      display: "block",
      color: "#8B93A1",
      fontSize: 12.5,
      marginBottom: 4,
      marginTop: 10,
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #2A3240",
      background: "#1B222B",
      color: "#E8E6E1",
      outline: "none",
      fontSize: 14,
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #2A3240",
      background: "#1B222B",
      color: "#E8E6E1",
      outline: "none",
      fontSize: 14,
      fontFamily: "'Inter', sans-serif",
      minHeight: 70,
      resize: "vertical",
      boxSizing: "border-box",
    },
    polishBtn: (active) => ({
      marginTop: 6,
      padding: "6px 12px",
      borderRadius: 6,
      border: "1px solid #E8A758",
      background: active ? "#E8A758" : "transparent",
      color: active ? "#10151A" : "#E8A758",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
    }),
    card: {
      background: "#1B222B",
      borderRadius: 10,
      padding: 16,
      marginBottom: 14,
      border: "1px solid #232B36",
    },
    addBtn: {
      padding: "8px 14px",
      borderRadius: 8,
      border: "1px dashed #3A4250",
      background: "transparent",
      color: "#8B93A1",
      cursor: "pointer",
      fontSize: 13,
      marginTop: 8,
    },
    removeBtn: {
      padding: "4px 10px",
      borderRadius: 6,
      border: "none",
      background: "transparent",
      color: "#E8927D",
      cursor: "pointer",
      fontSize: 12,
    },
    downloadBtn: {
      marginTop: 30,
      width: "100%",
      padding: "14px",
      borderRadius: 10,
      border: "none",
      background: "linear-gradient(135deg, #E8A758, #D98A3D)",
      color: "#10151A",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 15,
    },
    errorBox: {
      background: "#2A1B1B",
      color: "#E8927D",
      padding: "10px 14px",
      borderRadius: 8,
      marginBottom: 14,
      fontSize: 13,
    },
    previewName: {
      fontFamily: "'Fraunces', serif",
      fontSize: 24,
      color: "#F3EFE9",
      marginBottom: 4,
    },
    previewContact: {
      color: "#5C6675",
      fontSize: 12.5,
      marginBottom: 20,
    },
    previewHeading: {
      fontFamily: "'Fraunces', serif",
      color: "#E8A758",
      fontSize: 15,
      marginTop: 18,
      marginBottom: 8,
      borderBottom: "1px solid #232B36",
      paddingBottom: 4,
    },
    previewText: {
      color: "#C7CDD6",
      fontSize: 13.5,
      lineHeight: 1.6,
      marginBottom: 6,
    },
    previewJobTitle: {
      color: "#E8E6E1",
      fontSize: 14,
      fontWeight: 600,
      marginBottom: 2,
    },
    previewDate: {
      color: "#5C6675",
      fontSize: 12,
      marginBottom: 4,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>AI Career Coach</div>
        <div style={styles.navRow}>
          <Link to="/chat" style={styles.navLink(false)}>Chat</Link>
          <Link to="/resume" style={styles.navLink(false)}>Resume Analysis</Link>
          <Link to="/resume-builder" style={styles.navLink(true)}>Resume Builder</Link>
          <Link to="/mind-map" style={styles.navLink(false)}>Mind Map</Link>
          <Link to="/interview" style={styles.navLink(false)}>Interview</Link>
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.formPanel}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <h2 style={{ ...styles.sectionTitle, marginTop: 0 }}>Personal Info</h2>
          <label style={styles.label}>Full Name *</label>
          <input style={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
          <label style={styles.label}>Email *</label>
          <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
          <label style={styles.label}>Phone</label>
          <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-1234" />
          <label style={styles.label}>Location</label>
          <input style={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="New York, NY" />
          <label style={styles.label}>LinkedIn</label>
          <input style={styles.input} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/janesmith" />

          <h2 style={styles.sectionTitle}>Summary</h2>
          <textarea style={styles.textarea} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A brief professional summary..." />
          <button
            style={styles.polishBtn(polishingKey === "summary")}
            onClick={() => polish("summary", summary, setSummary, "summary")}
            disabled={polishingKey === "summary"}
          >
            {polishingKey === "summary" ? "Polishing..." : "\u2728 Polish with AI"}
          </button>

          <h2 style={styles.sectionTitle}>Experience</h2>
          {experience.map((exp, i) => (
            <div key={i} style={styles.card}>
              <label style={styles.label}>Job Title</label>
              <input style={styles.input} value={exp.job_title} onChange={(e) => updateExperience(i, "job_title", e.target.value)} placeholder="Software Engineer" />
              <label style={styles.label}>Company</label>
              <input style={styles.input} value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} placeholder="TechCorp" />
              <label style={styles.label}>Dates</label>
              <input style={styles.input} value={exp.dates} onChange={(e) => updateExperience(i, "dates", e.target.value)} placeholder="2022 - Present" />
              <label style={styles.label}>Bullet Points</label>
              {exp.bullets.map((bullet, bi) => (
                <div key={bi} style={{ marginBottom: 8 }}>
                  <input
                    style={styles.input}
                    value={bullet}
                    onChange={(e) => updateBullet(i, bi, e.target.value)}
                    placeholder="Built and shipped a new feature..."
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      style={styles.polishBtn(polishingKey === `bullet-${i}-${bi}`)}
                      onClick={() =>
                        polish("bullet", bullet, (result) => updateBullet(i, bi, result), `bullet-${i}-${bi}`)
                      }
                      disabled={polishingKey === `bullet-${i}-${bi}`}
                    >
                      {polishingKey === `bullet-${i}-${bi}` ? "Polishing..." : "\u2728 Polish"}
                    </button>
                    {exp.bullets.length > 1 && (
                      <button style={styles.removeBtn} onClick={() => removeBullet(i, bi)}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
              <button style={styles.addBtn} onClick={() => addBullet(i)}>+ Add Bullet</button>
              <div style={{ marginTop: 10 }}>
                {experience.length > 1 && (
                  <button style={styles.removeBtn} onClick={() => removeExperience(i)}>Remove This Job</button>
                )}
              </div>
            </div>
          ))}
          <button style={styles.addBtn} onClick={addExperience}>+ Add Experience</button>

          <h2 style={styles.sectionTitle}>Education</h2>
          {education.map((edu, i) => (
            <div key={i} style={styles.card}>
              <label style={styles.label}>Degree</label>
              <input style={styles.input} value={edu.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="B.S. Computer Science" />
              <label style={styles.label}>School</label>
              <input style={styles.input} value={edu.school} onChange={(e) => updateEducation(i, "school", e.target.value)} placeholder="NYU" />
              <label style={styles.label}>Dates</label>
              <input style={styles.input} value={edu.dates} onChange={(e) => updateEducation(i, "dates", e.target.value)} placeholder="2018 - 2022" />
              {education.length > 1 && (
                <button style={styles.removeBtn} onClick={() => removeEducation(i)}>Remove</button>
              )}
            </div>
          ))}
          <button style={styles.addBtn} onClick={addEducation}>+ Add Education</button>

          <h2 style={styles.sectionTitle}>Skills</h2>
          <textarea style={styles.textarea} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, JavaScript, React..." />
          <button
            style={styles.polishBtn(polishingKey === "skills")}
            onClick={() => polish("skills", skills, setSkills, "skills")}
            disabled={polishingKey === "skills"}
          >
            {polishingKey === "skills" ? "Polishing..." : "\u2728 Polish with AI"}
          </button>

          <button style={styles.downloadBtn} onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating PDF..." : "Download Resume PDF"}
          </button>
        </div>

        <div style={styles.previewPanel}>
          <div style={styles.previewName}>{fullName || "Your Name"}</div>
          <div style={styles.previewContact}>
            {[email, phone, location, linkedin].filter(Boolean).join(" | ") || "email |phone | location"}
          </div>

          {summary && (
            <>
              <div style={styles.previewHeading}>Summary</div>
              <div style={styles.previewText}>{summary}</div>
            </>
          )}

          {experience.some((e) => e.job_title || e.company) && (
            <>
              <div style={styles.previewHeading}>Experience</div>
              {experience.map((exp, i) => (
                (exp.job_title || exp.company) && (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={styles.previewJobTitle}>{exp.job_title} {exp.company && `\u2014 ${exp.company}`}</div>
                    <div style={styles.previewDate}>{exp.dates}</div>
                    {exp.bullets.filter(Boolean).map((b, bi) => (
                      <div key={bi} style={styles.previewText}>{"\u2022"} {b}</div>
                    ))}
                  </div>
                )
              ))}
            </>
          )}

          {education.some((e) => e.degree || e.school) && (
            <>
              <div style={styles.previewHeading}>Education</div>
              {education.map((edu, i) => (
                (edu.degree || edu.school) && (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={styles.previewJobTitle}>{edu.degree} {edu.school && `\u2014 ${edu.school}`}</div>
                    <div style={styles.previewDate}>{edu.dates}</div>
                  </div>
                )
              ))}
            </>
          )}

          {skills && (
            <>
              <div style={styles.previewHeading}>Skills</div>
              <div style={styles.previewText}>{skills}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResumeBuilder;
