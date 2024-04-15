import { _ } from '../locale';
import ReportService, { ReportSection } from './ReportService';
import { createNTestNotes, decryptionWorker, setupDatabaseAndSynchronizer, supportDir, switchClient, syncTargetId, synchronizer, synchronizerStart } from '../testing/test-utils';
import Folder from '../models/Folder';
import BaseItem from '../models/BaseItem';
import DecryptionWorker from './DecryptionWorker';
import Note from '../models/Note';
import shim from '../shim';


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

const sectionBodyToText = (section: ReportSection) => {
	return section.body.map(item => {
		if (typeof item === 'string') {
			return item;
		}

		return item.text;
	}).join('\n');
};

describe('ReportService', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		// For compatibility with code that calls DecryptionWorker.instance()
		DecryptionWorker.instance_ = decryptionWorker();
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
});
