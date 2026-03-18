import * as React from 'react';
import Sidebar from './Sidebar';
import ButtonBar from './ButtonBar';
import Button, { ButtonLevel } from '../Button/Button';
import { _ } from '@joplin/lib/locale';
import bridge from '../../services/bridge';
import Setting, { AppType, SettingMetadataSection, SettingValueType, SyncStartupOperation } from '@joplin/lib/models/Setting';
import EncryptionConfigScreen from '../EncryptionConfigScreen/EncryptionConfigScreen';
import { reg } from '@joplin/lib/registry';
const { connect } = require('react-redux');
import { themeStyle } from '@joplin/lib/theme';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import * as shared from '@joplin/lib/components/shared/config/config-shared.js';
import ClipperConfigScreen from '../ClipperConfigScreen';
import restart from '../../services/restart';
import JoplinCloudConfigScreen from '../JoplinCloudConfigScreen';
import ToggleAdvancedSettingsButton from './controls/ToggleAdvancedSettingsButton';
import shouldShowMissingPasswordWarning from '@joplin/lib/components/shared/config/shouldShowMissingPasswordWarning';
import MacOSMissingPasswordHelpLink from './controls/MissingPasswordHelpLink';
const { KeymapConfigScreen } = require('../KeymapConfig/KeymapConfigScreen');
import SettingComponent, { UpdateSettingValueEvent } from './controls/SettingComponent';
import shim, { MessageBoxType } from '@joplin/lib/shim';
import { encryptionSearchKeywords, highlightText, matchesSearchQueryValue } from './searchUtils';


interface Font {
	family: string;
}

