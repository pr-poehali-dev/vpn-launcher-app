import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const SERVERS = [
  { id: 1, country: "Нидерланды", city: "Амстердам", flag: "🇳🇱", ping: 12, load: 23, speed: 95 },
  { id: 2, country: "Германия", city: "Франкфурт", flag: "🇩🇪", ping: 18, load: 41, speed: 88 },
  { id: 3, country: "США", city: "Нью-Йорк", flag: "🇺🇸", ping: 95, load: 67, speed: 72 },
  { id: 4, country: "Япония", city: "Токио", flag: "🇯🇵", ping: 145, load: 31, speed: 84 },
  { id: 5, country: "Великобритания", city: "Лондон", flag: "🇬🇧", ping: 28, load: 55, speed: 79 },
  { id: 6, country: "Франция", city: "Париж", flag: "🇫🇷", ping: 22, load: 38, speed: 91 },
  { id: 7, country: "Сингапур", city: "Сингапур", flag: "🇸🇬", ping: 120, load: 19, speed: 93 },
  { id: 8, country: "Канада", city: "Торонто", flag: "🇨🇦", ping: 108, load: 44, speed: 76 },
];

const PROTOCOLS = [
  { id: "wireguard", name: "WireGuard", desc: "Максимальная скорость", badge: "Рекомендуется" },
  { id: "openvpn", name: "OpenVPN", desc: "Надёжность и совместимость", badge: null },
  { id: "shadowsocks", name: "Shadowsocks", desc: "Обход глубокой проверки", badge: "Скрытый" },
  { id: "v2ray", name: "V2Ray", desc: "Продвинутая маскировка", badge: "Стелс" },
];

type Tab = "home" | "servers" | "settings";
type FilterType = "all" | "fast" | "nearest";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

function SpeedChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - (v / max) * 90;
    return `${x},${y}`;
  });
  const points = pts.join(" ");
  const gradId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#${gradId})`} />
    </svg>
  );
}

