import { BaseModel } from 'src/base-model.js';
import { Note } from 'src/models/note.js';
import { Folder } from 'src/models/folder.js';
import { Setting } from 'src/models/setting.js';
import { folderItemFilename } from 'src/string-utils.js'
import { Database } from 'src/database.js';
import { time } from 'src/time-utils.js';
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

		if (typeof item === 'object') {
			if (!('type_' in item)) throw new Error('Item does not have a type_ property');
			return item.type_ == BaseModel.MODEL_TYPE_NOTE ? Note : Folder;
		} else {
			if (Number(item) === BaseModel.MODEL_TYPE_NOTE) return Note;
			if (Number(item) === BaseModel.MODEL_TYPE_FOLDER) return Folder;
			throw new Error('Unknown type: ' + item);
		}
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

	static serialize_format(propName, propValue) {
		if (['created_time', 'updated_time'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = moment.unix(propValue / 1000).utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
		} else if (propValue === null || propValue === undefined) {
			propValue = '';
		}

		return propValue;
	}

	static unserialize_format(type, propName, propValue) {
		if (propName == 'type_') return propValue;

		let ItemClass = this.itemClass(type);

		if (['created_time', 'updated_time'].indexOf(propName) >= 0) {
			if (!propValue) return 0;
			propValue = moment(propValue, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x');
		} else {
			propValue = Database.formatValue(ItemClass.fieldType(propName), propValue);
		}

		return propValue;
	}

	static serialize(item, type = null, shownKeys = null) {
		let output = [];

		output.push(item.title);
		output.push('');
		output.push(type == 'note' ? item.body : '');
		output.push('');
		for (let i = 0; i < shownKeys.length; i++) {
			let v = item[shownKeys[i]];
			v = this.serialize_format(shownKeys[i], v);
			output.push(shownKeys[i] + ': ' + v);
		}

		return output.join("\n");
	}

	static unserialize(content) {
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
				output[key] = value;
			} else if (state == 'readingBody') {
				body.splice(0, 0, line);
			}
		}

		if (body.length < 3) throw new Error('Invalid body size: ' + body.length + ': ' + content);

		let title = body.splice(0, 2);
		output.title = title[0];

		if (!output.type_) throw new Error('Missing required property: type_: ' + content);
		output.type_ = Number(output.type_);

		if (output.type_ == BaseModel.MODEL_TYPE_NOTE) output.body = body.join("\n");

		for (let n in output) {
			if (!output.hasOwnProperty(n)) continue;
			output[n] = this.unserialize_format(output.type_, n, output[n]);
		}

		return output;
	}

	static itemsThatNeedSync(limit = 100) {
		let conflictFolderId = Setting.value('sync.conflictFolderId');
		return Folder.modelSelectAll('SELECT * FROM folders WHERE sync_time < updated_time AND id != ? LIMIT ' + limit, [conflictFolderId]).then((items) => {
			if (items.length) return { hasMore: true, items: items };
			return Note.modelSelectAll('SELECT * FROM notes WHERE sync_time < updated_time AND parent_id != ? LIMIT ' + limit, [conflictFolderId]).then((items) => {
				return { hasMore: items.length >= limit, items: items };
			});
		});
	}

}

export { BaseItem };