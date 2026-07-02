import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getSession, rpc } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  LogOut, Loader2, Clock, CheckCircle2, Eye, EyeOff, KeyRound, PlusCircle,
  Radio, Youtube, PencilLine, Users, Video, ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/Brand";
import { openMeet } from "@/lib/meet";


type Sched = {
  id: string; scheduled_at: string; status: "scheduled" | "active" | "completed";
  students_allowed: boolean; meet_link: string | null; youtube_url: string | null;
};
type State = {
  batch: {
    id: number; name: string; course_name: string; hide_schedule: boolean;
    student_username: string; student_password: string;
    admin_username: string; admin_password: string;
  };
  schedules: Sched[];
};

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function toLocalInput(d?: string) {
  const dt = d ? new Date(d) : new Date(Date.now() + 3600_000);
  const off = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const s = getSession()!;
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  // dialogs
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmGive, setConfirmGive] = useState<Sched | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<Sched | null>(null);
  const [showCreds, setShowCreds] = useState(false);

  // forms
  const [courseName, setCourseName] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [ytForId, setYtForId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState(toLocalInput());
  const [editTime, setEditTime] = useState<{ id: string; value: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const st = await rpc<State>("jc_admin_get_state", { _u: s.username, _p: s.password });
      setState(st);
      setCourseName((c) => c || st.batch.course_name);
    } catch (e: any) { toast.error(e.message); }
  }, [s.username, s.password]);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const nextSched = useMemo(() =>
    state?.schedules.filter(x => x.status === "scheduled").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0], [state]);
  const activeSched = useMemo(() => state?.schedules.find(x => x.status === "active"), [state]);
  const completedSched = useMemo(() =>
    state?.schedules.filter(x => x.status === "completed").sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0], [state]);

  function logout() { clearSession(); nav("/", { replace: true }); }

  async function withBusy(fn: () => Promise<any>, ok?: string) {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function saveCourse() {
    await withBusy(() => rpc("jc_admin_set_course", { _u: s.username, _p: s.password, _course: courseName }), "Course name saved");
  }
  async function addSchedule() {
    if (!newTime) return;
    await withBusy(() => rpc("jc_admin_add_schedule", { _u: s.username, _p: s.password, _when: new Date(newTime).toISOString() }), "Schedule added");
  }
  async function saveEdit() {
    if (!editTime) return;
    const val = editTime.value;
    await withBusy(() => rpc("jc_admin_edit_schedule", { _u: s.username, _p: s.password, _sid: editTime.id, _when: new Date(val).toISOString() }), "Schedule updated");
    setEditTime(null);
  }
  async function joinNow(sc: Sched) {
    setBusy(true);
    try {
      const r: any = await rpc("jc_admin_join_now", { _u: s.username, _p: s.password, _sid: sc.id });
      await load();
      const link = r.meet_link || sc.meet_link;
      if (link) openMeet(link, { asHost: true, displayName: `Instructor · ${state?.batch.name ?? ""}` });
      else toast.error("Meeting link is not available yet.");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  function reopenMeet(sc: Sched) {
    if (sc.meet_link) openMeet(sc.meet_link, { asHost: true, displayName: `Instructor · ${state?.batch.name ?? ""}` });
  }
  async function giveAccess(sc: Sched) {
    setConfirmGive(null);
    await withBusy(() => rpc("jc_admin_give_access", { _u: s.username, _p: s.password, _sid: sc.id }),
      "Students can now join the live class");
  }
  async function complete(sc: Sched) {
    setConfirmComplete(null);
    await withBusy(() => rpc("jc_admin_complete_session", { _u: s.username, _p: s.password, _sid: sc.id }),
      "Session marked complete — students can no longer join");
  }
  async function saveYoutube() {
    if (!ytForId) return;
    await withBusy(() => rpc("jc_admin_set_youtube", { _u: s.username, _p: s.password, _sid: ytForId, _url: ytUrl }), "Recording link saved");
    setYtForId(null); setYtUrl("");
  }
  async function toggleHide() {
    await withBusy(() => rpc("jc_admin_toggle_hide", { _u: s.username, _p: s.password }));
  }
  async function resetStudent() {
    setConfirmReset(false);
    await withBusy(async () => {
      const r: any = await rpc("jc_admin_reset_student", { _u: s.username, _p: s.password });
      toast.success(`New student login: ${r.student_username} / ${r.student_password}`, { duration: 12000 });
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf7f2] via-[#f3ede2] to-[#e6f4f1] text-slate-900">
      <header className="border-b border-teal-900/10 backdrop-blur bg-white/70 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-teal-700 font-medium">Jeevani Connect · Admin</div>
              <div className="font-serif text-lg text-slate-900">{state?.batch?.name ?? s.batch_name}</div>
            </div>
          </div>

          <Button variant="ghost" onClick={logout} className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
            <LogOut className="w-4 h-4 mr-2" />Sign out
          </Button>
        </div>
      </header>

      {!state ? (
        <div className="p-10 text-slate-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
      ) : joined && joined.meet_link ? (
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
          <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-2 rounded-3xl">
            <div className="h-[75vh]">
              <JitsiEmbed
                meetLink={joined.meet_link}
                displayName={`Instructor · ${state.batch.name}`}
                onLeft={() => setJoined(null)}
              />
            </div>
          </Card>
          <aside className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-5 rounded-2xl space-y-3">
              <div className="text-xs uppercase tracking-widest text-slate-500">Live controls</div>
              <p className="text-xs text-slate-600">Tip: join 10–15 minutes before your scheduled start so audio, video, and screen-sharing are ready when students arrive.</p>
              {!joined.students_allowed ? (
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white" onClick={() => setConfirmGive(joined)} disabled={busy}>
                  <Users className="w-4 h-4 mr-2" />Give access to students
                </Button>
              ) : (
                <div className="text-sm text-emerald-600 flex items-center gap-2"><Radio className="w-4 h-4" />Students can join</div>
              )}
              <Button variant="destructive" className="w-full" onClick={() => setConfirmComplete(joined)} disabled={busy}>
                <CheckCircle2 className="w-4 h-4 mr-2" />Mark session complete
              </Button>
              <div className="pt-2 border-t border-teal-900/10 space-y-2">
                <Label className="text-xs text-slate-600">YouTube recording URL (optional)</Label>
                <Input value={ytForId === joined.id ? ytUrl : (joined.youtube_url || "")}
                  onFocus={() => { setYtForId(joined.id); setYtUrl(joined.youtube_url || ""); }}
                  onChange={(e) => setYtUrl(e.target.value)}
                  className="bg-slate-50 border-teal-900/10 text-slate-900" placeholder="https://youtube.com/watch?v=…" />
                <Button size="sm" variant="secondary" onClick={saveYoutube} disabled={busy || ytForId !== joined.id}>
                  <Youtube className="w-4 h-4 mr-2" />Save link
                </Button>
              </div>
            </Card>
          </aside>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Main column */}
          <div className="space-y-6">
            {/* Course */}
            <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-6 rounded-3xl">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Course name</div>
              <div className="flex gap-2">
                <Input value={courseName} onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Cognitive Behavioural Therapy — Module 3"
                  className="bg-slate-50 border-teal-900/10 text-slate-900" />
                <Button onClick={saveCourse} disabled={busy}><PencilLine className="w-4 h-4 mr-2" />Save</Button>
              </div>
            </Card>

            {/* Active session */}
            {activeSched && (
              <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-900/10 p-6 rounded-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 text-xs uppercase tracking-widest"><Radio className="w-3 h-3" />Live now</div>
                    <div className="mt-1 text-xl font-semibold">{fmt(activeSched.scheduled_at)}</div>
                    <div className="text-xs text-slate-600 mt-1">Students {activeSched.students_allowed ? "have access" : "waiting for access"}</div>
                  </div>
                  <Button size="lg" className="bg-gradient-to-r from-teal-700 to-emerald-500"
                    onClick={() => joinNow(activeSched)}>
                    <Video className="w-4 h-4 mr-2" />Rejoin
                  </Button>
                </div>
              </Card>
            )}

            {/* Next / add */}
            <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-slate-500">Schedule</div>
                <div className="text-xs text-slate-500">Tip: join 10–15 min early</div>
              </div>
              {nextSched ? (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <div>
                    <div className="text-xs text-slate-500">Next class</div>
                    <div className="text-lg font-medium">{fmt(nextSched.scheduled_at)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditTime({ id: nextSched.id, value: toLocalInput(nextSched.scheduled_at) })}>Edit</Button>
                    <Button size="sm" onClick={() => joinNow(nextSched)} disabled={busy}
                      className="bg-gradient-to-r from-teal-700 to-emerald-500">
                      <Video className="w-4 h-4 mr-1" />Join now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">No upcoming session. Add one below.</div>
              )}
              <div className="flex gap-2 pt-2 border-t border-teal-900/10">
                <Input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                  className="bg-slate-50 border-teal-900/10 text-slate-900" />
                <Button onClick={addSchedule} disabled={busy}><PlusCircle className="w-4 h-4 mr-2" />Add schedule</Button>
              </div>
            </Card>

            {/* Completed / recording */}
            {completedSched && (
              <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-6 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Last completed</div>
                    <div className="font-medium">{fmt(completedSched.scheduled_at)}</div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex gap-2 pt-2 border-t border-teal-900/10">
                  <Input placeholder="YouTube recording URL (optional)"
                    value={ytForId === completedSched.id ? ytUrl : (completedSched.youtube_url || "")}
                    onFocus={() => { setYtForId(completedSched.id); setYtUrl(completedSched.youtube_url || ""); }}
                    onChange={(e) => setYtUrl(e.target.value)}
                    className="bg-slate-50 border-teal-900/10 text-slate-900" />
                  <Button onClick={saveYoutube} disabled={busy || ytForId !== completedSched.id}>
                    <Youtube className="w-4 h-4 mr-2" />Save
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-slate-500">Class time card</div>
                <Button variant="ghost" size="sm" onClick={toggleHide} className="text-slate-600 hover:text-slate-900">
                  {state.batch.hide_schedule ? <><Eye className="w-4 h-4 mr-2" />Unhide</> : <><EyeOff className="w-4 h-4 mr-2" />Hide</>}
                </Button>
              </div>
              {!state.batch.hide_schedule && (
                <>
                  {activeSched && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                      <div className="text-xs text-emerald-600 flex items-center gap-1"><Radio className="w-3 h-3" />Live</div>
                      <div className="text-sm mt-0.5">{fmt(activeSched.scheduled_at)}</div>
                    </div>
                  )}
                  {nextSched && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Next</div>
                      <div className="text-sm mt-0.5">{fmt(nextSched.scheduled_at)}</div>
                    </div>
                  )}
                  {!activeSched && !nextSched && <div className="text-xs text-slate-500">No sessions.</div>}
                </>
              )}
            </Card>

            <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-slate-500">Student credentials</div>
                <Button variant="ghost" size="sm" onClick={() => setShowCreds((v) => !v)} className="text-slate-600">
                  {showCreds ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <div className="text-sm space-y-1">
                <div><span className="text-slate-500">Username: </span><span className="font-mono">{state.batch.student_username}</span></div>
                <div><span className="text-slate-500">Password: </span><span className="font-mono">{showCreds ? state.batch.student_password : "••••••••"}</span></div>
              </div>
              <Button variant="destructive" size="sm" className="w-full" onClick={() => setConfirmReset(true)} disabled={busy}>
                <KeyRound className="w-4 h-4 mr-2" />Reset student login
              </Button>
              <p className="text-xs text-slate-400">Resetting deactivates the current student credentials for this batch immediately.</p>
            </Card>
          </aside>
        </main>
      )}

      {/* Confirm reset */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this batch's student login?</AlertDialogTitle>
            <AlertDialogDescription>
              A new username and password will be generated. The current credentials will stop working immediately — students using them will be signed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetStudent}>Reset now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm give access */}
      <AlertDialog open={!!confirmGive} onOpenChange={(o) => !o && setConfirmGive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open the room to students?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm this only after you've joined the meeting as moderator. Once confirmed, students in this batch will be able to enter the live class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmGive && giveAccess(confirmGive)}>Yes, give access</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm complete */}
      <AlertDialog open={!!confirmComplete} onOpenChange={(o) => !o && setConfirmComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this live session?</AlertDialogTitle>
            <AlertDialogDescription>
              Marking the session complete will immediately remove student access. They'll see a "session complete" screen and won't be able to rejoin this class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmComplete && complete(confirmComplete)}>End session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit schedule dialog */}
      <AlertDialog open={!!editTime} onOpenChange={(o) => !o && setEditTime(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit schedule</AlertDialogTitle>
            <AlertDialogDescription>Choose a new date and time for this session.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input type="datetime-local" value={editTime?.value || ""}
            onChange={(e) => setEditTime((et) => et && ({ ...et, value: e.target.value }))} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveEdit}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
