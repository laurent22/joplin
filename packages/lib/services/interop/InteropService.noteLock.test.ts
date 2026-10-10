import InteropService from './InteropService';
import { ExportModuleOutputFormat } from './types';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import EncryptionService from '../e2ee/EncryptionService';
import NoteLockKey, { noteLockKeyFileName } from '../noteLock/NoteLockKey';
import NoteLockService from '../noteLock/NoteLockService';
import NoteLockSession from '../noteLock/NoteLockSession';
import Resource from '../../models/Resource';
import { createNoteAndResource, encryptionService, exportDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import shim from '../../shim';
import * as fs from 'fs-extra';

const setUpUnlockedSession = async (password = '123456') => {
	await NoteLockKey.instance().create(password);
	await NoteLockSession.instance().unlock(password);
};

const lockNote = async (id: string) => {
	const lockedNote = { ...(await Note.load(id)), is_locked: 1, isDecrypted: true };
	await Note.save(lockedNote, { useNoteLock: true });
	return Note.load(id);
};

const rotateProfileKey = async (newPassword: string) => {
	NoteLockSession.instance().lock();
	await NoteLockKey.instance().reset(newPassword);
	await NoteLockSession.instance().unlock(newPassword);
};

describe('InteropService.noteLock', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		Setting.setValue('featureFlag.noteLock', true);
		await fs.remove(exportDir());
		await fs.mkdirp(exportDir());
	});

	it('should raw export a locked note with its ciphertext, resource and the key file', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const { note, resource } = await createNoteAndResource({ parentId: folder.id });
		await Note.save({ id: note.id, title: 'note', body: `secret text ${note.body}` });
		const locked = await lockNote(note.id);
		expect(locked.body).not.toContain('secret');

		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		const serialized = await fs.readFile(`${exportDir()}/${note.id}.md`, 'utf-8');
		expect(serialized).not.toContain('secret');
		expect(serialized).toContain('is_locked: 1');
		expect(serialized).toContain(resource.id);

		const exportedResources = await fs.readdir(`${exportDir()}/resources`);
		expect(exportedResources.some(f => f.startsWith(resource.id))).toBe(true);

		const keyFile = JSON.parse(await fs.readFile(`${exportDir()}/${noteLockKeyFileName}`, 'utf-8'));
		expect(keyFile.id).toBe(NoteLockKey.instance().load().id);
	});

	it('should include the key file inside a jex archive', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret', parent_id: folder.id });
		await lockNote(note.id);

		const jexPath = `${exportDir()}/test.jex`;
		await InteropService.instance().export({ path: jexPath, format: ExportModuleOutputFormat.Jex });

		const extractDir = `${exportDir()}/extracted`;
		await fs.mkdirp(extractDir);
		await shim.fsDriver().tarExtract({ strict: true, portable: true, file: jexPath, cwd: extractDir });
		expect(await fs.pathExists(`${extractDir}/${noteLockKeyFileName}`)).toBe(true);
	});

	it('should md export a locked note decrypted once the session is unlocked', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'locked note', body: 'secret text', parent_id: folder.id });
		await lockNote(note.id);

		const result = await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Markdown });

		const files = await fs.readdir(`${exportDir()}/folder`);
		expect(files.length).toBe(1);
		const exported = await fs.readFile(`${exportDir()}/folder/${files[0]}`, 'utf-8');
		expect(exported).toContain('secret text');
		expect(result.warnings).toEqual([]);
		// The database row stays encrypted, only the exported copy is decrypted.
		expect((await Note.load(note.id)).body).not.toContain('secret');
	});

	const saveLockedNotes = async (folderId: string, titles: string[]) => {
		for (const title of titles) {
			const note = await Note.save({ title, body: `secret ${title}`, parent_id: folderId });
			await lockNote(note.id);
		}
	};

	// Runs the action once, the first time a gated load or save starts.
	const onFirstGatedCall = (method: 'load'|'save', action: ()=> void) => {
		const original = (Note[method] as (...args: unknown[])=> Promise<unknown>).bind(Note);
		let done = false;
		return jest.spyOn(Note, method).mockImplementation(((...args: unknown[]) => {
			if (!done && (args[1] as { useNoteLock?: boolean })?.useNoteLock) {
				done = true;
				action();
			}
			return original(...args);
		}) as never);
	};

	it('should md export every locked note when the session is locked partway through', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		await saveLockedNotes(folder.id, ['one', 'two']);

		// Locks the session once the first note is done, as the second note starts loading.
		const load = Note.load.bind(Note);
		let plainLoads = 0;
		const spy = jest.spyOn(Note, 'load').mockImplementation((id, options) => {
			if (!options?.useNoteLock && ++plainLoads === 2) NoteLockSession.instance().lock();
			return load(id, options);
		});
		try {
			await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Markdown });
		} finally {
			spy.mockRestore();
		}

		const files = await fs.readdir(`${exportDir()}/folder`);
		expect(files.length).toBe(2);
		for (const file of files) {
			expect(await fs.readFile(`${exportDir()}/folder/${file}`, 'utf-8')).toContain('secret');
		}
	});

	it('should skip locked notes rather than write their ciphertext when the feature flag is turned off partway through', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		await saveLockedNotes(folder.id, ['one', 'two']);

		const spy = onFirstGatedCall('load', () => Setting.setValue('featureFlag.noteLock', false));
		let result;
		try {
			result = await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Markdown });
		} finally {
			spy.mockRestore();
		}

		expect(await fs.pathExists(`${exportDir()}/folder`) ? await fs.readdir(`${exportDir()}/folder`) : []).toEqual([]);
		expect(result.warnings).toEqual(['2 locked note(s) could not be unlocked and were not exported']);
	});

	it('should skip and count locked notes when the session is locked', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		await Note.save({ title: 'plain', body: 'plain text', parent_id: folder.id });
		const locked = await Note.save({ title: 'locked', body: 'secret', parent_id: folder.id });
		await lockNote(locked.id);
		NoteLockSession.instance().lock();

		const result = await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Markdown });

		expect(result.warnings).toEqual(['1 locked note(s) could not be unlocked and were not exported']);
		expect(await fs.readdir(`${exportDir()}/folder`)).toEqual(['plain.md']);
	});

	it('should skip a locked note whose content cannot be decrypted', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		await Note.save({ title: 'broken', body: 'not ciphertext', parent_id: folder.id, is_locked: 1 });

		const result = await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Markdown });

		expect(result.warnings).toEqual(['1 locked note(s) could not be unlocked and were not exported']);
	});

	it('should not write the key file when no note is locked', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		await Note.save({ title: 'note', body: 'plain body', parent_id: folder.id });

		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		expect(await fs.pathExists(`${exportDir()}/${noteLockKeyFileName}`)).toBe(false);
	});

	it('should write the key file for a note locked with the profile key even with note lock disabled', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret', parent_id: folder.id });
		await lockNote(note.id);

		Setting.setValue('featureFlag.noteLock', false);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		expect(JSON.parse(await fs.readFile(`${exportDir()}/${noteLockKeyFileName}`, 'utf-8')).id).toBe(NoteLockKey.instance().load().id);
	});

	it('should not write the key file when the locked notes use another key', async () => {
		await setUpUnlockedSession();
		const otherKey = await encryptionService().generateMasterKey('other');
		const body = await encryptionService().encryptString('secret', {
			masterKeyId: '0123456789abcdef0123456789abcdef',
			decryptedMasterKey: await encryptionService().decryptMasterKeyContent(otherKey, 'other'),
			isNoteLock: true,
		});
		const folder = await Folder.save({ title: 'folder' });
		await Note.save({ title: 'note', body, parent_id: folder.id, is_locked: 1 });

		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		expect(await fs.pathExists(`${exportDir()}/${noteLockKeyFileName}`)).toBe(false);
	});

	it('should import a backup from the same profile with locked notes unchanged', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const { note, resource } = await createNoteAndResource({ parentId: folder.id });
		await Note.save({ id: note.id, title: 'note', body: `secret ${note.body}` });
		await lockNote(note.id);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		const result = await InteropService.instance().import({ path: exportDir(), format: 'raw' });

		const imported = (await Note.all()).find(n => n.id !== note.id && !!n.is_locked);
		expect(imported.body).not.toContain('secret');
		expect((await Note.load(imported.id, { useNoteLock: true })).body).toContain('secret');
		expect(result.warnings).toEqual([]);

		// The extracted list follows the remapped resource id, so the resource stays associated.
		const importedResourceIds = Note.unserializeExtractedResourceIds(imported.extracted_resource_ids);
		expect(importedResourceIds.length).toBe(1);
		expect(importedResourceIds[0]).not.toBe(resource.id);
		expect(!!(await Resource.load(importedResourceIds[0]))).toBe(true);
	});

	it('should re-encrypt imported locked notes for this profile through the key handler', async () => {
		await setUpUnlockedSession('old password');
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret old', parent_id: folder.id });
		await lockNote(note.id);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		await rotateProfileKey('new password');

		const result = await InteropService.instance().import({
			path: exportDir(),
			format: 'raw',
			onNoteLockKey: keyFile => NoteLockKey.instance().decrypt('old password', keyFile),
		});

		const imported = (await Note.all()).find(n => n.id !== note.id && !!n.is_locked);
		expect(imported.body).not.toContain('secret');
		expect((await Note.load(imported.id, { useNoteLock: true })).body).toBe('secret old');
		expect(result.warnings.length).toBe(0);
	});

	it('should re-encrypt every imported locked note when the session is locked partway through', async () => {
		await setUpUnlockedSession('old password');
		const folder = await Folder.save({ title: 'folder' });
		await saveLockedNotes(folder.id, ['one', 'two']);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });
		const originalIds = (await Note.all()).map(n => n.id);

		await rotateProfileKey('new password');

		const spy = onFirstGatedCall('save', () => NoteLockSession.instance().lock());
		try {
			await InteropService.instance().import({
				path: exportDir(),
				format: 'raw',
				onNoteLockKey: keyFile => NoteLockKey.instance().decrypt('old password', keyFile),
			});
		} finally {
			spy.mockRestore();
		}

		await NoteLockSession.instance().unlock('new password');
		const imported = (await Note.all()).filter(n => !originalIds.includes(n.id));
		expect(imported.length).toBe(2);
		for (const n of imported) expect((await Note.load(n.id, { useNoteLock: true })).body).toMatch(/^secret /);
	});

	it('should stop the import without writing plain text when the feature flag is turned off while a locked note is re-encrypted', async () => {
		await setUpUnlockedSession('old password');
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret old', parent_id: folder.id });
		await lockNote(note.id);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		await rotateProfileKey('new password');

		const save = Note.save.bind(Note);
		const spy = jest.spyOn(Note, 'save').mockImplementation((o, options) => {
			Setting.setValue('featureFlag.noteLock', false);
			return save(o, options);
		});

		try {
			await expect(InteropService.instance().import({
				path: exportDir(),
				format: 'raw',
				onNoteLockKey: keyFile => NoteLockKey.instance().decrypt('old password', keyFile),
			})).rejects.toThrow('Locked notes cannot be saved while the note lock feature is turned off');
		} finally {
			spy.mockRestore();
		}
		expect((await Note.all()).filter(n => n.body.includes('secret'))).toEqual([]);
	});

	it('should import foreign locked notes unchanged when no key handler is provided', async () => {
		await setUpUnlockedSession('old password');
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret old', parent_id: folder.id });
		await lockNote(note.id);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		await rotateProfileKey('new password');

		const result = await InteropService.instance().import({ path: exportDir(), format: 'raw' });

		const imported = (await Note.all()).find(n => n.id !== note.id && !!n.is_locked);
		expect(imported.body).not.toContain('secret');
		await expect(Note.load(imported.id, { useNoteLock: true })).rejects.toThrow();
		expect(result.warnings).toEqual(['The locked notes in this backup have not been migrated to the current note lock key and will be unreadable']);
	});

	it('should warn when a backup with locked notes is imported without a handler into a profile with no note lock key', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret', parent_id: folder.id });
		await lockNote(note.id);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		await setupDatabaseAndSynchronizer(2);
		await switchClient(2);
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		Setting.setValue('featureFlag.noteLock', true);
		const result = await InteropService.instance().import({ path: exportDir(), format: 'raw' });

		expect(result.warnings).toEqual(['The locked notes in this backup cannot be read, because no note lock key has been set up on this profile']);
	});

	it('should keep locked notes unchanged and warn when the provided key does not fit', async () => {
		await setUpUnlockedSession('old password');
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret old', parent_id: folder.id });
		await lockNote(note.id);
		await InteropService.instance().export({ path: exportDir(), format: ExportModuleOutputFormat.Raw });

		await rotateProfileKey('new password');

		const result = await InteropService.instance().import({
			path: exportDir(),
			format: 'raw',
			onNoteLockKey: async keyFile => ({ id: keyFile.id, plainText: 'not the key' }),
		});

		const imported = (await Note.all()).find(n => n.id !== note.id && !!n.is_locked);
		expect(imported.body).not.toContain('secret');
		expect(result.warnings.some(w => w.includes('could not be unlocked'))).toBe(true);
	});

});
