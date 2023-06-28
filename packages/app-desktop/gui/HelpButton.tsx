import * as React from 'react';
const { connect } = require('react-redux');
import { themeStyle } from '@joplin/lib/theme';
import { AppState } from '../app.reducer';

interface Props {
	tip: string;
	onClick: Function;
	themeId: number;
	style: any;
}

class HelpButtonComponent extends React.Component<Props> {
	public constructor(props: Props) {
		super(props);

		this.onClick = this.onClick.bind(this);
	}

	public onClick() {
		if (this.props.onClick) this.props.onClick();
	}

	public render() {
		const theme = themeStyle(this.props.themeId);
		const style = { ...this.props.style, color: theme.color, textDecoration: 'none' };
		const helpIconStyle = { flex: 0, width: 16, height: 16, marginLeft: 10 };
		const extraProps: any = {};
		if (this.props.tip) extraProps['data-tip'] = this.props.tip;
		return (
			<a href="#" style={style} onClick={this.onClick} {...extraProps}>
				<i style={helpIconStyle} className={'fa fa-question-circle'}></i>
			</a>
		);
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
};

const HelpButton = connect(mapStateToProps)(HelpButtonComponent);

export default HelpButton;
