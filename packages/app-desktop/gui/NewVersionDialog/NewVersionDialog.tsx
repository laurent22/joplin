import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import Dialog from '@joplin/lib/components/Dialog';
import DialogTitle from '../DialogTitle';
import Button, { ButtonLevel } from '../Button/Button';
import shim from '@joplin/lib/shim';

interface Props {
	version: string;
	prerelease?: boolean;
	pageUrl: string;
	notes: string;
	onDownload?: ()=> void;
	onApply?: ()=> void;
	onSkip?: ()=> void;
	onDismiss: ()=> void;
}

const fullChangelogUrl = 'https://joplinapp.org/help/about/changelog/desktop';

export default function NewVersionDialog(props: Props) {
	const versionLabel = props.prerelease ? _('%s (pre-release)', props.version) : props.version;

	const openReleaseNotes = (event: React.MouseEvent) => {
		event.preventDefault();
		shim.openUrl(props.pageUrl);
	};

	const openChangelog = (event: React.MouseEvent) => {
		event.preventDefault();
		shim.openUrl(fullChangelogUrl);
	};

	return (
		<Dialog onCancel={props.onDismiss} className="new-version-dialog">
			<div className="dialog-root">
				<DialogTitle title={_('Version %s is available', versionLabel)} />
				<div className="dialog-content new-version-content">
					<a href="#" className="release-notes-link" onClick={openReleaseNotes}>
						{_('Read the release notes')}
					</a>
					{props.notes && (
						<div className="changelog-section">
							<p className="changelog-label">{_('What changed in this version')}</p>
							<pre className="changelog-text">{props.notes}</pre>
							<a href="#" className="full-changelog-link" onClick={openChangelog}>
								{_('View full changelog')}
							</a>
						</div>
					)}
				</div>
				<div className="new-version-buttons">
					{props.onDownload && (
						<Button level={ButtonLevel.Primary} onClick={props.onDownload} title={_('Download')} />
					)}
					{props.onApply && (
						<Button level={ButtonLevel.Primary} onClick={props.onApply} title={_('Restart now')} />
					)}
					{props.onSkip && (
						<Button level={ButtonLevel.Tertiary} onClick={props.onSkip} title={_('Skip this version')} />
					)}
					<Button level={ButtonLevel.Tertiary} onClick={props.onDismiss} title={_('Later')} />
				</div>
			</div>
		</Dialog>
	);
}
