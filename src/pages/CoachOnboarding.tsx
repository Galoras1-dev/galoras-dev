import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useTags } from "@/hooks/useTags";
import { useProductTypes } from "@/hooks/useProductTypes";
import { CoachTierPayment } from "@/components/coaching/CoachTierPayment";

const storageKey = (uid: string) => `galoras_coach_onboarding_${uid}`;

const TIER_OPTIONS = [
  { key: "pro" as const,    name: "Pro",    price: "$49/month",  desc: "Entry-level visibility. Get listed and start booking.",                                         comingSoon: false },
  { key: "elite" as const,  name: "Elite",  price: "$99/month",  desc: "Priority exposure, enhanced profile visibility, and exclusive platform access.", badge: "Most Popular", comingSoon: false },
  { key: "master" as const, name: "Master", price: "$197/month", desc: "Featured placement. Enterprise delivery. We back you.",                                        comingSoon: false },
];

// ── Tag pill component ────────────────────────────────────────────────────────
function TagPills({ family, selected, onChange, single = false }: {
  family: string; selected: string[]; onChange: (v: string[]) => void; single?: boolean;
}) {
  const { getTagsByFamily } = useTags();
  const items = getTagsByFamily(family);
  const toggle = (key: string) => {
    if (single) { onChange(selected[0] === key ? [] : [key]); return; }
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map(t => (
        <button key={t.tag_key} type="button" onClick={() => toggle(t.tag_key)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
            selected.includes(t.tag_key)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}>
          {t.tag_label}
        </button>
      ))}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PendingProduct {
  product_type: string;
  title: string;
  outcome_statement: string;
  price_type: "enquiry" | "fixed" | "range";
  price_cents: number | null;
  price_display: string;
  outcome_tags: string[];
  audience_tags: string[];
  format_tags: string[];
}

export default function CoachOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Desktop layout at 900px+ (wider than useIsMobile's 768px to account for split-screen)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 900px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const isMobile = !isDesktop;

  const token = (location.state as { token?: string } | null)?.token ?? null;

  const [state, setState] = useState<"loading" | "invalid" | "form" | "submitting" | "success">("loading");
  const [step, setStep] = useState(1);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const TOTAL_STEPS = token ? 5 : 6;

  // Step 1
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  // Step 2 — tag keys
  const [specialtyTags, setSpecialtyTags] = useState<string[]>([]);
  const [audienceTags, setAudienceTags] = useState<string[]>([]);
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [industryTags, setIndustryTags] = useState<string[]>([]);

  // Step 3
  const [availabilityTag, setAvailabilityTag] = useState<string[]>([]);
  const [enterpriseTags, setEnterpriseTags] = useState<string[]>([]);
  const [credentialTags, setCredentialTags] = useState<string[]>([]);

  // Step 4 — pending product
  const [pendingProduct, setPendingProduct] = useState<PendingProduct>({
    product_type: "",
    title: "",
    outcome_statement: "",
    price_type: "enquiry",
    price_cents: null,
    price_display: "",
    outcome_tags: [],
    audience_tags: [],
    format_tags: [],
  });

  const { types: productTypes } = useProductTypes();

  useEffect(() => {
    if (token) { validateToken(); return; }
    // No token — auth-based flow (new coach signup)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setState("invalid"); return; }
      setUserId(session.user.id);

      // Restore progress saved in this browser session
      const saved = (() => {
        try {
          const raw = sessionStorage.getItem(storageKey(session.user.id));
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (saved?.step > 1) {
        const fd = saved.formData ?? {};
        setFullName(fd.fullName ?? "");
        setBio(fd.bio ?? "");
        setCurrentRole(fd.currentRole ?? "");
        setLinkedinUrl(fd.linkedinUrl ?? "");
        setBookingUrl(fd.bookingUrl ?? "");
        setSpecialtyTags(fd.specialtyTags ?? []);
        setAudienceTags(fd.audienceTags ?? []);
        setStyleTags(fd.styleTags ?? []);
        setIndustryTags(fd.industryTags ?? []);
        setAvailabilityTag(fd.availabilityTag ?? []);
        setEnterpriseTags(fd.enterpriseTags ?? []);
        setCredentialTags(fd.credentialTags ?? []);
        if (fd.pendingProduct) setPendingProduct(fd.pendingProduct);
        setStep(saved.step);
        setState("form");
        return;
      }

      supabase.from("profiles")
        .select("full_name, user_role, linkedin_url")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name || "");
            setCurrentRole(data.user_role || "");
            setLinkedinUrl(data.linkedin_url || "");
          }
          setState("form");
        });
    });
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("validate-onboarding-token", { body: { token } });
      if (error || data?.error) { setState("invalid"); return; }
      const app = data.application;
      setFullName(app.full_name || "");
      setBio(app.bio || "");
      setLinkedinUrl(app.linkedin_url || "");
      setCurrentRole(app.current_role || "");
      setState("form");
    } catch {
      setState("invalid");
    }
  };

  // ── Validation per step ──────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    if (step === 1) {
      if (!fullName.trim()) {
        toast({ title: "Full name is required", variant: "destructive" }); return false;
      }
    }
    if (step === 2) {
      if (specialtyTags.length < 2) {
        toast({ title: "Select at least 2 specialty tags", variant: "destructive" }); return false;
      }
      if (audienceTags.length < 1) {
        toast({ title: "Select at least 1 audience tag", variant: "destructive" }); return false;
      }
    }
    if (step === 4) {
      if (!pendingProduct.product_type) {
        toast({ title: "Select a product type", variant: "destructive" }); return false;
      }
      if (!pendingProduct.title.trim()) {
        toast({ title: "Product title is required", variant: "destructive" }); return false;
      }
      if (pendingProduct.outcome_tags.length < 1) {
        toast({ title: "Select at least 1 outcome tag", variant: "destructive" }); return false;
      }
      if (pendingProduct.audience_tags.length < 1) {
        toast({ title: "Select at least 1 audience tag for the product", variant: "destructive" }); return false;
      }
      if (pendingProduct.format_tags.length < 1) {
        toast({ title: "Select at least 1 format tag", variant: "destructive" }); return false;
      }
    }
    return true;
  };

  const persistProgress = (nextStep: number) => {
    if (!userId) return;
    sessionStorage.setItem(storageKey(userId), JSON.stringify({
      step: nextStep,
      formData: {
        fullName, bio, currentRole, linkedinUrl, bookingUrl,
        specialtyTags, audienceTags, styleTags, industryTags,
        availabilityTag, enterpriseTags, credentialTags, pendingProduct,
      },
    }));
  };

  const handleNext = () => {
    if (!validateStep()) return;
    const next = step + 1;
    persistProgress(next);
    setStep(next);
  };

  const handleSubmit = async () => {
    setState("submitting");
    try {
      if (token) {
        // Legacy token-based flow (came via email link post-payment)
        const { data, error } = await supabase.functions.invoke("complete-onboarding", {
          body: {
            token,
            fullName: fullName.trim(), bio: bio.trim(),
            linkedinUrl: linkedinUrl.trim() || null,
            currentRole: currentRole.trim() || null,
            bookingUrl: bookingUrl.trim() || null,
            specialtyTags, audienceTags, styleTags, industryTags,
            availabilityTag: availabilityTag[0] || null,
            enterpriseTags, credentialTags, pendingProduct,
          },
        });
        if (error || data?.error) throw new Error(data?.error || "Failed to complete onboarding");
        setState("success");
        toast({ title: "Profile completed!", description: "Your coach profile has been saved successfully." });
      } else {
        // Auth-based flow — save directly, then advance to tier selection (Step 6)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { error: profileError } = await supabase.from("profiles").update({
          full_name: fullName.trim() || null,
          user_role: currentRole.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
        }).eq("id", session.user.id);

        if (profileError) {
          console.error("profiles.update failed:", profileError);
          throw new Error(`Could not save your profile: ${profileError.message}`);
        }

        // Upsert coach application with tag + product data
        const { data: existing, error: lookupError } = await supabase
          .from("coach_applications").select("id").eq("user_id", session.user.id).maybeSingle();

        if (lookupError) {
          console.error("coach_applications lookup failed:", lookupError);
          throw new Error(`Could not read your application: ${lookupError.message}`);
        }

        const appData = {
          user_id: session.user.id,
          email: session.user.email!,
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          current_role: currentRole.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          booking_url: bookingUrl.trim() || null,
          specialty_tags: specialtyTags,
          audience_tags: audienceTags,
          style_tags: styleTags,
          industry_tags: industryTags,
          availability_tag: availabilityTag[0] || null,
          enterprise_tags: enterpriseTags,
          credential_tags: credentialTags,
          pending_product: pendingProduct,
          onboarding_status: "completed",
          status: "pending",
        };

        // .select() forces the row back so we can prove the write landed.
        // If RLS silently filters the write, saved comes back empty — treat as failure.
        const { data: saved, error: writeError } = existing
          ? await supabase.from("coach_applications").update(appData).eq("id", existing.id).select()
          : await supabase.from("coach_applications").insert(appData).select();

        if (writeError) {
          console.error("coach_applications write failed:", writeError);
          throw new Error(`Could not save your coach profile: ${writeError.message}`);
        }

        if (!saved || saved.length === 0) {
          console.error("coach_applications write returned no rows — likely blocked by RLS", { existing });
          throw new Error("Your profile could not be saved. Please contact support.");
        }

        console.log("coach_applications saved:", saved[0]);

        persistProgress(6);
        toast({ title: "Profile saved!", description: "Now choose your coach tier." });
        setState("form");
        setStep(6);
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      setState("form");
      toast({ title: "Submission failed", description: err.message || "Please try again.", variant: "destructive" });
    }
  };

  // ── Loading / error / success states ────────────────────────────────────────
  if (state === "loading") {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Validating your invitation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (state === "invalid") {
    return (
      <Layout>
        <section className="py-16">
          <div className="container-wide max-w-md mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold mb-2">Invalid or Expired Link</h1>
                    <p className="text-muted-foreground">This onboarding link is no longer valid.</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/")}>Return to Home</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </Layout>
    );
  }

  if (state === "success") {
    return (
      <Layout>
        <section className="py-16">
          <div className="container-wide max-w-md mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold mb-2">Welcome to Galoras!</h1>
                    <p className="text-muted-foreground">Your coach profile has been completed. You can now sign in to access your dashboard.</p>
                  </div>
                  <Button onClick={() => navigate("/login")}>Sign In</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </Layout>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  const pp = pendingProduct;
  const setPP = (patch: Partial<PendingProduct>) => setPendingProduct(prev => ({ ...prev, ...patch }));

  const stepTitles = token
    ? ["Coach Identity", "Positioning", "Commercial Readiness", "Your First Product", "Review & Submit"]
    : ["Coach Identity", "Positioning", "Commercial Readiness", "Your First Product", "Review & Save", "Choose Your Tier"];

  const stepDescriptions = [
    "Tell us who you are and how to find you.",
    "Define your niche, audience, and coaching style.",
    "Set your availability, credentials, and enterprise capability.",
    "Add your first coaching product or programme.",
    "Review your profile before saving.",
    "Pick the tier that fits where you are right now.",
  ];

  return (
    <Layout>
      <section className="min-h-screen bg-zinc-950 py-12 px-4">
        <div className={`mx-auto ${isMobile ? "max-w-lg" : "max-w-6xl"}`}>

          {/* Page header */}
          <div className="mb-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Coach Onboarding</p>
            <h1 className={`font-display font-black text-white uppercase tracking-tight ${isMobile ? "text-2xl" : "text-4xl"}`}>
              Complete Your Coach Profile
            </h1>
          </div>

          <div className={`flex gap-8 items-start ${isMobile ? "flex-col" : "flex-row"}`}>

            {/* ── Left sidebar: vertical stepper (desktop only) ── */}
            {!isMobile && (
              <aside className="flex flex-col gap-1 w-64 shrink-0 sticky top-24">
                {stepTitles.map((title, i) => {
                  const n = i + 1;
                  const done = n < step;
                  const active = n === step;
                  return (
                    <div key={n} className="flex items-start gap-3 px-3 py-3 rounded-xl transition-colors">
                      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                        done    ? "bg-primary text-primary-foreground" :
                        active  ? "bg-primary/20 border-2 border-primary text-primary" :
                                  "bg-zinc-800 text-zinc-500"
                      }`}>
                        {done ? <CheckCircle className="h-4 w-4" /> : n}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold leading-tight ${active ? "text-white" : done ? "text-zinc-400" : "text-zinc-600"}`}>
                          {title}
                        </p>
                        {active && (
                          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{stepDescriptions[i]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </aside>
            )}

            {/* ── Right: form card ── */}
            <div className="flex-1 min-w-0 w-full">
              {/* Mobile: compact progress bar + step label */}
              {isMobile && (
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-zinc-500 mb-2">
                    <span className="font-medium text-white">{stepTitles[step - 1]}</span>
                    <span>Step {step} of {TOTAL_STEPS}</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
                      <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-zinc-800"}`} />
                    ))}
                  </div>
                </div>
              )}

              <Card className="bg-zinc-900 border-zinc-700 shadow-2xl">
                <CardHeader className="pb-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
                        Step {step} of {TOTAL_STEPS}
                      </p>
                      <CardTitle className="text-2xl text-white">{stepTitles[step - 1]}</CardTitle>
                      <CardDescription className="text-zinc-400 mt-1 text-sm">
                        {stepDescriptions[step - 1]}
                      </CardDescription>
                    </div>
                    {/* Desktop progress dots */}
                    {!isMobile && (
                      <div className="flex gap-1.5 shrink-0">
                        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
                          <div key={n} className={`rounded-full transition-all ${
                            n < step  ? "w-2 h-2 bg-primary" :
                            n === step? "w-5 h-2 bg-primary" :
                                        "w-2 h-2 bg-zinc-700"
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">

                  {/* ── Step 1 ── */}
                  {step === 1 && (
                    <>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-5`}>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Full Name *</Label>
                          <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)}
                            placeholder="Your full name" required
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Current Role</Label>
                          <Input id="currentRole" value={currentRole} onChange={e => setCurrentRole(e.target.value)}
                            placeholder="e.g. Executive Coach"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300 text-sm font-medium">Bio / Positioning Statement</Label>
                        <Textarea id="bio" rows={5} value={bio} onChange={e => setBio(e.target.value)}
                          placeholder="Describe your coaching approach, background, and what makes you unique..."
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-base focus-visible:ring-primary resize-none" />
                      </div>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-5`}>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">LinkedIn URL</Label>
                          <Input id="linkedinUrl" type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                            placeholder="https://linkedin.com/in/yourprofile"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">
                            Booking URL <span className="text-zinc-600 font-normal">(optional)</span>
                          </Label>
                          <Input id="bookingUrl" type="url" value={bookingUrl} onChange={e => setBookingUrl(e.target.value)}
                            placeholder="https://calendly.com/yourname"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Step 2 ── */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-zinc-300 text-sm font-medium">
                          Specialty Tags <span className="text-zinc-500 font-normal">(select at least 2)</span>
                        </Label>
                        <TagPills family="specialty" selected={specialtyTags} onChange={setSpecialtyTags} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300 text-sm font-medium">
                          Audience Tags <span className="text-zinc-500 font-normal">(select at least 1)</span>
                        </Label>
                        <TagPills family="audience" selected={audienceTags} onChange={setAudienceTags} />
                      </div>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-6`}>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Coaching Style</Label>
                          <TagPills family="style" selected={styleTags} onChange={setStyleTags} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Industry Focus</Label>
                          <TagPills family="industry" selected={industryTags} onChange={setIndustryTags} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Step 3 ── */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-zinc-300 text-sm font-medium">Availability</Label>
                        <TagPills family="availability" selected={availabilityTag} onChange={setAvailabilityTag} single />
                      </div>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-6`}>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Enterprise Capability</Label>
                          <TagPills family="enterprise" selected={enterpriseTags} onChange={setEnterpriseTags} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Credentials & Certifications</Label>
                          <TagPills family="credential" selected={credentialTags} onChange={setCredentialTags} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Step 4 ── */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-5`}>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Product Type *</Label>
                          <Select value={pp.product_type} onValueChange={v => setPP({ product_type: v })}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-11 text-base focus:ring-primary">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              {productTypes.map(t => <SelectItem key={t.slug} value={t.slug} className="text-white">{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">Title *</Label>
                          <Input id="prodTitle" value={pp.title} onChange={e => setPP({ title: e.target.value })}
                            placeholder="e.g. 90-day Leadership Intensive"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-300 text-sm font-medium">Outcome Statement</Label>
                        <Textarea id="outcomeStatement" rows={3} value={pp.outcome_statement}
                          onChange={e => setPP({ outcome_statement: e.target.value })}
                          placeholder="What will the client achieve?"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-base focus-visible:ring-primary resize-none" />
                      </div>
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-5`}>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">
                            Outcome Tags <span className="text-zinc-500 font-normal">(min 1)</span>
                          </Label>
                          <TagPills family="outcome" selected={pp.outcome_tags} onChange={v => setPP({ outcome_tags: v })} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">
                            Audience Tags <span className="text-zinc-500 font-normal">(min 1)</span>
                          </Label>
                          <TagPills family="audience" selected={pp.audience_tags} onChange={v => setPP({ audience_tags: v })} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-sm font-medium">
                            Format Tags <span className="text-zinc-500 font-normal">(min 1)</span>
                          </Label>
                          <TagPills family="format" selected={pp.format_tags} onChange={v => setPP({ format_tags: v })} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-zinc-300 text-sm font-medium">Price Type</Label>
                        <div className="flex gap-3">
                          {(["enquiry", "fixed", "range"] as const).map(pt => (
                            <button key={pt} type="button"
                              onClick={() => setPP({ price_type: pt, price_cents: null, price_display: "" })}
                              className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-colors ${
                                pp.price_type === pt
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-zinc-600 text-zinc-400 hover:border-primary/50 hover:text-white"
                              }`}>
                              {pt === "enquiry" ? "Enquiry" : pt === "fixed" ? "Fixed Price" : "Price Range"}
                            </button>
                          ))}
                        </div>
                        {pp.price_type === "fixed" && (
                          <div className="grid grid-cols-2 gap-4 pt-1">
                            <div className="space-y-2">
                              <Label className="text-zinc-300 text-sm">Price (USD)</Label>
                              <Input type="number" min={0} placeholder="0"
                                value={pp.price_cents !== null ? pp.price_cents / 100 : ""}
                                onChange={e => setPP({ price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-zinc-300 text-sm">Display Text</Label>
                              <Input value={pp.price_display} onChange={e => setPP({ price_display: e.target.value })}
                                placeholder="e.g. $2,500"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                            </div>
                          </div>
                        )}
                        {pp.price_type === "range" && (
                          <div className="space-y-2 pt-1">
                            <Label className="text-zinc-300 text-sm">Price Range Display</Label>
                            <Input value={pp.price_display} onChange={e => setPP({ price_display: e.target.value })}
                              placeholder="e.g. $2,000 – $5,000"
                              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 text-base focus-visible:ring-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Step 5 — Review ── */}
                  {step === 5 && (
                    <div className="space-y-4">
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
                        {[
                          { label: "Name", value: fullName },
                          { label: "Role", value: currentRole },
                          { label: "Specialties", value: `${specialtyTags.length} selected` },
                          { label: "Audience tags", value: `${audienceTags.length} selected` },
                          { label: "Coaching styles", value: `${styleTags.length} selected` },
                          { label: "Credentials", value: `${credentialTags.length} selected` },
                          ...(pp.title ? [
                            { label: "Product", value: pp.title },
                            { label: "Product type", value: pp.product_type },
                          ] : []),
                        ].filter(r => r.value && r.value !== "0 selected").map(row => (
                          <div key={row.label} className="flex justify-between items-center p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                            <span className="text-zinc-400 text-sm">{row.label}</span>
                            <span className="font-semibold text-white text-sm">{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-zinc-500 pt-2">
                        Everything look right? Click <strong className="text-zinc-300">Save & Choose Tier</strong> to continue.
                      </p>
                    </div>
                  )}

                  {/* ── Step 6 — Tier Selection ── */}
                  {step === 6 && (
                    <>
                      {activeTier && (
                        <CoachTierPayment
                          tier={activeTier}
                          onClose={() => setActiveTier(null)}
                          onSuccess={() => {
                            if (userId) sessionStorage.removeItem(storageKey(userId));
                            setState("success");
                          }}
                        />
                      )}
                      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-4`}>
                        {TIER_OPTIONS.map(tier => (
                          <div key={tier.key}
                            className={`relative rounded-2xl border p-5 transition-all ${
                              tier.comingSoon
                                ? "border-zinc-700/60 bg-zinc-900/40 cursor-not-allowed"
                                : activeTier === tier.key
                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10 cursor-pointer"
                                : "border-zinc-700 bg-zinc-800/50 hover:border-primary/50 hover:bg-zinc-800 cursor-pointer"
                            }`}
                            onClick={() => !tier.comingSoon && setActiveTier(tier.key)}
                          >
                            {tier.badge && (
                              <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap ${
                                tier.comingSoon
                                  ? "bg-zinc-700 text-zinc-400"
                                  : "bg-primary text-primary-foreground"
                              }`}>
                                {tier.badge}
                              </span>
                            )}
                            <p className={`font-bold text-lg mt-1 ${tier.comingSoon ? "text-zinc-400" : "text-white"}`}>{tier.name}</p>
                            <p className={`font-semibold text-base mt-0.5 ${tier.comingSoon ? "text-zinc-500" : "text-primary"}`}>{tier.price}</p>
                            <p className={`text-sm mt-2 leading-relaxed ${tier.comingSoon ? "text-zinc-600" : "text-zinc-400"}`}>{tier.desc}</p>
                            <div className={`mt-4 w-full py-2 rounded-lg text-center text-sm font-semibold transition-colors ${
                              tier.comingSoon
                                ? "bg-zinc-800/60 text-zinc-600 border border-zinc-700/50"
                                : activeTier === tier.key
                                ? "bg-primary text-primary-foreground"
                                : "bg-zinc-700 text-zinc-300"
                            }`}>
                              {tier.comingSoon ? "Coming Soon" : activeTier === tier.key ? "Selected" : "Select"}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-zinc-500 text-center pt-2">
                        Your card is saved securely — you won't be charged until Galoras approves your application.
                      </p>
                    </>
                  )}

                  {/* ── Navigation ── */}
                  <div className="flex gap-3 pt-4 border-t border-zinc-800">
                    {step > 1 && step < 6 && (
                      <Button type="button" variant="outline"
                        onClick={() => setStep(s => s - 1)}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-6">
                        ← Back
                      </Button>
                    )}
                    {step < 5 ? (
                      <Button type="button" onClick={handleNext}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 text-base">
                        Continue →
                      </Button>
                    ) : step === 5 ? (
                      <Button type="button" onClick={handleSubmit}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 text-base"
                        disabled={state === "submitting"}>
                        {state === "submitting"
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                          : token ? "Submit Profile" : "Save & Choose Tier →"}
                      </Button>
                    ) : null}
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
