import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Transaction {
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
}

interface Props {
  user: { balance: number; username: string };
  onBalanceUpdate: (balance: number) => void;
}

export default function Balance({ user, onBalanceUpdate }: Props) {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    api.getBalance().then(r => r.json()).then(d => setTransactions(d.transactions || []));
  }, []);

  const QUICK_AMOUNTS = [100, 300, 500, 1000, 3000, 5000];

  const submit = async () => {
    setError(""); setSuccess("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Введите сумму"); return; }
    setLoading(true);
    try {
      if (tab === "deposit") {
        const res = await api.deposit(amt);
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        onBalanceUpdate(data.new_balance);
        setSuccess(`Баланс пополнен на ${amt} CLD`);
        setAmount("");
        api.getBalance().then(r => r.json()).then(d => setTransactions(d.transactions || []));
      } else {
        if (!paymentDetails) { setError("Укажите номер телефона для СБП"); return; }
        const res = await api.withdraw(amt, paymentDetails);
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        onBalanceUpdate(data.new_balance);
        setSuccess(`Заявка на вывод ${amt} CLD отправлена`);
        setAmount(""); setPaymentDetails("");
        api.getBalance().then(r => r.json()).then(d => setTransactions(d.transactions || []));
      }
    } finally {
      setLoading(false);
    }
  };

  const TX_ICONS: Record<string, string> = {
    deposit: "ArrowDownLeft", withdraw: "ArrowUpRight", sell: "Tag", case: "Package",
  };
  const TX_COLORS: Record<string, string> = {
    deposit: "#10b981", withdraw: "#ef4444", sell: "var(--gold)", case: "#8847ff",
  };

  return (
    <div className="min-h-screen bg-grid-dark px-4 py-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 entry-1">
          <h1 className="text-3xl font-black text-white mb-1">💳 <span className="gold-text">Баланс</span></h1>
          <p className="text-gray-400 text-sm">Пополнение и вывод средств</p>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl p-6 mb-5 relative overflow-hidden entry-2"
          style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.08) 0%, var(--surface) 100%)", border: "1px solid rgba(245,166,35,0.2)" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(245,166,35,0.06) 0%, transparent 70%)" }} />
          <div className="relative">
            <div className="text-sm text-gray-400 mb-1">Доступный баланс</div>
            <div className="text-4xl font-black gold-text mb-0.5">{user.balance.toLocaleString()}</div>
            <div className="text-gray-400 font-semibold">CLD = ₽</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-5 entry-3" style={{ background: "var(--surface)" }}>
          {(["deposit", "withdraw"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
              className="flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-200"
              style={{
                background: tab === t ? "linear-gradient(135deg, #f5a623, #c4841a)" : "transparent",
                color: tab === t ? "#0d1117" : "#6b7280",
              }}
            >
              {t === "deposit" ? "💳 Пополнить" : "📤 Вывести"}
            </button>
          ))}
        </div>

        <div className="rounded-2xl p-6 entry-4" style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}>
          {/* Quick amounts */}
          {tab === "deposit" && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {QUICK_AMOUNTS.map((a) => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className="py-2 rounded-xl text-sm font-bold transition-all duration-200"
                  style={{
                    background: amount === String(a) ? "rgba(245,166,35,0.15)" : "var(--bg)",
                    border: `1px solid ${amount === String(a) ? "rgba(245,166,35,0.5)" : "rgba(255,255,255,0.06)"}`,
                    color: amount === String(a) ? "var(--gold)" : "#9ca3af",
                  }}
                >
                  {a} CLD
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                {tab === "deposit" ? "Сумма пополнения (CLD = ₽)" : "Сумма вывода (CLD)"}
              </label>
              <div className="relative">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number"
                  placeholder={tab === "deposit" ? "Мин. 10 CLD" : "Мин. 100 CLD"}
                  className="w-full rounded-xl px-4 py-3 pr-16 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(245,166,35,0.4)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">CLD</span>
              </div>
            </div>

            {tab === "deposit" && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{ background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.1)", color: "#9ca3af" }}
              >
                <Icon name="Info" size={13} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
                Оплата через СБП. 1 CLD = 1 ₽. После нажатия откроется страница оплаты ЮКассы.
              </div>
            )}

            {tab === "withdraw" && (
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Номер телефона СБП</label>
                <input value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder="+7 900 000 00 00"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(245,166,35,0.4)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />
                <p className="text-xs text-gray-500 mt-1">Вывод обрабатывается в течение 24 часов. Мин. 100 CLD.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <Icon name="CheckCircle" size={13} />
                {success}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              className="w-full py-3.5 rounded-xl font-black gold-btn flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" /> : (
                <>
                  <Icon name={tab === "deposit" ? "CreditCard" : "Send"} size={18} />
                  {tab === "deposit" ? "Пополнить" : "Вывести"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div className="mt-5 entry-5">
            <h3 className="font-bold text-gray-300 mb-3 text-sm">История операций</h3>
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${TX_COLORS[tx.type] || "#6b7280"}18` }}
                  >
                    <Icon name={(TX_ICONS[tx.type] || "Circle") as "Tag"} size={16} style={{ color: TX_COLORS[tx.type] || "#6b7280" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{tx.description}</div>
                    <div className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString("ru")}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm" style={{ color: tx.type === "deposit" ? "#10b981" : tx.type === "withdraw" ? "#ef4444" : "var(--gold)" }}>
                      {tx.type === "deposit" ? "+" : "-"}{tx.amount} CLD
                    </div>
                    <div className="text-xs" style={{ color: tx.status === "completed" ? "#10b981" : tx.status === "pending" ? "var(--gold)" : "#6b7280" }}>
                      {tx.status === "completed" ? "Выполнено" : tx.status === "pending" ? "Ожидание" : tx.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
