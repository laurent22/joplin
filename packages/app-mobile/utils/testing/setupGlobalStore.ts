import { Store } from 'redux';
import { AppState } from '../types';
import initializeCommandService from '../initializeCommandService';
import BaseSyncTarget from '@joplin/lib/BaseSyncTarget';
import NavService from '@joplin/lib/services/NavService';
import BaseModel from '@joplin/lib/BaseModel';

// Sets a given Redux store as global
const setupGlobalStore = (store: Store<AppState>) => {
	BaseModel.dispatch = store.dispatch;
	BaseSyncTarget.dispatch = store.dispatch;
	NavService.dispatch = store.dispatch;
	initializeCommandService(store);
};

export default setupGlobalStore;
