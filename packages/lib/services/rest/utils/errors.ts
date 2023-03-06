class ApiError extends Error {
	private httpCode_: number;

	public constructor(message: string, httpCode: number = 400) {
		super(message);
		this.httpCode_ = httpCode;
	}

	public get httpCode() {
		return this.httpCode_;
	}
}

export class ErrorMethodNotAllowed extends ApiError {
	public constructor(message = 'Method Not Allowed') {
		super(message, 405);
	}
}
export class ErrorNotFound extends ApiError {
	public constructor(message = 'Not Found') {
		super(message, 404);
	}
}
export class ErrorForbidden extends ApiError {
	public constructor(message = 'Forbidden') {
		super(message, 403);
	}
}
export class ErrorBadRequest extends ApiError {
	public constructor(message = 'Bad Request') {
		super(message, 400);
	}
}