declare global {
	interface Window {
		queryLocalFonts(): Promise<Font[]>;
		openChangelogLink: ()=> void;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
class ConfigScreenComponent extends React.Component<any, any> {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private rowStyle_: any = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(props: any) {
		super(props);

		shared.init(reg);

		this.state = {
			...shared.defaultScreenState,
			selectedSectionName: 'general',
			screenName: '',
			changedSettingKeys: [],
			needRestart: false,
			fonts: [],
			searchQuery: '',
			searchFilterSection: null as string|null,
			expandedAdvancedSections: {} as Record<string, boolean>,
		};

		this.rowStyle_ = {
			marginBottom: 10,
		};

		this.sidebar_selectionChange = this.sidebar_selectionChange.bind(this);
		this.checkSyncConfig_ = this.checkSyncConfig_.bind(this);
		this.onCancelClick = this.onCancelClick.bind(this);
		this.onSaveClick = this.onSaveClick.bind(this);
		this.onApplyClick = this.onApplyClick.bind(this);
		this.handleSettingButton = this.handleSettingButton.bind(this);
	}

	private async checkSyncConfig_() {
		if (this.state.settings['sync.target'] === SyncTargetRegistry.nameToId('joplinCloud')) {
			const isAuthenticated = await reg.syncTarget().isAuthenticated();
			if (!isAuthenticated) {
				return this.props.dispatch({
					type: 'NAV_GO',
					routeName: 'JoplinCloudLogin',
				});
			}
		}
		await shared.checkSyncConfig(this, this.state.settings);
	}

	public UNSAFE_componentWillMount() {
		this.setState({ settings: this.props.settings });
	}

	public async componentDidMount() {
		if (this.props.defaultSection) {
			this.setState({ selectedSectionName: this.props.defaultSection }, () => {
				void this.switchSection(this.props.defaultSection);
			});
		}

		const fonts = (await window.queryLocalFonts()).map((font: Font) => font.family);
		const uniqueFonts = [...new Set(fonts)];
		this.setState({ fonts: uniqueFonts });
	}

	private async handleSettingButton(key: string) {
		if (key === 'sync.clearLocalSyncStateButton') {
			if (!await shim.showConfirmationDialog('This cannot be undone. Do you want to continue?')) return;
			Setting.setValue('sync.startupOperation', SyncStartupOperation.ClearLocalSyncState);
			await Setting.saveAll();
			await restart();
		} else if (key === 'sync.clearLocalDataButton') {
			if (!await shim.showConfirmationDialog('This cannot be undone. Do you want to continue?')) return;
			Setting.setValue('sync.startupOperation', SyncStartupOperation.ClearLocalData);
			await Setting.saveAll();
			await restart();
		} else if (key === 'ocr.clearLanguageDataCacheButton') {
			if (!await shim.showConfirmationDialog(this.restartMessage())) return;
			Setting.setValue('ocr.clearLanguageDataCache', true);
			await restart();
		} else if (key === 'sync.openSyncWizard') {
			this.props.dispatch({
				type: 'DIALOG_OPEN',
				name: 'syncWizard',
			});
		} else {
			throw new Error(`Unhandled key: ${key}`);
		}
	}

	public sectionByName(name: string) {
		const sections = shared.settingsSections({ device: AppType.Desktop, settings: this.state.settings });
		for (const section of sections) {
			if (section.name === name) return section;
		}

		throw new Error(`Invalid section name: ${name}`);
	}

	public screenFromName(screenName: string) {
		if (screenName === 'encryption') return <EncryptionConfigScreen/>;
		if (screenName === 'server') return <ClipperConfigScreen themeId={this.props.themeId}/>;
		if (screenName === 'keymap') return <KeymapConfigScreen themeId={this.props.themeId}/>;
		if (screenName === 'joplinCloud') return <JoplinCloudConfigScreen />;

		throw new Error(`Invalid screen name: ${screenName}`);
	}

	public async switchSection(name: string) {
		const section = this.sectionByName(name);
		let screenName = '';
		if (section.isScreen) {
			screenName = section.name;

			if (this.hasChanges()) {
				const answer = await shim.showMessageBox(
					_('This will open a new screen. Save your current changes?'),
					{
						type: MessageBoxType.Confirm,
						buttons: [_('Save changes'), _('Discard changes')],
						defaultId: 0,
						cancelId: 1,
					},
				);
				if (answer === 0) {
					await shared.saveSettings(this);
				}
			}
		}

		this.setState({ selectedSectionName: section.name, screenName: screenName });
	}

	private openSectionFromSearch(name: string) {
		this.setState({ searchQuery: '', searchFilterSection: null }, () => {
			void this.switchSection(name);
		});
	}

	// Returns true if the section has any settings that match the current search query.
	private sectionHasMatches(section: SettingMetadataSection): boolean {
		const sectionLabel = Setting.sectionNameToLabel(section.name);
		const sectionKeywords = this.sectionSearchKeywords(section.name, this.state.settings);

		if (this.matchesSearchQuery([sectionLabel, ...sectionKeywords], sectionLabel)) return true;

		for (const md of (section.metadatas ?? [])) {
			const label = md.label?.() ?? '';
			const description = md.description?.(AppType.Desktop) ?? '';
			if (this.matchesSearchQuery([label, description, md.key], sectionLabel)) return true;
		}

		return false;
	}

	private sectionSearchKeywords(sectionName: string, settings: Record<string, unknown>): string[] {
		if (sectionName === 'encryption') {
			return encryptionSearchKeywords(!!settings['encryption.enabled'], _);
		}

		return [];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private sidebar_selectionChange(event: any) {
		void this.switchSection(event.section.name);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public renderSectionDescription(section: any) {
		const description = Setting.sectionDescription(section.name, AppType.Desktop);
		if (!description) return null;

		const theme = themeStyle(this.props.themeId);
		return (
			<div style={{ ...theme.textStyle, marginBottom: 15 }}>
				{description}
			</div>
		);
	}

	private matchesSearchQuery(relatedText: string|string[], sectionTitle = ''): boolean {
		return matchesSearchQueryValue(this.state.searchQuery ?? '', relatedText, sectionTitle);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public sectionToComponent(key: string, section: any, settings: any, selected: boolean) {
		const theme = themeStyle(this.props.themeId);
		const searchQuery = (this.state.searchQuery ?? '').trim();
		const searchActive = searchQuery.length > 0;
		const sectionLabel = Setting.sectionNameToLabel(section.name);
		const sectionKeywords = this.sectionSearchKeywords(section.name, settings);

		// When the user has clicked a section to filter results, hide all other sections.
		if (searchActive && this.state.searchFilterSection && key !== this.state.searchFilterSection) return null;

		const createSettingComponents = (advanced: boolean) => {
			const output = [];

			for (let i = 0; i < section.metadatas.length; i++) {
				const md = section.metadatas[i];
				if (!!md.advanced !== advanced) continue;
				const label = md.label?.() ?? '';
				const description = md.description?.(AppType.Desktop) ?? '';
				const searchableText = [label, description, sectionLabel, md.key];
				if (searchActive && !this.matchesSearchQuery(searchableText, sectionLabel)) continue;
				const settingComp = this.settingToComponent(md.key, settings[md.key]);
				output.push(settingComp);
			}
			return output;
		};

		const settingComps = createSettingComponents(false);
		const advancedSettingComps = createSettingComponents(true);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const sectionWidths: Record<string, any> = {
			plugins: '100%',
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const sectionStyle: any = {
			marginTop: 20,
			marginBottom: 20,
			maxWidth: sectionWidths[section.name] ? sectionWidths[section.name] : 640,
		};

		if (section.name === 'general') {
			sectionStyle.borderTopWidth = 0;
		}

		if (section.name === 'sync') {
			const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target']);
			const statusStyle = { ...theme.textStyle, marginTop: 10 };
			const warningStyle = { ...theme.textStyle, color: theme.colorWarn };

			// Don't show the missing password warning if the user just changed the sync target (but hasn't
			// saved yet).
			const matchesSavedTarget = settings['sync.target'] === this.props.settings['sync.target'];
			const missingPasswordText = _('%s: Missing password.', _('Warning'));
			if (matchesSavedTarget && shouldShowMissingPasswordWarning(settings['sync.target'], settings) &&
				(!searchActive || this.matchesSearchQuery([missingPasswordText, _('Help')], sectionLabel))) {
				settingComps.push(
					<p key='missing-password-warning' style={warningStyle}>
						{missingPasswordText}
						{' '}
						<MacOSMissingPasswordHelpLink
							theme={theme}
							text={_('Help')}
						/>
					</p>,
				);
			}

			if (syncTargetMd.supportsConfigCheck) {
				const messages = shared.checkSyncConfigMessages(this);
				const statusComp = !messages.length ? null : (
					<div style={statusStyle} aria-live='polite'>
						{messages[0]}
						{messages.length >= 1 ? <p>{messages[1]}</p> : null}
					</div>
				);

				const connectToJoplinCloudTitle = _('Connect to Joplin Cloud');
				if (settings['sync.target'] === SyncTargetRegistry.nameToId('joplinCloud') &&
					(!searchActive || this.matchesSearchQuery([connectToJoplinCloudTitle], sectionLabel))) {
					const goToJoplinCloudLogin = () => {
						this.props.dispatch({
							type: 'NAV_GO',
							routeName: 'JoplinCloudLogin',
						});
					};
					settingComps.push(
						<div key="connect_to_joplin_cloud_button" style={this.rowStyle_}>
							<Button
								title={connectToJoplinCloudTitle}
								level={ButtonLevel.Primary}
								onClick={goToJoplinCloudLogin}
							/>
						</div>,
					);
				}

				const connectSamlTitle = _('Connect using your organisation account');
				if (settings['sync.target'] === SyncTargetRegistry.nameToId('joplinServerSaml') &&
					(!searchActive || this.matchesSearchQuery([connectSamlTitle], sectionLabel))) {
					const server = settings['sync.11.path'] as string;

					const goToSamlLogin = async () => {
						// Save settings to allow SAML auth with the correct URL.
						await shared.saveSettings(this);

						this.props.dispatch({
							type: 'NAV_GO',
							routeName: 'JoplinServerSamlLogin',
						});
					};

					settingComps.push(
						<div key="connect_to_joplin_server_saml_button" style={this.rowStyle_}>
							<Button
								title={connectSamlTitle}
								level={ButtonLevel.Primary}
								onClick={goToSamlLogin}
								disabled={!server || server?.trim().length === 0}
							/>
						</div>,
					);
				}

				const checkSyncTitle = _('Check synchronisation configuration');
				if (!searchActive || this.matchesSearchQuery([checkSyncTitle], sectionLabel)) {
					settingComps.push(
						<div key="check_sync_config_button" style={this.rowStyle_}>
							<Button
								title={checkSyncTitle}
								level={ButtonLevel.Secondary}
								disabled={this.state.checkSyncConfigResult === 'checking'}
								onClick={this.checkSyncConfig_}
							/>
							{statusComp}
						</div>,
					);
				}
			}
		}

		if (searchActive) {
			const sectionMatches = this.matchesSearchQuery([sectionLabel, ...sectionKeywords], sectionLabel) ||
				settingComps.length > 0 ||
				advancedSettingComps.length > 0;
			if (!sectionMatches) return null;
			sectionStyle.marginTop = 0;
			sectionStyle.marginBottom = 12;
			sectionStyle.padding = '12px 0 12px 14px';
			sectionStyle.borderLeft = `2px solid ${theme.dividerColor}`;
		} else if (!selected) {
			sectionStyle.display = 'none';
		}

		let advancedSettingsButton = null;
		const advancedSettingsSectionStyle = { display: 'none' };
		const advancedSettingsGroupId = `advanced_settings_${key}`;

		if (advancedSettingComps.length) {
			const isAdvancedExpanded = searchActive
				? !!(this.state.expandedAdvancedSections && this.state.expandedAdvancedSections[key])
				: this.state.showAdvancedSettings;
			const onAdvancedClick = searchActive
				? () => this.setState({
					expandedAdvancedSections: {
						...(this.state.expandedAdvancedSections || {}),
						[key]: !isAdvancedExpanded,
					},
				})
				: () => shared.advancedSettingsButton_click(this);

			advancedSettingsButton = (
				<ToggleAdvancedSettingsButton
					onClick={onAdvancedClick}
					advancedSettingsVisible={isAdvancedExpanded}
					aria-controls={advancedSettingsGroupId}
				/>
			);
			advancedSettingsSectionStyle.display = isAdvancedExpanded ? 'block' : 'none';
		}

		if (searchActive && section.isScreen) {
			const matchedKeywordEntries = sectionKeywords.filter(keyword => this.matchesSearchQuery(keyword, sectionLabel));
			for (const keyword of matchedKeywordEntries) {
				settingComps.push(
					<div key={`open-section-entry-${section.name}-${keyword}`} style={this.rowStyle_}>
						<Button
							title={keyword}
							level={ButtonLevel.Secondary}
							onClick={() => this.openSectionFromSearch(section.name)}
						/>
					</div>,
				);
			}
		}

		const sectionTitleComp = searchActive ? (
			<button
				type="button"
				className='config-screen-search-section-link'
				onClick={() => this.openSectionFromSearch(section.name)}
			>
				{highlightText(sectionLabel, searchQuery)}
			</button>
		) : null;

		return (
			<div key={key} style={sectionStyle}>
				{sectionTitleComp}
				{this.renderSectionDescription(section)}
				<div className='config-screen-settings-list'>{settingComps}</div>
				{advancedSettingsButton}
				<div
					style={advancedSettingsSectionStyle}
					id={advancedSettingsGroupId}
					role='group'
				>{advancedSettingComps}</div>
			</div>
		);
	}

	private onUpdateSettingValue = ({ key, value }: UpdateSettingValueEvent) => {
		const md = Setting.settingMetadata(key);
		if (md.needRestart) {
			this.setState({ needRestart: true });
		}
		shared.updateSettingValue(this, key, value);
	};

	public settingToComponent<T extends string>(key: T, value: SettingValueType<T>) {
		const searchQuery = (this.state.searchQuery ?? '').trim();
		return (
			<SettingComponent
				themeId={this.props.themeId}
				key={key}
				settingKey={key}
				value={value}
				fonts={this.state.fonts}
				onUpdateSettingValue={this.onUpdateSettingValue}
				onSettingButtonClick={this.handleSettingButton}
				searchQuery={searchQuery || undefined}
			/>
		);
	}

	private restartMessage() {
		return _('The application must be restarted for these changes to take effect.');
	}

	private async restartApp() {
		await Setting.saveAll();
		await restart();
	}

	private async checkNeedRestart() {
		if (this.state.needRestart) {
			const doItNow = await bridge().showConfirmMessageBox(this.restartMessage(), {
				buttons: [_('Do it now'), _('Later')],
			});

			if (doItNow) await this.restartApp();
		}
	}

	public async onApplyClick() {
		const done = await shared.saveSettings(this);
		if (!done) return;

		await this.checkNeedRestart();
	}

	public async onSaveClick() {
		const done = await shared.saveSettings(this);
		if (!done) return;
		await this.checkNeedRestart();
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	public onCancelClick() {
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	public hasChanges() {
		return !!this.state.changedSettingKeys.length;
	}

	public render() {
		const theme = themeStyle(this.props.themeId);

		const style = {
			...this.props.style,
			overflow: 'hidden',
			display: 'flex',
			flexDirection: 'column',
			backgroundColor: theme.backgroundColor3,
		};

		const settings = this.state.settings;

		const containerStyle: React.CSSProperties = {
			overflow: 'auto',
			padding: theme.configScreenPadding,
			paddingTop: 0,
			display: 'flex',
			flex: 1,
		};

		const hasChanges = this.hasChanges();
		const searchQuery = (this.state.searchQuery ?? '').trim();

		// screenComp is a custom config screen, such as the encryption config screen or keymap config screen.
		// These screens handle their own loading/saving of settings and have bespoke rendering.
		// When screenComp is null, it means we are viewing the regular settings.
		const screenComp = this.state.screenName ? <div className="config-screen-content-wrapper" style={{ overflow: 'scroll', flex: 1 }}>{this.screenFromName(this.state.screenName)}</div> : null;
		// Search takes priority: typing in the search field always shows results,
		// even when a custom sub-screen (Encryption, Keymap…) is open.
		const searchActive = searchQuery.length > 0;

		// Hide the regular settings container only when a custom screen is shown
		// and search is not active.
		if (screenComp && !searchActive) containerStyle.display = 'none';

		const sections = shared.settingsSections({ device: AppType.Desktop, settings });

		// Compute which sections have at least one setting matching the query.
		const sectionsWithMatches: Set<string> = searchActive
			? new Set(sections.filter((s: SettingMetadataSection) => this.sectionHasMatches(s)).map((s: SettingMetadataSection) => s.name))
			: new Set();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const needRestartComp: any = this.state.needRestart ? (
			<div style={{ ...theme.textStyle, padding: 10, paddingLeft: 24, backgroundColor: theme.warningBackgroundColor, color: theme.color }}>
				{this.restartMessage()}
				<a style={{ ...theme.urlStyle, marginLeft: 10 }} href="#" onClick={() => { void this.restartApp(); }}>{_('Restart now')}</a>
			</div>
		) : null;

		const rightStyle = { ...style, flex: 1 };
		delete style.width;

		// Compute section/search results components only when needed.
		const settingComps = !searchActive
			? shared.settingsToComponents2(this, AppType.Desktop, settings, this.state.selectedSectionName)
			: [];
		const searchResultComps = searchActive
			? shared.settingsToComponents2(this, AppType.Desktop, settings, null)
			: [];

		const visibleSearchResultComps = searchResultComps.filter((c: React.ReactNode) => !!c);
		const searchResultsPanel = (
			<div style={{ ...containerStyle, display: 'block' }}>
				{visibleSearchResultComps.length > 0 ? visibleSearchResultComps : (
					<div style={theme.textStyle}>
						{_('No settings match your search.')}
					</div>
				)}
			</div>
		);

		const tabComponents: React.ReactNode[] = [];
		if (!searchActive) {
			for (const section of sections) {
				const sectionId = `setting-section-${section.name}`;
				let content = null;
				const visible = section.name === this.state.selectedSectionName;
				if (visible) {
					content = (
						<>
							{screenComp}
							<div style={containerStyle}>{settingComps}</div>
						</>
					);
				}

				tabComponents.push(
					<div
						key={sectionId}
						id={sectionId}
						className={`setting-tab-panel ${!visible ? '-hidden' : ''}`}
						hidden={!visible}
						aria-labelledby={`setting-tab-${section.name}`}
						tabIndex={0}
						role='tabpanel'
					>
						{content}
					</div>,
				);
			}
		}

		return (
			<div className="config-screen" role="main" style={{ display: 'flex', flexDirection: 'row', height: this.props.style.height }}>
				<Sidebar
					selection={this.state.selectedSectionName}
					onSelectionChange={this.sidebar_selectionChange}
					sections={sections}
					searchQuery={this.state.searchQuery ?? ''}
					onSearchQueryChange={(q) => this.setState({ searchQuery: q, searchFilterSection: null })}
					sectionsWithMatches={sectionsWithMatches}
					searchFilterSection={this.state.searchFilterSection}
					onSearchFilterSectionChange={(name) => this.setState({ searchFilterSection: name })}
				/>
				<div style={rightStyle}>
					{needRestartComp}
					{searchActive ? searchResultsPanel : tabComponents}
					<ButtonBar
						hasChanges={hasChanges}
						backButtonTitle={hasChanges && !screenComp ? _('Cancel') : _('Back')}
						onCancelClick={this.onCancelClick}
						onSaveClick={screenComp ? null : this.onSaveClick}
						onApplyClick={screenComp ? null : this.onApplyClick}
					/>
				</div>
			</div>
		);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mapStateToProps = (state: any) => {
	return {
		themeId: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

export default connect(mapStateToProps)(ConfigScreenComponent);

