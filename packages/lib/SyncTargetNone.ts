import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';

export default class SyncTargetNone extends BaseSyncTarget {

	public static id() {
		return 0;
	}

	public static targetName() {
		return 'none';
	}

	public static label() {
		return _('(None)');
	}

	public async fileApi(): Promise<FileApi> {
		return null;
	}

	protected async initFileApi() {

	}

	protected async initSynchronizer() {
		return null as any;
	}
}
