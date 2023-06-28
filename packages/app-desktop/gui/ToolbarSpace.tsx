import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';

interface Props {
	themeId: number;
}

class ToolbarSpace extends React.Component<Props> {
	public render() {
		const theme = themeStyle(this.props.themeId);
		const style = { ...theme.toolbarStyle };
		style.minWidth = style.height / 2;

		return <span style={style}></span>;
	}
}

export default ToolbarSpace;
