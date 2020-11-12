import { AppState } from '../../app';

export interface DesktopCommandContext {
	state: AppState;
	dispatch: Function;
}
