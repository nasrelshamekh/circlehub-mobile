import { useLocalSearchParams } from "expo-router";

import VerifyEmailScreen from "@/components/auth/verifyemailscreen";

export default function VerifyEmailRoute() {
    const { userId, token, email } = useLocalSearchParams<{
        userId?: string;
        token?: string;
        email?: string;
    }>();

    return (
        <VerifyEmailScreen
            userId={typeof userId === "string" ? userId : undefined}
            token={typeof token === "string" ? token : undefined}
            initialEmail={typeof email === "string" ? email : ""}
        />
    );
}
