import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';

interface Props {
	themeId: number;
	onNext: Function;
	onPrevious: Function;
	onClose: Function;
	onChange: Function;
	query: string;
	searching: boolean;
	resultCount: number;
	selectedIndex: number;
	visiblePanes: string[];
	style: any;
}

class NoteSearchBar extends React.Component<Props> {

	private backgroundColor: any;

	public constructor(props: Props) {
		super(props);

		this.searchInput_change = this.searchInput_change.bind(this);
		this.searchInput_keyDown = this.searchInput_keyDown.bind(this);
		this.previousButton_click = this.previousButton_click.bind(this);
		this.nextButton_click = this.nextButton_click.bind(this);
		this.closeButton_click = this.closeButton_click.bind(this);
		this.focus = this.focus.bind(this);

		this.backgroundColor = undefined;
	}

	public style() {
		const theme = themeStyle(this.props.themeId);

		const style = {
			root: Object.assign({}, theme.textStyle, {
				backgroundColor: theme.backgroundColor,
				color: theme.colorFaded,
			}),
		};

		return style;
	}

	public buttonIconComponent(iconName: string, clickHandler: any, isEnabled: boolean) {
		const theme = themeStyle(this.props.themeId);

		const searchButton = {
			paddingLeft: 4,
			paddingRight: 4,
			paddingTop: 2,
			paddingBottom: 2,
			textDecoration: 'none',
			marginRight: 5,
		};

		const iconStyle = {
			display: 'flex',
			fontSize: Math.round(theme.fontSize) * 1.2,
			color: theme.color,
			opacity: isEnabled ? 1.0 : theme.disabledOpacity,
		};

		const icon = <i style={iconStyle} className={`fas ${iconName}`}></i>;

		return (
			<a href="#" style={searchButton} onClick={clickHandler}>
				{icon}
			</a>
		);
	}

	private searchInput_change(event: any) {
		const query = event.currentTarget.value;
		this.triggerOnChange(query);
	}

	private searchInput_keyDown(event: any) {
		if (event.keyCode === 13) {
			// ENTER
			event.preventDefault();

			if (!event.shiftKey) {
				if (this.props.onNext) this.props.onNext();
			} else {
				if (this.props.onPrevious) this.props.onPrevious();
			}
		}

		if (event.keyCode === 27) {
			// ESCAPE
			event.preventDefault();

			if (this.props.onClose) this.props.onClose();
		}

		if (event.keyCode === 70) {
			// F key
			if (event.ctrlKey) {
				event.target.select();
			}
		}
	}

	private previousButton_click() {
		if (this.props.onPrevious) this.props.onPrevious();
	}

	private nextButton_click() {
		if (this.props.onNext) this.props.onNext();
	}

	private closeButton_click() {
		if (this.props.onClose) this.props.onClose();
	}

	public triggerOnChange(query: string) {
		if (this.props.onChange) this.props.onChange(query);
	}

	public focus() {
		(this.refs.searchInput as any).focus();
		(this.refs.searchInput as any).select();
	}

	public render() {
		const query = this.props.query ? this.props.query : '';

		// backgroundColor needs to cached to a local variable to prevent the
		// colour from blinking.
		// For more info: https://github.com/laurent22/joplin/pull/2329#issuecomment-578376835
		const theme = themeStyle(this.props.themeId);
		if (!this.props.searching) {
			if (this.props.resultCount === 0 && query.length > 0) {
				this.backgroundColor = theme.warningBackgroundColor;
			} else {
				this.backgroundColor = theme.backgroundColor;
			}
		}
		if (this.backgroundColor === undefined) {
			this.backgroundColor = theme.backgroundColor;
		}
		const buttonEnabled = (this.backgroundColor === theme.backgroundColor);

		const closeButton = this.buttonIconComponent('fa-times', this.closeButton_click, true);
		const previousButton = this.buttonIconComponent('fa-chevron-up', this.previousButton_click, buttonEnabled);
		const nextButton = this.buttonIconComponent('fa-chevron-down', this.nextButton_click, buttonEnabled);

		const textStyle = Object.assign({
			fontSize: theme.fontSize,
			fontFamily: theme.fontFamily,
			color: theme.colorFaded,
			backgroundColor: theme.backgroundColor,
		});

		const matchesFoundString = (query.length > 0) ? (
			<div style={textStyle}>
				{`${this.props.resultCount === 0 ? 0 : this.props.selectedIndex + 1} / ${this.props.resultCount}`}
			</div>
		) : null;

		const allowScrolling = this.props.visiblePanes.indexOf('editor') >= 0;

		const viewerWarning = (
			<div style={textStyle}>
				{'Jumping between matches is not available in the viewer, please toggle the editor'}
			</div>
		);

		return (
			<div className="note-search-bar" style={this.props.style}>
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					{closeButton}
					<input
						placeholder={_('Search...')}
						value={query}
						onChange={this.searchInput_change}
						onKeyDown={this.searchInput_keyDown}
						ref="searchInput"
						type="text"
						style={{ width: 200, marginRight: 5, backgroundColor: this.backgroundColor, color: theme.color }}
					/>
					{allowScrolling ? previousButton : null}
					{allowScrolling ? nextButton : null}
					{allowScrolling ? matchesFoundString : null}
					{!allowScrolling ? viewerWarning : null}
				</div>
			</div>
		);
	}
}

export default NoteSearchBar;
