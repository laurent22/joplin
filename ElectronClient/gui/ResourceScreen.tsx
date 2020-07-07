import * as React from 'react';

const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('lib/theme');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header/Header.min.js');
const prettyBytes = require('pretty-bytes');
const Resource = require('lib/models/Resource.js');

interface Style {
	width: number
	height: number
}

interface Props {
	theme: any;
	style: Style
}

interface Resource {
	title: string
	id: string
	size: number
	file_extension: string
}

interface State {
	resources: Resource[] | undefined
	sorting: ActiveSorting
	isLoading: boolean
}

interface ResourceTable {
	resources: Resource[]
	sorting: ActiveSorting
	onResourceClick: (resource: Resource) => any
	onResourceDelete: (resource: Resource) => any
	onToggleSorting: (order: SortingOrder) => any
	theme: any
	style: Style
}

type SortingOrder = 'size' | 'name'
type SortingType = 'asc' | 'desc'

interface ActiveSorting {
	order: SortingOrder
	type: SortingType
}

const ResourceTable: React.FC<ResourceTable> = (props: ResourceTable) => {
	const sortOrderEngagedMarker = (s: SortingOrder) => {
		return (
			<a href="#"
				style={{ color: props.theme.urlColor }}
				onClick={() => props.onToggleSorting(s)}>{
					(props.sorting.order === s && props.sorting.type === 'desc') ? '▾' : '▴'}</a>
		);
	};

	const titleCellStyle = {
		...props.theme.textStyle,
		textOverflow: 'ellipsis',
		overflowX: 'hidden',
		maxWidth: 1,
		width: '100%',
		whiteSpace: 'nowrap',
	};

	const cellStyle = {
		...props.theme.textStyle,
		whiteSpace: 'nowrap',
		color: props.theme.colorFaded,
		width: 1,
	};

	const headerStyle = {
		...props.theme.textStyle,
		whiteSpace: 'nowrap',
		width: 1,
		fontWeight: 'bold',
	};

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
				{props.resources.map((resource: Resource, index: number) =>
					<tr key={index}>
						<td style={titleCellStyle} className="titleCell">
							<a
								style={{ color: props.theme.urlColor }}
								href="#"
								onClick={() => props.onResourceClick(resource)}>{resource.title || `(${_('Untitled')})`}
							</a>
						</td>
						<td style={cellStyle} className="dataCell">{prettyBytes(resource.size)}</td>
						<td style={cellStyle} className="dataCell">{resource.id}</td>
						<td style={cellStyle} className="dataCell">
							<button style={props.theme.buttonStyle} onClick={() => props.onResourceDelete(resource)}>{_('Delete')}</button>
						</td>
					</tr>
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

const MAX_RESOURCES = 10000;

class ResourceScreenComponent extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			resources: undefined,
			sorting: {
				type: 'asc',
				order: 'name',
			},
			isLoading: false,
		};
	}

	async reloadResources(sorting: ActiveSorting) {
		this.setState({ isLoading: true });
		const resources = await Resource.all({
			order: [{
				by: getSortingOrderColumn(sorting.order),
				dir: sorting.type,
			}],
			limit: MAX_RESOURCES,
			fields: ['title', 'id', 'size', 'file_extension'],
		});
		this.setState({ resources, isLoading: false });
	}

	componentDidMount() {
		this.reloadResources(this.state.sorting);
	}

	onResourceDelete(resource: Resource) {
		const ok = bridge().showConfirmMessageBox(_('Delete attachment "%s"?', resource.title), {
			buttons: [_('Delete'), _('Cancel')],
			defaultId: 1,
		});
		if (!ok) {
			return;
		}
		Resource.delete(resource.id)
			.catch((error: Error) => {
				bridge().showErrorMessageBox(error.message);
			})
			.finally(() => {
				this.reloadResources(this.state.sorting);
			});
	}

	openResource(resource: Resource) {
		const resourcePath = Resource.fullPath(resource);
		const ok = bridge().openExternal(`file://${resourcePath}`);
		if (!ok) {
			bridge().showErrorMessageBox(`This file could not be opened: ${resourcePath}`);
		}
	}

	onToggleSortOrder(sortOrder: SortingOrder) {
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
		this.reloadResources(newSorting);
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const headerStyle = Object.assign({}, theme.headerStyle, { width: style.width });

		const rootStyle:any = {
			...style,
			overflowY: 'scroll',
			color: theme.color,
			padding: 20,
			boxSizing: 'border-box',
		};
		rootStyle.height = style.height - 35; // Minus the header height
		delete rootStyle.width;

		return (
			<div style={{ ...theme.containerStyle, fontFamily: theme.fontFamily }}>
				<Header style={headerStyle} />
				<div style={rootStyle}>
					<div style={{ ...theme.notificationBox, marginBottom: 10 }}>{
						_('This is an advanced tool to show the attachments that are linked to your notes. Please be careful when deleting one of them as they cannot be restored afterwards.')
					}</div>
					{this.state.isLoading && <div>{_('Please wait...')}</div>}
					{!this.state.isLoading && <div>
						{!this.state.resources && <div>
							{_('No resources!')}
						</div>
						}
						{this.state.resources && this.state.resources.length === MAX_RESOURCES &&
							<div>{_('Warning: not all resources shown for performance reasons (limit: %s).', MAX_RESOURCES)}</div>
						}
						{this.state.resources && <ResourceTable
							theme={theme}
							style={style}
							resources={this.state.resources}
							sorting={this.state.sorting}
							onToggleSorting={(order) => this.onToggleSortOrder(order)}
							onResourceClick={(resource) => this.openResource(resource)}
							onResourceDelete={(resource) => this.onResourceDelete(resource)}
						/>}
					</div>
					}
				</div>
			</div>
		);
	}
}

const mapStateToProps = (state: any) => ({
	theme: state.settings.theme,
});

const ResourceScreen = connect(mapStateToProps)(ResourceScreenComponent);

module.exports = { ResourceScreen };
