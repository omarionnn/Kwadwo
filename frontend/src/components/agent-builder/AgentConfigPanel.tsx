"use client";

import { Bot } from "lucide-react";
import type { AgentConfig } from "@/app/dashboard/agents/page";

/* ── Real Vapi-compatible options ────────────────────────────────────── */

const VOICES = [
    { provider: "openai", voiceId: "nova", label: "Nova", accent: "American", gender: "Female", desc: "Warm & professional" },
    { provider: "openai", voiceId: "shimmer", label: "Shimmer", accent: "American", gender: "Female", desc: "Bright & expressive" },
    { provider: "openai", voiceId: "alloy", label: "Alloy", accent: "American", gender: "Neutral", desc: "Clear & balanced" },
    { provider: "openai", voiceId: "echo", label: "Echo", accent: "American", gender: "Male", desc: "Smooth & calm" },
    { provider: "openai", voiceId: "onyx", label: "Onyx", accent: "American", gender: "Male", desc: "Deep & authoritative" },
    { provider: "openai", voiceId: "fable", label: "Fable", accent: "British", gender: "Male", desc: "Storytelling quality" },
];

const MODELS = [
    { id: "gpt-4o", label: "GPT-4o", badge: "Recommended", latency: "~200ms" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", badge: "Fast", latency: "~120ms" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo", badge: "Stable", latency: "~450ms" },
];

interface Props {
    config: AgentConfig;
    onUpdateField: <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) => void;
    onUpdateVoice: (provider: string, voiceId: string) => void;
}

export default function AgentConfigPanel({ config, onUpdateField, onUpdateVoice }: Props) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", paddingRight: 4 }}>

            {/* Identity */}
            <section className="card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Bot size={14} color="var(--accent-hover)" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Identity</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={{ display: "block", marginBottom: 5 }}>Assistant Name</label>
                        <input
                            className="input"
                            value={config.name}
                            onChange={e => onUpdateField("name", e.target.value)}
                            placeholder="e.g. Sofia — Westside Auto"
                        />
                    </div>
                </div>
            </section>

            {/* Voice */}
            <section className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>Voice</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {VOICES.map(v => {
                        const selected = config.voice.voiceId === v.voiceId;
                        return (
                            <div
                                key={v.voiceId}
                                onClick={() => onUpdateVoice(v.provider, v.voiceId)}
                                className="card-hover"
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                                    background: selected ? "var(--accent-glow)" : "var(--bg-surface)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                <div style={{ fontSize: 12, fontWeight: 600, color: selected ? "var(--accent-hover)" : "var(--text-primary)" }}>
                                    {v.label}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                    {v.accent} · {v.gender}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3, fontStyle: "italic" }}>
                                    {v.desc}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Model */}
            <section className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>LLM Model</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {MODELS.map(m => {
                        const selected = config.model === m.id;
                        return (
                            <div
                                key={m.id}
                                onClick={() => onUpdateField("model", m.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                                    background: selected ? "var(--accent-glow)" : "var(--bg-surface)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div
                                        style={{
                                            width: 8, height: 8, borderRadius: "50%",
                                            border: `2px solid ${selected ? "var(--accent)" : "var(--border-light)"}`,
                                            background: selected ? "var(--accent)" : "transparent",
                                            transition: "all 0.15s",
                                        }}
                                    />
                                    <span style={{ fontSize: 12, color: selected ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: selected ? 500 : 400 }}>
                                        {m.label}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.latency}</span>
                                    <span className="badge badge-accent" style={{ fontSize: 10, padding: "2px 6px" }}>{m.badge}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: 16 }}>
                    <label style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        Temperature
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{config.temperature}</span>
                    </label>
                    <input
                        type="range" min={0} max={1} step={0.05}
                        value={config.temperature}
                        onChange={e => onUpdateField("temperature", parseFloat(e.target.value))}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Consistent</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Creative</span>
                    </div>
                </div>
            </section>

            {/* Prompts */}
            <section className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>Prompts</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={{ display: "block", marginBottom: 5 }}>First Message</label>
                        <textarea
                            className="input"
                            value={config.firstMessage}
                            onChange={e => onUpdateField("firstMessage", e.target.value)}
                            rows={2}
                            style={{ resize: "vertical", lineHeight: 1.5 }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: 5 }}>System Prompt</label>
                        <textarea
                            className="input"
                            value={config.systemPrompt}
                            onChange={e => onUpdateField("systemPrompt", e.target.value)}
                            rows={12}
                            style={{ resize: "vertical", lineHeight: 1.6, fontFamily: "monospace", fontSize: 12 }}
                        />
                    </div>
                </div>
            </section>

        </div>
    );
}
