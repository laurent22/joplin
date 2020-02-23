const React = require('react');

class ItemList extends React.Component {
	constructor() {
		super();

		this.scrollTop_ = 0;

		this.listRef = React.createRef();

		this.onScroll = this.onScroll.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
	}

	visibleItemCount(props) {
		if (typeof props === 'undefined') props = this.props;
		return Math.ceil(props.style.height / props.itemHeight);
	}

	updateStateItemIndexes(props) {
		if (typeof props === 'undefined') props = this.props;

		const topItemIndex = Math.floor(this.scrollTop_ / props.itemHeight);
		const visibleItemCount = this.visibleItemCount(props);

		let bottomItemIndex = topItemIndex + (visibleItemCount - 1);
		if (bottomItemIndex >= props.items.length) bottomItemIndex = props.items.length - 1;

		this.setState({
			topItemIndex: topItemIndex,
			bottomItemIndex: bottomItemIndex,
		});
	}

	UNSAFE_componentWillMount() {
		this.updateStateItemIndexes();
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		this.updateStateItemIndexes(newProps);
	}

	onScroll(event) {
		this.scrollTop_ = event.target.scrollTop;
		this.updateStateItemIndexes();
	}

	onKeyDown(event) {
		if (this.props.onKeyDown) this.props.onKeyDown(event);
	}

	makeItemIndexVisible(itemIndex) {
		const top = Math.min(this.props.items.length - 1, this.state.topItemIndex);
		const bottom = Math.max(0, this.state.bottomItemIndex);

		if (itemIndex >= top && itemIndex <= bottom) return;

		let scrollTop = 0;
		if (itemIndex < top) {
			scrollTop = this.props.itemHeight * itemIndex;
		} else {
			scrollTop = this.props.itemHeight * itemIndex - (this.visibleItemCount() - 1) * this.props.itemHeight;
		}

		if (scrollTop < 0) scrollTop = 0;

		this.scrollTop_ = scrollTop;
		this.listRef.current.scrollTop = scrollTop;

		this.updateStateItemIndexes();
	}

	render() {
		const items = this.props.items;
		const style = Object.assign({}, this.props.style, {
			overflowX: 'hidden',
			overflowY: 'auto',
		});

		if (!this.props.itemHeight) throw new Error('itemHeight is required');

		const blankItem = function(key, height) {
			return <div key={key} style={{ height: height }}></div>;
		};

		let itemComps = [blankItem('top', this.state.topItemIndex * this.props.itemHeight)];

		for (let i = this.state.topItemIndex; i <= this.state.bottomItemIndex; i++) {
			const itemComp = this.props.itemRenderer(items[i]);
			itemComps.push(itemComp);
		}

		itemComps.push(blankItem('bottom', (items.length - this.state.bottomItemIndex - 1) * this.props.itemHeight));

		let classes = ['item-list'];
		if (this.props.className) classes.push(this.props.className);

		return (
			<div ref={this.listRef} className={classes.join(' ')} style={style} onScroll={this.onScroll} onKeyDown={this.onKeyDown}>
				{itemComps}
			</div>
		);
	}
}

module.exports = { ItemList };
