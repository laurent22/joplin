/* eslint-disable react-hooks/rules-of-hooks */
const React = require('react');
const { useState, useRef } = require('react');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

let promise;

const getMarkdown = async () => {
	const str = await promise;
	console.log(str);
	return str;
};

const MarkdownTable = (props) => {

	const theme = themeStyle(props.theme);

	const styles_ = {
		table: {
			maxWidth: 400,
			borderSpacing: 1,
			borderCollapse: 'unset',
			backgroundColor: theme.backgroundColor,
			cursor: 'pointer',
		},
	};

	const [x, setX] = useState(0);
	const [y, setY] = useState(0);
	const tableEl = useRef(null);
	const wrapperRef = useRef(null);
	// const refWrapper = useRef(initialValue);


	const _onMouseMove = (event) => {
		const table = tableEl.current;
		const height = table.clientHeight;
		const width = table.clientWidth;

		// we cannot use event.offsetX which give the relative position of the mouse with respect to
		// the div as here we are dealing with neseted elements and not a plain div, a table has <tr> and
		// <td> elements which confuses react, which element is the point of reference, more info:
		// https://stackoverflow.com/questions/3234256/find-mouse-position-relative-to-element

		const obj = table.getBoundingClientRect();
		const oX = event.clientX - obj.left; // x position within the element.
		const oY = event.clientY - obj.top; // y position within the element.

		const col = Math.floor((oX / width) * 10) + 1;
		const row = Math.floor((oY / height) * 10) + 1;
		//   console.log(`X->${event.nativeEvent.offsetX} Y->${event.nativeEvent.offsetY}`);

		setX(col);
		setY(row);
		// console.log(this.refs);
		if (table) {
			for (let j = 0; j < table.rows.length; j++) {
				for (let i = 0; i < table.rows[j].cells.length; i++) {
					if (j < row && i < col) {
						// console.log('do we ever come here')
						table.rows[j].cells[i].style.background = '#DEF';
					} else {
						table.rows[j].cells[i].style.background = theme.backgroundColor;
					}
				}
			}
		}
	};


	const getMarkdownRule = () => {
		const array = [];
		let str = '',
			i = 0,
			j = 0;
		// every table should have a heading
		for (i = 1; i <= 2; i++) {
			for (j = 1; j <= x; j++) {
				str += i === 1 ? '|     ' : '| --- ';
			}
			str += '|';
			array.push(str);
			str = '';
		}

		for (i = 1; i <= y; i++) {
			for (j = 1; j <= x; j++) {
				str += '|     ';
			}
			str += '|';
			array.push(str);
			str = '';
		}
		str = array.join('\n');
		promise = new Promise(resolve => resolve(str));
		return (str);
		// this.promise = new Promise(resolve=> resolve(str));
	};

	const closeDialog = () => {
		if (props.onClose) {
			props.onClose();
		}
	};

	const onClickHandler = () => {
		console.log(getMarkdownRule());
		closeDialog();

	};
	return (
		<div style={theme.dialogModalLayer}>
			<div className="wrapperdiv" style={theme.dialogBox} ref={wrapperRef}>
				<div style={theme.dialogTitle}>{_(`Rows:${y} Columns:${x}`)}</div>

				<table
					className="tableEl"
					style={styles_.table}
					onMouseMove={_onMouseMove}
					// onMouseOut={this._onMouseOut}
					ref={tableEl}
				>
					<tbody>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
						<tr>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
							<td onClick={onClickHandler}> </td>
						</tr>
					</tbody>
				</table>
				<button onClick={onClickHandler}>
					{'Close'}
				</button>
			</div>
		</div>
	);

};

module.exports = {
	MarkdownTable,
	getMarkdown,
};
