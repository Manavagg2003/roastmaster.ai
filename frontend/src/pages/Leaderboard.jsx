import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import { Skull, Trophy } from "lucide-react";

export default function Leaderboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/roasts/leaderboard")
      .then((r) => setItems(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA]">
      <Navbar/>
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-12">
        <span className="label-tag">Archive · Public</span>
        <h1 className="font-display uppercase text-6xl md:text-8xl leading-[0.9] tracking-tight mt-3">
          Hall of <span className="text-[#FF3B30]">Shame</span>
        </h1>
        <p className="font-serif-italic text-xl text-[#A1A1AA] mt-3 max-w-xl">
          The worst startup ideas ever submitted. Ranked from trash to slightly-less-trash.
        </p>

        <div className="mt-10 border border-[#27272A]">
          <div className="grid grid-cols-12 border-b border-[#27272A] bg-[#0A0A0A] px-4 md:px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#71717A]">
            <div className="col-span-1">Rank</div>
            <div className="col-span-7 md:col-span-7">Idea</div>
            <div className="col-span-2 hidden md:block">Roasted by</div>
            <div className="col-span-4 md:col-span-2 text-right">Score</div>
          </div>

          {loading && <div className="p-8 text-center text-[#A1A1AA]">Loading disasters...</div>}
          {!loading && items.length === 0 && (
            <div className="p-10 text-center">
              <Skull className="h-10 w-10 mx-auto text-[#71717A]"/>
              <p className="mt-3 text-[#A1A1AA] font-serif-italic text-xl">No public disasters yet. Be the first.</p>
              <Link to="/" data-testid="leaderboard-empty-cta" className="btn-brutal mt-5 inline-flex">Roast an idea</Link>
            </div>
          )}

          {items.map((it, idx) => {
            const c = it.score <= 3 ? "#FF3B30" : it.score <= 6 ? "#FF6B22" : "#32D74B";
            return (
              <Link
                to={`/roast/${it.id}`}
                key={it.id}
                data-testid={`leaderboard-row-${idx}`}
                className="grid grid-cols-12 items-center gap-2 border-b border-[#27272A] last:border-b-0 px-4 md:px-6 py-5 hover:bg-[#0A0A0A] transition-colors"
              >
                <div className="col-span-1 font-display text-3xl md:text-5xl text-[#71717A] leading-none">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div className="col-span-7 md:col-span-7 min-w-0">
                  <p className="font-display uppercase text-xl md:text-2xl tracking-tight truncate">
                    {it.startup_name || "Unnamed"}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-1 font-serif-italic line-clamp-2">
                    &ldquo;{it.one_liner}&rdquo;
                  </p>
                </div>
                <div className="col-span-2 hidden md:block text-xs text-[#71717A] uppercase tracking-[0.2em]">
                  {it.user_name}
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                  <span className="font-display text-4xl md:text-5xl" style={{ color: c }}>
                    {it.score}
                  </span>
                  <span className="font-display text-lg text-[#71717A]">/10</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Trophy className="h-6 w-6 mx-auto text-[#FFD60A]"/>
          <p className="mt-2 text-sm text-[#A1A1AA]">Think you can do worse? Submit your idea.</p>
          <Link to="/" data-testid="leaderboard-cta" className="btn-brutal mt-4 inline-flex">
            Submit yours
          </Link>
        </div>
      </div>
    </div>
  );
}
