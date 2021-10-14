const { NativeModules, Platform } = require('react-native');

export interface NoteItem {
  id: string;
	title: string;
}

interface WidgetData {
  notes?: NoteItem[];
}

export const RecentsWidget = (Platform.OS === 'android' && NativeModules.RecentsWidget) ?
	{
		read: async (): Promise<WidgetData> => JSON.parse(await NativeModules.RecentsWidget.read()),
		write: async (data: WidgetData) => NativeModules.RecentsWidget.write(JSON.stringify(data)),
	} :
	{
		read: async (): Promise<WidgetData> => ({}),
		write: async (_: WidgetData) => {},
	};
