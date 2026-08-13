import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { Logo, BRAND } from "@/components/Brand";
import { formatRun, loadLastRun, runSmartSwitch } from "@/lib/switch";

type Status = "ready" | "processing" | "success" | "failed";

export default function SmartSwitch() {
  const [status, setStatus] = useState<Status>("ready");
  const [rows, setRows] = useState<number | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    loadLastRun().then(setLastRun);
  }, []);

  async function run() {
    setStatus("processing");
    try {
      const r = await runSmartSwitch();
      setRows(r.rows_processed);
      setLastRun(r.last_run);
      setStatus("success");
    } catch {
      setStatus("failed");
    }
  }

  const statusLabel =
    status === "processing" ? "Processing" : status === "success" ? "Run Successful" : status === "failed" ? "Failed" : "Ready";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#faf7f2] via-[#f3ede2] to-[#e6f4f1] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 bg-white/85 backdrop-blur-2xl border border-teal-900/10 shadow-[0_30px_80px_-30px_rgba(13,148,136,0.25)] rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <Logo className="h-10 w-auto" />
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-medium">{BRAND}</div>
            <h1 className="text-3xl font-serif text-slate-900 mt-2">Smart Switch</h1>
          </div>

          <Button
            onClick={run}
            disabled={status === "processing"}
            className="w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-500 hover:from-teal-800 hover:to-emerald-600 text-white shadow-lg shadow-teal-500/25"
          >
            {status === "processing" ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing…</>
            ) : (
              <><Zap className="w-5 h-5 mr-2" />RUN SMART SWITCH</>
            )}
          </Button>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span
                className={
                  status === "success"
                    ? "text-emerald-600 font-medium"
                    : status === "failed"
                    ? "text-rose-600 font-medium"
                    : "text-slate-700 font-medium"
                }
              >
                {statusLabel}
              </span>
            </div>

            {status === "success" && (
              <>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Run Successful
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Rows Processed</span>
                  <span className="text-slate-900 font-semibold tabular-nums">
                    {(rows ?? 0).toLocaleString("en-US")}
                  </span>
                </div>
              </>
            )}

            {status === "failed" && (
              <div className="flex items-center gap-2 text-rose-600 font-medium">
                <XCircle className="w-4 h-4" /> Run Failed
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Last Run</span>
              <span className="text-slate-900 font-medium tabular-nums">{formatRun(lastRun)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Runs a routine maintenance pass on the platform. No client information is accessed or displayed.
          </p>
        </div>
      </Card>
    </div>
  );
}
