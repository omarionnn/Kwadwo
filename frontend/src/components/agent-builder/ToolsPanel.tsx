"use client";

import { useState } from "react";
import { Plus, Trash2, Wrench, Calendar, Database, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

const PRESET_TOOLS = [
    {
        id: "get_availability",
        icon: Calendar,
        name: "get_availability",
        description: "Check open service slots in the DMS calendar",
        enabled: true,
    },
    {
        id: "book_appointment",
        icon: Calendar,
        name: "book_appointment",
        description: "Book a confirmed service appointment",
        enabled: true,
    },
    {
        id: "lookup_vehicle",
        icon: Database,
        name: "lookup_vehicle",
        description: "Look up customer vehicle by VIN or phone number",
        enabled: true,
    },
    {
        id: "send_sms",
        icon: MessageSquare,
        name: "send_sms",
        description: "Send confirmation SMS to the customer",
        enabled: false,
    },
];

export default function ToolsPanel() {
    const [tools, setTools] = useState(PRESET_TOOLS);
    const [expanded, setExpanded] = useState<string | null>("get_availability");

    const toggleTool = (id: string) => {
        setTools(t => t.map(tool => tool.id === id ? { ...tool, enabled: !tool.enabled } : tool));
    };

    const removeTool = (id: string) => {
        setTools(t => t.filter(tool => tool.id !== id));
    };

    return (
        <section className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Wrench size={14} color="var(--success)" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Tools</span>
                    <span className="badge badge-active" style={{ fontSize: 10, padding: "2px 6px" }}>
                        {tools.filter(t => t.enabled).length} active
                    </span>
                </div>
                <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }}>
                    <Plus size={12} /> Add Tool
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tools.map(tool => {
                    const Icon = tool.icon;
                    const isExpanded = expanded === tool.id;
                    return (
                        <div
                            key={tool.id}
                            style={{
                                border: `1px solid ${tool.enabled ? "var(--border-light)" : "var(--border)"}`,
                                borderRadius: 8,
                                overflow: "hidden",
                                transition: "border-color 0.15s",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 12px",
                                    background: tool.enabled ? "rgba(18,32,58,0.8)" : "var(--bg-surface)",
                                    cursor: "pointer",
                                }}
                                onClick={() => setExpanded(isExpanded ? null : tool.id)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Icon size={13} color={tool.enabled ? "var(--success)" : "var(--text-muted)"} />
                                    <code style={{ fontSize: 12, color: tool.enabled ? "var(--text-primary)" : "var(--text-muted)", fontFamily: "monospace" }}>
                                        {tool.name}
                                    </code>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <label className="toggle" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={tool.enabled} onChange={() => toggleTool(tool.id)} />
                                        <span className="toggle-slider" />
                                    </label>
                                    {isExpanded ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
                                </div>
                            </div>
                            {isExpanded && (
                                <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
                                        {tool.description}
                                    </p>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>
                                            Configure
                                        </button>
                                        <button
                                            onClick={() => removeTool(tool.id)}
                                            style={{ padding: "5px 10px", fontSize: 11, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                        >
                                            <Trash2 size={11} /> Remove
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
