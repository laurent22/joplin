import { _ } from '../locale';
import ReportService, { ReportSection } from './ReportService';
import { createNTestNotes, decryptionWorker, encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, supportDir, switchClient, syncTargetId, synchronizer, synchronizerStart } from '../testing/test-utils';
import Folder from '../models/Folder';
import BaseItem from '../models/BaseItem';
import Note from '../models/Note';
import shim from '../shim';
import SyncTargetRegistry from '../SyncTargetRegistry';
import { loadMasterKeysFromSettings, setupAndEnableEncryption } from './e2ee/utils';
import Setting from '../models/Setting';
import DecryptionWorker from './DecryptionWorker';
import { ModelType } from '../BaseModel';


const firstSectionWithTitle = (report: ReportSection[], title: string) => {
	const sections = report.filter(section => section.title === title);
	if (sections.length === 0) return null;
	return sections[0];
};

const getCannotSyncSection = (report: ReportSection[]) => {
	return firstSectionWithTitle(report, _('Items that cannot be synchronised'));
};

const getIgnoredSection = (report: ReportSection[]) => {
	return firstSectionWithTitle(report, _('Ignored items that cannot be synchronised'));
};

const getDecryptionErrorSection = (report: ReportSection[]): ReportSection|null => {
	return firstSectionWithTitle(report, _('Items that cannot be decrypted'));
};

const sectionBodyToText = (section: ReportSection) => {
	return section.body.map(item => {
		if (typeof item === 'string') {
			return item;
		}

		return item.text;
	}).join('\n');
};

const getListItemsInBodyStartingWith = (section: ReportSection, keyPrefix: string) => {
	return section.body.filter(item =>
		typeof item !== 'string' && item.type === 'openList' && item.key.startsWith(keyPrefix),
	);
};

const addCannotDecryptNotes = async (corruptedNoteCount: number) => {
	await switchClient(2);

	const notes = [];
	for (let i = 0; i < corruptedNoteCount; i++) {
		notes.push(await Note.save({ title: `Note ${i}` }));
	}

	await synchronizerStart();
	await switchClient(1);
	await synchronizerStart();

	// First, simulate a broken note and check that the decryption worker
	// gives up decrypting after a number of tries. This is mainly relevant
	// for data that crashes the mobile application - we don't want to keep
	// decrypting these.

	for (const note of notes) {
		await Note.save({ id: note.id, encryption_cipher_text: 'bad' });
	}

	return notes.map(note => note.id);
};

const addRemoteNotes = async (noteCount: number) => {
	await switchClient(2);

	const notes = [];
	for (let i = 0; i < noteCount; i++) {
		notes.push(await Note.save({ title: `Test Note ${i}` }));
	}

	await synchronizerStart();
	await switchClient(1);

	return notes.map(note => note.id);
};

const setUpLocalAndRemoteEncryption = async () => {
	await switchClient(2);

	// Encryption setup
	const masterKey = await loadEncryptionMasterKey();
	await setupAndEnableEncryption(encryptionService(), masterKey, '123456');
	await synchronizerStart();

	// Give both clients the same master key
	await switchClient(1);
	await synchronizerStart();

	Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
	await loadMasterKeysFromSettings(encryptionService());
};

