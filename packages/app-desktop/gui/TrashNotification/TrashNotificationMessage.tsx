import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useState } from 'react';

interface Props {
	message: string;
	onCancel: ()=> void;
}

const TrashNotificationMessage: React.FC<Props> = props => {
	const [cancelling, setCancelling] = useState(false);
	const onCancel = useCallback(() => {
		setCancelling(true);
		props.onCancel();
	}, [props.onCancel]);

	return <>
		{props.message}
		{' '}
		<button
			className="link-button"
			onClick={onCancel}
		>{cancelling ? _('Cancelling...') : _('Cancel')}</button>
	</>;
};

export default TrashNotificationMessage;
