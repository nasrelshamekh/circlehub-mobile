import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import { PropsWithChildren } from "react";

import { PageMeta } from "@/types/api";
import {
    CommunityDetails,
    CommunityJoinRequest,
    CommunityListItem,
    CommunityMember,
} from "@/types/community";
import { Post, PostComment } from "@/types/post";
import { SearchResults, SearchUser } from "@/types/search";
import { FollowUser, User, UserProfile } from "@/types/user";

export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
            mutations: { retry: false, gcTime: Infinity },
        },
    });
}

export async function renderHookWithQueryClient<T>(hook: () => T) {
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const view = await renderHook(hook, { wrapper });

    return { queryClient, ...view };
}

export function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

export function makeMeta(overrides: Partial<PageMeta> = {}): PageMeta {
    return {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        ...overrides,
    };
}

export function makeFeed(posts: Post[]) {
    return {
        pages: [{ data: posts, meta: makeMeta({ total: posts.length }) }],
        pageParams: [1],
    };
}

export function makePost(overrides: Partial<Post> = {}): Post {
    return {
        id: "post-1",
        content: "hello",
        imageUrl: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        likesCount: 3,
        commentsCount: 2,
        isLikedByMe: false,
        author: {
            id: "author-1",
            name: "Author",
            username: "author",
            avatarUrl: null,
        },
        ...overrides,
    };
}

export function makeComment(overrides: Partial<PostComment> = {}): PostComment {
    return {
        id: "comment-1",
        content: "nice",
        createdAt: "2026-01-01T00:00:00Z",
        author: {
            id: "author-1",
            name: "Author",
            username: "author",
            avatarUrl: null,
        },
        ...overrides,
    };
}

export function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: "me-id",
        name: "Me",
        username: "me",
        email: "me@example.com",
        jobTitle: null,
        gender: null,
        dateOfBirth: null,
        location: null,
        avatarUrl: null,
        coverImageUrl: null,
        bio: null,
        website: null,
        skills: [],
        emailVerified: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

export function makeUserProfile(
    overrides: Partial<UserProfile> = {}
): UserProfile {
    return {
        ...makeUser(),
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        isCurrentUser: false,
        isFollowedByMe: false,
        followsMe: false,
        ...overrides,
    };
}

export function makeFollowUser(
    overrides: Partial<FollowUser> = {}
): FollowUser {
    return {
        id: "user-1",
        name: "User",
        username: "user",
        jobTitle: null,
        bio: null,
        location: null,
        avatarUrl: null,
        followersCount: 0,
        isFollowedByMe: false,
        isCurrentUser: false,
        ...overrides,
    };
}

export function makeSearchUser(overrides: Partial<SearchUser> = {}): SearchUser {
    return {
        id: "user-1",
        name: "User",
        username: "user",
        jobTitle: null,
        avatarUrl: null,
        coverImageUrl: null,
        bio: null,
        location: null,
        website: null,
        skills: [],
        gender: null,
        dateOfBirth: null,
        createdAt: "2026-01-01T00:00:00Z",
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        isFollowedByMe: false,
        ...overrides,
    };
}

export function makeCommunity(
    overrides: Partial<CommunityListItem> = {}
): CommunityListItem {
    return {
        id: "community-1",
        name: "Community",
        slug: "community",
        category: "tech",
        description: "A community",
        imageUrl: null,
        coverImageUrl: null,
        visibility: "public",
        admin: {
            id: "admin-1",
            name: "Admin",
            username: "admin",
            jobTitle: null,
            avatarUrl: null,
        },
        membershipStatus: "not_joined",
        viewerRole: null,
        membersCount: 10,
        postsCount: 5,
        ...overrides,
    };
}

export function makeCommunityDetails(
    overrides: Partial<CommunityDetails> = {}
): CommunityDetails {
    return {
        ...makeCommunity(),
        members: [],
        communityRole: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

export function makeSearchResults(
    overrides: Partial<SearchResults> = {}
): SearchResults {
    return { users: [], communities: [], posts: [], ...overrides };
}

export function makeCommunityMember(
    overrides: Partial<CommunityMember> = {}
): CommunityMember {
    return {
        membershipId: "membership-1",
        id: "member-1",
        name: "Member",
        username: "member",
        jobTitle: null,
        avatarUrl: null,
        location: null,
        communityRole: "member",
        joinedAt: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

export function makeJoinRequest(
    overrides: Partial<CommunityJoinRequest> = {}
): CommunityJoinRequest {
    return {
        id: "request-1",
        note: null,
        status: "pending",
        createdAt: "2026-01-01T00:00:00Z",
        user: {
            id: "member-1",
            name: "Member",
            username: "member",
            jobTitle: null,
            avatarUrl: null,
        },
        ...overrides,
    };
}
