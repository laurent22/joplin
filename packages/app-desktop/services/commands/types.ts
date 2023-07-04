import { AppState } from '../../app.reducer';

export interface DesktopCommandContext {
	state: AppState;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}