export default function Index() {
  const [tab, setTab] = useState<Tab>("home");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activeServer, setActiveServer] = useState(SERVERS[0]);
  const [protocol, setProtocol] = useState("wireguard");
  const [filter, setFilter] = useState<FilterType>("all");
  const [killSwitch, setKillSwitch] = useState(true);
  const [autoConnect, setAutoConnect] = useState(false);
  const [splitTunnel, setSplitTunnel] = useState(false);
  const [dns, setDns] = useState(true);
  const [connectedTime, setConnectedTime] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [dlHistory, setDlHistory] = useState<number[]>(Array(20).fill(0));
  const [ulHistory, setUlHistory] = useState<number[]>(Array(20).fill(0));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setConnectedTime((t) => t + 1), 1000);
      statsRef.current = setInterval(() => {
        const dl = Math.random() * 2500000 + 500000;
        const ul = Math.random() * 800000 + 100000;
        setDownloadSpeed(dl);
        setUploadSpeed(ul);
        setDownloaded((d) => d + dl / 10);
        setUploaded((u) => u + ul / 10);
        setDlHistory((h) => [...h.slice(1), dl / 1000000]);
        setUlHistory((h) => [...h.slice(1), ul / 1000000]);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
      if (!connecting) {
        setConnectedTime(0);
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setDlHistory(Array(20).fill(0));
        setUlHistory(Array(20).fill(0));
        setDownloaded(0);
        setUploaded(0);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
    };
  }, [connected, connecting]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const handleConnect = () => {
    if (connected) {
      setConnected(false);
      return;
    }
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 2200);
  };

  const filteredServers = SERVERS.filter((s) => {
    if (filter === "fast") return s.speed >= 85;
    if (filter === "nearest") return s.ping <= 30;
    return true;
  });

  const connectionColor = connected
    ? "var(--cloud-emerald)"
    : connecting
    ? "var(--cloud-cyan)"
    : "#2a3a55";

  return (
    <div
      className="min-h-screen text-white font-golos relative overflow-hidden"
      style={{ backgroundColor: "var(--cloud-bg)" }}
    >
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Ambient glows */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "-20%", left: "-10%",
          width: "60%", height: "60%",
          background: "radial-gradient(ellipse, rgba(0,229,255,0.06) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: "-15%", right: "-10%",
          width: "55%", height: "55%",
          background: "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      {/* App shell */}
      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-6 pb-4 entry-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--cloud-cyan), var(--cloud-violet))",
                boxShadow: "0 0 20px rgba(0,229,255,0.35)",
              }}
            >
              <Icon name="Cloud" size={17} className="text-gray-900" />
            </div>
            <span
              className="text-xl font-black tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Cloud<span style={{ color: "var(--cloud-cyan)" }}>ON</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(16,245,160,0.1)",
                  border: "1px solid rgba(16,245,160,0.25)",
                  color: "var(--cloud-emerald)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "var(--cloud-emerald)",
                    boxShadow: "0 0 6px var(--cloud-emerald)",
                    animation: "glow-pulse 2s ease-in-out infinite",
                  }}
                />
                Защищён
              </div>
            )}
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--cloud-surface2)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <Icon name="Bell" size={15} className="text-gray-400" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-5 pb-28 overflow-y-auto">

          {/* ===== HOME ===== */}
          {tab === "home" && (
            <div className="space-y-4">

              {/* Hero connect card */}
              <div
                className="rounded-3xl p-6 entry-2"
                style={{
                  background: "var(--cloud-surface)",
                  border: "1px solid var(--cloud-border)",
                }}
              >
                <div className="flex flex-col items-center gap-5">

                  {/* Big button */}
                  <div className="relative flex items-center justify-center" style={{ width: 210, height: 210 }}>
                    {(connected || connecting) && (
                      <>
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: 210, height: 210,
                            border: `1px solid ${connectionColor}`,
                            opacity: 0.15,
                            animation: "pulse-ring 2.5s ease-in-out infinite",
                          }}
                        />
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: 185, height: 185,
                            border: `1px solid ${connectionColor}`,
                            opacity: 0.25,
                            animation: "pulse-ring 2.5s ease-in-out infinite 0.7s",
                          }}
                        />
                      </>
                    )}

                    {/* Decorative orbit */}
                    <div
                      className="absolute rounded-full"
                      style={{ width: 168, height: 168, border: "1px dashed rgba(255,255,255,0.04)" }}
                    />
                    <div
                      className="absolute"
                      style={{ width: 168, height: 168, animation: "spin-slow 14s linear infinite" }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full absolute"
                        style={{
                          top: -5,
                          left: "calc(50% - 5px)",
                          background: connected ? "var(--cloud-emerald)" : "var(--cloud-cyan)",
                          boxShadow: `0 0 10px ${connected ? "var(--cloud-emerald)" : "var(--cloud-cyan)"}`,
                        }}
                      />
                    </div>
                    <div
                      className="absolute"
                      style={{ width: 140, height: 140, animation: "spin-slow 8s linear infinite reverse" }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full absolute"
                        style={{
                          bottom: -3,
                          left: "calc(50% - 3px)",
                          background: "var(--cloud-violet)",
                          boxShadow: "0 0 8px var(--cloud-violet)",
                        }}
                      />
                    </div>

                    {/* Main circle button */}
                    <button
                      onClick={handleConnect}
                      className="relative z-10 rounded-full flex flex-col items-center justify-center gap-1.5 transition-all duration-400 select-none"
                      style={{
                        width: 136, height: 136,
                        background: "linear-gradient(145deg, #101e35 0%, #060c1a 100%)",
                        border: `2px solid ${connectionColor}`,
                        boxShadow: connected
                          ? "0 0 50px rgba(16,245,160,0.22), 0 0 100px rgba(16,245,160,0.08), inset 0 0 40px rgba(16,245,160,0.04)"
                          : connecting
                          ? "0 0 40px rgba(0,229,255,0.18), 0 0 80px rgba(0,229,255,0.06)"
                          : "inset 0 0 20px rgba(0,0,0,0.5)",
                        transition: "border-color 0.4s, box-shadow 0.4s",
                      }}
                    >
                      {connecting ? (
                        <>
                          <div
                            className="rounded-full"
                            style={{
                              width: 30, height: 30,
                              border: "2.5px solid rgba(0,229,255,0.15)",
                              borderTopColor: "var(--cloud-cyan)",
                              animation: "spin-slow 0.8s linear infinite",
                            }}
                          />
                          <span className="text-xs font-bold tracking-wide" style={{ color: "var(--cloud-cyan)" }}>
                            Связь...
                          </span>
                        </>
                      ) : (
                        <>
                          <Icon
                            name={connected ? "ShieldCheck" : "Power"}
                            size={34}
                            style={{ color: connectionColor, transition: "color 0.4s" }}
                          />
                          <span
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: connectionColor, letterSpacing: "0.12em", transition: "color 0.4s" }}
                          >
                            {connected ? "Онлайн" : "Включить"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status info */}
                  <div className="text-center space-y-1">
                    {connected && (
                      <div
                        className="text-3xl font-black tabular-nums"
                        style={{
                          fontFamily: "Montserrat, sans-serif",
                          background: "linear-gradient(135deg, var(--cloud-emerald), var(--cloud-cyan))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {formatTime(connectedTime)}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{activeServer.flag}</span>
                      <span className="text-sm font-semibold text-gray-300">
                        {activeServer.city}, {activeServer.country}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-lg font-bold"
                        style={{
                          background: "rgba(0,229,255,0.1)",
                          color: "var(--cloud-cyan)",
                          border: "1px solid rgba(0,229,255,0.15)",
                        }}
                      >
                        {activeServer.ping} мс
                      </span>
                    </div>
                    <div className="text-xs font-medium" style={{ color: "var(--cloud-violet)" }}>
                      {PROTOCOLS.find((p) => p.id === protocol)?.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live stats */}
              {connected && (
                <div className="grid grid-cols-2 gap-3 entry-3">
                  {[
                    {
                      label: "Загрузка", icon: "ArrowDown", color: "var(--cloud-cyan)",
                      speed: downloadSpeed, total: downloaded, history: dlHistory,
                    },
                    {
                      label: "Отдача", icon: "ArrowUp", color: "var(--cloud-violet)",
                      speed: uploadSpeed, total: uploaded, history: ulHistory,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl p-4"
                      style={{ background: "var(--cloud-surface)", border: "1px solid var(--cloud-border)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: `${stat.color}15` }}
                        >
                          <Icon name={stat.icon as "ArrowDown"} size={12} style={{ color: stat.color }} />
                        </div>
                        <span className="text-xs text-gray-400">{stat.label}</span>
                      </div>
                      <div
                        className="text-lg font-black"
                        style={{ color: stat.color, fontFamily: "Montserrat, sans-serif" }}
                      >
                        {(stat.speed / 1000000).toFixed(2)}
                        <span className="text-xs font-medium text-gray-400 ml-1">МБ/с</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Всего: {formatBytes(stat.total)}
                      </div>
                      <div className="mt-2">
                        <SpeedChart values={stat.history} color={stat.color} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick server picker */}
              <div
                className="rounded-2xl p-4 entry-4"
                style={{ background: "var(--cloud-surface)", border: "1px solid var(--cloud-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-300">Быстрый выбор</span>
                  <button
                    onClick={() => setTab("servers")}
                    className="text-xs font-semibold"
                    style={{ color: "var(--cloud-cyan)" }}
                  >
                    Все →
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {SERVERS.slice(0, 4).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveServer(s)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200"
                      style={{
                        background: activeServer.id === s.id ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${activeServer.id === s.id ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.04)"}`,
                      }}
                    >
                      <span className="text-xl">{s.flag}</span>
                      <span className="text-xs text-gray-400 truncate w-full text-center">{s.city}</span>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color:
                            s.ping < 30 ? "var(--cloud-emerald)"
                            : s.ping < 80 ? "var(--cloud-cyan)"
                            : "var(--cloud-violet)",
                        }}
                      >
                        {s.ping}мс
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleConnect}
                className="w-full rounded-2xl py-4 font-black text-sm transition-all duration-300 entry-5"
                style={{
                  background: connected
                    ? "linear-gradient(135deg, rgba(244,63,135,0.9), rgba(244,63,135,0.7))"
                    : "linear-gradient(135deg, var(--cloud-cyan), var(--cloud-violet))",
                  color: connected ? "white" : "#000",
                  boxShadow: connected
                    ? "0 0 30px rgba(244,63,135,0.25)"
                    : "0 0 30px rgba(0,229,255,0.25)",
                  letterSpacing: "0.03em",
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Icon name={connected ? "PowerOff" : "Zap"} size={18} />
                  {connected ? "Отключиться" : "Оптимальный сервер — 1 клик"}
                </span>
              </button>
            </div>
          )}

          {/* ===== SERVERS ===== */}
          {tab === "servers" && (
            <div className="space-y-4 entry-1">
              <div>
                <h2 className="text-xl font-black" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  VPN Серверы
                </h2>
                <p className="text-sm text-gray-500">{SERVERS.length} локаций по всему миру</p>
              </div>

              {/* Filter chips */}
              <div className="flex gap-2">
                {(["all", "nearest", "fast"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200"
                    style={{
                      background: filter === f ? "var(--cloud-cyan)" : "var(--cloud-surface2)",
                      color: filter === f ? "#000" : "#6b7280",
                      border: `1px solid ${filter === f ? "var(--cloud-cyan)" : "rgba(255,255,255,0.05)"}`,
                      boxShadow: filter === f ? "0 0 16px rgba(0,229,255,0.25)" : "none",
                    }}
                  >
                    {f === "all" ? "Все" : f === "nearest" ? "⚡ Ближние" : "🚀 Быстрые"}
                  </button>
                ))}
              </div>

              {/* Servers */}
              <div className="space-y-2">
                {filteredServers.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    <Icon name="ServerOff" size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Нет серверов по фильтру</p>
                  </div>
                )}
                {filteredServers.map((server, i) => (
                  <div
                    key={server.id}
                    className="server-card rounded-2xl p-4 cursor-pointer"
                    style={{
                      background: activeServer.id === server.id ? "rgba(0,229,255,0.07)" : "var(--cloud-surface)",
                      border: `1px solid ${activeServer.id === server.id ? "rgba(0,229,255,0.22)" : "var(--cloud-border)"}`,
                      animation: `slide-up 0.4s ease-out ${i * 0.05}s both`,
                    }}
                    onClick={() => { setActiveServer(server); setTab("home"); }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{server.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-white">{server.city}</span>
                          {activeServer.id === server.id && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                              style={{ background: "rgba(0,229,255,0.12)", color: "var(--cloud-cyan)" }}
                            >
                              Текущий
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{server.country}</div>
                        {/* Load bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${server.load}%`,
                                background:
                                  server.load < 40 ? "var(--cloud-emerald)"
                                  : server.load < 70 ? "var(--cloud-cyan)"
                                  : "var(--cloud-pink)",
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">{server.load}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-sm font-black"
                          style={{
                            color:
                              server.ping < 30 ? "var(--cloud-emerald)"
                              : server.ping < 80 ? "var(--cloud-cyan)"
                              : "var(--cloud-violet)",
                            fontFamily: "Montserrat, sans-serif",
                          }}
                        >
                          {server.ping} мс
                        </span>
                        <div className="flex gap-0.5 items-end">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className="w-1 rounded-sm"
                              style={{
                                height: `${bar * 4}px`,
                                background:
                                  bar <= Math.ceil(server.speed / 25)
                                    ? "var(--cloud-cyan)"
                                    : "rgba(255,255,255,0.08)",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== SETTINGS ===== */}
          {tab === "settings" && (
            <div className="space-y-5 entry-1">
              <div>
                <h2 className="text-xl font-black" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Настройки
                </h2>
                <p className="text-sm text-gray-500">Протокол и расширенные опции</p>
              </div>

              {/* Protocol selector */}
              <div
                className="rounded-2xl p-4"
                style={{ background: "var(--cloud-surface)", border: "1px solid var(--cloud-border)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Shield" size={14} style={{ color: "var(--cloud-violet)" }} />
                  <span className="text-sm font-semibold text-gray-200">Протокол VPN</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PROTOCOLS.map((p) => (
                    <button
                      key={p.id}
                      className="protocol-card rounded-xl p-3 text-left transition-all duration-200"
                      style={{
                        background: protocol === p.id ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${protocol === p.id ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.05)"}`,
                        boxShadow: protocol === p.id ? "0 0 18px rgba(139,92,246,0.12)" : "none",
                      }}
                      onClick={() => setProtocol(p.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-sm font-bold"
                          style={{ color: protocol === p.id ? "var(--cloud-violet)" : "white" }}
                        >
                          {p.name}
                        </span>
                        {protocol === p.id && (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "var(--cloud-violet)" }}
                          >
                            <Icon name="Check" size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1.5">{p.desc}</div>
                      {p.badge && (
                        <span
                          className="inline-block text-xs px-1.5 py-0.5 rounded-md font-bold"
                          style={{
                            background: "rgba(139,92,246,0.15)",
                            color: "var(--cloud-violet)",
                          }}
                        >
                          {p.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced toggles */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--cloud-surface)", border: "1px solid var(--cloud-border)" }}
              >
                <div
                  className="px-4 py-3 flex items-center gap-2"
                  style={{ borderBottom: "1px solid var(--cloud-border)" }}
                >
                  <Icon name="Settings2" size={14} style={{ color: "var(--cloud-cyan)" }} />
                  <span className="text-sm font-semibold text-gray-200">Расширенные</span>
                </div>

                {[
                  {
                    label: "Kill Switch",
                    desc: "Блокировать трафик без VPN",
                    val: killSwitch, set: setKillSwitch,
                    icon: "Sword", color: "var(--cloud-pink)",
                  },
                  {
                    label: "Автоподключение",
                    desc: "При запуске приложения",
                    val: autoConnect, set: setAutoConnect,
                    icon: "Zap", color: "var(--cloud-cyan)",
                  },
                  {
                    label: "Split Tunneling",
                    desc: "Только выбранные приложения",
                    val: splitTunnel, set: setSplitTunnel,
                    icon: "GitBranch", color: "var(--cloud-violet)",
                  },
                  {
                    label: "DNS-защита",
                    desc: "Шифрование DNS-запросов",
                    val: dns, set: setDns,
                    icon: "Globe", color: "var(--cloud-emerald)",
                  },
                ].map((item, i, arr) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-3.5"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--cloud-border)" : "none" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${item.color}18` }}
                      >
                        <Icon name={item.icon as "Globe"} size={13} style={{ color: item.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-200">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => item.set(!item.val)}
                      className="relative shrink-0 rounded-full transition-all duration-300"
                      style={{
                        width: 44, height: 24,
                        background: item.val
                          ? "linear-gradient(135deg, var(--cloud-cyan), var(--cloud-violet))"
                          : "rgba(255,255,255,0.07)",
                        boxShadow: item.val ? "0 0 14px rgba(0,229,255,0.28)" : "none",
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300"
                        style={{ left: item.val ? "calc(100% - 22px)" : "2px" }}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* About */}
              <div
                className="rounded-2xl p-4 flex items-center justify-between"
                style={{ background: "var(--cloud-surface)", border: "1px solid var(--cloud-border)" }}
              >
                <div>
                  <div
                    className="text-sm font-black"
                    style={{
                      background: "linear-gradient(135deg, var(--cloud-cyan), var(--cloud-violet))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    CloudON
                  </div>
                  <div className="text-xs text-gray-500">Версия 1.0.0 • Активна</div>
                </div>
                <div
                  className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background: "rgba(16,245,160,0.1)",
                    color: "var(--cloud-emerald)",
                    border: "1px solid rgba(16,245,160,0.2)",
                  }}
                >
                  Актуальна
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom navigation */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-2"
          style={{
            background: "linear-gradient(to top, rgba(6,12,26,1) 55%, rgba(6,12,26,0) 100%)",
          }}
        >
          <div
            className="flex items-center justify-around rounded-2xl px-1 py-2"
            style={{
              background: "rgba(13,22,40,0.9)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(0,229,255,0.08)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {[
              { id: "home", label: "Главная", icon: "Home" },
              { id: "servers", label: "Серверы", icon: "Globe" },
              { id: "settings", label: "Настройки", icon: "Settings" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as Tab)}
                className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-200 relative"
                style={{
                  background: tab === item.id ? "rgba(0,229,255,0.08)" : "transparent",
                  color: tab === item.id ? "var(--cloud-cyan)" : "#6b7280",
                }}
              >
                <Icon name={item.icon as "Home"} size={20} />
                <span className="text-xs font-semibold">{item.label}</span>
                {tab === item.id && (
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{
                      background: "var(--cloud-cyan)",
                      boxShadow: "0 0 6px var(--cloud-cyan)",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
