import { FolderEntity, NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
import uuid from '@joplin/lib/uuid';


export function makeNoteSerializedBody(note: NoteEntity = {}): string {
	return `${'title' in note ? note.title : 'Title'}

${'body' in note ? note.body : 'Body'}

id: ${'id' in note ? note.id : 'b39dadd7a63742bebf3125fd2a9286d4'}
parent_id: ${'parent_id' in note ? note.parent_id : '000000000000000000000000000000F1'}
created_time: 2020-10-15T10:34:16.044Z
updated_time: 2021-01-28T23:10:30.054Z
is_conflict: 0
latitude: 0.00000000
longitude: 0.00000000
altitude: 0.0000
author: 
source_url: 
is_todo: 1
todo_due: 1602760405000
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data: 
order: 0
user_created_time: 2020-10-15T10:34:16.044Z
user_updated_time: 2020-10-19T17:21:03.394Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 1
share_id: ${note.share_id || ''}
conflict_original_id: 
master_key_id: 
user_data: 
deleted_time: 0
type_: 1`;
}

export function makeFolderSerializedBody(folder: FolderEntity = {}): string {
	return `${'title' in folder ? folder.title : 'Title'}

id: ${folder.id || '000000000000000000000000000000F1'}
created_time: 2020-11-11T18:44:14.534Z
updated_time: 2020-11-11T18:44:14.534Z
user_created_time: 2020-11-11T18:44:14.534Z
user_updated_time: 2020-11-11T18:44:14.534Z
encryption_cipher_text:
encryption_applied: 0
parent_id: ${folder.parent_id || ''}
is_shared: 0
share_id: ${folder.share_id || ''}
user_data: 
type_: 2`;
}

export function makeResourceSerializedBody(resource: ResourceEntity = {}): string {
	resource = {
		id: uuid.create(),
		mime: 'plain/text',
		file_extension: 'txt',
		size: 0,
		title: 'Test Resource',
		...resource,
	};

	return `${resource.title}

id: ${resource.id}
mime: ${resource.mime}
filename: 
created_time: 2020-10-15T10:37:58.090Z
updated_time: 2020-10-15T10:37:58.090Z
user_created_time: 2020-10-15T10:37:58.090Z
user_updated_time: 2020-10-15T10:37:58.090Z
file_extension: ${resource.file_extension}
encryption_cipher_text: 
encryption_applied: 0
encryption_blob_encrypted: 0
size: ${resource.size}
share_id: ${resource.share_id || ''}
is_shared: 0
type_: 4`;
}
