import { useEffect, useState } from "react";

import { verifyEmail } from "@/api/auth";
import { ApiError } from "@/types/api";

export type VerifyEmailStatus = "idle" | "verifying" | "success" | "error";

const DEFAULT_SUCCESS =
    "Your email has been verified successfully. You can now sign in.";
const DEFAULT_ERROR =
    "Could not verify your email. The link may be invalid or expired.";

export function useVerifyEmail(userId?: string, token?: string) {
    const hasParams = Boolean(userId && token);
    const [status, setStatus] = useState<VerifyEmailStatus>(
        hasParams ? "verifying" : "idle"
    );
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!userId || !token) return;

        let active = true;

        verifyEmail(userId, token)
            .then((response) => {
                if (!active) return;

                if (response.success === false) {
                    setStatus("error");
                    setMessage(response.message || DEFAULT_ERROR);
                } else {
                    setStatus("success");
                    setMessage(response.message || DEFAULT_SUCCESS);
                }
            })
            .catch((error) => {
                if (!active) return;

                setStatus("error");
                setMessage(error instanceof ApiError ? error.message : DEFAULT_ERROR);
            });

        return () => {
            active = false;
        };
    }, [userId, token]);

    return { status, message, hasParams };
}
