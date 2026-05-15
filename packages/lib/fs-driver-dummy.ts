/* eslint-disable @typescript-eslint/no-explicit-any */

export class FsDriverDummy {
	public constructor() {}
	public appendFileSync() {}
	public readFile(_path: string, _encoding: string = 'utf8'): any {
		return '';
	}
}
