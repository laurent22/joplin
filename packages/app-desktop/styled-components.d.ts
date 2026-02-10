
// styled-components recommends creating custom themes by creating a
// type declarations file.
// See https://styled-components.com/docs/api#create-a-declarations-file
import 'styled-components';
import { Theme } from '@joplin/lib/themes/type';

declare module 'styled-components' {
	export interface DefaultTheme extends Theme {
		fontFamily: string;
		fontSize: number;
		mainPadding: number;
		lineHeight: string;
	}
}
