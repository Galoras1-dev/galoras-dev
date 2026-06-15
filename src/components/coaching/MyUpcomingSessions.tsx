import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Video } from 'lucide-react';

interface MySession {
  id: string;
  booking_id: string;
  coach_id: string;
  scheduled_at: string | null;
  status: string;
  duration_minutes: number;
}

export function MyUpcomingSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (active) setLoading(false);
          return;
        }
        // Sessions are read via an edge function (never directly) so the host
        // room URL is never exposed to the coachee.
        const { data, error } = await supabase.functions.invoke('list-my-sessions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (active) {
          if (!error && data?.sessions) setSessions(data.sessions as MySession[]);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep the coachee dashboard clean: render nothing until there's at least one
  // scheduled session to show.
  if (loading || sessions.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Your scheduled sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {s.scheduled_at
                    ? format(parseISO(s.scheduled_at), "EEE d MMM yyyy 'at' h:mm a")
                    : 'Time to be set'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {s.duration_minutes} min
                </div>
              </div>
              <Button size="sm" onClick={() => navigate(`/session/${s.booking_id}`)}>
                <Video className="h-4 w-4 mr-2" />
                Join
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
