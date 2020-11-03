'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
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
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXJyb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sUUFBUyxTQUFRLEtBQUs7SUFHM0IsWUFBWSxPQUFjLEVBQUUsV0FBa0IsR0FBRztRQUNoRCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7Q0FDRDtBQUVELE1BQWEscUJBQXNCLFNBQVEsUUFBUTtJQUNsRCxZQUFZLE9BQU8sR0FBRyxvQkFBb0I7UUFDekMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDO0NBQ0Q7QUFKRCxzREFJQztBQUNELE1BQWEsYUFBYyxTQUFRLFFBQVE7SUFDMUMsWUFBWSxPQUFPLEdBQUcsV0FBVztRQUNoQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7Q0FDRDtBQUpELHNDQUlDO0FBQ0QsTUFBYSxjQUFlLFNBQVEsUUFBUTtJQUMzQyxZQUFZLE9BQU8sR0FBRyxXQUFXO1FBQ2hDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckIsQ0FBQztDQUNEO0FBSkQsd0NBSUM7QUFDRCxNQUFhLGVBQWdCLFNBQVEsUUFBUTtJQUM1QyxZQUFZLE9BQU8sR0FBRyxhQUFhO1FBQ2xDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckIsQ0FBQztDQUNEO0FBSkQsMENBSUMifQ==
