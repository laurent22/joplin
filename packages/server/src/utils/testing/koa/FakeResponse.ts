export default class FakeResponse {

	public status = 200;
	public body: any = null;
	private headers_: any = {};

	public set(name: string, value: any) {
		this.headers_[name] = value;
	}

	public get(name: string): any {
		return this.headers_[name];
	}

}
