import * as React from 'react';
import { connect } from 'react-redux';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../services/bridge';
import { AppState } from '../../../app.reducer';

interface Props {
	degraded: boolean;
}

const joplinCloudCreditsUrl = 'https://joplincloud.com/users/me';

const AiStatus: React.FC<Props> = ({ degraded }) => {
	if (!degraded) return null;
	return (
		<div className='ai-status -degraded' role='status'>
			{_('AI is running in reduced-quality mode — monthly allowance exceeded. Credits replenish on a rolling 30-day basis, or you can')}
			{' '}
			<a
				href='#'
				onClick={(e) => { e.preventDefault(); void bridge().openExternal(joplinCloudCreditsUrl); }}
			>{_('buy more credits')}</a>
			{'.'}
		</div>
	);
};

const mapStateToProps = (state: AppState) => ({
	degraded: !!state.aiStatus?.degraded,
});

export default connect(mapStateToProps)(AiStatus);
