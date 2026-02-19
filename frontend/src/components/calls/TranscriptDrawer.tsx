"use client";

import { X, Bot, User, Clock, Phone, Package } from "lucide-react";
import type { CallSession } from "./useSessions";
import { outcomeFromSession, formatDuration, formatTime } from "./useSessions";

interface Props {
    session: CallSession;
    onClose: () => void;
}

export default function TranscriptDrawer({ session, onClose }: Props) {
    const outcome = outcomeFromSession(session);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 40,
                    backdropFilter: "blur(2px)",
                    animation: "fadeIn 0.15s ease",
                }}
            />

            {/* Drawer panel */}
            <aside
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100vh",
                    width: 420,
                    background: "var(--bg-surface)",
                    borderLeft: "1px solid var(--border)",
                    zIndex: 50,
                    display: "flex",
                    flexDirection: "column",
                    animation: "slideInRight 0.2s ease",
                    boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "16px 18px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                                {session.customer_name ?? session.caller_number ?? "Unknown"}
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: outcome.color,
                                    background: outcome.bg,
                                    border: `1px solid ${outcome.color}30`,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                }}
                            >
                                {outcome.label}
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Phone size={10} /> {session.caller_number ?? "—"}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Clock size={10} /> {formatDuration(session.duration_seconds)}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                {formatTime(session.created_at)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: 7,
                            width: 30,
                            height: 30,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Call metadata */}
                <div
                    style={{
                        padding: "12px 18px",
                        borderBottom: "1px solid var(--border)",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                    }}
                >
                    {[
                        { icon: Package, label: "Vehicle", value: session.vehicle_id ? `VIN …${session.vin_last4}` : "—" },
                        { icon: Package, label: "Appointment", value: session.appointment_id ?? "None booked" },
                        { icon: Clock, label: "Duration", value: formatDuration(session.duration_seconds) },
                        { icon: Phone, label: "Cost", value: session.cost_usd ? `$${session.cost_usd.toFixed(4)}` : "—" },
                    ].map(item => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{item.value}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Transcript */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {session.transcript.length === 0 ? (
                        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                            No transcript available
                        </div>
                    ) : (
                        session.transcript.map((line, i) => {
                            const isAgent = line.role === "assistant";
                            return (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        flexDirection: isAgent ? "row" : "row-reverse",
                                        gap: 8,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 26,
                                            height: 26,
                                            borderRadius: "50%",
                                            background: isAgent ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--bg-hover)",
                                            border: `1px solid ${isAgent ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {isAgent ? <Bot size={12} color="white" /> : <User size={12} color="var(--text-muted)" />}
                                    </div>
                                    <div
                                        style={{
                                            maxWidth: "82%",
                                            padding: "8px 12px",
                                            borderRadius: isAgent ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                                            background: isAgent ? "var(--accent-glow)" : "var(--bg-hover)",
                                            border: `1px solid ${isAgent ? "rgba(99,102,241,0.2)" : "var(--border)"}`,
                                            fontSize: 12,
                                            lineHeight: 1.6,
                                            color: "var(--text-primary)",
                                        }}
                                    >
                                        {line.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer: call ID */}
                <div
                    style={{
                        padding: "10px 18px",
                        borderTop: "1px solid var(--border)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                    }}
                >
                    ID: {session.call_id}
                </div>
            </aside>

            <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
        </>
    );
}
