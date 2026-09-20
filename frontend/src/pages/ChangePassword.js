import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { api, apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Card } from "../components/ui";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { setNeedsReset, needsReset } = useAuth();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (newPw !== confirm) return toast.error("Konfirmasi password tidak cocok");
    if (newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/\d/.test(newPw))
      return toast.error("Password minimal 8 karakter, kombinasi huruf & angka");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { old_password: oldPw, new_password: newPw });
      toast.success("Password berhasil diperbarui");
      setNeedsReset(false);
      navigate("/");
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md p-8">
        <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
          <KeyRound className="text-emerald-700" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-ink">Ganti Password</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          {needsReset ? "Untuk keamanan, ganti password sementara Anda sebelum melanjutkan." : "Perbarui password akun Anda."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Password Saat Ini" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} data-testid="old-password-input" required />
          <Input label="Password Baru" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="new-password-input" required />
          <Input label="Konfirmasi Password Baru" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="confirm-password-input" required />
          <Button type="submit" size="lg" className="w-full" disabled={loading} data-testid="change-password-submit">
            {loading ? "Menyimpan…" : "Simpan Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
