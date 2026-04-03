import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Skin {
  id: number;
  name: string;
  weapon_type: string;
  rarity: string;
  rarity_color: string;
  price: number;
  image_url: string;
  exterior: string;
  drop_chance?: number;
}

interface Case {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
}

interface Props {
  user: { balance: number; username: string };
  onBalanceUpdate: (balance: number) => void;
}

const RARITY_LABELS: Record<string, string> = {
  "Consumer": "Ширпотреб",
  "Industrial": "Промышленное",
  "Mil-Spec": "Армейское",
  "Restricted": "Запрещённое",
  "Classified": "Засекреченное",
  "Covert": "Тайное",
  "Contraband": "Контрабанда",
};

function SkinCard({ skin, size = "md" }: { skin: Skin; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "p-2", md: "p-3", lg: "p-4" };
  const imgSizes = { sm: "h-16", md: "h-20", lg: "h-28" };
  return (
    <div className="rounded-xl flex flex-col items-center gap-2 skin-card"
      style={{ background: "var(--surface2)", border: `1px solid ${skin.rarity_color}30` }}
    >
      <div className={`${sizes[size]} w-full flex flex-col items-center gap-1.5`}>
        <div className="w-full rounded-lg overflow-hidden" style={{ background: `${skin.rarity_color}10` }}>
          <img src={skin.image_url} alt={skin.name} className={`w-full object-contain ${imgSizes[size]}`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
        <div className="text-center w-full">
          <div className="text-xs font-semibold text-white truncate w-full">{skin.name}</div>
          <div className="text-xs mt-0.5" style={{ color: skin.rarity_color }}>{RARITY_LABELS[skin.rarity] || skin.rarity}</div>
        </div>
        <div className="font-bold text-sm" style={{ color: "var(--gold)" }}>{skin.price.toLocaleString()} CLD</div>
      </div>
    </div>
  );
}

export default function Cases({ user, onBalanceUpdate }: Props) {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseSkins, setCaseSkins] = useState<Skin[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [wonSkin, setWonSkin] = useState<Skin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [reelItems, setReelItems] = useState<Skin[]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const [error, setError] = useState("");
  const [loadingCases, setLoadingCases] = useState(true);
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getCases().then(r => r.json()).then(d => {
      setCases(d.cases || []);
      setLoadingCases(false);
    });
  }, []);

  const selectCase = async (c: Case) => {
    setSelectedCase(c);
    setWonSkin(null);
    setShowResult(false);
    setError("");
    const res = await api.getCaseSkins(c.id);
    const d = await res.json();
    setCaseSkins(d.skins || []);
  };

  const openCase = async () => {
    if (!selectedCase || spinning) return;
    setError("");
    setShowResult(false);
    setWonSkin(null);

    const res = await api.openCase(selectedCase.id);
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Ошибка"); return; }

    const skin = data.skin as Skin;
    onBalanceUpdate(data.new_balance);

    // Build reel — 40 random items + won skin near end
    const pool = caseSkins.length > 0 ? caseSkins : [skin];
    const reel: Skin[] = [];
    for (let i = 0; i < 38; i++) {
      reel.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    reel.push(skin); // at position 38
    reel.push(pool[Math.floor(Math.random() * pool.length)]);
    setReelItems(reel);
    setReelOffset(0);
    setSpinning(true);

    // Animate after render
    setTimeout(() => {
      const itemW = 112 + 8; // 112px + 8px gap
      const centerIdx = 38;
      const offset = centerIdx * itemW - (reelRef.current?.clientWidth || 600) / 2 + 56;
      setReelOffset(offset);
    }, 100);

    // Show result after animation
    setTimeout(() => {
      setSpinning(false);
      setWonSkin(skin);
      setShowResult(true);
    }, 6000);
  };

  const ITEM_W = 120;

  return (
    <div className="min-h-screen bg-grid-dark px-4 py-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6 entry-1">
          <h1 className="text-3xl font-black text-white mb-1">
            🎁 <span className="gold-text">Кейсы</span> CS2
          </h1>
          <p className="text-gray-400 text-sm">Выберите кейс и испытайте удачу</p>
        </div>

        {/* Cases grid */}
        {loadingCases ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1,2,3].map(i => (
              <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: "var(--surface)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 entry-2">
            {cases.map((c) => (
              <div key={c.id} onClick={() => selectCase(c)}
                className="rounded-2xl p-5 cursor-pointer transition-all duration-200 relative overflow-hidden"
                style={{
                  background: selectedCase?.id === c.id ? "rgba(245,166,35,0.08)" : "var(--surface)",
                  border: `2px solid ${selectedCase?.id === c.id ? "rgba(245,166,35,0.5)" : "var(--border-color)"}`,
                  boxShadow: selectedCase?.id === c.id ? "0 0 24px rgba(245,166,35,0.15)" : "none",
                  transform: selectedCase?.id === c.id ? "translateY(-2px)" : undefined,
                }}
              >
                {selectedCase?.id === c.id && (
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.1) 0%, transparent 70%)" }} />
                )}
                <div className="text-5xl mb-3 text-center">
                  {c.id === 1 ? "📦" : c.id === 2 ? "💎" : "👑"}
                </div>
                <h3 className="font-black text-white text-center mb-1">{c.name}</h3>
                <p className="text-xs text-gray-400 text-center mb-3">{c.description}</p>
                <div className="text-center">
                  <span className="inline-block px-4 py-1.5 rounded-full font-black text-sm"
                    style={{
                      background: "linear-gradient(135deg, #f5a623, #c4841a)",
                      color: "#0d1117",
                      boxShadow: "0 0 16px rgba(245,166,35,0.3)",
                    }}
                  >
                    {c.price} CLD
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reel + Open area */}
        {selectedCase && (
          <div className="entry-3">
            <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-white text-lg">{selectedCase.name}</h2>
                <div className="text-sm text-gray-400">
                  Ваш баланс: <span className="font-bold" style={{ color: "var(--gold)" }}>{user.balance.toLocaleString()} CLD</span>
                </div>
              </div>

              {/* Reel */}
              <div className="reel-wrapper h-32 mb-5" style={{ border: "1px solid rgba(245,166,35,0.15)", borderRadius: 12 }}>
                <div className="reel-pointer" />
                {/* Fade edges */}
                <div className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, var(--surface), transparent)" }} />
                <div className="absolute inset-y-0 right-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, var(--surface), transparent)" }} />
                <div ref={reelRef}
                  className="reel-track h-full items-center px-4 py-2"
                  style={{ transform: spinning ? `translateX(-${reelOffset}px)` : "translateX(0)" }}
                >
                  {(reelItems.length > 0 ? reelItems : caseSkins.slice(0, 10)).map((skin, i) => (
                    <div key={i} className="shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 h-full py-2"
                      style={{ width: ITEM_W, background: `${skin.rarity_color}15`, border: `1px solid ${skin.rarity_color}30` }}
                    >
                      <img src={skin.image_url} alt={skin.name} className="h-14 w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="text-xs text-center font-medium text-white px-1 truncate w-full text-center">{skin.name.split("|")[1]?.trim() || skin.name}</div>
                      <div className="text-xs font-bold" style={{ color: "var(--gold)" }}>{skin.price} CLD</div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </div>
              )}

              <button onClick={openCase} disabled={spinning || user.balance < selectedCase.price}
                className="w-full py-4 rounded-xl font-black text-lg gold-btn flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {spinning ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                    Крутим...
                  </>
                ) : (
                  <>
                    <Icon name="Zap" size={22} />
                    Открыть за {selectedCase.price} CLD
                  </>
                )}
              </button>

              {user.balance < selectedCase.price && (
                <p className="text-center text-xs text-gray-500 mt-2">Недостаточно CLD. Пополните баланс.</p>
              )}
            </div>

            {/* Won skin */}
            {showResult && wonSkin && (
              <div className="mt-4 rounded-2xl p-6 text-center animate-scale-pop"
                style={{ background: `${wonSkin.rarity_color}10`, border: `2px solid ${wonSkin.rarity_color}50`, boxShadow: `0 0 40px ${wonSkin.rarity_color}25` }}
              >
                <div className="text-2xl font-black text-white mb-2">🎉 Вы выиграли!</div>
                <div className="flex justify-center mb-3">
                  <img src={wonSkin.image_url} alt={wonSkin.name} className="h-36 object-contain animate-float" />
                </div>
                <div className="text-lg font-black text-white mb-1">{wonSkin.name}</div>
                <div className="text-sm mb-1" style={{ color: wonSkin.rarity_color }}>{RARITY_LABELS[wonSkin.rarity] || wonSkin.rarity} • {wonSkin.exterior}</div>
                <div className="text-2xl font-black mb-4" style={{ color: "var(--gold)" }}>{wonSkin.price.toLocaleString()} CLD</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={openCase} disabled={spinning || user.balance < selectedCase.price}
                    className="px-6 py-2.5 rounded-xl font-bold gold-btn flex items-center gap-2 disabled:opacity-50"
                  >
                    <Icon name="RotateCcw" size={16} />
                    Ещё раз
                  </button>
                  <button className="px-6 py-2.5 rounded-xl font-bold text-sm"
                    style={{ background: "var(--surface2)", color: "white", border: "1px solid var(--border-color)" }}
                  >
                    В инвентарь
                  </button>
                </div>
              </div>
            )}

            {/* Skins in case */}
            {caseSkins.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-gray-300 mb-3 text-sm">Содержимое кейса:</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {caseSkins.map((s) => <SkinCard key={s.id} skin={s} size="sm" />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
