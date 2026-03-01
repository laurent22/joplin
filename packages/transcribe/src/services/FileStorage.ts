import { join, extname } from 'path';
import { move, readdir, remove } from 'fs-extra';
import { ContentStorage } from '../types';
import Logger from '@joplin/utils/Logger';
import createFilename from './createFilename';

const logger = Logger.create('FileStorage');

export default class FileStorage implements ContentStorage {

	private isMaintenanceRunning = false;
	private imagesFolderPath: string;

	public constructor(imagesFolderPath?: string) {
		this.imagesFolderPath = imagesFolderPath || join(process.cwd(), 'images');
	}

	public async store(filepath: string) {
		const extension = extname(filepath).replace(/^\./, '');
		const randomName = createFilename(extension);
		await move(filepath, join(this.imagesFolderPath, randomName));
		return randomName;
	}

	public async remove(filename: string) {
		logger.info(`Deleting: ${filename}`);
		await remove(join(this.imagesFolderPath, filename));
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
		const files = await readdir(this.imagesFolderPath);
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
