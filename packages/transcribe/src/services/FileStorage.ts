import { join } from 'path';
import { move, readdir, remove } from 'fs-extra';
import { randomBytes } from 'crypto';
import { ContentStorage } from '../types';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('FileStorage');

export default class FileStorage implements ContentStorage {

	private isMaintenanceRunning = false;

	public async store(filepath: string) {
		const time = new Date().getTime();
		const random = randomBytes(16).toString('hex');
		const randomName = `${time}_${random}`;
		await move(filepath, join('images', randomName));
		return randomName;
	}

	public async remove(filename: string) {
		logger.info(`Deleting: ${filename}`);
		await remove(join('images', filename));
	}

	public initMaintenance(retentionDuration: number, maintenanceInterval: number) {
		logger.info('Maintenance started.');
		setInterval(async () => {
			if (this.isMaintenanceRunning) return;

			this.isMaintenanceRunning = true;
			const olderThan = new Date(new Date().getTime() - retentionDuration);
			logger.info(`Deleting files older than: ${olderThan}`);
			await this.removeOldFiles(olderThan);
			this.isMaintenanceRunning = false;
		}, maintenanceInterval);
	}

	public async removeOldFiles(olderThan: Date) {
		const files = await readdir('images');
		const filesToBeDeleted = files
			.map(f => {
				const datetimePart = parseInt(f.split('_')[0], 10);
				return {
					filepath: f,
					timestamp: new Date(datetimePart),
				};
			})
			.filter(f => {
				return f.timestamp.getTime() < olderThan.getTime();
			});

		logger.info(`Files found to be deleted: ${filesToBeDeleted.length}`);
		for (const file of filesToBeDeleted) {
			await this.remove(file.filepath);
		}
	}
}
