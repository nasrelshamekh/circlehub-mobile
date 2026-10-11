import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { search } from "@/api/search";
import { queryKeys } from "@/lib/queryKeys";

function useDebouncedValue<T>(value: T, delay: number) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export default function useSearch(term: string) {
    const debouncedTerm = useDebouncedValue(term, 300);
    const isDebouncing = term !== debouncedTerm;

    const query = useQuery({
        queryKey: queryKeys.search(debouncedTerm.trim()),
        queryFn: async () => {
            const { data } = await search(debouncedTerm.trim());
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
