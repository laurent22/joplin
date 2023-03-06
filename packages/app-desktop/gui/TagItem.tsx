const React = require('react');
const { connect } = require('react-redux');
import { themeStyle } from '@joplin/lib/theme';
import CommandService from '@joplin/lib/services/CommandService';
import { AppState } from '../app.reducer';

class TagItemComponent extends React.Component {
	public render() {
		const theme = themeStyle(this.props.themeId);
		const style = Object.assign({}, theme.tagStyle);
		const { title, id } = this.props;

		return <button style={style} onClick={() => CommandService.instance().execute('openTag', id)}>{title}</button>;
	}
}

const mapStateToProps = (state: AppState) => {
	return { themeId: state.settings.theme };
};

export default connect(mapStateToProps)(TagItemComponent);
