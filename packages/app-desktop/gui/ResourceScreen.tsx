import * as React from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');
import bridge from '../services/bridge';
const prettyBytes = require('pretty-bytes');
import Resource from '@joplin/lib/models/Resource';
import { LoadOptions } from '@joplin/lib/models/utils/types';

interface Style {
	width: number;
	height: number;
}

interface Props {
	themeId: number;
	style: Style;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

interface InnerResource {
	title: string;
	id: string;
	size: number;
	file_extension: string;
}

interface State {
	resources: InnerResource[] | undefined;
	sorting: ActiveSorting;
	isLoading: boolean;
	filter: string;
}

interface ResourceTable {
	resources: InnerResource[];
	sorting: ActiveSorting;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onResourceClick: (resource: InnerResource)=> any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onResourceDelete: (resource: InnerResource)=> any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onToggleSorting: (order: SortingOrder)=> any;
	filter: string;
	themeId: number;
	style: Style;
}

type SortingOrder = 'size' | 'name';
type SortingType = 'asc' | 'desc';

interface ActiveSorting {
	order: SortingOrder;
	type: SortingType;
}

const ResourceTableComp = (props: ResourceTable) => {
	const theme = themeStyle(props.themeId);

	const sortOrderEngagedMarker = (s: SortingOrder) => {
		return (
			<a href="#"
				style={{ color: theme.urlColor }}
				onClick={() => props.onToggleSorting(s)}>{
					(props.sorting.order === s && props.sorting.type === 'desc') ? '▾' : '▴'}</a>
		);
	};

	const titleCellStyle = {
		...theme.textStyle,
		textOverflow: 'ellipsis',
		overflowX: 'hidden',
		maxWidth: 1,
		width: '100%',
		whiteSpace: 'nowrap',
	};

	const cellStyle = {
		...theme.textStyle,
		whiteSpace: 'nowrap',
		color: theme.colorFaded,
		width: 1,
	};

	const headerStyle = {
		...theme.textStyle,
		whiteSpace: 'nowrap',
		width: 1,
		fontWeight: 'bold',
	};

	const filteredResources = props.resources.filter(
		(resource: InnerResource) => !props.filter || resource.title?.includes(props.filter) || resource.id.includes(props.filter),
	);

	return (
		<table style={{ width: '100%' }}>
			<thead>
				<tr>
					<th style={headerStyle}>{_('Title')} {sortOrderEngagedMarker('name')}</th>
					<th style={headerStyle}>{_('Size')} {sortOrderEngagedMarker('size')}</th>
					<th style={headerStyle}>{_('ID')}</th>
					<th style={headerStyle}>{_('Action')}</th>
				</tr>
			</thead>
			<tbody>
				{filteredResources.map((resource: InnerResource, index: number) =>
					<tr key={index}>
						<td style={titleCellStyle} className="titleCell">
							<a
								style={{ color: theme.urlColor }}
								href="#"
								onClick={() => props.onResourceClick(resource)}>{resource.title || `(${_('Untitled')})`}
							</a>
						</td>
						<td style={cellStyle} className="dataCell">{prettyBytes(resource.size)}</td>
						<td style={cellStyle} className="dataCell">{resource.id}</td>
						<td style={cellStyle} className="dataCell">
							<button style={theme.buttonStyle} onClick={() => props.onResourceDelete(resource)}>{_('Delete')}</button>
						</td>
					</tr>,
				)}
			</tbody>
		</table>
	);
};

const getSortingOrderColumn = (s: SortingOrder): string => {
	switch (s) {
	case 'name': return 'title';
	case 'size': return 'size';
	}
};

const getNextSortingOrderType = (s: SortingType): SortingType => {
	if (s === 'asc') {
		return 'desc';
	} else {
		return 'asc';
	}
};

const defaultMaxResources = 10000;
const searchMaxResources = 1000;

class ResourceScreenComponent extends React.Component<Props, State> {
	public constructor(props: Props) {
		super(props);
		this.state = {
			resources: undefined,
			filter: '',
			sorting: {
				type: 'asc',
				order: 'name',
			},
			isLoading: false,
		};
	}

	private get maxResources() {
		// Use a smaller maximum when searching for performance -- results update
		// when the search input changes.
		if (this.state.filter) {
			return searchMaxResources;
		} else {
			return defaultMaxResources;
		}
	}

