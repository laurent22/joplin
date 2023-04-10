import * as React from 'react';
import time from '@joplin/lib/time';
import { themeStyle } from '@joplin/lib/theme';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { AppState } from '../app.reducer';
const { connect } = require('react-redux');

interface Props {
	themeId: number;
	note: NoteEntity;
}

class NoteStatusBarComponent extends React.Component<Props> {
	public style() {
		const theme = themeStyle(this.props.themeId);

		const style = {
			root: Object.assign({}, theme.textStyle, {
				backgroundColor: theme.backgroundColor,
				color: theme.colorFaded,
			}),
		};

		return style;
	}

	public render() {
		const note = this.props.note;
		return <div style={this.style().root}>{time.formatMsToLocal(note.user_updated_time)}</div>;
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		// notes: state.notes,
		// folders: state.folders,
		// selectedNoteIds: state.selectedNoteIds,
		themeId: state.settings.theme,
	};
};

const NoteStatusBar = connect(mapStateToProps)(NoteStatusBarComponent);

export default NoteStatusBar;
