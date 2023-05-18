import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';

interface Props {
	themeId: number;
	style: any;
	iconName: string;
	onClick: Function;
}

class IconButton extends React.Component<Props> {
	public render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.themeId);
		const iconStyle = {
			color: theme.color,
			fontSize: theme.fontSize * 1.4,
		};
		const icon = <i style={iconStyle} className={`fas ${this.props.iconName}`}></i>;

		const rootStyle = Object.assign(
			{
				display: 'flex',
				textDecoration: 'none',
				padding: 10,
				width: theme.buttonMinHeight,
				height: theme.buttonMinHeight,
				boxSizing: 'border-box',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: theme.backgroundColor,
				cursor: 'default',
			},
			style
		);

		return (
			<a
				href="#"
				style={rootStyle}
				className="icon-button"
				onClick={() => {
					if (this.props.onClick) this.props.onClick();
				}}
			>
				{icon}
			</a>
		);
	}
}

export default IconButton;
