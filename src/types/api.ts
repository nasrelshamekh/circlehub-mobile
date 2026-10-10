export type ApiErrorBody = {
    success?: boolean;
    message?: string;
    // ASP.NET `ValidationProblem` payloads use this shape instead of `message`.
    errors?: Record<string, string[]>;
};

export class ApiError extends Error {
    readonly status: number;
    readonly body: ApiErrorBody | null;

    constructor(status: number, message: string, body: ApiErrorBody | null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }

    get isUnauthorized() {
        return this.status === 401;
    }

    get isEmailUnverified() {
        return this.status === 403;
    }
}