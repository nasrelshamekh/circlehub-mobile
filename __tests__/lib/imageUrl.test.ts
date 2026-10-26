import { getImageUrl } from "@/lib/imageUrl";

describe("getImageUrl", () => {
    it("returns null for empty or null inputs", () => {
        expect(getImageUrl(null)).toBeNull();
        expect(getImageUrl("")).toBeNull();
        expect(getImageUrl("   ")).toBeNull();
        expect(getImageUrl(undefined)).toBeNull();
    });

    it("prepends API_URL to relative paths with leading slash", () => {
        const result = getImageUrl("/uploads/users/avatar.png");
        expect(result).toMatch(/\/uploads\/users\/avatar\.png$/);
    });

    it("leaves external cloud storage URLs intact", () => {
        const r2Url = "https://pub-b76e67ff61074ab197c54a2a3b53b763.r2.dev/avatars/test.webp";
        expect(getImageUrl(r2Url)).toBe(r2Url);
    });
});
