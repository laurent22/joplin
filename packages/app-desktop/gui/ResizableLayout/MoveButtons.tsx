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
	canMoveLeft: boolean,
	canMoveRight: boolean,
	canMoveUp: boolean,
	canMoveDown: boolean,
}

export default function MoveButtons(props:Props) {
	const onButtonClick = useCallback((direction:MoveDirection) => {
		props.onClick({ direction, itemKey: props.itemKey });
	}, [props.onClick, props.itemKey]);

	function canMove(dir:MoveDirection) {
		if (dir === MoveDirection.Up) return props.canMoveUp;
		if (dir === MoveDirection.Down) return props.canMoveDown;
		if (dir === MoveDirection.Left) return props.canMoveLeft;
		if (dir === MoveDirection.Right) return props.canMoveRight;
		throw new Error('Unreachable');
	}

	function renderButton(dir:MoveDirection) {
		if (!canMove(dir)) return null;
		return <Button level={ButtonLevel.Secondary} title={dir} onClick={() => onButtonClick(dir)}/>;
	}

	return (
		<div>
			{renderButton(MoveDirection.Up)}
			{renderButton(MoveDirection.Down)}
			{renderButton(MoveDirection.Left)}
			{renderButton(MoveDirection.Right)}
		</div>
	);
}
