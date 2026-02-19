"use client";

import { Bell, Search } from "lucide-react";

interface TopbarProps {
    title: string;
    subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
    return (
        <header
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 28px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-surface)",
                position: "sticky",
                top: 0,
                zIndex: 10,
            }}
        >
            <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {title}
                </h1>
                {subtitle && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {subtitle}
                    </p>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Search */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        cursor: "text",
                    }}
                >
                    <Search size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Search agents...</span>
                    <kbd
                        style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            background: "var(--bg-hover)",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            padding: "1px 4px",
                        }}
                    >
                        ⌘K
                    </kbd>
                </div>

                {/* Notification bell */}
                <button
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        position: "relative",
                    }}
                >
                    <Bell size={15} />
                    {/* Unread dot */}
                    <div
                        style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--accent)",
                            border: "1.5px solid var(--bg-surface)",
                        }}
                    />
                </button>
            </div>
        </header>
    );
}
