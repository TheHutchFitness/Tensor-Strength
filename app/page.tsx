import Navbar from "@/components/Navbar";
import Announcement from "@/components/Announcement";
import Hero from "@/components/Hero";
import About from "@/components/About";
import CoachingShowcase from "@/components/CoachingShowcase";
import PRBoard from "@/components/PRBoard";
import Content from "@/components/Content";
import FitEffectCard from "@/components/FitEffectCard";
import ProgramFinder from "@/components/ProgramFinder";
import Pricing from "@/components/Pricing";
import CustomProgram from "@/components/CustomProgram";
import MarketingExtras from "@/components/MarketingExtras";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";

export default function Home() {
  return (
    <>
      <Navbar />
      <Announcement />
      <main>
        <Hero />
        <About />
        <CoachingShowcase />
        <PRBoard />
        <Content />
        <FitEffectCard />
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
