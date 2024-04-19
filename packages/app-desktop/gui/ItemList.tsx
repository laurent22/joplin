import * as React from 'react';
import { DragEventHandler, KeyboardEventHandler, UIEventHandler } from 'react';

interface Props<ItemType> {
	style: React.CSSProperties & { height: number };
	itemHeight: number;
	items: ItemType[];
	disabled?: boolean;
	onKeyDown?: KeyboardEventHandler<HTMLElement>;
	itemRenderer: (item: ItemType, index: number)=> React.JSX.Element;
	className?: string;
	onItemDrop?: DragEventHandler<HTMLElement>;
}

interface State {
	topItemIndex: number;
	bottomItemIndex: number;
}

class ItemList<ItemType> extends React.Component<Props<ItemType>, State> {

	private scrollTop_: number;
	private listRef: React.MutableRefObject<HTMLDivElement>;

	public constructor(props: Props<ItemType>) {
		super(props);

		this.scrollTop_ = 0;

		this.listRef = React.createRef();

		this.onScroll = this.onScroll.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onDrop = this.onDrop.bind(this);
	}

	public visibleItemCount(props: Props<ItemType> = undefined) {
		if (typeof props === 'undefined') props = this.props;
		return Math.ceil(props.style.height / props.itemHeight);
	}

	public updateStateItemIndexes(props: Props<ItemType> = undefined) {
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

	public offsetTop() {
		return this.listRef.current ? this.listRef.current.offsetTop : 0;
	}

	public offsetScroll() {
		return this.scrollTop_;
	}

	public get container() {
		return this.listRef.current;
	}

	public UNSAFE_componentWillMount() {
		this.updateStateItemIndexes();
	}

	public UNSAFE_componentWillReceiveProps(newProps: Props<ItemType>) {
		this.updateStateItemIndexes(newProps);
	}

	public onScroll: UIEventHandler<HTMLDivElement> = event => {
		this.scrollTop_ = (event.target as HTMLElement).scrollTop;
		this.updateStateItemIndexes();
	};

	public onKeyDown: KeyboardEventHandler<HTMLElement> = event => {
		if (this.props.onKeyDown) this.props.onKeyDown(event);
	};

	public onDrop: DragEventHandler<HTMLElement> = event => {
		if (this.props.onItemDrop) this.props.onItemDrop(event);
	};

	public get firstVisibleIndex() {
		return Math.min(this.props.items.length - 1, this.state.topItemIndex);
	}

	public get lastVisibleIndex() {
		return Math.max(0, this.state.bottomItemIndex);
	}

	public isIndexVisible(itemIndex: number) {
		return itemIndex >= this.firstVisibleIndex && itemIndex <= this.lastVisibleIndex;
	}

	public makeItemIndexVisible(itemIndex: number) {
		if (this.isIndexVisible(itemIndex)) return;

		const top = this.firstVisibleIndex;

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

	// shouldComponentUpdate(nextProps, nextState) {
	// 	for (const n in this.props) {
	// 		if (this.props[n] !== nextProps[n]) {
	// 			console.info('Props', n, nextProps[n]);
	// 		}
	// 	}

	// 	for (const n in this.state) {
	// 		if (this.state[n] !== nextState[n]) {
	// 			console.info('State', n, nextState[n]);
	// 		}
	// 	}

	// 	return true;
	// }

	public render() {
		const items = this.props.items;
		const style: React.CSSProperties = {
			...this.props.style,
			overflowX: 'hidden',
			overflowY: 'auto',
		};

		// if (this.props.disabled) style.opacity = 0.5;

		if (!this.props.itemHeight) throw new Error('itemHeight is required');

		const blankItem = function(key: string, height: number) {
			return <div key={key} style={{ height: height }}></div>;
		};

		const itemComps = [blankItem('top', this.state.topItemIndex * this.props.itemHeight)];

		for (let i = this.state.topItemIndex; i <= this.state.bottomItemIndex; i++) {
			const itemComp = this.props.itemRenderer(items[i], i);
			itemComps.push(itemComp);
		}

		itemComps.push(blankItem('bottom', (items.length - this.state.bottomItemIndex - 1) * this.props.itemHeight));

		const classes = ['item-list'];
		if (this.props.className) classes.push(this.props.className);

		return (
			<div ref={this.listRef} className={classes.join(' ')} style={style} onScroll={this.onScroll} onKeyDown={this.onKeyDown} onDrop={this.onDrop}>
				{itemComps}
			</div>
		);
	}
}

export default ItemList;
