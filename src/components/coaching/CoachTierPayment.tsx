/**
 * CoachTierPayment — Stripe SetupIntent card form.
 * Authorises the card without charging. After success calls confirm-coach-registration.
 */
import { useState, useCallback, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Lock, XCircle, Mail } from "lucide-react";
import { LegalConsentCheckboxes } from "@/components/legal/LegalConsentCheckboxes";
import { recordAgreements } from "@/lib/legal";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const TIER_LABELS: Record<string, { name: string; price: string }> = {
  pro: { name: "Pro", price: "$49/month" },
  elite: { name: "Elite", price: "$99/month" },
  master: { name: "Master",price: "$197/month" },
};

// ── Inner form (needs Stripe context) ────────────────────────────────────────
function SetupForm({
  tier,
  setupIntentId,
  onSuccess,
  onCancel,
}: {
  tier: string;
  setupIntentId: string;
  onSuccess: (link: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentValid, setConsentValid] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const handleConsentChange = useCallback((valid: boolean, marketing: boolean) => {
    setConsentValid(valid);
    setMarketingOptIn(marketing);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);

    // Confirm the SetupIntent — saves card, no charge
    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/coaching/onboarding` },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card setup failed. Please try again.");
      setSaving(false);
      return;
    }

    // Tell backend to finalise registration + send email
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : "";

      const { data, error: fnError } = await supabase.functions.invoke(
        "confirm-coach-registration",
        {
          body: { setupIntentId },
          headers: { Authorization: authHeader },
        }
      );

      if (fnError || !data?.success) {
        throw new Error(data?.error ?? fnError?.message ?? "Confirmation failed");
      }

      // Record legal agreements
      const types: import("@/lib/legal").AgreementType[] = [
        "terms_of_service", "privacy_policy", "payments_refunds",
        "cooling_off_waiver", "coach_agreement",
      ];
      if (marketingOptIn) types.push("marketing_opt_in");
      await recordAgreements({ context: "coach_tier_payment", agreementTypes: types, marketingOptIn });

      onSuccess(data.registrationLink ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tier_info = TIER_LABELS[tier] ?? { name: tier, price: "" };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tier summary */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wide">
            {tier_info.name} tier
          </p>
          <p className="text-white font-bold">{tier_info.price}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <Lock className="h-3 w-3" />
          Not charged yet
        </div>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <p className="text-xs text-zinc-500 flex items-center gap-1.5">
        <Lock className="h-3 w-3" />
        Your card will only be charged after Galoras approves your application.
      </p>

      <div className="border-t border-zinc-700 pt-4">
        <LegalConsentCheckboxes
          context="coach_tier_payment"
          onChange={handleConsentChange}
          variant="dark"
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 border-zinc-700 text-zinc-300"
          onClick={onCancel} disabled={saving}>
          Back
        </Button>
        <Button type="submit" disabled={!stripe || saving || !consentValid}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</> : "Authorise & Apply"}
        </Button>
      </div>
    </form>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────
function SuccessState({ registrationLink }: { registrationLink: string }) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
      </div>
      <div>
        <h3 className="text-white font-bold text-lg">Application received!</h3>
        <p className="text-zinc-400 text-sm mt-1 max-w-xs mx-auto">
          Your card has been saved securely — you won't be charged until we approve your application.
        </p>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-left">
        <Mail className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-zinc-300">
          We've sent a confirmation email with a link to complete your coach profile.
        </p>
      </div>
      {registrationLink && (
        <a href={registrationLink}
          className="inline-block w-full text-center bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl py-2.5 text-sm transition-colors">
          Complete my profile now →
        </a>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export function CoachTierPayment({
  tier,
  onClose,
  onSuccess,
}: {
  tier: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrationLink, setRegistrationLink] = useState<string | null>(null);

  useEffect(() => {
    if (registrationLink) onSuccess?.();
  }, [registrationLink]);

  // Initialise SetupIntent on mount
  const initSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in first.");

      const { data, error: fnError } = await supabase.functions.invoke(
        "setup-coach-tier",
        {
          body: { tier },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (fnError || !data?.clientSecret) {
        throw new Error(data?.error ?? fnError?.message ?? "Could not initialise payment.");
      }

      setClientSecret(data.clientSecret);
      // Extract setupIntentId from clientSecret (format: seti_xxx_secret_yyy)
      setSetupIntentId(data.clientSecret.split("_secret_")[0]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSetup();
  }, [tier]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
        <div className="h-1 bg-gradient-to-r from-primary to-sky-400" />
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-4px)]">
          {registrationLink ? (
            <SuccessState registrationLink={registrationLink} />
          ) : loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Preparing secure payment form…</span>
            </div>
          ) : error ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-red-400 text-sm">{error}</p>
              <Button onClick={initSetup} variant="outline" className="border-zinc-700 text-zinc-300">
                Try again
              </Button>
            </div>
          ) : clientSecret ? (
            <>
              <h3 className="text-white font-bold text-lg mb-1">Secure card authorisation</h3>
              <p className="text-zinc-400 text-xs mb-5">
                We save your card details now and charge only after approval.
              </p>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#38bdf8",
                      borderRadius: "8px",
                      fontFamily: "Inter, sans-serif",
                    },
                  },
                }}
              >
                <SetupForm
                  tier={tier}
                  setupIntentId={setupIntentId!}
                  onSuccess={(link) => setRegistrationLink(link)}
                  onCancel={onClose}
                />
              </Elements>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
