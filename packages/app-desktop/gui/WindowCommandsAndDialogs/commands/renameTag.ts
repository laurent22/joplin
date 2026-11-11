import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Tag from '@joplin/lib/models/Tag';
import bridge from '../../../services/bridge';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'renameTag',
	label: () => _('Rename'),
};

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext, tagId: string = null) => {
			tagId = tagId || context.state.selectedTagId;
			if (!tagId) return;

			const tag = await Tag.load(tagId);
			if (tag) {
				comp.setState({
					promptOptions: {
						label: _('Rename tag:'),
						value: tag.title,
						onClose: async (answer: unknown) => {
							if (answer !== null) {
								try {
									tag.title = answer as string;
									await Tag.save(tag, { fields: ['title'], userSideValidation: true });
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
