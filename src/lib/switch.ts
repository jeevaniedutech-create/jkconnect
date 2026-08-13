import { supabase } from "./supabase";

const KEY = "jc-switch-v1";

export type SwitchSession = { username: string; password: string };

export function getSwitchSession(): SwitchSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SwitchSession) : null;
  } catch {
    return null;
  }
}

export function clearSwitchSession() {
  localStorage.removeItem(KEY);
}

export async function switchLogin(username: string, password: string) {
  const { data, error } = await supabase.rpc("jc_switch_login", { _u: username, _p: password });
  if (error) throw new Error("Invalid operator credentials");
  localStorage.setItem(KEY, JSON.stringify({ username, password }));
  return data as { ok: boolean; last_run: string | null };
}

export async function runSmartSwitch(s: SwitchSession) {
  const { data, error } = await supabase.rpc("jc_smart_switch_run", { _u: s.username, _p: s.password });
  if (error) throw new Error(error.message);
  return data as { status: string; rows_processed: number; last_run: string };
}

export function formatRun(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
