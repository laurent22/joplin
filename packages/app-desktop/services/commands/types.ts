import { AppState } from '../../app.reducer';

export interface DesktopCommandContext {
	state: AppState;
	dispatch: Function;
}
