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
  scheduled_at: string | null;
  status: string;
  duration_minutes: number;
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
        .select('id, booking_id, scheduled_at, status, duration_minutes')
        .eq('status', 'scheduled')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (active) {
        if (!error && data) setSessions(data as UpcomingSession[]);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scheduled sessions yet. They'll appear here once a coachee books and
            picks a time.
          </p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
