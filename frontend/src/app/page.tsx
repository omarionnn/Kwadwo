"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/sidebar/Topbar";
import DemoBanner from "@/components/DemoBanner";
import { Bot, Phone, Users, TrendingUp, ArrowUpRight, ArrowRight } from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Active Agents", value: "2", delta: "+1 this week", icon: Bot, color: "#6366f1" },
  { label: "Calls Today", value: "38", delta: "+12% vs yesterday", icon: Phone, color: "#10b981" },
  { label: "Appointments Booked", value: "24", delta: "63% conversion", icon: Users, color: "#f59e0b" },
  { label: "Avg. Call Duration", value: "2m 14s", delta: "-8s vs last week", icon: TrendingUp, color: "#8b5cf6" },
];

const recentCalls = [
  { id: "1", customer: "Marcus T.", vehicle: "2021 Ford F-150", outcome: "Booked", agent: "Alex", time: "8 min ago" },
  { id: "2", customer: "Sarah M.", vehicle: "2019 Honda Accord", outcome: "Callback", agent: "Jordan", time: "23 min ago" },
  { id: "3", customer: "David K.", vehicle: "2022 BMW 3 Series", outcome: "Booked", agent: "Alex", time: "41 min ago" },
  { id: "4", customer: "Linda P.", vehicle: "2020 Toyota Camry", outcome: "No Answer", agent: "Jordan", time: "1h ago" },
];

const outcomeColor: Record<string, string> = {
  Booked: "var(--success)",
  Callback: "var(--warning)",
  "No Answer": "var(--text-muted)",
};

export default function OverviewPage() {
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
            {/* Recent Calls */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Recent Calls</span>
                <Link href="/calls" style={{ fontSize: 11, color: "var(--accent-hover)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Customer", "Vehicle", "Agent", "Outcome", "Time"].map(h => (
                      <th key={h} style={{ padding: "9px 18px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map((call, i) => (
                    <tr
                      key={call.id}
                      style={{
                        borderBottom: i < recentCalls.length - 1 ? "1px solid var(--border)" : "none",
                        transition: "background 0.1s",
                      }}
                    >
                      <td style={{ padding: "11px 18px", fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{call.customer}</td>
                      <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--text-secondary)" }}>{call.vehicle}</td>
                      <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--text-secondary)" }}>{call.agent}</td>
                      <td style={{ padding: "11px 18px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: outcomeColor[call.outcome],
                            background: `${outcomeColor[call.outcome]}18`,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: `1px solid ${outcomeColor[call.outcome]}30`,
                          }}
                        >
                          {call.outcome}
                        </span>
                      </td>
                      <td style={{ padding: "11px 18px", fontSize: 11, color: "var(--text-muted)" }}>{call.time}</td>
                    </tr>
                  ))}
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
                  { name: "Alex", role: "Service Scheduling", live: true },
                  { name: "Jordan", role: "Inbound Inquiries", live: true },
                  { name: "Riley", role: "Lead Follow-up", live: false },
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
