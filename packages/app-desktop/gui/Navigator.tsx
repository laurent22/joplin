const React = require('react');
const { connect } = require('react-redux');
import Setting from '@joplin/lib/models/Setting';
import { AppState } from '../app.reducer';
import bridge from '../services/bridge';

interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	route: any;
}

class NavigatorComponent extends React.Component<Props> {
	public UNSAFE_componentWillReceiveProps(newProps: Props) {
		if (newProps.route) {
			const screenInfo = this.props.screens[newProps.route.routeName];
			const devMarker = Setting.value('env') === 'dev' ? ` (DEV - ${Setting.value('profileDir')})` : '';
			const windowTitle = [`Joplin${devMarker}`];
			if (screenInfo.title) {
				windowTitle.push(screenInfo.title());
			}
			this.updateWindowTitle(windowTitle.join(' - '));
		}
	}

	public updateWindowTitle(title: string) {
		try {
			if (bridge().mainWindow()) bridge().mainWindow().setTitle(title);
		} catch (error) {
			console.warn('updateWindowTitle', error);
		}
	}

	public render() {
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
			<div style={this.props.style} className={this.props.className}>
				<Screen style={screenStyle} {...screenProps} />
			</div>
		);
	}
}

const Navigator = connect((state: AppState) => {
	return {
		route: state.route,
	};
})(NavigatorComponent);

export default Navigator;
