import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { Geolocation } from 'src/geolocation.js';

class Note extends BaseModel {

	static tableName() {
		return 'notes';
	}

	static useUuid() {
		return true;
	}

	static itemType() {
		return BaseModel.ITEM_TYPE_NOTE;
	}

	static trackChanges() {
		return true;
	}

	static new(parentId = '') {
		let output = super.new();
		output.parent_id = parentId;
		return output;
	}

	static previews(parentId) {
		return this.db().selectAll('SELECT id, title, body, parent_id, updated_time FROM notes WHERE parent_id = ?', [parentId]).then((r) => {
			let output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

	static byFolderId() {

	}

	static save(o, options = null) {
		if (!options) options = {};
		if (!('updateLatLong' in options)) options.updateLatLong = true;

		return super.save(o, options).then((note) => {
			this.dispatch({
				type: 'NOTES_UPDATE_ONE',
				note: note,
			});

			if (options.updateLatLong && !note.latitude && !note.longitude) {
				Log.info('Updating lat/long of note...');
				let geoData = null;
				Geolocation.currentPosition().then((data) => {
					Log.info('Got lat/long');
					geoData = data;
					return Note.load(note.id);
				}).then((note) => {
					if (!note) return; // Has been deleted in the meantime
					note.longitude = geoData.coords.longitude;
					note.latitude = geoData.coords.latitude;
					note.altitude = geoData.coords.altitude;
					Note.save(note, { updateLatLong: false });
				}).catch((error) => {
					Log.info('Cannot get location:', error);
				});
			}

			return note;
		});
	}

}

export { Note };