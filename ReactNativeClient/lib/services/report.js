const { time } = require('lib/time-utils');
const { BaseItem } = require('lib/models/base-item.js');
const { Folder } = require('lib/models/folder.js');
const { Note } = require('lib/models/note.js');
const { _ } = require('lib/locale.js');

class ReportService {

	async syncStatus(syncTarget) {
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
				synced: await ItemClass.syncedCount(syncTarget),
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
			total: await BaseItem.deletedItemCount(syncTarget),
		};

		output.conflicted = {
			total: await Note.conflictedCount(),
		};

		output.items['Note'].total -= output.conflicted.total;

		return output;
	}

	async status(syncTarget) {
		let r = await this.syncStatus(syncTarget);
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
			order: { by: 'title', dir: 'ASC' },
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

module.exports = { ReportService };