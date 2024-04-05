export default class FakeRequest {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private req_: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(nodeRequest: any) {
		this.req_ = nodeRequest;
	}

	public get method(): string {
		return this.req_.method || 'GET';
	}

}
