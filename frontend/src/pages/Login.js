import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, Sparkles, Eye, Flag } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/ui";
import { apiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [kode, setKode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(kode.trim(), password);
      toast.success(`Selamat datang, ${data.user.nama}`);
      navigate(data.requires_password_reset ? "/change-password" : "/");
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail) || "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between gradient-emerald grid-pattern p-12 text-white relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="Logo" className="h-11 w-11 object-contain" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl">AO-360</div>
            <div className="text-emerald-100/90 text-sm">AO Achievement Dashboard</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-heading text-4xl font-extrabold leading-tight">Mengukur. Mengevaluasi. Meningkatkan.</h1>
          <p className="mt-4 text-emerald-50/90 text-lg">Platform monitoring pencapaian Account Officer PT BPRS Haji Miskin — pembiayaan, funding, dan recovery dalam satu dasbor.</p>
          <div className="mt-8 space-y-5">
            {[
              [Sparkles, "MOTTO", "HIDUP BERKAH, TANPA RIBA DENGAN SYARIAH"],
              [Eye, "VISI", "Menjadikan BPRS Haji Miskin Sebagai Panutan Bank Pembiayaan Rakyat Syariah di Sumatera Barat"],
              [Flag, "MISI", "Meningkatkan Peran Serta Usaha Kecil dan Menengah Dalam Pembangunan Ekonomi Rakyat Indonesia di Masa Depan"],
            ].map(([Icon, label, t], i) => (
              <div key={i} className="flex items-start gap-3 text-emerald-50/90" data-testid={`login-mvm-${label.toLowerCase()}`}>
                <div className="h-9 w-9 shrink-0 rounded-lg bg-white/15 flex items-center justify-center mt-0.5"><Icon size={18} /></div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gold-100">{label}</div>
                  <div className={`mt-0.5 ${label === "MOTTO" ? "text-sm font-bold tracking-wide" : "text-sm"}`}>{t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 mt-10 pt-6 border-t border-white/10 text-emerald-100/70 text-xs">© 2026 PT BPRS Haji Miskin · Direktur: Hendri Kamal</div>
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-emerald-700 flex items-center justify-center shadow">
              <img src="/logo.png" alt="Logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="font-heading font-extrabold text-xl text-ink">AO-360</div>
              <div className="text-slate-500 text-xs">PT BPRS Haji Miskin</div>
            </div>
          </div>
          <h2 className="font-heading text-2xl font-bold text-ink">Masuk ke Dasbor</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">Gunakan Kode Marketing dan password Anda.</p>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Kode Marketing" placeholder="mis. 002" value={kode} onChange={(e) => setKode(e.target.value)} data-testid="login-kode-input" required />
            <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" required />
            <Button type="submit" size="lg" className="w-full" disabled={loading} data-testid="login-submit-button">
              <LogIn size={18} /> {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400" data-testid="login-forgot-hint">Lupa password? Hubungi Admin</p>
        </div>
      </div>
    </div>
  );
}
