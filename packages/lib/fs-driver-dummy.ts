import FsDriverBase from './fs-driver-base';

export default class FsDriverDummy extends FsDriverBase {
	public appendFileSync() {}
	public override async readFile() {}
}
