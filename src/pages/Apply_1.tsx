import { useState } from "react";
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
    booking_url: "",
  });

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

      // Profile photo is collected post-approval in the coach profile editor
      // (where the user is authenticated). The public /apply form does not upload
      // a photo, so no anonymous storage write is required.
      const avatarUrl: string | null = null;

      const coach_background_detail = backgroundConfig?.field === "detail" ? formData.coach_background_detail : null;
      const certification_interest = backgroundConfig?.field === "certification" ? formData.certification_interest : null;

      const normalizedBooking = normalizeUrl(formData.booking_url);

      if (normalizedBooking && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(normalizedBooking)) {
        throw new Error("Please enter a valid booking URL.");
      }

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
        booking_url: normalizedBooking,
        nda_accepted: ndaAccepted,
        nda_accepted_at: ndaAccepted ? new Date().toISOString() : null,
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

      navigate(`/coach-signup?applicationId=${applicationId}`);

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
                    <div className="space-y-2">
                      <Label htmlFor="booking_url">Booking Link (e.g., Calendly)</Label>
                      <Input
                        id="booking_url"
                        type="text"
                        value={formData.booking_url}
                        onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                        placeholder="https://calendly.com/yourname"
                      />
                      <p className="text-xs text-muted-foreground">Optional — enter your Calendly or booking page (we'll add https:// if missing).</p>
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
