// For explanation of the setPrototypeOf call, see:
// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work

export class ApiError extends Error {
	public static httpCode: number = 400;

	public httpCode: number;
	public code: string;
	public constructor(message: string, httpCode: number = null, code: string = undefined) {
		super(message);
		this.httpCode = httpCode === null ? 400 : httpCode;
		this.code = code;
		Object.setPrototypeOf(this, ApiError.prototype);
	}
}

export class ErrorWithCode extends ApiError {
	public constructor(message: string, code: string) {
		super(message, null, code);
	}
}

export class ErrorMethodNotAllowed extends ApiError {
	public static httpCode: number = 400;

	public constructor(message: string = 'Method Not Allowed') {
		super(message, ErrorMethodNotAllowed.httpCode);
		Object.setPrototypeOf(this, ErrorMethodNotAllowed.prototype);
	}
}

export class ErrorNotFound extends ApiError {
	public static httpCode: number = 404;

	public constructor(message: string = 'Not Found', code: string = undefined) {
		super(message, ErrorNotFound.httpCode, code);
		Object.setPrototypeOf(this, ErrorNotFound.prototype);
	}
}

export class ErrorForbidden extends ApiError {
	public static httpCode: number = 403;

	public constructor(message: string = 'Forbidden') {
		super(message, ErrorForbidden.httpCode);
		Object.setPrototypeOf(this, ErrorForbidden.prototype);
	}
}

export class ErrorBadRequest extends ApiError {
	public static httpCode: number = 400;

	public constructor(message: string = 'Bad Request') {
		super(message, ErrorBadRequest.httpCode);
		Object.setPrototypeOf(this, ErrorBadRequest.prototype);
	}

}

export class ErrorPreconditionFailed extends ApiError {
	public static httpCode: number = 412;

	public constructor(message: string = 'Precondition Failed') {
		super(message, ErrorPreconditionFailed.httpCode);
		Object.setPrototypeOf(this, ErrorPreconditionFailed.prototype);
	}

}

export class ErrorUnprocessableEntity extends ApiError {
	public static httpCode: number = 422;

	public constructor(message: string = 'Unprocessable Entity') {
		super(message, ErrorUnprocessableEntity.httpCode);
		Object.setPrototypeOf(this, ErrorUnprocessableEntity.prototype);
	}
}

export class ErrorConflict extends ApiError {
	public static httpCode: number = 409;

	public constructor(message: string = 'Conflict', code: string = undefined) {
		super(message, ErrorConflict.httpCode, code);
		Object.setPrototypeOf(this, ErrorConflict.prototype);
	}
}

export class ErrorResyncRequired extends ApiError {
	public static httpCode: number = 400;

	public constructor(message: string = 'Delta cursor is invalid and the complete data should be resynced') {
		super(message, ErrorResyncRequired.httpCode, 'resyncRequired');
		Object.setPrototypeOf(this, ErrorResyncRequired.prototype);
	}
}

export class ErrorPayloadTooLarge extends ApiError {
	public static httpCode: number = 413;

	public constructor(message: string = 'Payload Too Large') {
		super(message, ErrorPayloadTooLarge.httpCode);
		Object.setPrototypeOf(this, ErrorPayloadTooLarge.prototype);
	}
}

export class ErrorTooManyRequests extends ApiError {
	public static httpCode: number = 429;
	public retryAfterMs: number = 0;

	public constructor(message: string = null, retryAfterMs: number = 0) {
		super(message === null ? 'Too Many Requests' : message, ErrorTooManyRequests.httpCode);
		this.retryAfterMs = retryAfterMs;
		Object.setPrototypeOf(this, ErrorTooManyRequests.prototype);
	}
}

export function errorToString(error: Error): string {
	const msg: string[] = [];
	msg.push(error.message ? error.message : 'Unknown error');
	if (error.stack) msg.push(error.stack);
	return msg.join(': ');
}

interface PlainObjectError {
	httpCode?: number;
	message?: string;
	code?: string;
}

export function errorToPlainObject(error: any): PlainObjectError {
	const output: PlainObjectError = {};
	if ('httpCode' in error) output.httpCode = error.httpCode;
	if ('code' in error) output.code = error.code;
	if ('message' in error) output.message = error.message;
	return output;
}
