/**
 * Central query-key factory, mirroring circlehub-web's src/lib/queryKeys.js so
 * the two apps invalidate the same logical resources.
 */

export const queryKeys = {
    me: () => ["users", "me"],
    feed: () => ["feed"],
    post: (id: string) => ["post", id],
    user: (username: string) => ["user", username],
    userPosts: (username: string) => ["user", username, "posts"],
    userLikedPosts: (username: string) => ["user", username, "liked-posts"],
    userFollowers: (username: string) => ["user", username, "followers"],
    userFollowing: (username: string) => ["user", username, "following"],
    userCommunities: (username: string) => ["user", username, "communities"],
    suggestedUsers: () => ["users", "suggested"],
    communities: () => ["communities"],
    communityCategories: () => ["communities", "categories"],
    community: (slug: string) => ["community", slug],
    communityMembers: (id: string) => ["community", id, "members"],
    communityPosts: (id: string) => ["community", id, "posts"],
    communityRequests: (id: string) => ["community", id, "requests"],
    search: (query: string) => ["search", query],
} as const;