	private reloadResourcesCounter = 0;
	public async reloadResources() {
		this.setState({ isLoading: true });

		this.reloadResourcesCounter ++;
		const currentCounterValue = this.reloadResourcesCounter;

		let searchOptions: Partial<LoadOptions> = {};
		if (this.state.filter) {
			const search = `%${this.state.filter}%`;
			searchOptions = {
				where: 'id LIKE ? OR title LIKE ?',
				whereParams: [search, search],
			};
		}

		const resources = await Resource.all({
			order: [{
				by: getSortingOrderColumn(this.state.sorting.order),
				dir: this.state.sorting.type,
				caseInsensitive: true,
			}],
			limit: this.maxResources,
			fields: ['title', 'id', 'size', 'file_extension'],
			...searchOptions,
		});

		const cancelled = currentCounterValue !== this.reloadResourcesCounter;
		if (cancelled) return;

		this.setState({ resources, isLoading: false });
	}

	public componentDidMount() {
		void this.reloadResources();
	}

	public componentDidUpdate(_prevProps: Props, prevState: State) {
		if (prevState.sorting !== this.state.sorting || prevState.filter !== this.state.filter) {
			void this.reloadResources();
		}
	}

	public onResourceDelete(resource: InnerResource) {
		const ok = bridge().showConfirmMessageBox(_('Delete attachment "%s"?', resource.title), {
			buttons: [_('Delete'), _('Cancel')],
			defaultId: 1,
		});
		if (!ok) {
			return;
		}
		Resource.delete(resource.id, { sourceDescription: 'ResourceScreen' })
		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			.catch((error: Error) => {
				console.error(error);
				bridge().showErrorMessageBox(error.message);
			})
		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			.finally(() => {
				void this.reloadResources();
			});
	}

	public openResource(resource: InnerResource) {
		const resourcePath = Resource.fullPath(resource);
		const ok = bridge().openItem(resourcePath);
		if (!ok) {
			bridge().showErrorMessageBox(`This file could not be opened: ${resourcePath}`);
		}
	}

	public onToggleSortOrder(sortOrder: SortingOrder) {
		let newSorting = { ...this.state.sorting };
		if (sortOrder === this.state.sorting.order) {
			newSorting.type = getNextSortingOrderType(newSorting.type);
		} else {
			newSorting = {
				order: sortOrder,
				type: 'desc',
			};
		}
		this.setState({ sorting: newSorting });
	}

	public onFilterUpdate = (updateEvent: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ filter: updateEvent.target.value });
	};

	public render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.themeId);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const rootStyle: any = {
			...style,
			overflowY: 'scroll',
			color: theme.color,
			padding: 20,
			boxSizing: 'border-box',
			flex: 1,
		};
		// rootStyle.height = style.height - 35; // Minus the header height
		delete rootStyle.height;
		delete rootStyle.width;

		const containerHeight = style.height;

		return (
			<div style={{ ...theme.containerStyle, fontFamily: theme.fontFamily, height: containerHeight, display: 'flex', flexDirection: 'column' }}>
				<div style={rootStyle}>
					<div style={{ ...theme.notificationBox, marginBottom: 10 }}>{
						_('This is an advanced tool to show the attachments that are linked to your notes. Please be careful when deleting one of them as they cannot be restored afterwards.')
					}</div>
					<div style={{ float: 'right' }}>
						<input
							style={theme.inputStyle}
							type="search"
							value={this.state.filter}
							onChange={this.onFilterUpdate}
							placeholder={_('Search...')}
						/>
					</div>
					{this.state.isLoading && <div>{_('Please wait...')}</div>}
					{!this.state.isLoading && <div>
						{!this.state.resources && <div>
							{_('No resources!')}
						</div>
						}
						{this.state.resources && this.state.resources.length === this.maxResources &&
							<div>{_('Warning: not all resources shown for performance reasons (limit: %s).', this.maxResources)}</div>
						}
						{this.state.resources && <ResourceTableComp
							themeId={this.props.themeId}
							style={style}
							resources={this.state.resources}
							sorting={this.state.sorting}
							filter={this.state.filter}
							onToggleSorting={(order) => this.onToggleSortOrder(order)}
							onResourceClick={(resource) => this.openResource(resource)}
							onResourceDelete={(resource) => this.onResourceDelete(resource)}
						/>}
					</div>
					}
				</div>
				<ButtonBar
					onCancelClick={() => this.props.dispatch({ type: 'NAV_BACK' })}
				/>
			</div>
		);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mapStateToProps = (state: any) => ({
	themeId: state.settings.theme,
});

const ResourceScreen = connect(mapStateToProps)(ResourceScreenComponent);

module.exports = { ResourceScreen };
