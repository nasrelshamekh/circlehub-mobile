import { Platform } from "react-native";

import { apiFetch, apiUpload } from "./client";
import { appendImageToFormData, UploadImage } from "@/lib/imageUpload";
import { PageMeta } from "@/types/api";
import {
    CommunityDetails,
    CommunityJoinRequest,
    CommunityListItem,
    CommunityMember,
    CommunityPatch,
    CreatedCommunity,
} from "@/types/community";

export type MembershipResult = {
    membershipStatus: string;
    communityRole: string | null;
};

export function getCommunities(page = 1, pageSize = 100) {
    return apiFetch<{
        message: string;
        data: CommunityListItem[];
        meta: PageMeta;
    }>(`/api/Communities?page=${page}&pageSize=${pageSize}`);
}

export function getCommunityCategories() {
    return apiFetch<{ message: string; count: number; data: string[] }>(
        "/api/Communities/categories"
    );
}

export type CreateCommunityInput = {
    name: string;
    category: string;
    description: string;
    visibility: "public" | "private";
    image?: UploadImage | null;
    coverImage?: UploadImage | null;
};

export async function createCommunity(input: CreateCommunityInput) {
    if (Platform.OS !== "web" && (input.image || input.coverImage)) {
        const parameters: Record<string, string> = {
            name: input.name,
            category: input.category,
            description: input.description,
            visibility: input.visibility,
        };

        if (input.image) {
            const res = await apiUpload<{ message: string; data: CreatedCommunity }>(
                "/api/Communities",
                input.image.uri,
                {
                    method: "POST",
                    fieldName: "image",
                    mimeType: input.image.type,
                    parameters,
                }
            );

            if (input.coverImage) {
                await apiUpload<{ message: string; data: CommunityPatch }>(
                    `/api/Communities/${res.data.id}`,
                    input.coverImage.uri,
                    {
                        method: "PATCH",
                        fieldName: "coverImage",
                        mimeType: input.coverImage.type,
                    }
                );
            }

            return res;
        }

        return apiUpload<{ message: string; data: CreatedCommunity }>(
            "/api/Communities",
            input.coverImage!.uri,
            {
                method: "POST",
                fieldName: "coverImage",
                mimeType: input.coverImage!.type,
                parameters,
            }
        );
    }

    const formData = new FormData();

    formData.append("name", input.name);
    formData.append("category", input.category);
    formData.append("description", input.description);
    formData.append("visibility", input.visibility);

    appendImageToFormData(formData, "image", input.image);
    appendImageToFormData(formData, "coverImage", input.coverImage);

    return apiFetch<{ message: string; data: CreatedCommunity }>(
        "/api/Communities",
        { method: "POST", body: formData }
    );
}

export function getCommunityBySlug(slug: string) {
    return apiFetch<{ message: string; data: CommunityDetails }>(
        `/api/Communities/${slug}`
    );
}

export function getCommunityMembers(communityId: string) {
    return apiFetch<{ message: string; data: CommunityMember[] }>(
        `/api/Communities/${communityId}/members`
    );
}

export function joinCommunity(communityId: string) {
    return apiFetch<{ message: string; data: MembershipResult }>(
        `/api/Communities/${communityId}/join`,
        { method: "POST" }
    );
}

export function leaveCommunity(communityId: string) {
    return apiFetch<{ message: string; data: MembershipResult }>(
        `/api/Communities/${communityId}/membership`,
        { method: "DELETE" }
    );
}

export type UpdateCommunityInput = {
    name: string;
    category: string;
    description: string;
    visibility: "public" | "private";
    image?: UploadImage | null;
    coverImage?: UploadImage | null;
};

export async function updateCommunity(
    communityId: string,
    input: UpdateCommunityInput
) {
    if (Platform.OS !== "web" && (input.image || input.coverImage)) {
        const parameters: Record<string, string> = {
            name: input.name,
            category: input.category,
            description: input.description,
            visibility: input.visibility,
        };

        if (input.image && input.coverImage) {
            await apiUpload<{ message: string; data: CommunityPatch }>(
                `/api/Communities/${communityId}`,
                input.image.uri,
                {
                    method: "PATCH",
                    fieldName: "image",
                    mimeType: input.image.type,
                    parameters,
                }
            );

            return apiUpload<{ message: string; data: CommunityPatch }>(
                `/api/Communities/${communityId}`,
                input.coverImage.uri,
                {
                    method: "PATCH",
                    fieldName: "coverImage",
                    mimeType: input.coverImage.type,
                }
            );
        }

        if (input.image) {
            return apiUpload<{ message: string; data: CommunityPatch }>(
                `/api/Communities/${communityId}`,
                input.image.uri,
                {
                    method: "PATCH",
                    fieldName: "image",
                    mimeType: input.image.type,
                    parameters,
                }
            );
        }

        return apiUpload<{ message: string; data: CommunityPatch }>(
            `/api/Communities/${communityId}`,
            input.coverImage!.uri,
            {
                method: "PATCH",
                fieldName: "coverImage",
                mimeType: input.coverImage!.type,
                parameters,
            }
        );
    }

    const formData = new FormData();

    formData.append("name", input.name);
    formData.append("category", input.category);
    formData.append("description", input.description);
    formData.append("visibility", input.visibility);

    appendImageToFormData(formData, "image", input.image);
    appendImageToFormData(formData, "coverImage", input.coverImage);

    return apiFetch<{ message: string; data: CommunityPatch }>(
        `/api/Communities/${communityId}`,
        { method: "PATCH", body: formData }
    );
}

export function deleteCommunity(communityId: string) {
    return apiFetch<{ message: string; data: { communityId: string } }>(
        `/api/Communities/${communityId}`,
        { method: "DELETE" }
    );
}

export function getCommunityRequests(communityId: string) {
    return apiFetch<{
        message: string;
        count: number;
        data: CommunityJoinRequest[];
    }>(`/api/Communities/${communityId}/requests`);
}

export function decideCommunityJoinRequest(
    communityId: string,
    requestId: string,
    decision: "approve" | "reject"
) {
    return apiFetch<{
        message: string;
        data: {
            membership: { id: string; role: string } | null;
            request: { id: string; status: string };
        };
    }>(`/api/Communities/${communityId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
    });
}

export function removeCommunityMember(
    communityId: string,
    membershipId: string
) {
    return apiFetch<{ message: string; data: { membership: unknown } }>(
        `/api/Communities/${communityId}/members/${membershipId}`,
        { method: "DELETE" }
    );
}

export function updateCommunityMemberRole(
    communityId: string,
    membershipId: string,
    role: "member" | "moderator"
) {
    return apiFetch<{ message: string; data: { membership: unknown } }>(
        `/api/Communities/${communityId}/members/${membershipId}/role`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
        }
    );
}
