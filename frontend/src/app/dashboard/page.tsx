"use client";

import { useState, useEffect, useRef } from "react";

import Topbar from "@/components/sidebar/Topbar";
import DemoBanner from "@/components/DemoBanner";
import { Bot, Phone, Users, TrendingUp, ArrowUpRight, ArrowRight, CheckCircle, PhoneOff } from "lucide-react";
import Link from "next/link";
import { useSessions, outcomeFromSession, formatDuration, formatTime } from "@/components/calls/useSessions";
import type { CallSession } from "@/components/calls/useSessions";


/**
 * Custom hook: detects when a live call transitions to ended
 * and returns the ended session for 15 seconds.
 *
 * - setState is called only inside setTimeout callbacks (async),
 *   so it satisfies react-hooks/set-state-in-effect.
 * - Refs are only accessed inside the effect, never during render,
 *   so it satisfies react-hooks/refs.
 */
function useRecentlyEndedCall(
  sessions: CallSession[],
  liveCall: CallSession | undefined,
): CallSession | null {
  const [recentlyEnded, setRecentlyEnded] = useState<CallSession | null>(null);
  const prevLiveCallIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prevId = prevLiveCallIdRef.current;
    const currentId = liveCall?.call_id ?? null;

    // Update the ref first (ref writes in effects are fine)
    prevLiveCallIdRef.current = currentId;

    // A live call just disappeared → it ended
    if (prevId && !currentId) {
      const endedSession = sessions.find((s) => s.call_id === prevId) ?? null;
      // Use setTimeout so setState is async (in a callback), not synchronous
      const showTimer = setTimeout(() => setRecentlyEnded(endedSession), 0);
      const hideTimer = setTimeout(() => setRecentlyEnded(null), 15000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
    return undefined;
  }, [liveCall?.call_id, sessions]);

  return recentlyEnded;
}


