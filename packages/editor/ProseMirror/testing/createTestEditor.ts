import { DOMParser as ProseMirrorDomParser } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import schema from '../schema';
import { EditorState, Plugin } from 'prosemirror-state';

type PluginList = Plugin[]|(Plugin|Plugin[])[];

interface Options {
	parent?: HTMLElement;
	html: string;
	plugins?: PluginList;
}

const createTestEditor = ({ html, parent = null, plugins = [] }: Options) => {
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
