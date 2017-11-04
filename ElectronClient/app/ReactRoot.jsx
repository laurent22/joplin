const React = require('react');
const { render } = require('react-dom');
const { createStore } = require('redux');
const { Provider } = require('react-redux');

const { app } = require('electron').remote.require('./app');

class ReactRoot extends React.Component {

	render() {
		return (
			<div>
			Aaaa
			</div>
		)
	}

}

const store = app().store();

render(
	<Provider store={store}>
		<ReactRoot />
	</Provider>,
	document.getElementById('react-root')
)