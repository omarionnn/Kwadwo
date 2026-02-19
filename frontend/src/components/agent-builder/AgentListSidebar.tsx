"use client";

import { Bot, Plus, MoreVertical } from "lucide-react";

const AGENTS = [
    { id: "1", name: "Alex", role: "Service Scheduling", status: "active", calls: 142 },
    { id: "2", name: "Jordan", role: "Inbound Inquiries", status: "active", calls: 87 },
    { id: "3", name: "Riley", role: "Lead Follow-up", status: "draft", calls: 0 },
];

interface Props {
    selectedId: string;
    onSelect: (id: string) => void;
}

export default function AgentListSidebar({ selectedId, onSelect }: Props) {
    return (
        <aside
            style={{
                width: 220,
                minWidth: 220,
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-surface)",
            }}
        >
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="section-label">My Agents</span>
                    <button
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--accent-hover)",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 11,
                            fontWeight: 500,
                            padding: 0,
                        }}
                    >
                        <Plus size={12} /> New
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                {AGENTS.map(agent => {
                    const active = selectedId === agent.id;
                    return (
                        <div
                            key={agent.id}
                            onClick={() => onSelect(agent.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 10px",
                                borderRadius: 8,
                                cursor: "pointer",
                                background: active ? "var(--accent-glow)" : "transparent",
                                border: `1px solid ${active ? "rgba(99,102,241,0.3)" : "transparent"}`,
                                marginBottom: 4,
                                transition: "all 0.15s",
                            }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: active
                                        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                                        : "var(--bg-hover)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: "background 0.15s",
                                }}
                            >
                                <Bot size={15} color={active ? "white" : "var(--text-muted)"} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {agent.name}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                                    <span
                                        style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: agent.status === "active" ? "var(--success)" : "var(--warning)",
                                            display: "inline-block",
                                            flexShrink: 0,
                                        }}
                                    />
                                    {agent.role}
                                </div>
                            </div>
                            <button
                                onClick={e => e.stopPropagation()}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, display: "flex", alignItems: "center" }}
                            >
                                <MoreVertical size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
