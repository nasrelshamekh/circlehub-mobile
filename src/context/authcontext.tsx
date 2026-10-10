import { createContext, useContext, useEffect, useState } from "react";

import {
    RegisterData,
    login as loginRequest,
    me as meRequest,
    register as registerRequest,
} from "@/api/auth";
import { clearToken, getToken, setToken } from "@/lib/session";
import { User } from "@/types/user";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextType = {
    status: AuthStatus;
    user: User | null;
    signIn: (usernameOrEmail: string, password: string) => Promise<void>;
    signUp: (data: RegisterData) => Promise<string>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>("loading");
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        let active = true;

        async function restore() {
            const token = await getToken();

            if (!token) {
                if (active) {
                    setStatus("unauthenticated");
                }
                return;
            }

            try {
                const response = await meRequest();

                if (!active) {
                    return;
                }

                setUser(response.data);
                setStatus("authenticated");
            } catch {
                // Token is missing/expired/invalid — start a clean session.
                await clearToken();

                if (!active) {
                    return;
                }

                setUser(null);
                setStatus("unauthenticated");
            }
        }

        restore();

        return () => {
            active = false;
        };
    }, []);

    async function signIn(usernameOrEmail: string, password: string) {
        const response = await loginRequest({ usernameOrEmail, password });

        await setToken(response.data.token);

        setUser(response.data.user);
        setStatus("authenticated");
    }

    async function signUp(data: RegisterData) {
        const response = await registerRequest(data);

        // Registration never authenticates the user — the account is unverified
        // until they open the emailed link. Hand the message back to the caller.
        return response.message;
    }

    async function signOut() {
        await clearToken();
        setUser(null);
        setStatus("unauthenticated");
    }

    return (
        <AuthContext.Provider value={{ status, user, signIn, signUp, signOut }}>
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
