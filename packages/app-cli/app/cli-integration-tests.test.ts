import * as fs from 'fs-extra';
import Logger, { TargetType } from '@joplin/utils/Logger';
import { dirname } from '@joplin/lib/path-utils';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { node } from 'execa';
import { splitCommandString } from '@joplin/utils';
const nodeSqlite = require('sqlite3');
const { loadKeychainServiceAndSettings } = require('@joplin/lib/services/SettingUtils');
const { default: shimInitCli } = require('./utils/shimInitCli');

const baseDir = `${dirname(__dirname)}/tests/cli-integration`;
const joplinAppPath = `${__dirname}/main.js`;

shimInitCli({ nodeSqlite, appVersion: () => require('../package.json').version, keytar: null });
require('@joplin/lib/testing/test-utils');


interface Client {
	id: number;
	profileDir: string;
}

function createClient(id: number): Client {
	return {
		id: id,
		profileDir: `${baseDir}/client${id}`,
	};
}


async function execCommand(client: Client, command: string) {
	const result = await node(
		joplinAppPath,
		['--update-geolocation-disabled', '--env', 'dev', '--profile', client.profileDir, ...splitCommandString(command)],
	);
	if (result.exitCode !== 0) {
		throw new Error(`Command failed: ${command}:\nstderr: ${result.stderr}\nstdout: ${result.stdout}`);
	}
	return result.stdout;
}

async function clearDatabase(db: JoplinDatabase) {
	await db.transactionExecBatch(['DELETE FROM folders', 'DELETE FROM notes', 'DELETE FROM tags', 'DELETE FROM note_tags', 'DELETE FROM resources', 'DELETE FROM deleted_items']);
}


