import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Auth from "./pages/Auth";
import Cases from "./pages/Cases";
import Upgrade from "./pages/Upgrade";
import Balance from "./pages/Balance";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { api, getToken } from "@/lib/api";
import Icon from "@/components/ui/icon";

const queryClient = new QueryClient();

interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  avatar_url?: string;
}

type NavTab = "cases" | "upgrade" | "profile" | "balance";

function NavBar({ user, activeTab, onTabChange, onLogout }: {
  user: User;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout: () => void;
}) {
  const navItems: { id: NavTab; icon: string; label: string }[] = [
    { id: "cases", icon: "Package", label: "Кейсы" },
    { id: "upgrade", icon: "TrendingUp", label: "Апгрейд" },
    { id: "balance", icon: "Wallet", label: "Баланс" },
    { id: "profile", icon: "User", label: "Профиль" },
  ];

  return (
    <header className="sticky top-0 z-50 glass" style={{ borderBottom: "1px solid var(--border-color)" }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f5a623, #c4841a)" }}>
            <Icon name="Package" size={14} className="text-black" />
          </div>
          <span className="font-black text-base">
            <span className="gold-text">CLD</span>
            <span className="text-white">Cases</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
              style={{
                color: activeTab === item.id ? "var(--gold)" : "#6b7280",
                background: activeTab === item.id ? "rgba(245,166,35,0.08)" : "transparent",
              }}
            >
              <Icon name={item.icon as "Package"} size={14} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Balance + user */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl text-sm font-black" style={{ background: "rgba(245,166,35,0.1)", color: "var(--gold)", border: "1px solid rgba(245,166,35,0.2)" }}>
            {user.balance.toLocaleString()} CLD
          </div>
          <button onClick={onLogout} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--surface2)", color: "#6b7280" }}
            title="Выйти"
          >
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden flex border-t" style={{ borderColor: "var(--border-color)" }}>
        {navItems.map((item) => (
          <button key={item.id} onClick={() => onTabChange(item.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors"
            style={{ color: activeTab === item.id ? "var(--gold)" : "#4b5563" }}
          >
            <Icon name={item.icon as "Package"} size={16} />
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}

function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>("cases");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.me().then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Sync activeTab with route
  useEffect(() => {
    const path = location.pathname.replace("/", "") as NavTab;
    if (["cases", "upgrade", "balance", "profile"].includes(path)) {
      setActiveTab(path);
    }
  }, [location.pathname]);

  const handleAuth = (_token: string, u: User) => {
    setUser(u);
    navigate("/cases");
  };

  const handleLogout = () => {
    api.logout();
    localStorage.removeItem("cld_token");
    setUser(null);
    navigate("/auth");
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  const handleBalanceUpdate = (balance: number) => {
    setUser(prev => prev ? { ...prev, balance } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-glow-pulse" style={{ background: "linear-gradient(135deg, #f5a623, #c4841a)" }}>
            <Icon name="Package" size={20} className="text-black" />
          </div>
          <div className="text-sm text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={
        user ? <Navigate to="/cases" replace /> : <Auth onAuth={handleAuth} />
      } />

      <Route path="/cases" element={
        !user ? <Navigate to="/auth" replace /> : (
          <>
            <NavBar user={user} activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} />
            <Cases user={user} onBalanceUpdate={handleBalanceUpdate} />
          </>
        )
      } />

      <Route path="/upgrade" element={
        !user ? <Navigate to="/auth" replace /> : (
          <>
            <NavBar user={user} activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} />
            <Upgrade user={user} onBalanceUpdate={handleBalanceUpdate} />
          </>
        )
      } />

      <Route path="/balance" element={
        !user ? <Navigate to="/auth" replace /> : (
          <>
            <NavBar user={user} activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} />
            <Balance user={user} onBalanceUpdate={handleBalanceUpdate} />
          </>
        )
      } />

      <Route path="/profile" element={
        !user ? <Navigate to="/auth" replace /> : (
          <>
            <NavBar user={user} activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} />
            <Profile user={user} onBalanceUpdate={handleBalanceUpdate} onLogout={handleLogout} />
          </>
        )
      } />

      <Route path="/" element={<Navigate to={user ? "/cases" : "/auth"} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;