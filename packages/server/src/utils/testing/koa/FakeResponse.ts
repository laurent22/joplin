export default class FakeResponse {

	public status = 200;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public body: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private headers_: any = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public set(name: string, value: any) {
		this.headers_[name] = value;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public get(name: string): any {
		return this.headers_[name];
	}

}
