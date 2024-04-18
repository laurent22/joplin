export default class JoplinError extends Error {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public code: any = null;
	public details = '';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(message: string, code: any = null, details: string = null) {
		super(message);
		this.code = code;
		this.details = details;
	}

}
