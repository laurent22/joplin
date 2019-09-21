class ApiError extends Error {
	httpCode: number
	constructor(message:string, httpCode:number = 400) {
		super(message);
		this.httpCode = httpCode;
	}
}

export class ErrorMethodNotAllowed extends ApiError {
	constructor(message:string = 'Method Not Allowed') {
		super(message, 405);
	}
}

export class ErrorNotFound extends ApiError {
	constructor(message:string = 'Not Found') {
		super(message, 404);
	}
}

export class ErrorForbidden extends ApiError {
	constructor(message:string = 'Forbidden') {
		super(message, 403);
	}
}

export class ErrorBadRequest extends ApiError {
	constructor(message:string = 'Bad Request') {
		super(message, 400);
	}

}

export class ErrorUnprocessableEntity extends ApiError {
	constructor(message:string = 'Unprocessable Entity') {
		super(message, 422);
	}
}
