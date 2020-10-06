import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
import { _ } from 'lib/locale';
const Tag = require('lib/models/Tag');
const bridge = require('electron').remote.require('./bridge').default;

export const declaration:CommandDeclaration = {
	name: 'renameTag',
	label: () => _('Rename'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ tagId }:any) => {
			const tag = await Tag.load(tagId);
			if (tag) {
				comp.setState({
					promptOptions: {
						label: _('Rename tag:'),
						value: tag.title,
						onClose: async (answer:string) => {
							if (answer !== null) {
								try {
									tag.title = answer;
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
