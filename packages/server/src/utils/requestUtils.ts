import { cookieGet } from './cookies';
import { ErrorForbidden } from './errors';
import { AppContext } from './types';
import * as formidable from 'formidable';
import { Fields, Files } from 'formidable';
import { IncomingMessage } from 'http';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type BodyFields = Record<string, any>;

interface FormParseResult {
	fields: BodyFields;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	body: any;
}

// Previously Formidable would return the files and fields as key/value pairs. With v3, the value
// however is always an array. This is unclear why they did this but for example a field
// `email=test@example.com` would come out as `email: ['test@example.com']`. Since all our code
// expect simple key/value pairs, we use this function to convert back to the old style.
//
// For the extra challenge, they made this change only if the content-type is
// "application/x-www-form-urlencoded". Other content types such as JSON are not modified.
//
// As of 2024-01-18, this may no longer be necessary since we reverted to Formidable v2, but keeping
// it anyway just in case.
const convertFieldsToKeyValue = (fields: Files | Fields) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const convertedFields: Record<string, any> = {};
	for (const [k, v] of Object.entries(fields)) {
		if (Array.isArray(v)) {
			convertedFields[k] = v.length ? v[0] : undefined;
		} else {
			convertedFields[k] = v;
		}

	}
	return convertedFields;
};

// Input should be Koa ctx.req, which corresponds to the native Node request
export async function formParse(request: IncomingMessage): Promise<FormParseResult> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const req: FormParseRequest = request as any;

	// It's not clear how to get mocked requests to be parsed successfully by
	// formidable so we use this small hack. If it's mocked, we are running test
	// units and the request body is already an object and can be returned.
	if (req.__isMocked) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any = {};
		if (req.files) output.files = req.files;
		output.fields = req.body || {};
		return output;
	}

	if (req.__parsed) return req.__parsed;

	const isFormContentType = req.headers['content-type'] === 'application/x-www-form-urlencoded' || req.headers['content-type'].startsWith('multipart/form-data');

	// Note that for Formidable to work, the content-type must be set in the
	// headers
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	return new Promise((resolve: Function, reject: Function) => {
		const form = formidable({
			allowEmptyFiles: true,
			minFileSize: 0,
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		form.parse(req, (error: any, fields: Fields, files: Files) => {
			if (error) {
				error.message = `Could not parse form: ${error.message}`;
				reject(error);
				return;
			}

			// Formidable seems to be doing some black magic and once a request
			// has been parsed it cannot be parsed again. Doing so will do
			// nothing, the code will just end there, or maybe wait
			// indefinitely. So we cache the result on success and return it if
			// some code somewhere tries again to parse the form.
			req.__parsed = {
				fields: isFormContentType ? convertFieldsToKeyValue(fields) : fields,
				files: convertFieldsToKeyValue(files),
			};
			resolve(req.__parsed);
		});
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function bodyFields<T>(req: any/* , filter:string[] = null*/): Promise<T> {
	const form = await formParse(req);
	return form.fields as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const bodyFiles = async <T>(req: any/* , filter:string[] = null*/): Promise<T> => {
	const form = await formParse(req);
	return form.files as T;
};

export function ownerRequired(ctx: AppContext) {
	if (!ctx.joplin.owner) throw new ErrorForbidden();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
