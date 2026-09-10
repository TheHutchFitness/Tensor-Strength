"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Tools from "@/components/Tools";
import SiteTabBar from "@/components/SiteTabBar";

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
