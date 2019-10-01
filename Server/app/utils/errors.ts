// For explanation of the setPrototypeOf call, see:
// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work

class ApiError extends Error {
	httpCode: number
	constructor(message:string, httpCode:number = 400) {
		super(message);
		this.httpCode = httpCode;
		Object.setPrototypeOf(this, ApiError.prototype);
	}
}

export class ErrorMethodNotAllowed extends ApiError {
	constructor(message:string = 'Method Not Allowed') {
		super(message, 405);
		Object.setPrototypeOf(this, ErrorMethodNotAllowed.prototype);
	}
}

export class ErrorNotFound extends ApiError {
	constructor(message:string = 'Not Found') {
		super(message, 404);
		Object.setPrototypeOf(this, ErrorNotFound.prototype);
	}
}

export class ErrorForbidden extends ApiError {
	constructor(message:string = 'Forbidden') {
		super(message, 403);
		Object.setPrototypeOf(this, ErrorForbidden.prototype);
	}
}

export class ErrorBadRequest extends ApiError {
	constructor(message:string = 'Bad Request') {
		super(message, 400);
		Object.setPrototypeOf(this, ErrorBadRequest.prototype);
	}

}

export class ErrorUnprocessableEntity extends ApiError {
	constructor(message:string = 'Unprocessable Entity') {
		super(message, 422);
		Object.setPrototypeOf(this, ErrorUnprocessableEntity.prototype);
	}
}

export class ErrorConflict extends ApiError {
	constructor(message:string = 'Conflict') {
		super(message, 409);
		Object.setPrototypeOf(this, ErrorUnprocessableEntity.prototype);
	}
}
