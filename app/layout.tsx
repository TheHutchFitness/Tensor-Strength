import type { Metadata } from "next";
import "./globals.css";
import AnnouncementBanner from "@/components/AnnouncementBanner";

export const metadata: Metadata = {
  title: "Tensor Strength — Strength & Performance Coaching",
  description:
    "Tensor Strength builds stronger, more capable athletes through expert coaching, proven training methods, and a no-BS approach to fitness.",
  openGraph: {
    title: "Tensor Strength — Strength & Performance Coaching",
    description:
      "Build stronger, more capable athletes. Expert coaching, proven methods, no BS.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);',
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[#07021c]" />
        </div>
        <AnnouncementBanner />
        {children}
      </body>
    </html>
  );
}
