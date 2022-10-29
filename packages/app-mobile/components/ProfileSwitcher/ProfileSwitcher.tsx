const React = require('react');
import { useMemo } from 'react';
const { View, Text, StyleSheet } = require('react-native');
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';
const { ActionButton } = require('../action-button');
// const ReactNativeActionButton = require('react-native-action-button').default;

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
			<ScreenHeader title={_('Edit notebook')} showSaveButton={false} showSideMenuButton={false} showSearchButton={false} />
			<View><Text>TEST</Text></View>
			<ActionButton mainButtonPress={() => { console.info('AAAAAAAAAAAAAAAAAAAAAAA'); }} mainButton={
				{
					onPress: () => {

					},
					color: '#9b59b6',
					icon: 'md-add',
				}
			}></ActionButton>
		</View>
	);
};
