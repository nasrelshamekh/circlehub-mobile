export type ApiErrorBody = {
    success?: boolean;
    message?: string;
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

export type PageMeta = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
};
