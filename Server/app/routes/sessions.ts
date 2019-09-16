import { Request, Response, Router } from 'express';
import { checkPassword } from "../utils/auth"
import db from '../db'
import { User } from '../db'

class ApiError extends Error {
	httpCode_: number
	constructor(message:string, httpCode:number = 400) {
		super(message);
		this.httpCode_ = httpCode;
	}

	get httpCode(): number {
		return this.httpCode_;
	}
}

class ErrorMethodNotAllowed extends ApiError {
	constructor(message:string = 'Method Not Allowed') {
		super(message, 405);
	}
}
class ErrorNotFound extends ApiError {
	constructor(message:string = 'Not Found') {
		super(message, 404);
	}
}
class ErrorForbidden extends ApiError {
	constructor(message:string = 'Forbidden') {
		super(message, 403);
	}
}
class ErrorBadRequest extends ApiError {
	constructor(message:string = 'Bad Request') {
		super(message, 400);
	}
}

const router = Router();

router.post('/', async function(req:Request, res:Response) {
	// const user = req.body;

	// const result = await db('users').where({
	// 	name: user.name,
	// }).first('password');
	
	// const ok = checkPassword(user.password, result.password);

	// if (!ok) throw new ErrorForbidden();

	// res.json({ title: 'from sessions',ok: ok, User:User });
});

module.exports = router;
