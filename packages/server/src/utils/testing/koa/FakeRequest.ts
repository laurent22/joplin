export default class FakeRequest {

	private req_: any;

	public constructor(nodeRequest: any) {
		this.req_ = nodeRequest;
	}

	public get method(): string {
		return this.req_.method || 'GET';
	}

}
