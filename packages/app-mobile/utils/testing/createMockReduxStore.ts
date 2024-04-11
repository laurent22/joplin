import reducer from '@joplin/lib/reducer';
import { createStore } from 'redux';
import appDefaultState from '../appDefaultState';
import Setting from '@joplin/lib/models/Setting';

const defaultState = {
	...appDefaultState,
	// Mocked values of settings
	settings: { theme: Setting.THEME_LIGHT },
};

const testReducer = (state = defaultState, action: unknown) => {
	return reducer(state, action);
};

const createMockReduxStore = () => {
	return createStore(testReducer);
};
export default createMockReduxStore;
