// getResponsiveValue() returns the corresponding value for
// of a particular device screen width based on a valueMap
//
// Breakpoints:
// sm: < 481
// md: >= 481
// lg: >= 769px
// xl: >= 1025px
// xxl: >= 1201px
//
// Eg. [ 10, 15, 20, 25, 30 ] means { sm: 10, md: 15, lg: 20, xl: 25, xxl: 30 }
// [10] and [10, 15] are equivalent to { sm: 10 } and { sm: 10, md: 15 } respectively

import { Dimensions } from 'react-native';

interface ValueMap {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
}

export default function getResponsiveValue(valueMap: number[] | ValueMap): number {
	const width = Dimensions.get('screen').width;
	let value: number;
	let sm: number, md: number, lg: number, xl: number, xxl: number;

	if (Array.isArray(valueMap)) {
		if (valueMap.length === 0) {
			return undefined;
		}

		[sm, md, lg, xl, xxl] = valueMap;

		value = sm;
	} else if (Object.keys(valueMap).length === 0) {
		return undefined;
	} else {
		({ sm, md, lg, xl, xxl } = valueMap as ValueMap);

		if (xxl) {
			value = xxl;
		}

		if (xl) {
			value = xl;
		}

		if (lg) {
			value = lg;
		}

		if (md) {
			value = md;
		}

		if (sm) {
			value = sm;
		}
	}

	if (width >= 481 && !!md) {
		value = md;
	}

	if (width >= 769 && !!lg) {
		value = lg;
	}

	if (width >= 1025 && !!xl) {
		value = xl;
	}

	if (width >= 1201 && !!xxl) {
		value = xxl;
	}

	return value;
}
