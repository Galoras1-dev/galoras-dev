import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface Transcript {
  id: string;
  status: string;
  content: string | null;
  duration_seconds: number | null;
  created_at: string;
  scheduled_at: string | null;
}

export default function SessionTranscript() {
  const { transcriptId } = useParams<{ transcriptId: string }>();
  const navigate = useNavigate();
  const [t, setT] = useState<Transcript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: fnError } = await supabase.functions.invoke('session-transcripts', {
        body: { action: 'get', id: transcriptId },
      });
      if (!active) return;
      if (fnError || !data?.transcript) {
        setError(data?.error || 'This transcript is not available.');
      } else {
        setT(data.transcript as Transcript);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [transcriptId]);

  async function remove() {
    setDeleting(true);
    const { data, error: fnError } = await supabase.functions.invoke('session-transcripts', {
      body: { action: 'delete', id: transcriptId },
    });
    setDeleting(false);
    if (fnError || !data?.deleted) {
      setError(data?.error || 'Could not delete the transcript. Nothing was deleted.');
      setConfirming(false);
      return;
    }
    navigate(-1);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {loading ? (
        <p>Loading transcript…</p>
      ) : error && !t ? (
        <p>{error}</p>
      ) : t ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Session transcript ·{' '}
              {format(parseISO(t.scheduled_at ?? t.created_at), "EEE d MMM yyyy")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visible only to you, the other person in this session, and Galoras
              administrators. Either of you can delete it.
            </p>
          </CardHeader>
          <CardContent>
            {t.status !== 'ready' || !t.content ? (
              <p className="text-sm text-muted-foreground">
                This transcript is not ready yet.
              </p>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{t.content}</div>
            )}

            {error && <p className="text-sm text-destructive mt-4">{error}</p>}

            <div className="mt-8 border-t pt-4 flex items-center gap-3">
              {!confirming ? (
                <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete transcript
                </Button>
              ) : (
                <>
                  <span className="text-sm">
                    This permanently deletes it for both of you. It cannot be recovered.
                  </span>
                  <Button variant="destructive" size="sm" disabled={deleting} onClick={remove}>
                    {deleting ? 'Deleting…' : 'Delete permanently'}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={deleting} onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
