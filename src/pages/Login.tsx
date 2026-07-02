import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo, BRAND, TAGLINE } from "@/components/Brand";

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
    <div className="min-h-screen w-full flex items-stretch bg-gradient-to-br from-[#faf7f2] via-[#f3ede2] to-[#e6f4f1] relative overflow-hidden">
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-orange-200/40 blur-3xl" />
      </div>

      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative z-10">
        <Logo className="h-12 w-auto" />
        <div className="max-w-lg">
          <h2 className="text-5xl xl:text-6xl font-serif tracking-tight text-slate-900 leading-[1.05]">
            Live learning, <span className="italic text-teal-700">crafted with care.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">{TAGLINE}</p>
          <div className="mt-10 flex items-center gap-3 text-sm text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Private classroom · Batch-only access · Encrypted sessions
          </div>
        </div>
        <div className="text-xs text-slate-400">© {new Date().getFullYear()} Jeevani Institute of Mind Care</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 relative z-10">
        <Card className="w-full max-w-md p-8 md:p-10 bg-white/80 backdrop-blur-2xl border border-teal-900/10 shadow-[0_30px_80px_-30px_rgba(13,148,136,0.25)] rounded-3xl">
          <div className="flex flex-col items-center text-center mb-8 lg:hidden">
            <Logo className="h-12 w-auto" />
          </div>
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-medium">{BRAND}</div>
            <h1 className="text-2xl md:text-3xl font-serif text-slate-900 mt-2">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to enter your live classroom.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="u" className="text-slate-700">Username</Label>
              <Input id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username"
                placeholder="e.g. jeevanistd657"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 focus-visible:ring-teal-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p" className="text-slate-700">Password</Label>
              <Input id="p" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password"
                placeholder="Enter your password"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 focus-visible:ring-teal-500" />
            </div>
            <Button type="submit" disabled={busy}
              className="group w-full h-11 bg-gradient-to-r from-teal-700 to-emerald-500 hover:from-teal-800 hover:to-emerald-600 text-white font-medium shadow-lg shadow-teal-500/25">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
                : <>Sign in <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" /></>}
            </Button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-6">
            Students & administrators sign in from this single page.
          </p>
        </Card>
      </div>
    </div>
  );
}
