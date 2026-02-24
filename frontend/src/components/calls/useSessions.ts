/**
 * useSessions — polls the backend /sessions endpoint and merges with
 * seeded mock data so the UI is rich even before a real call happens.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface CallSession {
    call_id: string;
    state: string;
    caller_number: string | null;
    customer_name: string | null;
    service_type: string | null;       // type of service requested
    vin_last4: string | null;
    vehicle_id: string | null;
    offered_slots: string[];
    chosen_slot: string | null;        // preferred appointment time
    appointment_id: string | null;
    transcript: { role: string; text: string }[];
    created_at: string | null;
    ended_at: string | null;
    ended_reason: string | null;
    cost_usd: number | null;
    duration_seconds: number | null;
    summary?: string;
    /** true for seeded demo rows, undefined/false for real backend sessions */
    isDemo?: boolean;
}

// ── Realistic seed data shown before backend sessions exist ──────────────────
const SEED: CallSession[] = [];

function mergeUnique(seeds: CallSession[], live: CallSession[]): CallSession[] {
    if (live.length > 0) {
        // Once real calls exist, only show the real ones. 
        // We sort by recency so the latest calls are at the top.
        return [...live].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    }
    // Fallback to demo data if the backend is empty
    return [...seeds].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export function useSessions(pollIntervalMs = 5000) {
    const [sessions, setSessions] = useState<CallSession[]>(SEED);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${apiBase}/sessions`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { sessions: live } = await res.json();
            setSessions(mergeUnique(SEED, live));
            setError(null);
        } catch {
            setError("Backend offline — showing cached data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchSessions();
        const id = setInterval(fetchSessions, pollIntervalMs);
        return () => clearInterval(id);
    }, [fetchSessions, pollIntervalMs]);

    return { sessions, loading, error, refetch: fetchSessions };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function outcomeFromSession(s: CallSession): { label: string; color: string; bg: string } {
    if (s.appointment_id) return { label: "Booked", color: "#10b981", bg: "rgba(16,185,129,0.12)" };
    if (s.ended_reason === "no-answer" || s.state === "initiated") return { label: "No Answer", color: "#4a6080", bg: "rgba(74,96,128,0.12)" };
    if (s.state === "ended" && !s.appointment_id) return { label: "Callback", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    if (s.state !== "ended" && s.state !== "initiated") return { label: "Live", color: "#6366f1", bg: "rgba(99,102,241,0.12)" };
    return { label: "Unknown", color: "#4a6080", bg: "rgba(74,96,128,0.12)" };
}

export function formatDuration(seconds: number | null): string {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatTime(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
}
