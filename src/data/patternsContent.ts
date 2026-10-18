// Content for /coaching/is-coaching-for-me (18 Oct 2026).
// Edit the words here; the page layout reads from these arrays and does not need changing.
// Source: Galoras Personality, Behavioural Patterns and Adaptive Coaching Framework v0.1
// (project knowledge base). Public copy uses plain situations, never trait labels or scores.

export type Pattern = {
  id: string;
  headline: string; // "You get things done."
  turn: string; // "But struggle to switch off."
  body: string;
  coachingFocus: string; // shown when the visitor picks this card
};

export const PATTERNS: Pattern[] = [
  {
    id: "switch-off",
    headline: "You get things done.",
    turn: "But struggle to switch off.",
    body: "You take responsibility, follow through and hold yourself to high standards. Sometimes that means everything feels urgent, even when it isn’t.",
    coachingFocus: "Telling real urgency from the pressure you put on yourself",
  },
  {
    id: "ideas-start",
    headline: "You have great ideas.",
    turn: "But struggle to start.",
    body: "You can see possibilities and picture a different future. Turning those ideas into steady action is harder.",
    coachingFocus: "Turning one idea into a first step you actually take",
  },
  {
    id: "overthink",
    headline: "You think things through.",
    turn: "Sometimes too much.",
    body: "You make careful decisions and weigh the consequences. Now and then, thinking becomes a substitute for acting.",
    coachingFocus: "Knowing when you have enough to decide",
  },
  {
    id: "say-no",
    headline: "You care about people.",
    turn: "But find it hard to say no.",
    body: "You’re supportive and dependable. Your own priorities can end up at the bottom of the list.",
    coachingFocus: "Saying no without damaging the relationship",
  },
  {
    id: "never-satisfied",
    headline: "You’re ambitious.",
    turn: "But rarely feel satisfied.",
    body: "You keep raising the bar. Even when things go well, you’re already on to what’s next.",
    coachingFocus: "Setting goals that are yours, and noticing when you’ve met them",
  },
  {
    id: "consistency",
    headline: "You adapt easily.",
    turn: "But struggle with consistency.",
    body: "You respond well to change and dislike needless rigidity. Keeping a routine going is the hard part.",
    coachingFocus: "Commitments that flex without falling away",
  },
  {
    id: "ask-help",
    headline: "You figure things out yourself.",
    turn: "But rarely ask for help.",
    body: "You’re resourceful and self-reliant. It can mean carrying more than you need to, for longer than you need to.",
    coachingFocus: "Knowing what to hand off, and to whom",
  },
  {
    id: "hard-conversations",
    headline: "You keep things running smoothly.",
    turn: "But avoid the difficult conversation.",
    body: "You value harmony and good working relationships. The conversation you need to have keeps getting pushed to next week.",
    coachingFocus: "Preparing for, and having, the conversation you’ve been putting off",
  },
  {
    id: "stuck-success",
    headline: "You’ve done well.",
    turn: "But feel stuck on what’s next.",
    body: "From the outside it’s working. You’re less sure it’s still the right direction, and you haven’t made a move.",
    coachingFocus: "Getting clear on what you want next, and testing it",
  },
];

export type Spectrum = {
  id: string;
  theme: string; // plain-language name of the dimension
  ends: [
    { label: string; helps: string; hinders: string },
    { label: string; helps: string; hinders: string },
  ];
};

