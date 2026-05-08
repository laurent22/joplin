import { DOMParser as ProseMirrorDomParser } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import schema from '../schema';
import { EditorState, Plugin } from 'prosemirror-state';

export type PluginList = Plugin[]|(Plugin|Plugin[])[];

interface Options {
	parent?: HTMLElement;
	html: string;
	plugins?: PluginList;
}

const createTestEditor = ({ html, parent = null, plugins = [] }: Options) => {
	if (parent === null) {
		// Create a test parent -- some code adds tooltips, etc to view.dom.parent.
		parent = document.createElement('div');
	}

	const htmlDocument = new DOMParser().parseFromString(html, 'text/html');
	const proseMirrorDocument = ProseMirrorDomParser.fromSchema(schema).parse(htmlDocument);
	return new EditorView(parent, {
		state: EditorState.create({
			doc: proseMirrorDocument,
			plugins: plugins.flat(),
			schema,
		}),
	});
};

export default createTestEditor;
