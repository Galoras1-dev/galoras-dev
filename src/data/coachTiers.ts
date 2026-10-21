// Coach plans: the single source for the Pricing page AND the tier step in
// coach onboarding. Signed off 20 Oct 2026 (Pricing and Packaging v1.1).
// Change prices or features here and both screens change together.

export type CoachTierKey = "pro" | "elite" | "master";

export type CoachTier = {
  key: CoachTierKey;
  name: string;
  list: string;
  founding: string;
  forWho: string;
  highlight?: boolean;
  /** Short list for the onboarding tier step. */
  headlineFeatures: string[];
  /** Full list for the Pricing page. */
  features: string[];
};

export const COACH_TIERS: CoachTier[] = [
  {
    key: "pro",
    name: "Pro",
    list: "$49",
    founding: "$34",
    forWho: "Coaches building a practice",
    headlineFeatures: [
      "AI-written profile and matching with reasons",
      "Booking, payments and video on Galoras",
      "Sessions turned into actions, plus a brief before each one",
    ],
    features: [
      "A profile written by AI from five questions and your CV",
      "Matched to clients on what they want to change, with the reasons shown",
      "Booking, payments and video sessions on Galoras",
      "Each session turned into actions your client confirms",
      "A brief before every session: goals, actions and what's moving",
      "A check-in for your client between sessions",
    ],
  },
  {
    key: "elite",
    name: "Elite",
    list: "$99",
    founding: "$69",
    forWho: "Established coaches who want to grow",
    highlight: true,
    headlineFeatures: [
      "Everything in Pro",
      "Intro video on your profile",
      "Priority when Galoras introduces new clients",
    ],
    features: [
      "Everything in Pro",
      "An intro video on your profile",
      "Priority when Galoras introduces new clients",
      "Apply to write for or appear in Leadership Labs",
      "Send a plan or exercise to many clients at once (during 2027)",
    ],
  },
  {
    key: "master",
    name: "Master",
    list: "$197",
    founding: "$138",
    forWho: "Senior coaches and operators who want enterprise work",
    headlineFeatures: [
      "Everything in Elite",
      "First priority for introductions, featured on the homepage",
      "Meta Team accreditation pathway and enterprise work",
    ],
    features: [
      "Everything in Elite",
      "First priority for Galoras introductions",
      "Featured on the homepage and in Leadership Labs",
      "Meta Team accreditation pathway (ICF-accredited; course fee applies)",
      "Eligible to deliver Galoras Enterprise engagements",
      "A named support contact",
    ],
  },
];
