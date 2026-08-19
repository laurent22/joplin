import * as React from 'react';
import { PaperProvider } from 'react-native-paper';
import { MenuProvider } from 'react-native-popup-menu';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import FocusControl from '../accessibility/FocusControl/FocusControl';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';

interface Props {
	store: Store<AppState>;
	children: React.ReactNode;
}

const safeAreaMetrics: Metrics = {
	insets: { top: 0, right: 0, bottom: 0, left: 0 },
	frame: {
		x: 0,
		y: 0,
		width: 1234,
		height: 1234,
	},
};

const TestProviderStack: React.FC<Props> = props => {
	return <Provider store={props.store}>
		<SafeAreaProvider
			// By default, the SafeAreaProvider doesn't render its children until
			// it calculates the edge insets, (which involves a callback to native
			// code). Providing `initialMetrics` causes the provider to render its
			// content immediately.
			initialMetrics={safeAreaMetrics}
		>
			<FocusControl.Provider>
				<MenuProvider closeButtonLabel='Dismiss'>
					<PaperProvider>
						{props.children}
					</PaperProvider>
				</MenuProvider>
			</FocusControl.Provider>
		</SafeAreaProvider>
	</Provider>;
};

export default TestProviderStack;
