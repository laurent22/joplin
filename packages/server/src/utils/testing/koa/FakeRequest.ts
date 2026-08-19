interface FakeNodeRequest {
	method?: string;
}

export default class FakeRequest {

	private req_: FakeNodeRequest;

	public constructor(nodeRequest: FakeNodeRequest) {
		this.req_ = nodeRequest;
	}

	public get method(): string {
		return this.req_.method || 'GET';
	}

}
