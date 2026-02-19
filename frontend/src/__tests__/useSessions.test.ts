// __tests__/useSessions.test.ts
// Unit tests for helper functions exported from useSessions.ts

import {
    outcomeFromSession,
    formatDuration,
    formatTime,
    type CallSession,
} from "../components/calls/useSessions";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<CallSession> = {}): CallSession {
    return {
        call_id: "test-001",
        state: "ended",
        caller_number: "+14045551234",
        customer_name: null,
        vehicle_id: null,
        vin_last4: null,
        offered_slots: [],
        chosen_slot: null,
        appointment_id: null,
        ended_reason: null,
        cost_usd: null,
        duration_seconds: null,
        transcript: [],
        created_at: new Date().toISOString(),
        ended_at: null,
        ...overrides,
    };
}

// ── outcomeFromSession ────────────────────────────────────────────────────────

describe("outcomeFromSession", () => {
    test("returns Booked when appointment_id is set", () => {
        const s = makeSession({ appointment_id: "apt-abc123" });
        expect(outcomeFromSession(s).label).toBe("Booked");
    });

    test("Booked outcome has green color", () => {
        const s = makeSession({ appointment_id: "apt-abc123" });
        expect(outcomeFromSession(s).color).toBe("#10b981");
    });

    test("returns Live when state is not ended", () => {
        const s = makeSession({ state: "greeting", appointment_id: null });
        expect(outcomeFromSession(s).label).toBe("Live");
    });

    test("returns Live for identifying state (mid-call)", () => {
        const s = makeSession({ state: "identifying", appointment_id: null });
        expect(outcomeFromSession(s).label).toBe("Live");
    });

    test("returns No Answer for 'initiated' state (call arrived but backend missed call-start)", () => {
        const s = makeSession({ state: "initiated", appointment_id: null });
        expect(outcomeFromSession(s).label).toBe("No Answer");
    });

    test("returns No Answer when ended_reason is no-answer", () => {
        const s = makeSession({ ended_reason: "no-answer", state: "ended" });
        expect(outcomeFromSession(s).label).toBe("No Answer");
    });

    test("returns Callback when ended without appointment", () => {
        const s = makeSession({
            ended_reason: "customer-ended-call",
            state: "ended",
            appointment_id: null,
        });
        expect(outcomeFromSession(s).label).toBe("Callback");
    });

    test("Booked takes priority over ended state", () => {
        const s = makeSession({ state: "ended", appointment_id: "apt-x" });
        expect(outcomeFromSession(s).label).toBe("Booked");
    });

    test("each outcome has label, color, and bg fields", () => {
        const cases = [
            makeSession({ appointment_id: "apt-x" }),
            makeSession({ ended_reason: "no-answer", state: "ended" }),
            makeSession({ state: "greeting" }),
            makeSession({ state: "ended", ended_reason: "customer-ended-call" }),
        ];
        for (const s of cases) {
            const result = outcomeFromSession(s);
            expect(result).toHaveProperty("label");
            expect(result).toHaveProperty("color");
            expect(result).toHaveProperty("bg");
        }
    });
});

// ── formatDuration ────────────────────────────────────────────────────────────

describe("formatDuration", () => {
    test("returns em dash for null duration", () => {
        expect(formatDuration(null)).toBe("—");
    });

    test("returns em dash for zero duration (falsy)", () => {
        expect(formatDuration(0)).toBe("—");
    });

    test("formats 45 seconds correctly", () => {
        expect(formatDuration(45)).toBe("0m 45s");
    });

    test("formats exactly 60 seconds as 1m 00s", () => {
        expect(formatDuration(60)).toBe("1m 00s");
    });

    test("formats 127 seconds as 2m 07s", () => {
        expect(formatDuration(127)).toBe("2m 07s");
    });

    test("formats 163 seconds as 2m 43s", () => {
        expect(formatDuration(163)).toBe("2m 43s");
    });

    test("formats 3600 seconds as 60m 00s", () => {
        expect(formatDuration(3600)).toBe("60m 00s");
    });

    test("handles fractional seconds by rounding", () => {
        const result = formatDuration(90.9);
        expect(result).toMatch(/^1m \d{2}s$/);
    });
});

// ── formatTime ────────────────────────────────────────────────────────────────

describe("formatTime", () => {
    test("returns em dash for null", () => {
        expect(formatTime(null)).toBe("—");
    });

    test("returns just now for current timestamp", () => {
        const now = new Date().toISOString();
        expect(formatTime(now)).toBe("just now");
    });

    test("returns minutes ago for 5 minutes ago", () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        expect(formatTime(fiveMinAgo)).toBe("5m ago");
    });

    test("returns hours ago for 2 hours ago", () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        expect(formatTime(twoHoursAgo)).toBe("2h ago");
    });

    test("returns locale date string for old timestamps", () => {
        const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const result = formatTime(oldDate);
        expect(result).not.toMatch(/ago$/);
        expect(result.length).toBeGreaterThan(4);
    });

    test("returns 59m ago for 59 minutes ago", () => {
        const fiftyNineMin = new Date(Date.now() - 59 * 60 * 1000).toISOString();
        expect(formatTime(fiftyNineMin)).toBe("59m ago");
    });
});
