import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Mail,
  FileText,
  Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PortalSidebar } from '@/components/coaching/portal/PortalSidebar';
import { PortalTopBar } from '@/components/coaching/portal/PortalTopBar';
import { OverviewTab } from '@/components/coaching/portal/OverviewTab';
import { CoachProductsManager } from '@/components/coaching/portal/CoachProductsManager';
import { CoachPipelineCalendar } from '@/components/coaching/portal/CoachPipelineCalendar';
import { CoachRevenueDashboard } from '@/components/coaching/portal/CoachRevenueDashboard';
import { CoachProfileEditor } from '@/components/coaching/portal/CoachProfileEditor';
import { CoachUpcomingSessions } from '@/components/coaching/CoachUpcomingSessions';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function CoachDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // --- Data fetching (preserved from original) ---

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: coachProfile, isLoading: coachLoading } = useQuery({
    queryKey: ['my-coach-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['coach-session-bookings', coachProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_bookings')
        .select('*')
        .eq('coach_id', coachProfile!.id)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!coachProfile,
  });

  const { data: stripeBookings } = useQuery({
    queryKey: ['coach-stripe-bookings', coachProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, product_id, client_id, status, amount_cents, currency, created_at')
        .eq('coach_id', coachProfile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!coachProfile,
  });

  const { data: availability } = useQuery({
    queryKey: ['my-availability', coachProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', coachProfile!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!coachProfile,
  });

  // --- Mutations (preserved from original) ---

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, booking }: { id: string; status: string; booking?: typeof bookings extends (infer T)[] | undefined ? T : never }) => {
      const { error } = await supabase
        .from('session_bookings')
        .update({ status })
        .eq('id', id)
        .eq('coach_id', coachProfile!.id);
      if (error) throw error;

      if (booking && (status === 'confirmed' || status === 'cancelled')) {
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              type: status === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
              coachId: coachProfile?.id,
              coachName: coachProfile?.display_name || 'Your Coach',
              coachEmail: user?.email,
              clientEmail: booking.client_email,
              clientName: booking.client_name,
              scheduledDate: format(parseISO(booking.scheduled_date), 'MMMM d, yyyy'),
              scheduledTime: booking.scheduled_time,
              duration: booking.duration_minutes,
              notes: booking.notes,
            },
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }
    },
    onSuccess: (_, { status }) => {
      const message = status === 'confirmed'
        ? 'Session confirmed and client notified.'
        : status === 'cancelled'
        ? 'Session declined and client notified.'
        : 'Booking status has been updated.';
      toast({ title: 'Status Updated', description: message });
      queryClient.invalidateQueries({ queryKey: ['coach-session-bookings'] });
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ dayOfWeek, isAvailable }: { dayOfWeek: number; isAvailable: boolean }) => {
      const existing = availability?.find(a => a.day_of_week === dayOfWeek);
      if (existing) {
        const { error } = await supabase
          .from('coach_availability')
          .update({ is_available: isAvailable })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coach_availability')
          .insert({
            coach_id: coachProfile!.id,
            day_of_week: dayOfWeek,
            start_time: '09:00',
            end_time: '17:00',
            is_available: isAvailable,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      toast({ title: 'Availability Updated' });
    },
  });

  // --- Sidebar navigation handler ---

  function handleNavigate(tab: string) {
    if (tab === 'profile') {
      setActiveTab('profile');
      return;
    }
    if (tab === 'visibility') { setActiveTab('revenue'); return; }
    if (tab === 'engagement') { setActiveTab('pipeline'); return; }
    if (tab === 'settings') { setActiveTab('settings'); return; }
    if (tab === 'messages') {
      toast({ title: 'Coming Soon', description: `${tab.charAt(0).toUpperCase() + tab.slice(1)} is under development.` });
      return;
    }
    setActiveTab(tab);
  }

  // --- Early returns for auth / loading / no profile ---

  if (!user) {
    navigate('/auth?redirect=/coach-dashboard', { replace: true });
    return null;
  }

  if (coachLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-60 bg-card border-r border-border p-6">
          <Skeleton className="h-6 w-28 mb-8" />
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-9 w-full mb-2" />)}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!coachProfile) {
    navigate('/apply', { replace: true });
    return null;
  }

  // --- Derived data ---

  const todayBookings = bookings?.filter(b => isToday(parseISO(b.scheduled_date)) && b.status !== 'cancelled') || [];
  const upcomingBookings = bookings?.filter(b => !isPast(parseISO(b.scheduled_date)) && b.status !== 'cancelled') || [];
  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];

  const fitScore = coachProfile.readiness_score ?? 89;

  // --- Render ---

  return (
    <div className="min-h-screen bg-background flex">
      <PortalSidebar activeTab={activeTab} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col min-w-0">
        <PortalTopBar
          displayName={coachProfile.display_name || 'Coach'}
          tier={coachProfile.tier}
          fitScore={fitScore}
          avatarUrl={coachProfile.avatar_url}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Upcoming sessions — sessions-backed list with Join buttons */}
          {activeTab === 'overview' && <CoachUpcomingSessions />}

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <OverviewTab
              coachProfile={coachProfile}
              pendingCount={pendingBookings.length}
              confirmedCount={confirmedBookings.length}
              stripeBookingsCount={stripeBookings?.length ?? 0}
            />
          )}

          {/* Pipeline tab (bookings + calendar) */}
          {(activeTab === 'pipeline' || activeTab === 'bookings') && (
            <CoachPipelineCalendar coachProfile={coachProfile} />
          )}

          {/* Revenue tab */}
          {activeTab === 'revenue' && (
            <CoachRevenueDashboard coachProfile={coachProfile} />
          )}

          {/* Availability tab */}
          {activeTab === 'availability' && (
            <AvailabilityContent
              availability={availability}
              toggleAvailability={toggleAvailability}
            />
          )}

          {/* Products tab */}
          {activeTab === 'products' && (
            <CoachProductsManager coachProfile={coachProfile} />
          )}

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <CoachProfileEditor coachProfile={coachProfile} />
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && user?.email && (
            <SettingsContent email={user.email} toast={toast} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ================================================================
   Bookings Content (extracted inline to keep main component lean)
   ================================================================ */

function BookingsContent({
  todayBookings,
  pendingBookings,
  upcomingBookings,
  bookingsLoading,
  updateStatus,
}: {
  todayBookings: any[];
  pendingBookings: any[];
  upcomingBookings: any[];
  bookingsLoading: boolean;
  updateStatus: any;
}) {
  return (
    <div className="space-y-8">
      {/* Sub-tabs for engagement */}
      <div className="flex items-center gap-2 mb-2">
        <SubTab href="bookings" label="Bookings" active />
        <SubTab href="availability" label="Availability" />
        <SubTab href="products" label="Products & Programs" icon={<Package className="h-3.5 w-3.5" />} />
      </div>

      {/* Today's Sessions */}
      {todayBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold text-white mb-4">Today's Sessions</h2>
          <div className="space-y-3">
            {todayBookings.map((booking) => (
              <Card key={booking.id} className="bg-card border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{booking.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.scheduled_time.slice(0, 5)} &middot; {booking.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20">{booking.status}</Badge>
                      {booking.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: booking.id, status: 'completed' })}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  {booking.notes && (
                    <div className="mt-4 p-3 bg-background rounded-lg text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 inline mr-2" />
                      {booking.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold text-white mb-4">Pending Requests</h2>
          <div className="space-y-3">
            {pendingBookings.map((booking) => (
              <Card key={booking.id} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{booking.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(booking.scheduled_date), 'MMM d, yyyy')} at {booking.scheduled_time.slice(0, 5)}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" /> {booking.client_email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-muted-foreground hover:text-white"
                        onClick={() => updateStatus.mutate({ id: booking.id, status: 'cancelled', booking })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: booking.id, status: 'confirmed', booking })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Upcoming */}
      <div>
        <h2 className="text-lg font-display font-semibold text-white mb-4">All Upcoming Sessions</h2>
        {bookingsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : upcomingBookings.length > 0 ? (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => (
              <Card key={booking.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-lg font-bold text-white">
                          {format(parseISO(booking.scheduled_date), 'd')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(booking.scheduled_date), 'MMM')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-white">{booking.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.scheduled_time.slice(0, 5)} &middot; {booking.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        booking.status === 'confirmed'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted/20 text-muted-foreground border-border'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No upcoming sessions</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Availability Content
   ================================================================ */

function AvailabilityContent({
  availability,
  toggleAvailability,
}: {
  availability: any[] | undefined;
  toggleAvailability: any;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <SubTab href="bookings" label="Bookings" />
        <SubTab href="availability" label="Availability" active />
        <SubTab href="products" label="Products & Programs" icon={<Package className="h-3.5 w-3.5" />} />
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display">Weekly Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const dayAvail = availability?.find(a => a.day_of_week === day.value);
              const isAvailable = dayAvail?.is_available ?? false;

              return (
                <div key={day.value} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-white">{day.label}</p>
                    {isAvailable && dayAvail && (
                      <p className="text-sm text-muted-foreground">
                        {dayAvail.start_time.slice(0, 5)} - {dayAvail.end_time.slice(0, 5)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`day-${day.value}`} className="text-sm text-muted-foreground">
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </Label>
                    <Switch
                      id={`day-${day.value}`}
                      checked={isAvailable}
                      onCheckedChange={(checked) =>
                        toggleAvailability.mutate({ dayOfWeek: day.value, isAvailable: checked })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================
   Sub-tab pill (for engagement section navigation)
   ================================================================ */

/* ================================================================
   Settings Content — Password Change with OTP verification
   ================================================================ */

const FUNCTIONS_BASE = "https://qbjuomsmnrclsjhdsjcz.supabase.co/functions/v1";

function SettingsContent({ email, toast }: { email: string; toast: any }) {
  const [step, setStep] = useState<'idle' | 'code' | 'newpass'>('idle');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);

  const callFn = async (name: string, body: Record<string, unknown>) => {
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Request failed");
    return data;
  };

  const handleSendCode = async () => {
    setLoading(true);
    try {
      await callFn("send-password-reset", { email });
      toast({ title: "Code sent!", description: `Check ${email} for your 6-digit code.` });
      setStep('code');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => setStep('newpass');

  const handleResetPassword = async () => {
    if (newPw.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Mismatch", description: "Passwords don't match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await callFn("verify-password-reset", { email, code, newPassword: newPw });
      toast({ title: "Password changed!", description: "Your new password is now active." });
      setStep('idle');
      setCode('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-white">Settings</h2>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'idle' && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                We'll send a verification code to <span className="text-white font-medium">{email}</span> to confirm it's you.
              </p>
              <Button onClick={handleSendCode} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? 'Sending...' : 'Send verification code'}
              </Button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {email}</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button onClick={handleVerifyCode} disabled={code.length < 6} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Verify code
              </Button>
            </div>
          )}

          {step === 'newpass' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400">Code verified. Set your new password.</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">New password</label>
                <input
                  type="password"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="At least 6 characters"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Confirm password</label>
                <input
                  type="password"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Re-enter your new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
              </div>
              <Button onClick={handleResetPassword} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? 'Resetting...' : 'Change password'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubTab({ href, label, active, icon }: { href: string; label: string; active?: boolean; icon?: React.ReactNode }) {
  // These are display-only; parent handles actual tab switching via sidebar
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-default ${
        active
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-muted-foreground bg-card border border-border'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
