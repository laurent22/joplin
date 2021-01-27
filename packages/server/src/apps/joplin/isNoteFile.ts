import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import { File } from '../../db';

BaseItem.loadClass('Note', Note);
// BaseItem.loadClass('Folder', Folder);
// BaseItem.loadClass('Resource', Resource);
// BaseItem.loadClass('Tag', Tag);
// BaseItem.loadClass('NoteTag', NoteTag);
// BaseItem.loadClass('MasterKey', MasterKey);
// BaseItem.loadClass('Revision', Revision);

export default async function(file: File): Promise<boolean> {
	console.info('FILE', file);

	if (file.mime_type !== 'text/markdown') return false;

	try {
		await Note.unserialize(file.content.toString());
	} catch (error) {
		console.info('ERROR', error);
		// No need to log - it means it's not a note file
		return false;
	}

	return true;
}
