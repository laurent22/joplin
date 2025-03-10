import * as React from 'react';
import { PaperProvider } from 'react-native-paper';
import { MenuProvider } from 'react-native-popup-menu';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import FocusControl from '../accessibility/FocusControl/FocusControl';

interface Props {
	store: Store<AppState>;
	children: React.ReactNode;
}

const TestProviderStack: React.FC<Props> = props => {
	return <Provider store={props.store}>
		<FocusControl.Provider>
			<MenuProvider>
				<PaperProvider>
					{props.children}
				</PaperProvider>
			</MenuProvider>
		</FocusControl.Provider>
	</Provider>;
};

export default TestProviderStack;
