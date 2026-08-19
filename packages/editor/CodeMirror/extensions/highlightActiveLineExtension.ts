import { EditorView, highlightActiveLine } from '@codemirror/view';

// Be careful when enabling this on mobile --- on some devices, this can
// break certain accessibility features:
// https://github.com/codemirror/dev/issues/1559
const highlightActiveLineExtension = () => {
	return [
		EditorView.baseTheme({
			'&light .cm-line.cm-activeLine': {
				backgroundColor: 'rgba(100, 100, 140, 0.1)',
			},
			'&dark .cm-line.cm-activeLine': {
				backgroundColor: 'rgba(200, 200, 240, 0.1)',
			},
		}),
		highlightActiveLine(),
	];
};

export default highlightActiveLineExtension;
