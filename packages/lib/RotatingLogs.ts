const moment = require('moment');
import shim from './shim';

export default class RotatingLogs {

	private logFileDir: string = '';
	private logFileName: string = 'log.txt';
	private logFileExpirationTimeInDays: number = 30;
	private logFileMaximumSizeInBytes: number = 1024 * 1024 * 10;
	private logFileRotetionalInterval: number = 43200 * 1000;

	public constructor(logFileDir: string) {
		this.logFileDir = logFileDir;
	}

	private fsDriver() {
		return shim.fsDriver();
	}

	public async rotateLogsFiles() {
		await this.cleanActiveLogFile();
		await this.deleteOldLogsFiles();
		setInterval(async () => {
			await this.cleanActiveLogFile();
			await this.deleteOldLogsFiles();
		}, this.logFileRotetionalInterval);
	}

	public async cleanActiveLogFile() {
		const stats: any = await this.fsDriver().stat(this.logFileFullpath());
		const logFileSizeInBytes: number = stats.size;
		if (logFileSizeInBytes >= this.logFileMaximumSizeInBytes) {
			const newLogFile: string = this.logFileFullpath(this.getNameToNonActiveLogFile());
			await this.fsDriver().move(this.logFileFullpath(), newLogFile);
		}
	}

	private getNameToNonActiveLogFile(): string {
		return `log-${moment.now()}.txt`;
	}

	public async deleteOldLogsFiles() {
		const files: Array<string> = await this.fsDriver().readDirStats(this.logFileDir);
		const logs: Array<string> = this.getNonActiveLogs(files.map((file: any) => file.path));
		for (const log of logs) {
			const stats: any = await this.fsDriver().stat(this.logFileFullpath(log));
			const birthtime: Date = stats.birthtime;
			const diffInDays: number = moment().diff(birthtime, 'days');
			if (diffInDays >= this.logFileExpirationTimeInDays) {
				await this.fsDriver().remove(this.logFileFullpath(log));
			}
		}
	}

	private getNonActiveLogs(files: Array<string>): Array<string> {
		const regex = new RegExp('^log-[0-9]+.txt$', 'gi');
		return files.filter(file => file.match(regex));
	}

	private logFileFullpath(fileName: string = this.logFileName) {
		return `${this.logFileDir}/${fileName}`;
	}
}
