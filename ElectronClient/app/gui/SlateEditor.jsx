const React = require('react');
const Plain = require('slate-plain-serializer').default;
const {Editor} = require('slate-react');

const MarkHotkey = ({markType, renderMark, key}) => ({
	onKeyDown(event, editor, next) {
		// `metaKey` is "cmd"
		if (event.metaKey && event.key == key) {
			event.preventDefault();
			editor.toggleMark(markType);
		}
		return next(); // If it doesn't match our `key`, let other plugins handle it.
	},

	renderMark(props, editor, next) {
		switch (props.mark.type) {
		case markType:
			return renderMark(props);
		default:
			return next();
		}
	},
});

const BlockHotkey = ({blockType, renderBlock, key}) => ({
	onKeyDown(event, editor, next) {
		// `metaKey` is "cmd"
		if (event.key == key && event.metaKey) {
			event.preventDefault();

			// Determine whether any currently-selected blocks are already of that type
			const alreadyOfType = editor.value.blocks.some(b => b.type == blockType);
			editor.setBlocks(alreadyOfType ? 'paragraph' : blockType);
		}
		return next(); // If it doesn't match our `key`, let other plugins handle it.
	},

	renderBlock(props, editor, next) {
		switch (props.node.type) {
		case blockType:
			return renderBlock(props);
		default:
			return next();
		}
	},
});

const plugins = [
	MarkHotkey({
		key: 'b',
		markType: 'strong',
		renderMark: props => <strong {...props.attributes}>{props.children}</strong>,
	}),
	MarkHotkey({
		key: 'i',
		markType: 'emphasized',
		renderMark: props => <em {...props.attributes}>{props.children}</em>,
	}),
	BlockHotkey({
		key: '`',
		blockType: 'code',
		renderBlock: props => (
			<pre {...props.attributes}>
				<code>{props.children}</code>
			</pre>
		),
	}),
];

class MarkdownPreviewEditor extends React.Component {
	constructor(...args) {
		super(...args);
		this.state = {value: Plain.deserialize(this.props.value)};
	}

	onChange({value}) {
		this.setState({value});
		this.props.onChange(Plain.serialize(value));
	}

	render() {
		return (
			<div className="devons-slate-editor">
				<ul className="info">
					<li>
            Click <kbd>cmd</kbd>+<kbd>`</kbd> to turn your current block into code.
					</li>
					<li>
            Click <kbd>cmd</kbd>+<kbd>b</kbd> to make a selection bold.
					</li>
				</ul>
				<Editor
					plugins={plugins}
					value={this.state.value}
					onChange={this.onChange.bind(this)}
				/>
				<pre className="info">{JSON.stringify(this.state, null, 2)}</pre>
			</div>
		);
	}
}

module.exports = MarkdownPreviewEditor;
