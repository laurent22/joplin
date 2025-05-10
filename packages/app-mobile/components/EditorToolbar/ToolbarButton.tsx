import * as React from 'react';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import IconButton from '../IconButton';
import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { themeStyle } from '../global-style';
import { Tooltip } from 'react-native-paper'; // Assuming you are using react-native-paper for Tooltip

interface Props {
	themeId: number;
	buttonInfo: ToolbarButtonInfo;
	selected?: boolean;
}

const useStyles = (themeId: number, selected: boolean, enabled: boolean) => {
	const { fontScale } = useWindowDimensions();

	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			icon: {
				color: theme.color,
				fontSize: 22 * fontScale,
			},
			button: {
				// Scaling the button width/height by the device font scale causes the button to scale
				// with the user's device font size.
				width: 48 * fontScale,
				height: 48 * fontScale,
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: selected ? theme.backgroundColorHover3 : theme.backgroundColor3,
				opacity: enabled ? 1 : theme.disabledOpacity,
			},
		});
	}, [themeId, selected, enabled, fontScale]);
};

const ToolbarButton: React.FC<Props> = memo(({ themeId, buttonInfo, selected }) => {
	const styles = useStyles(themeId, selected, buttonInfo.enabled);
	const isToggleButton = selected !== undefined;

	return (
		<Tooltip title={buttonInfo.title || buttonInfo.tooltip}> {/* Tooltip wraps the IconButton */}
			<IconButton
				iconName={buttonInfo.iconName}
				description={buttonInfo.title || buttonInfo.tooltip}
				onPress={buttonInfo.onClick}
				disabled={!buttonInfo.enabled}
				iconStyle={styles.icon}
				containerStyle={styles.button}
				accessibilityState={{ selected }}
				accessibilityRole={isToggleButton ? 'togglebutton' : 'button'}
				role={'button'}
				aria-pressed={selected}
				preventKeyboardDismiss={true}
				themeId={themeId}
			/>
		</Tooltip>
	);
});

export default ToolbarButton;
