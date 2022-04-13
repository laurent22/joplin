/* eslint-disable import/prefer-default-export */

const { splitCommandString } = require('../../string-utils');
import { spawn } from 'child_process';
import Logger from '../../Logger';
import Setting from '../../models/Setting';
import { fileExtension } from '../../path-utils';
import shim from '../../shim';

const logger = Logger.create('ExternalEditWatcher/utils');

const spawnCommand = async (path: string, args: string[], options: any) => {
	return new Promise((resolve, reject) => {
		// App bundles need to be opened using the `open` command.
		// Additional args can be specified after --args, and the
		// -n flag is needed to ensure that the app is always launched
		// with the arguments. Without it, if the app is already opened,
		// it will just bring it to the foreground without opening the file.
		// So the full command is:
		//
		// open -n /path/to/editor.app --args -app-flag -bla /path/to/file.md
		//
		if (shim.isMac() && fileExtension(path) === 'app') {
			args = args.slice();
			args.splice(0, 0, '--args');
			args.splice(0, 0, path);
			args.splice(0, 0, '-n');
			path = 'open';
		}

		const wrapError = (error: any) => {
			if (!error) return error;
			const msg = error.message ? [error.message] : [];
			msg.push(`Command was: "${path}" ${args.join(' ')}`);
			error.message = msg.join('\n\n');
			return error;
		};

		try {
			const subProcess = spawn(path, args, options);

			const iid = shim.setInterval(() => {
				if (subProcess && subProcess.pid) {
					logger.debug(`Started editor with PID ${subProcess.pid}`);
					shim.clearInterval(iid);
					resolve(null);
				}
			}, 100);

			subProcess.on('error', (error: any) => {
				shim.clearInterval(iid);
				reject(wrapError(error));
			});
		} catch (error) {
			throw wrapError(error);
		}
	});
};

const textEditorCommand = () => {
	const editorCommand = Setting.value('editor');
	if (!editorCommand) return null;

	const s = splitCommandString(editorCommand, { handleEscape: false });
	const path = s.splice(0, 1);
	if (!path.length) throw new Error(`Invalid editor command: ${editorCommand}`);

	return {
		path: path[0],
		args: s,
	};
};

export const openFileWithExternalEditor = async (filePath: string, bridge: any) => {
	const cmd = textEditorCommand();
	if (!cmd) {
		bridge.openExternal(`file://${filePath}`);
	} else {
		cmd.args.push(filePath);
		await spawnCommand(cmd.path, cmd.args, { detached: true });
	}
};
