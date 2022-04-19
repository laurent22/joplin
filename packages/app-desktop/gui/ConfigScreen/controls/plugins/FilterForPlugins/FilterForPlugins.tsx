import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';


interface props {
    themeId: number;
    setFilterValue: Function;
}


export default function FilterForPlugins(props: props) {

	const theme = themeStyle(props.themeId);
	// const [dropdownVisible, setDropdownVisible] = useState(false)

	const listofFilerOption = ['Select plugin category','Most Downloaded','Recommended', 'Newest', 'Built-in', 'All', 'line-separator', 'Appearance', 'Developer tools', 'Productivity', 'Themes',
		'Integrations', 'Viewer', 'Search', 'Tags', 'Editor', 'Files', 'Personal knowledge management', 'line-separator', 'Installed', 'Enabled', 'Disabled', 'Outdated'];

	const onOptionClick = (event: any) => {
		// setDropdownVisible(false);
		props.setFilterValue(event.target.value);
		console.log('-----value-----', event.target.value);
	};

	return (

		<div className="filter-for-plugins" onClick={event => onOptionClick(event)}>
			<select name="" id="" style={{ backgroundColor: theme.backgroundColor, color: theme.color }}>
				{listofFilerOption.map((filterOption) => {
					if (filterOption === 'Select plugin category') return <option value="" disabled selected>{filterOption}</option>;
					if (filterOption === 'line-separator') return <option className="filter-line-separator-1">------</option>;
					// if(filterOption === 'Installed') return <option selected>{filterOption}</option>
					return <option value={filterOption} key={filterOption} style={{ backgroundColor: theme.backgroundColor, color: theme.color }}>{filterOption}</option>;
				})}
			</select>
		</div>
	);
}
