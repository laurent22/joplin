import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Resource } from 'lib/models/resource.js';
import { uuid } from 'lib/uuid.js';
import { filename } from 'lib/path-utils.js';

const fs = require('fs-extra');
const mime = require('mime/lite');
const sharp = require('sharp');

class Command extends BaseCommand {

	usage() {
		return 'attach <note> <file>';
	}

	description() {
		return _('Attaches the given file to the note.');
	}

	resizeImage_(filePath, targetPath) {
		return new Promise((resolve, reject) => {
			sharp(filePath)
			.resize(Resource.IMAGE_MAX_DIMENSION, Resource.IMAGE_MAX_DIMENSION)
			.max()
			.withoutEnlargement()
			.toFile(targetPath, (err, info) => {
				if (err) {
					reject(err);
				} else {
					resolve(info);
				}
			});
		});
	}

	async action(args) {
		let title = args['note'];

		let note = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!note) throw new Error(_('Cannot find "%s".', title));

		const localFilePath = args['file'];
		if (!(await fs.pathExists(localFilePath))) throw new Error(_('Cannot access %s', localFilePath));

		let resource = Resource.new();
		resource.id = uuid.create();
		resource.mime = mime.getType(localFilePath);
		resource.title = filename(localFilePath);

		let targetPath = Resource.fullPath(resource);

		if (resource.mime == 'image/jpeg' || resource.mime == 'image/jpg' || resource.mime == 'image/png') {
			const result = await this.resizeImage_(localFilePath, targetPath);
			this.logger().info(result);
		} else {
			await fs.copy(localFilePath, targetPath, { overwrite: true });
		}

		await Resource.save(resource, { isNew: true });

		note.body += "\n" + Resource.markdownTag(resource);
		await Note.save(note);
	}

}

module.exports = Command;