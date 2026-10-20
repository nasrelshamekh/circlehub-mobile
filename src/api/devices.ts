import { apiFetch } from "./client";

export type DeviceTokenDto = {
    token: string;
    platform: string;
    updatedAt: string;
};

export function registerDeviceToken(token: string, platform: string) {
    return apiFetch<{ success: boolean; data: DeviceTokenDto }>("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, platform }),
    });
}

export function unregisterDeviceToken(token: string) {
    return apiFetch<{ success: boolean; message: string }>(
        `/api/devices?token=${encodeURIComponent(token)}`,
        {
            method: "DELETE",
        }
    );
}
