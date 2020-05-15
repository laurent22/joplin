/* eslint-disable react-hooks/rules-of-hooks */
const React = require('react');
const { useState, useRef } = require('react');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

let outsideResolve;

const getMarkdown = () => {
	return new Promise(function(resolve) {
		outsideResolve = resolve;
	});
};

const MarkdownTable = (props) => {

	const theme = themeStyle(props.theme);

	const styles_ = {
		page: {
			minWidth: 'unset',
		},
		title: {
			margin: '1.2em',
		},
		table: {
			borderSpacing: 1,
			borderCollapse: 'unset',
			backgroundColor: theme.backgroundColor,
			cursor: 'pointer',
			margin: '1.2em',
			marginBottom: '0',
		},
	};

	const [x, setX] = useState(0);
	const [y, setY] = useState(0);
	const tableEl = useRef(null);

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

		setX(col);
		setY(row);
		if (table) {
			for (let j = 0; j < table.rows.length; j++) {
				for (let i = 0; i < table.rows[j].cells.length; i++) {
					if (j < row && i < col) {
						table.rows[j].cells[i].style.background = '#DEF';
					} else {
						table.rows[j].cells[i].style.background = theme.backgroundColor;
					}
				}
			}
		}
	};


	const getMarkdownRule = () => {
		let tableString = '',
			i = 0,
			j = 0;

		// Header
		for (j = 1; j <= x; j++) {
			tableString += '|     ';
		}
		tableString += '|\n';

		// Separator
		for (j = 1; j <= x; j++) {
			tableString += '| --- ';
		}
		tableString += '|\n';

		// Body
		for (i = 1; i <= y; i++) {
			for (j = 1; j <= x; j++) {
				tableString += '|     ';
			}
			tableString += '|\n';
		}

		outsideResolve(tableString);
		return tableString;
	};

	const closeDialog = () => {
		if (props.onClose) {
			props.onClose();
		}
	};

	const onClickHandler = () => {
		getMarkdownRule();
		closeDialog();

	};

	const onCancelClickHandler = () => {
		outsideResolve('');
		closeDialog();
	};

	return (
		<div className="smalltalk">
			<div className="page" style={styles_.page}>
				<div style={styles_.title}>
					<div style={theme.dialogTitle}>{_(`Rows: ${y} Columns: ${x}`)}</div>
				</div>
				<table
					className="tableEl"
					style={styles_.table}
					onMouseMove={_onMouseMove}
					ref={tableEl}
				>
					<tbody>
						{Array(10).fill().map(() => {
							return (
								<tr>
									{Array(10).fill().map(() => {
										return (
											<td onClick={onClickHandler}></td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
				<div className="action-area">
					<div className="button-strip">
						<button style={theme.button} onClick={onCancelClickHandler}>
							{'Cancel'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

module.exports = {
	MarkdownTable,
	getMarkdown,
};
