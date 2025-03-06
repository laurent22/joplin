import * as React from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {
	children: React.ReactNode;
	acceptMessage: string;
	onAccept: ()=> void;
	onDismiss: ()=> void;
	visible: boolean;
}

const BannerContent: React.FC<Props> = props => {
	if (!props.visible) {
		return null;
	}

	return <div className='warning-banner'>
		{props.children}
		&nbsp;&nbsp;<a onClick={props.onAccept} className='warning-banner-link' href="#">[ {props.acceptMessage} ]</a>
		&nbsp;&nbsp;<a onClick={props.onDismiss} className='warning-banner-link' href="#">[ {_('Dismiss')} ]</a>
	</div>;
};

export default BannerContent;
