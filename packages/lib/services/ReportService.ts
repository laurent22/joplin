import time from '../time';
import BaseItem from '../models/BaseItem';
import Alarm from '../models/Alarm';
import Folder from '../models/Folder';
import Note from '../models/Note';
import BaseModel from '../BaseModel';
import DecryptionWorker from './DecryptionWorker';
import ResourceFetcher from './ResourceFetcher';
import Resource from '../models/Resource';
import { _ } from '../locale';
const { toTitleCase } = require('../string-utils.js');

enum CanRetryType {
	E2EE = 'e2ee',
	ResourceDownload = 'resourceDownload',
	ItemSync = 'itemSync',
}

enum ReportItemType {
	OpenList = 'openList',
	CloseList = 'closeList',
}

type RerportItemOrString = ReportItem | string;

interface ReportSection {
	title: string;
	body: RerportItemOrString[];
	name?: string;
	canRetryAll?: boolean;
	retryAllHandler?: ()=> void;
}

interface ReportItem {
	type?: ReportItemType;
	key?: string;
	text?: string;
	canRetry?: boolean;
	canRetryType?: CanRetryType;
	retryHandler?: ()=> void;
}

export default class ReportService {
	public csvEscapeCell(cell: string) {
		cell = this.csvValueToString(cell);
		const output = cell.replace(/"/, '""');
		if (this.csvCellRequiresQuotes(cell, ',')) {
			return `"${output}"`;
		}
		return output;
	}

	public csvCellRequiresQuotes(cell: string, delimiter: string) {
		if (cell.indexOf('\n') >= 0) return true;
		if (cell.indexOf('"') >= 0) return true;
		if (cell.indexOf(delimiter) >= 0) return true;
		return false;
	}

	public csvValueToString(v: string) {
		if (v === undefined || v === null) return '';
		return v.toString();
	}

	public csvCreateLine(row: string[]) {
		for (let i = 0; i < row.length; i++) {
			row[i] = this.csvEscapeCell(row[i]);
		}
		return row.join(',');
	}

	public csvCreate(rows: any[]) {
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(this.csvCreateLine(rows[i]));
		}
		return output.join('\n');
	}

	public async basicItemList(option: any = null) {
		if (!option) option = {};
		if (!option.format) option.format = 'array';

		const itemTypes = BaseItem.syncItemTypes();
		const output = [];
		output.push(['type', 'id', 'updated_time', 'sync_time', 'is_conflict']);
		for (let i = 0; i < itemTypes.length; i++) {
			const itemType = itemTypes[i];
			const ItemClass = BaseItem.getClassByItemType(itemType);
			const items = await ItemClass.modelSelectAll(`SELECT items.id, items.updated_time, sync_items.sync_time FROM ${ItemClass.tableName()} items JOIN sync_items ON sync_items.item_id = items.id`);

			for (let j = 0; j < items.length; j++) {
				const item = items[j];
				const row = [itemType, item.id, item.updated_time, item.sync_time];
				row.push('is_conflict' in item ? item.is_conflict : '');
				output.push(row);
			}
		}

		return option.format === 'csv' ? this.csvCreate(output) : output;
	}

	public async syncStatus(syncTarget: number) {
		const output: any = {
			items: {},
			total: {},
		};

		let itemCount = 0;
		let syncedCount = 0;
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			const d = BaseItem.syncItemDefinitions_[i];
			// ref: https://github.com/laurent22/joplin/issues/7940#issuecomment-1473709148
			if (d.className === 'MasterKey') continue;
			const ItemClass = BaseItem.getClass(d.className);
			const o = {
				total: await ItemClass.count(),
				synced: await ItemClass.syncedCount(syncTarget),
			};
			output.items[d.className] = o;
			itemCount += o.total;
			syncedCount += o.synced;
		}

		const conflictedCount = await Note.conflictedCount();

		output.total = {
			total: itemCount - conflictedCount,
			synced: syncedCount,
		};

		output.toDelete = {
			total: await BaseItem.deletedItemCount(syncTarget),
		};

		output.conflicted = {
			total: await Note.conflictedCount(),
		};

		output.items['Note'].total -= output.conflicted.total;

