"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBadRequest = exports.ErrorForbidden = exports.ErrorNotFound = exports.ErrorMethodNotAllowed = void 0;
class ApiError extends Error {
    constructor(message, httpCode = 400) {
        super(message);
        this.httpCode_ = httpCode;
    }
    get httpCode() {
        return this.httpCode_;
    }
}
class ErrorMethodNotAllowed extends ApiError {
    constructor(message = 'Method Not Allowed') {
        super(message, 405);
    }
}
exports.ErrorMethodNotAllowed = ErrorMethodNotAllowed;
class ErrorNotFound extends ApiError {
    constructor(message = 'Not Found') {
        super(message, 404);
    }
}
exports.ErrorNotFound = ErrorNotFound;
class ErrorForbidden extends ApiError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}
exports.ErrorForbidden = ErrorForbidden;
class ErrorBadRequest extends ApiError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}
exports.ErrorBadRequest = ErrorBadRequest;
