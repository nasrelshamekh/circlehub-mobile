jest.mock("expo-secure-store", () => ({
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-crypto", () => ({
    getRandomBytes: jest.fn((size: number) => new Uint8Array(size)),
    randomUUID: jest.fn(() => "11111111-2222-4333-8444-555555555555"),
}));

jest.mock("@/api/keys", () => ({
    getUserDeviceKeys: jest.fn(),
    registerDeviceKey: jest.fn(),
    getKeyBackup: jest.fn(),
    saveKeyBackup: jest.fn(),
    deleteKeyBackup: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
    getToken: jest.fn(async () => null),
}));

import type { DeviceKeyDto } from "@/api/keys";
import { isLivenessStale, selectWrapTargets } from "@/services/messageCrypto";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-21T12:00:00Z");

function key(deviceId: string, daysAgo: number): DeviceKeyDto {
    const at = new Date(NOW - daysAgo * DAY).toISOString();
    return { deviceId, publicKey: `pk-${deviceId}`, createdAt: at, lastSeenAt: at };
}

describe("selectWrapTargets", () => {
    it("never wraps for more than 8 devices", () => {
        const own = Array.from({ length: 5 }, (_, i) => key(`own-${i}`, i));
        const recipient = Array.from({ length: 12 }, (_, i) => key(`rec-${i}`, i));

        const targets = selectWrapTargets(own, recipient, "own-3");

        expect(targets).toHaveLength(8);
    });

    it("puts the current device first even when it is not the most recently seen", () => {
        const own = [key("own-new", 0), key("own-old", 10), key("current", 20)];

        const targets = selectWrapTargets(own, [key("rec", 0)], "current");

        expect(targets[0].deviceId).toBe("current");
    });

    it("caps the sender's own devices at 2 so the recipient keeps the rest of the budget", () => {
        const own = Array.from({ length: 8 }, (_, i) => key(`own-${i}`, i));
        const recipient = Array.from({ length: 8 }, (_, i) => key(`rec-${i}`, i));

        const targets = selectWrapTargets(own, recipient, "own-0");

        expect(targets.filter((t) => t.deviceId.startsWith("own-"))).toHaveLength(2);
        expect(targets.filter((t) => t.deviceId.startsWith("rec-"))).toHaveLength(6);
    });

    it("keeps the recipient's most recently seen devices when it has to drop some", () => {
        const recipient = [key("stale", 25), key("fresh", 0), key("mid", 5), ...Array.from({ length: 6 }, (_, i) => key(`r${i}`, 1 + i * 0.1))];

        const targets = selectWrapTargets([key("me", 0)], recipient, "me");
        const ids = targets.map((t) => t.deviceId);

        expect(ids).toContain("fresh");
        expect(ids).not.toContain("stale");
    });

    it("falls back to createdAt for a key without lastSeenAt", () => {
        const legacy = { deviceId: "legacy", publicKey: "pk", createdAt: new Date(NOW).toISOString() } as DeviceKeyDto;
        const targets = selectWrapTargets([], [key("old", 3), legacy], "me");

        expect(targets[0].deviceId).toBe("legacy");
    });
});

describe("isLivenessStale", () => {
    it("is false for a key seen within the last day", () => {
        expect(isLivenessStale(key("a", 0.5), NOW)).toBe(false);
    });

    it("is true once the stamp is more than a day old", () => {
        expect(isLivenessStale(key("a", 2), NOW)).toBe(true);
    });

    it("treats a missing or unparseable stamp as stale", () => {
        expect(isLivenessStale({ createdAt: "not a date" }, NOW)).toBe(true);
    });
});
