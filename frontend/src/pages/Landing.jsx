import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import PaywallModal from "../components/PaywallModal";
import Marquee from "react-fast-marquee";
import { Flame, ArrowRight, Skull, Trophy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [idea, setIdea] = useState("");
  const [startupName, setStartupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const handleRoast = async () => {
    if (!user) {
      localStorage.setItem("pending_idea", JSON.stringify({ idea, startupName }));
      toast("Login to unleash the roast.");
      nav("/signup");
      return;
    }
    if (idea.trim().length < 15) {
      toast.error("Idea too short. Give us at least 15 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/roast/generate", { idea, startup_name: startupName });
      setFlash(true);
      setTimeout(() => { setFlash(false); nav(`/roast/${data.id}`); }, 350);
    } catch (e) {
      if (e.response?.status === 402) {
        setPaywallOpen(true);
      } else {
        toast.error(e.response?.data?.detail || "Roast failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaySuccess = async () => {
    // After payment re-attempt
    try {
      setLoading(true);
      const { data } = await api.post("/roast/generate", { idea, startup_name: startupName });
      nav(`/roast/${data.id}`);
    } catch (e) {
      toast.error("Please try generating again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA]">
      {flash && <div className="flashbulb"/>}
      <Navbar />
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} onSuccess={handlePaySuccess} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#27272A]">
        <div className="absolute inset-0 grid-lines opacity-[0.07] pointer-events-none"/>
        <div className="absolute inset-0 grain"/>

        {/* marquee bar */}
        <div className="border-b border-[#27272A] bg-[#050505]">
          <Marquee speed={60} gradient={false} className="py-2">
            <span className="font-display uppercase tracking-widest text-[#FF3B30] text-sm mx-6">· Delusion Detected ·</span>
            <span className="font-display uppercase tracking-widest text-[#FFD60A] text-sm mx-6">· Reality Check ·</span>
            <span className="font-display uppercase tracking-widest text-[#FAFAFA] text-sm mx-6">· Zero Product-Market Fit ·</span>
            <span className="font-display uppercase tracking-widest text-[#FF3B30] text-sm mx-6">· Your TAM is a Myth ·</span>
            <span className="font-display uppercase tracking-widest text-[#FFD60A] text-sm mx-6">· Another Uber For X ·</span>
            <span className="font-display uppercase tracking-widest text-[#FAFAFA] text-sm mx-6">· Raise Less, Listen More ·</span>
          </Marquee>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 md:px-8 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="grid grid-cols-12 gap-6 md:gap-10 items-start">
            <div className="col-span-12 md:col-span-7">
              <div className="flex items-center gap-2 mb-5">
                <span className="label-tag">Vol. 01 · Issue 49</span>
                <span className="h-px flex-1 bg-[#27272A]"/>
                <span className="label-tag text-[#A1A1AA]">est. 2026</span>
              </div>
              <h1 className="font-display uppercase leading-[0.85] tracking-tight text-[56px] sm:text-[80px] md:text-[104px]">
                Your startup<br/>
                idea is <span className="text-[#FF3B30]">trash.</span><br/>
                <span className="font-serif-italic normal-case tracking-normal text-[44px] sm:text-[58px] md:text-[72px] font-normal">let us prove it.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base text-[#A1A1AA] leading-relaxed">
                An unhinged AI roastmaster shreds your pitch with a <span className="text-[#FAFAFA]">brutal score</span>, 5 savage callouts, and 5 reality-check fixes.
                One free roast. After that it&rsquo;s <span className="text-[#FFD60A]">₹49</span> per dose.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-[#71717A]">
                <span className="flex items-center gap-1.5"><Flame className="h-3 w-3 text-[#FF3B30]"/> Gemini 3 Flash</span>
                <span>·</span>
                <span className="flex items-center gap-1.5"><Skull className="h-3 w-3 text-[#FAFAFA]"/> Zero Mercy</span>
                <span>·</span>
                <span className="flex items-center gap-1.5"><Trophy className="h-3 w-3 text-[#FFD60A]"/> Hall of Shame</span>
              </div>
            </div>

            {/* Input card */}
            <div className="col-span-12 md:col-span-5">
              <div className="border border-[#27272A] bg-[#0A0A0A]">
                <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-3">
                  <span className="label-tag">Submit Your Idea</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] cursor-blink">AWAITING INPUT</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="label-tag">Startup Name (optional)</label>
                    <input
                      data-testid="landing-startup-name-input"
                      className="input-brutal mt-2"
                      placeholder="e.g. Uber for Goldfish"
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <div>
                    <label className="label-tag">Describe the idea</label>
                    <textarea
                      data-testid="landing-idea-textarea"
                      className="input-brutal mt-2 min-h-[160px] resize-y"
                      placeholder={"> What problem does it solve?\n> Who is the target market?\n> Why will anyone pay?\n\nBe detailed. Be delusional. We'll do the rest."}
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      maxLength={4000}
                    />
                    <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#71717A]">
                      <span>min 15 chars</span>
                      <span>{idea.length}/4000</span>
                    </div>
                  </div>

                  <button
                    data-testid="landing-roast-btn"
                    onClick={handleRoast}
                    disabled={loading}
                    className="btn-brutal w-full"
                  >
                    {loading ? "ROASTING..." : "ROAST MY IDEA"}
                    <ArrowRight className="h-5 w-5"/>
                  </button>

                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] text-center">
                    {user
                      ? user.used_free_roast
                        ? user.paid_roasts_balance > 0
                          ? `You have ${user.paid_roasts_balance} paid roast(s) left`
                          : "Next roast: ₹49"
                        : "Your first roast is free"
                      : "Sign up · First roast on the house"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
        <div className="flex items-center gap-3 mb-10">
          <span className="label-tag">01 // The Process</span>
          <span className="h-px flex-1 bg-[#27272A]"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#27272A] border border-[#27272A]">
          {[
            { n: "01", t: "Submit", d: "Paste your precious startup idea. Yes, even the 'AI for pets' one." },
            { n: "02", t: "Get Roasted", d: "Our AI roastmaster scores it 1–10 and writes 5 brutal callouts + 5 fixes." },
            { n: "03", t: "Share or Cry", d: "Download the zine-style card. Tweet it. Post it. Cry. Rebuild." },
          ].map((s) => (
            <div key={s.n} className="bg-[#050505] p-8 md:p-10">
              <div className="font-display text-[90px] leading-none text-[#FF3B30]">{s.n}</div>
              <h3 className="font-display uppercase text-3xl mt-2">{s.t}</h3>
              <p className="text-sm text-[#A1A1AA] mt-4 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING STRIP */}
      <section className="border-y border-[#27272A] bg-[#0A0A0A]">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 items-center">
          <div>
            <span className="label-tag">Pricing</span>
            <h3 className="font-display uppercase text-4xl md:text-5xl leading-none mt-2">
              First roast <span className="text-[#FFD60A]">free.</span>
            </h3>
            <p className="font-serif-italic text-xl mt-1 text-[#A1A1AA]">Then ₹49 per savage review.</p>
          </div>
          <div className="border border-[#27272A] p-6">
            <ul className="space-y-2 text-sm text-[#A1A1AA]">
              <li className="flex gap-2"><Flame className="h-4 w-4 text-[#FF3B30]"/> AI-generated score & verdict</li>
              <li className="flex gap-2"><Download className="h-4 w-4 text-[#FAFAFA]"/> Downloadable PNG roast card</li>
              <li className="flex gap-2"><Share2 className="h-4 w-4 text-[#FAFAFA]"/> Share anywhere</li>
              <li className="flex gap-2"><Trophy className="h-4 w-4 text-[#FFD60A]"/> Feature on Hall of Shame</li>
            </ul>
          </div>
          <div className="text-center md:text-right">
            <div className="font-display text-7xl md:text-8xl text-[#FF3B30] leading-none">₹49</div>
            <Link to={user ? "/" : "/signup"} data-testid="pricing-cta-link" className="btn-brutal mt-5 inline-flex">
              Get Roasted
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-7xl px-4 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-[#71717A]">
        <span>© 2026 Roastmaster · Brutal by design</span>
        <span>Secured by Razorpay · Built with pain</span>
      </footer>
    </div>
  );
}
