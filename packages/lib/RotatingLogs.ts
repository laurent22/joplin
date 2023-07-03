import shim from './shim';
import dayjs = require('dayjs');
import { Stat } from './fs-driver-base';

export interface RotationalLogs {
	rotateLogsFiles(): void;
	cleanActiveLogFile(): void;
	deleteOldLogFiles(): void;
}

export default class RotatingLogs {

	private logFileDir = '';
	private logFileMaximumSizeInBytes: number = 1024 * 1024 * 10;

	public constructor(logFileDir: string) {
		this.logFileDir = logFileDir;
	}

	private fsDriver() {
		return shim.fsDriver();
	}

	public async rotateLogsFiles() {
		await this.cleanActiveLogFile();
		await this.deleteOldLogFiles();
	}

	public async cleanActiveLogFile() {
		const stats = await this.fsDriver().stat(this.logFileFullpath());
		const logFileSizeInBytes: number = stats.size;
		if (logFileSizeInBytes >= this.logFileMaximumSizeInBytes) {
			const newLogFile: string = this.logFileFullpath(this.getNameToNonActiveLogFile());
			await this.fsDriver().move(this.logFileFullpath(), newLogFile);
		}
	}

	private getNameToNonActiveLogFile(): string {
		return `log-${dayjs().valueOf()}.txt`;
	}

	public async deleteOldLogFiles() {
		const files: Stat[] = await this.fsDriver().readDirStats(this.logFileDir);
		for (const file of files) {
			if (!file.path.match(/^log-[0-9]+.txt$/gi)) continue;
			const birthtime: number = file.birthtime;
			const diffInDays: number = dayjs().diff(birthtime, 'days');
			if (diffInDays >= 30) {
				await this.fsDriver().remove(this.logFileFullpath(file.path));
			}
		}
	}

	private logFileFullpath(fileName = 'log.txt') {
		return `${this.logFileDir}/${fileName}`;
	}
}
