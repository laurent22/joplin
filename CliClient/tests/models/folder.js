import { time } from 'lib/time-utils.js';
import { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient } from 'test-utils.js';
import { createFoldersAndNotes } from 'test-data.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { BaseModel } from 'lib/base-model.js';

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection at: Promise', p, 'reason:', reason);
});