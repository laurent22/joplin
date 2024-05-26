// Based on https://github.com/caroso1222/notyf/blob/master/recipes/react.md

import * as React from 'react';
import { Notyf } from 'notyf';

export default React.createContext(
	new Notyf({
		// Set your global Notyf configuration here
		duration: 6000,
		types: [
			{
				type: 'loading',
				icon: '⌛',
			},
		],
	}),
);
