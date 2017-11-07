const React = require('react');
const { connect } = require('react-redux');
const { Header } = require('./Header.min.js');
const { SideBar } = require('./SideBar.min.js');
const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');
const { themeStyle } = require('../theme.js');
const layoutUtils = require('lib/layout-utils.js');

class MainScreenComponent extends React.Component {

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

		const headerStyle = {
			width: style.width,
		};

		const rowHeight = style.height - theme.headerHeight;

		const sideBarStyle = {
			width: layoutUtils.size(style.width * .2, 100, 300),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteListStyle = {
			width: layoutUtils.size(style.width * .2, 100, 300),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteTextStyle = {
			width: layoutUtils.size(style.width - sideBarStyle.width - noteListStyle.width, 0),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		return (
			<div style={style}>
				<Header style={headerStyle} showBackButton={false} />
				<SideBar style={sideBarStyle} />
				<NoteList itemHeight={40} style={noteListStyle} />
				<NoteText style={noteTextStyle} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.theme,
	};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };