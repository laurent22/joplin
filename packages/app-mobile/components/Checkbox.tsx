import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { TouchableHighlight, StyleSheet, TextStyle } from 'react-native';
import Icon from './Icon';

interface Props {
	checked: boolean;
	accessibilityLabel?: string;
	onChange?: (checked: boolean)=> void;
	style?: TextStyle;
	iconStyle?: TextStyle;
}

const useStyles = (baseStyles: TextStyle|undefined, iconStyle: TextStyle|undefined) => {
	return useMemo(() => {
		return StyleSheet.create({
			container: {
				...(baseStyles ?? {}),
				justifyContent: 'center',
				alignItems: 'center',
			},
			icon: {
				fontSize: 20,
				height: 22,
				color: baseStyles?.color,
				...iconStyle,
			},
		});
	}, [baseStyles, iconStyle]);
};

const Checkbox: React.FC<Props> = props => {
	const [checked, setChecked] = useState(props.checked);

	useEffect(() => {
		setChecked(props.checked);
	}, [props.checked]);

	const onPress = useCallback(() => {
		setChecked(checked => {
			const newChecked = !checked;
			props.onChange?.(newChecked);
			return newChecked;
		});
	}, [props.onChange]);

	const iconName = checked ? 'ionicon checkbox-outline' : 'ionicon square-outline';
	const styles = useStyles(props.style, props.iconStyle);

	const accessibilityState = useMemo(() => ({
		checked,
	}), [checked]);

	return (
		<TouchableHighlight
			onPress={onPress}
			style={styles.container}
			accessibilityRole="checkbox"
			accessibilityState={accessibilityState}
			accessibilityLabel={props.accessibilityLabel ?? ''}
			// Web requires aria-checked
			aria-checked={checked}
		>
			<Icon name={iconName} style={styles.icon} accessibilityLabel={null} />
		</TouchableHighlight>
	);
};

export default Checkbox;
