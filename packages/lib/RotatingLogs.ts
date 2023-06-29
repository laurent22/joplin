const moment = require('moment');
const { FsDriverDummy } = require('./fs-driver-dummy.js');

export default class RotatingLogs {

	public static fsDriver_: any = null;

	private logFileDir: string = '';
	private logFileName: string = 'log.txt';
	private logFileExpirationTimeInDays: number = 30;
	private logFileMaximumSizeInBytes: number = 1024 * 1024 * 10;

	public constructor(logFileDir: string) {
		this.setLogFileDir(logFileDir);
	}

	public setLogFileDir(value: string) {
		this.logFileDir = value;
	}

	private fsDriver() {
		if (!RotatingLogs.fsDriver_) RotatingLogs.fsDriver_ = new FsDriverDummy();
		return RotatingLogs.fsDriver_;
	}

	public async cleanLogFile(): Promise<boolean> {
		const stats = await this.fsDriver().stat(this.logFileFullpath());
		const sizeInBytes: number = stats.size;
		if (this.isLogFileBiggerThanMaximumSizeInBytes(sizeInBytes)) {
			const newLogFile: string = this.logFileFullpath(this.getNameToNonActiveLogFile());
			this.fsDriver().move(this.logFileFullpath(), newLogFile);
			return true;
		}
		return false;
	}

	private isLogFileBiggerThanMaximumSizeInBytes(logFileSizeInBytes: number): boolean {
		return logFileSizeInBytes >= this.logFileMaximumSizeInBytes;
	}

	private getNameToNonActiveLogFile(): string {
		return `log-${moment.now()}.txt`;
	}

	public async deleteOldLogFiles(): Promise<boolean> {
		const files: Array<string> = await this.fsDriver().readDirStats(this.logFileDir);
		const logs: Array<string> = this.getNonActiveLogs(files.map((file: any) => file.path));
		let hasAnyFileBeenDeleted = false;
		logs.forEach(async (log: string) => {
			const stats: any = await this.fsDriver().stat(this.logFileFullpath(log));
			const birthtime: Date = stats.birthtime;
			const diffInDays: number = moment().diff(birthtime, 'days');
			if (this.isLogFileOlderThanExpirationTimeInDays(diffInDays)) {
				this.fsDriver().remove(this.logFileFullpath(log));
				hasAnyFileBeenDeleted = true;
			}
		});
		return hasAnyFileBeenDeleted;
	}

	private getNonActiveLogs(files: Array<string>): Array<string> {
		const regex = new RegExp('^log-[0-9]+.txt$', 'gi');
		return files.filter(file => file.match(regex));
	}

	private isLogFileOlderThanExpirationTimeInDays(logFileAge: number): boolean {
		return logFileAge >= this.logFileExpirationTimeInDays;
	}

	private logFileFullpath(fileName: string = this.logFileName) {
		return `${this.logFileDir}/${fileName}`;
	}
}
