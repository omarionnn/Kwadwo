"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/sidebar/Topbar";
import DemoBanner from "@/components/DemoBanner";
import { Bot, Phone, Users, TrendingUp, ArrowUpRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSessions, outcomeFromSession, formatDuration, formatTime } from "@/components/calls/useSessions";
import type { CallSession } from "@/components/calls/useSessions";


export default function OverviewPage() {
  const { sessions, loading } = useSessions(5000);
  const [now, setNow] = useState(Date.now());

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

  // Find live call
  const liveCall = sessions.find((s: CallSession) => s.state !== "ended" && s.state !== "initiated");

  let firstStat;
  if (liveCall && liveCall.created_at) {
    const startMs = new Date(liveCall.created_at).getTime();
    const elapsedSec = Math.floor((now - startMs) / 1000);
    firstStat = {
      label: "Live Call",
      value: formatDuration(elapsedSec),
      delta: liveCall.customer_name || liveCall.caller_number || "Unknown Caller",
      icon: Phone,
      color: "#ef4444" // pulse red
    };
  } else {
    firstStat = {
      label: "Active Agents",
      value: "1",
      delta: "Sofia is live",
      icon: Bot,
      color: "#6366f1"
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
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar title="Overview" subtitle="Saafi AI · Westside Auto Group" />

        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* Demo Banner — shows callable phone number when live */}
          <DemoBanner />

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            {stats.map(stat => {
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
            })}
          </div>

          {/* Two column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
            {/* Recent Calls */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Recent Activity</span>
                  {loading && <span className="spin" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Updating...</span>}
                </div>
                <Link href="/calls" style={{ fontSize: 11, color: "var(--accent-hover)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                  View all logs <ArrowRight size={11} />
                </Link>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
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

            {/* Quick Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>Quick Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href="/agents" style={{ textDecoration: "none" }}>
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
      </div>
    </div>
  );
}
