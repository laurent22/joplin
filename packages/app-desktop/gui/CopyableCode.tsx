import { _ } from '@joplin/lib/locale';
import { msleep, Second } from '@joplin/utils/time';
import * as React from 'react';
import { useCallback, useState } from 'react';

interface Props {
	className?: string;
	content: string;
}

const CopyableCode: React.FC<Props> = props => {
	const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);
	const clipboardIcon = showCopiedFeedback ? 'fas fa-check' : 'far fa-copy';
	const copyLabel = showCopiedFeedback ? _('Copied to clipboard') : _('Copy');

	const onCopy = useCallback(async () => {
		await navigator.clipboard.writeText(props.content);

		setShowCopiedFeedback(true);
		await msleep(Second * 0.5);
		setShowCopiedFeedback(false);
	}, [props.content]);

	return <div className={`copyable-code ${props.className ?? ''}`}>
		<button className='copy' title={copyLabel} onClick={onCopy}>
			<i className={clipboardIcon} role='img' aria-label={copyLabel}/>
		</button>
		<pre className='content'>{props.content}</pre>
	</div>;
};

export default CopyableCode;
