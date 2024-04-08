import SyncTargetRegistry from '../SyncTargetRegistry';
import { _ } from '../locale';
import ReportService, { ReportSection } from './ReportService';
import { createNTestNotes, decryptionWorker, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '../testing/test-utils';
import Folder from '../models/Folder';
import BaseItem from '../models/BaseItem';
import DecryptionWorker from './DecryptionWorker';


const getSectionsWithTitle = (report: ReportSection[], title: string) => {
	return report.filter(section => section.title === title);
};

const getCannotSyncSection = (report: ReportSection[]) => {
	return getSectionsWithTitle(report, _('Items that cannot be synchronised'))[0];
};

const getIgnoredSection = (report: ReportSection[]) => {
	return getSectionsWithTitle(report, _('Ignored items that cannot be synchronised'))[0];
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
		await switchClient(1);
		await synchronizerStart();
		// For compatibility with code that calls DecryptionWorker.instance()
		DecryptionWorker.instance_ = decryptionWorker();
	});

	it('should move sync errors to the "ignored" section after clicking "ignore"', async () => {
		const folder = await Folder.save({ title: 'Test' });
		const noteCount = 5;
		const testNotes = await createNTestNotes(noteCount, folder);
		await synchronizerStart();
		const syncTargetId = SyncTargetRegistry.nameToId('memory');

		const disabledReason = 'Test reason';
		for (const testNote of testNotes) {
			await BaseItem.saveSyncDisabled(syncTargetId, testNote, disabledReason);
		}

		const service = new ReportService();
		let report = await service.status(syncTargetId);

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
		expect(await BaseItem.syncDisabledItemsCount(syncTargetId)).toBe(noteCount);
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId)).toBe(noteCount);
		for (const item of ignorableItems) {
			await item.ignoreHandler();
		}
		expect(await BaseItem.syncDisabledItemsCount(syncTargetId)).toBe(0);
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId)).toBe(noteCount);

		await synchronizerStart();
		report = await service.status(syncTargetId);

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
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId)).toBe(ignoredItemCount);
		expect(ignoredItemCount).toBe(noteCount);

		// Clicking "retry" should un-ignore
		for (const item of ignoredSection.body) {
			if (typeof item === 'object' && item.text?.includes(disabledReason)) {
				expect(item.canRetry).toBe(true);
				await item.retryHandler();
				break;
			}
		}
		expect(await BaseItem.syncDisabledItemsCountIncludingIgnored(syncTargetId)).toBe(noteCount - 1);
	});
});
