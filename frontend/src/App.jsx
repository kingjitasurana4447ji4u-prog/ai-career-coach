import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import Resume from "./pages/Resume";
import ResumeBuilder from "./pages/ResumeBuilder";
import MindMap from "./pages/MindMap";
import Interviewer from "./pages/Interviewer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/mind-map" element={<MindMap />} />
        <Route path="/interview" element={<Interviewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;