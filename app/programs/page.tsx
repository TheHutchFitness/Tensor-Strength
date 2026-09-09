"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WeeklyPrograms from "@/components/WeeklyPrograms";

export default function ProgramsPage() {
  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <WeeklyPrograms mode="public" />
      </main>
      <Footer />
    </>
  );
}
