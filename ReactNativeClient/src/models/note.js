import { BaseModel } from 'src/base-model.js';

class Note extends BaseModel {

	static noteById(notes, id) {
		for (let i = 0; i < notes.length; i++) {
			if (notes[i].id == id) return notes[i];
		}
		return null;
	}

}

export { Note };