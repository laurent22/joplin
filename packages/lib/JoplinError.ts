export type JoplinErrorCode = string | number | null;

export default class JoplinError extends Error {

	public code: JoplinErrorCode = null;
	public details = '';

	public constructor(message: string, code: JoplinErrorCode = null, details: string = null) {
		super(message);
		this.code = code;
		this.details = details;
	}

}
