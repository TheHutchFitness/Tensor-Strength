// ============================================================================
// PROFESSIONALS
// ----------------------------------------------------------------------------
// To add a new trainer or professional, copy one object in the array below,
// change the fields, and save. The home page card AND the individual profile
// page at /professionals/[slug] are generated automatically — no other code
// needs to change.
//
// Fields:
//   slug          URL path segment (lowercase, no spaces) — used for the
//                 profile page link, e.g. "hutch" -> /professionals/hutch
//   name          Display name
//   title         Role / title shown under the name
//   photo         Image URL (portrait / action shot)
//   location      Where they coach
//   shortBio      One-liner for the home page card
//   bio           Full paragraphs for the profile page
//   credentials   Bullet list for the profile page
//   specialties   Tag list for the profile page
//   testimonials  Client testimonials { quote, name, detail, highlight,
//                 highlightLabel } — shown on the profile page, and the first
//                 few are featured on the home page for the founder
// ============================================================================

export type Testimonial = {
  quote: string;
  name: string;
  detail: string;
  highlight: string;
  highlightLabel: string;
};

export type Professional = {
  slug: string;
  name: string;
  title: string;
  photo: string;
  location: string;
  shortBio: string;
  bio: string[];
  credentials: string[];
  specialties: string[];
  testimonials: Testimonial[];
  videoTestimonial?: {
    src: string;
    poster?: string;
    name?: string;
    detail?: string;
  };
};

export const professionals: Professional[] = [
  {
    slug: "hutch",
    name: "Hutch",
    title: "Founder · Currently training at The Fit Effect, Paris ON",
    photo:
      "https://us.chat-img.sintra.ai/0d1255aa-5bdd-49c7-9b93-64af3dfc8e4f/e1af4534-8dc1-462e-92df-7d2eb92de149/image.png?w=1024&h=1024",
    location: "Paris, ON — The Fit Effect",
    shortBio:
      "15+ years of strength and performance coaching. Founder of Tensor Strength, head trainer at The Fit Effect, and the coach behind every program that leaves this site.",
    bio: [
      "Hutch is the founder of Tensor Strength and the head trainer behind the brand's no-BS approach to building stronger, more capable athletes. He coaches in person at The Fit Effect in Paris, Ontario, and remotely for athletes everywhere.",
      "His coaching spans the full range — high school athletes chasing scholarship strength, powerlifters working toward meet-day PRs, adults rebuilding from injury, and older clients who want to stay strong and capable for life. The common thread: proven programming, intelligent progression, and honest feedback that meets you where you are and pushes you to where you said you wanted to go.",
      "Every custom program is built by Hutch himself. No templates, no handoffs. The Tensor Strength brand exists to take that same standard and scale it — so more athletes can train under a system that actually works.",
    ],
    credentials: [
      "Founder, Tensor Strength",
      "Head Trainer, The Fit Effect (Paris, ON)",
      "15+ years experience across all levels",
      "Specialist in strength, powerlifting, and athletic performance",
      "Custom 12-week program design — built per athlete, never templated",
      "Remote coaching for athletes everywhere",
      "Coaches high school athletes through to elderly clients",
    ],
    specialties: [
      "Strength & Powerlifting",
      "Athletic Performance",
      "Hypertrophy",
      "Return-from-Injury",
      "Older Adult Training",
    ],
    videoTestimonial: {
      src: "/videos/hutch-testimonial.mp4",
      poster: "/videos/hutch-testimonial-poster.jpg",
      name: "Jimmy McCullough",
      detail: "@jimmymcculloughfitness",
    },
    testimonials: [
      {
        quote:
          "Completed my testing today and had an incredible result. I finished 2nd doing 225lbs bench press for 20 reps — the only person who beat me was a 24-year-old.",
        name: "Nolan Ayres",
        detail: "1st-Year York Football",
        highlight: "225 lb × 20",
        highlightLabel: "Bench Press",
      },
      {
        quote:
          "I trained with Hutch for 8 sessions and in that short time managed to improve enough that I passed my Air Force firefighter physical testing, improving my score significantly from the first time I tried the test.",
        name: "Rachel",
        detail: "Air Force Firefighter Candidate",
        highlight: "8 sessions",
        highlightLabel: "To pass testing",
      },
      {
        quote:
          "I contacted Hutch with the goal of losing 80lbs. Upon first meeting, Hutch informed me that he wouldn't do that because it's unhealthy and would lead to issues like loose skin and a lack of energy. 3 months later I am down 22lbs and feel the best I have in a long time. I'm also back to playing badminton — something Hutch made an effort to practice with me for extra motivation.",
        name: "Karina Oliviara",
        detail: "Down 22 lbs in 3 months",
        highlight: "22 lb down",
        highlightLabel: "In 3 months",
      },
      {
        quote:
          "Since training I have gained 10lbs of muscle and went from deadlifting 45lbs to 200lbs and improved my mobility all while getting rid of an old nagging shoulder pain... in my 40s.",
        name: "Kat Graham",
        detail: "10 lb muscle gained · 45 → 200 lb deadlift",
        highlight: "200 lb DL",
        highlightLabel: "From 45 lb",
      },
    ],
  },
];
