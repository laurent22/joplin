export enum ErrorCode {
	ResyncRequired = 'resyncRequired',
	NoPathForItem = 'noPathForItem',
	HasExclusiveSyncLock = 'hasExclusiveLock',
	HasSyncLock = 'hasSyncLock',
	NoSub = 'no_sub',
	NoStripeSub = 'no_stripe_sub',
	InvalidOrigin = 'invalidOrigin',
}

export interface ErrorOptions {
	details?: any;
	code?: ErrorCode;
}

// For explanation of the setPrototypeOf call, see:
// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
export class ApiError extends Error {
	public static httpCode = 400;

	public httpCode: number;
	public code: ErrorCode;
	public details: any;

	public constructor(message: string, httpCode: number = null, code: ErrorCode | ErrorOptions = undefined) {
		super(message);

		this.httpCode = httpCode === null ? 400 : httpCode;

		if (typeof code === 'string') {
			this.code = code;
		} else {
			const options: ErrorOptions = { ...code };
			this.code = options.code;
			this.details = options.details;
		}

		Object.setPrototypeOf(this, ApiError.prototype);
	}
}

export class ErrorWithCode extends ApiError {
	public constructor(message: string, code: ErrorCode) {
		super(message, null, code);
	}
}

export class ErrorMethodNotAllowed extends ApiError {
	public static httpCode = 400;

	public constructor(message = 'Method Not Allowed', options: ErrorOptions = null) {
		super(message, ErrorMethodNotAllowed.httpCode, options);
		Object.setPrototypeOf(this, ErrorMethodNotAllowed.prototype);
	}
}

export class ErrorNotFound extends ApiError {
	public static httpCode = 404;

	public constructor(message = 'Not Found', code: ErrorCode = undefined) {
		super(message, ErrorNotFound.httpCode, code);
		Object.setPrototypeOf(this, ErrorNotFound.prototype);
	}
}

export class ErrorForbidden extends ApiError {
	public static httpCode = 403;

	public constructor(message = 'Forbidden', options: ErrorOptions = null) {
		super(message, ErrorForbidden.httpCode, options);
		Object.setPrototypeOf(this, ErrorForbidden.prototype);
	}
}

export class ErrorBadRequest extends ApiError {
	public static httpCode = 400;

	public constructor(message = 'Bad Request', options: ErrorOptions = null) {
		super(message, ErrorBadRequest.httpCode, options);
		Object.setPrototypeOf(this, ErrorBadRequest.prototype);
	}

}

export class ErrorPreconditionFailed extends ApiError {
	public static httpCode = 412;

	public constructor(message = 'Precondition Failed', options: ErrorOptions = null) {
		super(message, ErrorPreconditionFailed.httpCode, options);
		Object.setPrototypeOf(this, ErrorPreconditionFailed.prototype);
	}

}

export class ErrorUnprocessableEntity extends ApiError {
	public static httpCode = 422;

	public constructor(message = 'Unprocessable Entity', options: ErrorOptions = null) {
		super(message, ErrorUnprocessableEntity.httpCode, options);
		Object.setPrototypeOf(this, ErrorUnprocessableEntity.prototype);
	}
}

export class ErrorConflict extends ApiError {
	public static httpCode = 409;

	public constructor(message = 'Conflict', code: ErrorCode = undefined) {
		super(message, ErrorConflict.httpCode, code);
		Object.setPrototypeOf(this, ErrorConflict.prototype);
	}
}

export class ErrorResyncRequired extends ApiError {
	public static httpCode = 400;

	public constructor(message = 'Delta cursor is invalid and the complete data should be resynced') {
		super(message, ErrorResyncRequired.httpCode, ErrorCode.ResyncRequired);
		Object.setPrototypeOf(this, ErrorResyncRequired.prototype);
	}
}

export class ErrorPayloadTooLarge extends ApiError {
	public static httpCode = 413;

	public constructor(message = 'Payload Too Large', options: ErrorOptions = null) {
		super(message, ErrorPayloadTooLarge.httpCode, options);
		Object.setPrototypeOf(this, ErrorPayloadTooLarge.prototype);
	}
}

export class ErrorTooManyRequests extends ApiError {
	public static httpCode = 429;
	public retryAfterMs = 0;

	public constructor(message: string = null, retryAfterMs = 0) {
		super(message === null ? 'Too Many Requests' : message, ErrorTooManyRequests.httpCode);
		this.retryAfterMs = retryAfterMs;
		Object.setPrototypeOf(this, ErrorTooManyRequests.prototype);
	}
}

export function errorToString(error: Error): string {
	// const msg: string[] = [];
	// msg.push(error.message ? error.message : 'Unknown error');
	// if (error.stack) msg.push(error.stack);
	// return msg.join(': ');

	return JSON.stringify(errorToPlainObject(error));
}

interface PlainObjectError {
	httpCode?: number;
	message?: string;
	code?: string;
	stack?: string;
}

export function errorToPlainObject(error: any): PlainObjectError {
	if (typeof error === 'string') return { message: error };

	const output: PlainObjectError = {};
	if ('httpCode' in error) output.httpCode = error.httpCode;
	if ('code' in error) output.code = error.code;
	if ('message' in error) output.message = error.message;
	if ('stack' in error) output.stack = error.stack;
	return output;
}

export enum CustomErrorCode {
	NotFound,
}

export class CustomError extends Error {
	public code: CustomErrorCode;
	public constructor(message: string, code: CustomErrorCode) {
		super(message);
		this.code = code;
		Object.setPrototypeOf(this, CustomError.prototype);
	}
}
