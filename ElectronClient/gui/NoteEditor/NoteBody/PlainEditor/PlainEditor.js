'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('react');
const PlainEditor = (props, ref) => {
	const editorRef = react_1.useRef();
	react_1.useImperativeHandle(ref, () => {
		return {
			content: () => '',
		};
	}, []);
	react_1.useEffect(() => {
		if (!editorRef.current) { return; }
		editorRef.current.value = props.defaultEditorState.value;
	}, [props.defaultEditorState]);
	const onChange = react_1.useCallback((event) => {
		props.onChange({ changeId: null, content: event.target.value });
	}, [props.onWillChange, props.onChange]);
	return (React.createElement('div', { style: props.style },
		React.createElement('textarea', { ref: editorRef, style: { width: '100%', height: '100%' }, defaultValue: props.defaultEditorState.value, onChange: onChange }),
		';'));
};
exports.default = react_1.forwardRef(PlainEditor);
// # sourceMappingURL=PlainEditor.js.map
