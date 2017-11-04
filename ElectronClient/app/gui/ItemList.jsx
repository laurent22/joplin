class ItemList extends React.Component {

	render() {
		const items = this.props.items;

		let itemComps = [];
		for (let i = 0; i < items.length; i++) {
			const itemComp = this.props.itemRenderer(i, items[i]);
			itemComps.push(itemComp);
		}

		return (
			<div>
				{ itemComps }
			</div>
		);
	}
}

module.exports = { ItemList };