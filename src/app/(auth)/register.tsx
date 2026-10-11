import { useState } from "react";

import RegisterForm from "@/components/auth/registerform";
import RegisterSuccess from "@/components/auth/registersuccess";

export default function Register() {
    const [registered, setRegistered] = useState<{
        email: string;
        message: string;
    } | null>(null);

    if (registered) {
        return (
            <RegisterSuccess
                email={registered.email}
                message={registered.message}
            />
        );
    }

    return (
        <RegisterForm
            onRegistered={(email, message) => setRegistered({ email, message })}
        />
    );
}
