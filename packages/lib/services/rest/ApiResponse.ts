export default class ApiResponse {

	public type: string;
	public body: unknown;
	public contentType: string;
	public attachmentFilename: string;
	// When set, overrides the default status code the server would use.
	public status: number = null;

}
