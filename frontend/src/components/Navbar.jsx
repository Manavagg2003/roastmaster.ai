import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Flame, LogOut, Trophy, History, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header
      data-testid="site-navbar"
      className="sticky top-0 z-40 w-full border-b border-[#27272A] bg-[#050505]/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-8 py-3">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 group">
          <Flame className="h-6 w-6 text-[#FF3B30] group-hover:rotate-12 transition-transform" strokeWidth={2.5}/>
          <span className="font-display text-2xl tracking-tight uppercase">
            Roast<span className="text-[#FF3B30]">master</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 md:gap-4">
          <Link
            to="/leaderboard"
            data-testid="nav-leaderboard"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] hover:text-[#FFD60A] transition-colors"
          >
            <Trophy className="h-4 w-4" /> Hall of Shame
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                data-testid="nav-dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] hover:text-[#FFD60A] transition-colors"
              >
                <History className="h-4 w-4" /> History
              </Link>
              <div className="hidden md:flex items-center gap-2 text-xs uppercase tracking-widest text-[#A1A1AA] border border-[#27272A] px-3 py-1.5">
                <User className="h-3.5 w-3.5" />
                <span data-testid="nav-user-name">{user.name}</span>
                <span className="text-[#FFD60A]" data-testid="nav-balance">
                  [{user.used_free_roast ? user.paid_roasts_balance : "FREE+" + user.paid_roasts_balance}]
                </span>
              </div>
              <button
                data-testid="nav-logout"
                onClick={() => { logout(); nav("/"); }}
                className="btn-ghost btn-brutal !py-2 !px-3 !text-xs"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login" className="btn-ghost btn-brutal !py-2 !px-4 !text-xs">
                Login
              </Link>
              <Link to="/signup" data-testid="nav-signup" className="btn-brutal !py-2 !px-4 !text-xs">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
