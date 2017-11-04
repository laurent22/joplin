class ItemList extends React.Component {

	constructor() {
		super();

		this.scrollTop_ = 0;
	}

	componentWillMount() {
		this.setState({
			topItemIndex: this.topItemIndex(),
			bottomItemIndex: this.bottomItemIndex(),
		});
	}

	onScroll(scrollTop) {
		this.scrollTop_ = scrollTop;

		this.setState({
			topItemIndex: this.topItemIndex(),
			bottomItemIndex: this.bottomItemIndex(),
		});
	}

	topItemIndex() {
		return Math.floor(this.scrollTop_ / this.props.itemHeight);
	}

	visibleItemCount() {
		return Math.ceil(this.props.style.height / this.props.itemHeight);
	}

	bottomItemIndex() {
		let r = this.topItemIndex() + this.visibleItemCount();
		if (r >= this.props.items.length) r = this.props.items.length - 1;
		return r;
	}

	render() {
		const items = this.props.items;

		if (!this.props.itemHeight) throw new Error('itemHeight is required');

		const blankItem = function(key, height) {
			return <div key={key} style={{height:height}}></div>
		}

		let itemComps = [blankItem('top', this.state.topItemIndex * this.props.itemHeight)];

		for (let i = this.state.topItemIndex; i <= this.state.bottomItemIndex; i++) {
			const itemComp = this.props.itemRenderer(i, items[i]);
			itemComps.push(itemComp);
		}

		itemComps.push(blankItem('bottom', (items.length - this.state.bottomItemIndex - 1) * this.props.itemHeight));

		let classes = ['item-list'];
		if (this.props.className) classes.push(this.props.className);

		const that = this;

		return (
			<div className={classes.join(' ')} style={this.props.style} onScroll={ (event) => { this.onScroll(event.target.scrollTop) }}>
				{ itemComps }
			</div>
		);
	}
}

module.exports = { ItemList };