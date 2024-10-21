import * as React from 'react';
import { PaperProvider } from 'react-native-paper';
import { MenuProvider } from 'react-native-popup-menu';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { AppState } from '../../utils/types';

interface Props {
	store: Store<AppState>;
	children: React.ReactNode;
}

const TestProviderStack: React.FC<Props> = props => {
	return <Provider store={props.store}>
		<MenuProvider>
			<PaperProvider>
				{props.children}
			</PaperProvider>
		</MenuProvider>
	</Provider>;
};

export default TestProviderStack;
