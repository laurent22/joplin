import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { pluginCategoriesOptions } from '@joplin/lib/services/plugins/PluginService';

interface FilterProps {
    themeId: number;
    setFilterValue: Function;
	onSearchButtonClick: Function;
	filterValue: string;
}

export default function FilterForPlugins(props: FilterProps) {

	const theme = themeStyle(props.themeId);

	// const filterOptions = ['Select plugin category','Most Downloaded','Recommended', 'Newest', 'Built-in', 'All', 'line-separator', 'Appearance', 'Developer tools', 'Productivity', 'Themes', 'Integrations', 'Viewer', 'Search', 'Tags', 'Editor', 'Files', 'Personal knowledge management', 'line-separator', 'Installed', 'Enabled', 'Disabled', 'Outdated'];

	const clearFilterValue = () => {
		(document.getElementById('filter-select') as HTMLInputElement).value = '';
		props.onSearchButtonClick();
	};

	return (
		<div className="filter-for-plugins" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={event => props.setFilterValue((event.target as HTMLInputElement).value)}>
			<select name="" id="filter-select" defaultValue={'default'} style={{ backgroundColor: theme.backgroundColor, color: theme.color }}>
				{Object.keys(pluginCategoriesOptions).map((filterOption) => {
					if (filterOption === 'selectPluginCategory') return <option value="default" key={filterOption} disabled>{filterOption}</option>;
					if (filterOption.includes('line-separator')) return <option key={filterOption} disabled>─────────────────────</option>;
					return <option value={filterOption} key={filterOption} style={{ backgroundColor: theme.backgroundColor, color: theme.color }}>{filterOption}</option>;
				})}
			</select>
			{props.filterValue && <i className="fas fa-window-close" style={{ margin: '0px 0px 0px 6px', backgroundColor: theme.backgroundColor, height: '26px', width: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={clearFilterValue}></i>}
		</div>
	);
}
