import * as React from 'react';
import { useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '@joplin/lib/components/Dialog';
import styled from 'styled-components';
import DialogTitle from '../DialogTitle';
import shim from '@joplin/lib/shim';
import { Release } from '../../utils/checkForUpdatesUtils';
import ReleaseNotesSection from './ReleaseNotesSection';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used to match Redux dispatch
	dispatch: (action: any)=> void;
	release: Release;
	isAutoUpdate: boolean;
	onSkip?: ()=> void;
	onDownload?: ()=> void;
}

const StyledRoot = styled.div`
	min-width: 500px;
	max-width: 700px;
`;

const MediaLink = styled.a`
	display: block;
	margin-bottom: 1em;
	color: ${props => props.theme.urlColor};
	cursor: pointer;
	font-size: ${props => props.theme.fontSize}px;
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
`;

const ExternalLink = styled.a`
	display: block;
	margin-bottom: 1em;
	color: ${props => props.theme.urlColor};
	cursor: pointer;
	font-size: ${props => props.theme.fontSize}px;
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
`;

const VersionInfo = styled.div`
	margin-bottom: 1em;
	font-size: ${props => props.theme.fontSize}px;
	color: ${props => props.theme.color};
	line-height: ${props => props.theme.lineHeight};
`;

const WhatsNewDialog = (props: Props) => {
	const closeDialog = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'whatsNew',
		});
	}, [props.dispatch]);

	const handleDownload = useCallback(() => {
		if (props.onDownload) {
			props.onDownload();
		} else {
			shim.openUrl(props.release.downloadUrl || props.release.pageUrl);
		}
		closeDialog();
	}, [props.release, props.onDownload, closeDialog]);

	const handleViewMedia = useCallback(() => {
		if (props.release.mediaUrl) {
			shim.openUrl(props.release.mediaUrl);
		}
	}, [props.release.mediaUrl]);

	const handleViewFullNotes = useCallback(() => {
		shim.openUrl(props.release.pageUrl);
	}, [props.release.pageUrl]);

	const handleButtonClick = useCallback((event: ClickEvent) => {
		if (event.buttonName === 'ok') {
			handleDownload();
		} else if (event.buttonName === 'cancel') {
			closeDialog();
		} else if (event.buttonName === 'skip') {
			if (props.onSkip) props.onSkip();
			closeDialog();
		}
	}, [handleDownload, closeDialog, props.onSkip]);

	const newVersionString = props.release.prerelease
		? _('%s (pre-release)', props.release.version)
		: props.release.version;

	return (
		<Dialog onCancel={closeDialog}>
			<StyledRoot>
				<DialogTitle title={_('What\'s New in Joplin %s', newVersionString)} />

				<VersionInfo>
					{_('A new version of Joplin is available.')}
				</VersionInfo>

				{props.release.mediaUrl && (
					<MediaLink href="#" onClick={(e) => { e.preventDefault(); handleViewMedia(); }}>
						{_('View announcement video/images')}
					</MediaLink>
				)}

				<ReleaseNotesSection notes={props.release.notes} />

				<ExternalLink href="#" onClick={(e) => { e.preventDefault(); handleViewFullNotes(); }}>
					{_('View full release notes')}
				</ExternalLink>

				<DialogButtonRow
					themeId={props.themeId}
					onClick={handleButtonClick}
					okButtonLabel={props.isAutoUpdate ? _('Restart Now') : _('Download')}
					cancelButtonLabel={_('Later')}
					customButtons={[{ name: 'skip', label: _('Skip This Version') }]}
				/>
			</StyledRoot>
		</Dialog>
	);
};

export default WhatsNewDialog;
