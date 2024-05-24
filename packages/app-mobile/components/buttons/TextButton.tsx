import * as React from 'react';
import { ReactNode, useMemo } from 'react';
import { themeStyle } from '../global-style';
import { Button, ButtonProps } from 'react-native-paper';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';

export enum ButtonType {
	Primary,
	Secondary,
	Delete,
	Link,
}

interface Props extends Omit<ButtonProps, 'item'|'onPress'|'children'> {
	themeId: number;
	type: ButtonType;
	onPress: ()=> void;
	children: ReactNode;
}

export type TextButtonProps = Omit<Props, 'themeId'>;

const useStyles = ({ themeId }: Props) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const themeOverride = {
			secondaryButton: {
				colors: {
					primary: theme.color4,
					outline: theme.color4,
				},
			},
			deleteButton: {
				colors: {
					primary: theme.destructiveColor,
					outline: theme.destructiveColor,
				},
			},
			primaryButton: { },
		};

		return { themeOverride };
	}, [themeId]);
};

const TextButton: React.FC<Props> = props => {
	const { themeOverride } = useStyles(props);

	let mode: ButtonProps['mode'];
	let theme: ButtonProps['theme'];

	if (props.type === ButtonType.Primary) {
		theme = themeOverride.primaryButton;
		mode = 'contained';
	} else if (props.type === ButtonType.Secondary) {
		theme = themeOverride.secondaryButton;
		mode = 'outlined';
	} else if (props.type === ButtonType.Delete) {
		theme = themeOverride.deleteButton;
		mode = 'outlined';
	} else if (props.type === ButtonType.Link) {
		theme = themeOverride.secondaryButton;
		mode = 'text';
	} else {
		const exhaustivenessCheck: never = props.type;
		return exhaustivenessCheck;
	}

	return <Button
		{...props}
		theme={theme}
		mode={mode}
		onPress={props.onPress}
	>{props.children}</Button>;
};

export default connect((state: AppState) => {
	return { themeId: state.settings.theme };
})(TextButton);
