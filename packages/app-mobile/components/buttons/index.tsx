import * as React from 'react';
import TextButton, { ButtonType, TextButtonProps } from './TextButton';

type Props = Omit<TextButtonProps, 'type'>;

const makeTextButtonComponent = (type: ButtonType) => {
	return (props: Props) => {
		return <TextButton {...props} type={type} />;
	};
};

export const PrimaryButton = makeTextButtonComponent(ButtonType.Primary);
export const SecondaryButton = makeTextButtonComponent(ButtonType.Secondary);
export const LinkButton = makeTextButtonComponent(ButtonType.Link);
export const DeleteButton = makeTextButtonComponent(ButtonType.Delete);
