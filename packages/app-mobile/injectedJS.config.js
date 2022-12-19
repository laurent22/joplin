// Configuration file for rollup

const { dirname } = require('path');
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';


const rootDir = dirname(dirname(dirname(__dirname)));
const mobileDir = `${rootDir}/packages/app-mobile`;
const codeMirrorDir = `${mobileDir}/components/NoteEditor/CodeMirror`;
const outputFile = `${codeMirrorDir}/CodeMirror.bundle.js`;

export default {
	output: outputFile,
	plugins: [
		typescript({
			// Exclude all .js files. Rollup will attempt to import a .js
			// file if both a .ts and .js file are present, conflicting
			// with our build setup. See
			// https://discourse.joplinapp.org/t/importing-a-ts-file-from-a-rollup-bundled-ts-file/
			exclude: `${codeMirrorDir}/*.js`,
		}),
		nodeResolve(),
	],
};
