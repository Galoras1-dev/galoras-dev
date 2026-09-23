import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Video } from 'lucide-react';

interface UpcomingSession {
  id: string;
  booking_id: string;
  client_id: string | null;
  scheduled_at: string | null;
  status: string;
  duration_minutes: number;
  client_name?: string;
}

export function CoachUpcomingSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      // RLS scopes this to the logged-in coach's own sessions, so no coach-id
      // filter is needed here.
      const { data, error } = await supabase
        .from('sessions')
        .select('id, booking_id, client_id, scheduled_at, status, duration_minutes')
        .eq('status', 'scheduled')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (!active) return;

      if (error || !data) {
        setLoading(false);
        return;
      }

      const rows = data as UpcomingSession[];

      // Look up the coachee's name so the coach can see who they are meeting,
      // rather than only a date and time.
      const clientIds = [
        ...new Set(rows.map((r) => r.client_id).filter(Boolean)),
      ] as string[];

      let names: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', clientIds);

        if (profiles) {
          names = Object.fromEntries(
            profiles.map((p: { id: string; full_name: string | null }) => [
              p.id,
              p.full_name ?? 'Coachee',
            ])
          );
        }
      }

      if (!active) return;

      setSessions(
        rows.map((r) => ({
          ...r,
          client_name: r.client_id ? names[r.client_id] ?? 'Coachee' : 'Coachee',
        }))
      );
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  // A session whose time has passed is not upcoming, whatever its status says.
  // Rows keep status 'scheduled' until something marks them complete, and
  // nothing currently does — so without this split, sessions from weeks ago sat
  // under "Upcoming" offering a Join button into a room that is long over.
  const now = Date.now();
  const startOf = (s: UpcomingSession) =>
    s.scheduled_at ? parseISO(s.scheduled_at).getTime() : null;

  const upcoming = sessions.filter((s) => {
    const t = startOf(s);
    return t === null || t >= now;
  });
  const earlier = sessions
    .filter((s) => {
      const t = startOf(s);
      return t !== null && t < now;
    })
    .reverse();

  // The room opens fifteen minutes before the start time. Earlier than that,
  // Join is shown but inert, so the button never lies about being ready.
  const JOIN_WINDOW_MS = 15 * 60 * 1000;
  const canJoin = (s: UpcomingSession) => {
    const t = startOf(s);
    return t !== null && now >= t - JOIN_WINDOW_MS;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : upcoming.length === 0 && earlier.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scheduled sessions yet. They'll appear here once a coachee books and
            picks a time.
          </p>
        ) : (
          <>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing coming up.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.client_name}</div>
                      <div className="text-sm">
                        {s.scheduled_at
                          ? format(parseISO(s.scheduled_at), "EEE d MMM yyyy 'at' h:mm a")
                          : 'Time to be set'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.duration_minutes} min
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!canJoin(s)}
                      title={canJoin(s) ? undefined : 'Opens 15 minutes before the start time'}
                      onClick={() => navigate(`/session/${s.booking_id}`)}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {earlier.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Earlier
                </p>
                <ul className="space-y-2">
                  {earlier.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-dashed p-3 opacity-70"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.client_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {s.scheduled_at
                            ? format(parseISO(s.scheduled_at), "EEE d MMM yyyy 'at' h:mm a")
                            : 'Time to be set'}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Date passed
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  These dates have passed and the sessions were never marked
                  complete.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
