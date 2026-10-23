import {
    InfiniteData,
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

import {
    deleteNotification,
    getNotifications,
    markNotificationRead,
    markNotificationsSeen,
} from "@/api/notifications";
import { queryKeys } from "@/lib/queryKeys";
import { NotificationItem, NotificationsResponse } from "@/types/notification";

const PAGE_SIZE = 20;

export function useNotifications() {
    const query = useInfiniteQuery({
        queryKey: queryKeys.notifications(),
        queryFn: async ({ pageParam }) => {
            const response = await getNotifications(pageParam, PAGE_SIZE);
            return response;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const meta = lastPage?.meta;
            if (!meta) return undefined;
            if (typeof meta.hasNext === "boolean") {
                return meta.hasNext ? meta.page + 1 : undefined;
            }
            return meta.page < meta.totalPages ? meta.page + 1 : undefined;
        },
    });

    const pages = query.data?.pages;

    const notifications = useMemo<NotificationItem[]>(() => {
        if (!pages) return [];
        const seen = new Set<string>();
        const merged: NotificationItem[] = [];
        for (const page of pages) {
            const list = page?.data?.items ?? page?.data?.notifications ?? [];
            for (const item of list) {
                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    merged.push(item);
                }
            }
        }
        return merged;
    }, [pages]);

    const unreadCount = pages?.[0]?.data?.unreadCount ?? 0;

    function loadMore() {
        if (!query.hasNextPage || query.isFetchingNextPage) return;
        void query.fetchNextPage();
    }

    return {
        notifications,
        unreadCount,
        isLoading: query.isPending,
        isRefetching: query.isRefetching,
        isLoadingMore: query.isFetchingNextPage,
        hasMore: Boolean(query.hasNextPage),
        loadMore,
        refetch: query.refetch,
        error: query.error,
    };
}

/**
 * Stamps the feed as seen once on visit, zeroing the cached `unreadCount` so the header bell
 * badge clears without clobbering the row `unread` flags in the feed during the current visit.
 */
export function useMarkNotificationsSeen() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => markNotificationsSeen(),
        onSuccess: () => {
            queryClient.setQueryData<InfiniteData<NotificationsResponse>>(
                queryKeys.notifications(),
                (data) => {
                    if (!data) return data;
                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: {
                                ...page.data,
                                unreadCount: 0,
                            },
                        })),
                    };
                }
            );
        },
    });
}

/**
 * Explicit user action to mark all notifications as read. Optimistically clears all unread
 * states in the cache and invalidates the query with the server.
 */
export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => markNotificationsSeen(),
        onMutate: async () => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.notifications(),
            });
            const previous =
                queryClient.getQueryData<InfiniteData<NotificationsResponse>>(
                    queryKeys.notifications()
                );

            queryClient.setQueryData<InfiniteData<NotificationsResponse>>(
                queryKeys.notifications(),
                (data) => {
                    if (!data) return data;
                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: {
                                ...page.data,
                                unreadCount: 0,
                                items: (page.data?.items ?? []).map((item) => ({
                                    ...item,
                                    unread: false,
                                })),
                                notifications: (
                                    page.data?.notifications ?? []
                                ).map((item) => ({
                                    ...item,
                                    unread: false,
                                })),
                            },
                        })),
                    };
                }
            );

            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    queryKeys.notifications(),
                    context.previous
                );
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications(),
            });
        },
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => markNotificationRead(id),
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.notifications(),
            });
            const previous =
                queryClient.getQueryData<InfiniteData<NotificationsResponse>>(
                    queryKeys.notifications()
                );

            queryClient.setQueryData<InfiniteData<NotificationsResponse>>(
                queryKeys.notifications(),
                (data) => {
                    if (!data) return data;
                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: {
                                ...page.data,
                                items: (page.data?.items ?? []).map((item) =>
                                    item.id === id
                                        ? { ...item, unread: false }
                                        : item
                                ),
                                notifications: (
                                    page.data?.notifications ?? []
                                ).map((item) =>
                                    item.id === id
                                        ? { ...item, unread: false }
                                        : item
                                ),
                            },
                        })),
                    };
                }
            );

            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    queryKeys.notifications(),
                    context.previous
                );
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications(),
            });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteNotification(id),
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.notifications(),
            });
            const previous =
                queryClient.getQueryData<InfiniteData<NotificationsResponse>>(
                    queryKeys.notifications()
                );

            queryClient.setQueryData<InfiniteData<NotificationsResponse>>(
                queryKeys.notifications(),
                (data) => {
                    if (!data) return data;
                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: {
                                ...page.data,
                                items: (page.data?.items ?? []).filter(
                                    (item) => item.id !== id
                                ),
                                notifications: (
                                    page.data?.notifications ?? []
                                ).filter((item) => item.id !== id),
                            },
                        })),
                    };
                }
            );

            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    queryKeys.notifications(),
                    context.previous
                );
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications(),
            });
        },
    });
}
