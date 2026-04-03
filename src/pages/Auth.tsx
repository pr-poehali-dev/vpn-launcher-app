import { useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Props {
  onAuth: (token: string, user: User) => void;
}

interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  avatar_url?: string;
}

export default function Auth({ onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = mode === "login"
        ? await api.login({ username: form.username, password: form.password })
        : await api.register(form);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      localStorage.setItem("cld_token", data.token);
      onAuth(data.token, data.user);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid-dark flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg)" }}>
      {/* BG glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,166,35,0.06) 0%, transparent 100%)" }} />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f5a623, #c4841a)", boxShadow: "0 0 24px rgba(245,166,35,0.4)" }}>
              <Icon name="Package" size={20} className="text-black" />
            </div>
            <span className="text-3xl font-black" style={{ fontFamily: "system-ui" }}>
              <span className="gold-text">CLD</span>
              <span className="text-white">Cases</span>
            </span>
          </div>
          <p className="text-sm text-gray-400">Открывай кейсы CS2 и выигрывай скины</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "var(--bg)" }}>
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: mode === m ? "linear-gradient(135deg, #f5a623, #c4841a)" : "transparent",
                  color: mode === m ? "#0d1117" : "#6b7280",
                  boxShadow: mode === m ? "0 0 16px rgba(245,166,35,0.3)" : "none",
                }}
              >
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                {mode === "login" ? "Логин или Email" : "Логин"}
              </label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={mode === "login" ? "your_login" : "coolplayer123"}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.08)", color: "white", caretColor: "var(--gold)" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(245,166,35,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  type="email"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.08)", color: "white", caretColor: "var(--gold)" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(245,166,35,0.5)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">Пароль</label>
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.08)", color: "white", caretColor: "var(--gold)" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(245,166,35,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                <Icon name="AlertCircle" size={14} />
                {error}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-base gold-btn flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                <>
                  <Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={18} />
                  {mode === "login" ? "Войти" : "Создать аккаунт"}
                </>
              )}
            </button>
          </div>

          {/* Features */}
          {mode === "register" && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: "Package", text: "Кейсы CS2" },
                { icon: "TrendingUp", text: "Апгрейдер" },
                { icon: "Wallet", text: "СБП оплата" },
              ].map((f) => (
                <div key={f.text} className="flex flex-col items-center gap-1.5 p-2 rounded-xl" style={{ background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.1)" }}>
                  <Icon name={f.icon as "Package"} size={16} style={{ color: "var(--gold)" }} />
                  <span className="text-xs text-gray-400 text-center">{f.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Только для совершеннолетних. Играйте ответственно.
        </p>
      </div>
    </div>
  );
}
