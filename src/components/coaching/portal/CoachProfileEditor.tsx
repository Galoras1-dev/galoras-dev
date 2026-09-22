import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  User,
  Briefcase,
  Globe,
  MessageSquare,
  Star,
  Eye,
  Link,
  Target,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';

interface ProofPoint {
  name: string;
  company: string;
  outcome: string;
  quote: string;
}

interface CoachProfileEditorProps {
  coachProfile: any;
}

const textareaClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none';
const labelClass = 'text-xs text-muted-foreground uppercase tracking-wide';

function parseArray(val: any): string {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

function toArray(val: string): string[] {
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CoachProfileEditor({ coachProfile }: CoachProfileEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<null | 'avatar_url' | 'profile_image_url'>(null);

  // ── Photo upload ────────────────────────────────────────────────────────────
  //
  // Both image fields were URL-only, which meant a headshot had to be put into
  // storage by hand and the address pasted in. Nobody outside this office was
  // ever going to do that.
  //
  // The coach is signed in by the time they reach this screen, and the
  // coach-photos bucket's insert policy is roles = authenticated, so a direct
  // client upload is enough — no edge function needed.
  //
  // The URL box stays. Someone who already hosts their headshot somewhere can
  // still paste it, and if the upload ever fails they are not stuck.
  const uploadPhoto = async (
    field: 'avatar_url' | 'profile_image_url',
    file: File | undefined,
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'That is not an image', description: 'Use a JPG or PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'That photo is too big',
        description: 'Keep it under 5MB. A phone photo usually needs resizing.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(field);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const owner = auth?.user?.id ?? coachProfile?.id ?? 'unknown';
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${owner}/${field}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('coach-photos')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('coach-photos').getPublicUrl(path);
      if (!pub?.publicUrl) throw new Error('Uploaded, but no public URL came back.');

      updateField(field, pub.publicUrl);
      toast({ title: 'Photo uploaded', description: 'Remember to hit Save.' });
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      toast({
        title: 'Upload failed',
        description: err?.message ?? 'Something went wrong. You can still paste a URL instead.',
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const [form, setForm] = useState({
    display_name: '',
    headline: '',
    current_role: '',
    profile_image_url: '',
    avatar_url: '',
    positioning_statement: '',
    methodology: '',
    coaching_philosophy: '',
    coaching_style: '',
    bio: '',
    coach_background: '',
    coach_background_detail: '',
    years_experience: 0,
    leadership_experience_years: 0,
    companies_worked: '',
    industry_focus: '',
    specialties: '',
    pillar_specialties: '',
    secondary_pillars: '',
    audience: '',
    engagement_format: 'online',
    engagement_model: '',
    availability_status: 'available',
    linkedin_url: '',
    website_url: '',
    booking_url: '',
  });

  const [proofPoints, setProofPoints] = useState<ProofPoint[]>([]);

  useEffect(() => {
    if (!coachProfile) return;
    setForm({
      display_name: coachProfile.display_name || '',
      headline: coachProfile.headline || '',
      current_role: coachProfile.current_role || '',
      profile_image_url: coachProfile.profile_image_url || '',
      avatar_url: coachProfile.avatar_url || '',
      positioning_statement: coachProfile.positioning_statement || '',
      methodology: coachProfile.methodology || '',
      coaching_philosophy: coachProfile.coaching_philosophy || '',
      coaching_style: coachProfile.coaching_style || '',
      bio: coachProfile.bio || '',
      coach_background: coachProfile.coach_background || '',
      coach_background_detail: coachProfile.coach_background_detail || '',
      years_experience: coachProfile.years_experience || 0,
      leadership_experience_years: coachProfile.leadership_experience_years || 0,
      companies_worked: coachProfile.companies_worked || '',
      industry_focus: coachProfile.industry_focus || '',
      specialties: parseArray(coachProfile.specialties),
      pillar_specialties: parseArray(coachProfile.pillar_specialties),
      secondary_pillars: parseArray(coachProfile.secondary_pillars),
      audience: parseArray(coachProfile.audience),
      engagement_format: coachProfile.engagement_format || 'online',
      engagement_model: coachProfile.engagement_model || '',
      availability_status: coachProfile.availability_status || 'available',
      linkedin_url: coachProfile.linkedin_url || '',
      website_url: coachProfile.website_url || '',
      booking_url: coachProfile.booking_url || '',
    });
    const pp = coachProfile.proof_points;
    if (Array.isArray(pp)) {
      setProofPoints(pp.map((p: any) => ({
        name: p.name || '',
        company: p.company || '',
        outcome: p.outcome || '',
        quote: p.quote || '',
      })));
    }
  }, [coachProfile]);

  function updateField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addProofPoint() {
    setProofPoints((prev) => [...prev, { name: '', company: '', outcome: '', quote: '' }]);
  }

  function removeProofPoint(index: number) {
    setProofPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function updateProofPoint(index: number, key: keyof ProofPoint, value: string) {
    setProofPoints((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [key]: value } : p))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        display_name: form.display_name,
        headline: form.headline,
        current_role: form.current_role,
        profile_image_url: form.profile_image_url,
        avatar_url: form.avatar_url,
        positioning_statement: form.positioning_statement,
        methodology: form.methodology,
        coaching_philosophy: form.coaching_philosophy,
        coaching_style: form.coaching_style,
        bio: form.bio,
        coach_background: form.coach_background,
        coach_background_detail: form.coach_background_detail,
        years_experience: Number(form.years_experience) || 0,
        leadership_experience_years: Number(form.leadership_experience_years) || 0,
        companies_worked: form.companies_worked,
        industry_focus: form.industry_focus,
        specialties: toArray(form.specialties),
        pillar_specialties: toArray(form.pillar_specialties),
        secondary_pillars: toArray(form.secondary_pillars),
        audience: toArray(form.audience),
        engagement_format: form.engagement_format,
        engagement_model: form.engagement_model,
        availability_status: form.availability_status,
        linkedin_url: form.linkedin_url,
        website_url: form.website_url,
        booking_url: form.booking_url,
        proof_points: proofPoints,
      };

      const { error } = await supabase
        .from('coaches')
        .update(payload)
        .eq('id', coachProfile.id);

      if (error) throw error;

      toast({ title: 'Profile Saved', description: 'Your coach profile has been updated.' });
      queryClient.invalidateQueries({ queryKey: ['my-coach-profile'] });
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border -mx-6 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-white">Edit Profile</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {/* Admin badges */}
      <div className="flex flex-wrap gap-2">
        {coachProfile.tier && (
          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
            {coachProfile.tier}
          </Badge>
        )}
        {coachProfile.lifecycle_status && (
          <Badge className={
            coachProfile.lifecycle_status === 'active'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-muted/20 text-muted-foreground border-border'
          }>
            {coachProfile.lifecycle_status}
          </Badge>
        )}
        {coachProfile.primary_pillar && (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            {coachProfile.primary_pillar}
          </Badge>
        )}
        {coachProfile.slug && (
          <Badge variant="outline" className="border-border text-muted-foreground">
            /coach/{coachProfile.slug}
          </Badge>
        )}
        {coachProfile.readiness_score > 0 && (
          <Badge variant="outline" className="border-border text-muted-foreground">
            Readiness: {coachProfile.readiness_score}
          </Badge>
        )}
      </div>

      {/* Section 1: Identity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Display Name" value={form.display_name} onChange={(v) => updateField('display_name', v)} />
            <Field label="Headline" value={form.headline} onChange={(v) => updateField('headline', v)} placeholder="One-line tagline" />
            <Field label="Current Role" value={form.current_role} onChange={(v) => updateField('current_role', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Profile Image</Label>
              <Input className="bg-card border-border" value={form.profile_image_url} onChange={(e) => updateField('profile_image_url', e.target.value)} placeholder="Upload below, or paste a URL" />
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary hover:underline">
                {uploading === 'profile_image_url'
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                  : <><Upload className="h-3.5 w-3.5" /> Upload a photo</>}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(e) => { uploadPhoto('profile_image_url', e.target.files?.[0]); e.currentTarget.value = ''; }}
                />
              </label>
              {form.profile_image_url && (
                <img src={form.profile_image_url} alt="Profile preview" className="h-16 w-16 rounded-lg object-cover mt-1 border border-border" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Avatar</Label>
              <Input className="bg-card border-border" value={form.avatar_url} onChange={(e) => updateField('avatar_url', e.target.value)} placeholder="Upload below, or paste a URL" />
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary hover:underline">
                {uploading === 'avatar_url'
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                  : <><Upload className="h-3.5 w-3.5" /> Upload a photo</>}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(e) => { uploadPhoto('avatar_url', e.target.files?.[0]); e.currentTarget.value = ''; }}
                />
              </label>
              {form.avatar_url && (
                <img src={form.avatar_url} alt="Avatar preview" className="h-16 w-16 rounded-full object-cover mt-1 border border-border" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: GTM & Positioning */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> GTM & Positioning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className={labelClass}>Positioning Statement</Label>
            <textarea rows={4} className={textareaClass} value={form.positioning_statement} onChange={(e) => updateField('positioning_statement', e.target.value)} placeholder="Hero text on your public profile" />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Methodology</Label>
            <textarea rows={4} className={textareaClass} value={form.methodology} onChange={(e) => updateField('methodology', e.target.value)} placeholder="Describe your coaching approach" />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Coaching Philosophy</Label>
            <textarea rows={3} className={textareaClass} value={form.coaching_philosophy} onChange={(e) => updateField('coaching_philosophy', e.target.value)} />
          </div>
          <Field label="Coaching Style" value={form.coaching_style} onChange={(v) => updateField('coaching_style', v)} placeholder="e.g. Strategic & Outcome-Focused" />
        </CardContent>
      </Card>

      {/* Section 3: Background & Experience */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Background & Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className={labelClass}>Bio</Label>
            <textarea rows={5} className={textareaClass} value={form.bio} onChange={(e) => updateField('bio', e.target.value)} placeholder="Full biography" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Coach Background" value={form.coach_background} onChange={(v) => updateField('coach_background', v)} />
            <Field label="Companies Worked" value={form.companies_worked} onChange={(v) => updateField('companies_worked', v)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Coach Background Detail</Label>
            <textarea rows={3} className={textareaClass} value={form.coach_background_detail} onChange={(e) => updateField('coach_background_detail', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Years Experience</Label>
              <Input type="number" className="bg-card border-border" value={form.years_experience} onChange={(e) => updateField('years_experience', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Leadership Experience (Years)</Label>
              <Input type="number" className="bg-card border-border" value={form.leadership_experience_years} onChange={(e) => updateField('leadership_experience_years', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Focus & Expertise */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" /> Focus & Expertise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Industry Focus" value={form.industry_focus} onChange={(v) => updateField('industry_focus', v)} />
            <Field label="Specialties (comma-separated)" value={form.specialties} onChange={(v) => updateField('specialties', v)} />
            <Field label="Pillar Specialties (comma-separated)" value={form.pillar_specialties} onChange={(v) => updateField('pillar_specialties', v)} />
            <Field label="Secondary Pillars (comma-separated)" value={form.secondary_pillars} onChange={(v) => updateField('secondary_pillars', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Audience & Engagement */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Audience & Engagement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Audience (comma-separated)" value={form.audience} onChange={(v) => updateField('audience', v)} />
            <div className="space-y-1.5">
              <Label className={labelClass}>Engagement Format</Label>
              <select className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary" value={form.engagement_format} onChange={(e) => updateField('engagement_format', e.target.value)}>
                <option value="online">Online</option>
                <option value="in_person">In Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <Field label="Engagement Model" value={form.engagement_model} onChange={(v) => updateField('engagement_model', v)} placeholder="e.g. Executive Cycles" />
            <div className="space-y-1.5">
              <Label className={labelClass}>Availability Status</Label>
              <select className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary" value={form.availability_status} onChange={(e) => updateField('availability_status', e.target.value)}>
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Links */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" /> Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => updateField('linkedin_url', v)} placeholder="https://linkedin.com/in/..." />
            <Field label="Website URL" value={form.website_url} onChange={(v) => updateField('website_url', v)} placeholder="https://..." />
            <Field label="Booking URL" value={form.booking_url} onChange={(v) => updateField('booking_url', v)} placeholder="https://calendly.com/..." />
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Proof Points / Testimonials */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white font-display flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Proof Points / Testimonials
            </span>
            <Button variant="outline" size="sm" className="border-border" onClick={addProofPoint}>
              <Plus className="h-4 w-4 mr-1" /> Add Testimonial
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {proofPoints.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No testimonials yet. Add one to showcase client outcomes.
            </p>
          )}
          {proofPoints.map((pp, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Testimonial {idx + 1}</span>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2" onClick={() => removeProofPoint(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Name</Label>
                  <Input className="bg-card border-border" value={pp.name} onChange={(e) => updateProofPoint(idx, 'name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Company</Label>
                  <Input className="bg-card border-border" value={pp.company} onChange={(e) => updateProofPoint(idx, 'company', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Outcome</Label>
                <Input className="bg-card border-border" value={pp.outcome} onChange={(e) => updateProofPoint(idx, 'outcome', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Quote</Label>
                <textarea rows={2} className={textareaClass} value={pp.quote} onChange={(e) => updateProofPoint(idx, 'quote', e.target.value)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}

/* Reusable text field */
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelClass}>{label}</Label>
      <Input
        className="bg-card border-border"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
