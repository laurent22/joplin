const React = require('react');
const { render } = require('react-dom');
const { createStore } = require('redux');
const { connect, Provider } = require('react-redux');

const { NoteList } = require('./gui/NoteList.min.js');

const { app } = require('electron').remote.require('./app');

class ReactRootComponent extends React.Component {

	render() {
		return (
			<div style={{height: "1000px"}}>
				<NoteList></NoteList>
			</div>
		)
	}

}

const mapStateToProps = (state) => {
	return {};
};

const ReactRoot = connect(mapStateToProps)(ReactRootComponent);

const store = app().store();

render(
	<Provider store={store}>
		<ReactRoot />
	</Provider>,
	document.getElementById('react-root')
)