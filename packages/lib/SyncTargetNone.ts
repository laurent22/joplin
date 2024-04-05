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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return null as any;
	}
}
