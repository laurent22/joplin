import * as React from 'react';
import { connect } from 'react-redux';
import Setting from '@joplin/lib/models/Setting';
import { AppState, AppStateRoute } from '../app.reducer';
import bridge from '../services/bridge';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { WindowIdContext } from './NewWindowOrIFrame';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of code from before rule was applied
type ScreenProps = any;

interface AppScreen {
	screen: React.ComponentType<ScreenProps>;
	title?: ()=> string;
}

interface Props {
	route: AppStateRoute;
	screens: Record<string, AppScreen>;

	style: React.CSSProperties;
	className?: string;
}

const useWindowTitleManager = (screenInfo: AppScreen) => {
	const windowTitle = useMemo(() => {
		const devMarker = Setting.value('env') === 'dev' ? ` (DEV - ${Setting.value('profileDir')})` : '';
		const windowTitle = [`Joplin${devMarker}`];
		if (screenInfo?.title) {
			windowTitle.push(screenInfo.title());
		}
		return windowTitle.join(' - ');
	}, [screenInfo]);

	const windowId = useContext(WindowIdContext);
	useEffect(() => {
		bridge().windowById(windowId)?.setTitle(windowTitle);
	}, [windowTitle, windowId]);
};

const useWindowRefocusManager = (route: AppStateRoute) => {
	const windowId = useContext(WindowIdContext);

	const prevRouteName = useRef<string|null>(null);
	const routeName = route?.routeName;
	useEffect(() => {
		// When a navigation happens in an unfocused window, show the window to the user.
		// This might happen if, for example, a secondary window triggers a navigation in
		// the main window.
		if (routeName && routeName !== prevRouteName.current) {
			bridge().switchToWindow(windowId);
		}

		prevRouteName.current = routeName;
	}, [routeName, windowId]);
};

const useContainerSize = (container: HTMLElement|null) => {
	const [size, setSize] = useState({ width: container?.clientWidth ?? 0, height: container?.clientHeight ?? 0 });

	useEffect(() => {
		if (!container) return () => {};

		const observer = new ResizeObserver(() => {
			setSize({
				width: container.clientWidth,
				height: container.clientHeight,
			});
		});
		observer.observe(container);
		return () => {
			observer.disconnect();
		};
	}, [container]);

	return size;
};

const NavigatorComponent: React.FC<Props> = props => {
	const route = props.route;
	const screenInfo = props.screens[route?.routeName];
	const [container, setContainer] = useState<HTMLElement|null>(null);

	useWindowTitleManager(screenInfo);
	useWindowRefocusManager(route);
	const size = useContainerSize(container);

	if (!route) throw new Error('Route must not be null');

	const screenProps = route.props ? route.props : {};
	const Screen = screenInfo.screen;

	return (
		<div ref={setContainer} style={props.style} className={props.className}>
			<Screen style={size} {...screenProps} />
		</div>
	);
};

const Navigator = connect((state: AppState) => {
	return {
		route: state.route,
	};
})(NavigatorComponent);

export default Navigator;
