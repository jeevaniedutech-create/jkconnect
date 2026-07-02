import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getSession, rpc } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LogOut, Loader2, PlayCircle, Video, Clock, Sparkles, CalendarClock, ExternalLink } from "lucide-react";
import YouTubeProtected from "@/components/YouTubeProtected";
import { Logo } from "@/components/Brand";
import { openMeet } from "@/lib/meet";


type State = {
  batch: { id: number; name: string; course_name: string };
  active: { id: string; scheduled_at: string; students_allowed: boolean; meet_link: string | null } | null;
  next: { id: string; scheduled_at: string } | null;
  previous: { id: string; scheduled_at: string; youtube_url: string } | null;
};

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function StudentDashboard() {
  const nav = useNavigate();
  const s = getSession()!;
  const [state, setState] = useState<State | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [attended, setAttended] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState(false);

  const load = useCallback(async () => {
    try {
      const st = await rpc<State>("jc_student_get_state", { _u: s.username, _p: s.password });
      setState((prev) => {
        // If we had an active session going and it just ended, show completion.
        if ((prev?.active || attended || waiting) && !st.active && (attended || waiting)) {
          setJustCompleted(true);
          setAttended(false);
          setWaiting(false);
        }
        return st;
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [s.username, s.password, attended, waiting]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  function logout() { clearSession(); nav("/", { replace: true }); }

  function openClass() {
    if (!state?.active?.meet_link) return;
    openMeet(state.active.meet_link, { displayName: `Student · ${state.batch.name}` });
    setAttended(true);
    setWaiting(false);
    setJustCompleted(false);
  }

  function handleJoin() {
    setConfirmJoin(false);
    if (state?.active?.students_allowed && state.active.meet_link) {
      openClass();
    } else {
      setWaiting(true);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf7f2] via-[#f3ede2] to-[#e6f4f1] text-slate-900">
      <header className="border-b border-teal-900/10 backdrop-blur bg-white/70 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-teal-700 font-medium">Jeevani Connect</div>
              <div className="font-serif text-lg text-slate-900">{state?.batch?.name ?? s.batch_name} <span className="text-slate-400">·</span> <span className="text-slate-600 text-sm">{state?.batch?.course_name || "Course TBA"}</span></div>
            </div>
          </div>


          <Button variant="ghost" onClick={logout} className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
            <LogOut className="w-4 h-4 mr-2" />Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        {!state ? (
          <div className="flex items-center gap-2 text-slate-600"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
        ) : joined && state.active?.meet_link ? (
          <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-2 md:p-3 rounded-3xl">
            <div className="h-[70vh]">
              <JitsiEmbed
                meetLink={state.active.meet_link}
                displayName={`Student ${state.batch.name}`}
                onLeft={() => setJoined(false)}
              />
            </div>
          </Card>
        ) : waiting ? (
          <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-10 md:p-16 rounded-3xl text-center">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 rounded-full bg-teal-400 blur-xl opacity-60 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-700 to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-9 h-9 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold">Hang tight — your class is being prepared</h2>
            <p className="text-slate-600 mt-3 max-w-md mx-auto">
              Your instructor is setting up the live session. You'll be joined automatically the moment they open the room.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Waiting for instructor…
            </div>
          </Card>
        ) : justCompleted ? (
          <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-10 md:p-16 rounded-3xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold">Session complete — thanks for joining!</h2>
            <p className="text-slate-600 mt-3">Your instructor has ended the live class. Check back for the next scheduled session.</p>
            <Button className="mt-6" onClick={() => setJustCompleted(false)}>Continue</Button>
          </Card>
        ) : (
          <>
            {/* Next class */}
            <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-6 md:p-8 rounded-3xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Next live class</div>
                  {state.active ? (
                    <>
                      <div className="text-2xl md:text-3xl font-semibold">Live now</div>
                      <div className="text-slate-600 mt-1 flex items-center gap-2"><Clock className="w-4 h-4" />Started {fmt(state.active.scheduled_at)}</div>
                    </>
                  ) : state.next ? (
                    <>
                      <div className="text-2xl md:text-3xl font-semibold">{fmt(state.next.scheduled_at)}</div>
                      <div className="text-slate-600 mt-1">{state.batch.course_name || "Course details coming soon"}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl md:text-3xl font-semibold">Scheduling soon</div>
                      <div className="text-slate-600 mt-1">There are no sessions on the calendar just yet — please check back shortly.</div>
                    </>
                  )}
                </div>
                {(state.active || state.next) && (
                  <Button size="lg" onClick={() => setConfirmJoin(true)}
                    className="bg-gradient-to-r from-teal-700 to-emerald-500 text-white h-12 px-8 text-base shadow-lg">
                    <Video className="w-5 h-5 mr-2" /> Join now
                  </Button>
                )}
              </div>
            </Card>

            {/* Previous recording */}
            {state.previous?.youtube_url && (
              <Card className="bg-white/80 backdrop-blur-xl border-teal-900/10 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Previous session · Recording</div>
                    <div className="text-lg font-medium">Watch recorded — {fmt(state.previous.scheduled_at)}</div>
                  </div>
                  <CalendarClock className="w-6 h-6 text-slate-400" />
                </div>
                <YouTubeProtected url={state.previous.youtube_url} />
              </Card>
            )}
          </>
        )}
      </main>

      <AlertDialog open={confirmJoin} onOpenChange={setConfirmJoin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join the live class?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to enter the live classroom. If your instructor hasn't opened the room yet, you'll see a waiting screen and be joined automatically as soon as access is granted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleJoin}>Join</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
