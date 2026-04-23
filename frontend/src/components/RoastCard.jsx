import React, { forwardRef } from "react";
import { Flame, Skull } from "lucide-react";

const RoastCard = forwardRef(({ roast }, ref) => {
  if (!roast) return null;
  const scoreColor = roast.score <= 3 ? "#FF3B30" : roast.score <= 6 ? "#FF6B22" : "#32D74B";

  return (
    <div
      ref={ref}
      data-testid="roast-card-export"
      style={{ background: "#050505", color: "#FAFAFA" }}
      className="relative w-full max-w-[880px] mx-auto border border-[#27272A]"
    >
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-3 text-[10px] uppercase tracking-[0.25em] text-[#FFD60A]">
        <span className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5" /> Official Roast Report
        </span>
        <span className="text-[#71717A]">
          #{(roast.id || "").slice(0, 8).toUpperCase()} · {new Date(roast.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* header */}
      <div className="grid grid-cols-12 border-b border-[#27272A]">
        <div className="col-span-12 md:col-span-8 p-6 md:p-10 border-b md:border-b-0 md:border-r border-[#27272A]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#71717A] mb-3">Startup</p>
          <h2 className="font-display uppercase leading-[0.9] tracking-tight text-4xl md:text-5xl mb-4">
            {roast.startup_name || "Unnamed Venture"}
          </h2>
          <p className="font-serif-italic text-lg md:text-2xl text-[#FAFAFA]">
            &ldquo;{roast.one_liner}&rdquo;
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 p-6 md:p-10 flex flex-col justify-center items-start md:items-end">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#71717A] mb-1">Score</p>
          <div className="flex items-baseline gap-1">
            <span
              className="font-display leading-none"
              style={{ color: scoreColor, fontSize: "clamp(80px, 18vw, 160px)" }}
            >
              {roast.score}
            </span>
            <span className="font-display text-4xl text-[#71717A]">/10</span>
          </div>
        </div>
      </div>

      {/* verdict title */}
      <div className="bg-[#FF3B30] text-black px-6 py-3">
        <p className="font-display text-2xl md:text-3xl uppercase tracking-tight leading-none flex items-center gap-3">
          <Skull className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2.5} />
          {roast.verdict_title}
        </p>
      </div>

      {/* callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#27272A]">
        <div className="bg-[#050505] p-6 md:p-8">
          <p className="label-tag mb-4">5 Brutal Callouts</p>
          <ol className="space-y-4">
            {(roast.callouts || []).map((c, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-display text-2xl text-[#FF3B30] leading-none w-7 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-[#050505] p-6 md:p-8">
          <p className="label-tag mb-4" style={{ color: "#32D74B" }}>5 Reality Fixes</p>
          <ol className="space-y-4">
            {(roast.fixes || []).map((f, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-display text-2xl text-[#32D74B] leading-none w-7 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-[#27272A] px-6 py-3 text-[10px] uppercase tracking-[0.25em] text-[#71717A]">
        <span>Roasted by {roast.user_name}</span>
        <span className="text-[#FF3B30]">roastmaster.app</span>
      </div>
    </div>
  );
});

RoastCard.displayName = "RoastCard";
export default RoastCard;
