const React = require('react');
const {TouchableOpacity, Text, StyleSheet, ScrollView, View} = require('react-native');
const {connect} = require('react-redux');
const {BaseScreenComponent} = require('../base-screen.js');
const {dialogs} = require('../../utils/dialogs.js');
const Folder = require('@joplin/lib/models/Folder').default;
const Icon = require('react-native-vector-icons/Ionicons').default;
const {themeStyle} = require('../global-style.js');
const shared = require('@joplin/lib/components/shared/side-menu-shared.js');


class MoveNotebookScreenComponent extends BaseScreenComponent {
    constructor() {
        super();
        this.styles_ = {};

        this.renderFolderItem = this.renderFolderItem.bind(this);
    }

    styles() {
        const theme = themeStyle(this.props.themeId);

        if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
        this.styles_ = {};

        const styles = {
            menu: {
                flex: 1,
                backgroundColor: theme.backgroundColor,
            },
            button: {
                flex: 1,
                flexDirection: 'row',
                height: 36,
                alignItems: 'center',
                paddingLeft: theme.marginLeft,
                paddingRight: theme.marginRight,
            },
            buttonText: {
                flex: 1,
                color: theme.color,
                paddingLeft: 10,
                fontSize: theme.fontSize,
            },
            sidebarIcon: {
                fontSize: 22,
                color: theme.color,
            },
        };

        styles.folderButton = Object.assign({}, styles.button);
        styles.folderButton.paddingLeft = 0;
        styles.folderButtonText = Object.assign({}, styles.buttonText);
        styles.folderButtonSelected = Object.assign({}, styles.folderButton);
        styles.folderButtonSelected.backgroundColor = theme.selectedColor;
        styles.folderIcon = Object.assign({}, theme.icon);
        styles.folderIcon.color = theme.colorFaded; // '#0072d5';
        styles.folderIcon.paddingTop = 3;

        styles.sideButton = Object.assign({}, styles.button, {flex: 0});
        styles.sideButtonSelected = Object.assign({}, styles.sideButton, {backgroundColor: theme.selectedColor});
        styles.sideButtonText = Object.assign({}, styles.buttonText);
        styles.sideButtonTextBold = Object.assign({}, styles.buttonText, {fontWeight: 'bold'});

        this.styles_[this.props.themeId] = StyleSheet.create(styles);
        return this.styles_[this.props.themeId];
    }

    folder_press(folder) {
        Folder.moveToFolder(this.props.selectedFolderId, folder.id).then(() => {
            this.props.dispatch({
                type: 'NAV_BACK',
            });
        }).catch((error) => {
            dialogs.error(this, error.message);
        });
    }

    folder_togglePress(folder) {
        this.props.dispatch({
            type: 'FOLDER_TOGGLE',
            id: folder.id,
        });
    }

    rootfolder_press() {
        Folder.moveToFolder(this.props.selectedFolderId, '').then(() => {
            this.props.dispatch({
                type: 'NAV_BACK',
            });
        }).catch((error) => {
            dialogs.error(this, error.message);
        });
    }

    renderFolderItem(folder, selected, hasChildren, depth) {
        const theme = themeStyle(this.props.themeId);

        const folderButtonStyle = {
            flex: 1,
            flexDirection: 'row',
            height: 36,
            alignItems: 'center',
            paddingRight: theme.marginRight,
        };
        if (selected) folderButtonStyle.backgroundColor = theme.selectedColor;
        folderButtonStyle.paddingLeft = depth * 10 + theme.marginLeft;

        const iconWrapperStyle = {paddingLeft: 10, paddingRight: 10};
        if (selected) iconWrapperStyle.backgroundColor = theme.selectedColor;

        let iconWrapper = null;

        const iconName = this.props.collapsedFolderIds.indexOf(folder.id) >= 0 ? 'chevron-down' : 'chevron-up';
        const iconComp = <Icon name={iconName} style={this.styles().folderIcon}/>;

        iconWrapper = !hasChildren ? null : (
            <TouchableOpacity
                style={iconWrapperStyle}
                folderid={folder.id}
                onPress={() => {
                    if (hasChildren) this.folder_togglePress(folder);
                }}
            >
                {iconComp}
            </TouchableOpacity>
        );

        return (
            <View key={folder.id} style={{flex: 1, flexDirection: 'row'}}>
                <TouchableOpacity
                    style={{flex: 1}}
                    onPress={() => {
                        this.folder_press(folder);
                    }}
                >
                    <View style={folderButtonStyle}>
                        <Text numberOfLines={1} style={this.styles().folderButtonText}>
                            {Folder.displayTitle(folder)}
                        </Text>
                    </View>
                </TouchableOpacity>
                {iconWrapper}
            </View>
        );
    }

    makeDivider(key) {
        const theme = themeStyle(this.props.themeId);
        return <View style={{
            marginTop: 15,
            marginBottom: 15,
            flex: -1,
            borderBottomWidth: 1,
            borderBottomColor: theme.dividerColor
        }} key={key}></View>;
    }

    render() {
        let items = [];

        const theme = themeStyle(this.props.themeId);

        // HACK: inner height of ScrollView doesn't appear to be calculated correctly when
        // using padding. So instead creating blank elements for padding bottom and top.
        items.push(<View style={{height: theme.marginTop}} key="bottom_top_hack"/>);

        items.push(
            <View key={'folder_header'} style={{flex: 1, flexDirection: 'row', alignSelf: 'center'}}>
                <View key={'folder_header'}>
                    <Text style={this.styles().sideButtonTextBold}>{'Choose Notebook'}</Text>
                </View>
            </View>
        );

        items.push(this.makeDivider('divider_all'));

        items.push(
            <View key={'root'} style={{flex: 1, flexDirection: 'row'}}>
                <Icon name={'folder-open-outline'} style={this.styles().sidebarIcon}/>
                <TouchableOpacity key={'root'} onPress={() => this.rootfolder_press()}>
                    <View key={'root'}>
                        <Text style={this.styles().sideButtonText}>{'Root Folder'}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        );

        if (this.props.folders.length) {
            const result = shared.renderFolders(this.props, this.renderFolderItem, false);
            const folderItems = result.items;
            items = items.concat(folderItems);
        }

        const style = {
            flex: 1,
            borderRightWidth: 1,
            borderRightColor: theme.dividerColor,
            backgroundColor: theme.backgroundColor,
        };

        return (
            <View style={style}>
                <View style={{flex: 1, opacity: this.props.opacity}}>
                    <ScrollView scrollsToTop={false} style={this.styles().menu}>
                        {items}
                    </ScrollView>
                </View>
                <dialogs.DialogBox
                    ref={dialogbox => {
                        this.dialogbox = dialogbox;
                    }}
                />
            </View>
        );
    }
}

const MoveNotebookScreen = connect(state => {
    return {
        folders: state.folders,
        selectedFolderId: state.selectedFolderId,
        notesParentType: state.notesParentType,
        themeId: state.settings.theme,
        // Don't do the opacity animation as it means re-rendering the list multiple times
        // opacity: state.sideMenuOpenPercent,
        collapsedFolderIds: state.collapsedFolderIds,
    };
})(MoveNotebookScreenComponent);

module.exports = {MoveNotebookScreen};
