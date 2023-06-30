export default class JoplinError extends Error {

	public code: any = null;
	public details = '';

	public constructor(message: string, code: any = null, details: string = null) {
		super(message);
		this.code = code;
		this.details = details;
	}

}
