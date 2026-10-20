import { apiFetch } from "./client";
import { NotificationsResponse } from "@/types/notification";

export function getNotifications(page = 1, pageSize = 20) {
    return apiFetch<NotificationsResponse>(
        `/api/Notifications?page=${page}&pageSize=${pageSize}`
    );
}

export function markNotificationsSeen() {
    return apiFetch<{ success: boolean }>("/api/Notifications/seen", {
        method: "POST",
    });
}

export function markNotificationRead(id: string) {
    return apiFetch<{ success: boolean }>(`/api/Notifications/${id}/read`, {
        method: "POST",
    });
}

export function deleteNotification(id: string) {
    return apiFetch<{ success: boolean }>(`/api/Notifications/${id}`, {
        method: "DELETE",
    });
}
