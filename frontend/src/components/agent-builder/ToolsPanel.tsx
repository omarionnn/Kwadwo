"use client";

import { useState } from "react";
import { Wrench, ChevronDown, ChevronUp } from "lucide-react";

interface ToolFunction {
    name: string;
    description: string;
    parameters: { type: string; properties: Record<string, unknown>; required: string[] };
}
interface ToolDef {
    type: string;
    function: ToolFunction;
}

interface Props {
    tools: ToolDef[];
}

export default function ToolsPanel({ tools }: Props) {
    const [expanded, setExpanded] = useState<string | null>(tools[0]?.function.name ?? null);

    return (
        <section className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Wrench size={14} color="var(--success)" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Tools</span>
                    <span className="badge badge-active" style={{ fontSize: 10, padding: "2px 6px" }}>
                        {tools.length} active
                    </span>
                </div>
            </div>

            {tools.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>
                    No tools configured for this agent.
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tools.map(tool => {
                        const name = tool.function.name;
                        const isExpanded = expanded === name;
                        const params = tool.function.parameters;
                        return (
                            <div
                                key={name}
                                style={{
                                    border: "1px solid var(--border-light)",
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
                                        background: "rgba(18,32,58,0.8)",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => setExpanded(isExpanded ? null : name)}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <Wrench size={13} color="var(--success)" />
                                        <code style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: "monospace" }}>
                                            {name}
                                        </code>
                                    </div>
                                    {isExpanded ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
                                </div>
                                {isExpanded && (
                                    <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                                        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
                                            {tool.function.description}
                                        </p>
                                        {params.required.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Parameters</div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    {params.required.map(paramName => {
                                                        const prop = params.properties[paramName] as { type?: string; description?: string } | undefined;
                                                        return (
                                                            <div key={paramName} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 8px", background: "var(--bg-hover)", borderRadius: 4 }}>
                                                                <code style={{ fontSize: 11, color: "var(--accent-hover)", fontFamily: "monospace" }}>{paramName}</code>
                                                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                                                    {prop?.description || prop?.type || ""}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
