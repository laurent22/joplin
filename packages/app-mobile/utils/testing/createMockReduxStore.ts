import { createStore } from 'redux';
import appDefaultState from '../appDefaultState';
import Setting from '@joplin/lib/models/Setting';
import { AppState } from '../types';
import appReducer from '../appReducer';

const testReducer = (state: AppState|undefined, action: unknown): AppState => {
	state ??= {
		...appDefaultState,
		settings: Setting.toPlainObject(),
	};

	return { ...state, ...appReducer(state, action) };
};

const createMockReduxStore = () => {
	return createStore(testReducer);
};
export default createMockReduxStore;
