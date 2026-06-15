import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AddToCalendarDropdown } from '@/components/coaching/AddToCalendarDropdown';
import { MyUpcomingSessions } from '@/components/coaching/MyUpcomingSessions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  XCircle,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Linkedin,
  ArrowRight,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface Booking {
  id: string;
  coach_id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  coaches: {
    display_name: string | null;
    avatar_url: string | null;
    headline: string | null;
  } | null;
}

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: AlertCircle },
  confirmed: { label: 'Confirmed', variant: 'default', icon: CheckCircle },
  completed: { label: 'Completed', variant: 'outline', icon: CheckCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

const GOAL_OPTIONS = [
  "Leadership","Career","Performance","Mindset","Communication",
  "Transitions","Executive Presence","Team Management","Work-Life Balance",
  "Confidence","Strategy","Entrepreneurship",
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Auth + profile via shared hook
  const { user, profile, isLoading: authLoading } = useAuth();

  // Profile edit state
  const [editMode, setEditMode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    user_role: '',
    industry: '',
    linkedin_url: '',
    challenges: '',
    coaching_areas: [] as string[],
  });

  // Recommended coaches based on profile coaching_areas
  const { data: recommendedCoaches } = useQuery({
    queryKey: ['recommended-coaches', profile?.coaching_areas],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select('id, slug, display_name, avatar_url, headline, specialties')
        .eq('lifecycle_status', 'published');
      if (!data || !profile?.coaching_areas?.length) return [];
      const userAreas = profile.coaching_areas.map((a: string) => a.toLowerCase());
      return data
        .map((c: any) => ({
          ...c,
          score: (c.specialties || []).filter((s: string) => userAreas.includes(s.toLowerCase())).length,
        }))
        .filter((c: any) => c.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3);
    },
    enabled: !!profile?.coaching_areas?.length,
  });

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.full_name || undefined,
        user_role: profileForm.user_role || undefined,
        industry: profileForm.industry || undefined,
        linkedin_url: profileForm.linkedin_url || undefined,
        challenges: profileForm.challenges || undefined,
        coaching_areas: profileForm.coaching_areas,
        onboarding_complete: true,
      })
      .eq('id', user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated!' });
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['recommended-coaches'] });
    }
  };

  // Fetch bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_bookings')
        .select(`
          *,
          coaches (
            display_name,
            avatar_url,
            headline
          )
        `)
        .eq('client_id', user!.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });

  // Cancel booking mutation — enforces a 24-hour notice window
  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const booking = bookings?.find((b) => b.id === bookingId);
      if (booking) {
        const sessionStart = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
        const hoursUntilSession = (sessionStart.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilSession < 24) {
          throw new Error("Bookings cannot be cancelled less than 24 hours before the session.");
        }
      }
      const { error } = await supabase
        .from('session_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('client_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Booking Cancelled',
        description: 'Your session has been cancelled successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to view your bookings.
          </p>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  const upcomingBookings = bookings?.filter(b => {
    const bookingDate = parseISO(b.scheduled_date);
    return !isPast(bookingDate) || isToday(bookingDate);
  }).filter(b => b.status !== 'cancelled' && b.status !== 'completed') || [];

  const pastBookings = bookings?.filter(b => {
    const bookingDate = parseISO(b.scheduled_date);
    return isPast(bookingDate) && !isToday(bookingDate);
  }) || [];

  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled') || [];

  const renderBookingCard = (booking: Booking) => {
    const status = statusConfig[booking.status];
    const StatusIcon = status.icon;
    const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
    const bookingDate = parseISO(booking.scheduled_date);
    const isUpcoming = !isPast(bookingDate) || isToday(bookingDate);

    return (
      <Card key={booking.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {booking.coaches?.display_name || 'Coach'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {booking.coaches?.headline || 'Coaching Session'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(bookingDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.scheduled_time.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.duration_minutes} min</span>
                </div>
                <Badge variant={status.variant} className="w-fit">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              {booking.notes && (
                <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mt-0.5" />
                  <span className="line-clamp-2">{booking.notes}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              {isUpcoming && booking.status !== 'cancelled' && (
                <AddToCalendarDropdown
                  booking={{
                    scheduled_date: booking.scheduled_date,
                    scheduled_time: booking.scheduled_time,
                    duration_minutes: booking.duration_minutes,
                    coach_name: booking.coaches?.display_name || 'Coach',
                    notes: booking.notes || undefined,
                  }}
                />
              )}
              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelBooking.mutate(booking.id)}
                  disabled={cancelBooking.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'My Dashboard'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {profile?.user_role && profile?.industry
                ? `${profile.user_role} · ${profile.industry}`
                : 'Manage your coaching journey'}
            </p>
          </div>
          {!profile?.onboarding_complete && (
            <Button size="sm" onClick={() => navigate('/onboarding')} className="bg-primary text-primary-foreground">
              Complete profile <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Recommended coaches strip */}
        {recommendedCoaches && recommendedCoaches.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Recommended for you</h2>
              <Link to="/coaching" className="ml-auto text-xs text-primary hover:underline">
                See all →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {recommendedCoaches.map((coach: any) => (
                <Link
                  key={coach.id}
                  to={coach.slug ? `/coach/${coach.slug}` : `/coaching/${coach.id}`}
                  className="shrink-0 w-36 group"
                >
                  <div className="w-36 h-36 rounded-xl bg-muted overflow-hidden mb-2">
                    {coach.avatar_url ? (
                      <img src={coach.avatar_url} alt={coach.display_name} className="w-full h-full object-contain object-center" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                        {(coach.display_name || 'C').charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">{coach.display_name}</p>
                  {coach.headline && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{coach.headline}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        <MyUpcomingSessions />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map(renderBookingCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Upcoming Sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any upcoming coaching sessions scheduled.
                  </p>
                  <Button onClick={() => navigate('/coaching')}>
                    Find a Coach
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastBookings.length > 0 ? (
              <div className="space-y-4">
                {pastBookings.map(renderBookingCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Past Sessions</h3>
                  <p className="text-muted-foreground">
                    Your completed sessions will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cancelled">
            {cancelledBookings.length > 0 ? (
              <div className="space-y-4">
                {cancelledBookings.map(renderBookingCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Cancelled Sessions</h3>
                  <p className="text-muted-foreground">
                    Your cancelled sessions will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Profile tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">My Profile</CardTitle>
                {!editMode ? (
                  <Button size="sm" variant="outline" onClick={() => {
                    setProfileForm({
                      full_name: profile?.full_name || '',
                      user_role: profile?.user_role || '',
                      industry: profile?.industry || '',
                      linkedin_url: profile?.linkedin_url || '',
                      challenges: profile?.challenges || '',
                      coaching_areas: profile?.coaching_areas || [],
                    });
                    setEditMode(true);
                  }}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveProfile} disabled={savingProfile} className="bg-primary text-primary-foreground">
                      {savingProfile ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                {editMode ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1.5 block">Full name</Label>
                        <Input value={profileForm.full_name} onChange={(e) => setProfileForm(p => ({ ...p, full_name: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">Current role</Label>
                        <Input value={profileForm.user_role} onChange={(e) => setProfileForm(p => ({ ...p, user_role: e.target.value }))} placeholder="VP of Engineering, Founder..." />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">Industry</Label>
                        <Input value={profileForm.industry} onChange={(e) => setProfileForm(p => ({ ...p, industry: e.target.value }))} placeholder="Technology, Finance..." />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">LinkedIn URL</Label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" value={profileForm.linkedin_url} onChange={(e) => setProfileForm(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm mb-2 block">Coaching areas (select all that apply)</Label>
                      <div className="flex flex-wrap gap-2">
                        {GOAL_OPTIONS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setProfileForm(p => ({
                              ...p,
                              coaching_areas: p.coaching_areas.includes(g)
                                ? p.coaching_areas.filter(a => a !== g)
                                : [...p.coaching_areas, g],
                            }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              profileForm.coaching_areas.includes(g)
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-primary'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">What are you working on?</Label>
                      <Textarea
                        value={profileForm.challenges}
                        onChange={(e) => setProfileForm(p => ({ ...p, challenges: e.target.value }))}
                        placeholder="Describe the challenges or goals you're bringing to coaching..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Name</p>
                        <p className="font-medium">{profile?.full_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Role</p>
                        <p className="font-medium">{profile?.user_role || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Industry</p>
                        <p className="font-medium">{profile?.industry || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">LinkedIn</p>
                        {profile?.linkedin_url ? (
                          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <Linkedin className="h-3.5 w-3.5" /> View profile
                          </a>
                        ) : <p className="font-medium">—</p>}
                      </div>
                    </div>
                    {profile?.coaching_areas && profile.coaching_areas.length > 0 && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-2">Coaching areas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.coaching_areas.map((a: string) => (
                            <span key={a} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile?.challenges && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Working on</p>
                        <p className="text-sm leading-relaxed">{profile.challenges}</p>
                      </div>
                    )}
                    {!profile?.onboarding_complete && (
                      <div className="pt-2">
                        <Button size="sm" onClick={() => navigate('/onboarding')} className="bg-primary text-primary-foreground">
                          Complete profile setup <Sparkles className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
