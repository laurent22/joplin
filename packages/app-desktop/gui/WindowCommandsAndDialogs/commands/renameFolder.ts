import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import bridge from '../../../services/bridge';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'renameFolder',
	label: () => _('Rename'),
};

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string = null) => {
			folderId = folderId || context.state.selectedFolderId;

			const folder = await Folder.load(folderId);

			if (folder) {
				comp.setState({
					promptOptions: {
						label: _('Rename notebook:'),
						value: folder.title,
						onClose: async (answer: unknown) => {
							if (answer !== null) {
								try {
									folder.title = answer as string;
									await Folder.save(folder, { fields: ['title'], userSideValidation: true });
								} catch (error) {
									bridge().showErrorMessageBox(error.message);
								}
							}
							comp.setState({ promptOptions: null });
						},
					},
				});
			}
		},
	};
};