export default function OverviewPage() {
  const { sessions, loading } = useSessions(5000);
  const [now, setNow] = useState(() => Date.now());

  // Update time every second for live timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Derived stats
  const ended = sessions.filter((s: CallSession) => s.state === "ended");
  const booked = sessions.filter((s: CallSession) => s.appointment_id);
  const avgDur = ended.length > 0
    ? ended.reduce((sum: number, s: CallSession) => sum + (s.duration_seconds ?? 0), 0) / ended.length
    : 0;

  // Filter for calls today (UTC based check)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCalls = sessions.filter((s: CallSession) => s.created_at?.startsWith(todayStr));

  // Find live call — exclude stale sessions (>10 min without ending = webhook was missed)
  const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  const liveCall = sessions.find((s: CallSession) => {
    if (s.state === "ended" || s.state === "initiated") return false;
    if (!s.created_at) return false;
    const ageMs = now - new Date(s.created_at).getTime();
    return ageMs < STALE_THRESHOLD_MS;
  });

  // Detect when a live call transitions to ended (15s display)
  const recentlyEnded = useRecentlyEndedCall(sessions, liveCall);

  // ── First stat card: 3 states ─────────────────────────────────────────
  let firstStat;
  if (liveCall && liveCall.created_at) {
    // STATE 1: Active call
    const startMs = new Date(liveCall.created_at).getTime();
    const elapsedSec = Math.floor((now - startMs) / 1000);
    firstStat = {
      label: "Live Call",
      value: formatDuration(elapsedSec),
      delta: liveCall.customer_name || liveCall.caller_number || "Unknown Caller",
      icon: Phone,
      color: "#ef4444" // pulse red
    };
  } else if (recentlyEnded) {
    // STATE 2: Call just ended (15s window)
    firstStat = {
      label: "Call Ended",
      value: formatDuration(recentlyEnded.duration_seconds),
      delta: recentlyEnded.customer_name || recentlyEnded.caller_number || "Unknown Caller",
      icon: PhoneOff,
      color: "#f59e0b" // amber
    };
  } else {
    // STATE 3: Idle — ready to answer
    firstStat = {
      label: "Ready to Answer",
      value: "Online",
      delta: "Sofia is standing by",
      icon: CheckCircle,
      color: "#10b981" // green
    };
  }

  const stats = [
    firstStat,
    { label: "Calls Today", value: todayCalls.length.toString(), delta: `${sessions.length} total records`, icon: Phone, color: "#10b981" },
    { label: "Appointments Booked", value: booked.length.toString(), delta: `${ended.length > 0 ? Math.round((booked.length / ended.length) * 100) : 0}% conv. rate`, icon: Users, color: "#f59e0b" },
    { label: "Avg. Call Duration", value: formatDuration(avgDur), delta: "Sofia persona active", icon: TrendingUp, color: "#8b5cf6" },
  ];

  const recentCalls = sessions.slice(0, 5);

  return (
    <>
      <Topbar title="Overview" subtitle="Saafi AI · Westside Auto Group" />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">

        {/* Demo Banner — shows callable phone number when live */}
        <DemoBanner />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {loading && sessions.length === 0 ? (
            /* Loading skeleton */
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--bg-hover)", marginBottom: 14 }} />
                <div style={{ width: 80, height: 26, borderRadius: 6, background: "var(--bg-hover)", marginBottom: 6 }} />
                <div style={{ width: 60, height: 12, borderRadius: 4, background: "var(--bg-hover)", marginBottom: 6 }} />
                <div style={{ width: 100, height: 11, borderRadius: 4, background: "var(--bg-hover)" }} />
              </div>
            ))
          ) : (
            stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="card card-hover" style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: `${stat.color}18`,
                        border: `1px solid ${stat.color}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={16} color={stat.color} />
                    </div>
                    <ArrowUpRight size={14} color="var(--text-muted)" />
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</div>
                  <div style={{ fontSize: 11, color: stat.color, marginTop: 6, fontWeight: 500 }}>{stat.delta}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Two column layout */}
        <div className="flex flex-col xl:flex-row gap-4">
          {/* Recent Calls */}
          <div className="card flex-1 w-full overflow-hidden p-0">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Recent Activity</span>
                {loading && <span className="spin" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Updating...</span>}
              </div>
              <Link href="/dashboard/calls" style={{ fontSize: 11, color: "var(--accent-hover)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                View all logs <ArrowRight size={11} />
              </Link>
            </div>
            <div className="overflow-x-auto w-full">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Customer", "Service", "Outcome", "Time"].map(h => (
                      <th key={h} style={{ padding: "9px 18px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No recent activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentCalls.map((call, i) => {
                      const outcome = outcomeFromSession(call);
                      return (
                        <tr
                          key={call.call_id}
                          style={{
                            borderBottom: i < recentCalls.length - 1 ? "1px solid var(--border)" : "none",
                            transition: "background 0.1s",
                          }}
                        >
                          <td style={{ padding: "11px 18px", fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
                            {call.customer_name ?? call.caller_number ?? "Unknown"}
                          </td>
                          <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--text-secondary)" }}>
                            {call.service_type ?? "General Inquiry"}
                          </td>
                          <td style={{ padding: "11px 18px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: outcome.color,
                                background: outcome.bg,
                                padding: "2px 8px",
                                borderRadius: 999,
                                border: `1px solid ${outcome.color}30`,
                              }}
                            >
                              {outcome.label}
                            </span>
                          </td>
                          <td style={{ padding: "11px 18px", fontSize: 11, color: "var(--text-muted)", whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              {call.isDemo && (
                                <span style={{
                                  fontSize: 8,
                                  fontWeight: 700,
                                  letterSpacing: "0.06em",
                                  color: "var(--text-muted)",
                                  background: "var(--bg-hover)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 4,
                                  padding: "1px 4px",
                                }}>
                                  DEMO
                                </span>
                              )}
                              {formatTime(call.created_at)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-4 w-full xl:w-[340px] shrink-0">
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/dashboard/agents" style={{ textDecoration: "none" }}>
                  <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    <Bot size={13} /> Open Agent Builder
                  </button>
                </Link>
                <button className="btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                  <Phone size={13} /> Start Test Call
                </button>
                <button className="btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                  <Users size={13} /> Import Leads
                </button>
              </div>
            </div>

            {/* Active agents status */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Agent Status</div>
              {[
                { name: "Sofia", role: "Automated Service Booking", live: true },
              ].map(agent => (
                <div key={agent.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: agent.live ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--bg-hover)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Bot size={13} color={agent.live ? "white" : "var(--text-muted)"} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{agent.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{agent.role}</div>
                    </div>
                  </div>
                  {agent.live ? (
                    <span className="badge badge-active" style={{ fontSize: 10 }}>Live</span>
                  ) : (
                    <span className="badge badge-draft" style={{ fontSize: 10 }}>Draft</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
