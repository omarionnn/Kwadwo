"use client";

import { useState, useEffect, useCallback } from "react";

import Topbar from "@/components/sidebar/Topbar";
import {
    CheckCircle, AlertTriangle, XCircle, Clock,
    RefreshCw, Globe, Wifi, ArrowUpRight
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Monitor {
    id: number;
    name: string;
    url: string;
    status: string;
    statusColor: string;
    uptimeDay: number;
    uptimeWeek: number;
    uptimeMonth: number;
    responseTime: number;
    lastChecked: string | null;
}

/* ── Status helpers ─────────────────────────────────────────────────────── */

function statusIcon(color: string) {
    if (color === "green") return <CheckCircle size={18} color="#10b981" />;
    if (color === "yellow") return <AlertTriangle size={18} color="#f59e0b" />;
    if (color === "red") return <XCircle size={18} color="#ef4444" />;
    return <Clock size={18} color="var(--text-muted)" />;
}

function statusBadgeStyle(color: string): React.CSSProperties {
    const map: Record<string, { bg: string; fg: string; border: string }> = {
        green: { bg: "rgba(16,185,129,0.12)", fg: "#10b981", border: "#10b98130" },
        yellow: { bg: "rgba(245,158,11,0.12)", fg: "#f59e0b", border: "#f59e0b30" },
        red: { bg: "rgba(239,68,68,0.12)", fg: "#ef4444", border: "#ef444430" },
        gray: { bg: "rgba(100,116,139,0.12)", fg: "#64748b", border: "#64748b30" },
    };
    const s = map[color] || map.gray;
    return {
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 600, color: s.fg,
        background: s.bg, border: `1px solid ${s.border}`,
        padding: "4px 12px", borderRadius: 999,
    };
}

function uptimeBarColor(pct: number): string {
    if (pct >= 99.5) return "#10b981";
    if (pct >= 98) return "#f59e0b";
    return "#ef4444";
}

function formatLastChecked(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return d.toLocaleTimeString();
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function StatusPage() {
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const fetchStatus = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) setRefreshing(true);
            const res = await fetch(`${apiBase}/api/status`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setMonitors(data.monitors || []);
            setError(null);
        } catch {
            setError("Could not load status — is the backend running?");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [apiBase]);

    useEffect(() => {
        fetchStatus();
        const id = setInterval(() => fetchStatus(), 60000); // refresh every 60s
        return () => clearInterval(id);
    }, [fetchStatus]);

    // Overall status
    const overallStatus = monitors.length === 0
        ? { label: "Loading...", color: "gray" }
        : monitors.every(m => m.statusColor === "green")
            ? { label: "All Systems Operational", color: "green" }
            : monitors.some(m => m.statusColor === "red")
                ? { label: "Service Disruption", color: "red" }
                : { label: "Degraded Performance", color: "yellow" };

    return (
        <>
            <Topbar title="System Status" subtitle="Real-time service health monitoring" />

            <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 10, color: "var(--text-muted)" }}>
                        <RefreshCw size={16} className="spin" /> Loading status...
                    </div>
                ) : error ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)", fontSize: 14 }}>
                        {error}
                    </div>
                ) : (
                    <>
                        {/* Overall Status Banner */}
                        <div
                            className="card"
                            style={{
                                padding: "24px 28px",
                                marginBottom: 24,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                {statusIcon(overallStatus.color)}
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                                        {overallStatus.label}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                        Monitoring {monitors.length} service{monitors.length !== 1 ? "s" : ""}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => fetchStatus(true)}
                                className="btn-ghost"
                                style={{ gap: 6 }}
                                disabled={refreshing}
                            >
                                <RefreshCw size={13} className={refreshing ? "spin" : ""} />
                                {refreshing ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>

                        {/* Monitor Cards */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {monitors.map(monitor => (
                                <div key={monitor.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                                    {/* Header */}
                                    <div style={{
                                        padding: "16px 20px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        borderBottom: "1px solid var(--border)",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 9,
                                                background: `${uptimeBarColor(monitor.uptimeDay)}18`,
                                                border: `1px solid ${uptimeBarColor(monitor.uptimeDay)}30`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                <Globe size={16} color={uptimeBarColor(monitor.uptimeDay)} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                                    {monitor.name}
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                                                    {monitor.url}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={statusBadgeStyle(monitor.statusColor)}>
                                            {statusIcon(monitor.statusColor)}
                                            {monitor.status}
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(4, 1fr)",
                                        gap: 0,
                                    }}>
                                        {[
                                            { label: "24h Uptime", value: `${monitor.uptimeDay.toFixed(2)}%`, pct: monitor.uptimeDay },
                                            { label: "7d Uptime", value: `${monitor.uptimeWeek.toFixed(2)}%`, pct: monitor.uptimeWeek },
                                            { label: "30d Uptime", value: `${monitor.uptimeMonth.toFixed(2)}%`, pct: monitor.uptimeMonth },
                                            { label: "Response Time", value: `${monitor.responseTime}ms`, pct: null },
                                        ].map((stat, i) => (
                                            <div
                                                key={stat.label}
                                                style={{
                                                    padding: "16px 20px",
                                                    borderRight: i < 3 ? "1px solid var(--border)" : "none",
                                                }}
                                            >
                                                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                                                    {stat.label}
                                                </div>
                                                <div style={{
                                                    fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px",
                                                    color: stat.pct !== null ? uptimeBarColor(stat.pct) : "var(--text-primary)",
                                                }}>
                                                    {stat.value}
                                                </div>
                                                {stat.pct !== null && (
                                                    <div style={{
                                                        marginTop: 8, height: 4, borderRadius: 2,
                                                        background: "var(--bg-hover)", overflow: "hidden",
                                                    }}>
                                                        <div style={{
                                                            height: "100%", borderRadius: 2,
                                                            width: `${Math.min(stat.pct, 100)}%`,
                                                            background: uptimeBarColor(stat.pct),
                                                            transition: "width 0.5s ease",
                                                        }} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div style={{
                                        padding: "10px 20px",
                                        borderTop: "1px solid var(--border)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        background: "var(--bg-surface)",
                                    }}>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                            <Wifi size={11} /> Last checked: {formatLastChecked(monitor.lastChecked)}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                            Powered by UptimeRobot <ArrowUpRight size={10} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
        </>
    );
}
