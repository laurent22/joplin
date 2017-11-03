const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const { BaseModel } = require('lib/base-model.js');
const { Folder } = require('lib/models/folder.js');
const { Note } = require('lib/models/note.js');
const { Resource } = require('lib/models/resource.js');
const { uuid } = require('lib/uuid.js');
const { filename } = require('lib/path-utils.js');

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

		note.body += "\n\n" + Resource.markdownTag(resource);
		await Note.save(note);
	}

}

module.exports = Command;