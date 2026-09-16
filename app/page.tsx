import Navbar from "../src/components/Navbar";
import Announcement from "../src/components/Announcement";
import Content from "../src/components/Content";
import Pricing from "../src/components/Pricing";
import MarketingExtras from "../src/components/MarketingExtras";
import Footer from "../src/components/Footer";
import SiteTabBar from "../src/components/SiteTabBar";
import MemberHub from "../src/components/MemberHub";
import PortalAutoOpen from "../src/components/PortalAutoOpen";
import UnpaidOnly from "../src/components/UnpaidOnly";

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
