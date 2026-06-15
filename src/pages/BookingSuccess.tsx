import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [when, setWhen] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Work out which booking just completed, without touching the checkout code.
  useEffect(() => {
    let active = true;
    (async () => {
      // 1) explicit ?bookingId=...
      const explicit = searchParams.get("bookingId");
      if (explicit) {
        if (active) { setBookingId(explicit); setResolving(false); }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setResolving(false); return; }

      // 2) Stripe appends ?payment_intent=... on its redirect — map it to a booking.
      const pi = searchParams.get("payment_intent");
      if (pi) {
        const { data } = await supabase
          .from("bookings")
          .select("id")
          .eq("stripe_payment_intent_id", pi)
          .eq("client_id", user.id)
          .maybeSingle();
        if (data?.id) {
          if (active) { setBookingId(data.id); setResolving(false); }
          return;
        }
      }

      // 3) Fallback: this user's most recent booking.
      const { data: recent } = await supabase
        .from("bookings")
        .select("id")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) { setBookingId(recent?.id ?? null); setResolving(false); }
    })();
    return () => { active = false; };
  }, [searchParams]);

  const schedule = async () => {
    if (!bookingId || !when) return;
    setStatus("saving");
    setMessage(null);
    try {
      const scheduledAt = new Date(when).toISOString();
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("schedule-session", {
        body: { bookingId, scheduledAt },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (error || !data?.ok) {
        setStatus("error");
        setMessage(data?.error ?? error?.message ?? "Could not schedule the session.");
        return;
      }
      setStatus("done");
      setMessage(`Scheduled for ${new Date(data.scheduledAt).toLocaleString()}.`);
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message ?? "Unexpected error.");
    }
  };

  return (
    <Layout>
      <section className="min-h-[60vh] flex items-center justify-center pt-28 pb-12">
        <div className="container-wide">
          <div className="max-w-md mx-auto text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-display font-bold mb-3">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground mb-8">
              Your coaching session has been booked and payment processed. Pick a
              time below to schedule it.
            </p>

            {/* TEMPORARY scheduling scaffold — to be replaced by the availability
                calendar. Proves the chain: paid booking -> schedule-session ->
                sessions row -> Join. */}
            <div className="rounded-lg border p-5 mb-8 text-left">
              <div className="flex items-center gap-2 mb-3 font-medium">
                <Calendar className="h-5 w-5" />
                Schedule your session
              </div>

              {resolving ? (
                <p className="text-sm text-muted-foreground">Finding your booking…</p>
              ) : !bookingId ? (
                <p className="text-sm text-red-600">
                  Couldn't identify your booking. Use "View My Bookings" below.
                </p>
              ) : status === "done" ? (
                <p className="text-sm text-green-600">{message}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <input
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm"
                  />
                  <Button onClick={schedule} disabled={!when || status === "saving"}>
                    {status === "saving" ? "Scheduling…" : "Schedule session"}
                  </Button>
                  {status === "error" && message && (
                    <p className="text-sm text-red-600">{message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/coaching">
                <Button variant="outline">Browse More Coaches</Button>
              </Link>
              <Link to="/dashboard">
                <Button>View My Bookings</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
