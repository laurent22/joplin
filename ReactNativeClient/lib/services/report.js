import { time } from 'lib/time-utils'
import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { _ } from 'lib/locale.js';

class ReportService {

	async syncStatus() {
		let output = {
			items: {},
			total: {},
		};

		let itemCount = 0;
		let syncedCount = 0;
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			let d = BaseItem.syncItemDefinitions_[i];
			let ItemClass = BaseItem.getClass(d.className);
			let o = {
				total: await ItemClass.count(),
				// synced: await ItemClass.syncedCount(), // TODO
				synced: 0,
			};
			output.items[d.className] = o;
			itemCount += o.total;
			syncedCount += o.synced;
		}

		let conflictedCount = await Note.conflictedCount();

		output.total = {
			total: itemCount - conflictedCount,
			synced: syncedCount,
		};

		output.toDelete = {
			total: await BaseItem.deletedItemCount(),
		};

		output.conflicted = {
			total: await Note.conflictedCount(),
		};

		output.items['Note'].total -= output.conflicted.total;

		return output;
	}

	async status() {
		let r = await this.syncStatus();
		let sections = [];
		let section = {};

		section.title = _('Sync status (synced items / total items)');
		section.body = [];

		for (let n in r.items) {
			if (!r.items.hasOwnProperty(n)) continue;
			section.body.push(_('%s: %d/%d', n, r.items[n].synced, r.items[n].total));
		}

		section.body.push(_('Total: %d/%d', r.total.synced, r.total.total));
		section.body.push('');
		section.body.push(_('Conflicted: %d', r.conflicted.total));
		section.body.push(_('To delete: %d', r.toDelete.total));

		sections.push(section);

		section = {};
		section.title = _('Folders');
		section.body = [];

		let folders = await Folder.all({
			orderBy: 'title',
			caseInsensitive: true,
		});

		for (let i = 0; i < folders.length; i++) {
			let folder = folders[i];
			section.body.push(_('%s: %d notes', folders[i].title, await Folder.noteCount(folders[i].id)));
		}

		sections.push(section);

		return sections;
	}

}

export { ReportService }