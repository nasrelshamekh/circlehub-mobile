import { useLocalSearchParams } from "expo-router";

import ResetPasswordScreen from "@/components/auth/resetpasswordscreen";

export default function ResetPasswordRoute() {
    const { userId, token } = useLocalSearchParams<{
        userId?: string;
        token?: string;
    }>();

    return (
        <ResetPasswordScreen
            userId={typeof userId === "string" ? userId : undefined}
            token={typeof token === "string" ? token : undefined}
        />
    );
}
