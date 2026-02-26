"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/sidebar/Topbar";
import CallStatsBar from "@/components/calls/CallStatsBar";
import TranscriptDrawer from "@/components/calls/TranscriptDrawer";
import { useSessions, outcomeFromSession, formatDuration, formatTime } from "@/components/calls/useSessions";
import type { CallSession } from "@/components/calls/useSessions";
import {
    Search, RefreshCw, ChevronRight, Phone, Wifi,
    WifiOff
} from "lucide-react";

const OUTCOMES = ["All", "Booked", "Callback", "No Answer", "Live"];

function matchesFilter(s: CallSession, search: string, outcome: string): boolean {
    const q = search.toLowerCase();
    const textMatch =
        !q ||
        (s.customer_name ?? "").toLowerCase().includes(q) ||
        (s.caller_number ?? "").includes(q) ||
        (s.service_type ?? "").toLowerCase().includes(q) ||
        (s.appointment_id ?? "").toLowerCase().includes(q) ||
        (s.call_id ?? "").toLowerCase().includes(q);

    if (!textMatch) return false;
    if (outcome === "All") return true;
    const o = outcomeFromSession(s);
    return o.label === outcome;
}

export default function CallLogsPage() {
    const { sessions, loading, error, refetch } = useSessions(5000);
    const [search, setSearch] = useState("");
    const [activeOutcome, setActiveOutcome] = useState("All");
    const [selected, setSelected] = useState<CallSession | null>(null);

    const filtered = sessions.filter(s => matchesFilter(s, search, activeOutcome));

    return (
        <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
            <Sidebar />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Topbar title="Call Logs" subtitle="Real-time call history and transcripts" />

                <main style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>

                    {/* Stats */}
                    <CallStatsBar sessions={sessions} />

                    {/* Toolbar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 14,
                            flexWrap: "wrap",
                        }}
                    >
                        {/* Search */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background: "var(--bg-card)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: "8px 12px",
                                flex: 1,
                                minWidth: 180,
                            }}
                        >
                            <Search size={13} color="var(--text-muted)" />
                            <input
                                className="input"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, number, or appointment ID..."
                                style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    fontSize: 13,
                                    boxShadow: "none",
                                }}
                            />
                        </div>

                        {/* Outcome filters */}
                        <div style={{ display: "flex", gap: 4 }}>
                            {OUTCOMES.map(o => (
                                <button
                                    key={o}
                                    onClick={() => setActiveOutcome(o)}
                                    style={{
                                        padding: "7px 12px",
                                        fontSize: 12,
                                        fontWeight: activeOutcome === o ? 600 : 400,
                                        borderRadius: 7,
                                        border: `1px solid ${activeOutcome === o ? "var(--accent)" : "var(--border)"}`,
                                        background: activeOutcome === o ? "var(--accent-glow)" : "var(--bg-card)",
                                        color: activeOutcome === o ? "var(--accent-hover)" : "var(--text-secondary)",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>

                        {/* Refresh + status */}
                        <button
                            onClick={refetch}
                            className="btn-ghost"
                            style={{ padding: "7px 10px" }}
                        >
                            <RefreshCw size={13} className={loading ? "spin" : ""} />
                        </button>
                        <div
                            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}
                        >
                            {error ? (
                                <>
                                    <WifiOff size={12} color="var(--warning)" />
                                    <span style={{ color: "var(--warning)" }}>{error}</span>
                                </>
                            ) : (
                                <>
                                    <Wifi size={12} color="var(--success)" />
                                    <span style={{ color: "var(--text-muted)" }}>Live</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                                    {["Customer", "Number", "Service", "Duration", "Outcome", "Appointment", "Time", ""].map(h => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "10px 16px",
                                                textAlign: "left",
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: "var(--text-muted)",
                                                letterSpacing: "0.08em",
                                                textTransform: "uppercase",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                                            No calls match your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((s, i) => {
                                        const outcome = outcomeFromSession(s);
                                        // Live = actively in a call. Exclude:
                                        //   'ended'   — call finished properly
                                        //   'initiated' — backend missed call-start, call already over
                                        // Also use ended_at as a definitive fallback.
                                        const isLive = s.state !== "ended" && s.state !== "initiated" && !s.ended_at;
                                        return (
                                            <tr
                                                key={s.call_id}
                                                onClick={() => setSelected(s)}
                                                style={{
                                                    borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                                                    cursor: "pointer",
                                                    transition: "background 0.1s",
                                                    background: "transparent",
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                            >
                                                {/* Customer */}
                                                <td style={{ padding: "12px 16px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div
                                                            style={{
                                                                width: 30,
                                                                height: 30,
                                                                borderRadius: "50%",
                                                                background: isLive
                                                                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                                                                    : "var(--bg-hover)",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                fontSize: 10,
                                                                fontWeight: 700,
                                                                color: isLive ? "white" : "var(--text-muted)",
                                                                flexShrink: 0,
                                                                position: "relative",
                                                            }}
                                                        >
                                                            {s.customer_name ? s.customer_name.split(" ").map(w => w[0]).join("").slice(0, 2) : <Phone size={12} />}
                                                            {isLive && (
                                                                <span
                                                                    style={{
                                                                        position: "absolute",
                                                                        bottom: -1,
                                                                        right: -1,
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: "50%",
                                                                        background: "var(--success)",
                                                                        border: "1.5px solid var(--bg-surface)",
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                                            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                                                                {s.customer_name ?? "Unknown"}
                                                            </span>
                                                            {s.isDemo && (
                                                                <span style={{
                                                                    fontSize: 9,
                                                                    fontWeight: 700,
                                                                    letterSpacing: "0.06em",
                                                                    color: "var(--text-muted)",
                                                                    background: "var(--bg-hover)",
                                                                    border: "1px solid var(--border)",
                                                                    borderRadius: 4,
                                                                    padding: "1px 5px",
                                                                    width: "fit-content",
                                                                }}>
                                                                    DEMO
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Number */}
                                                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                                                    {s.caller_number ?? "—"}
                                                </td>

                                                {/* Service */}
                                                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                                                    {s.service_type ?? "—"}
                                                </td>

                                                {/* Duration */}
                                                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                                                    {isLive ? (
                                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <span className="live-dot" style={{ width: 6, height: 6 }} />
                                                            <span style={{ color: "var(--accent-hover)" }}>Live</span>
                                                        </span>
                                                    ) : (
                                                        formatDuration(s.duration_seconds)
                                                    )}
                                                </td>

                                                {/* Outcome */}
                                                <td style={{ padding: "12px 16px" }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            color: outcome.color,
                                                            background: outcome.bg,
                                                            border: `1px solid ${outcome.color}30`,
                                                            padding: "3px 9px",
                                                            borderRadius: 999,
                                                        }}
                                                    >
                                                        {outcome.label}
                                                    </span>
                                                </td>

                                                {/* Appointment */}
                                                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                                                    {s.appointment_id ?? "—"}
                                                </td>

                                                {/* Time */}
                                                <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                    {formatTime(s.created_at)}
                                                </td>

                                                {/* Arrow */}
                                                <td style={{ padding: "12px 12px 12px 0", textAlign: "right" }}>
                                                    <ChevronRight size={14} color="var(--text-muted)" />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Row count */}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, textAlign: "right" }}>
                        Showing {filtered.length} of {sessions.length} calls
                    </div>
                </main>
            </div>

            {/* Transcript drawer */}
            {selected && (
                <TranscriptDrawer session={selected} onClose={() => setSelected(null)} />
            )}

            <style>{`
        .spin { animation: spinning 0.7s linear infinite; }
        @keyframes spinning { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
        </div>
    );
}
