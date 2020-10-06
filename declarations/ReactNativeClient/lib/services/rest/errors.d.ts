declare class ApiError extends Error {
    private httpCode_;
    constructor(message: string, httpCode?: number);
    get httpCode(): number;
}
export declare class ErrorMethodNotAllowed extends ApiError {
    constructor(message?: string);
}
export declare class ErrorNotFound extends ApiError {
    constructor(message?: string);
}
export declare class ErrorForbidden extends ApiError {
    constructor(message?: string);
}
export declare class ErrorBadRequest extends ApiError {
    constructor(message?: string);
}
export {};
