import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';

export interface DesktopCommandContext {
	state: AppState;
	dispatch: Dispatch;
}
