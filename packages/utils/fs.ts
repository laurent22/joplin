import { GlobOptionsWithFileTypesFalse, sync } from 'glob';
import { stat, utimes } from 'fs/promises';
import { ensureFile, removeSync } from 'fs-extra';
import { Second } from './time';

// Wraps glob.sync but with good default options so that it works across
// platforms and with consistent sorting.
export const globSync = (pattern: string | string[], options: GlobOptionsWithFileTypesFalse) => {
	let output = sync(pattern, options);
	output = output.map(f => f.replace(/\\/g, '/'));
	output.sort();
	return output;
};

// ------------------------------------------------------------------------------------------------
// This is a relatively crude system for "locking" files. It does so by regularly updating the
// timestamp of a file. If the file hasn't been updated for more than x seconds, it means the lock
// is stale and the file can be considered unlocked.
//
// This is good enough for our use case, to detect if a profile is already being used by a running
// instance of Joplin.
// ------------------------------------------------------------------------------------------------

interface FileLockerOptions {
	interval?: number;
}

export class FileLocker {

	private filePath_ = '';
	private interval_: ReturnType<typeof setInterval> | null = null;
	private options_: FileLockerOptions;

	public constructor(filePath: string, options: FileLockerOptions|null = null) {
		this.options_ = {
			interval: 10 * Second,
			...options,
		};

		this.filePath_ = filePath;
	}

	public get options() {
		return this.options_;
	}

	public async lock() {
		if (!(await this.canLock())) return false;

		await this.updateLock();

		this.interval_ = setInterval(() => {
			void this.updateLock();
		}, this.options_.interval);

		return true;
	}

	private async canLock() {
		try {
			const s = await stat(this.filePath_);
			return Date.now() - s.mtime.getTime() > (this.options_.interval as number);
		} catch (error) {
			const e = error as NodeJS.ErrnoException;
			if (e.code === 'ENOENT') return true;
			e.message = `Could not find out if this file can be locked: ${this.filePath_}`;
			return e;
		}
	}

	// We want the unlock operation to be synchronous because it may be performed when the app
	// is closing.
	public unlockSync() {
		this.stopMonitoring_();
		removeSync(this.filePath_);
	}

	private async updateLock() {
		await ensureFile(this.filePath_);
		const now = new Date();
		await utimes(this.filePath_, now, now);
	}

	public stopMonitoring_() {
		if (this.interval_) {
			clearInterval(this.interval_);
			this.interval_ = null;
		}
	}

}
