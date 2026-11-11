import * as React from 'react';
import { Dispatch } from 'redux';
import { useRef, useCallback, useId, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow from '../DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
import styled from 'styled-components';
import DialogTitle from '../DialogTitle';
import SyncTargetRegistry, { SyncTargetInfo } from '@joplin/lib/SyncTargetRegistry';
import useElementSize from '@joplin/lib/hooks/useElementSize';
import Button, { ButtonLevel } from '../Button/Button';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';
import JoplinCloudSignUpCallToAction from '../JoplinCloudSignUpCallToAction';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}

const StyledRoot = styled.div<{ expanded: boolean }>`
	width: ${props => props.expanded ? '832px' : '432px'};
	max-width: 100%;
`;

const SyncTargetDescription = styled.div<{ height: number }>`
	${props => props.height ? `height: ${props.height}px` : ''};
	margin-bottom: 1.3em;
	line-height: ${props => props.theme.lineHeight};
	font-size: 16px;
`;

const ContentRoot = styled.div`
	background-color: ${props => props.theme.backgroundColor3};
	padding: 1em;
`;

const SelfHostingMessage = styled.div`
	color: ${props => props.theme.color};
	font-style: italic;
	margin-top: 1em;
	opacity: 0.6;
`;

const SyncTargetBoxes = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
`;

const OtherOptions = styled.div`
	margin-top: 1.5em;
`;

const OtherOptionsToggle = styled.button`
	display: flex;
	align-items: center;
	gap: 0.5em;
	width: 100%;
	background: none;
	border: none;
	cursor: pointer;
	font-family: ${props => props.theme.fontFamily};
	font-size: 16px;
	font-weight: bold;
	color: ${props => props.theme.color};
	padding: 0.5em 0;
	text-align: left;

	&:hover {
		opacity: 0.8;
	}
`;

const OtherOptionsBoxes = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
	gap: 1em;
	margin-top: 1em;

	> * {
		margin-right: 0;
	}
`;

const SyncTargetTitle = styled.h2`
	display: flex;
	flex-direction: row;
	font-weight: bold;
	font-size: 1.7em;
	align-items: center;
	white-space: nowrap;
`;

const SyncTargetLogo = styled.img`
	height: 1.3em;
	margin-right: 0.4em;
`;

const SyncTargetBox = styled.div<{ hero?: boolean }>`
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	background-color: ${props => props.theme.backgroundColor};
	border: ${props => props.hero ? `2px solid ${props.theme.color4}` : `1px solid ${props.theme.dividerColor}`};
	border-radius: 8px;
	padding: 2em 2.2em 2em 2.2em;
	flex: 1 1 0;
	min-width: 0;
	max-width: 400px;
	opacity: 1;
`;

const FeatureList = styled.ul`
	margin-bottom: 1em;

	list-style-type: none;
	padding: 0;
`;

const FeatureIcon = styled.i`
	display: inline-flex;
	width: 16px;
	justify-content: center;
	color: ${props => props.theme.color4};
	position: absolute;
`;

const FeatureLine = styled.li<{ enabled: boolean }>`
	margin-bottom: .5em;
	opacity: ${props => props.enabled ? 1 : 0.5};
	position: relative;
	font-size: 16px;
`;

const FeatureLabel = styled.div`
	margin-left: 24px;
	line-height: ${props => props.theme.lineHeight};
`;

const SelectButton = styled(Button)`
	padding: 10px 10px;
    height: auto;
    min-height: auto;
    max-height: fit-content;
    font-size: 1em;
`;

const LoginLink = styled.a`
	margin-top: 0.8em;
	font-size: 14px;
	align-self: center;
	color: ${props => props.theme.urlColor};
`;

const SlowSyncWarning = styled.div`
	margin-top: 1em;
	opacity: 0.8;
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	font-size: 14px;
`;

const syncTargetNames: string[] = [
	'joplinCloud',
	'dropbox',
	'onedrive',
	'nextcloud',
	'webdav',
	'amazon_s3',
	'joplinServer',
	'joplinServerSaml',
];


const logosImageNames: Record<string, string> = {
	'dropbox': 'SyncTarget_Dropbox.svg',
	'joplinCloud': 'SyncTarget_JoplinCloud.svg',
	'onedrive': 'SyncTarget_OneDrive.svg',
};

type SyncTargetInfoName = 'dropbox' | 'onedrive' | 'joplinCloud';

