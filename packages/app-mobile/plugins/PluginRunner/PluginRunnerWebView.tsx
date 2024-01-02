
import * as React from 'react';
import ExtendedWebView from '../../components/ExtendedWebView';
import Setting from '@joplin/lib/models/Setting';

interface Props {

}

const PluginRunnerWebView: React.FC<Props> = _props => {
	return (
		<ExtendedWebView
			themeId={Setting.THEME_LIGHT}
			webviewInstanceId='PluginRunner'
			html=''
			injectedJavaScript=''
			onMessage={()=>{}}
			onError={()=>{}}
		/>
	);
};

export default PluginRunnerWebView;