describe('cli-integration-tests', () => {
	let client: Client;
	let db: JoplinDatabase;

	beforeAll(async () => {
		await fs.remove(baseDir);
		await fs.mkdir(baseDir);

		client = createClient(1);
		// Initialize the database by running a client command and exiting.
		await execCommand(client, 'version');

		const dbLogger = new Logger();
		dbLogger.addTarget(TargetType.Console);
		dbLogger.setLevel(Logger.LEVEL_WARN);

		db = new JoplinDatabase(new DatabaseDriverNode());
		db.setLogger(dbLogger);

		await db.open({ name: `${client.profileDir}/database.sqlite` });
		BaseModel.setDb(db);
		Setting.setConstant('rootProfileDir', client.profileDir);
		Setting.setConstant('profileDir', client.profileDir);
		await loadKeychainServiceAndSettings([]);
	});

	beforeEach(async () => {
		await clearDatabase(db);
	});

	it.each([
		'version',
		'help',
	])('should run command %j without crashing', async (command) => {
		await execCommand(client, command);
	});

	it('should support the \'ls\' command', async () => {
		await execCommand(client, 'mkbook nb1');
		await execCommand(client, 'mknote note1');
		await execCommand(client, 'mknote note2');
		const r = await execCommand(client, 'ls');

		expect(r.indexOf('note1') >= 0).toBe(true);
		expect(r.indexOf('note2') >= 0).toBe(true);
	});

	it('should support the \'mv\' command', async () => {
		await execCommand(client, 'mkbook nb2');
		await execCommand(client, 'mkbook nb1');
		await execCommand(client, 'mknote n1');
		await execCommand(client, 'mv n1 nb2');

		const f1 = await Folder.loadByTitle('nb1');
		const f2 = await Folder.loadByTitle('nb2');
		let notes1 = await Note.previews(f1.id);
		let notes2 = await Note.previews(f2.id);

		expect(notes1.length).toBe(0);
		expect(notes2.length).toBe(1);

		await execCommand(client, 'mknote note1');
		await execCommand(client, 'mknote note2');
		await execCommand(client, 'mknote note3');
		await execCommand(client, 'mknote blabla');

		notes1 = await Note.previews(f1.id);
		notes2 = await Note.previews(f2.id);

		expect(notes1.length).toBe(4);
		expect(notes2.length).toBe(1);

		await execCommand(client, 'mv \'note*\' nb2');

		notes2 = await Note.previews(f2.id);
		notes1 = await Note.previews(f1.id);

		expect(notes1.length).toBe(1);
		expect(notes2.length).toBe(4);
	});

	it('should support the \'use\' command', async () => {
		await execCommand(client, 'mkbook nb1');
		await execCommand(client, 'mkbook nb2');
		await execCommand(client, 'mknote n1');
		await execCommand(client, 'mknote n2');

		const f1 = await Folder.loadByTitle('nb1');
		const f2 = await Folder.loadByTitle('nb2');
		let notes1 = await Note.previews(f1.id);
		let notes2 = await Note.previews(f2.id);

		expect(notes1.length).toBe(0);
		expect(notes2.length).toBe(2);

		await execCommand(client, 'use nb1');
		await execCommand(client, 'mknote note2');
		await execCommand(client, 'mknote note3');

		notes1 = await Note.previews(f1.id);
		notes2 = await Note.previews(f2.id);

		expect(notes1.length).toBe(2);
	});

	it('should support creating and removing folders', async () => {
		await execCommand(client, 'mkbook nb1');

		let folders = await Folder.all();
		expect(folders.length).toBe(1);
		expect(folders[0].title).toBe('nb1');

		await execCommand(client, 'mkbook nb1');

		folders = await Folder.all();
		expect(folders.length).toBe(2);
		expect(folders[0].title).toBe('nb1');
		expect(folders[1].title).toBe('nb1');

		await execCommand(client, 'rmbook -p -f nb1');

		folders = await Folder.all();
		expect(folders.length).toBe(1);

		await execCommand(client, 'rmbook -p -f nb1');

		folders = await Folder.all();
		expect(folders.length).toBe(0);
	});

	it('should support creating and removing notes', async () => {
		await execCommand(client, 'mkbook nb1');
		await execCommand(client, 'mknote n1');

		let notes = await Note.all();
		expect(notes.length).toBe(1);
		expect(notes[0].title).toBe('n1');

		await execCommand(client, 'rmnote -p -f n1');
		notes = await Note.all();
		expect(notes.length).toBe(0);

		await execCommand(client, 'mknote n1');
		await execCommand(client, 'mknote n2');

		notes = await Note.all();
		expect(notes.length).toBe(2);

		// Should fail to delete a non-existent note
		let failed = false;
		try {
			await execCommand(client, 'rmnote -f \'blabla*\'');
		} catch (error) {
			failed = true;
		}
		expect(failed).toBe(true);

		notes = await Note.all();
		expect(notes.length).toBe(2);

		await execCommand(client, 'rmnote -f -p \'n*\'');

		notes = await Note.all();
		expect(notes.length).toBe(0);
	});

	it('should support listing the contents of notes', async () => {
		await execCommand(client, 'mkbook nb1');
		await execCommand(client, 'mknote mynote');

		const folder = await Folder.loadByTitle('nb1');
		const note = await Note.loadFolderNoteByField(folder.id, 'title', 'mynote');

		let r = await execCommand(client, 'cat mynote');
		expect(r).toContain('mynote');
		expect(r).not.toContain(note.id);

		r = await execCommand(client, 'cat -v mynote');
		expect(r).toContain(note.id);
	});

	it('should support changing settings with config', async () => {
		await execCommand(client, 'config editor vim');
		await Setting.reset();
		await Setting.load();
		expect(Setting.value('editor')).toBe('vim');

		await execCommand(client, 'config editor subl');
		await Setting.reset();
		await Setting.load();
		expect(Setting.value('editor')).toBe('subl');

		const r = await execCommand(client, 'config');
		expect(r.indexOf('editor') >= 0).toBe(true);
		expect(r.indexOf('subl') >= 0).toBe(true);
	});

	it('should support copying folders with cp', async () => {
		await execCommand(client, 'mkbook nb2');
		await execCommand(client, 'mkbook nb1');
		await execCommand(client, 'mknote n1');

		await execCommand(client, 'cp n1');

		const f1 = await Folder.loadByTitle('nb1');
		const f2 = await Folder.loadByTitle('nb2');
		let notes = await Note.previews(f1.id);

		expect(notes.length).toBe(2);

		await execCommand(client, 'cp n1 nb2');
		const notesF1 = await Note.previews(f1.id);
		expect(notesF1.length).toBe(2);
		notes = await Note.previews(f2.id);
		expect(notes.length).toBe(1);
		expect(notes[0].title).toBe(notesF1[0].title);
	});
});

