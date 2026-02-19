"use client";

import { useState } from "react";
import { Bot, ChevronDown } from "lucide-react";

const VOICES = [
    { id: "rachel", name: "Rachel", accent: "American", gender: "Female", sample: "Warm & professional" },
    { id: "josh", name: "Josh", accent: "American", gender: "Male", sample: "Confident & clear" },
    { id: "bella", name: "Bella", accent: "British", gender: "Female", sample: "Polished & friendly" },
    { id: "adam", name: "Adam", accent: "American", gender: "Male", sample: "Authoritative & calm" },
];

const MODELS = [
    { id: "gpt4o", label: "GPT-4o Realtime", badge: "Recommended", latency: "~200ms" },
    { id: "claude35", label: "Claude 3.5 Sonnet", badge: "High Quality", latency: "~320ms" },
    { id: "gpt4turbo", label: "GPT-4 Turbo", badge: "Stable", latency: "~450ms" },
];

interface Props {
    agentName: string;
    setAgentName: (v: string) => void;
}

export default function AgentConfigPanel({ agentName, setAgentName }: Props) {
    const [selectedVoice, setSelectedVoice] = useState("rachel");
    const [selectedModel, setSelectedModel] = useState("gpt4o");
    const [temperature, setTemperature] = useState(0.7);
    const [interruptions, setInterruptions] = useState(true);
    const [endSilence, setEndSilence] = useState(3);
    const [firstMessage, setFirstMessage] = useState(
        "Hi! You've reached {{dealership_name}}. I'm {{agent_name}}, your AI assistant. How can I help you today?"
    );
    const [systemPrompt, setSystemPrompt] = useState(
        `You are {{agent_name}}, a professional service scheduling AI for {{dealership_name}}. Your goal is to:
1. Greet the customer warmly
2. Identify their vehicle and service need
3. Check availability in the scheduling system
4. Book the appointment and confirm via SMS

Always confirm the customer's VIN (last 4 digits) before looking up their vehicle. Never make up availability — use the get_availability tool.`
    );

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
                        <label style={{ display: "block", marginBottom: 5 }}>Agent Name</label>
                        <input
                            className="input"
                            value={agentName}
                            onChange={e => setAgentName(e.target.value)}
                            placeholder="e.g. Alex, Jordan, Saafi..."
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: 5 }}>Dealership Variable</label>
                        <input className="input" defaultValue="Westside Auto Group" placeholder="Dealership name..." />
                    </div>
                </div>
            </section>

            {/* Voice */}
            <section className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>Voice</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {VOICES.map(v => (
                        <div
                            key={v.id}
                            onClick={() => setSelectedVoice(v.id)}
                            className="card-hover"
                            style={{
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: `1px solid ${selectedVoice === v.id ? "var(--accent)" : "var(--border)"}`,
                                background: selectedVoice === v.id ? "var(--accent-glow)" : "var(--bg-surface)",
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            <div style={{ fontSize: 12, fontWeight: 600, color: selectedVoice === v.id ? "var(--accent-hover)" : "var(--text-primary)" }}>
                                {v.name}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                {v.accent} · {v.gender}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3, fontStyle: "italic" }}>
                                {v.sample}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Model */}
            <section className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>LLM Model</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {MODELS.map(m => (
                        <div
                            key={m.id}
                            onClick={() => setSelectedModel(m.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: `1px solid ${selectedModel === m.id ? "var(--accent)" : "var(--border)"}`,
                                background: selectedModel === m.id ? "var(--accent-glow)" : "var(--bg-surface)",
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div
                                    style={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        border: `2px solid ${selectedModel === m.id ? "var(--accent)" : "var(--border-light)"}`,
                                        background: selectedModel === m.id ? "var(--accent)" : "transparent",
                                        transition: "all 0.15s",
                                    }}
                                />
                                <span style={{ fontSize: 12, color: selectedModel === m.id ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: selectedModel === m.id ? 500 : 400 }}>
                                    {m.label}
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.latency}</span>
                                <span className="badge badge-accent" style={{ fontSize: 10, padding: "2px 6px" }}>{m.badge}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 16 }}>
                    <label style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        Temperature
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{temperature}</span>
                    </label>
                    <input
                        type="range" min={0} max={1} step={0.05}
                        value={temperature}
                        onChange={e => setTemperature(parseFloat(e.target.value))}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Consistent</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Creative</span>
                    </div>
                </div>
            </section>

            {/* Behavior */}
            <section className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>Behavior</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>Allow Interruptions</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>User can interrupt agent mid-sentence</div>
                        </div>
                        <label className="toggle">
                            <input type="checkbox" checked={interruptions} onChange={e => setInterruptions(e.target.checked)} />
                            <span className="toggle-slider" />
                        </label>
                    </div>

                    <hr className="divider" style={{ margin: "4px 0" }} />

                    <div>
                        <label style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            End-of-speech Silence
                            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{endSilence}s</span>
                        </label>
                        <input
                            type="range" min={1} max={6} step={0.5}
                            value={endSilence}
                            onChange={e => setEndSilence(parseFloat(e.target.value))}
                        />
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
                            value={firstMessage}
                            onChange={e => setFirstMessage(e.target.value)}
                            rows={2}
                            style={{ resize: "vertical", lineHeight: 1.5 }}
                        />
                        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                            Supports template variables like <code style={{ color: "var(--accent-hover)" }}>{"{{agent_name}}"}</code>
                        </p>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: 5 }}>System Prompt</label>
                        <textarea
                            className="input"
                            value={systemPrompt}
                            onChange={e => setSystemPrompt(e.target.value)}
                            rows={7}
                            style={{ resize: "vertical", lineHeight: 1.6, fontFamily: "monospace", fontSize: 12 }}
                        />
                    </div>
                </div>
            </section>

        </div>
    );
}
