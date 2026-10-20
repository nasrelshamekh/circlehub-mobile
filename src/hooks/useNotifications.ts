import {
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
import { NotificationItem } from "@/types/notification";

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
            return meta.page < meta.totalPages ? meta.page + 1 : undefined;
        },
    });

    const pages = query.data?.pages;

    const notifications = useMemo<NotificationItem[]>(() => {
        if (!pages) return [];
        const seen = new Set<string>();
        const merged: NotificationItem[] = [];
        for (const page of pages) {
            for (const item of page.data?.notifications ?? []) {
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

export function useMarkNotificationsSeen() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => markNotificationsSeen(),
        onSuccess: () => {
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
        onSuccess: () => {
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
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications(),
            });
        },
    });
}
