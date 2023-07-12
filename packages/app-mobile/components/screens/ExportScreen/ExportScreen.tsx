import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../../utils/types';
import NoteExportComponent from './NoteExportComponent';
import useStyles from './useStyles';
import SectionHeader from './SectionHeader';
import ExportDebugComponent from './ExportDebugComponent';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}


export const ExportScreenComponent = (props: Props) => {
	const styles = useStyles(props.themeId);

	return (
		<View style={styles.rootStyle}>
			<ScreenHeader title={_('Export')}/>
			<ScrollView>
				<SectionHeader
					styles={styles}
					title={_('Export Notes')}
					description={_('Share a copy of all notes in a file format that can be imported by Joplin on a computer.')}
				/>
				<NoteExportComponent
					styles={styles}
					themeId={props.themeId}
					dispatch={props.dispatch} />

				<ExportDebugComponent
					styles={styles} />
			</ScrollView>
		</View>
	);
};

const ExportScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(ExportScreenComponent);

export default ExportScreen;
