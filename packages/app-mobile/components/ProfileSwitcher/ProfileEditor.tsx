const React = require('react');
import { useMemo } from 'react';
const { View, StyleSheet } = require('react-native');
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';

interface Props {
	themeId: number;
}

const useStyle = (themeId: number) => {
	return useMemo(() => {
		return StyleSheet.create({
			...createRootStyle(themeId),
		});
	}, [themeId]);
};

export default (props: Props) => {
	const style = useStyle(props.themeId);

	return (
		<View style={style.root}>
			<ScreenHeader title={_('Edit profile')} showSaveButton={true} showSideMenuButton={false} showSearchButton={false} />

		</View>
	);
};
