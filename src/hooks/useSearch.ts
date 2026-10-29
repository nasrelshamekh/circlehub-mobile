import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { search, SearchParams } from "@/api/search";
import { queryKeys } from "@/lib/queryKeys";

function useDebouncedValue<T>(value: T, delay: number) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export default function useSearch(options: string | SearchParams) {
    const parsed: SearchParams =
        typeof options === "string"
            ? { q: options, type: "all", sort: "latest", mediaOnly: false }
            : {
                  q: options.q ?? "",
                  type: options.type ?? "all",
                  sort: options.sort ?? "latest",
                  mediaOnly: Boolean(options.mediaOnly),
              };

    const debouncedTerm = useDebouncedValue(parsed.q ?? "", 300);
    const isDebouncing = (parsed.q ?? "") !== debouncedTerm;

    const query = useQuery({
        queryKey: queryKeys.search({
            q: debouncedTerm.trim(),
            type: parsed.type,
            sort: parsed.sort,
            mediaOnly: parsed.mediaOnly,
        }),
        queryFn: async () => {
            const { data } = await search({
                q: debouncedTerm.trim(),
                type: parsed.type,
                sort: parsed.sort,
                mediaOnly: parsed.mediaOnly,
            });
            return data;
        },
    });

    return {
        users: query.data?.users ?? [],
        communities: query.data?.communities ?? [],
        posts: query.data?.posts ?? [],
        isLoading: query.isPending || isDebouncing,
    };
}
