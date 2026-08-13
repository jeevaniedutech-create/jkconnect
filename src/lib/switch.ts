import { supabase } from "./supabase";

const OP = { username: "jeevaniops418", password: "switch@2610" };

export async function loadLastRun(): Promise<string | null> {
  const { data, error } = await supabase.rpc("jc_switch_login", { _u: OP.username, _p: OP.password });
  if (error) return null;
  return (data as { last_run: string | null }).last_run;
}

export async function runSmartSwitch() {
  const { data, error } = await supabase.rpc("jc_smart_switch_run", { _u: OP.username, _p: OP.password });
  if (error) throw new Error(error.message);
  return data as { status: string; rows_processed: number; last_run: string };
}

export function formatRun(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
