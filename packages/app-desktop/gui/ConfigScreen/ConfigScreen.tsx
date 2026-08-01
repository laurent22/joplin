import * as React from 'react';
import Sidebar from './Sidebar';
import ButtonBar from './ButtonBar';
import Button, { ButtonLevel } from '../Button/Button';
import { _ } from '@joplin/lib/locale';
import bridge from '../../services/bridge';
import Setting, { AppType, SettingMetadataSection, SettingValueType, SyncStartupOperation } from '@joplin/lib/models/Setting';
import { AppState } from '../../app.reducer';
import EncryptionConfigScreen from '../EncryptionConfigScreen/EncryptionConfigScreen';
import NoteLockSettings from './controls/NoteLockSettings';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import { reg } from '@joplin/lib/registry';
import { connect } from 'react-redux';
import { themeStyle } from '@joplin/lib/theme';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import * as shared from '@joplin/lib/components/shared/config/config-shared.js';
import ClipperConfigScreen from '../ClipperConfigScreen';
import restart from '../../services/restart';
import JoplinCloudConfigScreen from '../JoplinCloudConfigScreen';
import ToggleAdvancedSettingsButton from './controls/ToggleAdvancedSettingsButton';
import shouldShowMissingPasswordWarning from '@joplin/lib/components/shared/config/shouldShowMissingPasswordWarning';
import { normalizeQuery } from '@joplin/lib/components/shared/config/config-search-text.js';
import { searchResultGroups, matchedSearchSections } from './configSearch';
import MacOSMissingPasswordHelpLink from './controls/MissingPasswordHelpLink';
import AiIndexStatus from './controls/AiIndexStatus';
import AiStatus from './controls/AiStatus';
const { KeymapConfigScreen } = require('../KeymapConfig/KeymapConfigScreen');
import SettingComponent, { UpdateSettingValueEvent } from './controls/SettingComponent';
import shim, { MessageBoxType } from '@joplin/lib/shim';
import { OnChangeEvent } from '../lib/SearchInput/SearchInput';
import highlightSearchText from './searchHighlight';


interface Font {
	family: string;
}

