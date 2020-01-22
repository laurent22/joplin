const React = require('react');
const { bridge } = require('electron').remote.require('./bridge');

class VerticalResizer extends React.PureComponent {
	constructor() {
		super();

		this.state = {
			parentRight: 0,
			parentHeight: 0,
			parentWidth: 0,
			drag: {
				startX: 0,
				lastX: 0,
			},
		};

		this.onDragStart = this.onDragStart.bind(this);
		this.onDrag = this.onDrag.bind(this);
		this.onDragEnd = this.onDragEnd.bind(this);
		this.document_onDragOver = this.document_onDragOver.bind(this);
	}

	document_onDragOver(event) {
		// This is just to prevent the cursor from changing to a "+" as it's dragged
		// over other elements. With this it stays a normal cursor.
		event.dataTransfer.dropEffect = 'none';
	}

	onDragStart(event) {
		document.addEventListener('dragover', this.document_onDragOver);

		event.dataTransfer.dropEffect = 'none';

		const cursor = bridge().screen().getCursorScreenPoint();

		this.setState({
			drag: {
				startX: cursor.x,
				lastX: cursor.x,
			},
		});

		if (this.props.onDragStart) this.props.onDragStart({});
	}

	onDrag() {
		// If we got a drag event with no buttons pressed, it's the last drag event
		// that we should ignore, because it's sometimes use to put the dragged element
		// back to its original position (if there was no valid drop target), which we don't want.
		// Also if clientX, screenX, etc. are 0, it's also the last event and we want to ignore these buggy values.
		// const e = event.nativeEvent;
		// if (!e.buttons || (!e.clientX && !e.clientY && !e.screenX && !e.screenY)) return;

		const cursor = bridge().screen().getCursorScreenPoint();
		const newX = cursor.x;
		const delta = newX - this.state.drag.lastX;
		if (!delta) return;

		this.setState(
			{
				drag: Object.assign({}, this.state.drag, { lastX: newX }),
			},
			() => {
				this.props.onDrag({ deltaX: delta });
			}
		);
	}

	onDragEnd() {
		document.removeEventListener('dragover', this.document_onDragOver);
	}

	componentWillUnmount() {
		document.removeEventListener('dragover', this.document_onDragOver);
	}

	render() {
		const debug = false;

		const rootStyle = Object.assign(
			{},
			{
				height: '100%',
				width: 5,
				borderColor: 'red',
				borderWidth: debug ? 1 : 0,
				borderStyle: 'solid',
				cursor: 'col-resize',
				boxSizing: 'border-box',
				opacity: 0,
			},
			this.props.style
		);

		return <div style={rootStyle} draggable={true} onDragStart={this.onDragStart} onDrag={this.onDrag} onDragEnd={this.onDragEnd} />;
	}
}

module.exports = VerticalResizer;
