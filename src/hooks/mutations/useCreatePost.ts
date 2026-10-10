import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

import { createPost } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { UploadImage } from "@/lib/imageUpload";
import { PageMeta } from "@/types/api";
import { Post } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };

type CreatePostInput = {
    content: string;
    image?: UploadImage | null;
};

export default function useCreatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ content, image }: CreatePostInput) =>
            createPost(content, image),

        onSuccess: (response, _variables) => {
            const post = response.data;

            // Prepend to the first feed page so the new post shows instantly.
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