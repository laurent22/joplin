import * as React from 'react';
import PluginService, { Plugins, PluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import {useMemo} from 'react';
import {_} from '@joplin/lib/locale';
import styled from 'styled-components';
import ToggleButton from '../../lib/ToggleButton/ToggleButton';

const Root = styled.div`
	display: flex;
	flex-wrap: wrap;
`;

const CellRoot = styled.div`
	display: flex;
	opacity: ${props => props.enabled ? 1.0 : 0.7 };
	background-color: ${props => props.theme.backgroundColor};
	flex-direction: column;
	align-items: flex-start;
	padding: 15px;
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 6px;
	width: 250px;
	margin-right: 20px;
	margin-bottom: 20px;
	box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
`;

const CellTop = styled.div`
	display: flex;
	flex-direction: row;
	width: 100%;
	margin-bottom: 10px;
`

const CellBottom = styled.div`
	display: flex;	
`

const StyledName = styled.div`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	font-size: ${props => props.theme.fontSize}px;
	font-weight: bold;
	flex: 1;
`;

const StyledDescription = styled.div`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize}px;
	line-height: 1.6em;
`

interface Props {
	value: any,
	themeId: number;
	onChange:Function;
}

interface CellProps {
	item:PluginItem;
	themeId: number;
	onToggle: Function;
}

interface PluginItem {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
}

function Cell(props:CellProps) {
	const { item } = props;

	return (
		<CellRoot enabled={item.enabled}>
			<CellTop>
				<StyledName mb={'5px'}>{item.name}</StyledName>
				<ToggleButton themeId={props.themeId} value={item.enabled} onToggle={props.onToggle}/>
			</CellTop>
			<CellBottom>
				<StyledDescription>{item.description}</StyledDescription>
			</CellBottom>
		</CellRoot>
	);
}

function usePluginItems(plugins:Plugins, settings:PluginSettings):PluginItem[] {
	return useMemo(() => {
		const output:PluginItem[] = [];

		for (const pluginId in plugins) {
			const plugin = plugins[pluginId];

			const setting:PluginSetting = settings[pluginId] ? settings[pluginId] : {
				enabled: true,
			};

			output.push({
				id: pluginId,
				name: plugin.manifest.name,
				description: plugin.manifest.description,
				enabled: setting.enabled,
			});
		}

		output.sort((a:PluginItem, b:PluginItem) => {
			return a.name < b.name ? -1 : +1;
		});

		return output;				
	}, [plugins, settings]);
}

export default function(props:Props) {
	const plugins = PluginService.instance().plugins;

	const pluginSettings = useMemo(() => {
		return PluginService.instance().unserializePluginSettings(props.value);
	}, [props.value]);

	function renderCells(items:PluginItem[]) {
		const output = [];

		for (const item of items) {
			output.push(<Cell
				key={item.id}
				item={item}
				themeId={props.themeId}
				onToggle={() => {
					const newSettings = { ...pluginSettings }

					newSettings[item.id] = {
						...newSettings[item.id],
						enabled: newSettings[item.id] ? !newSettings[item.id].enabled : false,
					}
					
					props.onChange({ value: PluginService.instance().serializePluginSettings(newSettings) });
				}}
			/>);
		}

		return output;
	}

	const pluginItems = usePluginItems(plugins, pluginSettings);

	return (
		<Root>
			{renderCells(pluginItems)}
		</Root>
	);
}