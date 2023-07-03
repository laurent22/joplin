import shim from './shim';
import dayjs = require('dayjs');
import { Stat } from './fs-driver-base';

export interface RotationalLogs {
	cleanActiveLogFile(): void;
	deleNonActiveLogFiles(): void;
}

export default class RotatingLogs {

	private logFilesDir = '';
	private nonActiveLogFileMaximumDaysAge = 30;
	private activeLogFileMaximumSizeInBytes: number = 1024 * 1024 * 10;

	public constructor(logFilesDir: string) {
		this.logFilesDir = logFilesDir;
	}

	public async cleanActiveLogFile() {
		const stats = await this.fsDriver().stat(this.logFileFullpath());
		const logFileSizeInBytes: number = stats.size;
		if (logFileSizeInBytes >= this.activeLogFileMaximumSizeInBytes) {
			const newLogFile: string = this.logFileFullpath(this.getNameToNonActiveLogFile());
			await this.fsDriver().move(this.logFileFullpath(), newLogFile);
		}
	}

	private getNameToNonActiveLogFile(): string {
		return `log-${dayjs().valueOf()}.txt`;
	}

	public async deleNonActiveLogFiles() {
		const files: Stat[] = await this.fsDriver().readDirStats(this.logFilesDir);
		for (const file of files) {
			if (!file.path.match(/^log-[0-9]+.txt$/gi)) continue;
			const diffInDays: number = dayjs().diff(file.birthtime, 'days');
			if (diffInDays >= this.nonActiveLogFileMaximumDaysAge) {
				await this.fsDriver().remove(this.logFileFullpath(file.path));
			}
		}
	}

	private logFileFullpath(fileName = 'log.txt'): string {
		return `${this.logFilesDir}/${fileName}`;
	}

	private fsDriver() {
		return shim.fsDriver();
	}
}
