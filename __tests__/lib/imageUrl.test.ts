import { Platform } from "react-native";
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

    it("prepends API_URL to relative paths without leading slash", () => {
        const result = getImageUrl("uploads/users/avatar.png");
        expect(result).toMatch(/\/uploads\/users\/avatar\.png$/);
    });

    it("normalizes backslashes in upload paths", () => {
        const result = getImageUrl("\\uploads\\users\\avatar.png");
        expect(result).toMatch(/\/uploads\/users\/avatar\.png$/);
    });

    it("leaves external cloud storage URLs intact", () => {
        const r2Url = "https://pub-b76e67ff61074ab197c54a2a3b53b763.r2.dev/avatars/test.webp";
        expect(getImageUrl(r2Url)).toBe(r2Url);
    });

    it("normalizes circlehub.runasp.net uploads on android to cleartext HTTP to avoid IIS TLS renegotiation", () => {
        const originalOS = Platform.OS;
        (Platform as any).OS = "android";

        const legacyUrl = "https://circlehub.runasp.net/uploads/users/avatar.png";
        expect(getImageUrl(legacyUrl)).toBe("http://circlehub.runasp.net/uploads/users/avatar.png");

        (Platform as any).OS = originalOS;
    });
});
