import execCommand from './execCommand';
import commandToString from './commandToString';
import splitCommandString from './splitCommandString';
import { dirname } from 'path';
import { pathExists } from 'fs-extra';

let rootDir_ = '';

const getRootDir = async () => {
	if (rootDir_) return rootDir_;

	let p = dirname(dirname(dirname(__dirname)));
	for (let i = 0; i < 9999; i++) {
		if (await pathExists(`${p}/.eslintrc.js`)) {
			rootDir_ = p;
			return rootDir_;
		}
		p = dirname(p);
	}
	throw new Error('Could not find root dir');
};

export {
	execCommand,
	commandToString,
	splitCommandString,
	getRootDir,
};
