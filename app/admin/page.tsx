"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type User = {
  id: string;
  username: string;
  email: string;
  role: "member" | "admin";
  portalAccess: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = "/login?from=/admin";
        return;
      }
      const { user } = await me.json();
      if (user.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setAuthorized(true);
      await loadUsers();
      setLoading(false);
    })();
  }, []);

  async function togglePortal(u: User) {
    setBusyId(u.id);
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, portalAccess: !u.portalAccess }),
    });
    await loadUsers();
    setBusyId(null);
  }

  async function removeUser(u: User) {
    if (!confirm(`Delete ${u.username}? This can't be undone.`)) return;
    setBusyId(u.id);
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id }),
    });
    await loadUsers();
    setBusyId(null);
  }

  const members = users.filter((u) => u.role !== "admin");
  const approved = members.filter((u) => u.portalAccess).length;

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
            Admin
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Member <span className="text-electric">access.</span>
          </h1>
          <p className="mt-5 text-bone/70 leading-relaxed max-w-xl">
            Every registered member can browse the site. Flip the switch to grant
            or revoke access to the <span className="text-electric">Client Portal</span>.
          </p>

          {loading || !authorized ? (
            <p className="mt-12 font-display uppercase tracking-wider text-bone/50">
              Loading…
            </p>
          ) : (
            <>
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="border border-bone/15 bg-ink/30 p-5">
                  <p className="font-display text-3xl text-electric font-700">{members.length}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">Members</p>
                </div>
                <div className="border border-bone/15 bg-ink/30 p-5">
                  <p className="font-display text-3xl text-electric font-700">{approved}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">Portal access</p>
                </div>
                <div className="border border-bone/15 bg-ink/30 p-5">
                  <p className="font-display text-3xl text-electric font-700">{members.length - approved}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">Pending</p>
                </div>
              </div>

              <div className="mt-10 border border-bone/15 bg-ink/20 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15">
                      <th className="text-left p-4 font-display">Username</th>
                      <th className="text-left p-4 font-display">Email</th>
                      <th className="text-left p-4 font-display">Joined</th>
                      <th className="text-left p-4 font-display">Portal Access</th>
                      <th className="text-right p-4 font-display">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-bone/50">
                          No members yet. Share the site so people can register.
                        </td>
                      </tr>
                    )}
                    {members.map((u) => (
                      <tr key={u.id} className="border-t border-bone/10">
                        <td className="p-4 text-bone/90 font-display uppercase tracking-wider">{u.username}</td>
                        <td className="p-4 text-bone/70">{u.email}</td>
                        <td className="p-4 text-bone/50 text-xs">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={
                              "inline-block px-3 py-1 text-[10px] font-display uppercase tracking-wider " +
                              (u.portalAccess
                                ? "bg-electric text-ink"
                                : "border border-bone/30 text-bone/60")
                            }
                          >
                            {u.portalAccess ? "Granted" : "Pending"}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => togglePortal(u)}
                            disabled={busyId === u.id}
                            className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-4 py-2 hover:bg-electric hover:text-ink transition-colors disabled:opacity-50"
                          >
                            {u.portalAccess ? "Revoke" : "Grant"}
                          </button>
                          <button
                            onClick={() => removeUser(u)}
                            disabled={busyId === u.id}
                            className="ml-2 font-display uppercase tracking-wider text-xs border border-bone/20 text-bone/60 px-4 py-2 hover:border-bone hover:text-bone transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
