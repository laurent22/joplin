"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigScreenComponent = void 0;
const React = require("react");
const Sidebar_1 = require("./Sidebar");
const ButtonBar_1 = require("./ButtonBar");
const Button_1 = require("../Button/Button");
const locale_1 = require("@joplin/lib/locale");
const bridge_1 = require("../../services/bridge");
const Setting_1 = require("@joplin/lib/models/Setting");
const EncryptionConfigScreen_1 = require("../EncryptionConfigScreen/EncryptionConfigScreen");
const registry_1 = require("@joplin/lib/registry");
const { connect } = require('react-redux');
const theme_1 = require("@joplin/lib/theme");
const SyncTargetRegistry_1 = require("@joplin/lib/SyncTargetRegistry");
const shared = require("@joplin/lib/components/shared/config/config-shared.js");
const ClipperConfigScreen_1 = require("../ClipperConfigScreen");
const restart_1 = require("../../services/restart");
const JoplinCloudConfigScreen_1 = require("../JoplinCloudConfigScreen");
const ToggleAdvancedSettingsButton_1 = require("./controls/ToggleAdvancedSettingsButton");
const shouldShowMissingPasswordWarning_1 = require("@joplin/lib/components/shared/config/shouldShowMissingPasswordWarning");
const MissingPasswordHelpLink_1 = require("./controls/MissingPasswordHelpLink");
const { KeymapConfigScreen } = require('../KeymapConfig/KeymapConfigScreen');
const SettingComponent_1 = require("./controls/SettingComponent");
const shim_1 = require("@joplin/lib/shim");
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
class ConfigScreenComponent extends React.Component {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(props) {
        super(props);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.rowStyle_ = null;
        this.onUpdateSettingValue = ({ key, value }) => {
            const md = Setting_1.default.settingMetadata(key);
            if (md.needRestart) {
                this.setState({ needRestart: true });
            }
            shared.updateSettingValue(this, key, value);
        };
        shared.init(registry_1.reg);
        this.state = Object.assign(Object.assign({}, shared.defaultScreenState), { selectedSectionName: 'general', screenName: '', changedSettingKeys: [], needRestart: false, fonts: [], searchQuery: '', searching: false });
        this.rowStyle_ = {
            marginBottom: 10,
        };
        this.sidebar_selectionChange = this.sidebar_selectionChange.bind(this);
        this.checkSyncConfig_ = this.checkSyncConfig_.bind(this);
        this.onCancelClick = this.onCancelClick.bind(this);
        this.onSaveClick = this.onSaveClick.bind(this);
        this.onApplyClick = this.onApplyClick.bind(this);
        this.handleSettingButton = this.handleSettingButton.bind(this);
        this.setSearchQuery = this.setSearchQuery.bind(this);
        this.clearSearch = this.clearSearch.bind(this);
    }
    async checkSyncConfig_() {
        if (this.state.settings['sync.target'] === SyncTargetRegistry_1.default.nameToId('joplinCloud')) {
            const isAuthenticated = await registry_1.reg.syncTarget().isAuthenticated();
            if (!isAuthenticated) {
                return this.props.dispatch({
                    type: 'NAV_GO',
                    routeName: 'JoplinCloudLogin',
                });
            }
        }
        await shared.checkSyncConfig(this, this.state.settings);
    }
    setSearchQuery(query) {
        this.setState({ searchQuery: query, searching: query.length > 0 });
    }
    clearSearch() {
        this.setState({ searchQuery: '', searching: false });
    }
    matchesSearchQuery(relatedText) {
        if (!this.state.searchQuery)
            return true;
        if (!relatedText)
            return false;
        return String(relatedText).toLowerCase().includes(this.state.searchQuery.toLowerCase());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter and forEach loop
    getFilteredSections(sections) {
        if (!this.state.searchQuery) {
            return sections;
        }
        return sections.filter(section => {
            // Check if section name matches
            if (this.matchesSearchQuery(section.name))
                return true;
            // Check if any metadata (label or description) matches
            for (const md of section.metadatas) {
                if (this.matchesSearchQuery(md.label) || this.matchesSearchQuery(md.description)) {
                    return true;
                }
            }
            return false;
        });
    }
    UNSAFE_componentWillMount() {
        this.setState({ settings: this.props.settings });
    }
    async componentDidMount() {
        if (this.props.defaultSection) {
            this.setState({ selectedSectionName: this.props.defaultSection }, () => {
                void this.switchSection(this.props.defaultSection);
            });
        }
        const fonts = (await window.queryLocalFonts()).map((font) => font.family);
        const uniqueFonts = [...new Set(fonts)];
        this.setState({ fonts: uniqueFonts });
    }
    async handleSettingButton(key) {
        if (key === 'sync.clearLocalSyncStateButton') {
            if (!await shim_1.default.showConfirmationDialog('This cannot be undone. Do you want to continue?'))
                return;
            Setting_1.default.setValue('sync.startupOperation', Setting_1.SyncStartupOperation.ClearLocalSyncState);
            await Setting_1.default.saveAll();
            await (0, restart_1.default)();
        }
        else if (key === 'sync.clearLocalDataButton') {
            if (!await shim_1.default.showConfirmationDialog('This cannot be undone. Do you want to continue?'))
                return;
            Setting_1.default.setValue('sync.startupOperation', Setting_1.SyncStartupOperation.ClearLocalData);
            await Setting_1.default.saveAll();
            await (0, restart_1.default)();
        }
        else if (key === 'ocr.clearLanguageDataCacheButton') {
            if (!await shim_1.default.showConfirmationDialog(this.restartMessage()))
                return;
            Setting_1.default.setValue('ocr.clearLanguageDataCache', true);
            await (0, restart_1.default)();
        }
        else if (key === 'sync.openSyncWizard') {
            this.props.dispatch({
                type: 'DIALOG_OPEN',
                name: 'syncWizard',
            });
        }
        else {
            throw new Error(`Unhandled key: ${key}`);
        }
    }
    sectionByName(name) {
        const sections = shared.settingsSections({ device: Setting_1.AppType.Desktop, settings: this.state.settings });
        for (const section of sections) {
            if (section.name === name)
                return section;
        }
        throw new Error(`Invalid section name: ${name}`);
    }
    screenFromName(screenName) {
        if (screenName === 'encryption')
            return React.createElement(EncryptionConfigScreen_1.default, null);
        if (screenName === 'server')
            return React.createElement(ClipperConfigScreen_1.default, { themeId: this.props.themeId });
        if (screenName === 'keymap')
            return React.createElement(KeymapConfigScreen, { themeId: this.props.themeId });
        if (screenName === 'joplinCloud')
            return React.createElement(JoplinCloudConfigScreen_1.default, null);
        throw new Error(`Invalid screen name: ${screenName}`);
    }
    async switchSection(name) {
        const section = this.sectionByName(name);
        let screenName = '';
        if (section.isScreen) {
            screenName = section.name;
            if (this.hasChanges()) {
                const answer = await shim_1.default.showMessageBox((0, locale_1._)('This will open a new screen. Save your current changes?'), {
                    type: shim_1.MessageBoxType.Confirm,
                    buttons: [(0, locale_1._)('Save changes'), (0, locale_1._)('Discard changes')],
                    defaultId: 0,
                    cancelId: 1,
                });
                if (answer === 0) {
                    await shared.saveSettings(this);
                }
            }
        }
        this.setState({ selectedSectionName: section.name, screenName: screenName });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    sidebar_selectionChange(event) {
        void this.switchSection(event.section.name);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    renderSectionDescription(section) {
        const description = Setting_1.default.sectionDescription(section.name, Setting_1.AppType.Desktop);
        if (!description)
            return null;
        const theme = (0, theme_1.themeStyle)(this.props.themeId);
        return (React.createElement("div", { style: Object.assign(Object.assign({}, theme.textStyle), { marginBottom: 15 }) }, description));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    sectionToComponent(key, section, settings, selected) {
        const theme = (0, theme_1.themeStyle)(this.props.themeId);
        const createSettingComponents = (advanced) => {
            const output = [];
            for (let i = 0; i < section.metadatas.length; i++) {
                const md = section.metadatas[i];
                if (!!md.advanced !== advanced)
                    continue;
                if (!this.matchesSearchQuery(md.label) && !this.matchesSearchQuery(md.description))
                    continue;
                const settingComp = this.settingToComponent(md.key, settings[md.key]);
                output.push(settingComp);
            }
            return output;
        };
        const settingComps = createSettingComponents(false);
        const advancedSettingComps = createSettingComponents(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const sectionWidths = {
            plugins: '100%',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const sectionStyle = {
            marginTop: 20,
            marginBottom: 20,
            maxWidth: sectionWidths[section.name] ? sectionWidths[section.name] : 640,
        };
        if (!selected)
            sectionStyle.display = 'none';
        if (section.name === 'general') {
            sectionStyle.borderTopWidth = 0;
        }
        if (section.name === 'sync') {
            const syncTargetMd = SyncTargetRegistry_1.default.idToMetadata(settings['sync.target']);
            const statusStyle = Object.assign(Object.assign({}, theme.textStyle), { marginTop: 10 });
            const warningStyle = Object.assign(Object.assign({}, theme.textStyle), { color: theme.colorWarn });
            // Don't show the missing password warning if the user just changed the sync target (but hasn't
            // saved yet).
            const matchesSavedTarget = settings['sync.target'] === this.props.settings['sync.target'];
            if (matchesSavedTarget && (0, shouldShowMissingPasswordWarning_1.default)(settings['sync.target'], settings)) {
                settingComps.push(React.createElement("p", { key: 'missing-password-warning', style: warningStyle },
                    (0, locale_1._)('%s: Missing password.', (0, locale_1._)('Warning')),
                    ' ',
                    React.createElement(MissingPasswordHelpLink_1.default, { theme: theme, text: (0, locale_1._)('Help') })));
            }
            if (syncTargetMd.supportsConfigCheck) {
                const messages = shared.checkSyncConfigMessages(this);
                const statusComp = !messages.length ? null : (React.createElement("div", { style: statusStyle, "aria-live": 'polite' },
                    messages[0],
                    messages.length >= 1 ? React.createElement("p", null, messages[1]) : null));
                if (settings['sync.target'] === SyncTargetRegistry_1.default.nameToId('joplinCloud')) {
                    const goToJoplinCloudLogin = () => {
                        this.props.dispatch({
                            type: 'NAV_GO',
                            routeName: 'JoplinCloudLogin',
                        });
                    };
                    settingComps.push(React.createElement("div", { key: "connect_to_joplin_cloud_button", style: this.rowStyle_ },
                        React.createElement(Button_1.default, { title: (0, locale_1._)('Connect to Joplin Cloud'), level: Button_1.ButtonLevel.Primary, onClick: goToJoplinCloudLogin })));
                }
                if (settings['sync.target'] === SyncTargetRegistry_1.default.nameToId('joplinServerSaml')) {
                    const server = settings['sync.11.path'];
                    const goToSamlLogin = async () => {
                        // Save settings to allow SAML auth with the correct URL.
                        await shared.saveSettings(this);
                        this.props.dispatch({
                            type: 'NAV_GO',
                            routeName: 'JoplinServerSamlLogin',
                        });
                    };
                    settingComps.push(React.createElement("div", { key: "connect_to_joplin_server_saml_button", style: this.rowStyle_ },
                        React.createElement(Button_1.default, { title: (0, locale_1._)('Connect using your organisation account'), level: Button_1.ButtonLevel.Primary, onClick: goToSamlLogin, disabled: !server || (server === null || server === void 0 ? void 0 : server.trim().length) === 0 })));
                }
                settingComps.push(React.createElement("div", { key: "check_sync_config_button", style: this.rowStyle_ },
                    React.createElement(Button_1.default, { title: (0, locale_1._)('Check synchronisation configuration'), level: Button_1.ButtonLevel.Secondary, disabled: this.state.checkSyncConfigResult === 'checking', onClick: this.checkSyncConfig_ }),
                    statusComp));
            }
        }
        let advancedSettingsButton = null;
        const advancedSettingsSectionStyle = { display: 'none' };
        const advancedSettingsGroupId = `advanced_settings_${key}`;
        if (advancedSettingComps.length) {
            advancedSettingsButton = (React.createElement(ToggleAdvancedSettingsButton_1.default, { onClick: () => shared.advancedSettingsButton_click(this), advancedSettingsVisible: this.state.showAdvancedSettings, "aria-controls": advancedSettingsGroupId }));
            advancedSettingsSectionStyle.display = this.state.showAdvancedSettings ? 'block' : 'none';
        }
        return (React.createElement("div", { key: key, style: sectionStyle },
            this.renderSectionDescription(section),
            React.createElement("div", null, settingComps),
            advancedSettingsButton,
            React.createElement("div", { style: advancedSettingsSectionStyle, id: advancedSettingsGroupId, role: 'group' }, advancedSettingComps)));
    }
    settingToComponent(key, value) {
        return (React.createElement(SettingComponent_1.default, { themeId: this.props.themeId, key: key, settingKey: key, value: value, fonts: this.state.fonts, onUpdateSettingValue: this.onUpdateSettingValue, onSettingButtonClick: this.handleSettingButton }));
    }
    restartMessage() {
        return (0, locale_1._)('The application must be restarted for these changes to take effect.');
    }
    async restartApp() {
        await Setting_1.default.saveAll();
        await (0, restart_1.default)();
    }
    async checkNeedRestart() {
        if (this.state.needRestart) {
            const doItNow = await (0, bridge_1.default)().showConfirmMessageBox(this.restartMessage(), {
                buttons: [(0, locale_1._)('Do it now'), (0, locale_1._)('Later')],
            });
            if (doItNow)
                await this.restartApp();
        }
    }
    async onApplyClick() {
        const done = await shared.saveSettings(this);
        if (!done)
            return;
        await this.checkNeedRestart();
    }
    async onSaveClick() {
        const done = await shared.saveSettings(this);
        if (!done)
            return;
        await this.checkNeedRestart();
        this.props.dispatch({ type: 'NAV_BACK' });
    }
    onCancelClick() {
        this.props.dispatch({ type: 'NAV_BACK' });
    }
    hasChanges() {
        return !!this.state.changedSettingKeys.length;
    }
    render() {
        const theme = (0, theme_1.themeStyle)(this.props.themeId);
        const style = Object.assign(Object.assign({}, this.props.style), { overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: theme.backgroundColor3 });
        const settings = this.state.settings;
        const containerStyle = {
            overflow: 'auto',
            padding: theme.configScreenPadding,
            paddingTop: 0,
            display: 'flex',
            flex: 1,
        };
        const hasChanges = this.hasChanges();
        const settingComps = shared.settingsToComponents2(this, Setting_1.AppType.Desktop, settings, this.state.selectedSectionName);
        // screenComp is a custom config screen, such as the encryption config screen or keymap config screen.
        // These screens handle their own loading/saving of settings and have bespoke rendering.
        // When screenComp is null, it means we are viewing the regular settings.
        const screenComp = this.state.screenName ? React.createElement("div", { className: "config-screen-content-wrapper", style: { overflow: 'scroll', flex: 1 } }, this.screenFromName(this.state.screenName)) : null;
        if (screenComp)
            containerStyle.display = 'none';
        const sections = shared.settingsSections({ device: Setting_1.AppType.Desktop, settings });
        // Filter sections based on search query
        const filteredSections = this.getFilteredSections(sections);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const needRestartComp = this.state.needRestart ? (React.createElement("div", { style: Object.assign(Object.assign({}, theme.textStyle), { padding: 10, paddingLeft: 24, backgroundColor: theme.warningBackgroundColor, color: theme.color }) },
            this.restartMessage(),
            React.createElement("a", { style: Object.assign(Object.assign({}, theme.urlStyle), { marginLeft: 10 }), href: "#", onClick: () => { void this.restartApp(); } }, (0, locale_1._)('Restart now')))) : null;
        const rightStyle = Object.assign(Object.assign({}, style), { flex: 1 });
        delete style.width;
        const tabComponents = [];
        for (const section of filteredSections) {
            const sectionId = `setting-section-${section.name}`;
            let content = null;
            const visible = section.name === this.state.selectedSectionName;
            if (visible) {
                content = (React.createElement(React.Fragment, null,
                    screenComp,
                    React.createElement("div", { style: containerStyle }, settingComps)));
            }
            tabComponents.push(React.createElement("div", { key: sectionId, id: sectionId, className: `setting-tab-panel ${!visible ? '-hidden' : ''}`, hidden: !visible, "aria-labelledby": `setting-tab-${section.name}`, tabIndex: 0, role: 'tabpanel' }, content));
        }
        return (React.createElement("div", { className: "config-screen", role: "main", style: { display: 'flex', flexDirection: 'row', height: this.props.style.height } },
            React.createElement(Sidebar_1.default, { selection: this.state.selectedSectionName, onSelectionChange: this.sidebar_selectionChange, sections: filteredSections, searchQuery: this.state.searchQuery, onSearchQueryChange: this.setSearchQuery, onClearSearch: this.clearSearch }),
            React.createElement("div", { style: rightStyle },
                needRestartComp,
                tabComponents,
                React.createElement(ButtonBar_1.default, { hasChanges: hasChanges, backButtonTitle: hasChanges && !screenComp ? (0, locale_1._)('Cancel') : (0, locale_1._)('Back'), onCancelClick: this.onCancelClick, onSaveClick: screenComp ? null : this.onSaveClick, onApplyClick: screenComp ? null : this.onApplyClick }))));
    }
}
exports.ConfigScreenComponent = ConfigScreenComponent;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mapStateToProps = (state) => {
    return {
        themeId: state.settings.theme,
        settings: state.settings,
        locale: state.settings.locale,
    };
};
exports.default = connect(mapStateToProps)(ConfigScreenComponent);
//# sourceMappingURL=ConfigScreen.js.map