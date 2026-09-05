"use client";

import { useState } from "react";

type Gym = {
  id: number;
  name: string;
  address: string;
  distanceKm: number;
  mapsUrl: string;
};

type State = "idle" | "locating" | "searching" | "done" | "denied" | "error";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyGyms() {
  const [state, setState] = useState<State>("idle");
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [radiusKm, setRadiusKm] = useState(15);
  const [facility, setFacility] = useState<"gym" | "martial" | "climbing" | "complex">("gym");

  function buildQuery(lat: number, lon: number) {
    const r = radiusKm * 1000;
    const a = (sel: string) => `  node${sel}(around:${r},${lat},${lon});\n  way${sel}(around:${r},${lat},${lon});`;
    let lines: string[] = [];
    if (facility === "gym") {
      lines = [
        a('["leisure"="fitness_centre"]'),
        a('["amenity"="gym"]'),
        a('["sport"="fitness"]'),
        a('["club"="fitness"]'),
      ];
    } else if (facility === "martial") {
      lines = [
        a('["sport"~"martial_arts|boxing|judo|karate|taekwondo|kickboxing|mma|jiu_jitsu"]'),
        a('["leisure"="sports_centre"]["sport"~"martial_arts|boxing|judo|karate"]'),
      ];
    } else if (facility === "climbing") {
      lines = [
        a('["sport"="climbing"]'),
        a('["leisure"="climbing"]'),
        a('["leisure"="sports_centre"]["sport"="climbing"]'),
      ];
    } else {
      lines = [
        a('["leisure"="sports_centre"]'),
        a('["leisure"="stadium"]'),
        a('["leisure"="sports_complex"]'),
      ];
    }
    return `[out:json][timeout:25];\n(\n${lines.join("\n")}\n);\nout center 300;`;
  }

  async function findGyms() {
    if (!navigator.geolocation) {
      setState("error");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setState("searching");
        const query = buildQuery(lat, lon);
        try {
          const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
          });
          const data = await res.json();
          const seen = new Set<string>();
          const list: Gym[] = (data.elements || [])
            .map((el: any) => {
              const t = el.tags || {};
              const name = t.name;
              if (!name) return null;
              const glat = el.lat ?? el.center?.lat;
              const glon = el.lon ?? el.center?.lon;
              if (glat == null || glon == null) return null;
              const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"]]
                .filter(Boolean)
                .join(" ");
              return {
                id: el.id,
                name,
                address,
                distanceKm: haversine(lat, lon, glat, glon),
                mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  name + " " + address
                )}`,
              } as Gym;
            })
            .filter((g: Gym | null): g is Gym => {
              if (!g) return false;
              if (g.distanceKm > radiusKm) return false;
              const key = g.name.toLowerCase() + Math.round(g.distanceKm * 10);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .sort((a: Gym, b: Gym) => a.distanceKm - b.distanceKm)
            .slice(0, 30);
          setGyms(list);
          setState("done");
        } catch {
          setState("error");
        }
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    );
  }

  const busy = state === "locating" || state === "searching";

  return (
    <div className="mt-10 bg-ink/20 border border-bone/10 p-6 md:p-10">
      <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-3">
        Gyms Near You
      </p>
      <h3 className="glow font-display uppercase text-2xl md:text-3xl font-700 leading-tight">
        Find a place <span className="text-electric">to train.</span>
      </h3>
      <p className="mt-3 text-bone/70 leading-relaxed max-w-xl text-sm">
        Tap the button and we&apos;ll pull up gyms and fitness centers closest to you.
        We only use your location to build the list — nothing is stored.
      </p>

      {/* Facility type */}
      <div className="mt-6">
        <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-2">Type of facility</p>
        <div className="flex flex-wrap gap-2">
          {([
            { id: "gym", label: "Regular Gyms" },
            { id: "martial", label: "Martial Arts" },
            { id: "climbing", label: "Rock Climbing" },
            { id: "complex", label: "Sports Complexes" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFacility(t.id)}
              className={
                "px-3 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
                (facility === t.id ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:border-electric hover:text-electric")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Distance */}
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-2">Search distance</p>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20, 25].map((km) => (
            <button
              key={km}
              onClick={() => setRadiusKm(km)}
              className={
                "px-3 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
                (radiusKm === km ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:border-electric hover:text-electric")
              }
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={findGyms}
        disabled={busy}
        className="mt-6 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60"
      >
        {state === "locating"
          ? "Getting your location…"
          : state === "searching"
          ? "Finding places…"
          : gyms.length
          ? "Search again"
          : "Find places near me"}
      </button>

      {state === "denied" && (
        <p className="mt-5 text-sm text-bone/60">
          Location access was blocked. Enable location for this site in your browser
          settings, then try again.
        </p>
      )}
      {state === "error" && (
        <p className="mt-5 text-sm text-bone/60">
          Couldn&apos;t load gyms right now. Please try again in a moment.
        </p>
      )}
      {state === "done" && gyms.length === 0 && (
        <p className="mt-5 text-sm text-bone/60">
          No places found within ~{radiusKm}&nbsp;km. Try a wider distance or a different spot.
        </p>
      )}

      {gyms.length > 0 && (
        <ul className="mt-8 grid gap-3">
          {gyms.map((g, i) => (
            <li key={g.id}>
              <a
                href={g.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 border border-bone/15 bg-ink/30 p-4 hover:border-electric transition-colors"
              >
                <span className="font-display text-electric text-lg w-8 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display uppercase tracking-wider text-bone block truncate">
                    {g.name}
                  </span>
                  {g.address && (
                    <span className="block text-xs text-bone/50 mt-0.5 truncate">
                      {g.address}
                    </span>
                  )}
                </span>
                <span className="font-display uppercase text-sm text-bone/70 shrink-0">
                  {g.distanceKm < 1
                    ? `${Math.round(g.distanceKm * 1000)} m`
                    : `${g.distanceKm.toFixed(1)} km`}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
