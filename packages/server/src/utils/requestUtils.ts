import { ErrorForbidden } from './errors';
import { AppContext } from './types';

const formidable = require('formidable');

export type BodyFields = Record<string, any>;

interface FormParseResult {
	fields: BodyFields;
	files: any;
}

// Input should be Koa ctx.req, which corresponds to the native Node request
export async function formParse(req: any): Promise<FormParseResult> {
	// It's not clear how to get mocked requests to be parsed successfully by
	// formidable so we use this small hack. If it's mocked, we are running test
	// units and the request body is already an object and can be returned.
	if (req.__isMocked) {
		const output: any = {};
		if (req.files) output.files = req.files;
		output.fields = req.body || {};
		return output;
	}

	// Note that for Formidable to work, the content-type must be set in the
	// headers
	return new Promise((resolve: Function, reject: Function) => {
		const form = formidable({ multiples: true });
		form.parse(req, (error: any, fields: any, files: any) => {
			if (error) {
				reject(error);
				return;
			}

			resolve({ fields, files });
		});
	});
}

export async function bodyFields<T>(req: any/* , filter:string[] = null*/): Promise<T> {
	const form = await formParse(req);
	return form.fields as T;
}

export function ownerRequired(ctx: AppContext) {
	if (!ctx.joplin.owner) throw new ErrorForbidden();
}

export function headerSessionId(headers: any): string {
	return headers['x-api-auth'] ? headers['x-api-auth'] : '';
}

export function contextSessionId(ctx: AppContext, throwIfNotFound = true): string {
	if (ctx.headers['x-api-auth']) return ctx.headers['x-api-auth'];

	const id = ctx.cookies.get('sessionId');
	if (!id && throwIfNotFound) throw new ErrorForbidden('Invalid or missing session');
	return id;
}

export function isApiRequest(ctx: AppContext): boolean {
	return ctx.path.indexOf('/api/') === 0;
}
