import reducer from '@joplin/lib/reducer';
import { createStore } from 'redux';
import appDefaultState from '../appDefaultState';
import Setting from '@joplin/lib/models/Setting';

const defaultState = {
	...appDefaultState,
	// Mocking theme in the default state is necessary to prevent "Theme not set!" warnings.
	settings: { theme: Setting.THEME_LIGHT },
};

const testReducer = (state = defaultState, action: unknown) => {
	return reducer(state, action);
};

const createMockReduxStore = () => {
	return createStore(testReducer);
};
export default createMockReduxStore;
