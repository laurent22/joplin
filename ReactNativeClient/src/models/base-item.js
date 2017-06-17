import { BaseModel } from 'src/base-model.js';
import { Note } from 'src/models/note.js';
import { Folder } from 'src/models/folder.js';
import { folderItemFilename } from 'src/string-utils.js'
import { Database } from 'src/database.js';
import moment from 'moment';

class BaseItem extends BaseModel {

	static useUuid() {
		return true;
	}

	static systemPath(item) {
		return folderItemFilename(item) + '.md';
	}

	static itemClass(item) {
		if (!item) throw new Error('Item cannot be null');
		if (!('type_' in item)) throw new Error('Item does not have a type_ property');
		return item.type_ == BaseModel.ITEM_TYPE_NOTE ? Note : Folder;
	}

	static pathToId(path) {
		let s = path.split('.');
		return s[0];
	}

	static loadItemByPath(path) {
		let id = this.pathToId(path);
		return Note.load(id).then((item) => {
			if (item) return item;
			return Folder.load(id);
		});
	}

	static toFriendlyString_format(propName, propValue) {
		if (['created_time', 'updated_time'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = moment.unix(propValue).utc().format('YYYY-MM-DD HH:mm:ss') + 'Z';
		} else if (propValue === null || propValue === undefined) {
			propValue = '';
		}

		return propValue;
	}

	static fromFriendlyString_format(propName, propValue) {
		if (propName == 'type_') return propValue;

		if (['created_time', 'updated_time'].indexOf(propName) >= 0) {
			if (!propValue) return 0;
			propValue = moment(propValue, 'YYYY-MM-DD HH:mm:ssZ').unix();
		} else {
			propValue = Database.formatValue(this.fieldType(propName), propValue);
		}

		return propValue;
	}

	static toFriendlyString(item, type = null, shownKeys = null) {
		let output = [];

		output.push(item.title);
		output.push('');
		output.push(type == 'note' ? item.body : '');
		output.push('');
		for (let i = 0; i < shownKeys.length; i++) {
			let v = item[shownKeys[i]];
			v = this.toFriendlyString_format(shownKeys[i], v);
			output.push(shownKeys[i] + ': ' + v);
		}

		return output.join("\n");
	}

	static fromFriendlyString(content) {
		let lines = content.split("\n");
		let output = {};
		let state = 'readingProps';
		let body = [];
		for (let i = lines.length - 1; i >= 0; i--) {
			let line = lines[i];

			if (state == 'readingProps') {
				line = line.trim();

				if (line == '') {
					state = 'readingBody';
					continue;
				}

				let p = line.indexOf(':');
				if (p < 0) throw new Error('Invalid property format: ' + line + ": " + content);
				let key = line.substr(0, p).trim();
				let value = line.substr(p + 1).trim();
				output[key] = this.fromFriendlyString_format(key, value);
			} else if (state == 'readingBody') {
				body.splice(0, 0, line);
			}
		}

		if (body.length < 3) throw new Error('Invalid body size: ' + body.length + ': ' + content);

		let title = body.splice(0, 2);
		output.title = title[0];
		if (output.type_ == BaseModel.ITEM_TYPE_NOTE) output.body = body.join("\n");

		return output;
	}

}

export { BaseItem };