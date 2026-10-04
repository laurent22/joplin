import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';

const joplinCloudCreditsUrl = 'https://joplincloud.com/users/me';

interface Props {
	// Container class — each caller owns its own SCSS scope
	// (chat-panel > .degraded-status vs. .ai-status.-degraded).
	className: string;
}

const AiDegradedNotice: React.FC<Props> = ({ className }) => (
	<div className={className} role='status'>
		{_('AI is running in reduced-quality mode — monthly allowance exceeded. Credits replenish on a rolling 30-day basis, or you can')}
		{' '}
		<a
			href='#'
			onClick={(e) => { e.preventDefault(); void bridge().openExternal(joplinCloudCreditsUrl); }}
		>{_('buy more credits')}</a>
		{'.'}
	</div>
);

export default AiDegradedNotice;
