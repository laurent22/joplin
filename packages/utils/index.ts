import execCommand from './execCommand';
import commandToString from './commandToString';
import splitCommandString from './splitCommandString';
import { dirname } from 'path';

const rootDir = dirname(dirname(dirname(__dirname)));

export {
	execCommand,
	commandToString,
	splitCommandString,
	rootDir,
};
