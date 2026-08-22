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
      // rather than only a date and time

     
