import * as React from 'react';
import TextButton, { ButtonType, Props as TextButtonProps } from './TextButton';

type Props = Omit<TextButtonProps, 'type'|'themeId'>;

const makeTextButtonComponent = (type: ButtonType) => {
	return (props: Props) => {
		return <TextButton {...props} type={type} />;
	};
};

export const PrimaryButton = makeTextButtonComponent(ButtonType.Primary);
export const SecondaryButton = makeTextButtonComponent(ButtonType.Secondary);
export const LinkButton = makeTextButtonComponent(ButtonType.Link);
