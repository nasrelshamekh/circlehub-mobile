import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";

import {
    RegisterData,
    login as loginRequest,
    me as meRequest,
    register as registerRequest,
} from "@/api/auth";
import { clearToken, getToken, onSessionExpired, setToken } from "@/lib/session";
import { clearDecryptCache } from "@/services/messageCrypto";
import { unregisterCurrentDevicePushToken } from "@/services/pushNotifications";
import { User } from "@/types/user";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextType = {
    status: AuthStatus;
    user: User | null;
    signIn: (usernameOrEmail: string, password: string) => Promise<void>;
    signUp: (data: RegisterData) => Promise<string>;
    signOut: () => Promise<void>;
    updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<AuthStatus>("loading");
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        return onSessionExpired(() => {
            clearDecryptCache();
            queryClient.clear();
            setUser(null);
            setStatus("unauthenticated");
        });
    }, [queryClient]);

    useEffect(() => {
        let active = true;

        async function restore() {
            const token = await getToken();

            if (!token) {
                if (active) setStatus("unauthenticated");
                return;
            }

            try {
                const response = await meRequest();

                if (!active) return;

                setUser(response.data);
                setStatus("authenticated");
            } catch {
                await clearToken();
                clearDecryptCache();
                queryClient.clear();

                if (!active) return;

                setUser(null);
                setStatus("unauthenticated");
            }
        }

        restore();

        return () => {
            active = false;
        };
    }, [queryClient]);

    async function signIn(usernameOrEmail: string, password: string) {
        const response = await loginRequest({ usernameOrEmail, password });

        await setToken(response.data.token);
        clearDecryptCache();
        queryClient.clear();

        setUser(response.data.user);
        setStatus("authenticated");
    }

    async function signUp(data: RegisterData) {
        const response = await registerRequest(data);

        return response.message;
    }

    async function signOut() {
        await unregisterCurrentDevicePushToken();
        await clearToken();
        clearDecryptCache();
        queryClient.clear();
        setUser(null);
        setStatus("unauthenticated");
    }

    function updateUser(updated: User) {
        setUser(updated);
    }

    return (
        <AuthContext.Provider
            value={{ status, user, signIn, signUp, signOut, updateUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}
