// For explanation of the setPrototypeOf call, see:
// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work

class ApiError extends Error {
	public static httpCode: number = 400;

	public httpCode: number;
	public code: string;
	public constructor(message: string, httpCode: number = 400, code: string = undefined) {
		super(message);
		this.httpCode = httpCode;
		this.code = code;
		Object.setPrototypeOf(this, ApiError.prototype);
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

	public constructor(message: string = 'Not Found') {
		super(message, ErrorNotFound.httpCode);
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

export class ErrorUnprocessableEntity extends ApiError {
	public static httpCode: number = 422;

	public constructor(message: string = 'Unprocessable Entity') {
		super(message, ErrorUnprocessableEntity.httpCode);
		Object.setPrototypeOf(this, ErrorUnprocessableEntity.prototype);
	}
}

export class ErrorConflict extends ApiError {
	public static httpCode: number = 409;

	public constructor(message: string = 'Conflict') {
		super(message, ErrorConflict.httpCode);
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
