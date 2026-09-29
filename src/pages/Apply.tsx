import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Award, 
  Users, 
  Globe,
  Zap,
  Send,
} from "lucide-react";
import {
  COACH_BACKGROUND_OPTIONS,
  BACKGROUND_DETAIL_CONFIG,
  CERTIFICATION_INTEREST_OPTIONS,
  COACHING_EXPERIENCE_OPTIONS,
  LEADERSHIP_EXPERIENCE_OPTIONS,
  COACHING_LEVEL_OPTIONS,
} from "@/lib/coaching-constants";

const benefits = [
  {
    icon: Users,
    title: "Curated Client Base",
    description: "Connect with motivated individuals and organizations actively seeking coaching.",
  },
  {
    icon: Zap,
    title: "AI-Powered Matching",
    description: "Get matched with clients who are the right fit for your style and expertise.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Access clients from around the world through our digital platform.",
  },
  {
    icon: Award,
    title: "Professional Development",
    description: "Access exclusive training, resources, and community for continuous growth.",
  },
];

export default function Apply() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  // One question, optional, and the only reliable way to tell a coach who came
  // through Conor's network from one who found Galoras on their own. The first
  // option is the one that answers it.
  const HEARD_ABOUT_OPTIONS = [
    "Someone at Galoras told me about it",
    "A coach or client I know",
    "LinkedIn",
    "Search engine",
    "A podcast, article or newsletter",
    "An event or conference",
    "Somewhere else",
  ];

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    website_url: "",
    bio: "",
    coaching_philosophy: "",
    coach_background: "",
    coach_background_detail: "",
    certification_interest: "",
    coaching_experience_years: "",
    leadership_experience_years: "",
    current_role: "",
    coaching_experience_level: "",
    heard_about_us: "",
  });

  // A coach who gave their name and email on the homepage should not be asked
  // for them again three seconds later. Read from sessionStorage rather than a
  // query parameter - an email in a URL ends up in history, referrers and logs.
  useEffect(() => {
    try {
      const n = sessionStorage.getItem("galoras_prefill_name");
      const e = sessionStorage.getItem("galoras_prefill_email");
      if (n || e) {
        setFormData(prev => ({
          ...prev,
          full_name: prev.full_name || n || "",
          email: prev.email || e || "",
        }));
        sessionStorage.removeItem("galoras_prefill_name");
        sessionStorage.removeItem("galoras_prefill_email");
      }
    } catch { /* private browsing - they type it again */ }
  }, []);

  const backgroundConfig = formData.coach_background
    ? BACKGROUND_DETAIL_CONFIG[formData.coach_background]
    : null;

  const handleBackgroundChange = (value: string) => {
    setFormData({
      ...formData,
      coach_background: value,
      coach_background_detail: "",
      certification_interest: "",
    });
  };

  const normalizeUrl = (url: string) => {
    const trimmed = (url || "").trim();
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  // ── Where did this coach come from? ────────────────────────────────────────
  //
  // The plan is to revisit pricing once 20 coaches have onboarded who did NOT
  // come from Conor's own network. Nothing in the system recorded that, so the
  // number could never have been counted - and it cannot be reconstructed after
  // the fact. Captured at submit, silently, from what the browser already knows.
  //
  // Deliberately NOT personal data: the referring page and any campaign tags the
  // link carried. No fingerprinting, nothing stored that identifies a person, and
  // nothing put in a URL.
  const captureSource = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"]) {
        const v = params.get(key);
        if (v) utm[key] = v.slice(0, 120);
      }

      const raw = document.referrer || "";
      let referrerHost: string | null = null;
      if (raw) {
        try {
          const u = new URL(raw);
          // Host only. The full referring URL can carry a search query the person
          // typed, which is more than we need and more than we should keep.
          referrerHost = u.host === window.location.host ? null : u.host;
        } catch { referrerHost = null; }
      }

      return {
        referrer_host: referrerHost,
        utm: Object.keys(utm).length > 0 ? utm : null,
      };
    } catch {
      return { referrer_host: null, utm: null };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Client-generate the application id so we don't need to read the row back
      // after insert. The public /apply insert has no SELECT policy by design
      // (applicant PII must not be world-readable), so requesting the row back via
      // .select() would fail RLS. Generating the id here gives us what the next
      // steps need without reading anything back.
      const applicationId = crypto.randomUUID();
      const src = captureSource();

      // Profile photo is collected post-approval in the coach profile editor
      // (where the user is authenticated). The public /apply form does not upload
      // a photo, so no anonymous storage write is required.
      const avatarUrl: string | null = null;

      const coach_background_detail = backgroundConfig?.field === "detail" ? formData.coach_background_detail : null;
      const certification_interest = backgroundConfig?.field === "certification" ? formData.certification_interest : null;

      const payload = {
        id: applicationId,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        linkedin_url: normalizeUrl(formData.linkedin_url),
        website_url: normalizeUrl(formData.website_url),
        bio: formData.bio,
        avatar_url: avatarUrl,
        coach_background: formData.coach_background,
        coach_background_detail,
        certification_interest,
        coaching_experience_years: formData.coaching_experience_years,
        leadership_experience_years: formData.leadership_experience_years,
        current_role: formData.current_role || null,
        coaching_experience_level: formData.coaching_experience_level,
        coaching_philosophy: formData.coaching_philosophy || null,
        nda_accepted: ndaAccepted,
        nda_accepted_at: ndaAccepted ? new Date().toISOString() : null,
        // How they found Galoras. The self-reported answer is the one that
        // answers "did this come from my network"; the referrer and campaign tags
        // are the automatic backstop for the coaches who skip the question.
        heard_about_us: formData.heard_about_us || null,
        source_referrer: src.referrer_host,
        source_utm: src.utm,
      };

      // Plain insert (no .select()) → return=minimal, so PostgREST does not read
      // the row back and no SELECT policy is required for the anonymous submitter.
      const { error } = await supabase
        .from("coach_applications")
        .insert(payload as any);

      if (error) throw error;

      // Fire-and-forget AI analysis — don't block the user
      supabase.functions.invoke("analyze-coach-application", {
        body: { applicationId },
      }).catch(() => {/* silent — analysis runs in background */});

      toast({
        title: "Application received!",
        description: "Create your account to secure your spot — we'll only charge your card if you're approved.",
      });

      // Carry what they just typed straight into account creation. Without this
      // an applicant retypes their name, email, role and LinkedIn thirty seconds
      // after giving them, which is the first thing anyone notices about this
      // flow. Router state rather than a database read, because the /apply
      // insert deliberately has no SELECT policy — applicant PII must not be
      // world-readable, and that constraint is correct.
      navigate(`/coach-signup?applicationId=${applicationId}`, {
        state: {
          prefill: {
            fullName: formData.full_name,
            email: formData.email,
            currentRole: formData.current_role,
            linkedinUrl: normalizeUrl(formData.linkedin_url),
          },
        },
      });

    } catch (error) {
      console.error("Submit error:", error);
      toast({ title: "Error", description: "Failed to submit application. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1920&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background" />
        
        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Award className="h-4 w-4" />
              Join Our Coaching Network
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              Become a <span className="text-gradient">Galoras Coach</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Join an elite network of vetted coaches making a real impact on people's lives and careers.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-display font-bold mb-2">Coach Application</h2>
                <p className="text-muted-foreground mb-8">
                  Step 1 of 2: Submit your background for initial review. If approved, you'll receive a link to complete your full coach profile.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-display font-semibold">Personal Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Jane Smith" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="jane@coaching.com" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn Profile</Label>
                        <Input id="linkedin" type="url" value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/yourprofile" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website / Portfolio</Label>
                      <Input id="website" type="url" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://yourwebsite.com" />
                    </div>
                  </div>

                  {/* About You */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-display font-semibold">About You</h3>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Professional Bio *</Label>
                      <Textarea id="bio" required rows={4} value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about your coaching background and what makes you unique..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="philosophy">Coaching Philosophy</Label>
                      <Textarea
                        id="philosophy"
                        rows={2}
                        maxLength={300}
                        value={formData.coaching_philosophy}
                        onChange={(e) => setFormData({ ...formData, coaching_philosophy: e.target.value })}
                        placeholder="Your coaching philosophy in a sentence or two..."
                      />
                      <p className="text-xs text-muted-foreground text-right">{formData.coaching_philosophy.length}/300</p>
                    </div>
                  </div>

                  {/* Professional Background */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-display font-semibold">Professional Background</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Coach Background *</Label>
                        <Select value={formData.coach_background} onValueChange={handleBackgroundChange} required>
                          <SelectTrigger><SelectValue placeholder="Select background" /></SelectTrigger>
                          <SelectContent>
                            {COACH_BACKGROUND_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Years of Coaching Experience *</Label>
                        <Select value={formData.coaching_experience_years} onValueChange={(v) => setFormData({ ...formData, coaching_experience_years: v })} required>
                          <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                          <SelectContent>
                            {COACHING_EXPERIENCE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Conditional sub-field */}
                    {backgroundConfig?.field === "detail" && (
                      <div className="space-y-2">
                        <Label>{backgroundConfig.label} *</Label>
                        <Input
                          required
                          value={formData.coach_background_detail}
                          onChange={(e) => setFormData({ ...formData, coach_background_detail: e.target.value })}
                          placeholder={backgroundConfig.label}
                        />
                      </div>
                    )}
                    {backgroundConfig?.field === "certification" && (
                      <div className="space-y-2">
                        <Label>{backgroundConfig.label} *</Label>
                        <Select value={formData.certification_interest} onValueChange={(v) => setFormData({ ...formData, certification_interest: v })} required>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {CERTIFICATION_INTEREST_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Years of Leadership / Professional Experience *</Label>
                      <Select value={formData.leadership_experience_years} onValueChange={(v) => setFormData({ ...formData, leadership_experience_years: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>
                          {LEADERSHIP_EXPERIENCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currentRole">Current / Most Recent Role</Label>
                      <Input id="currentRole" value={formData.current_role} onChange={(e) => setFormData({ ...formData, current_role: e.target.value })} placeholder="e.g., VP of Operations, Head Coach" />
                    </div>

                    <div className="space-y-2">
                      <Label>Coaching Experience Level *</Label>
                      <Select value={formData.coaching_experience_level} onValueChange={(v) => setFormData({ ...formData, coaching_experience_level: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          {COACHING_LEVEL_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* How they found us. Optional on purpose - a required question
                      at the end of a long form costs applications, and the
                      referrer capture covers the ones who skip it. */}
                  <div className="space-y-2">
                    <Label>How did you hear about Galoras? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select
                      value={formData.heard_about_us}
                      onValueChange={(v) => setFormData({ ...formData, heard_about_us: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                      <SelectContent>
                        {HEARD_ABOUT_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* NDA Consent */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <h3 className="text-sm font-display font-semibold">Confidentiality Agreement</h3>
                    <p className="text-xs text-muted-foreground">
                      By applying you agree to keep all information shared during the Galoras application
                      and onboarding process confidential. Galoras operates under a mutual non-disclosure
                      agreement with all coach applicants.
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="nda-consent"
                        checked={ndaAccepted}
                        onCheckedChange={(v) => setNdaAccepted(!!v)}
                        className="mt-0.5 shrink-0"
                      />
                      <Label htmlFor="nda-consent" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
                        I agree to the{" "}
                        <a href="/legal/coach-agreement" target="_blank" className="underline underline-offset-2 hover:text-primary transition-colors">
                          Galoras Mutual Non-Disclosure Agreement
                        </a>{" "}
                        and confirm that all information I share is accurate and will be treated as confidential.{" "}
                        <span className="text-red-400">*</span>
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSubmitting || !ndaAccepted}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-center mb-8">
              What Happens Next?
            </h2>
            <div className="space-y-4">
              {[
                { step: 1, title: "Application Review", description: "Our team reviews your background and experience within 5 business days." },
                { step: 2, title: "Approval & Onboarding Link", description: "If approved, you'll receive a personalized link to complete your full coach profile (Step 2 of 2)." },
                { step: 3, title: "Complete Your Profile", description: "Use the onboarding link to add your coaching pillars, specialties, preferences, and availability." },
                { step: 4, title: "Start Coaching", description: "Once your profile is complete, begin receiving client matches through our AI-powered platform." },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
