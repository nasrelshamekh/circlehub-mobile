import {
    CURATED_FALLBACK_GIFS,
    GIF_CATEGORIES,
    fetchTrendingGifs,
    isGifUrl,
    parseGifContent,
    searchGifs,
} from "@/services/gifService";

describe("GIF Service & Helpers", () => {
    describe("isGifUrl", () => {
        it("identifies GIPHY URLs", () => {
            expect(
                isGifUrl(
                    "https://media4.giphy.com/media/v1.Y2lkPTlm/xyz/giphy.gif"
                )
            ).toBe(true);
            expect(
                isGifUrl("https://i.giphy.com/media/xyz/200.gif")
            ).toBe(true);
        });

        it("identifies Tenor URLs", () => {
            expect(
                isGifUrl("https://media1.tenor.com/m/abcdef/tenor.gif")
            ).toBe(true);
            expect(isGifUrl("https://c.tenor.com/abc/tenor.gif")).toBe(true);
        });

        it("identifies generic .gif URLs", () => {
            expect(isGifUrl("https://example.com/assets/happy.gif")).toBe(true);
            expect(
                isGifUrl("https://example.com/assets/happy.gif?token=123")
            ).toBe(true);
        });

        it("returns false for non-GIF URLs or plain text", () => {
            expect(isGifUrl("https://example.com/assets/photo.jpg")).toBe(false);
            expect(isGifUrl("Hello world")).toBe(false);
            expect(isGifUrl("")).toBe(false);
            expect(isGifUrl(null)).toBe(false);
            expect(isGifUrl(undefined)).toBe(false);
        });
    });

    describe("parseGifContent", () => {
        it("extracts GIF URL when message is pure GIF", () => {
            const url = "https://media.giphy.com/media/xyz/giphy.gif";
            const result = parseGifContent(url);
            expect(result.gifUrl).toBe(url);
            expect(result.text).toBe("");
        });

        it("separates text caption and GIF URL", () => {
            const url = "https://media.giphy.com/media/xyz/giphy.gif";
            const content = `Check this out!\n${url}`;
            const result = parseGifContent(content);
            expect(result.gifUrl).toBe(url);
            expect(result.text).toBe("Check this out!");
        });

        it("handles content without GIF", () => {
            const result = parseGifContent("Just a regular message");
            expect(result.gifUrl).toBeNull();
            expect(result.text).toBe("Just a regular message");
        });

        it("handles null / undefined / empty input safely", () => {
            expect(parseGifContent(null)).toEqual({ text: "", gifUrl: null });
            expect(parseGifContent(undefined)).toEqual({ text: "", gifUrl: null });
            expect(parseGifContent("")).toEqual({ text: "", gifUrl: null });
        });
    });

    describe("fetchTrendingGifs & searchGifs fallback", () => {
        it("has valid categories defined", () => {
            expect(GIF_CATEGORIES.length).toBeGreaterThan(0);
            expect(GIF_CATEGORIES[0].id).toBe("trending");
        });

        it("provides curated fallback GIFs on fetch failure", async () => {
            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockRejectedValue(new Error("Network offline"));

            try {
                const gifs = await fetchTrendingGifs();
                expect(gifs).toEqual(CURATED_FALLBACK_GIFS);

                const searchResults = await searchGifs("cat");
                expect(searchResults.length).toBeGreaterThan(0);
                expect(searchResults[0].title.toLowerCase()).toContain("cat");
            } finally {
                global.fetch = originalFetch;
            }
        });
    });
});
