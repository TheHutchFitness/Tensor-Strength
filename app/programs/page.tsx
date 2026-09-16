"use client";

import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";
import WeeklyPrograms from "../../src/components/WeeklyPrograms";
import HutchTouch from "../../src/components/HutchTouch";
import SiteTabBar from "../../src/components/SiteTabBar";

export default function ProgramsPage() {
  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <WeeklyPrograms mode="public" />
        <HutchTouch mode="public" />
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
