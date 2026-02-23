"use client";

import { useState } from "react";
import { Phone, X, Mic, MicOff, RefreshCw } from "lucide-react";

const sampleTranscript = [
    { role: "agent", text: "Hi! You've reached Westside Auto. I'm Saafi, your AI assistant. How can I help you today?" },
    { role: "user", text: "Yeah, I need to schedule a service appointment for my 2021 Ford F-150." },
    { role: "agent", text: "Happy to help with that! Could I get your name and confirm the last 4 digits of your VIN?" },
    { role: "user", text: "Sure, it's Marcus. VIN ends in 4872." },
    { role: "agent", text: "Thanks Marcus! I can see your F-150 in our system. We have openings tomorrow at 9 AM or Thursday at 2 PM. Which works better for you?" },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CallPreviewPanel({ agentName }: { agentName: string }) {
    const [active, setActive] = useState(false);
    const [muted, setMuted] = useState(false);
    const [visibleLines, setVisibleLines] = useState(0);

    const startCall = () => {
        setActive(true);
        setVisibleLines(0);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setVisibleLines(i);
            if (i >= sampleTranscript.length) clearInterval(interval);
        }, 1400);
    };

    const endCall = () => {
        setActive(false);
        setVisibleLines(0);
        setMuted(false);
    };

    return (
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Header */}
            <div
                style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg-surface)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {active && <span className="live-dot" />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {active ? "Live Demo Call" : "Call Preview"}
                    </span>
                </div>
                {active && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        00:{String(visibleLines * 14).padStart(2, "0")}
                    </span>
                )}
            </div>

            {/* Transcript area */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 260,
                }}
            >
                {!active && visibleLines === 0 && (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            color: "var(--text-muted)",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                background: "var(--accent-glow)",
                                border: "1px solid rgba(99,102,241,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Phone size={20} color="var(--accent-hover)" />
                        </div>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
                                Ready to demo
                            </p>
                            <p style={{ fontSize: 11, marginTop: 3 }}>
                                Click &ldquo;Start Call&rdquo; to simulate a live call
                            </p>
                        </div>
                    </div>
                )}

                {sampleTranscript.slice(0, visibleLines).map((line, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            flexDirection: line.role === "agent" ? "row" : "row-reverse",
                            gap: 8,
                            animation: "fadeInUp 0.3s ease",
                        }}
                    >
                        <div
                            style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                background: line.role === "agent"
                                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                                    : "var(--bg-hover)",
                                border: `1px solid ${line.role === "agent" ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: "white",
                                flexShrink: 0,
                            }}
                        >
                            {line.role === "agent" ? "AI" : "C"}
                        </div>
                        <div
                            style={{
                                maxWidth: "78%",
                                padding: "8px 12px",
                                borderRadius: line.role === "agent" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                                background: line.role === "agent" ? "var(--accent-glow)" : "var(--bg-hover)",
                                border: `1px solid ${line.role === "agent" ? "rgba(99,102,241,0.25)" : "var(--border)"}`,
                                fontSize: 12,
                                lineHeight: 1.55,
                                color: "var(--text-primary)",
                            }}
                        >
                            {line.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Call controls */}
            <div
                style={{
                    padding: "12px 18px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--bg-surface)",
                }}
            >
                {!active ? (
                    <>
                        <button className="btn-primary" onClick={startCall} style={{ flex: 1, justifyContent: "center" }}>
                            <Phone size={13} /> Start Demo Call
                        </button>
                        <button className="btn-ghost" style={{ padding: "8px 10px" }}>
                            <RefreshCw size={13} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="btn-ghost"
                            onClick={() => setMuted(!muted)}
                            style={{
                                padding: "8px 12px",
                                color: muted ? "var(--warning)" : undefined,
                                borderColor: muted ? "var(--warning)" : undefined,
                            }}
                        >
                            {muted ? <MicOff size={13} /> : <Mic size={13} />}
                            {muted ? "Unmute" : "Mute"}
                        </button>
                        <button
                            onClick={endCall}
                            style={{
                                flex: 1,
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.35)",
                                borderRadius: 8,
                                color: "var(--danger)",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                padding: "8px 16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                transition: "background 0.15s",
                            }}
                        >
                            <X size={13} /> End Call
                        </button>
                    </>
                )}
            </div>
            <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
        </div>
    );
}
