import { ModelType } from '../BaseModel';
import SyncTargetRegistry from '../SyncTargetRegistry';
import { _ } from '../locale';
import ReportService, { ReportSection } from './ReportService';
import { decryptionWorker, encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '../testing/test-utils';
import DecryptionWorker from './DecryptionWorker';
import Note from '../models/Note';
import { loadMasterKeysFromSettings, setupAndEnableEncryption } from './e2ee/utils';
import Setting from '../models/Setting';


// Adds corruptedNoteCount corrupted notes to client 2 and returns the IDs
// The uncorrupted notes are added to client 1.
const addCorruptedNotes = async (corruptedNoteCount: number) => {
	await switchClient(1);

	const notes = [];
	for (let i = 0; i < corruptedNoteCount; i++) {
		notes.push(await Note.save({ title: `Note ${i}` }));
	}

	await synchronizerStart();

	await switchClient(2);

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

const addUncorruptedNotes = async (noteCount: number) => {
	await switchClient(1);

	const notes = [];
	for (let i = 0; i < noteCount; i++) {
		notes.push(await Note.save({ title: `Test Note ${i}` }));
	}

	await synchronizerStart();
	await switchClient(2);

	return notes.map(note => note.id);
};

// Disables decryption for all items with the given IDs for the given worker
const addIdsToUndecryptableList = async (worker: DecryptionWorker, ids: string[]) => {
	for (const id of ids) {
		// A value that is more than the maximum number of attempts:
		const numDecryptionAttempts = 3;

		// Add the failure manually so that the error message is unknown
		await worker.kvStore().setValue(
			`decrypt:${ModelType.Note}:${id}`, numDecryptionAttempts
		);
	}
};

const getSectionsWithTitle = (report: ReportSection[], title: string) => {
	return report.filter(section => section.title === title);
};

const getDecyptionErrorSection = (report: ReportSection[]): ReportSection|null => {
	const relevantSections = getSectionsWithTitle(report, _('Items that cannot be decrypted'));
	return relevantSections.length === 1 ? relevantSections[0] : null;
};

const getListItemsInBodyStartingWith = (section: ReportSection, keyPrefix: string) => {
	return section.body.filter(item =>
		typeof item !== 'string' && item.type === 'openList' && item.key.startsWith(keyPrefix)
	);
};

const sectionBodyToContainsAllItemsOf = (section: ReportSection, searchText: string[]) => {
	const asText = section.body.map(item => {
		if (typeof item === 'string') {
			return item;
		}

		return item.text;
	}).join('\n');

	for (const testText of searchText) {
		if (asText.indexOf(testText) === -1) {
			return false;
		}
	}
	return true;
};

describe('ReportService', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);

		const masterKey = await loadEncryptionMasterKey();
		await setupAndEnableEncryption(encryptionService(), masterKey, '123456');
		await synchronizerStart();

		// Give both clients the same master key
		await switchClient(2);
		await synchronizerStart();

		Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
		await loadMasterKeysFromSettings(encryptionService());

		// For compatability with code that calls DecryptionWorker.instance()
		DecryptionWorker.instance_ = decryptionWorker();
	});

	it('should not associate decryption failures with error message headers when errors are unknown', async () => {
		const decryption = decryptionWorker();

		// Create decryption errors:
		const testIds = ['somenoteidhere1', 'anotherid', 'notarealid'];

		await addIdsToUndecryptableList(decryption, testIds);

		const service = new ReportService();
		const syncTargetId = SyncTargetRegistry.nameToId('joplinServer');
		const report = await service.status(syncTargetId);

		// Report should have an "Items that cannot be decrypted" section
		const undecryptableInfoSections = getSectionsWithTitle(report, _('Items that cannot be decrypted'));
		expect(undecryptableInfoSections).toHaveLength(1);

		const undecryptableInfoSection = undecryptableInfoSections[0];

		// There should not be any lists of errors (no errors associated with the item).
		const errorLists = getListItemsInBodyStartingWith(undecryptableInfoSection, 'itemsWithError');
		expect(errorLists).toHaveLength(0);

		// There should, however, be testIds.length ReportItems with the correct messages:
		const expectedMessages = testIds.map(id => `Note: ${id}`);
		expect(sectionBodyToContainsAllItemsOf(undecryptableInfoSection, expectedMessages)).toBe(true);
	});

	it('should associate decryption failures with error message headers when errors are known', async () => {
		const service = new ReportService();
		const syncTargetId = SyncTargetRegistry.nameToId('joplinServer');
		let report = await service.status(syncTargetId);

		// Initially, should not have a "cannot be decrypted section"
		expect(getDecyptionErrorSection(report)).toBeNull();

		const corruptedNoteIds = await addCorruptedNotes(4);
		await addUncorruptedNotes(10);

		for (let i = 0; i < 2; i++) {
			report = await service.status(syncTargetId);
			expect(getDecyptionErrorSection(report)).toBeNull();

			// .start needs to be run multiple times for items to be disabled and thus
			// added to the report
			await decryptionWorker().start();
		}

		// After adding corrupted notes, it should have such a section.
		report = await service.status(syncTargetId);
		const undecryptableInfoSection = getDecyptionErrorSection(report);
		expect(undecryptableInfoSection).not.toBeNull();

		// There should be a list of errors (all errors are known)
		const errorLists = getListItemsInBodyStartingWith(undecryptableInfoSection, 'itemsWithError');
		expect(errorLists).toHaveLength(1);

		// There should, however, be testIds.length ReportItems with the IDs of the notes.
		expect(sectionBodyToContainsAllItemsOf(undecryptableInfoSection, corruptedNoteIds)).toBe(true);
	});
});
