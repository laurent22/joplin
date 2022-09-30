import ToolbarButton from './ToolbarButton/ToolbarButton';
import ToggleEditorsButton, {
	Value,
} from './ToggleEditorsButton/ToggleEditorsButton';
import React = require('react');
import { connect } from 'react-redux';
import { themeStyle } from '@joplin/lib/theme';
const ToolbarSpace = require('./ToolbarSpace.min.js');
const HorizontalScroll = require('react-scroll-horizontal');

interface Props {
	themeId: number;
	style: any;
	items: any[];
}

function ToolbarBaseComponent(Props: Props) {
	const parentRef = React.useRef<HTMLDivElement>(null);
	const childRef = React.useRef<HTMLDivElement>(null);
	const [horizScroll, setHorizScroll] = React.useState(false);

	React.useEffect(() => {
		if (childRef.current?.clientWidth > parentRef.current?.clientWidth) {
			setHorizScroll(true);
		}
		window?.addEventListener('resize', () => {
			setTimeout(() => {
				if (
					childRef.current?.clientWidth >
					parentRef.current?.clientWidth
				) {
					setHorizScroll(true);
				} else {
					setHorizScroll(false);
					setTimeout(() => {
						if (
							childRef.current?.clientWidth >
							parentRef.current?.clientWidth
						) {
							setHorizScroll(true);
						}
					}, 0);
				}
			}, 0);
		});
	}, []);

	const theme = themeStyle(Props.themeId);
	const style: any = Object.assign(
		{
			display: 'flex',
			flexDirection: 'row',
			boxSizing: 'border-box',
			backgroundColor: theme.backgroundColor3,
			padding: theme.toolbarPadding,
			paddingRight: theme.mainPadding,
			overflow: 'hidden',
		},
		Props.style
	);
	const groupStyle: any = {
		display: 'flex',
		flexDirection: 'row',
		boxSizing: 'border-box',
	};
	const leftItemComps: any[] = [];
	const centerItemComps: any[] = [];
	const rightItemComps: any[] = [];
	if (Props.items) {
		for (let i = 0; i < Props.items.length; i++) {
			const o = Props.items[i];
			let key = o.iconName ? o.iconName : '';
			key += o.title ? o.title : '';
			key += o.name ? o.name : '';
			const itemType = !('type' in o) ? 'button' : o.type;
			if (!key) key = `${o.type}_${i}`;
			const props = Object.assign(
				{
					key: key,
					themeId: Props.themeId,
				},
				o
			);
			if (o.name === 'toggleEditors') {
				rightItemComps.push(
					<ToggleEditorsButton
						key={o.name}
						value={Value.Markdown}
						themeId={Props.themeId}
						toolbarButtonInfo={o}
					/>
				);
			} else if (itemType === 'button') {
				const target = [
					'historyForward',
					'historyBackward',
					'toggleExternalEditing',
				].includes(o.name)
					? leftItemComps
					: centerItemComps;
				target.push(<ToolbarButton {...props} />);
			} else if (itemType === 'separator') {
				centerItemComps.push(<ToolbarSpace {...props} />);
			}
		}
	}

	const children = [
		<div style={groupStyle}>{leftItemComps}</div>,
		<div style={groupStyle}>{centerItemComps}</div>,
		<div
			style={Object.assign({}, groupStyle, {
				flex: 1,
				justifyContent: 'flex-end',
			})}
		>
			{rightItemComps}
		</div>,
	];

	const childStyle = { display: 'flex' };

	return (
		<div className="editor-toolbar" ref={parentRef} style={style}>
			{horizScroll ? (
				<HorizontalScroll reverseScroll style={childStyle}>
					{children}
				</HorizontalScroll>
			) : (
				<div ref={childRef} style={childStyle}>
					{children}
				</div>
			)}
		</div>
	);
}

const mapStateToProps = (state: any) => {
	return { themeId: state.settings.theme };
};

export default connect(mapStateToProps)(ToolbarBaseComponent);
