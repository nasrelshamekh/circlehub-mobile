import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

import { createPost, CreatePollPayload } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { UploadImage } from "@/lib/imageUpload";
import { PageMeta } from "@/types/api";
import { Post } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };

type CreatePostInput = {
    content: string;
    image?: UploadImage | null;
    communityId?: string;
    poll?: CreatePollPayload | null;
    images?: UploadImage[] | null;
};

export default function useCreatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ content, image, communityId, poll, images }: CreatePostInput) =>
            createPost(content, image, communityId, poll, images),

        onSuccess: (response, variables) => {
            const post = response.data;

            if (variables.communityId) {
                queryClient.setQueryData<Post[]>(
                    queryKeys.communityPosts(variables.communityId),
                    (old) => (old ? [post, ...old] : old)
                );
                queryClient.invalidateQueries({ queryKey: ["community"] });
                return;
            }

            queryClient.setQueryData<InfiniteData<FeedPage>>(
                queryKeys.feed(),
                (old) => {
                    if (!old) return old;

                    const [firstPage, ...rest] = old.pages;

                    return {
                        ...old,
                        pages: [
                            {
                                ...firstPage,
                                data: [post, ...firstPage.data],
                            },
                            ...rest,
                        ],
                    };
                }
            );
        },
    });
}
