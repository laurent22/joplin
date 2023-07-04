import { cookieGet } from './cookies';
import { ErrorForbidden } from './errors';
import { AppContext } from './types';
import * as formidable from 'formidable';
import { Fields, Files } from 'formidable';
import { IncomingMessage } from 'http';

export type BodyFields = Record<string, any>;

interface FormParseResult {
	fields: BodyFields;
	files: any;
}

interface ParsedBody {
	fields: Fields;
	files: Files;
}

interface FormParseRequest extends IncomingMessage {
	__isMocked: boolean;
	__parsed: ParsedBody;
	files: Files;
	body: any;
}

// Input should be Koa ctx.req, which corresponds to the native Node request
export async function formParse(request: IncomingMessage): Promise<FormParseResult> {
	const req: FormParseRequest = request as any;

	// It's not clear how to get mocked requests to be parsed successfully by
	// formidable so we use this small hack. If it's mocked, we are running test
	// units and the request body is already an object and can be returned.
	if (req.__isMocked) {
		const output: any = {};
		if (req.files) output.files = req.files;
		output.fields = req.body || {};
		return output;
	}

	if (req.__parsed) return req.__parsed;

	// Note that for Formidable to work, the content-type must be set in the
	// headers
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	return new Promise((resolve: Function, reject: Function) => {
		const form = formidable({ multiples: true });
		form.parse(req, (error: any, fields: Fields, files: Files) => {
			if (error) {
				reject(error);
				return;
			}

			// Formidable seems to be doing some black magic and once a request
			// has been parsed it cannot be parsed again. Doing so will do
			// nothing, the code will just end there, or maybe wait
			// indefinitely. So we cache the result on success and return it if
			// some code somewhere tries again to parse the form.
			req.__parsed = { fields, files };
			resolve(req.__parsed);
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
	if (ctx.headers['x-api-auth']) return ctx.headers['x-api-auth'] as string;

	const id = cookieGet(ctx, 'sessionId');
	if (!id && throwIfNotFound) throw new ErrorForbidden('Invalid or missing session');
	return id;
}

export function isApiRequest(ctx: AppContext): boolean {
	return ctx.path.indexOf('/api/') === 0;
}

export function isAdminRequest(ctx: AppContext): boolean {
	return ctx.path.indexOf('/admin/') === 0;
}

export function userIp(ctx: AppContext): string {
	if (ctx.headers['x-real-ip']) return ctx.headers['x-real-ip'] as string;
	return ctx.ip;
}
