import { useState } from "react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mail, 
  MessageCircle, 
  Building2,
  MapPin,
  Clock,
  Send
} from "lucide-react";

// Every entry here must be a channel that actually works.
//
// Removed: a chat card promising availability Mon-Fri 9am-6pm EST with no chat
// software of any kind behind it, and two addresses that are not mailboxes.
//
// Do not add a channel back to this list until it can receive a message.
const contactMethods = [
  {
    icon: Mail,
    title: "Email Us",
    description: "conor@galoras.com",
    detail: "Straight to the founder, not a queue.",
    href: "mailto:conor@galoras.com",
  },
  {
    icon: Building2,
    title: "Business & Enterprise",
    description: "conor@galoras.com",
    detail: "Teams, leadership programmes, partnerships.",
    href: "mailto:conor@galoras.com?subject=Enterprise%20enquiry",
  },
  {
    icon: MessageCircle,
    title: "Something Broken?",
    description: "Tell us what you hit",
    detail: "We are pre-launch and we would rather hear it than not.",
    href: "mailto:conor@galoras.com?subject=Galoras%20%E2%80%94%20something%20is%20broken",
  },
];

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_email: "",
    company_name: "",
    company_size: "",
    interest: [] as string[],
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // ── Why this does not write to the database ──────────────────────────────
    //
    // It used to insert into a table called `leads`, which has never existed.
    // Every message submitted here failed with a PostgREST 42P01 and was thrown
    // away — the visitor saw a red "Failed to send" toast, confirmed live.
    //
    // The obvious replacement, `coaching_requests`, does not fit: coach_id on
    // that table is NOT NULL and a foreign key to coaches(id). Every row in it
    // today genuinely belongs to a coach, and loosening that to accommodate one
    // page would weaken it for every real row.
    //
    // So this sends an email and stores nothing. `send-admin-alert` is already
    // deployed, already emails conor@galoras.com, and is already invoked from
    // the coach-profile Request button.
    const extra = [
      formData.company_size ? `Company size: ${formData.company_size}` : "",
      formData.interest.length ? `Interested in: ${formData.interest.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    try {
      const { error } = await supabase.functions.invoke("send-admin-alert", {
        body: {
          alertType: "customer_request",
          name: formData.contact_name,
          email: formData.contact_email,
          coachName: "Galoras — contact page",
          product: formData.interest.length ? formData.interest.join(", ") : "General enquiry",
          goal: formData.message,
          context: extra,
          urgency: "medium",
        },
      });

      if (error) throw error;

      toast({
        title: "Message sent",
        description: "It goes straight to Conor. You'll hear back within 24 hours.",
      });

      setFormData({
        contact_name: "",
        contact_email: "",
        company_name: "",
        company_size: "",
        interest: [],
        message: "",
      });
    } catch (error) {
      console.error("Contact form send failed:", error);
      toast({
        title: "That didn't send",
        description:
          "Something on our side failed, and we are pre-launch so that happens. Email conor@galoras.com directly and it will reach the right person.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Contact Us"
        description="Start a conversation with Galoras. Whether you're exploring coaching, the Sport of Business programme, or a business consultation, we're ready to help."
        canonical="/contact"
      />
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1920&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background" />
        
        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              Get in <span className="text-gradient">Touch</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.href}
                className="flex items-start gap-4 group rounded-xl -m-2 p-2 transition-colors hover:bg-primary/5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <method.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold mb-1">{method.title}</h3>
                  <p className="text-primary group-hover:underline underline-offset-4">{method.description}</p>
                  <p className="text-sm text-muted-foreground">{method.detail}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-display font-bold mb-6">Send us a message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company / Organization</Label>
                      <Input
                        id="company"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size">Company Size</Label>
                      <Select
                        value={formData.company_size}
                        onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="500+">500+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interest">What are you interested in?</Label>
                    <Select
                      value={formData.interest[0] || ""}
                      onValueChange={(value) => setFormData({ ...formData, interest: [value] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your interest" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual_coaching">Individual Coaching</SelectItem>
                        <SelectItem value="team_coaching">Team Coaching</SelectItem>
                        <SelectItem value="executive_coaching">Executive Coaching</SelectItem>
                        <SelectItem value="workshops">Workshops & Training</SelectItem>
                        <SelectItem value="enterprise">Enterprise Solutions</SelectItem>
                        <SelectItem value="become_coach">Become a Coach</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Your Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us more about what you're looking for..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Location Info */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="h-5 w-5" />
              Serving clients globally
            </div>
            <h2 className="text-2xl font-display font-bold mb-4">
              We're a remote-first team
            </h2>
            <p className="text-muted-foreground">
              Our team and coaches work from around the world, allowing us to serve clients across all time zones. Whether you're in New York, London, or Singapore, we're here to help.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Based in Miami. Messages are read the same day, most days.
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