		return output;
	}

	private addRetryAllHandler(section: ReportSection): ReportSection {
		const retryHandlers: Function[] = [];

		for (let i = 0; i < section.body.length; i++) {
			const item: RerportItemOrString = section.body[i];
			if (typeof item !== 'string' && item.canRetry) {
				retryHandlers.push(item.retryHandler);
			}
		}

		if (retryHandlers.length) {
			section.canRetryAll = true;
			section.retryAllHandler = async () => {
				for (const retryHandler of retryHandlers) {
					await retryHandler();
				}
			};
		}

		return section;
	}

	public async status(syncTarget: number): Promise<ReportSection[]> {
		const r = await this.syncStatus(syncTarget);
		const sections: ReportSection[] = [];
		let section: ReportSection = null;

		const disabledItems = await BaseItem.syncDisabledItems(syncTarget);

		if (disabledItems.length) {
			section = { title: _('Items that cannot be synchronised'), body: [] };

			section.body.push(_('These items will remain on the device but will not be uploaded to the sync target. In order to find these items, either search for the title or the ID (which is displayed in brackets above).'));

			section.body.push({ type: ReportItemType.OpenList, key: 'disabledSyncItems' });

			for (let i = 0; i < disabledItems.length; i++) {
				const row = disabledItems[i];
				let msg = '';
				if (row.location === BaseItem.SYNC_ITEM_LOCATION_LOCAL) {
					msg = _('%s (%s) could not be uploaded: %s', row.item.title, row.item.id, row.syncInfo.sync_disabled_reason);
				} else {
					msg = _('Item "%s" could not be downloaded: %s', row.syncInfo.item_id, row.syncInfo.sync_disabled_reason);
				}

				section.body.push({
					text: msg,
					canRetry: true,
					canRetryType: CanRetryType.ItemSync,
					retryHandler: async () => {
						await BaseItem.saveSyncEnabled(row.item.type_, row.item.id);
					},
				});
			}

			section.body.push({ type: ReportItemType.CloseList });

			section = this.addRetryAllHandler(section);

			sections.push(section);
		}

		const decryptionDisabledItems = await DecryptionWorker.instance().decryptionDisabledItems();

		if (decryptionDisabledItems.length) {
			section = { title: _('Items that cannot be decrypted'), body: [], name: 'failedDecryption', canRetryAll: false, retryAllHandler: null };

			section.body.push(_('Joplin failed to decrypt these items multiple times, possibly because they are corrupted or too large. These items will remain on the device but Joplin will no longer attempt to decrypt them.'));
			section.body.push('');

			for (let i = 0; i < decryptionDisabledItems.length; i++) {
				const row = decryptionDisabledItems[i];

				let itemError = DecryptionWorker.instance().getDecryptionError(row.id);
				if (!itemError) {
					itemError = _('Click "retry" for more information');
				}

				section.body.push({
					text: _('%s: %s (%s)', toTitleCase(BaseModel.modelTypeToName(row.type_)), row.id, itemError),
					canRetry: true,
					canRetryType: CanRetryType.E2EE,
					retryHandler: async () => {
						await DecryptionWorker.instance().clearDisabledItem(row.type_, row.id);
						void DecryptionWorker.instance().scheduleStart();
					},
				});
			}

			section = this.addRetryAllHandler(section);

			sections.push(section);
		}

		{
			section = { title: _('Attachments'), body: [], name: 'resources' };

			const statuses = [Resource.FETCH_STATUS_IDLE, Resource.FETCH_STATUS_STARTED, Resource.FETCH_STATUS_DONE, Resource.FETCH_STATUS_ERROR];

			for (const status of statuses) {
				if (status === Resource.FETCH_STATUS_DONE) {
					const downloadedButEncryptedBlobCount = await Resource.downloadedButEncryptedBlobCount();
					const downloadedCount = await Resource.downloadStatusCounts(Resource.FETCH_STATUS_DONE);
					const createdLocallyCount = await Resource.createdLocallyCount();
					section.body.push(_('%s: %d', _('Downloaded and decrypted'), downloadedCount - downloadedButEncryptedBlobCount));
					section.body.push(_('%s: %d', _('Downloaded and encrypted'), downloadedButEncryptedBlobCount));
					section.body.push(_('%s: %d', _('Created locally'), createdLocallyCount));
				} else {
					const count = await Resource.downloadStatusCounts(status);
					section.body.push(_('%s: %d', Resource.fetchStatusToLabel(status), count));
				}
			}

			sections.push(section);
		}

		const resourceErrorFetchStatuses = await Resource.errorFetchStatuses();

		if (resourceErrorFetchStatuses.length) {
			section = { title: _('Attachments that could not be downloaded'), body: [], name: 'failedResourceDownload' };

			for (let i = 0; i < resourceErrorFetchStatuses.length; i++) {
				const row = resourceErrorFetchStatuses[i];
				section.body.push({
					text: _('%s (%s): %s', row.resource_title, row.resource_id, row.fetch_error),
					canRetry: true,
					canRetryType: CanRetryType.ResourceDownload,
					retryHandler: async () => {
						await Resource.resetErrorStatus(row.resource_id);
						void ResourceFetcher.instance().autoAddResources();
					},
				});
			}

			sections.push(section);
		}

		section = { title: _('Sync status (synced items / total items)'), body: [] };

		for (const n in r.items) {
			if (!r.items.hasOwnProperty(n)) continue;
			section.body.push(_('%s: %d/%d', n, r.items[n].synced, r.items[n].total));
		}

		section.body.push(_('Total: %d/%d', r.total.synced, r.total.total));
		section.body.push('');
		section.body.push(_('Conflicted: %d', r.conflicted.total));
		section.body.push(_('To delete: %d', r.toDelete.total));

		sections.push(section);

		section = { title: _('Folders'), body: [] };

		const folders = await Folder.all({
			order: { by: 'title', dir: 'ASC' },
			caseInsensitive: true,
		});

		for (let i = 0; i < folders.length; i++) {
			section.body.push(_('%s: %d notes', folders[i].title, await Folder.noteCount(folders[i].id)));
		}

		sections.push(section);

		const alarms = await Alarm.allDue();

		if (alarms.length) {
			section = { title: _('Coming alarms'), body: [] };

			for (let i = 0; i < alarms.length; i++) {
				const alarm = alarms[i];
				const note = await Note.load(alarm.note_id);
				section.body.push(_('On %s: %s', time.formatMsToLocal(alarm.trigger_time), note.title));
			}

			sections.push(section);
		}

		return sections;
	}
}
