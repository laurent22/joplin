/* eslint-disable @typescript-eslint/no-explicit-any */
export default class FsDriverDummy {
	public constructor() { }
	public appendFileSync() { }
	public readFile(_path: string, _encoding = 'utf8'): any {
		return '';
	}
}
