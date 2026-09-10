// The Library content shown on the member home page (/). Add new information
// packages (PDFs), articles, or information videos here and they'll appear
// automatically in their subsection.

export type LibraryPackage = {
  tag: string;
  title: string;
  description?: string;
  href: string; // PDF url
};

export type LibraryArticle = {
  tag: string;
  title: string;
  excerpt?: string;
  href?: string; // link (internal or external); optional
};

export type LibraryVideo = {
  title: string;
  description?: string;
  src?: string; // direct mp4/webm url -> renders an inline <video>
  poster?: string; // thumbnail for src videos
  href?: string; // external link (e.g. YouTube) if not an inline video
};

// Downloadable information packages (branded Tensor Strength PDFs).
export const packages: LibraryPackage[] = [
  {
    tag: "Training",
    title: "Accessory lifts build the main lifts",
    description: "Why the work around your squat, bench, and deadlift decides how far they go.",
    href: "/library/tensor-strength-accessory-lifts.pdf",
  },
  {
    tag: "Mindset",
    title: "Consistency drives progress",
    description: "How showing up and repeating the basics beats chasing the perfect program.",
    href: "/library/tensor-strength-consistency.pdf",
  },
  {
    tag: "Programming",
    title: "Progressive overload without destroying your joints",
    description: "Add stress intelligently — change the tool before it starts beating you up.",
    href: "/library/tensor-strength-progressive-overload.pdf",
  },
];

// Written articles. Empty for now — add entries as they're published.
export const articles: LibraryArticle[] = [];

// Information / breakdown videos. Empty for now — add entries as they're published.
export const videos: LibraryVideo[] = [];
