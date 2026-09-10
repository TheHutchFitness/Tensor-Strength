import Navbar from "@/components/Navbar";
import Announcement from "@/components/Announcement";
import Content from "@/components/Content";
import Pricing from "@/components/Pricing";
import MarketingExtras from "@/components/MarketingExtras";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";
import MemberHub from "@/components/MemberHub";

// Logged-in member home = a lean hub. All the heavy marketing (Hero, About,
// PR board, program finder, custom program, contact) lives on the public
// landing page for logged-out visitors. Members get: their hub, the library,
// a short "why upgrade" (pricing), and the honest stats/FAQ.
export default function Home() {
  return (
    <>
      <Navbar />
      <Announcement />
      <main>
        <MemberHub />
        <Content />
        <Pricing />
        <MarketingExtras />
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
