import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import CreateAgent from "./pages/CreateAgent";
import AgentDetail from "./pages/AgentDetail";
import Leaderboard from "./pages/Leaderboard";

// Simple user ID for MVP (no auth)
const USER_ID = "demo-user-001";

export default function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard userId={USER_ID} />} />
          <Route path="/create" element={<CreateAgent userId={USER_ID} />} />
          <Route path="/agent/:id" element={<AgentDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
