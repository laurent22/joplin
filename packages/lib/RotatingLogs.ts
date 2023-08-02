import shim from './shim';
import { Stat } from './fs-driver-base';

export default class RotatingLogs {

	private logFilesDir: string;
	private maxFileSize: number = 1024 * 1024 * 100;
	private inactiveMaxAge: number = 90 * 24 * 60 * 60 * 1000;

	public constructor(logFilesDir: string, maxFileSize: number = null, inactiveMaxAge: number = null) {
		this.logFilesDir = logFilesDir;
		if (maxFileSize) this.maxFileSize = maxFileSize;
		if (inactiveMaxAge) this.inactiveMaxAge = inactiveMaxAge;
	}

	public async cleanActiveLogFile() {
		const stats: Stat = await this.fsDriver().stat(this.logFileFullpath());
		if (stats.size >= this.maxFileSize) {
			const newLogFile: string = this.logFileFullpath(this.getNameToNonActiveLogFile());
			await this.fsDriver().move(this.logFileFullpath(), newLogFile);
		}
	}

	private getNameToNonActiveLogFile(): string {
		return `log-${Date.now()}.txt`;
	}

	public async deleteNonActiveLogFiles() {
		const files: Stat[] = await this.fsDriver().readDirStats(this.logFilesDir);
		for (const file of files) {
			if (!file.path.match(/^log-[0-9]+.txt$/gi)) continue;
			const ageOfTheFile: number = Date.now() - file.mtime;
			if (ageOfTheFile >= this.inactiveMaxAge) {
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
