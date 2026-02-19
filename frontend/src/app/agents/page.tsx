"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/sidebar/Topbar";
import { useState } from "react";
import AgentListSidebar from "@/components/agent-builder/AgentListSidebar";
import AgentConfigPanel from "@/components/agent-builder/AgentConfigPanel";
import ToolsPanel from "@/components/agent-builder/ToolsPanel";
import CallPreviewPanel from "@/components/agent-builder/CallPreviewPanel";
import { Save, Play, MoreHorizontal, Cpu } from "lucide-react";

export default function AgentsPage() {
    const [selectedAgentId, setSelectedAgentId] = useState("1");
    const [agentName, setAgentName] = useState("Alex");
    const [activeTab, setActiveTab] = useState<"config" | "tools">("config");

    return (
        <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
            {/* Global Sidebar */}
            <Sidebar />

            {/* Main content area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Topbar
                    title="Agent Builder"
                    subtitle="Configure and deploy your AI voice agents"
                />

                {/* Body: agent list + config + preview */}
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                    {/* Agent List */}
                    <AgentListSidebar selectedId={selectedAgentId} onSelect={id => setSelectedAgentId(id)} />

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
                                        {agentName || "Untitled Agent"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        Service Scheduling · Westside Auto
                                    </div>
                                </div>
                                <span className="badge badge-active" style={{ marginLeft: 4 }}>Active</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button className="btn-ghost">
                                    <MoreHorizontal size={14} />
                                </button>
                                <button className="btn-ghost">
                                    <Play size={13} /> Test
                                </button>
                                <button className="btn-primary">
                                    <Save size={13} /> Save Agent
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

                        {/* Split: config + live preview */}
                        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                            {/* Scrollable config column */}
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
                                    <AgentConfigPanel agentName={agentName} setAgentName={setAgentName} />
                                ) : (
                                    <ToolsPanel />
                                )}
                            </div>

                            {/* Preview column */}
                            <div
                                style={{
                                    width: 340,
                                    minWidth: 340,
                                    borderLeft: "1px solid var(--border)",
                                    padding: 16,
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "var(--bg-base)",
                                }}
                            >
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Live Preview</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                        Simulated call with your current config
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <CallPreviewPanel agentName={agentName} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
