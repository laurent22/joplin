const React = require('react');
const styleSelector = require('./style/ConfigMenuBar');
const Setting = require('lib/models/Setting');

function ConfigMenuBarButton(props) {
	const style = styleSelector(null, props);

	const iconStyle = props.selected ? style.buttonIconSelected : style.buttonIcon;
	const labelStyle = props.selected ? style.buttonLabelSelected : style.buttonLabel;

	return (
		<button style={style.button} onClick={props.onClick}>
			<i style={iconStyle} className={props.iconName}></i>
			<span style={labelStyle}>{props.label}</span>
		</button>
	);
}

function ConfigMenuBar(props) {
	const buttons = [];

	const style = styleSelector(null, props);

	for (const section of props.sections) {
		buttons.push(<ConfigMenuBarButton
			selected={props.selection === section.name}
			theme={props.theme}
			key={section.name}
			iconName={Setting.sectionNameToIcon(section.name)}
			label={Setting.sectionNameToLabel(section.name)}
			onClick={() => { props.onSelectionChange({ section: section }); }}
		/>);
	}

	return (
		<div style={style.root} className="config-menu-bar">
			<div style={style.barButtons}>
				{buttons}
			</div>
		</div>
	);
}

module.exports = ConfigMenuBar;
