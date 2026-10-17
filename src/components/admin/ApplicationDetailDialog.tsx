import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getPillarForSpecialty } from "@/lib/coaching-constants";

interface CoachApplication {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  status: string;
  bio: string | null;
  experience_years: number | null;
  certifications: string | null;
  specialties: string[] | null;
  why_galoras: string | null;
  phone: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  onboarding_status: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  // Structured fields
  coach_background: string | null;
  coach_background_detail: string | null;
  certification_interest: string | null;
  coaching_experience_years: string | null;
  leadership_experience_years: string | null;
  current_role: string | null;
  coaching_experience_level: string | null;
  primary_join_reason: string | null;
  commitment_level: string | null;
  start_timeline: string | null;
  excitement_note: string | null;
  pillar_specialties: string[] | null;
  coaching_philosophy: string | null;
  // New structured intake fields
  primary_pillar: string | null;
  secondary_pillars: string[] | null;
  industry_focus: string[] | null;
  coaching_style: string[] | null;
  engagement_model: string | null;
  availability_status: string | null;
  founder_stage_focus: string[] | null;
  founder_function_strength: string[] | null;
  exec_level: string | null;
  exec_function: string[] | null;
}

interface Props {
  application: CoachApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationDetailDialog({ application, open, onOpenChange }: Props) {
  if (!application) return null;

  // Group pillar specialties by pillar
  const groupedSpecialties: Record<string, string[]> = {};
  if (application.pillar_specialties) {
    for (const s of application.pillar_specialties) {
      const pillar = getPillarForSpecialty(s) || "Other";
      if (!groupedSpecialties[pillar]) groupedSpecialties[pillar] = [];
      groupedSpecialties[pillar].push(s);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application — {application.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {application.avatar_url && (
            <img src={application.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
          )}
          <Field label="Email" value={application.email} />
          <Field label="Phone" value={application.phone} />
          <Field label="Bio" value={application.bio} />
          <Field label="Coaching Philosophy" value={application.coaching_philosophy} />

          {/* Structured fields */}
          <Field label="Coach Background" value={application.coach_background} />
          <Field label="Background Detail" value={application.coach_background_detail} />
          <Field label="Certification Interest" value={application.certification_interest} />
          <Field label="Coaching Experience" value={application.coaching_experience_years} />
          <Field label="Leadership Experience" value={application.leadership_experience_years} />
          <Field label="Current Role" value={application.current_role} />
          <Field label="Coaching Level" value={application.coaching_experience_level} />

          {/* Primary Taxonomy */}
          <Field label="Primary Pillar" value={application.primary_pillar} />
          <ArrayField label="Secondary Pillars" values={application.secondary_pillars} />

          {/* New structured fields */}
          <ArrayField label="Industry Focus" values={application.industry_focus} />
          <ArrayField label="Coaching Style" values={application.coaching_style} />
          <Field label="Engagement Model" value={application.engagement_model} />
          <Field label="Availability" value={application.availability_status} />

          {/* Founder-specific fields */}
          {(application.founder_stage_focus?.length || application.founder_function_strength?.length) && (
            <div className="border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Founder Details</span>
              <div className="mt-2 space-y-2">
                <ArrayField label="Stage Focus" values={application.founder_stage_focus} />
                <ArrayField label="Function Strengths" values={application.founder_function_strength} />
              </div>
            </div>
          )}

          {/* Executive-specific fields */}
          {(application.exec_level || application.exec_function?.length) && (
            <div className="border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Executive Details</span>
              <div className="mt-2 space-y-2">
                <Field label="Exec Level" value={application.exec_level} />
                <ArrayField label="Exec Functions" values={application.exec_function} />
              </div>
            </div>
          )}

          {/* Detailed Specialties (legacy) grouped */}
          {Object.keys(groupedSpecialties).length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Detailed Specialties (Legacy)</span>
              <div className="mt-1 space-y-2">
                {Object.entries(groupedSpecialties).map(([pillar, specs]) => (
                  <div key={pillar}>
                    <span className="text-xs font-semibold text-muted-foreground">{pillar}</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {specs.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy specialties (for old applications) */}
          {application.specialties && application.specialties.length > 0 && !application.pillar_specialties?.length && (
            <div>
              <span className="font-medium text-muted-foreground">Specialties (Legacy)</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {application.specialties.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Motivation */}
          <Field label="Primary Join Reason" value={application.primary_join_reason} />
          <Field label="Commitment Level" value={application.commitment_level} />
          <Field label="Start Timeline" value={application.start_timeline} />
          <Field label="What Excites Them" value={application.excitement_note} />

          {/* Legacy fields (only if present and new fields empty) */}
          {!application.coach_background && <Field label="Experience" value={application.experience_years ? `${application.experience_years} years` : null} />}
          {!application.coach_background && <Field label="Certifications" value={application.certifications} />}
          {!application.primary_join_reason && <Field label="Why Galoras" value={application.why_galoras} />}

          <Field label="Booking Link" value={(application as any).booking_url} link />
          <Field label="Website" value={application.website_url} link />
          <Field label="LinkedIn" value={application.linkedin_url} link />
          <Field label="Submitted" value={format(new Date(application.created_at), "MMM d, yyyy 'at' h:mm a")} />
          {application.reviewed_at && (
            <Field label="Reviewed" value={format(new Date(application.reviewed_at), "MMM d, yyyy 'at' h:mm a")} />
          )}
          {application.reviewer_notes && (
            <Field label="Reviewer Notes" value={application.reviewer_notes} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}</span>
      <p className="mt-0.5">
        {link ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline">{value}</a>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function ArrayField({ label, values }: { label: string; values: string[] | null | undefined }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary">{v}</Badge>
        ))}
      </div>
    </div>
  );
}
