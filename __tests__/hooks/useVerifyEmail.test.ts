import { renderHook, waitFor } from "@testing-library/react-native";

import { verifyEmail } from "@/api/auth";
import { useVerifyEmail } from "@/hooks/useVerifyEmail";
import { ApiError } from "@/types/api";

jest.mock("@/api/auth", () => ({
    verifyEmail: jest.fn(),
}));

const mockVerifyEmail = jest.mocked(verifyEmail);

beforeEach(() => {
    jest.resetAllMocks();
});

describe("useVerifyEmail", () => {
    it("stays idle and never calls the API without params", async () => {
        const { result } = await renderHook(() =>
            useVerifyEmail(undefined, undefined)
        );

        expect(result.current.status).toBe("idle");
        expect(result.current.hasParams).toBe(false);
        expect(mockVerifyEmail).not.toHaveBeenCalled();
    });

    it("reports success for a valid link", async () => {
        mockVerifyEmail.mockResolvedValue({
            success: true,
            message: "Email verified successfully",
        });

        const { result } = await renderHook(() => useVerifyEmail("u1", "t1"));

        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(result.current.message).toBe("Email verified successfully");
        expect(mockVerifyEmail).toHaveBeenCalledWith("u1", "t1");
    });

    it("falls back to a default success message when the server omits one", async () => {
        mockVerifyEmail.mockResolvedValue({ success: true, message: "" });

        const { result } = await renderHook(() => useVerifyEmail("u1", "t1"));

        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(result.current.message).toContain("verified");
    });

    it("treats a success:false payload as an error", async () => {
        mockVerifyEmail.mockResolvedValue({
            success: false,
            message: "Could not verify your email.",
        });

        const { result } = await renderHook(() => useVerifyEmail("u1", "t1"));

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.message).toBe("Could not verify your email.");
    });

    it("surfaces the API error message on failure", async () => {
        mockVerifyEmail.mockRejectedValue(
            new ApiError(400, "Invalid or expired verification link", null)
        );

        const { result } = await renderHook(() => useVerifyEmail("u1", "t1"));

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.message).toBe("Invalid or expired verification link");
    });
});
