import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/create", label: "Create Agent" },
    { to: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <nav className="border-b border-dark-600 bg-dark-800/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-accent-green font-bold text-lg font-mono">
            SILICON COLISEUM
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-dark-600 text-accent-green"
                  : "text-gray-400 hover:text-gray-200 hover:bg-dark-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