declare global {
	interface Window {
		queryLocalFonts(): Promise<Font[]>;
		openChangelogLink: ()=> void;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old class component without props/state interfaces; tightening requires structural refactor
class ConfigScreenComponent extends React.Component<any, any> {

	private rowStyle_: React.CSSProperties = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Constructor signature must match the class's open `any` props type
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
			searchSectionFilter: null,
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
		this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
		this.onSearchButtonClick = this.onSearchButtonClick.bind(this);
	}

	private onSearchQueryChange(event: OnChangeEvent) {
		this.setState({
			searchQuery: event.value,
			searchSectionFilter: null,
		});
	}

	private onSearchButtonClick() {
		this.setState({
			searchQuery: '',
			searchSectionFilter: null,
		});
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
		} else if (key === 'ai.usage.resetButton') {
			if (!await shim.showConfirmationDialog(_('Reset AI token usage counters?'))) return;
			Setting.setValue('ai.usage.inputTokens', 0);
			Setting.setValue('ai.usage.outputTokens', 0);
			await Setting.saveAll();
		} else if (key === 'ai.chat.testButton') {
			await shared.checkAiConfig(this);
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

	private sidebar_selectionChange(event: { section: SettingMetadataSection }) {
		const sectionName = event.section.name;
		const searchMode = !!normalizeQuery(this.state.searchQuery);

		if (searchMode) {
			this.setState({
				searchSectionFilter: sectionName,
			});
			return;
		}

		void this.switchSection(sectionName);
	}

	public renderSectionDescription(section: SettingMetadataSection) {
		const description = Setting.sectionDescription(section.name, AppType.Desktop);
		if (!description) return null;

		const theme = themeStyle(this.props.themeId);
		return (
			<div style={{ ...theme.textStyle, marginBottom: 15 }}>
				{description}
			</div>
		);
	}

	public sectionToComponent(key: string, section: SettingMetadataSection, settings: Record<string, unknown>, selected: boolean) {
		const theme = themeStyle(this.props.themeId);
		const searchMode = !!normalizeQuery(this.state.searchQuery);

		const createSettingComponents = (advanced: boolean) => {
			const output = [];

			for (let i = 0; i < section.metadatas.length; i++) {
				const md = section.metadatas[i];
				if (!!md.advanced !== advanced) continue;
				const settingComp = this.settingToComponent(md.key, settings[md.key]);
				output.push(settingComp);
			}
			return output;
		};

		const settingComps = createSettingComponents(false);
		const advancedSettingComps = createSettingComponents(true);

		const sectionWidths: Record<string, string> = {
			plugins: '100%',
		};

		const sectionStyle: React.CSSProperties = {
			marginTop: 20,
			marginBottom: 20,
			maxWidth: sectionWidths[section.name] ? sectionWidths[section.name] : 640,
		};

		if (!selected) sectionStyle.display = 'none';

		if (section.name === 'general') {
			sectionStyle.borderTopWidth = 0;
		}

		if (section.name === 'ai' && settings['ai.enabled']) {
			const messages = shared.checkAiConfigMessages(this);
			if (messages.length) {
				const result = this.state.checkAiConfigResult;
				const ok = result && result !== 'checking' && result.ok;
				const statusStyle = { ...theme.textStyle, marginTop: 10, color: ok ? theme.color : theme.colorWarn };
				settingComps.push(
					<div key="ai_config_test_status" style={statusStyle} aria-live='polite'>
						{messages[0]}
						{messages.length > 1 ? <p>{messages[1]}</p> : null}
					</div>,
				);
			}
			settingComps.push(<AiIndexStatus key='ai_index_status' />);
			settingComps.push(<AiStatus key='ai_status' />);
		}

		if (section.name === 'noteLock' && isNoteLockEnabled()) {
			settingComps.push(<NoteLockSettings key='note_lock_settings'/>);
		}

		if (section.name === 'sync') {
			const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target'] as number);
			const statusStyle = { ...theme.textStyle, marginTop: 10 };
			const warningStyle = { ...theme.textStyle, color: theme.colorWarn };

			// Don't show the missing password warning if the user just changed the sync target (but hasn't
			// saved yet).
			const matchesSavedTarget = settings['sync.target'] === this.props.settings['sync.target'];
			if (matchesSavedTarget && shouldShowMissingPasswordWarning(settings['sync.target'] as number, settings)) {
				settingComps.push(
					<p key='missing-password-warning' style={warningStyle}>
						{_('%s: Missing password.', _('Warning'))}
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

				if (settings['sync.target'] === SyncTargetRegistry.nameToId('joplinCloud')) {
					const goToJoplinCloudLogin = () => {
						this.props.dispatch({
							type: 'NAV_GO',
							routeName: 'JoplinCloudLogin',
						});
					};
					settingComps.push(
						<div key="connect_to_joplin_cloud_button" style={this.rowStyle_}>
							<Button
								title={_('Connect to Joplin Cloud')}
								level={ButtonLevel.Primary}
								onClick={goToJoplinCloudLogin}
							/>
						</div>,
					);
				}

				if (settings['sync.target'] === SyncTargetRegistry.nameToId('joplinServerSaml')) {
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
								title={_('Connect using your organisation account')}
								level={ButtonLevel.Primary}
								onClick={goToSamlLogin}
								disabled={!server || server?.trim().length === 0}
							/>
						</div>,
					);
				}

				settingComps.push(
					<div key="check_sync_config_button" style={this.rowStyle_}>
						<Button
							title={_('Check synchronisation configuration')}
							level={ButtonLevel.Secondary}
							disabled={this.state.checkSyncConfigResult === 'checking'}
							onClick={this.checkSyncConfig_}
						/>
						{statusComp}
					</div>,
				);
			}
		}

		let advancedSettingsButton = null;
		const advancedSettingsSectionStyle = { display: 'none' };
		const advancedSettingsGroupId = `advanced_settings_${key}`;
		const advancedSettingsVisible = this.state.showAdvancedSettings || searchMode;

		if (advancedSettingComps.length) {
			if (!searchMode) {
				advancedSettingsButton = (
					<ToggleAdvancedSettingsButton
						onClick={() => shared.advancedSettingsButton_click(this)}
						advancedSettingsVisible={advancedSettingsVisible}
						aria-controls={advancedSettingsGroupId}
					/>
				);
			}
			advancedSettingsSectionStyle.display = advancedSettingsVisible ? 'block' : 'none';
		}

		return (
			<div key={key} style={sectionStyle}>
				{this.renderSectionDescription(section)}
				<div>{settingComps}</div>
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

	private renderSearchHighlightedText = (text: string): React.ReactNode => {
		return highlightSearchText(text, this.state.searchQuery);
	};

	public settingToComponent<T extends string>(key: T, value: SettingValueType<T>) {
		return (
			<SettingComponent
				themeId={this.props.themeId}
				key={key}
				settingKey={key}
				value={value}
				fonts={this.state.fonts}
				onUpdateSettingValue={this.onUpdateSettingValue}
				onSettingButtonClick={this.handleSettingButton}
				renderSearchText={this.renderSearchHighlightedText}
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
		const searchQuery = normalizeQuery(this.state.searchQuery);
		const searchMode = !!searchQuery;
		const sectionFilter = this.state.searchSectionFilter;

		const style = {
			...this.props.style,
			overflow: 'hidden',
			display: 'flex',
			flexDirection: 'column',
			backgroundColor: theme.backgroundColor3,
		};

		const settings = this.state.settings;

		const hasChanges = this.hasChanges();

		const settingComps = shared.settingsToComponents2(this, AppType.Desktop, settings, this.state.selectedSectionName);

		// screenComp is a custom config screen, such as the encryption config screen or keymap config screen.
		// These screens handle their own loading/saving of settings and have bespoke rendering.
		// When screenComp is null, it means we are viewing the regular settings.
		const screenComp = this.state.screenName ? <div className="config-screen-content-wrapper" style={{ overflow: 'scroll', flex: 1 }}>{this.screenFromName(this.state.screenName)}</div> : null;

		const shouldHideSettingsContainer = !!screenComp && !searchMode;

		const sections = shared.settingsSections({ device: AppType.Desktop, settings });
		const searchResultGroupItems = searchResultGroups(this.state.searchQuery, sections, AppType.Desktop);
		const matchedSections = matchedSearchSections(sections, searchResultGroupItems);
		const hasValidSectionFilter = !!sectionFilter && matchedSections.some(group => group.section.name === sectionFilter);
		const filteredMatchedSections = hasValidSectionFilter ? matchedSections.filter(group => group.section.name === sectionFilter) : matchedSections;

		const needRestartComp: React.ReactNode = this.state.needRestart ? (
			<div style={{ ...theme.textStyle, padding: 10, paddingLeft: 24, backgroundColor: theme.warningBackgroundColor, color: theme.color }}>
				{this.restartMessage()}
				<a style={{ ...theme.urlStyle, marginLeft: 10 }} href="#" onClick={() => { void this.restartApp(); }}>{_('Restart now')}</a>
			</div>
		) : null;

		const rightStyle = { ...style, flex: 1 };
		delete style.width;

		const tabComponents: React.ReactNode[] = [];
		if (searchMode) {
			const searchContent = filteredMatchedSections.map(({ section }) => {
				const sectionComp = section.isScreen ? (
					<div className='search-message'>
						{_('This section opens in its own screen and is matched by section title.')}
					</div>
				) : this.sectionToComponent(section.name, section, settings, true);
				if (!sectionComp) return null;

				return (
					<div key={`search-result-${section.name}`}>
						<h2 className='search-section-title'>
							<i
								className={Setting.sectionNameToIcon(section.name, AppType.Desktop)}
								role='img'
								aria-hidden='true'
							/>
							{this.renderSearchHighlightedText(Setting.sectionNameToLabel(section.name))}
						</h2>
						{sectionComp}
					</div>
				);
			});

			const noResultsMessage = filteredMatchedSections.length === 0 ? (
				<div className='search-no-results'>
					{_('No matching results')}
				</div>
			) : null;

			tabComponents.push(
				<div
					key='setting-section-search-results'
					id='setting-section-search-results'
					className='setting-tab-panel'
					role='region'
					aria-label={_('Search results')}
				>
					<div className='search-results'>
						<div aria-live='polite' aria-atomic='true' style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
							{filteredMatchedSections.length === 0 ? _('No matching results') : _('%d sections found', filteredMatchedSections.length)}
						</div>
						<div className='search-filter-control'>
							{hasValidSectionFilter ?
								_('Filtered by section [%s]', Setting.sectionNameToLabel(sectionFilter)) :
								_('Showing all matching settings')}
							{hasValidSectionFilter ? (
								<button
									type='button'
									className='link-button'
									onClick={() => {
										this.setState({ searchSectionFilter: null });
									}}
								>
									{_('Show all results')}
								</button>
							) : null}
						</div>
						{searchContent}
						{noResultsMessage}
					</div>
				</div>,
			);
		} else {
			for (const section of sections) {
				const sectionId = `setting-section-${section.name}`;
				let content = null;
				const visible = section.name === this.state.selectedSectionName;
				if (visible) {
					content = (
						<>
							{screenComp}
							<div className={`config-screen-settings-container ${shouldHideSettingsContainer ? 'hidden' : ''}`}>{settingComps}</div>
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
					selection={searchMode ? (sectionFilter ?? matchedSections[0]?.section.name ?? this.state.selectedSectionName) : this.state.selectedSectionName}
					onSelectionChange={this.sidebar_selectionChange}
					sections={sections}
					searchQuery={this.state.searchQuery}
					onSearchQueryChange={this.onSearchQueryChange}
					onSearchButtonClick={this.onSearchButtonClick}
					searchResultGroups={searchResultGroupItems}
				/>
				<div style={rightStyle}>
					{needRestartComp}
					{tabComponents}
					<ButtonBar
						hasChanges={hasChanges}
						backButtonTitle={hasChanges && (!screenComp || searchMode) ? _('Cancel') : _('Back')}
						onCancelClick={this.onCancelClick}
						onSaveClick={screenComp && !searchMode ? undefined : this.onSaveClick}
						onApplyClick={screenComp && !searchMode ? undefined : this.onApplyClick}
					/>
				</div>
			</div>
		);
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

export default connect(mapStateToProps)(ConfigScreenComponent);

