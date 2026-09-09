import Navbar from "@/components/Navbar";
import Announcement from "@/components/Announcement";
import Hero from "@/components/Hero";
import About from "@/components/About";
import CoachingShowcase from "@/components/CoachingShowcase";
import Professionals from "@/components/Professionals";
import PRBoard from "@/components/PRBoard";
import HutchTouch from "@/components/HutchTouch";
import Content from "@/components/Content";
import FitEffectCard from "@/components/FitEffectCard";
import ProgramFinder from "@/components/ProgramFinder";
import Pricing from "@/components/Pricing";
import CustomProgram from "@/components/CustomProgram";
import EmailCapture from "@/components/EmailCapture";
import MarketingExtras from "@/components/MarketingExtras";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Announcement />
      <main>
        <Hero />
        <About />
        <CoachingShowcase />
        <Professionals />
        <PRBoard />
        <HutchTouch mode="public" />
        <Content />
        <FitEffectCard />
        <ProgramFinder />
        <Pricing />
        <MarketingExtras />
        <CustomProgram />
        <EmailCapture />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