// Each spectrum shows both ends. Neither end is better; each has a cost.
export const SPECTRA: Spectrum[] = [
  {
    id: "finishing",
    theme: "Getting things done",
    ends: [
      { label: "Finish it now", helps: "Reliable, disciplined, follows through", hinders: "Hard to switch off; everything feels urgent" },
      { label: "Go with the flow", helps: "Flexible, relaxed under change", hinders: "Things slip; follow-through is uneven" },
    ],
  },
  {
    id: "deciding",
    theme: "Making decisions",
    ends: [
      { label: "Think it through", helps: "Careful, well-reasoned decisions", hinders: "Overthinking; decisions wait too long" },
      { label: "Act on it", helps: "Creates momentum; gets things moving", hinders: "Acting before reflecting" },
    ],
  },
  {
    id: "people",
    theme: "Working with people",
    ends: [
      { label: "Keep the peace", helps: "Builds trust and strong relationships", hinders: "Hard to set boundaries or say no" },
      { label: "Say it straight", helps: "Clear, direct, independent-minded", hinders: "Friction that didn’t need to happen" },
    ],
  },
  {
    id: "help",
    theme: "Asking for help",
    ends: [
      { label: "Do it yourself", helps: "Resourceful and self-reliant", hinders: "Carrying too much; slow to ask" },
      { label: "Lean on others", helps: "Collaborative; uses support well", hinders: "Waiting for others to move first" },
    ],
  },
  {
    id: "ambition",
    theme: "Ambition",
    ends: [
      { label: "Raise the bar", helps: "Drives achievement and high standards", hinders: "Never quite satisfied; risk of burnout" },
      { label: "Content where you are", helps: "Balance and perspective", hinders: "Goals you want but don’t pursue" },
    ],
  },
  {
    id: "risk",
    theme: "Taking risks",
    ends: [
      { label: "Play it safe", helps: "Protects what matters", hinders: "Missed opportunities" },
      { label: "Go for it", helps: "Spots and takes opportunities", hinders: "Risks that weren’t worth it" },
    ],
  },
];

export const HOW_COACHING_HELPS = [
  { title: "Recognise the pattern", body: "Name what keeps happening, in your words, with real examples from your week." },
  { title: "See when it helps and when it doesn’t", body: "The same habit that serves you at work can cost you at home, or the other way round." },
  { title: "Try a different response", body: "Explore other ways to handle the moment, without pretending to be someone you’re not." },
  { title: "Choose one thing to do", body: "Leave each session with a small, specific step you’ve chosen yourself." },
  { title: "Look at what happened", body: "Next time, you and your coach see what worked, what got in the way and what to adjust." },
];

export const SCENARIOS = [
  { situation: "You answer every email the moment it arrives, evenings included.", coaching: "Coaching can help you tell genuine urgency from habit, and set boundaries you can keep." },
  { situation: "You’ve wanted to change careers for six months and haven’t taken the first step.", coaching: "Coaching can help you find what’s really in the way and set a first step small enough to take this week." },
  { situation: "You’ve been promoted to lead people you used to work beside.", coaching: "Coaching can help you work out what changes, what doesn’t, and how to have the first hard conversation." },
  { situation: "You run your own business and every decision ends up with you.", coaching: "Coaching can help you decide what only you should do, and what to hand over." },
  { situation: "You rewrite the same document five times before anyone sees it.", coaching: "Coaching can help you decide what ‘good enough to share’ means, and practise sharing earlier." },
  { situation: "You said yes to three extra projects this quarter. Your own goal hasn’t moved.", coaching: "Coaching can help you protect time for what matters to you without letting people down." },
];

export const FAQ = [
  { q: "Can coaching help with procrastination?", a: "Often, yes. A coach helps you find what’s behind the delay, whether that’s an unclear goal, a fear of getting it wrong, or too much on your plate, and agree a first step small enough to take." },
  { q: "Can coaching help with overthinking decisions?", a: "Yes. Coaching won’t make the decision for you. It helps you see what information you actually need, set yourself a point to decide by, and act on it." },
  { q: "I can’t switch off from work. Is that something a coach works on?", a: "It’s one of the most common reasons people come to coaching. You’ll look at where the pressure comes from and try small changes in how you plan, respond and stop." },
  { q: "Is coaching the same as therapy?", a: "No. Coaching is practical and forward-looking: it focuses on goals, choices and actions in your work and life. If you’re struggling with your mental health, please speak to a doctor or a qualified therapist." },
  { q: "Do I need to take a personality test?", a: "No. There’s no test and no score. You and your coach work from what’s actually happening in your work and life." },
];
