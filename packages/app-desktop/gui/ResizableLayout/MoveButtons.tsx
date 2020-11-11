import * as React from 'react';
import { useCallback } from 'react';
import Button, { ButtonLevel } from '../Button/Button';
import { MoveDirection } from './utils/movements';

export interface MoveButtonClickEvent {
	direction: MoveDirection;
	itemKey: string,
}

interface Props {
	onClick(event:MoveButtonClickEvent):void;
	itemKey: string,
}

export default function MoveButtons(props:Props) {
	const onButtonClick = useCallback((direction:MoveDirection) => {
		props.onClick({ direction, itemKey: props.itemKey });
	}, [props.onClick, props.itemKey]);

	const onUp = useCallback(() => {
		onButtonClick(MoveDirection.Up);
	}, []);

	const onDown = useCallback(() => {
		onButtonClick(MoveDirection.Down);
	}, []);

	const onLeft = useCallback(() => {
		onButtonClick(MoveDirection.Left);
	}, []);

	const onRight = useCallback(() => {
		onButtonClick(MoveDirection.Right);
	}, []);

	return (
		<div>
			<Button level={ButtonLevel.Secondary} title="Up" onClick={onUp}/>
			<Button level={ButtonLevel.Secondary} title="Down" onClick={onDown}/>
			<Button level={ButtonLevel.Secondary} title="Left" onClick={onLeft}/>
			<Button level={ButtonLevel.Secondary} title="Right" onClick={onRight}/>
		</div>
	);
}
