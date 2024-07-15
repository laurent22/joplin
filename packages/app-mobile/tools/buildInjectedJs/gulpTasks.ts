import BundledFile from './BundledFile';
import { mkdirp } from 'fs-extra';
import { mobileDir, outputDir } from './constants';
import copyJs from './copyJs';


const codeMirrorBundle = new BundledFile(
	'codeMirrorBundle',
	`${mobileDir}/components/NoteEditor/CodeMirror/CodeMirror.ts`,
);

const jsDrawBundle = new BundledFile(
	'svgEditorBundle',
	`${mobileDir}/components/NoteEditor/ImageEditor/js-draw/createJsDrawEditor.ts`,
);

const pluginBackgroundPageBundle = new BundledFile(
	'pluginBackgroundPage',
	`${mobileDir}/components/plugins/backgroundPage/pluginRunnerBackgroundPage.ts`,
);

const noteViewerBundle = new BundledFile(
	'noteBodyViewerBundle',
	`${mobileDir}/components/NoteBodyViewer/bundledJs/noteBodyViewerBundle.ts`,
);

const gulpTasks = {
	beforeBundle: {
		fn: () => mkdirp(outputDir),
	},
	buildCodeMirrorEditor: {
		fn: () => codeMirrorBundle.build(),
	},
	buildJsDrawEditor: {
		fn: () => jsDrawBundle.build(),
	},
	buildNoteViewerBundle: {
		fn: () => noteViewerBundle.build(),
	},
	watchCodeMirrorEditor: {
		fn: () => codeMirrorBundle.startWatching(),
	},
	watchJsDrawEditor: {
		fn: () => jsDrawBundle.startWatching(),
	},
	buildPluginBackgroundScript: {
		fn: () => pluginBackgroundPageBundle.build(),
	},
	watchPluginBackgroundScript: {
		fn: () => pluginBackgroundPageBundle.startWatching(),
	},
	watchNoteViewerBundle: {
		fn: () => noteViewerBundle.startWatching(),
	},
	copyWebviewLib: {
		fn: () => copyJs('webviewLib', `${mobileDir}/../lib/renderers/webviewLib.js`),
	},
};

export default gulpTasks;
