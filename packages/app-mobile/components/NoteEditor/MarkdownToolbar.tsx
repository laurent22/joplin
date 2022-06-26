// A toolbar for the markdown editor.

const React = require('react');
const { StyleSheet } = require('react-native');
const { ScrollView, View, Text, TouchableHighlight } = require('react-native');
const { useMemo, useState } = require('react');
const AntIcon = require('react-native-vector-icons/AntDesign').default;
const FontAwesomeIcon = require('react-native-vector-icons/FontAwesome5').default;
const MaterialIcon = require('react-native-vector-icons/MaterialIcons').default;
import { _ } from '@joplin/lib/locale';
import { useEffect } from 'react';
import { Keyboard } from 'react-native';
import { EditorControl, EditorSettings, SelectionFormatting, ListType } from './EditorType';

interface ToolbarProps {
	editorControl: EditorControl;
	selectionState: SelectionFormatting;
	editorSettings: EditorSettings;
	style?: any;
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
			accessibilityLabel={spec.accessibilityLabel}
			accessibilityRole="button">
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
	ViewMenu,
}

const MarkdownToolbar = (props: ToolbarProps) => {
	const themeData = props.editorSettings.themeData;
	const styles = useMemo(() => getStyles(props.style, themeData), [themeData, props.style]);
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
	const actionsMenuModel = new MenuRowModel(
		_('View'), MenuRowType.ViewMenu, openMenu, rootMenuModel
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
		active: selState.inCode || selState.bolded || selState.italicized || selState.inMath,
	}, miscFormatMenuModel);

	rootMenuModel.addCategory({
		icon: (
			<MaterialIcon name="settings" style={styles.text}/>
		),
		accessibilityLabel: _('Editor options'),
	}, actionsMenuModel);


	// Header menu
	for (let level = 1; level <= 5; level++) {
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
			<FontAwesomeIcon name="list-ul" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inUnorderedList ? _('Remove unordered list') : _('Create unordered list'),
		active: selState.inUnorderedList,
	}, () => {
		editorControl.toggleList(ListType.UnorderedList);
	});

	listMenuModel.addAction({
		icon: (
			<FontAwesomeIcon name="list-ol" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inOrderedList ? _('Remove ordered list') : _('Create ordered list'),
		active: selState.inOrderedList,
	}, () => {
		editorControl.toggleList(ListType.OrderedList);
	});

	listMenuModel.addAction({
		icon: (
			<FontAwesomeIcon name="tasks" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inChecklist ? _('Remove task list') : _('Create task list'),
		active: selState.inChecklist,
	}, () => {
		editorControl.toggleList(ListType.CheckList);
	});

	listMenuModel.addAction({
		icon: (
			<AntIcon name="indent-left" style={styles.text}/>
		),
		accessibilityLabel: _('Decrease indent level'),
	}, () => {
		editorControl.decreaseIndent();
	});

	listMenuModel.addAction({
		icon: (
			<AntIcon name="indent-right" style={styles.text}/>
		),
		accessibilityLabel: _('Increase indent level'),
	}, () => {
		editorControl.increaseIndent();
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

	if (props.editorSettings.katexEnabled) {
		miscFormatMenuModel.addAction({
			icon: '∑',
			accessibilityLabel:
				selState.inMath ? _('Remove TeX region') : _('Create TeX region'),
			active: selState.inMath,
		}, () => {
			editorControl.toggleMath();
		});
	}

	miscFormatMenuModel.addAction({
		icon: (
			<FontAwesomeIcon name="bold" style={styles.text}/>
		),
		accessibilityLabel:
			selState.bolded ? _('Unbold') : _('Bold text'),
		active: selState.bolded,
	}, () => {
		editorControl.toggleBolded();
	});

	miscFormatMenuModel.addAction({
		icon: (
			<FontAwesomeIcon name="italic" style={styles.text}/>
		),
		accessibilityLabel:
			selState.italicized ? _('Unitalicize') : _('Italicize'),
		active: selState.italicized,
	}, () => {
		editorControl.toggleItalicized();
	});

	miscFormatMenuModel.addAction({
		icon: (
			<FontAwesomeIcon name="link" style={styles.text}/>
		),
		accessibilityLabel:
			selState.inLink ? _('Edit link') : _('Create link'),
		active: selState.inLink,
	}, () => {
		editorControl.showLinkDialog();
	});


	// Actions
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	useEffect(() => {
		const showListener = Keyboard.addListener('keyboardDidShow', () => {
			setKeyboardVisible(true);
		});
		const hideListener = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardVisible(false);
		});

		return (() => {
			showListener.remove();
			hideListener.remove();
		});
	});

	if (keyboardVisible) {
		actionsMenuModel.addAction({
			icon: (
				<MaterialIcon name="keyboard-hide" style={styles.text}/>
			),
			accessibilityLabel: _('Hide keyboard'),
		}, () => {
			// Keyboard.dismiss() doesn't dismiss the keyboard if it's editing the WebView.
			// As such, dismiss the keyboard by sending a message to the View.
			editorControl.hideKeyboard();
		});
	}

	actionsMenuModel.addAction({
		icon: (
			<MaterialIcon name="search" style={styles.text}/>
		),
		accessibilityLabel: _('Find and replace'),
	}, () => {
		editorControl.toggleFindDialog();
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
 * [styleProps] are user-supplied style properties, which apply to the root toolbar element.
 *
 * This uses react hooks, so should be called in the same places, the same number of times,
 * regardless of state.
 */
const getStyles = (styleProps: any, theme: any): StyleSheet => {
	const BUTTON_SIZE = 56;

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

			...styleProps,
		},
		toolbarContent: {
			flexGrow: 1,
			justifyContent: 'center',
		},
	});
};

export default MarkdownToolbar;
export { MarkdownToolbar };
