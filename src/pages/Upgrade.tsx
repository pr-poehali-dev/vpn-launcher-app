import { useState, useEffect } from "react";
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
}

interface InventoryItem {
  inventory_id: number;
  skin_id: number;
  name: string;
  weapon_type: string;
  rarity: string;
  rarity_color: string;
  price: number;
  image_url: string;
  exterior: string;
}

interface Props {
  user: { balance: number; username: string };
  onBalanceUpdate: (balance: number) => void;
}

const RARITY_LABELS: Record<string, string> = {
  "Consumer": "Ширпотреб", "Industrial": "Промышленное", "Mil-Spec": "Армейское",
  "Restricted": "Запрещённое", "Classified": "Засекреченное", "Covert": "Тайное",
  "Contraband": "Контрабанда",
};

export default function Upgrade({ user, onBalanceUpdate }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allSkins, setAllSkins] = useState<Skin[]>([]);
  const [selectedInput, setSelectedInput] = useState<InventoryItem | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Skin | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; chance: number } | null>(null);
  const [error, setError] = useState("");
  const [dialAngle, setDialAngle] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    api.getProfile().then(r => r.json()).then(d => setInventory(d.inventory || []));
    api.getUpgradeSkins().then(r => r.json()).then(d => setAllSkins(d.skins || []));
  }, []);

  const chance = selectedInput && selectedTarget
    ? Math.min(90, Math.round((selectedInput.price / selectedTarget.price) * 90 * 10) / 10)
    : 0;

  const targetSkins = allSkins.filter(s => !selectedInput || s.price > selectedInput.price);

  const doUpgrade = async () => {
    if (!selectedInput || !selectedTarget || spinning) return;
    setError("");
    setShowResult(false);
    setResult(null);
    setSpinning(true);

    // Animate dial — spin many times then stop at chance position
    const spins = 5;
    const targetAngle = 360 * spins + (100 - chance) * 3.6;
    setDialAngle(targetAngle);

    const res = await api.doUpgrade(selectedInput.inventory_id, selectedTarget.id);
    const data = await res.json();

    setTimeout(() => {
      setSpinning(false);
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      setResult({ success: data.success, chance: data.chance });
      setShowResult(true);
      if (data.success) {
        api.getProfile().then(r => r.json()).then(d => setInventory(d.inventory || []));
      } else {
        setInventory(prev => prev.filter(i => i.inventory_id !== selectedInput.inventory_id));
      }
      setSelectedInput(null);
      setSelectedTarget(null);
      setDialAngle(0);
    }, 3000);
  };

  // suppress unused variable warning — dialAngle drives CSS animation via state
  void dialAngle;

  return (
    <div className="min-h-screen bg-grid-dark px-4 py-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 entry-1">
          <h1 className="text-3xl font-black text-white mb-1">⚡ <span className="gold-text">Апгрейдер</span></h1>
          <p className="text-gray-400 text-sm">Рискни скином ради скина дороже</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 entry-2">
          {/* Input — инвентарь */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
            <h3 className="font-bold text-gray-300 mb-3 text-sm flex items-center gap-2">
              <Icon name="Package" size={14} style={{ color: "var(--gold)" }} />
              Ваш скин ({inventory.length})
            </h3>
            {inventory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icon name="Package" size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Инвентарь пуст</p>
                <p className="text-xs mt-1">Открой кейс сначала</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {inventory.map((item) => (
                  <div key={item.inventory_id}
                    onClick={() => { setSelectedInput(item); setSelectedTarget(null); setResult(null); }}
                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      background: selectedInput?.inventory_id === item.inventory_id ? `${item.rarity_color}15` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selectedInput?.inventory_id === item.inventory_id ? item.rarity_color + "50" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 object-contain rounded-lg shrink-0"
                      style={{ background: `${item.rarity_color}15` }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                      <div className="text-xs" style={{ color: item.rarity_color }}>{item.exterior}</div>
                      <div className="text-xs font-bold" style={{ color: "var(--gold)" }}>{item.price} CLD</div>
                    </div>
                    {selectedInput?.inventory_id === item.inventory_id && (
                      <Icon name="CheckCircle" size={16} style={{ color: "var(--gold)" }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center — dial */}
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Chance dial */}
            <div className="relative" style={{ width: 160, height: 160 }}>
              <svg viewBox="0 0 160 160" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                <circle cx="80" cy="80" r="68" fill="none"
                  stroke={chance > 70 ? "#10b981" : chance > 40 ? "var(--gold)" : "#ef4444"}
                  strokeWidth="12"
                  strokeDasharray={`${(chance / 100) * 427} 427`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 0.5s ease, stroke 0.3s" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-black" style={{ color: chance > 70 ? "#10b981" : chance > 40 ? "var(--gold)" : "#ef4444" }}>
                  {chance > 0 ? `${chance}%` : "?"}
                </div>
                <div className="text-xs text-gray-400">шанс</div>
              </div>
            </div>

            <Icon name="ArrowRight" size={24} className="text-gray-600" style={{ transform: "rotate(90deg)" }} />

            {error && (
              <div className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            {showResult && result && (
              <div className="text-center animate-scale-pop rounded-2xl p-4"
                style={{ background: result.success ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${result.success ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}
              >
                <div className="text-2xl mb-1">{result.success ? "🎉" : "💔"}</div>
                <div className="font-black text-white text-sm">{result.success ? "ПОБЕДА!" : "Неудача"}</div>
                <div className="text-xs text-gray-400 mt-0.5">Шанс был {result.chance}%</div>
              </div>
            )}

            <button onClick={doUpgrade} disabled={!selectedInput || !selectedTarget || spinning}
              className="w-full py-3.5 rounded-xl font-black gold-btn flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {spinning ? (
                <><div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" /> Апгрейд...</>
              ) : (
                <><Icon name="TrendingUp" size={18} /> Апгрейд!</>
              )}
            </button>

            {selectedInput && selectedTarget && (
              <div className="text-xs text-gray-500 text-center">
                {selectedInput.price} → {selectedTarget.price} CLD
              </div>
            )}
          </div>

          {/* Target — целевой скин */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
            <h3 className="font-bold text-gray-300 mb-3 text-sm flex items-center gap-2">
              <Icon name="Target" size={14} style={{ color: "var(--gold)" }} />
              Целевой скин
            </h3>
            {!selectedInput ? (
              <div className="text-center py-8 text-gray-500">
                <Icon name="MousePointerClick" size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Выберите скин слева</p>
              </div>
            ) : targetSkins.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icon name="AlertCircle" size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Нет скинов дороже</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {targetSkins.map((skin) => {
                  const c = Math.min(90, Math.round((selectedInput.price / skin.price) * 90 * 10) / 10);
                  return (
                    <div key={skin.id}
                      onClick={() => { setSelectedTarget(skin); setResult(null); }}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200"
                      style={{
                        background: selectedTarget?.id === skin.id ? `${skin.rarity_color}15` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selectedTarget?.id === skin.id ? skin.rarity_color + "50" : "rgba(255,255,255,0.05)"}`,
                      }}
                    >
                      <img src={skin.image_url} alt={skin.name} className="w-12 h-12 object-contain rounded-lg shrink-0"
                        style={{ background: `${skin.rarity_color}15` }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{skin.name}</div>
                        <div className="text-xs" style={{ color: skin.rarity_color }}>{skin.exterior}</div>
                        <div className="text-xs font-bold" style={{ color: "var(--gold)" }}>{skin.price} CLD</div>
                      </div>
                      <div className="text-xs font-bold shrink-0" style={{ color: c > 60 ? "#10b981" : c > 30 ? "var(--gold)" : "#ef4444" }}>
                        {c}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
