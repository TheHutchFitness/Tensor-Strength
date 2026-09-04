// ============================================================================
// CLIENT RESOURCES — PDFs for active clients
// ----------------------------------------------------------------------------
// These show up in the Client Portal (/clients) behind the passcode gate.
//
// To add a PDF for your clients:
//   1. Send the PDF to your Sintra helper in chat (or upload it to get a
//      public URL). Your helper will upload it and hand back a public link.
//   2. Add an object to the array below with the title, description, and
//      that public URL.
//   3. Save. The PDF appears in the Client Portal after the next publish.
//
// To remove one, delete its object from the array and re-publish.
//
// These are gated by the Client Portal passcode — only clients you've given
// the passcode to can see them. (Reminder: it's a light gate, not real
// security — don't put highly sensitive personal data here.)
// ============================================================================

export type ClientResource = {
  title: string;
  description: string;
  url: string;
};

export const clientResources: ClientResource[] = [
  // Example entry — replace or remove:
  // {
  //   title: "In-Person Orientation Guide",
  //   description: "What to expect, what to bring, and how your first session will run.",
  //   url: "https://example.com/orientation-guide.pdf",
  // },
];
