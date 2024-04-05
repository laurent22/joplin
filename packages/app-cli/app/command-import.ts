import BaseCommand from './base-command';
import InteropService from '@joplin/lib/services/interop/InteropService';
import BaseModel from '@joplin/lib/BaseModel';
const { cliUtils } = require('./cli-utils.js');
import app from './app';
import { _ } from '@joplin/lib/locale';
import { ImportOptions } from '@joplin/lib/services/interop/types';
import { unique } from '@joplin/lib/array';

class Command extends BaseCommand {
	public override usage() {
		return 'import <path> [notebook]';
	}

	public override description() {
		return _('Imports data into Joplin.');
	}

	public override options() {
		const service = InteropService.instance();
		const formats = service
			.modules()
			.filter(m => m.type === 'importer')
			.map(m => m.format);

		return [
			['--format <format>', _('Source format: %s', ['auto'].concat(unique(formats)).join(', '))],
			['-f, --force', _('Do not ask for confirmation.')],
			['--output-format <output-format>', _('Output format: %s', 'md, html')],
		];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, args.notebook);

		if (args.notebook && !folder) throw new Error(_('Cannot find "%s".', args.notebook));

		const importOptions: ImportOptions = {};
		importOptions.path = args.path;
		importOptions.format = args.options.format ? args.options.format : 'auto';
		importOptions.destinationFolderId = folder ? folder.id : null;

		let lastProgress = '';

		// onProgress/onError supported by Enex import only

		importOptions.onProgress = progressState => {
			const line = [];
			line.push(_('Found: %d.', progressState.loaded));
			line.push(_('Created: %d.', progressState.created));
			if (progressState.updated) line.push(_('Updated: %d.', progressState.updated));
			if (progressState.skipped) line.push(_('Skipped: %d.', progressState.skipped));
			if (progressState.resourcesCreated) line.push(_('Resources: %d.', progressState.resourcesCreated));
			if (progressState.notesTagged) line.push(_('Tagged: %d.', progressState.notesTagged));
			lastProgress = line.join(' ');
			cliUtils.redraw(lastProgress);
		};

		importOptions.onError = error => {
			const s = error.stack ? error.stack : error.toString();
			this.stdout(s);
		};

		if (args.options.outputFormat) importOptions.outputFormat = args.options.outputFormat;

		app().gui().showConsole();
		this.stdout(_('Importing notes...'));
		const service = InteropService.instance();
		const result = await service.import(importOptions);
		result.warnings.map(w => this.stdout(w));
		cliUtils.redrawDone();
		if (lastProgress) this.stdout(_('The notes have been imported: %s', lastProgress));
	}
}

module.exports = Command;
