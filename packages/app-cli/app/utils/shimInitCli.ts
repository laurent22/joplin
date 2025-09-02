import shim, { ShowMessageBoxOptions } from '@joplin/lib/shim';
import type { ShimInitOptions } from '@joplin/lib/shim-init-node';
import app from '../app';
import { _ } from '@joplin/lib/locale';
const { shimInit } = require('@joplin/lib/shim-init-node.js');

const shimInitCli = (options: ShimInitOptions) => {
	shimInit(options);

	shim.showMessageBox = async (message: string, options: ShowMessageBoxOptions) => {
		const gui = app()?.gui();
		let answers = options.buttons ?? [_('OK'), _('Cancel')];

		if (options.type === 'error' || options.type === 'info') {
			answers = [];
		}

		message += answers.length ? `(${answers.join(', ')})` : '';

		const answer = await gui.prompt(options.title ?? '', `${message} `, { answers });

		if (answers.includes(answer)) {
			return answers.indexOf(answer);
		} else if (answer) {
			return answers.findIndex(a => a.startsWith(answer));
		}

		return -1;
	};
};

export default shimInitCli;
