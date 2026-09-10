import Navbar from "@/components/Navbar";
import Announcement from "@/components/Announcement";
import Hero from "@/components/Hero";
import About from "@/components/About";
import PRBoard from "@/components/PRBoard";
import Content from "@/components/Content";
import ProgramFinder from "@/components/ProgramFinder";
import Pricing from "@/components/Pricing";
import CustomProgram from "@/components/CustomProgram";
import MarketingExtras from "@/components/MarketingExtras";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";
import MemberHub from "@/components/MemberHub";

export default function Home() {
  return (
    <>
      <Navbar />
      <Announcement />
      <main>
        <MemberHub />
        <Hero />
        <About />
        <PRBoard />
        <Content />
        <ProgramFinder />
        <Pricing />
        <MarketingExtras />
        <CustomProgram />
        <ContactForm />
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
