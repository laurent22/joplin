import * as React from 'react';
import { connect } from 'react-redux';
import AiDegradedNotice from '../../AiDegradedNotice';
import { AppState } from '../../../app.reducer';

interface Props {
	degraded: boolean;
}

const AiStatus: React.FC<Props> = ({ degraded }) => {
	if (!degraded) return null;
	return <AiDegradedNotice className='ai-status -degraded' />;
};

const mapStateToProps = (state: AppState) => ({
	degraded: !!state.aiStatus?.degraded,
});

export default connect(mapStateToProps)(AiStatus);
