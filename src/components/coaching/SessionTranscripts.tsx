import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface TranscriptRow {
  id: string;
  status: 'in_progress' | 'ready' | 'failed';
  duration_seconds: number | null;
  created_at: string;
  scheduled_at: string | null;
  with: string;
}

// Session transcripts for the signed-in user — coach or coachee. Read through
// the session-transcripts edge function, which checks the caller is in the
// session. Renders nothing until there is at least one transcript.
export function SessionTranscripts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke('session-transcripts', {
        body: { action: 'list' },
      });
      if (!active) return;
      if (!error && data?.transcripts) setRows(data.transcripts as TranscriptRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading || rows.length === 0) return null;

  const when = (r: TranscriptRow) =>
    format(parseISO(r.scheduled_at ?? r.created_at), "EEE d MMM yyyy 'at' h:mm a");

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Session transcripts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{r.with}</div>
                <div className="text-sm">{when(r)}</div>
                <div className="text-sm text-muted-foreground">
                  {r.status === 'ready'
                    ? r.duration_seconds
                      ? `${Math.max(1, Math.round(r.duration_seconds / 60))} min transcribed`
                      : 'Ready'
                    : r.status === 'in_progress'
                      ? 'Being prepared — usually a few minutes after the session ends'
                      : 'Transcription failed'}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={r.status !== 'ready'}
                onClick={() => navigate(`/transcripts/${r.id}`)}
              >
                Open
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
