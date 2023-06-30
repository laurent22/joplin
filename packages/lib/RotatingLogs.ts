const moment = require('moment');
const { FsDriverDummy } = require('./fs-driver-dummy.js');

export default class RotatingLogs {

	public static fsDriver_: any = null;

	private logFileDir: string = '';
	private logFileName: string = 'log.txt';
	private logFileExpirationTimeInDays: number = 30;
	private logFileMaximumSizeInBytes: number = 1024 * 1024 * 10;
	private logFileRotetionalInterval: number = 43200 * 1000;

	public constructor(logFileDir: string) {
		this.setLogFileDir(logFileDir);
		this.rotateLogsFiles();
		this.rotateLogsFilesOnEachInterval();
	}

	public setLogFileDir(value: string) {
		this.logFileDir = value;
	}

	private fsDriver() {
		if (!RotatingLogs.fsDriver_) RotatingLogs.fsDriver_ = new FsDriverDummy();
		return RotatingLogs.fsDriver_;
	}

	private rotateLogsFiles() {
		void this.cleanActiveLogFile(),
		void this.deleteOldLogsFiles();
	}

	private rotateLogsFilesOnEachInterval() {
		setInterval(() => {
			this.rotateLogsFiles();
		}, this.logFileRotetionalInterval);
	}

	private async cleanActiveLogFile() {
		try {
			await this.cleanActiveLogFileImplementation();
		} catch (e) {
			console.error(e.message);
		}
	}

	private async deleteOldLogsFiles() {
		try {
			await this.deleteOldLogFilesImplementation();
		} catch (e) {
			console.error(e.message);
		}
	}

	public async cleanActiveLogFileImplementation(): Promise<boolean> {
		let stats: any = false;
		try {
			stats = await this.fsDriver().stat(this.logFileFullpath());
		} catch (e) {
			console.error(e.message);
			throw new Error('Cannot read the stats of active log file.');
		}
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

	public async deleteOldLogFilesImplementation(): Promise<boolean> {
		let files: Array<string>;
		try {
			files = await this.fsDriver().readDirStats(this.logFileDir);
		} catch (e) {
			console.error(e.message);
			throw new Error('Cannot read the stats of logs directory.');
		}
		const logs: Array<string> = this.getNonActiveLogs(files.map((file: any) => file.path));
		let hasAnyFileBeenDeleted = false;
		logs.forEach(async (log: string) => {
			let stats: any;
			try {
				stats = await this.fsDriver().stat(this.logFileFullpath(log));
			} catch (e) {
				console.error(e.message);
				console.error('Cannot read the stats of the old log file.');
			}
			const birthtime: Date = stats.birthtime;
			const diffInDays: number = moment().diff(birthtime, 'days');
			if (this.isLogFileOlderThanExpirationTimeInDays(diffInDays)) {
				try {
					this.fsDriver().remove(this.logFileFullpath(log));
					hasAnyFileBeenDeleted = true;
				} catch (e) {
					console.error(e.message);
					throw new Error('Cannot delete the old log file.');
				}
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
