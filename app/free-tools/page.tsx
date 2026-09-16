"use client";

import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";
import Tools from "../../src/components/Tools";
import SiteTabBar from "../../src/components/SiteTabBar";

export default function FreeToolsPage() {
  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <Tools />
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
