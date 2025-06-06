export class ApiError extends Error {
	public static httpCode = 400;

	public httpCode: number;

	public constructor(message: string, httpCode: number) {
		super(message);

		this.httpCode = httpCode === null ? 400 : httpCode;
		Object.setPrototypeOf(this, ApiError.prototype);
	}
}

export class ErrorNotFound extends ApiError {
	public static httpCode = 404;

	public constructor(message = 'Not Found') {
		super(message, ErrorNotFound.httpCode);
		Object.setPrototypeOf(this, ErrorNotFound.prototype);
	}
}

export class ErrorForbidden extends ApiError {
	public static httpCode = 403;

	public constructor(message = 'Forbidden') {
		super(message, ErrorForbidden.httpCode);
		Object.setPrototypeOf(this, ErrorForbidden.prototype);
	}
}

export class ErrorBadRequest extends ApiError {
	public static httpCode = 400;

	public constructor(message = 'Bad Request') {
		super(message, ErrorBadRequest.httpCode);
		Object.setPrototypeOf(this, ErrorBadRequest.prototype);
	}

}
