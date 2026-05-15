export default class FakeResponse {

	public status = 200;
	public body: unknown = null;
	private headers_: Record<string, string> = {};

	public set(name: string, value: string) {
		this.headers_[name] = value;
	}

	public get(name: string): string {
		return this.headers_[name];
	}

}
