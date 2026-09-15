import Navbar from "@/components/Navbar";
import Announcement from "@/components/Announcement";
import Content from "@/components/Content";
import Pricing from "@/components/Pricing";
import MarketingExtras from "@/components/MarketingExtras";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";
import MemberHub from "@/components/MemberHub";
import PortalAutoOpen from "@/components/PortalAutoOpen";
import UnpaidOnly from "@/components/UnpaidOnly";

// Logged-in member home = a lean hub. Paid members see just their hub; the
// "why upgrade" marketing (pricing, stats/FAQ, library pitch) only shows to
// logged-in users who haven't purchased yet, so the app stays uncluttered.
export default function Home() {
  return (
    <>
      <PortalAutoOpen />
      <Navbar />
      <Announcement />
      <main>
        <MemberHub />
        <UnpaidOnly>
          <Content />
          <Pricing />
          <MarketingExtras />
        </UnpaidOnly>
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
