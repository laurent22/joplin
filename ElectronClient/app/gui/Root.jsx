const React = require('react');
const { render } = require('react-dom');
const { createStore } = require('redux');
const { connect, Provider } = require('react-redux');

const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');

const { app } = require('../app');

const { bridge } = require('electron').remote.require('./bridge');

async function initialize(dispatch) {
	bridge().window().on('resize', function() {
		store.dispatch({
			type: 'WINDOW_CONTENT_SIZE_SET',
			size: bridge().windowContentSize(),
		});
	});

	store.dispatch({
		type: 'WINDOW_CONTENT_SIZE_SET',
		size: bridge().windowContentSize(),
	});
}

class ReactRootComponent extends React.Component {

	async componentDidMount() {
		if (this.props.appState == 'starting') {
			this.props.dispatch({
				type: 'SET_APP_STATE',
				state: 'initializing',
			});

			await initialize(this.props.dispatch);

			this.props.dispatch({
				type: 'SET_APP_STATE',
				state: 'ready',
			});
		}
	}

	render() {
		const style = {
			width: this.props.size.width,
			height: this.props.size.height,
		};

		const noteListStyle = {
			width: Math.floor(this.props.size.width / 2),
			height: this.props.size.height,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteTextStyle = {
			width: this.props.size.width - noteListStyle.width,
			height: this.props.size.height,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		return (
			<div style={style}>
				<NoteList itemHeight={40} style={noteListStyle}></NoteList>
				<NoteText style={noteTextStyle}></NoteText>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		size: state.windowContentSize,
		appState: state.appState,
	};
};

const ReactRoot = connect(mapStateToProps)(ReactRootComponent);

const store = app().store();

render(
	<Provider store={store}>
		<ReactRoot />
	</Provider>,
	document.getElementById('react-root')
)