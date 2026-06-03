import { AppState } from '../../app.reducer';

export interface DesktopCommandContext {
	state: AppState;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Old code before rule was applied
	dispatch: Function;
}
