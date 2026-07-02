import { useEffect, useState } from "react";
import { Logo, BRAND, TAGLINE } from "./Brand";

export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#faf7f2] via-[#f3ede2] to-[#e6f4f1] transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-teal-200/50 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-orange-200/40 blur-3xl" />
      </div>
      <div className="relative flex flex-col items-center text-center px-6 animate-[fadeUp_.9s_ease-out]">
        <Logo className="h-20 md:h-24 w-auto drop-shadow-sm" />
        <div className="mt-8 h-px w-24 bg-gradient-to-r from-transparent via-teal-600/40 to-transparent" />
        <h1 className="mt-6 text-3xl md:text-5xl font-serif tracking-tight text-slate-900">{BRAND}</h1>
        <p className="mt-3 max-w-md text-sm md:text-base text-slate-600 leading-relaxed">{TAGLINE}</p>
        <div className="mt-8 flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" />
        </div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
