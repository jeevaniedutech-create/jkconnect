import { supabase } from "./supabase";

const KEY = "jc-session-v1";

export type Session = {
  role: "admin" | "student";
  username: string;
  password: string;
  batch_id: number;
  batch_name: string;
  course_name: string;
};

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export async function login(username: string, password: string): Promise<Session> {
  const { data, error } = await supabase.rpc("jc_login", { _u: username, _p: password });
  if (error) throw new Error("Invalid username or password");
  const s: Session = {
    role: data.role,
    username,
    password,
    batch_id: data.batch_id,
    batch_name: data.batch_name,
    course_name: data.course_name,
  };
  setSession(s);
  return s;
}

export async function rpc<T = any>(fn: string, args: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
