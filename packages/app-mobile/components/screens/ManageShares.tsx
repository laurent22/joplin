import * as React from 'react';
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { themeStyle } from '../global-style';

interface Props {
	themeId: number;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			rootStyle: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			}
		});
	}, [themeId]);
};

const ManageSharesComponent: React.FC<Props> = props => {
	
	return (
	)
};