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

export type UserCommunity = Community & {
    userRole: string;
};

export type CommunityAdmin = {
    id: string;
    name: string;
    username: string;
    jobTitle: string | null;
    avatarUrl: string | null;
};

export type CommunityMembershipStatus = "joined" | "requested" | "not_joined";

export type CommunityListItem = {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    imageUrl: string | null;
    coverImageUrl: string | null;
    visibility: string;
    admin: CommunityAdmin;
    membershipStatus: CommunityMembershipStatus;
    viewerRole: string | null;
    membersCount: number;
    postsCount: number;
};

export type CreatedCommunity = {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    imageUrl: string | null;
    coverImageUrl: string | null;
    visibility: string;
    admin: CommunityAdmin;
    membersCount: number;
    postsCount: number;
    membershipStatus: CommunityMembershipStatus;
    communityRole: string;
};

export type CommunityMember = {
    membershipId: string;
    id: string;
    name: string;
    username: string;
    jobTitle: string | null;
    avatarUrl: string | null;
    location: string | null;
    communityRole: string;
    joinedAt: string;
};

export type CommunityDetails = CommunityListItem & {
    members: CommunityMember[];
    communityRole: string | null;
    createdAt: string;
    updatedAt: string;
};

export type CommunityRequestUser = {
    id: string;
    name: string;
    username: string;
    jobTitle: string | null;
    avatarUrl: string | null;
};

export type CommunityJoinRequest = {
    id: string;
    note: string | null;
    status: string;
    createdAt: string;
    user: CommunityRequestUser;
};

// The update endpoint returns community fields without the viewer-specific ones.
export type CommunityPatch = Omit<
    CommunityListItem,
    "membershipStatus" | "viewerRole"
>;
