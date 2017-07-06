import { BaseItem } from 'lib/models/base-item.js';
import { BaseModel } from 'lib/base-model.js';
import lodash  from 'lodash';

class NoteTag extends BaseItem {

	static tableName() {
		return 'note_tags';
	}

	static modelType() {
		return BaseModel.TYPE_NOTE_TAG;
	}

	static async serialize(item, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'sync_time');
		return super.serialize(item, 'note_tag', fieldNames);
	}

}

export { NoteTag };