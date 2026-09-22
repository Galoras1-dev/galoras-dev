import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Lock, User as UserIcon, KeyRound, ArrowRight,
  CheckCircle2, Linkedin, Briefcase, Award,
} from "lucide-react";

type Step = "info" | "otp" | "password";

const STEP_LABELS: Record<Step, string> = {
  info:     "Tell us about yourself",
  otp:      "Verify your email",
  password: "Set your password",
};

const STEP_INDEX: Record<Step, number> = { info: 0, otp: 1, password: 2 };

export default function CoachSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get("tier");
  const applicationId = searchParams.get("applicationId");

  // Seeded by /apply so nobody retypes what they just gave us. A refresh loses
  // it and the fields fall back to empty, which is exactly how this screen
  // behaved before — so there is no worse case than today.
  const location = useLocation();
  const prefill = (location.state as { prefill?: Record<string, string> } | null)?.prefill;
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("info");
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 fields
  const [fullName, setFullName] = useState(prefill?.fullName ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [currentRole, setCurrentRole] = useState(prefill?.currentRole ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(prefill?.linkedinUrl ?? "");

  // Step 2
  const [otpCode, setOtpCode] = useState("");

  // Step 3
  const [password, setPassword] = useState("");

  // Redirect if already logged in — go straight to onboarding
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/coaching/onboarding");
    });
  }, [navigate]);

  const FUNCTIONS_URL = "https://qbjuomsmnrclsjhdsjcz.supabase.co/functions/v1";

  const callEdgeFn = async (slug: string, body: object) => {
    const res = await fetch(`${FUNCTIONS_URL}/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  // ── STEP 1: send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Block duplicate accounts before spending an OTP send
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        toast({
          title: "Account already exists",
          description: "This email is already registered. Please log in to continue your onboarding.",
          variant: "destructive",
        });
        navigate("/login?redirect=/coaching/onboarding");
        setIsLoading(false);
        return;
      }

      await callEdgeFn("send-signup-otp", { email });
      toast({
        title: "Verification code sent",
        description: `Check ${email} for your 6-digit code.`,
      });
      setStep("otp");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── STEP 2: verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await callEdgeFn("verify-signup-otp", { email, code: otpCode });
      toast({ title: "Email verified!", description: "Now set a secure password." });
      setStep("password");
    } catch (err: any) {
      toast({
        title: "Invalid code",
        description: err.message || "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── STEP 3: set password + save profile ────────────────────────────────────
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { session, user } = await callEdgeFn("complete-signup", {
        email,
        password,
        fullName,
      });

      if (session) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      if (user) {
        await supabase.from("profiles").update({
          user_role: currentRole || null,
          linkedin_url: linkedinUrl || null,
          user_type: "coach",
        }).eq("id", user.id);

        // Link the application to this new account
        if (applicationId) {
          await supabase.from("coach_applications")
            .update({ user_id: user.id })
            .eq("id", applicationId);
        }
      }

      toast({
        title: "Account created!",
        description: "Now choose your coach tier and secure your spot.",
      });
      navigate("/coaching/onboarding");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const steps: Step[] = ["info", "otp", "password"];

  return (
    <Layout>
      <section className="min-h-screen bg-zinc-950 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <Award className="h-4 w-4" />
              Join the Galoras Coach Ecosystem
            </div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">
              {STEP_LABELS[step]}
            </h1>
            <p className="text-zinc-400 text-sm mt-2">
              {step === "info"    && "Basic details — we'll verify your email before creating your account."}
              {step === "otp"     && `Enter the 6-digit code we sent to ${email}`}
              {step === "password"&& "Set a secure password to complete your account."}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s} className={`rounded-full transition-all duration-300 ${
                STEP_INDEX[step] > i  ? "w-2 h-2 bg-primary" :
                step === s            ? "w-6 h-2 bg-primary" :
                                        "w-2 h-2 bg-zinc-700"
              }`} />
            ))}
          </div>

          {/* Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">

            {/* ── STEP 1: basic info + email ── */}
            {step === "info" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Full name *</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Smith" className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary" />
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Email address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@coaching.com" className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary" />
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Current role</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)}
                      placeholder="Executive Coach, VP of Operations…" className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary" />
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">
                    LinkedIn URL <span className="text-zinc-600 font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile" className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary" />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-2">
                  {isLoading ? "Sending code…" : <><span>Send verification code</span><ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Verification code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      type="text" inputMode="numeric" maxLength={6} required
                      value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary tracking-widest text-lg font-mono text-center"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">
                    Didn't receive it?{" "}
                    <button type="button" className="text-primary hover:underline" onClick={() => setStep("info")}>
                      Try again
                    </button>
                  </p>
                </div>
                <Button type="submit" disabled={isLoading || otpCode.length < 6}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {isLoading ? "Verifying…" : <><span>Verify email</span><ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            )}

            {/* ── STEP 3: password ── */}
            {step === "password" && (
              <form onSubmit={handleComplete} className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400">{email} verified</p>
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input required type="password" minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary" />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {isLoading ? "Creating account…" : "Create account & choose my tier"}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-zinc-600 text-xs mt-6">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary hover:underline">
              Log in
            </button>
          </p>

        </div>
      </section>
    </Layout>
  );
}
