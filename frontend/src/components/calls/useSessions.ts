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
    vin_last4: string | null;
    vehicle_id: string | null;
    offered_slots: string[];
    chosen_slot: string | null;
    appointment_id: string | null;
    transcript: { role: string; text: string }[];
    created_at: string | null;
    ended_at: string | null;
    ended_reason: string | null;
    cost_usd: number | null;
    duration_seconds: number | null;
}

// ── Realistic seed data shown before backend sessions exist ──────────────────
const SEED: CallSession[] = [
    {
        call_id: "demo-001",
        state: "ended",
        caller_number: "+14045551234",
        customer_name: "Marcus Thompson",
        vin_last4: "4872",
        vehicle_id: "v-4872",
        offered_slots: ["Thursday, Feb 20 at 9:00 AM", "Thursday, Feb 20 at 2:00 PM"],
        chosen_slot: "Thursday, Feb 20 at 9:00 AM",
        appointment_id: "apt-mk9x2a",
        transcript: [
            { role: "assistant", text: "Hi, you've reached Westside Auto. I'm Saafi, how can I help?" },
            { role: "user", text: "Hi yeah I need to schedule a service appointment for my F-150." },
            { role: "assistant", text: "Happy to help! Could I get your name and the last 4 of your VIN?" },
            { role: "user", text: "Marcus. VIN ends in 4872." },
            { role: "assistant", text: "Thanks Marcus! I see your 2021 Ford F-150. We have Thursday at 9 AM or 2 PM — which works?" },
            { role: "user", text: "9 AM works great." },
            { role: "assistant", text: "Perfect! Booked for Thursday Feb 20 at 9 AM. You'll get a text confirmation. Have a great day!" },
        ],
        created_at: "2026-02-19T06:48:00Z",
        ended_at: "2026-02-19T06:50:07Z",
        ended_reason: "customer-ended-call",
        cost_usd: 0.0038,
        duration_seconds: 127,
    },
    {
        call_id: "demo-002",
        state: "ended",
        caller_number: "+14045550293",
        customer_name: "Sarah Mitchell",
        vin_last4: "3391",
        vehicle_id: "v-3391",
        offered_slots: ["Friday, Feb 21 at 10:00 AM"],
        chosen_slot: null,
        appointment_id: null,
        transcript: [
            { role: "assistant", text: "Hi, this is Saafi at Westside Auto. How can I help you today?" },
            { role: "user", text: "I'm calling about my Honda Accord, it's making a weird noise." },
            { role: "assistant", text: "I understand. What kind of noise — grinding, clicking, or something else?" },
            { role: "user", text: "Kind of a rattling when I brake." },
            { role: "assistant", text: "That could be a brake inspection. Can I schedule you in this Friday at 10 AM?" },
            { role: "user", text: "Can you call me back tomorrow? I need to check my schedule." },
        ],
        created_at: "2026-02-19T06:25:00Z",
        ended_at: "2026-02-19T06:27:43Z",
        ended_reason: "customer-ended-call",
        cost_usd: 0.0029,
        duration_seconds: 163,
    },
    {
        call_id: "demo-003",
        state: "ended",
        caller_number: "+14045550874",
        customer_name: "David Kim",
        vin_last4: "7741",
        vehicle_id: "v-7741",
        offered_slots: [],
        chosen_slot: null,
        appointment_id: "apt-dkx9b3",
        transcript: [
            { role: "assistant", text: "Hi! Westside Auto, this is Saafi. How can I help?" },
            { role: "user", text: "Yeah hi, I need an oil change for my BMW." },
            { role: "assistant", text: "Of course! What are the last 4 digits of your VIN?" },
            { role: "user", text: "7741." },
            { role: "assistant", text: "Got it — 2022 BMW 3 Series for David Kim. Next available is Monday at 8 AM. Want that?" },
            { role: "user", text: "Yes, perfect." },
            { role: "assistant", text: "Done! Booked for Monday. Confirmation SMS on its way. Anything else?" },
            { role: "user", text: "Nope, thanks." },
        ],
        created_at: "2026-02-19T05:41:00Z",
        ended_at: "2026-02-19T05:43:14Z",
        ended_reason: "customer-ended-call",
        cost_usd: 0.0044,
        duration_seconds: 134,
    },
    {
        call_id: "demo-004",
        state: "ended",
        caller_number: "+14045557721",
        customer_name: null,
        vin_last4: null,
        vehicle_id: null,
        offered_slots: [],
        chosen_slot: null,
        appointment_id: null,
        transcript: [
            { role: "assistant", text: "Hi, you've reached Westside Auto. I'm Saafi. How can I help?" },
        ],
        created_at: "2026-02-19T05:10:00Z",
        ended_at: "2026-02-19T05:10:09Z",
        ended_reason: "no-answer",
        cost_usd: 0.0004,
        duration_seconds: 9,
    },
];

function mergeUnique(seeds: CallSession[], live: CallSession[]): CallSession[] {
    const ids = new Set(live.map(s => s.call_id));
    const deduped = seeds.filter(s => !ids.has(s.call_id));
    return [...live, ...deduped].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
    );
}

export function useSessions(pollIntervalMs = 5000) {
    const [sessions, setSessions] = useState<CallSession[]>(SEED);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8000/sessions");
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
    if (s.ended_reason === "no-answer") return { label: "No Answer", color: "#4a6080", bg: "rgba(74,96,128,0.12)" };
    if (!s.appointment_id && s.state === "ended") return { label: "Callback", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    if (s.state !== "ended") return { label: "Live", color: "#6366f1", bg: "rgba(99,102,241,0.12)" };
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
