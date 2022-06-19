// A toolbar for the markdown editor.

const React = require('react');
const { StyleSheet } = require('react-native');
const { ScrollView, View, Text, TouchableHighlight } = require('react-native');
const { useMemo, useState } = require('react');
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import { EditorControl, SelectionFormatting } from './EditorType';

interface ToolbarProps {
	editorControl: EditorControl;
	selectionState: SelectionFormatting;
	themeId: number;
}

interface ToolbarStyleData {
	styleSheet: any;
}

interface ButtonSpec {
	// Either text that will be shown in place of an icon or a component.
	icon: string | typeof View;
	accessibilityLabel: string;

	// True if the button is connected to an enabled action.
	// E.g. the cursor is in a header and the button is a header button.
	active?: boolean;
}

interface MenuItemModel {
	buttonSpec: ButtonSpec;
	onClick: ()=> void;
}

type ClickListener = ()=> void;
type OpenMenuChangeListener = (openMenu: MenuRowType)=> void;

class MenuRowModel {
	public items: MenuItemModel[] = [];
	public submenus: MenuRowModel[] = [];
	public readonly open: boolean;
	public readonly id: MenuRowType;
	private readonly title: string;
	private readonly parent?: MenuRowModel;
	private openMenuChangeListener: OpenMenuChangeListener;

	/**
	 * Creates a MenuRowModel within a [parent]. If the menu is toplevel,
	 * then [parent] should be `undefined` or `null`.
	 *
	 * [title] is used for accessibility and should be a concise description of
	 * the menu. For example, a LaTeX menu might have "LaTeX menu" as its title.
	 */
	public constructor(
		title: string, menuId: MenuRowType,
		currentlyOpenMenu: MenuRowType, parent?: MenuRowModel
	) {
		this.title = title;
		this.open = currentlyOpenMenu == menuId;
		this.id = menuId;
		this.parent = parent;

		const isToplevel = parent == null;
		if (!isToplevel) {
			this.addCloseButton();
		}

		this.setOpenMenuChangeListener(() => {});
	}

	/**
	 * Set the listener to be called when this menu is opened/closed.
	 * If this menu is not a toplevel menu, its onMenuChangeListener calls its
	 * parent's onMenuChangeListener.
	 */
	public setOpenMenuChangeListener(listener: OpenMenuChangeListener) {
		this.openMenuChangeListener = (openMenu: MenuRowType) => {
			this.parent?.openMenuChangeListener(openMenu);
			listener(openMenu);
		};
	}

	/**
	 * Add an action button to the menu.
	 * [spec] specifies the button's content/properties.
	 * [onClick] is called when the button is pressed.
	 */
	public addAction(spec: ButtonSpec, onClick: ClickListener) {
		this.items.push({
			buttonSpec: spec,
			onClick,
		});
	}

	/**
	 * Adds a category button to the menu. Clicking this button toggles a submenu.
	 */
	public addCategory(spec: ButtonSpec, childMenu: MenuRowModel) {
		this.submenus.push(childMenu);
		this.items.push({
			buttonSpec: spec,
			onClick: () => {
				this.openMenuChangeListener(childMenu.id);
			},
		});
	}

	/**
	 * Adds a button that closes this menu and opens the parent.
	 */
	private addCloseButton() {
		const buttonSpec: ButtonSpec = {
			icon: '⨉',
			accessibilityLabel: _('Close %s', this.title),
		};

		this.items.push({
			buttonSpec,
			onClick: () => {
				this.openMenuChangeListener(this.parent.id);
			},
		});
	}
}

const ToolbarButton = ({ styles, spec, onClick }:
		{ styles: ToolbarStyleData; spec: ButtonSpec; onClick: ClickListener }) => {
	const styleSheet = styles.styleSheet;

	// Additional styles if activated
	const activatedStyle = spec.active ? styleSheet.buttonActive : {};
	const activatedTextStyle = spec.active ? styleSheet.buttonActiveContent : {};

	let content;

	if (typeof spec.icon == 'string') {
		content = (
			<Text style={{ ...styleSheet.text, ...activatedTextStyle }}>{spec.icon}</Text>
		);
	} else {
		content = spec.icon;
	}

	return (
		<TouchableHighlight
			style={{ ...styleSheet.button, ...activatedStyle }}
			onPress={onClick}
			accessibilityLabel={spec.accessibilityLabel}>
			{ content }
		</TouchableHighlight>
	);
};

/**
 * A single row in the markdown toolbar, possibly with submenus and subrows.
 */
const ToolbarMenu = ({ styles, model }: { styles: ToolbarStyleData; model: MenuRowModel }) => {
	const buttons: any[] = [];
	const submenus: any[] = [];

	for (const key in model.items) {
		const item = model.items[key];
		buttons.push(
			<ToolbarButton
				key={key.toString()}
				styles={styles}
				onClick={item.onClick}
				spec={item.buttonSpec} />
		);
	}

	for (const key in model.submenus) {
		const submenu = model.submenus[key];
		submenus.push(
			<ToolbarMenu
				key={key.toString()}
				styles={styles}
				model={submenu} />
		);
	}

	const thisMenu = (
		<View style={ styles.styleSheet.toolbar }>
			<ScrollView
				contentContainerStyle={styles.styleSheet.toolbarContent}
				horizontal={true}>
				{buttons}
			</ScrollView>
		</View>
	);

	const submenuContainer = (
		<>
			{submenus}
		</>
	);


	// React wants function calls to happen in the same order, regardless of state. As such,
	// build all menus, regardless of whether model is open.
	return (
		<>
			{model.open ? thisMenu : submenuContainer }
		</>
	);
};

