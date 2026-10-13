import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";

import { followUser, unfollowUser } from "@/api/users";
import { useAuth } from "@/context/authcontext";
import { queryKeys } from "@/lib/queryKeys";
import { SearchUser } from "@/types/search";
import { FollowUser, UserProfile } from "@/types/user";

export type ToggleFollowVariables = {
    userId: string;
    shouldFollow: boolean;
    targetUsername: string;
};

export default function useToggleFollow() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const myUsername = user?.username;
    const myUserId = user?.id;

    return useMutation({
        mutationFn: ({ userId, shouldFollow }: ToggleFollowVariables) =>
            shouldFollow ? followUser(userId) : unfollowUser(userId),

        onMutate: async ({ userId, shouldFollow, targetUsername }) => {
            // Don't let an in-flight refetch overwrite our optimistic value.
            await queryClient.cancelQueries();

            const snapshots: [QueryKey, unknown][] =
                queryClient.getQueriesData({ predicate: () => true });

            const delta = shouldFollow ? 1 : -1;

            queryClient.setQueryData<UserProfile | null>(
                queryKeys.user(targetUsername),
                (old) => {
                    if (!old) return old;

                    // Following a followers-only account unlocks its content
                    // right away; unfollowing locks it again. Private accounts
                    // stay locked either way.
                    let isProfileLocked = old.isProfileLocked;

                    if (
                        old.profileVisibility === "followers" &&
                        !old.isCurrentUser
                    ) {
                        isProfileLocked = !shouldFollow;
                    }

                    return {
                        ...old,
                        isFollowedByMe: shouldFollow,
                        isProfileLocked,
                        followersCount: Math.max(0, old.followersCount + delta),
                    };
                }
            );

            if (myUsername) {
                queryClient.setQueryData<UserProfile | null>(
                    queryKeys.user(myUsername),
                    (old) =>
                        old
                            ? {
                                  ...old,
                                  followingCount: Math.max(
                                      0,
                                      old.followingCount + delta
                                  ),
                              }
                            : old
                );
            }

            queryClient.setQueriesData<FollowUser[]>(
                {
                    predicate: (query) => {
                        const [root, , sub] = query.queryKey;
                        return (
                            root === "user" &&
                            (sub === "followers" || sub === "following")
                        );
                    },
                },
                (old) =>
                    Array.isArray(old)
                        ? old.map((entry) =>
                              entry.id === userId
                                  ? { ...entry, isFollowedByMe: shouldFollow }
                                  : entry
                          )
                        : old
            );

            // Search results carry their users on a `users` field.
            queryClient.setQueriesData<{ users?: SearchUser[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.users
                        ? {
                              ...old,
                              users: old.users.map((entry) =>
                                  entry.id === userId
                                      ? {
                                            ...entry,
                                            isFollowedByMe: shouldFollow,
                                            followersCount: Math.max(
                                                0,
                                                entry.followersCount + delta
                                            ),
                                        }
                                      : entry
                              ),
                          }
                        : old
            );

            // On unfollow, drop the user from my following list and me from theirs.
            if (!shouldFollow) {
                if (myUsername) {
                    queryClient.setQueryData<FollowUser[]>(
                        queryKeys.userFollowing(myUsername),
                        (old) =>
                            Array.isArray(old)
                                ? old.filter((entry) => entry.id !== userId)
                                : old
                    );
                }

                if (myUserId) {
                    queryClient.setQueryData<FollowUser[]>(
                        queryKeys.userFollowers(targetUsername),
                        (old) =>
                            Array.isArray(old)
                                ? old.filter((entry) => entry.id !== myUserId)
                                : old
                    );
                }
            }

            return { snapshots };
        },

        onError: (_error, _variables, context) => {
            context?.snapshots.forEach(([key, value]) => {
                queryClient.setQueryData(key, value);
            });
        },

        onSettled: (_data, _error, { targetUsername }) => {
            // Refetch the profile and its content so a newly-unlocked
            // (or newly-locked) account shows the right posts immediately.
            queryClient.invalidateQueries({
                queryKey: queryKeys.user(targetUsername),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.userPosts(targetUsername),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.userLikedPosts(targetUsername),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.userCommunities(targetUsername),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.userFollowers(targetUsername),
            });

            if (myUsername) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.userFollowing(myUsername),
                });
            }
        },
    });
}
