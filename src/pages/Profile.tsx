import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

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
  obtained_at: string;
  source: string;
}

interface Stats {
  cases_opened: number;
  total_spent: number;
  upgrades_total: number;
  upgrades_won: number;
  inventory_value: number;
  inventory_count: number;
}

interface Props {
  user: { id: number; username: string; email: string; balance: number };
  onBalanceUpdate: (b: number) => void;
  onLogout: () => void;
}

const RARITY_LABELS: Record<string, string> = {
  "Consumer": "Ширпотреб", "Industrial": "Промышленное", "Mil-Spec": "Армейское",
  "Restricted": "Запрещённое", "Classified": "Засекреченное", "Covert": "Тайное",
  "Contraband": "Контрабанда",
};

export default function Profile({ user, onBalanceUpdate, onLogout }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellLoading, setSellLoading] = useState<number | null>(null);

  const loadProfile = () => {
    api.getProfile().then(r => r.json()).then(d => {
      setInventory(d.inventory || []);
      setStats(d.stats || null);
      setLoading(false);
    });
  };

  useEffect(() => { loadProfile(); }, []);

  const sellSkin = async (invId: number) => {
    setSellLoading(invId);
    const res = await api.sellSkin(invId);
    const data = await res.json();
    if (res.ok) {
      onBalanceUpdate(data.new_balance);
      setInventory(prev => prev.filter(i => i.inventory_id !== invId));
    }
    setSellLoading(null);
  };

  const handleLogout = async () => {
    await api.logout();
    localStorage.removeItem("cld_token");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-grid-dark px-4 py-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 entry-1">
          <div>
            <h1 className="text-3xl font-black text-white">👤 <span className="gold-text">Профиль</span></h1>
            <p className="text-gray-400 text-sm mt-0.5">@{user.username}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <Icon name="LogOut" size={15} />
            Выйти
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 entry-2">
            {[
              { label: "Кейсов открыто", value: stats.cases_opened, icon: "Package", color: "#8847ff" },
              { label: "Апгрейдов", value: `${stats.upgrades_won}/${stats.upgrades_total}`, icon: "TrendingUp", color: "var(--gold)" },
              { label: "Скинов в инвентаре", value: stats.inventory_count, icon: "Archive", color: "#10b981" },
              { label: "Стоимость инвентаря", value: `${stats.inventory_value.toLocaleString()} CLD`, icon: "Wallet", color: "var(--gold)" },
              { label: "Потрачено", value: `${stats.total_spent.toLocaleString()} CLD`, icon: "ShoppingCart", color: "#ef4444" },
              { label: "Баланс", value: `${user.balance.toLocaleString()} CLD`, icon: "Coins", color: "#10b981" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                    <Icon name={s.icon as "Package"} size={14} style={{ color: s.color }} />
                  </div>
                  <span className="text-xs text-gray-400">{s.label}</span>
                </div>
                <div className="font-black text-white text-lg">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Inventory */}
        <div className="entry-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-300 text-sm">Инвентарь ({inventory.length})</h2>
            {stats && stats.inventory_value > 0 && (
              <span className="text-xs font-bold" style={{ color: "var(--gold)" }}>
                ≈ {stats.inventory_value.toLocaleString()} CLD
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--surface)" }} />)}
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
              <Icon name="Package" size={40} className="mx-auto mb-3 text-gray-600 opacity-40" />
              <p className="text-gray-400 font-semibold">Инвентарь пуст</p>
              <p className="text-gray-500 text-sm mt-1">Открой кейс, чтобы получить скин</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {inventory.map((item) => (
                <div key={item.inventory_id} className="rounded-2xl overflow-hidden skin-card group"
                  style={{ background: "var(--surface)", border: `1px solid ${item.rarity_color}25` }}
                >
                  <div className="p-3">
                    <div className="rounded-xl overflow-hidden mb-2 flex items-center justify-center h-24"
                      style={{ background: `${item.rarity_color}10` }}
                    >
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="text-xs font-semibold text-white truncate mb-0.5">{item.name}</div>
                    <div className="text-xs mb-1.5" style={{ color: item.rarity_color }}>
                      {RARITY_LABELS[item.rarity] || item.rarity}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm" style={{ color: "var(--gold)" }}>{item.price} CLD</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#6b7280" }}>
                        {item.source === "case" ? "📦" : "⚡"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => sellSkin(item.inventory_id)}
                    disabled={sellLoading === item.inventory_id}
                    className="w-full py-2 text-xs font-bold transition-all"
                    style={{ background: "rgba(245,166,35,0.08)", color: "var(--gold)", borderTop: "1px solid rgba(245,166,35,0.15)" }}
                  >
                    {sellLoading === item.inventory_id ? "..." : `Продать за ${item.price} CLD`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
