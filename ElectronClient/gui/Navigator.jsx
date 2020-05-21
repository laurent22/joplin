const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { bridge } = require('electron').remote.require('./bridge');

class NavigatorComponent extends Component {
	UNSAFE_componentWillReceiveProps(newProps) {
		if (newProps.route) {
			const screenInfo = this.props.screens[newProps.route.routeName];
			const windowTitle = ['Joplin'];
			if (screenInfo.title) {
				windowTitle.push(screenInfo.title());
			}
			this.updateWindowTitle(windowTitle.join(' - '));
		}
	}

	updateWindowTitle(title) {
		try {
			if (bridge().window()) bridge().window().setTitle(title);
		} catch (error) {
			console.warn('updateWindowTitle', error);
		}
	}

	render() {
		if (!this.props.route) throw new Error('Route must not be null');

		const route = this.props.route;
		const screenProps = route.props ? route.props : {};
		const screenInfo = this.props.screens[route.routeName];
		const Screen = screenInfo.screen;

		const screenStyle = {
			width: this.props.style.width,
			height: this.props.style.height,
		};

		return (
			<div style={this.props.style}>
				<Screen style={screenStyle} {...screenProps} />
			</div>
		);
	}
}

const Navigator = connect(state => {
	return {
		route: state.route,
	};
})(NavigatorComponent);

module.exports = { Navigator };
