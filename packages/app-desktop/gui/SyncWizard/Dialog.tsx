import * as React from 'react';
import { useRef, useCallback, useId } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow from '../DialogButtonRow';
import Dialog from '../Dialog';
import styled from 'styled-components';
import DialogTitle from '../DialogTitle';
import SyncTargetRegistry, { SyncTargetInfo } from '@joplin/lib/SyncTargetRegistry';
import useElementSize from '@joplin/lib/hooks/useElementSize';
import Button, { ButtonLevel } from '../Button/Button';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

const StyledRoot = styled.div`
	min-width: 500px;
	max-width: 1200px;
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
	padding-right: 0;
`;

const SelfHostingMessage = styled.div`
	color: ${props => props.theme.color};
	padding-right: 1em;
	font-style: italic;
	margin-top: 1em;
	opacity: 0.6;
`;

const SyncTargetBoxes = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
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

const SyncTargetBox = styled.div`
	display: flex;
	flex: 1;
	flex-direction: column;
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	background-color: ${props => props.theme.backgroundColor};
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 8px;
	padding: 2em 2.2em 2em 2.2em;
	margin-right: 1em;
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

	function renderSyncTarget(info: SyncTargetInfo) {
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
			<SyncTargetBox id={key} key={key}>
				<SyncTargetTitle id={headerId}>{logo}{info.label}</SyncTargetTitle>
				{descriptionComp}
				{featuresComp}
				{renderSelectArea(info, headerId)}
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const boxes: any[] = [];

		for (const name of syncTargetNames) {
			const info = SyncTargetRegistry.infoByName(name);
			if (info.supportsSelfHosted) continue;
			boxes.push(renderSyncTarget(info));
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

		return (
			<ContentRoot>
				<SyncTargetBoxes>
					{boxes}
				</SyncTargetBoxes>
				{selfHostingMessage}
			</ContentRoot>
		);
	}

	function renderDialogWrapper() {
		return (
			<StyledRoot>
				<DialogTitle title={_('Joplin can synchronise your notes using various providers. Select one from the list below.')} justifyContent="center"/>
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
