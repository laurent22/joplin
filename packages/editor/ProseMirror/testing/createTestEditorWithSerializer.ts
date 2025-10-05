import originalMarkupPlugin from '../plugins/originalMarkupPlugin';
import createTestEditor, { PluginList } from './createTestEditor';

interface Props {
	html: string;
	plugins: PluginList;
}

const createTestEditorWithSerializer = (props: Props) => {
	const serializer = new XMLSerializer();
	const markupToHtml = originalMarkupPlugin(node => serializer.serializeToString(node));
	const view = createTestEditor({
		html: props.html,
		plugins: [markupToHtml.plugin, ...props.plugins],
	});

	const normalizeHtml = (html: string) => {
		const parsed = new DOMParser().parseFromString([
			'<!DOCTYPE html>',
			'<html>',
			'<body>',
			html,
			'</body>',
			'</html>',
		].join(''), 'text/html');

		// Remove extra XMLNS declarations. These are sometimes added by serialization
		// done by the originalMarkupPlugin.
		const namespacedRootElements = parsed.body.querySelectorAll(':scope > [xmlns]');
		for (const element of namespacedRootElements) {
			element.removeAttribute('xmlns');
		}

		return serializer.serializeToString(
			parsed.querySelector('body'),
		);
	};

	return {
		view,
		toHtml: () => {
			return normalizeHtml(markupToHtml.stateToMarkup(view.state).trim());
		},
		normalizeHtml,
	};
};

export default createTestEditorWithSerializer;
