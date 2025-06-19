import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import InteropServiceHelper from '../../../InteropServiceHelper';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../services/bridge';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'exportHtmlAsPdf',
	label: () => `PDF - ${_('Export HTML as PDF')}`,
};

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, htmlPath: string) => {
			try {
				let path = await bridge().showSaveDialog({
					filters: [{ name: _('PDF File'), extensions: ['pdf'] }],
					defaultPath: await InteropServiceHelper.defaultFilename('output', 'pdf'),
				});

				if (Array.isArray(path)) {
					if (path.length > 1) {
						throw new Error('Only one output directory can be selected');
					}

					path = path[0];
				}

				if (!path) return;

				const pdfPath = await shim.fsDriver().findUniqueFilename(path);

				await comp.printTo('pdf', { path: pdfPath, htmlPath });
			} catch (error) {
				console.error(error);
				bridge().showErrorMessageBox(error.message);
			}
		},

		enabledCondition: 'someNotesSelected',
	};
};
