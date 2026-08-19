import * as React from 'react';

export type OnInputChange = (event: React.ChangeEvent<HTMLInputElement>)=> void;
export type OnClick = (event: React.MouseEvent<HTMLElement>)=> void;

export type ItemEventHandlers = {
	onInputChange: OnInputChange;
	onClick: OnClick | null;
};
