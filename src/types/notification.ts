export type NotificationType =
    | "Follow"
    | "PostLike"
    | "PostComment"
    | "CommunityJoinRequested"
    | "CommunityJoinRequestApproved"
    | "CommunityJoinRequestRejected"
    | "CommunityMemberRemoved"
    | "CommunityRoleChanged"
    | "CommunityPostRemoved";

export type NotificationActor = {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
};

export type NotificationItem = {
    id: string;
    type: NotificationType;
    createdAt: string;
    unread: boolean;
    actor: NotificationActor;
    postId?: string | null;
    communityName?: string | null;
    communitySlug?: string | null;
};

export type NotificationsFeedData = {
    unreadCount: number;
    notifications: NotificationItem[];
};

export type NotificationsPageMeta = {
    page: number;
    pageSize: number;
    totalPages: number;
};

export type NotificationsResponse = {
    success: boolean;
    count: number;
    meta: NotificationsPageMeta;
    data: NotificationsFeedData;
};
