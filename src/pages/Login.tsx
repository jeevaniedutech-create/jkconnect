import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!u.trim() || !p) return;
    setBusy(true);
    try {
      const s = await login(u.trim(), p);
      toast.success(`Welcome, ${s.batch_name}`);
      nav(s.role === "admin" ? "/admin" : "/student", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[oklch(0.14_0.05_270)] via-[oklch(0.18_0.08_285)] to-[oklch(0.13_0.06_260)] p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[oklch(0.65_0.22_290)] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-[oklch(0.6_0.2_220)] blur-3xl" />
      </div>

      <Card className="relative z-10 w-full max-w-md p-8 md:p-10 bg-[oklch(0.16_0.03_270/0.7)] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.7_0.2_290)] to-[oklch(0.6_0.2_220)] flex items-center justify-center shadow-lg shadow-[oklch(0.6_0.2_260/0.4)] mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Jeevani Connect</h1>
          <p className="text-sm text-white/60 mt-1">Premium live learning · Jeevani Institute of Mind Care</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="u" className="text-white/80">Username</Label>
            <Input id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p" className="text-white/80">Password</Label>
            <Input id="p" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11" />
          </div>
          <Button type="submit" disabled={busy}
            className="w-full h-11 bg-gradient-to-r from-[oklch(0.7_0.2_290)] to-[oklch(0.6_0.2_220)] hover:opacity-90 text-white font-medium shadow-lg shadow-[oklch(0.6_0.2_260/0.3)]">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</> : "Sign in"}
          </Button>
        </form>
        <p className="text-xs text-white/40 text-center mt-6">
          Students & administrators sign in from this single page.
        </p>
      </Card>
    </div>
  );
}
