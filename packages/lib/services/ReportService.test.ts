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

		const ignoreReason = 'Test reason';
		for (const testNote of testNotes) {
			await BaseItem.saveSyncDisabled(syncTargetId, testNote, ignoreReason);
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
		expect(sectionBodyToText(unsyncableSection)).toContain(ignoreReason);

		// Ignore all
		for (const item of ignorableItems) {
			await item.ignoreHandler();
		}

		await synchronizerStart();
		report = await service.status(syncTargetId);

		// Should now be in the ignored section
		const ignoredSection = getIgnoredSection(report);
		expect(ignoredSection).toBeTruthy();
		expect(sectionBodyToText(unsyncableSection)).toContain(ignoreReason);
		expect(sectionBodyToText(getCannotSyncSection(report))).not.toContain(ignoreReason);

		// Should not be possible to re-ignore an item in the ignored section
		let ignoredItemCount = 0;
		for (const item of ignoredSection.body) {
			if (typeof item === 'object' && item.text?.includes(ignoreReason)) {
				expect(item.canIgnore).toBeFalsy();
				expect(item.canRetry).toBe(true);
				ignoredItemCount++;
			}
		}
		expect(ignoredItemCount).toBe(noteCount);
	});
});
