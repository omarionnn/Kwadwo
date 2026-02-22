"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/sidebar/Topbar";
import { useState, useEffect, useCallback } from "react";
import AgentConfigPanel from "@/components/agent-builder/AgentConfigPanel";
import ToolsPanel from "@/components/agent-builder/ToolsPanel";
import { Save, Cpu, Loader2, Check } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface VoiceConfig {
    provider: string;
    voiceId: string;
}
interface ToolFunction {
    name: string;
    description: string;
    parameters: { type: string; properties: Record<string, unknown>; required: string[] };
}
interface ToolDef {
    type: string;
    function: ToolFunction;
}
export interface AgentConfig {
    id: string;
    name: string;
    firstMessage: string;
    systemPrompt: string;
    model: string;
    temperature: number;
    voice: VoiceConfig;
    tools: ToolDef[];
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AgentsPage() {
    const [config, setConfig] = useState<AgentConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"config" | "tools">("config");

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    /* ── Fetch config from backend ────────────────────────────────────── */
    const fetchConfig = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiBase}/api/agent`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: AgentConfig = await res.json();
            setConfig(data);
            setError(null);
        } catch (e: unknown) {
            setError("Could not load agent config — is the backend running?");
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    /* ── Save config to Vapi via backend ──────────────────────────────── */
    const handleSave = async () => {
        if (!config) return;
        try {
            setSaving(true);
            setSaved(false);
            const res = await fetch(`${apiBase}/api/agent`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: config.name,
                    firstMessage: config.firstMessage,
                    systemPrompt: config.systemPrompt,
                    model: config.model,
                    temperature: config.temperature,
                    voiceProvider: config.voice.provider,
                    voiceId: config.voice.voiceId,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const updated: AgentConfig = await res.json();
            setConfig(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setError("Failed to save — check backend logs.");
        } finally {
            setSaving(false);
        }
    };

    /* ── Field updaters ───────────────────────────────────────────────── */
    const updateField = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) => {
        setConfig(prev => prev ? { ...prev, [key]: value } : prev);
    };
    const updateVoice = (provider: string, voiceId: string) => {
        setConfig(prev => prev ? { ...prev, voice: { provider, voiceId } } : prev);
    };

    return (
        <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
            <Sidebar />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Topbar
                    title="Agent Builder"
                    subtitle="Configure and deploy your AI voice agents"
                />

                {loading ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-muted)" }}>
                        <Loader2 size={20} className="spin" /> Loading agent config...
                    </div>
                ) : error && !config ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
                        {error}
                    </div>
                ) : config ? (
                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        {/* Config area */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            {/* Agent Topbar */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "12px 20px",
                                    borderBottom: "1px solid var(--border)",
                                    background: "var(--bg-surface)",
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 9,
                                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "0 0 12px rgba(99,102,241,0.35)",
                                        }}
                                    >
                                        <Cpu size={17} color="white" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                                            {config.name || "Untitled Agent"}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                            Service Scheduling · Westside Auto
                                        </div>
                                    </div>
                                    <span className="badge badge-active" style={{ marginLeft: 4 }}>Active</span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {error && <span style={{ fontSize: 11, color: "var(--danger)" }}>{error}</span>}
                                    <button
                                        className="btn-primary"
                                        onClick={handleSave}
                                        disabled={saving}
                                        style={{ gap: 6, minWidth: 120, justifyContent: "center" }}
                                    >
                                        {saving ? (
                                            <><Loader2 size={13} className="spin" /> Saving...</>
                                        ) : saved ? (
                                            <><Check size={13} /> Saved!</>
                                        ) : (
                                            <><Save size={13} /> Save Agent</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 0,
                                    borderBottom: "1px solid var(--border)",
                                    padding: "0 20px",
                                    background: "var(--bg-surface)",
                                    flexShrink: 0,
                                }}
                            >
                                {(["config", "tools"] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        style={{
                                            padding: "10px 16px",
                                            fontSize: 13,
                                            fontWeight: activeTab === tab ? 600 : 400,
                                            color: activeTab === tab ? "var(--accent-hover)" : "var(--text-muted)",
                                            background: "none",
                                            border: "none",
                                            borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
                                            cursor: "pointer",
                                            textTransform: "capitalize",
                                            transition: "color 0.15s",
                                            marginBottom: -1,
                                        }}
                                    >
                                        {tab === "config" ? "Configuration" : "Tools & Actions"}
                                    </button>
                                ))}
                            </div>

                            {/* Scrollable content */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    padding: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0,
                                }}
                            >
                                {activeTab === "config" ? (
                                    <AgentConfigPanel
                                        config={config}
                                        onUpdateField={updateField}
                                        onUpdateVoice={updateVoice}
                                    />
                                ) : (
                                    <ToolsPanel tools={config.tools} />
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
}