describe('ReportService', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should move sync errors to the "ignored" section after clicking "ignore"', async () => {
		const folder = await Folder.save({ title: 'Test' });
		const noteCount = 5;
		const testNotes = await createNTestNotes(noteCount, folder);
		await synchronizerStart();

		const disabledReason = 'Test reason';
		for (const testNote of testNotes) {
			await BaseItem.saveSyncDisabled(syncTargetId(), testNote, disabledReason);
		}

		const service = new ReportService();
		let report = await service.status(syncTargetId());

		// Items should all initially be listed as "cannot be synchronized", but should be ignorable.
		const unsyncableSection = getCannotSyncSection(report);
		const ignorableItems = [];
		for (const item of unsyncableSection.body) {
			if (typeof item === 'object' && item.canIgnore) {
				ignorableItems.push(item);
			}
		}
		expect(ignorableItems).toHaveLength(noteCount);
		expect(sectionBodyToText(unsyncableSection)).toContain(disabledReason);

		// Ignore all
		expect(await BaseItem.syncDisabledItemsCount(syncTargetId())).toBe(noteCount);
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId())).toBe(noteCount);
		for (const item of ignorableItems) {
			await item.ignoreHandler();
		}
		expect(await BaseItem.syncDisabledItemsCount(syncTargetId())).toBe(0);
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId())).toBe(noteCount);

		await synchronizerStart();
		report = await service.status(syncTargetId());

		// Should now be in the ignored section
		const ignoredSection = getIgnoredSection(report);
		expect(ignoredSection).toBeTruthy();
		expect(sectionBodyToText(unsyncableSection)).toContain(disabledReason);
		expect(sectionBodyToText(getCannotSyncSection(report))).not.toContain(disabledReason);

		// Should not be possible to re-ignore an item in the ignored section
		let ignoredItemCount = 0;
		for (const item of ignoredSection.body) {
			if (typeof item === 'object' && item.text?.includes(disabledReason)) {
				expect(item.canIgnore).toBeFalsy();
				expect(item.canRetry).toBe(true);
				ignoredItemCount++;
			}
		}
		// Should have the correct number of ignored items
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId())).toBe(ignoredItemCount);
		expect(ignoredItemCount).toBe(noteCount);

		// Clicking "retry" should un-ignore
		for (const item of ignoredSection.body) {
			if (typeof item === 'object' && item.text?.includes(disabledReason)) {
				expect(item.canRetry).toBe(true);
				await item.retryHandler();
				break;
			}
		}
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId())).toBe(noteCount - 1);
	});

	it('should support ignoring sync errors for resources that failed to download', async () => {
		const createAttachmentDownloadError = async () => {
			await switchClient(2);

			const note1 = await Note.save({ title: 'note' });
			await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
			await synchronizerStart();

			await switchClient(1);

			const previousMax = synchronizer().maxResourceSize_;
			synchronizer().maxResourceSize_ = 1;
			await synchronizerStart();
			synchronizer().maxResourceSize_ = previousMax;
		};
		await createAttachmentDownloadError();

		const service = new ReportService();
		let report = await service.status(syncTargetId());

		const unsyncableSection = getCannotSyncSection(report);
		expect(unsyncableSection).not.toBeNull();
		expect(sectionBodyToText(unsyncableSection)).toContain('could not be downloaded');

		// Item for the download error should be ignorable
		const ignorableItems = [];
		for (const item of unsyncableSection.body) {
			if (typeof item === 'object' && item.canIgnore) {
				ignorableItems.push(item);
			}
		}
		expect(ignorableItems).toHaveLength(1);

		await ignorableItems[0].ignoreHandler();

		// Should now be ignored.
		report = await service.status(syncTargetId());
		const ignoredItem = getIgnoredSection(report).body.find(item => typeof item === 'object' && item.canRetry === true);
		expect(ignoredItem).not.toBeFalsy();

		// Type narrowing
		if (typeof ignoredItem === 'string') throw new Error('should be an object');

		// Should be possible to retry
		await ignoredItem.retryHandler();
		await synchronizerStart();

		// Should be fixed after retrying
		report = await service.status(syncTargetId());
		expect(getIgnoredSection(report)).toBeNull();
		expect(getCannotSyncSection(report)).toBeNull();
	});

	it('should associate decryption failures with error message headers when errors are known', async () => {
		await setUpLocalAndRemoteEncryption();

		const service = new ReportService();
		const syncTargetId = SyncTargetRegistry.nameToId('joplinServer');
		let report = await service.status(syncTargetId);

		// Initially, should not have a "cannot be decrypted section"
		expect(getDecryptionErrorSection(report)).toBeNull();

		const corruptedNoteIds = await addCannotDecryptNotes(4);
		await addRemoteNotes(10);
		await synchronizerStart();

		for (let i = 0; i < 3; i++) {
			report = await service.status(syncTargetId);
			expect(getDecryptionErrorSection(report)).toBeNull();

			// .start needs to be run multiple times for items to be disabled and thus
			// added to the report
			await decryptionWorker().start();
		}

		// After adding corrupted notes, it should have such a section.
		report = await service.status(syncTargetId);
		const decryptionErrorsSection = getDecryptionErrorSection(report);
		expect(decryptionErrorsSection).not.toBeNull();

		// There should be a list of errors (all errors are known)
		const errorLists = getListItemsInBodyStartingWith(decryptionErrorsSection, 'itemsWithError');
		expect(errorLists).toHaveLength(1);

		// There should, however, be testIds.length ReportItems with the IDs of the notes.
		const decryptionErrorsText = sectionBodyToText(decryptionErrorsSection);
		for (const noteId of corruptedNoteIds) {
			expect(decryptionErrorsText).toContain(noteId);
		}
	});

	it('should not associate decryption failures with error message headers when errors are unknown', async () => {
		const decryption = decryptionWorker();

		// Create decryption errors:
		const testIds = ['0123456789012345601234567890123456', '0123456789012345601234567890123457', '0123456789012345601234567890123458'];

		// Adds items to the decryption error list **without also adding the reason**. This matches
		// the format of older decryption errors.
		const addIdsToDecryptionErrorList = async (worker: DecryptionWorker, ids: string[]) => {
			for (const id of ids) {
				// A value that is more than the maximum number of attempts:
				const numDecryptionAttempts = 3;

				// Add the failure manually so that the error message is unknown
				await worker.kvStore().setValue(
					`decrypt:${ModelType.Note}:${id}`, numDecryptionAttempts,
				);
			}
		};

		await addIdsToDecryptionErrorList(decryption, testIds);

		const service = new ReportService();
		const syncTargetId = SyncTargetRegistry.nameToId('joplinServer');
		const report = await service.status(syncTargetId);

		// Report should have an "Items that cannot be decrypted" section
		const decryptionErrorSection = getDecryptionErrorSection(report);
		expect(decryptionErrorSection).not.toBeNull();

		// There should not be any lists of errors (no errors associated with the item).
		const errorLists = getListItemsInBodyStartingWith(decryptionErrorSection, 'itemsWithError');
		expect(errorLists).toHaveLength(0);

		// There should be items with the correct messages:
		const expectedMessages = testIds.map(id => `Note: ${id}`);
		const bodyText = sectionBodyToText(decryptionErrorSection);
		for (const message of expectedMessages) {
			expect(bodyText).toContain(message);
		}
	});
});
