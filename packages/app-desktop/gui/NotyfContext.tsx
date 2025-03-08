// Based on https://github.com/caroso1222/notyf/blob/master/recipes/react.md

import * as React from 'react';
import { Notyf } from 'notyf';
import { ToastType } from '@joplin/lib/services/plugins/api/types';

export default React.createContext(
	new Notyf({
		// Set your global Notyf configuration here
		duration: 6000,
		types: [
			{
				type: ToastType.Info,
				icon: false,
				className: 'notyf__toast--info',
				background: 'blue', // Need to set a background, otherwise Notyf won't create the background element. But the color will be overriden in CSS.
			},
		],
	}),
);
