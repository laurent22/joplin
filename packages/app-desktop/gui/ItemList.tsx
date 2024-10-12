import * as React from 'react';
import { DragEventHandler, KeyboardEventHandler, UIEventHandler } from 'react';

interface Props<ItemType> {
	style: React.CSSProperties & { height: number };
	itemHeight: number;
	items: ItemType[];

	disabled?: boolean;
	className?: string;

	itemRenderer: (item: ItemType, index: number)=> React.JSX.Element;
	renderContentWrapper?: (listItems: React.ReactNode[])=> React.ReactNode;
	onKeyDown?: KeyboardEventHandler<HTMLElement>;
	onItemDrop?: DragEventHandler<HTMLElement>;

	selectedIndex?: number;
	alwaysRenderSelection?: boolean;

	id?: string;
	role?: string;
	'aria-label'?: string;
}

interface State {
	topItemIndex: number;
	bottomItemIndex: number;
}

class ItemList<ItemType> extends React.Component<Props<ItemType>, State> {

	private lastScrollTop_: number;
	private listRef: React.MutableRefObject<HTMLDivElement>;

	public constructor(props: Props<ItemType>) {
		super(props);

		this.lastScrollTop_ = 0;

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

		const topItemIndex = Math.floor(this.offsetScroll() / props.itemHeight);
		const visibleItemCount = this.visibleItemCount(props);

		let bottomItemIndex = topItemIndex + visibleItemCount;
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
		return this.container?.scrollTop ?? this.lastScrollTop_;
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
		this.lastScrollTop_ = (event.target as HTMLElement).scrollTop;
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
		// The first and last visible indices are often partially out of view and can thus be made more visible
		if (this.isIndexVisible(itemIndex) && itemIndex !== this.lastVisibleIndex && itemIndex !== this.firstVisibleIndex) {
			return;
		}

		const currentScroll = this.offsetScroll();
		let scrollTop = currentScroll;
		if (itemIndex <= this.firstVisibleIndex) {
			scrollTop = this.props.itemHeight * itemIndex;
		} else if (itemIndex >= this.lastVisibleIndex - 1) {
			const scrollBottom = this.props.itemHeight * (itemIndex + 1);
			scrollTop = scrollBottom - this.props.style.height;
		}

		if (scrollTop < 0) scrollTop = 0;

		if (currentScroll !== scrollTop) {
			this.lastScrollTop_ = scrollTop;
			this.listRef.current.scrollTop = scrollTop;

			this.updateStateItemIndexes();
		}
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

		type RenderRange = { from: number; to: number };
		const renderableBlocks: RenderRange[] = [];

		if (this.props.alwaysRenderSelection && isFinite(this.props.selectedIndex)) {
			const selectionVisible = this.props.selectedIndex >= this.state.topItemIndex && this.props.selectedIndex <= this.state.bottomItemIndex;
			const isValidSelection = this.props.selectedIndex >= 0 && this.props.selectedIndex < items.length;
			if (!selectionVisible && isValidSelection) {
				renderableBlocks.push({ from: this.props.selectedIndex, to: this.props.selectedIndex });
			}
		}

		renderableBlocks.push({ from: this.state.topItemIndex, to: this.state.bottomItemIndex });

		// Ascending order
		renderableBlocks.sort(({ from: fromA }, { from: fromB }) => fromA - fromB);

		const itemComps: React.ReactNode[] = [];
		for (let i = 0; i < renderableBlocks.length; i++) {
			const currentBlock = renderableBlocks[i];
			if (i === 0) {
				itemComps.push(blankItem('top', currentBlock.from * this.props.itemHeight));
			}

			for (let j = currentBlock.from; j <= currentBlock.to; j++) {
				const itemComp = this.props.itemRenderer(items[j], j);
				itemComps.push(itemComp);
			}

			const nextBlockFrom = i + 1 < renderableBlocks.length ? renderableBlocks[i + 1].from : items.length;
			itemComps.push(blankItem(`after-${i}`, (nextBlockFrom - currentBlock.to - 1) * this.props.itemHeight));
		}

		const classes = ['item-list'];
		if (this.props.className) classes.push(this.props.className);

		const wrapContent = this.props.renderContentWrapper ?? ((children) => <>{children}</>);
		return (
			<div
				ref={this.listRef}
				className={classes.join(' ')}
				style={style}

				id={this.props.id}
				role={this.props.role}
				aria-label={this.props['aria-label']}
				aria-setsize={items.length}

				onScroll={this.onScroll}
				onKeyDown={this.onKeyDown}
				onDrop={this.onDrop}
			>
				{wrapContent(itemComps)}
			</div>
		);
	}
}

export default ItemList;
