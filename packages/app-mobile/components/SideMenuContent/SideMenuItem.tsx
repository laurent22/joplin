import * as React from 'react';
import { TouchableRipple, TouchableRippleProps, Text } from 'react-native-paper';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import Icon from '../Icon';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { themeStyle } from '../global-style';

export enum ToggleState {
	Hidden = 0,
	Expanded,
	Collapsed,
}

type Props = {
	icon: React.ReactNode;
	text: string;
	textStyle?: StyleProp<TextStyle>;
	touchableProps: Partial<TouchableRippleProps>;
	themeId: number;

	selected: boolean;
	depth: number;
} & (
	{ toggleState: ToggleState.Collapsed|ToggleState.Expanded; onToggle: ()=> void }
	| { toggleState: ToggleState.Hidden; onToggle?: ()=> void }
);

const SideMenuItem: React.FC<Props> = ({
	icon, text, textStyle, touchableProps, toggleState, themeId, onToggle, selected, depth,
}) => {
	const styles = useStyles({ themeId, depth, selected });

	let toggleButton: React.ReactNode|null = null;
	if (toggleState !== ToggleState.Hidden) {
		const collapsed = toggleState === ToggleState.Collapsed;
		const toggleIcon = <Icon
			name={collapsed ? 'ionicon chevron-down' : 'ionicon chevron-up'}
			style={styles.toggleIcon}
			accessibilityLabel={null}
		/>;
		toggleButton = (
			<TouchableRipple
				style={styles.toggleIconWrapper}
				onPress={onToggle}
				accessibilityLabel={_('Expand %s', text)}

				aria-pressed={!collapsed}
				accessibilityState={{ checked: !collapsed }}
				// The togglebutton role is only supported on Android and iOS.
				// On web, the button role with aria-pressed creates a togglebutton.
				accessibilityRole={shim.mobilePlatform() === 'web' ? 'button' : 'togglebutton'}
			>
				{toggleIcon}
			</TouchableRipple>
		);
	}

	// React Native doesn't seem to include an equivalent to web's aria-level.
	// To allow screen reader users to determine whether a notebook is a subnotebook or not,
	// depth is specified with an accessibilityLabel:
	const folderDepthDescription = depth > 0 ? _('(level %d)', depth) : '';
	const accessibilityLabel = `${text}  ${folderDepthDescription}`.trim();

	return (
		<View style={styles.buttonWrapper}>
			<TouchableRipple
				style={styles.button}
				role='button'
				{...touchableProps}
			>
				<View style={styles.buttonContent}>
					{icon}
					<Text
						numberOfLines={1}
						accessibilityLabel={accessibilityLabel}
						style={[styles.text, textStyle]}
					>
						{text}
					</Text>
				</View>
			</TouchableRipple>
			{toggleButton}
		</View>
	);
};

interface StylesProps {
	themeId: number;
	depth: number;
	selected: boolean;
}

const useStyles = ({ themeId, depth, selected }: StylesProps) => {
	return React.useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			buttonWrapper: {
				flexDirection: 'row',
			},
			button: {
				flex: 1,
				flexBasis: 'auto',
				height: 42,
			},
			buttonContent: {
				flex: 1,
				flexDirection: 'row',
				flexBasis: 'auto',
				alignItems: 'center',
				paddingRight: theme.marginRight,

				backgroundColor: selected ? theme.selectedColor : undefined,
				paddingLeft: depth * theme.marginSmall + theme.marginLeft,
			},
			text: {
				...theme.normalText,
				paddingLeft: depth === 0 ? theme.marginSmall : theme.marginExtraSmall,
			},
			toggleIcon: {
				...theme.icon,
				fontSize: theme.fontSizeLarger,
				color: theme.color,
			},
			toggleIconWrapper: {
				paddingLeft: theme.margin,
				paddingRight: theme.margin,
				justifyContent: 'center',
				backgroundColor: selected ? theme.selectedColor : undefined,
			},
		});
	}, [themeId, selected, depth]);
};

export default SideMenuItem;
