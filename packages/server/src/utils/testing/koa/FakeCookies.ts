export default class FakeCookies {

	private values_: Record<string, string> = {};

	public get(name: string): string {
		return this.values_[name];
	}

	public set(name: string, value: string) {
		this.values_[name] = value;
	}

}
