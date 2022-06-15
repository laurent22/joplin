// getResponsiveValue() returns the corresponding value for
// of a particular device screen width based on a valueMap
//
// Breakpoints:
// xs: 0px to 600px
// sm: 601px to 900px
// md: 901px to 1200px
// lg: 1201px to 1536px
// xl: > 1536px
//
// Eg. [10, 15, 20, 25, 30] means { xs: 10, sm: 15, md: 20, lg: 25, xl: 30 }
// [10] and [10, 15] are equivalent to { xs: 10 } and { xs: 10, sm: 15 } respectively

interface ValueMap {
    sm: number;
    md: number;
    lg: number;
}

export default function getResponsiveValue(valueMap: number[] | ValueMap) {
	return valueMap;
}
