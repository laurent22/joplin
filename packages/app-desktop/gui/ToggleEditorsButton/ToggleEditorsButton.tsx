import * as React from 'react';
import styles_ from './styles';
import { Props } from './types';

export default function ToggleEditorsButton(props: Props) {
	const style = styles_(props);

	return (
		<button
			style={style.button}
			disabled={!props.toolbarButtonInfo.enabled}
			aria-label={props.toolbarButtonInfo.tooltip}
			title={props.toolbarButtonInfo.tooltip}
			type="button"
			className={`tox-tbtn ${props.value}-active`}
			aria-pressed="false"
			onClick={props.toolbarButtonInfo.onClick}
		>
			<div style={style.leftInnerButton}>
				<i style={style.leftIcon} className="fab fa-markdown"></i>
			</div>
			<div style={style.rightInnerButton}>
				<i style={style.rightIcon} className="fas fa-edit"></i>
			</div>
		</button>
	);
}