export default function(props: Props) {
	const joplinCloudDescriptionRef = useRef(null);

	const closeDialog = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'syncWizard',
		});
	}, [props.dispatch]);

	const onButtonRowClick = useCallback(() => {
		closeDialog();
	}, [closeDialog]);

	const { height: descriptionHeight } = useElementSize(joplinCloudDescriptionRef);

	function renderFeature(enabled: boolean, label: string) {
		const className = enabled ? 'fas fa-check' : 'fas fa-times';
		return (
			<FeatureLine enabled={enabled} key={label}>
				<FeatureIcon className={className} role='img' aria-label={enabled ? _('Check') : _('Not checked')}/>
				<FeatureLabel>{label}</FeatureLabel>
			</FeatureLine>
		);
	}

	function renderFeatures(name: string) {
		return (
			<FeatureList>
				{[
					renderFeature(true, _('Sync your notes')),
					renderFeature(name === 'joplinCloud', _('Publish notes to the internet')),
					renderFeature(name === 'joplinCloud', _('Collaborate on notebooks with others')),
				]}
			</FeatureList>
		);
	}

	const onSelectButtonClick = useCallback(async (name: SyncTargetInfoName) => {
		const routes = {
			'dropbox': { name: 'DropboxLogin', target: 7 },
			'onedrive': { name: 'OneDriveLogin', target: 3 },
			'joplinCloud': { name: 'JoplinCloudLogin', target: 10 },
		};
		const route = routes[name];
		if (!route) return; // throw error??

		Setting.setValue('sync.target', route.target);
		await Setting.saveAll();
		closeDialog();
		props.dispatch({
			type: 'NAV_GO',
			routeName: route.name,
		});
	}, [props.dispatch, closeDialog]);

	const baseId = useId();
	const [otherOptionsExpanded, setOtherOptionsExpanded] = useState(false);

	function renderSelectArea(info: SyncTargetInfo, describedById: string) {
		return (
			<SelectButton
				level={ButtonLevel.Primary}
				title={_('Select')}
				onClick={() => onSelectButtonClick(info.name as SyncTargetInfoName)}
				disabled={false}
				aria-describedby={describedById}
			/>
		);
	}

	function renderActionArea(info: SyncTargetInfo, describedById: string) {
		if (info.name === 'joplinCloud') {
			return (
				<>
					<JoplinCloudSignUpCallToAction source='desktop-sync-wizard' primary={true}/>
					<LoginLink
						href="#"
						onClick={event => { event.preventDefault(); void onSelectButtonClick(info.name as SyncTargetInfoName); }}
						aria-describedby={describedById}
					>{_('Already have an account? Log in')}</LoginLink>
				</>
			);
		}
		return renderSelectArea(info, describedById);
	}

	function renderSyncTarget(info: SyncTargetInfo, hero: boolean) {
		const key = `syncTarget_${info.name}`;
		const height = info.name !== 'joplinCloud' ? descriptionHeight : null;

		const logoImageName = logosImageNames[info.name];
		const logoImageSrc = logoImageName ? `${bridge().buildDir()}/images/${logoImageName}` : '';
		const logo = logoImageSrc ? <SyncTargetLogo src={logoImageSrc} aria-hidden={true}/> : null;

		const descriptionComp = (
			<SyncTargetDescription
				height={height}
				ref={info.name === 'joplinCloud' ? joplinCloudDescriptionRef : null}
			>{info.description}</SyncTargetDescription>
		);
		const featuresComp = renderFeatures(info.name);

		const renderSlowSyncWarning = () => {
			if (info.name === 'joplinCloud') return null;
			return <SlowSyncWarning>{`⚠️ ${_('%s is not optimised for synchronising many small files so your initial synchronisation will be slow.', info.label)}`}</SlowSyncWarning>;
		};

		const headerId = `${baseId}-${info.id}`;
		return (
			<SyncTargetBox id={key} key={key} hero={hero}>
				<SyncTargetTitle id={headerId}>{logo}{info.label}</SyncTargetTitle>
				{descriptionComp}
				{featuresComp}
				{renderActionArea(info, headerId)}
				{renderSlowSyncWarning()}
			</SyncTargetBox>
		);
	}

	const onSelfHostingClick = useCallback(() => {
		closeDialog();

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Config',
			props: {
				defaultSection: 'sync',
			},
		});
	}, [props.dispatch, closeDialog]);

	function renderContent() {
		const heroBoxes: React.ReactNode[] = [];
		const otherBoxes: React.ReactNode[] = [];

		for (const name of syncTargetNames) {
			const info = SyncTargetRegistry.infoByName(name);
			if (info.supportsSelfHosted) continue;
			if (info.name === 'joplinCloud') {
				heroBoxes.push(renderSyncTarget(info, true));
			} else {
				otherBoxes.push(renderSyncTarget(info, false));
			}
		}

		const selfHostingLabelId = `${baseId}-selfHosting`;
		const selfHostingLinkId = `${baseId}-selfHostingLink`;
		const selfHostingMessage = <SelfHostingMessage>
			<span id={selfHostingLabelId}>
				Self-hosting? Joplin also supports various self-hosting options such as Nextcloud, WebDAV, AWS S3 and Joplin Server.
			</span>
			{' '}
			<a
				href="#"
				onClick={onSelfHostingClick}

				// Include the link ID in aria-labelledby to include the link text in the
				// description. See
				// https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA7
				id={selfHostingLinkId}
				aria-labelledby={`${selfHostingLabelId} ${selfHostingLinkId}`}
			>
				Click here to select one
			</a>.
		</SelfHostingMessage>;

		const otherOptionsRegionId = `${baseId}-otherOptions`;
		const otherOptions = <OtherOptions>
			<OtherOptionsToggle
				type='button'
				aria-expanded={otherOptionsExpanded}
				aria-controls={otherOptionsRegionId}
				onClick={() => setOtherOptionsExpanded(prev => !prev)}
			>
				<i className={otherOptionsExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'} aria-hidden={true}/>
				{_('Other sync options')}
			</OtherOptionsToggle>
			<div id={otherOptionsRegionId} hidden={!otherOptionsExpanded}>
				<OtherOptionsBoxes>
					{otherBoxes}
				</OtherOptionsBoxes>
				{selfHostingMessage}
			</div>
		</OtherOptions>;

		return (
			<ContentRoot>
				<SyncTargetBoxes>
					{heroBoxes}
				</SyncTargetBoxes>
				{otherOptions}
			</ContentRoot>
		);
	}

	function renderDialogWrapper() {
		return (
			<StyledRoot expanded={otherOptionsExpanded}>
				<DialogTitle title={_('Sync your notes with Joplin Cloud to access them on all your devices. Other sync options are also available.')} justifyContent="center"/>
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonShow={false}
					cancelButtonLabel={_('Close')}
				/>
			</StyledRoot>
		);
	}

	return (
		<Dialog onCancel={closeDialog}>{renderDialogWrapper()}</Dialog>
	);
}
