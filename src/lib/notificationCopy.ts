import { router } from "expo-router";

import { NotificationItem } from "@/types/notification";

const FALLBACK_COMMUNITY = "a community";

export function notificationSentence(notification: NotificationItem): string {
    const community = notification.communityName ?? FALLBACK_COMMUNITY;

    switch (notification.type) {
        case "Follow":
            return "started following you.";
        case "PostLike":
            return "liked your post.";
        case "PostComment":
            return "commented on your post.";
        case "CommunityJoinRequested":
            return `asked to join ${community}.`;
        case "CommunityJoinRequestApproved":
            return `approved your request to join ${community}.`;
        case "CommunityJoinRequestRejected":
            return `declined your request to join ${community}.`;
        case "CommunityMemberRemoved":
            return `removed you from ${community}.`;
        case "CommunityRoleChanged":
            return `changed your role in ${community}.`;
        case "CommunityPostRemoved":
            return `removed your post in ${community}.`;
        default:
            return "did something you might want to see.";
    }
}

export function hasNotificationTarget(
    notification: NotificationItem
): boolean {
    switch (notification.type) {
        case "Follow":
            return Boolean(notification.actor?.username);
        case "PostLike":
        case "PostComment":
            return Boolean(notification.postId);
        default:
            return Boolean(notification.communitySlug);
    }
}

export function navigateToNotificationTarget(
    notification: NotificationItem
): void {
    switch (notification.type) {
        case "Follow":
            if (notification.actor?.username) {
                router.push({
                    pathname: "/profile/[username]",
                    params: { username: notification.actor.username },
                });
            }
            return;
        case "PostLike":
        case "PostComment":
            if (notification.postId) {
                router.push({
                    pathname: "/post/[id]",
                    params: { id: notification.postId },
                });
            }
            return;
        case "CommunityJoinRequested":
            if (notification.communitySlug) {
                router.push({
                    pathname: "/community-manage",
                    params: {
                        slug: notification.communitySlug,
                        tab: "requests",
                    },
                });
            }
            return;
        default:
            if (notification.communitySlug) {
                router.push({
                    pathname: "/community/[slug]",
                    params: { slug: notification.communitySlug },
                });
            }
    }
}