enum MenuRowType {
	RootMenu,
	HeaderMenu,
	ListMenu,
	FormatMenu,
}

const MarkdownToolbar = (props: ToolbarProps) => {
	const styles = useMemo(() => getStyles(props.themeId), [props.themeId]);
	const selState = props.selectionState;
	const editorControl = props.editorControl;
	const [openMenu, setOpenMenu] = useState(MenuRowType.RootMenu);

	const rootMenuModel = new MenuRowModel(_('Markdown Menu'), MenuRowType.RootMenu, openMenu);
	rootMenuModel.setOpenMenuChangeListener((newOpenMenu) => {
		setOpenMenu(newOpenMenu);
	});

	const headerMenuModel = new MenuRowModel(
		_('Header Menu'), MenuRowType.HeaderMenu, openMenu, rootMenuModel
	);
	const listMenuModel = new MenuRowModel(
		_('List Menu'), MenuRowType.ListMenu, openMenu, rootMenuModel
	);
	const miscFormatMenuModel = new MenuRowModel(
		_('Formatting'), MenuRowType.FormatMenu, openMenu, rootMenuModel
	);

	rootMenuModel.addCategory({
		icon: 'H',
		accessibilityLabel: _('Headers'),
		active: selState.headerLevel > 0,
	}, headerMenuModel);

	rootMenuModel.addCategory({
		icon: (
			<Text style={ styles.multiLineIconText }>
				{'1. …\n• …\n3. …'}
			</Text>
		),
		accessibilityLabel: _('Lists'),
		active: selState.listLevel > 0,
	}, listMenuModel);

	rootMenuModel.addCategory({
		icon: (
			<Text style={ styles.multiLineIconText }>
				{'Σ\n {;}\nB'}
			</Text>
		),
		accessibilityLabel: _('Inline formatting'),
	}, miscFormatMenuModel);


	// Header menu
	for (let level = 1; level <= 4; level++) {
		const active = selState.headerLevel == level;
		const label = !active ? _('Create header level %d', level) : _('Remove level %d header');
		headerMenuModel.addAction({
			icon: `H${level}`,
			accessibilityLabel: label,
			active,
		}, () => {
			editorControl.toggleHeaderLevel(level);
		});
	}

	// List menu
	listMenuModel.addAction({
		icon: (
			<Text style={ styles.multiLineIconText }>
				{'•—\n•—\n•—'}
			</Text>
		),
		accessibilityLabel:
			selState.inUnorderedList ? _('Remove unordered list') : _('Create unordered list'),
		active: selState.inUnorderedList,
	}, () => {
		const bulleted = true;
		editorControl.toggleList(bulleted);
	});

	listMenuModel.addAction({
		icon: (
			<Text style={ styles.multiLineIconText }>
				{'1.—\n2.—\n3.—'}
			</Text>
		),
		accessibilityLabel:
			selState.inOrderedList ? _('Remove ordered list') : _('Create ordered list'),
		active: selState.inOrderedList,
	}, () => {
		const bulleted = false;
		editorControl.toggleList(bulleted);
	});


	// Inline formatting
	miscFormatMenuModel.addAction({
		icon: '{;}',
		accessibilityLabel:
			selState.inCode ? _('Remove code formatting') : _('Format as code'),
		active: selState.inCode,
	}, () => {
		editorControl.toggleCode();
	});

	miscFormatMenuModel.addAction({
		icon: '∑',
		accessibilityLabel:
			selState.inMath ? _('Remove TeX region') : _('Create TeX region'),
		active: selState.inMath,
	}, () => {
		editorControl.toggleMath();
	});

	miscFormatMenuModel.addAction({
		icon: (
			<Text
				style={{ ...styles.text, fontWeight: 'bold' }}
			>
				B
			</Text>
		),
		accessibilityLabel:
			selState.bolded ? _('Unbold') : _('Bold text'),
		active: selState.bolded,
	}, () => {
		editorControl.toggleBolded();
	});

	miscFormatMenuModel.addAction({
		icon: (
			<Text style={{ ...styles.text, fontStyle: 'italic' }}>
				I
			</Text>
		),
		accessibilityLabel:
			selState.italicized ? _('Unitalicize') : _('Italicize'),
		active: selState.italicized,
	}, () => {
		editorControl.toggleItalicized();
	});


	return (
		<ToolbarMenu
			styles={{ styleSheet: styles }}
			model={rootMenuModel}
		/>
	);
};

/**
 * Creates a StyleSheet based on the application's theme.
 *
 * This uses react hooks, so should be called in the same places, the same number of times,
 * regardless of state.
 */
const getStyles = (themeId: number): StyleSheet => {
	const BUTTON_SIZE = 75;
	const theme = themeStyle(themeId);

	return StyleSheet.create({
		button: {
			width: BUTTON_SIZE,
			height: BUTTON_SIZE,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: theme.backgroundColor4,
			color: theme.color4,
		},
		buttonActive: {
			backgroundColor: theme.backgroundColor3,
			color: theme.color3,
		},
		buttonActiveContent: {
			color: theme.color3,
		},
		text: {
			fontSize: 22,
			color: theme.color4,
		},
		multiLineIconText: {
			fontSize: 14,
			lineHeight: 10,
			paddingTop: 4,
			color: theme.color4,
		},
		toolbar: {
			flex: 0,
			flexDirection: 'row',
			alignItems: 'baseline',
			justifyContent: 'center',
			height: BUTTON_SIZE,
		},
		toolbarContent: {
			flexGrow: 1,
			justifyContent: 'center',
		},
	});
};

export default MarkdownToolbar;
export { MarkdownToolbar };
