"use client";

import { useState, useEffect } from "react";
import { Phone, WifiOff, Copy, Check, Radio } from "lucide-react";

interface Config {
    phone_number: string | null;
    assistant_id: string | null;
    demo_ready: boolean;
}

export default function DemoBanner() {
    const [config, setConfig] = useState<Config | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const res = await fetch(`${apiBase}/config`);
                if (res.ok) setConfig(await res.json());
            } catch {
                setConfig(null);
            }
        };
        fetch_();
        const id = setInterval(fetch_, 10000);
        return () => clearInterval(id);
    }, []);

    const copyNumber = () => {
        if (!config?.phone_number) return;
        navigator.clipboard.writeText(config.phone_number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // If backend offline or demo not ready, show a subtle "not configured" strip
    if (!config?.demo_ready) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    marginBottom: 20,
                    borderRadius: 10,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    color: "var(--text-muted)",
                }}
            >
                <WifiOff size={13} />
                <span>
                    Demo number not configured —{" "}
                    <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--accent-hover)", textDecoration: "underline" }}
                    >
                        run ./start_demo.sh to activate
                    </a>
                </span>
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 18px",
                marginBottom: 20,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))",
                border: "1px solid rgba(99,102,241,0.35)",
                backdropFilter: "blur(8px)",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Pulsing live dot */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Phone size={16} color="white" />
                    </div>
                    <span
                        style={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#10b981",
                            border: "2px solid var(--bg-base)",
                            animation: "pulse 2s ease-in-out infinite",
                        }}
                    />
                </div>

                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#10b981",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                            }}
                        >
                            <Radio size={9} /> LIVE DEMO
                        </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                        Call this number to speak with Saafi
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "white",
                        letterSpacing: "0.04em",
                        fontFamily: "monospace",
                    }}
                >
                    {config.phone_number}
                </div>
                <button
                    onClick={copyNumber}
                    style={{
                        background: copied ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)",
                        border: `1px solid ${copied ? "rgba(16,185,129,0.4)" : "rgba(99,102,241,0.4)"}`,
                        borderRadius: 8,
                        padding: "6px 10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: copied ? "#10b981" : "var(--accent-hover)",
                        fontSize: 12,
                        fontWeight: 500,
                        transition: "all 0.2s",
                    }}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
      `}</style>
        </div>
    );
}
