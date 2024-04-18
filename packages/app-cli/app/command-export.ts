import BaseCommand from './base-command';
import InteropService from '@joplin/lib/services/interop/InteropService';
import BaseModel from '@joplin/lib/BaseModel';
import app from './app';
import { _ } from '@joplin/lib/locale';
import { ExportOptions } from '@joplin/lib/services/interop/types';

class Command extends BaseCommand {
	public override usage() {
		return 'export <path>';
	}

	public override description() {
		return _('Exports Joplin data to the given path. By default, it will export the complete database including notebooks, notes, tags and resources.');
	}

	public override options() {
		const service = InteropService.instance();
		const formats = service
			.modules()
			.filter(m => m.type === 'exporter' && m.format !== 'html')
			.map(m => m.format + (m.description ? ` (${m.description})` : ''));

		return [['--format <format>', _('Destination format: %s', formats.join(', '))], ['--note <note>', _('Exports only the given note.')], ['--notebook <notebook>', _('Exports only the given notebook.')]];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const exportOptions: ExportOptions = {};
		exportOptions.path = args.path;

		exportOptions.format = args.options.format ? args.options.format : 'jex';

		if (exportOptions.format === 'html') throw new Error('HTML export is not supported. Please use the desktop application.');

		if (args.options.note) {
			const notes = await app().loadItems(BaseModel.TYPE_NOTE, args.options.note, { parent: app().currentFolder() });
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.options.note));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			exportOptions.sourceNoteIds = notes.map((n: any) => n.id);
		} else if (args.options.notebook) {
			const folders = await app().loadItems(BaseModel.TYPE_FOLDER, args.options.notebook);
			if (!folders.length) throw new Error(_('Cannot find "%s".', args.options.notebook));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			exportOptions.sourceFolderIds = folders.map((n: any) => n.id);
		}

		const service = InteropService.instance();
		const result = await service.export(exportOptions);

		result.warnings.map(w => this.stdout(w));
	}
}

module.exports = Command;
