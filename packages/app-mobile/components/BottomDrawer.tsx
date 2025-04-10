import * as React from 'react';
import { connect } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import useSafeAreaPadding from '../utils/hooks/useSafeAreaPadding';
import { themeStyle, ThemeStyle } from './global-style';
import Modal from './Modal';
import { AppState } from '../utils/types';

interface Props {
	themeId: number;
	children: React.ReactNode;
	visible: boolean;
	onDismiss: ()=> void;
	onShow: ()=> void;
}

const useStyles = (theme: ThemeStyle) => {
	const { width: windowWidth } = useWindowDimensions();
	const safeAreaPadding = useSafeAreaPadding();

	return useMemo(() => {
		const isSmallWidthScreen = windowWidth < 500;
		const menuGapLeft = safeAreaPadding.paddingLeft + 6;
		const menuGapRight = safeAreaPadding.paddingRight + 6;

		return StyleSheet.create({
			menuStyle: {
				alignSelf: 'flex-end',
				...(isSmallWidthScreen ? {
					// Center on small screens, rather than float right.
					alignSelf: 'center',
				} : {}),
				flexDirection: 'row',
				marginRight: menuGapRight,
				marginLeft: menuGapLeft,
				paddingBottom: 0,

				backgroundColor: theme.backgroundColor,
				borderRadius: 16,
				borderBottomRightRadius: 0,
				borderBottomLeftRadius: 0,
				maxWidth: Math.min(400, windowWidth - menuGapRight - menuGapLeft),
			},
			contentContainer: {
				padding: 20,
				paddingBottom: 14,
				gap: 8,
				flexDirection: 'row',
				flexWrap: 'wrap',
			},
			modalBackground: {
				paddingTop: 0,
				paddingLeft: 0,
				paddingRight: 0,
				paddingBottom: 0,
				justifyContent: 'flex-end',
				flexDirection: 'column',
			},
			dismissButton: {
				top: 0,
				bottom: undefined,
				height: 12,
			},
		});
	}, [theme, safeAreaPadding, windowWidth]);
};

const BottomDrawer: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styles = useStyles(theme);

	const onContainerScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		if (offsetY < -50) {
			props.onDismiss();
		}
	}, [props.onDismiss]);

	return <Modal
		visible={props.visible}
		onDismiss={props.onDismiss}
		onRequestClose={props.onDismiss}
		onShow={props.onShow}
		animationType='fade'
		backgroundColor={theme.backgroundColorTransparent2}
		transparent
		modalBackgroundStyle={styles.modalBackground}
		dismissButtonStyle={styles.dismissButton}
		containerStyle={styles.menuStyle}
		scrollOverflow={{
			overScrollMode: 'always',
			onScroll: onContainerScroll,
		}}
	>
		<View style={styles.contentContainer}>
			{props.children}
		</View>
	</Modal>;
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(BottomDrawer);
