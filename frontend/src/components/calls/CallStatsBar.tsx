"use client";

import { Phone, CheckCircle, Clock, MessageSquare } from "lucide-react";
import type { CallSession } from "./useSessions";
import { outcomeFromSession, formatDuration } from "./useSessions";

interface Props {
    sessions: CallSession[];
}

export default function CallStatsBar({ sessions }: Props) {
    const ended = sessions.filter(s => s.state === "ended");
    const booked = sessions.filter(s => s.appointment_id);
    const live = sessions.filter(s => s.state !== "ended");
    const avgDur =
        ended.length > 0
            ? ended.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / ended.length
            : 0;

    const stats = [
        {
            icon: Phone,
            label: "Total Calls",
            value: sessions.length.toString(),
            color: "#6366f1",
        },
        {
            icon: CheckCircle,
            label: "Booked",
            value: `${booked.length}`,
            sub: `${ended.length > 0 ? Math.round((booked.length / ended.length) * 100) : 0}% conversion`,
            color: "#10b981",
        },
        {
            icon: Clock,
            label: "Avg Duration",
            value: formatDuration(avgDur) === "—" ? "—" : formatDuration(avgDur),
            color: "#f59e0b",
        },
        {
            icon: MessageSquare,
            label: "Live Now",
            value: live.length.toString(),
            color: live.length > 0 ? "#6366f1" : "#4a6080",
        },
    ];

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {stats.map(stat => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.label}
                        className="card"
                        style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 9,
                                background: `${stat.color}18`,
                                border: `1px solid ${stat.color}30`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <Icon size={16} color={stat.color} />
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{stat.label}</div>
                            {stat.sub && (
                                <div style={{ fontSize: 10, color: stat.color, fontWeight: 500, marginTop: 1 }}>{stat.sub}</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
