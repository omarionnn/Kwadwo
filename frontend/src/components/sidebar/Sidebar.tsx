"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bot, LayoutDashboard, Phone, Users, BarChart3,
    Settings, Zap, ChevronRight, PlusCircle, Activity
} from "lucide-react";

const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Bot, label: "Agent Builder", href: "/agents" },
    { icon: Phone, label: "Call Logs", href: "/calls" },
    { icon: Users, label: "Campaigns", href: "/campaigns" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Activity, label: "Status", href: "/status" },
];

const bottomItems = [
    { icon: Zap, label: "Integrations", href: "/integrations" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside
            style={{
                width: 240,
                minWidth: 240,
                background: "var(--bg-surface)",
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                position: "sticky",
                top: 0,
                overflow: "hidden",
            }}
        >
            {/* Logo */}
            <div
                style={{
                    padding: "20px 20px 16px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 12px rgba(99,102,241,0.4)",
                    }}
                >
                    <Bot size={18} color="white" />
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                        Saafi AI
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Voice Platform</div>
                </div>
            </div>

            {/* New Agent CTA */}
            <div style={{ padding: "12px 12px 8px" }}>
                <button
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
                >
                    <PlusCircle size={14} />
                    New Agent
                </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto" }}>
                <div className="section-label" style={{ padding: "12px 8px 4px" }}>
                    Platform
                </div>
                {navItems.map(({ icon: Icon, label, href }) => {
                    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                    return (
                        <Link key={href} href={href} style={{ textDecoration: "none" }}>
                            <div
                                className={active ? "nav-active" : ""}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    padding: "9px 10px",
                                    borderRadius: active ? 0 : 8,
                                    marginLeft: active ? -8 : 0,
                                    paddingLeft: active ? 18 : 10,
                                    color: active ? "var(--accent-hover)" : "var(--text-secondary)",
                                    fontSize: 13,
                                    fontWeight: active ? 600 : 400,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    userSelect: "none",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <Icon size={15} />
                                    {label}
                                </div>
                                {active && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Nav */}
            <div style={{ borderTop: "1px solid var(--border)", padding: "8px" }}>
                {bottomItems.map(({ icon: Icon, label, href }) => (
                    <Link key={href} href={href} style={{ textDecoration: "none" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 10px",
                                borderRadius: 8,
                                color: "var(--text-muted)",
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "color 0.15s",
                            }}
                        >
                            <Icon size={15} />
                            {label}
                        </div>
                    </Link>
                ))}

                {/* User avatar stub */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px",
                        marginTop: 4,
                        borderTop: "1px solid var(--border)",
                    }}
                >
                    <div
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #ec4899)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "white",
                            flexShrink: 0,
                        }}
                    >
                        SA
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Saafi Admin
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Pro Plan</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
