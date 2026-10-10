/**
 * Communities as returned by community endpoints. Field names mirror the web
 * app's CommunityCardItem so the two apps render the same data.
 */
export type Community = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
    coverImageUrl: string | null;
    membersCount: number;
    postsCount: number;
    visibility: string;
};

/** A community from the user-profile "communities" endpoint, which also
 *  reports the current user's role inside it. */
export type UserCommunity = Community & {
    userRole: string;
};