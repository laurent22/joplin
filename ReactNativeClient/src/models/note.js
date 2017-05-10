import { BaseModel } from 'src/base-model.js';

class Note extends BaseModel {

	static tableName() {
		return 'notes';
	}

	static noteById(notes, id) {
		for (let i = 0; i < notes.length; i++) {
			if (notes[i].id == id) return notes[i];
		}
		return null;
	}

	static newNote() {
		return {
			id: null,
			title: '',
			body: '',
		}
	}

}

export { Note };