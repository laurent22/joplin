import * as React from 'react';
const { connect } = require('react-redux');
import { themeStyle } from '@joplin/lib/theme';
import { AppState } from '../app.reducer';
import { _ } from '@joplin/lib/locale';

interface Props {
	tip: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onClick: Function;
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	style: any;

	'aria-controls'?: string;
	'aria-expanded'?: string;
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const extraProps: any = {};
		if (this.props.tip) {
			extraProps['data-tip'] = this.props.tip;
			extraProps['aria-description'] = this.props.tip;
		}
		return (
			<button
				style={style}
				onClick={this.onClick}
				className='flat-button'
				aria-controls={this.props['aria-controls']}
				aria-expanded={this.props['aria-expanded']}
				{...extraProps}
			>
				<i style={helpIconStyle} className={'fa fa-question-circle'} role='img' aria-label={_('Help')}></i>
			</button>
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
