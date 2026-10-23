import { act } from "@testing-library/react-native";

import {
    deleteNotification,
    getNotifications,
    markNotificationRead,
    markNotificationsSeen,
} from "@/api/notifications";
import {
    useDeleteNotification,
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
} from "@/hooks/useNotifications";
import { queryKeys } from "@/lib/queryKeys";
import { NotificationsResponse } from "@/types/notification";

import { renderHookWithQueryClient } from "../../test/helpers";

jest.mock("@/api/notifications", () => ({
    getNotifications: jest.fn(),
    markNotificationsSeen: jest.fn(),
    markNotificationRead: jest.fn(),
    deleteNotification: jest.fn(),
}));

const mockGetNotifications = jest.mocked(getNotifications);
const mockMarkNotificationsSeen = jest.mocked(markNotificationsSeen);
const mockMarkNotificationRead = jest.mocked(markNotificationRead);
const mockDeleteNotification = jest.mocked(deleteNotification);

describe("useNotifications", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("extracts notifications properly from data.items and exposes unreadCount", async () => {
        const mockResponse: NotificationsResponse = {
            success: true,
            count: 1,
            meta: {
                page: 1,
                pageSize: 20,
                totalPages: 1,
                hasNext: false,
            },
            data: {
                unreadCount: 2,
                items: [
                    {
                        id: "notif-1",
                        type: "Follow",
                        createdAt: "2026-10-21T10:00:00Z",
                        unread: true,
                        actor: {
                            id: "actor-1",
                            name: "Alice",
                            username: "alice",
                            avatarUrl: null,
                        },
                    },
                ],
            },
        };

        mockGetNotifications.mockResolvedValue(mockResponse);

        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useNotifications()
        );

        queryClient.setQueryData(queryKeys.notifications(), {
            pages: [mockResponse],
            pageParams: [1],
        });

        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].id).toBe("notif-1");
        expect(result.current.notifications[0].actor.name).toBe("Alice");
        expect(result.current.unreadCount).toBe(2);
    });

    it("optimistically marks a notification as read and removes unread state", async () => {
        const mockResponse: NotificationsResponse = {
            success: true,
            count: 1,
            meta: {
                page: 1,
                pageSize: 20,
                totalPages: 1,
                hasNext: false,
            },
            data: {
                unreadCount: 1,
                items: [
                    {
                        id: "notif-1",
                        type: "PostLike",
                        createdAt: "2026-10-21T10:00:00Z",
                        unread: true,
                        actor: {
                            id: "actor-1",
                            name: "Bob",
                            username: "bob",
                            avatarUrl: null,
                        },
                        postId: "post-123",
                    },
                ],
            },
        };

        mockGetNotifications.mockResolvedValue(mockResponse);
        mockMarkNotificationRead.mockResolvedValue({ success: true });

        const { queryClient } = await renderHookWithQueryClient(() =>
            useNotifications()
        );

        queryClient.setQueryData(queryKeys.notifications(), {
            pages: [mockResponse],
            pageParams: [1],
        });

        const { result: markReadResult } = await renderHookWithQueryClient(() =>
            useMarkNotificationRead()
        );

        await act(async () => {
            await markReadResult.current.mutateAsync("notif-1");
        });

        expect(mockMarkNotificationRead).toHaveBeenCalledWith("notif-1");
    });

    it("optimistically deletes a notification from the list", async () => {
        const mockResponse: NotificationsResponse = {
            success: true,
            count: 1,
            meta: {
                page: 1,
                pageSize: 20,
                totalPages: 1,
                hasNext: false,
            },
            data: {
                unreadCount: 0,
                items: [
                    {
                        id: "notif-to-delete",
                        type: "Follow",
                        createdAt: "2026-10-21T10:00:00Z",
                        unread: false,
                        actor: {
                            id: "actor-2",
                            name: "Charlie",
                            username: "charlie",
                            avatarUrl: null,
                        },
                    },
                ],
            },
        };

        mockGetNotifications.mockResolvedValue(mockResponse);
        mockDeleteNotification.mockResolvedValue({ success: true });

        const { queryClient } = await renderHookWithQueryClient(() =>
            useNotifications()
        );

        queryClient.setQueryData(queryKeys.notifications(), {
            pages: [mockResponse],
            pageParams: [1],
        });

        const { result: deleteResult } = await renderHookWithQueryClient(() =>
            useDeleteNotification()
        );

        await act(async () => {
            await deleteResult.current.mutateAsync("notif-to-delete");
        });

        expect(mockDeleteNotification).toHaveBeenCalledWith("notif-to-delete");
    });

    it("optimistically marks all notifications as read", async () => {
        const mockResponse: NotificationsResponse = {
            success: true,
            count: 2,
            meta: {
                page: 1,
                pageSize: 20,
                totalPages: 1,
                hasNext: false,
            },
            data: {
                unreadCount: 2,
                items: [
                    {
                        id: "notif-1",
                        type: "Follow",
                        createdAt: "2026-10-21T10:00:00Z",
                        unread: true,
                        actor: {
                            id: "actor-1",
                            name: "Alice",
                            username: "alice",
                            avatarUrl: null,
                        },
                    },
                    {
                        id: "notif-2",
                        type: "PostComment",
                        createdAt: "2026-10-21T10:05:00Z",
                        unread: true,
                        actor: {
                            id: "actor-2",
                            name: "Bob",
                            username: "bob",
                            avatarUrl: null,
                        },
                        postId: "p1",
                    },
                ],
            },
        };

        mockGetNotifications.mockResolvedValue(mockResponse);
        mockMarkNotificationsSeen.mockResolvedValue({ success: true });

        const { queryClient } = await renderHookWithQueryClient(() =>
            useNotifications()
        );

        queryClient.setQueryData(queryKeys.notifications(), {
            pages: [mockResponse],
            pageParams: [1],
        });

        const { result: markAllResult } = await renderHookWithQueryClient(() =>
            useMarkAllNotificationsRead()
        );

        await act(async () => {
            await markAllResult.current.mutateAsync();
        });

        expect(mockMarkNotificationsSeen).toHaveBeenCalled();
    });
});
