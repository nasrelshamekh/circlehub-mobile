import { apiFetch } from "./client";

export type DeviceKeyDto = {
    deviceId: string;
    publicKey: string;
    createdAt: string;
    /** When this device last published a key — the order the directory is useful in. */
    lastSeenAt?: string;
};

export type KeyBackupDto = {
    wrappedAccountKey: string;
    salt: string;
    kdfIterations: number;
    kdfAlgorithm: string;
    updatedAt: string;
};

export type SaveKeyBackupInput = {
    wrappedAccountKey: string;
    salt: string;
    kdfIterations: number;
    kdfAlgorithm: string;
};

export function getUserDeviceKeys(username: string) {
    return apiFetch<{ success: boolean; count: number; data: DeviceKeyDto[] }>(
        `/api/keys/${encodeURIComponent(username)}`
    );
}

export function registerDeviceKey(deviceId: string, publicKey: string) {
    return apiFetch<{ success: boolean; data: DeviceKeyDto }>("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, publicKey }),
    });
}

export function getKeyBackup() {
    return apiFetch<{ success: boolean; data: KeyBackupDto }>(
        "/api/keys/backup"
    );
}

export function saveKeyBackup(input: SaveKeyBackupInput) {
    return apiFetch<{ success: boolean; data: KeyBackupDto }>(
        "/api/keys/backup",
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }
    );
}

export function deleteKeyBackup() {
    return apiFetch<{ success: boolean; message: string }>(
        "/api/keys/backup",
        {
            method: "DELETE",
        }
    );
}
