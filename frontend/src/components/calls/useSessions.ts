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
    /** true for seeded demo rows, undefined/false for real backend sessions */
    isDemo?: boolean;
}

// ── Realistic seed data shown before backend sessions exist ──────────────────
const SEED: CallSession[] = [
    {
        call_id: "demo-001",
        state: "ended",
        caller_number: "+14045551234",
        customer_name: "Marcus Thompson",
        service_type: "Oil Change",
        vin_last4: null,
        vehicle_id: null,
        offered_slots: [],
        chosen_slot: "Thursday morning, around 9 AM",
        appointment_id: "APT-MK9X2A",
        transcript: [
            { role: "assistant", text: "Hi, thank you for calling Westside Auto Group! This is Sofia, how can I help you today?" },
            { role: "user", text: "Hey yeah, I need to book an oil change." },
            { role: "assistant", text: "Of course! Can I get your name?" },
            { role: "user", text: "Marcus Thompson." },
            { role: "assistant", text: "Great, Marcus. And a good callback number for you?" },
            { role: "user", text: "404-555-1234." },
            { role: "assistant", text: "Perfect. What day and time works best for you?" },
            { role: "user", text: "Thursday morning, around 9." },
            { role: "assistant", text: "Got it — oil change for Marcus Thompson Thursday morning at 9. Does everything look good?" },
            { role: "user", text: "Yep, perfect." },
            { role: "assistant", text: "Wonderful! You're all set. Text confirmation on its way. Have a great day!" },
        ],
        created_at: "2026-02-19T06:48:00Z",
        ended_at: "2026-02-19T06:50:07Z",
        ended_reason: "customer-ended-call",
        cost_usd: 0.0038,
        duration_seconds: 127,
        isDemo: true,
    },
    {
        call_id: "demo-002",
        state: "ended",
        caller_number: "+14045550293",
        customer_name: "Sarah Mitchell",
        service_type: "Brake Inspection",
        vin_last4: null,
        vehicle_id: null,
        offered_slots: [],
        chosen_slot: null,
        appointment_id: null,
        transcript: [
            { role: "assistant", text: "Hi, thank you for calling Westside Auto Group! This is Sofia." },
            { role: "user", text: "Hi, my car is making a rattling noise when I brake." },
            { role: "assistant", text: "That's worth getting checked out. What's your name?" },
            { role: "user", text: "Sarah Mitchell." },
            { role: "assistant", text: "And a callback number for you, Sarah?" },
            { role: "user", text: "Can I call back tomorrow? I need to check my schedule." },
            { role: "assistant", text: "Of course! We're open 8 to 5. Just ask for Sofia when you call back." },
        ],
        created_at: "2026-02-19T06:25:00Z",
        ended_at: "2026-02-19T06:27:43Z",
        ended_reason: "customer-ended-call",
        cost_usd: 0.0029,
        duration_seconds: 163,
        isDemo: true,
    },
    {
        call_id: "demo-003",
        state: "ended",
        caller_number: "+14045550874",
        customer_name: "David Kim",
        service_type: "Oil Change",
        vin_last4: null,
        vehicle_id: null,
        offered_slots: [],
        chosen_slot: "Monday at 8 AM",
        appointment_id: "APT-DKX9B3",
        transcript: [
            { role: "assistant", text: "Hi, thank you for calling Westside Auto Group! This is Sofia, how can I help?" },
            { role: "user", text: "Yeah hi, oil change for my BMW please." },
            { role: "assistant", text: "Happy to help! What's your name?" },
            { role: "user", text: "David Kim." },
            { role: "assistant", text: "And your best callback number?" },
            { role: "user", text: "404-555-0874." },
            { role: "assistant", text: "When works best — do you have a day in mind?" },
            { role: "user", text: "Monday morning." },
            { role: "assistant", text: "Monday at 8 AM work for you?" },
            { role: "user", text: "Perfect." },
            { role: "assistant", text: "You're all set! Text confirmation on its way. Drive safe!" },
        ],
        created_at: "2026-02-19T05:41:00Z",
        ended_at: "2026-02-19T05:43:14Z",
        ended_reason: "customer-ended-call",
        cost_usd: 0.0044,
        duration_seconds: 134,
        isDemo: true,
    },
    {
        call_id: "demo-004",
        state: "ended",
        caller_number: "+14045557721",
        customer_name: null,
        service_type: null,
        vin_last4: null,
        vehicle_id: null,
        offered_slots: [],
        chosen_slot: null,
        appointment_id: null,
        transcript: [
            { role: "assistant", text: "Hi, thank you for calling Westside Auto Group! This is Sofia, how can I help you today?" },
        ],
        created_at: "2026-02-19T05:10:00Z",
        ended_at: "2026-02-19T05:10:09Z",
        ended_reason: "no-answer",
        cost_usd: 0.0004,
        duration_seconds: 9,
        isDemo: true,
    },
];

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${apiBase}/sessions`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { sessions: live } = await res.json();
            setSessions(mergeUnique(SEED, live));
            setError(null);
        } catch (e: unknown) {
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
