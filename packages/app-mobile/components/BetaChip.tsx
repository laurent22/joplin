import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { themeStyle } from './global-style';
import { useMemo } from 'react';
import { _ } from '@joplin/lib/locale';
import { connect } from 'react-redux';
import { AppState } from '../utils/types';

interface Props {
	themeId: number;
	size: number;
}

const useStyles = (themeId: number, size: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			container: {
				borderColor: theme.color4,
				color: theme.color4,
				fontSize: size,
				opacity: 0.8,
				borderRadius: 12,
				borderWidth: 1,
				padding: 4,
				flexGrow: 0,
				textAlign: 'center',
				textAlignVertical: 'center',
			},
		});
	}, [themeId, size]);
};

const BetaChip: React.FC<Props> = props => {
	const styles = useStyles(props.themeId, props.size);
	return <View><Text style={styles.container}>{_('Beta')}</Text></View>;
};

export default connect((state: AppState) => ({ themeId: state.settings.theme }))(BetaChip);
