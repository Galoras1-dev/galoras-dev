import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Mail, Lock, User as UserIcon, KeyRound, ArrowRight, CheckCircle2, Phone } from "lucide-react";

const FUNCTIONS_BASE = "https://qbjuomsmnrclsjhdsjcz.supabase.co/functions/v1";
const callFunction = async (name: string, body: Record<string, unknown>) => {
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
};
import { LegalConsentCheckboxes } from "@/components/legal/LegalConsentCheckboxes";
import { recordAgreements } from "@/lib/legal";

type SignupStep = "email" | "otp" | "complete";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectParam = searchParams.get("redirect") || "";
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<"login" | "signup" | "reset">(defaultTab as "login" | "signup");
  const [isLoading, setIsLoading] = useState(false);

  // Reset password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "code" | "newpass">("email");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStep, setLoginStep] = useState<"credentials" | "otp">("credentials");
  const [loginOtpCode, setLoginOtpCode] = useState("");

  // Signup multi-step state
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [signupEmail, setSignupEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");

  // Legal consent state
  const [consentValid, setConsentValid] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const handleConsentChange = useCallback((valid: boolean, marketing: boolean) => {
    setConsentValid(valid);
    setMarketingOptIn(marketing);
  }, []);

  // Redirect already-logged-in users
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/");
    });
  }, [navigate]);

  // ââ LOGIN STEP 1 â enter email + password, send custom OTP via Resend ââ
  const handleLoginCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Validate password first (don't complete sign-in yet)
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (pwError) throw pwError;

      // Password valid â sign out (we'll sign back in after OTP)
      await supabase.auth.signOut();

      // Send custom OTP via our edge function + Resend
      await callFunction("send-login-otp", { email: loginEmail });

      toast({ title: "Verification code sent!", description: `Check ${loginEmail} for your 6-digit code.` });
      setLoginStep("otp");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ââ LOGIN STEP 2 â verify custom OTP + sign in ââââââââââââââââââââââââ
  const handleLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await callFunction("verify-login-otp", {
        email: loginEmail, code: loginOtpCode, password: loginPassword,
      });

      // Set the session from the edge function response
      const { session } = result;
      if (session) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      const name = result.user?.user_metadata?.full_name || loginEmail.split("@")[0] || "there";
      toast({ title: `Welcome back, ${name}!` });

      // Resume incomplete onboarding if still in this browser session
      const uid = result.user?.id;
      if (uid) {
        try {
          const raw = sessionStorage.getItem(`galoras_coach_onboarding_${uid}`);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved.step > 1) {
              navigate("/coaching/onboarding");
              return;
            }
          }
        } catch { /* ignore */ }
      }
        // Role-aware landing: coach -> cockpit, member -> coachee home; ?redirect wins.
              let dest = "/dashboard";
              if (uid) {
                          const { data: prof } = await supabase
                            .from("profiles")
                            .select("user_type")
                            .eq("id", uid)
                            .maybeSingle();
                          if (prof?.user_type === "coach") dest = "/coach-dashboard";
              }
              navigate(redirectParam || dest);
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ââ SIGNUP STEP 1 â send OTP via custom Resend edge function ââââââââââââ
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Check for existing account before spending an OTP send
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", signupEmail.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        toast({
          title: "Account already exists",
          description: "This email is already registered. Please log in instead.",
          variant: "destructive",
        });
        setTab("login");
        setLoginEmail(signupEmail);
        setIsLoading(false);
        return;
      }

      await callFunction("send-signup-otp", { email: signupEmail });
      toast({ title: "Code sent!", description: `Check ${signupEmail} for your 6-digit code.` });
      setSignupStep("otp");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ââ SIGNUP STEP 2 â verify OTP via custom edge function âââââââââââââââ
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await callFunction("verify-signup-otp", { email: signupEmail, code: otpCode });
      toast({ title: "Email verified!", description: "Now complete your account setup." });
      setSignupStep("complete");
    } catch (err: any) {
      toast({ title: "Invalid code", description: "Please check the code and try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ââ SIGNUP STEP 3 â set name + password âââââââââââââââââââââââââââââââââââ
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // Complete signup via edge function â sets password and signs in
      const signupResult = await callFunction("complete-signup", {
        email: signupEmail, password, fullName, phone: phoneNumber ? `${countryCode}${phoneNumber.replace(/\D/g, "")}` : null,
      });

      // Set session from the response
      if (signupResult.session) {
        await supabase.auth.setSession({
          access_token: signupResult.session.access_token,
          refresh_token: signupResult.session.refresh_token,
        });
      }

      // Record legal agreements
      const types: import("@/lib/legal").AgreementType[] = ["terms_of_service", "privacy_policy"];
      if (marketingOptIn) types.push("marketing_opt_in");
      await recordAgreements({ context: "user_signup", agreementTypes: types, marketingOptIn, email: signupEmail });

      toast({ title: "Account created!", description: "Welcome to Galoras." });
      navigate(redirectParam ? `/onboarding?redirect=${encodeURIComponent(redirectParam)}` : "/onboarding");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ââ RESET PASSWORD STEP 1 â send code âââââââââââââââââââââââââââââââââââ
  const handleResetSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await callFunction("send-password-reset", { email: resetEmail });
      toast({ title: "Reset code sent!", description: `Check ${resetEmail} for your 6-digit code.` });
      setResetStep("code");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ââ RESET PASSWORD STEP 2 â verify code ââââââââââââââââââââââââââââââââ
  const handleResetVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStep("newpass");
  };

  // ââ RESET PASSWORD STEP 3 â set new password ââââââââââââââââââââââââââ
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please re-enter your new password.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await callFunction("verify-password-reset", { email: resetEmail, code: resetCode, newPassword });
      toast({ title: "Password reset!", description: "You can now log in with your new password." });
      setTab("login");
      setLoginEmail(resetEmail);
      setResetStep("email");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabels: Record<SignupStep, string> = {
    email: "Enter your email",
    otp: "Verify your email",
    complete: "Complete your account",
  };

  const stepIndex: Record<SignupStep, number> = { email: 0, otp: 1, complete: 2 };

  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-80px)] flex items-center overflow-hidden">
        <div className="container-wide relative z-10 py-12 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[calc(100vh-80px)]">

            {/* ââ Form side ââ */}
            <div className="order-2 lg:order-1 max-w-md mx-auto lg:mx-0 w-full">
              <div className="text-center lg:text-left mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
                  <Zap className="h-4 w-4" />
                  Welcome to Galoras
                </div>
                <h1 className="text-3xl font-display font-bold mb-2">
                  {tab === "reset"
                    ? resetStep === "email" ? "Reset your password" : resetStep === "code" ? "Enter reset code" : "Set new password"
                    : tab === "login"
                    ? loginStep === "otp" ? "Verify your identity" : "Welcome back"
                    : stepLabels[signupStep]}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {tab === "reset"
                    ? resetStep === "email"
                      ? "We'll send a code to verify it's you"
                      : resetStep === "code"
                      ? `Enter the 6-digit code we sent to ${resetEmail}`
                      : "Choose a new password for your account"
                    : tab === "login"
                    ? loginStep === "otp"
                      ? `Enter the 6-digit code we sent to ${loginEmail}`
                      : "Sign in to access your coaching dashboard"
                    : signupStep === "email"
                    ? "We'll send a verification code to confirm it's you"
                    : signupStep === "otp"
                    ? `Enter the 6-digit code we sent to ${signupEmail}`
                    : "Set your name and a secure password to finish"}
                </p>
              </div>

              {/* Tab toggle */}
              <div className="flex rounded-xl border border-border bg-muted/30 p-1 mb-6">
                {(["login", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setSignupStep("email"); setLoginStep("credentials"); setLoginOtpCode(""); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === t
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "login" ? "Log In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {/* ââ LOGIN STEP 1: email + password ââ */}
              {tab === "login" && loginStep === "credentials" && (
                <form onSubmit={handleLoginCredentials} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email" className="mb-1.5 block">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" type="email" required className="pl-10" placeholder="you@example.com"
                        value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="login-password" className="mb-1.5 block">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" type="password" required className="pl-10" placeholder="â¢â¢â¢â¢â¢â¢â¢â¢"
                        value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Log In"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    <button type="button" className="text-primary hover:underline" onClick={() => { setTab("reset"); setResetEmail(loginEmail); setResetStep("email"); }}>
                      Forgot your password?
                    </button>
                  </p>
                </form>
              )}

              {/* ââ LOGIN STEP 2: OTP verification ââ */}
              {tab === "login" && loginStep === "otp" && (
                <form onSubmit={handleLoginOtp} className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 mb-2">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-primary">Verification code sent to {loginEmail}</p>
                  </div>
                  <div>
                    <Label htmlFor="login-otp" className="mb-1.5 block">Verification code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        className="pl-10 tracking-widest text-lg font-mono text-center"
                        placeholder="000000"
                        value={loginOtpCode}
                        onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Didn't receive it?{" "}
                      <button type="button" className="text-primary hover:underline" onClick={() => { setLoginStep("credentials"); setLoginOtpCode(""); }}>
                        Try again
                      </button>
                    </p>
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading || loginOtpCode.length < 6}>
                    {isLoading ? "Verifying..." : <>Verify & sign in <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              )}

              {/* ââ SIGNUP STEP 1: email ââ */}
              {tab === "signup" && signupStep === "email" && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email" className="mb-1.5 block">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" required className="pl-10" placeholder="you@example.com"
                        value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Sending code..." : <>Send verification code <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              )}

              {/* ââ SIGNUP STEP 2: OTP ââ */}
              {tab === "signup" && signupStep === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <Label htmlFor="otp-code" className="mb-1.5 block">Verification code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        className="pl-10 tracking-widest text-lg font-mono text-center"
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Didn't receive it?{" "}
                      <button type="button" className="text-primary hover:underline" onClick={() => setSignupStep("email")}>
                        Try again
                      </button>
                    </p>
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading || otpCode.length < 6}>
                    {isLoading ? "Verifying..." : <>Verify email <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              )}

              {/* ââ SIGNUP STEP 3: complete ââ */}
              {tab === "signup" && signupStep === "complete" && (
                <form onSubmit={handleComplete} className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-400">{signupEmail} verified</p>
                  </div>
                  <div>
                    <Label htmlFor="full-name" className="mb-1.5 block">Full name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="full-name" type="text" required className="pl-10" placeholder="Jane Smith"
                        value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password" className="mb-1.5 block">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type="password" required className="pl-10" placeholder="At least 6 characters" minLength={6}
                        value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone" className="mb-1.5 block">Phone number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="flex gap-2">
                      <div className="relative shrink-0">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="h-10 pl-10 pr-2 rounded-md border border-input bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring w-[120px]"
                        >
                          <option value="+1">+1 CA/US</option>
                          <option value="+44">+44 UK</option>
                          <option value="+61">+61 AU</option>
                          <option value="+64">+64 NZ</option>
                          <option value="+353">+353 IE</option>
                          <option value="+91">+91 IN</option>
                          <option value="+86">+86 CN</option>
                          <option value="+81">+81 JP</option>
                          <option value="+82">+82 KR</option>
                          <option value="+65">+65 SG</option>
                          <option value="+852">+852 HK</option>
                          <option value="+971">+971 AE</option>
                          <option value="+49">+49 DE</option>
                          <option value="+33">+33 FR</option>
                          <option value="+39">+39 IT</option>
                          <option value="+34">+34 ES</option>
                          <option value="+31">+31 NL</option>
                          <option value="+46">+46 SE</option>
                          <option value="+47">+47 NO</option>
                          <option value="+55">+55 BR</option>
                          <option value="+52">+52 MX</option>
                          <option value="+27">+27 ZA</option>
                          <option value="+234">+234 NG</option>
                          <option value="+254">+254 KE</option>
                        </select>
                      </div>
                      <Input id="phone" type="tel" className="flex-1" placeholder="(555) 000-0000"
                        value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">For SMS verification â we'll text you a code to confirm.</p>
                  </div>
                  <LegalConsentCheckboxes context="user_signup" onChange={handleConsentChange} variant="light" />
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading || !consentValid}>
                    {isLoading ? "Creating account..." : "Create account & get started"}
                  </Button>
                </form>
              )}

              {/* ââ RESET PASSWORD STEP 1: enter email ââ */}
              {tab === "reset" && resetStep === "email" && (
                <form onSubmit={handleResetSendCode} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email" className="mb-1.5 block">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="reset-email" type="email" required className="pl-10" placeholder="you@example.com"
                        value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Sending code..." : <>Send reset code <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    <button type="button" className="text-primary hover:underline" onClick={() => setTab("login")}>
                      Back to login
                    </button>
                  </p>
                </form>
              )}

              {/* ââ RESET PASSWORD STEP 2: enter code ââ */}
              {tab === "reset" && resetStep === "code" && (
                <form onSubmit={handleResetVerifyCode} className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 mb-2">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-primary">Reset code sent to {resetEmail}</p>
                  </div>
                  <div>
                    <Label htmlFor="reset-code" className="mb-1.5 block">Verification code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="reset-code" type="text" inputMode="numeric" maxLength={6} required
                        className="pl-10 tracking-widest text-lg font-mono text-center" placeholder="000000"
                        value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={resetCode.length < 6}>
                    <>Verify code <ArrowRight className="ml-2 h-4 w-4" /></>
                  </Button>
                </form>
              )}

              {/* ââ RESET PASSWORD STEP 3: new password ââ */}
              {tab === "reset" && resetStep === "newpass" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-400">Code verified. Set your new password.</p>
                  </div>
                  <div>
                    <Label htmlFor="new-password" className="mb-1.5 block">New password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="new-password" type="password" required className="pl-10" placeholder="At least 6 characters" minLength={6}
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm-password" className="mb-1.5 block">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="confirm-password" type="password" required className="pl-10" placeholder="Re-enter your new password"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Resetting..." : "Reset password"}
                  </Button>
                </form>
              )}

              {/* Signup progress dots */}
              {tab === "signup" && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {(["email", "otp", "complete"] as SignupStep[]).map((s, i) => (
                    <div key={s} className={`rounded-full transition-all ${
                      stepIndex[signupStep] > i ? "w-2 h-2 bg-primary" :
                      signupStep === s ? "w-4 h-2 bg-primary" : "w-2 h-2 bg-zinc-700"
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* ââ Image side ââ */}
            <div className="order-1 lg:order-2 relative hidden lg:block">
              <div className="relative h-[600px] rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80')" }} />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-background/90" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <blockquote className="text-white">
                    <p className="text-lg font-medium mb-4 leading-relaxed">
                      "Galoras helped me unlock potential I didn't know I had. The coaching experience transformed both my career and personal growth."
                    </p>
                    <footer className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">SK</div>
                      <div>
                        <cite className="not-italic font-semibold text-white">Sarah Kim</cite>
                        <p className="text-white/80 text-sm">VP of Engineering, TechCorp</p>
                      </div>
                    </footer>
                  </blockquote>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </Layout>
  );
}
