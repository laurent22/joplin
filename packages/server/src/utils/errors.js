"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomError = exports.ErrorCode = exports.errorToPlainObject = exports.errorToString = exports.ErrorTooManyRequests = exports.ErrorPayloadTooLarge = exports.ErrorResyncRequired = exports.ErrorConflict = exports.ErrorUnprocessableEntity = exports.ErrorPreconditionFailed = exports.ErrorBadRequest = exports.ErrorForbidden = exports.ErrorNotFound = exports.ErrorMethodNotAllowed = exports.ErrorWithCode = exports.ApiError = void 0;
// For explanation of the setPrototypeOf call, see:
// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
class ApiError extends Error {
    constructor(message, httpCode = null, code = undefined) {
        super(message);
        this.httpCode = httpCode === null ? 400 : httpCode;
        if (typeof code === 'string') {
            this.code = code;
        }
        else {
            const options = Object.assign({}, code);
            this.code = options.code;
            this.details = options.details;
        }
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
exports.ApiError = ApiError;
ApiError.httpCode = 400;
class ErrorWithCode extends ApiError {
    constructor(message, code) {
        super(message, null, code);
    }
}
exports.ErrorWithCode = ErrorWithCode;
class ErrorMethodNotAllowed extends ApiError {
    constructor(message = 'Method Not Allowed', options = null) {
        super(message, ErrorMethodNotAllowed.httpCode, options);
        Object.setPrototypeOf(this, ErrorMethodNotAllowed.prototype);
    }
}
exports.ErrorMethodNotAllowed = ErrorMethodNotAllowed;
ErrorMethodNotAllowed.httpCode = 400;
class ErrorNotFound extends ApiError {
    constructor(message = 'Not Found', code = undefined) {
        super(message, ErrorNotFound.httpCode, code);
        Object.setPrototypeOf(this, ErrorNotFound.prototype);
    }
}
exports.ErrorNotFound = ErrorNotFound;
ErrorNotFound.httpCode = 404;
class ErrorForbidden extends ApiError {
    constructor(message = 'Forbidden', options = null) {
        super(message, ErrorForbidden.httpCode, options);
        Object.setPrototypeOf(this, ErrorForbidden.prototype);
    }
}
exports.ErrorForbidden = ErrorForbidden;
ErrorForbidden.httpCode = 403;
class ErrorBadRequest extends ApiError {
    constructor(message = 'Bad Request', options = null) {
        super(message, ErrorBadRequest.httpCode, options);
        Object.setPrototypeOf(this, ErrorBadRequest.prototype);
    }
}
exports.ErrorBadRequest = ErrorBadRequest;
ErrorBadRequest.httpCode = 400;
class ErrorPreconditionFailed extends ApiError {
    constructor(message = 'Precondition Failed', options = null) {
        super(message, ErrorPreconditionFailed.httpCode, options);
        Object.setPrototypeOf(this, ErrorPreconditionFailed.prototype);
    }
}
exports.ErrorPreconditionFailed = ErrorPreconditionFailed;
ErrorPreconditionFailed.httpCode = 412;
class ErrorUnprocessableEntity extends ApiError {
    constructor(message = 'Unprocessable Entity', options = null) {
        super(message, ErrorUnprocessableEntity.httpCode, options);
        Object.setPrototypeOf(this, ErrorUnprocessableEntity.prototype);
    }
}
exports.ErrorUnprocessableEntity = ErrorUnprocessableEntity;
ErrorUnprocessableEntity.httpCode = 422;
class ErrorConflict extends ApiError {
    constructor(message = 'Conflict', code = undefined) {
        super(message, ErrorConflict.httpCode, code);
        Object.setPrototypeOf(this, ErrorConflict.prototype);
    }
}
exports.ErrorConflict = ErrorConflict;
ErrorConflict.httpCode = 409;
class ErrorResyncRequired extends ApiError {
    constructor(message = 'Delta cursor is invalid and the complete data should be resynced') {
        super(message, ErrorResyncRequired.httpCode, 'resyncRequired');
        Object.setPrototypeOf(this, ErrorResyncRequired.prototype);
    }
}
exports.ErrorResyncRequired = ErrorResyncRequired;
ErrorResyncRequired.httpCode = 400;
class ErrorPayloadTooLarge extends ApiError {
    constructor(message = 'Payload Too Large', options = null) {
        super(message, ErrorPayloadTooLarge.httpCode, options);
        Object.setPrototypeOf(this, ErrorPayloadTooLarge.prototype);
    }
}
exports.ErrorPayloadTooLarge = ErrorPayloadTooLarge;
ErrorPayloadTooLarge.httpCode = 413;
class ErrorTooManyRequests extends ApiError {
    constructor(message = null, retryAfterMs = 0) {
        super(message === null ? 'Too Many Requests' : message, ErrorTooManyRequests.httpCode);
        this.retryAfterMs = 0;
        this.retryAfterMs = retryAfterMs;
        Object.setPrototypeOf(this, ErrorTooManyRequests.prototype);
    }
}
exports.ErrorTooManyRequests = ErrorTooManyRequests;
ErrorTooManyRequests.httpCode = 429;
function errorToString(error) {
    // const msg: string[] = [];
    // msg.push(error.message ? error.message : 'Unknown error');
    // if (error.stack) msg.push(error.stack);
    // return msg.join(': ');
    return JSON.stringify(errorToPlainObject(error));
}
exports.errorToString = errorToString;
function errorToPlainObject(error) {
    if (typeof error === 'string')
        return { message: error };
    const output = {};
    if ('httpCode' in error)
        output.httpCode = error.httpCode;
    if ('code' in error)
        output.code = error.code;
    if ('message' in error)
        output.message = error.message;
    if ('stack' in error)
        output.stack = error.stack;
    return output;
}
exports.errorToPlainObject = errorToPlainObject;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["NotFound"] = 0] = "NotFound";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
class CustomError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, CustomError.prototype);
    }
}
exports.CustomError = CustomError;
//# sourceMappingURL=errors.js.map