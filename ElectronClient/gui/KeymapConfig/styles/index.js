'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const { buildStyle } = require('lib/theme');
function styles(themeId) {
	return buildStyle('KeymapConfigScreen', themeId, (theme) => {
		return {
			container: Object.assign(Object.assign({}, theme.containerStyle), { padding: 16 }),
			actionsContainer: {
				display: 'flex',
				flexDirection: 'row',
			},
			recorderContainer: {
				padding: 2,
				flexGrow: 1,
			},
			filterInput: Object.assign(Object.assign({}, theme.inputStyle), { flexGrow: 1, minHeight: 29, alignSelf: 'center' }),
			recorderInput: Object.assign(Object.assign({}, theme.inputStyle), { minHeight: 29 }),
			label: Object.assign(Object.assign({}, theme.textStyle), { alignSelf: 'center', marginRight: 10 }),
			table: Object.assign(Object.assign({}, theme.containerStyle), { marginTop: 16, overflow: 'auto', width: '100%' }),
			tableShortcutColumn: Object.assign(Object.assign({}, theme.textStyle), { width: '60%' }),
			tableCommandColumn: Object.assign(Object.assign({}, theme.textStyle), { width: 'auto' }),
			tableCell: {
				display: 'flex',
				flexDirection: 'row',
			},
			tableCellContent: {
				flexGrow: 1,
				alignSelf: 'center',
			},
			tableCellStatus: {
				height: '100%',
				alignSelf: 'center',
			},
			kbd: {
				fontFamily: 'sans-serif',
				border: '1px solid',
				borderRadius: 4,
				backgroundColor: theme.raisedBackgroundColor,
				padding: 2,
				paddingLeft: 6,
				paddingRight: 6,
			},
			disabled: {
				color: theme.colorFaded,
				fontStyle: 'italic',
			},
			inlineButton: Object.assign(Object.assign({}, theme.buttonStyle), { marginLeft: 12 }),
			warning: Object.assign(Object.assign({}, theme.textStyle), { backgroundColor: theme.warningBackgroundColor, paddingLeft: 16, paddingRight: 16, paddingTop: 2, paddingBottom: 2 }),
		};
	});
}
exports.default = styles;
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFNUMsU0FBd0IsTUFBTSxDQUFDLE9BQWU7SUFDN0MsT0FBTyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBVSxFQUFFLEVBQUU7UUFDL0QsT0FBTztZQUNOLFNBQVMsa0NBQ0wsS0FBSyxDQUFDLGNBQWMsS0FDdkIsT0FBTyxFQUFFLEVBQUUsR0FDWDtZQUNELGdCQUFnQixFQUFFO2dCQUNqQixPQUFPLEVBQUUsTUFBTTtnQkFDZixhQUFhLEVBQUUsS0FBSzthQUNwQjtZQUNELGlCQUFpQixFQUFFO2dCQUNsQixPQUFPLEVBQUUsQ0FBQztnQkFDVixRQUFRLEVBQUUsQ0FBQzthQUNYO1lBQ0QsV0FBVyxrQ0FDUCxLQUFLLENBQUMsVUFBVSxLQUNuQixRQUFRLEVBQUUsQ0FBQyxFQUNYLFNBQVMsRUFBRSxFQUFFLEVBQ2IsU0FBUyxFQUFFLFFBQVEsR0FDbkI7WUFDRCxhQUFhLGtDQUNULEtBQUssQ0FBQyxVQUFVLEtBQ25CLFNBQVMsRUFBRSxFQUFFLEdBQ2I7WUFDRCxLQUFLLGtDQUNELEtBQUssQ0FBQyxTQUFTLEtBQ2xCLFNBQVMsRUFBRSxRQUFRLEVBQ25CLFdBQVcsRUFBRSxFQUFFLEdBQ2Y7WUFDRCxLQUFLLGtDQUNELEtBQUssQ0FBQyxjQUFjLEtBQ3ZCLFNBQVMsRUFBRSxFQUFFLEVBQ2IsUUFBUSxFQUFFLE1BQU0sRUFDaEIsS0FBSyxFQUFFLE1BQU0sR0FDYjtZQUNELG1CQUFtQixrQ0FDZixLQUFLLENBQUMsU0FBUyxLQUNsQixLQUFLLEVBQUUsS0FBSyxHQUNaO1lBQ0Qsa0JBQWtCLGtDQUNkLEtBQUssQ0FBQyxTQUFTLEtBQ2xCLEtBQUssRUFBRSxNQUFNLEdBQ2I7WUFDRCxTQUFTLEVBQUU7Z0JBQ1YsT0FBTyxFQUFFLE1BQU07Z0JBQ2YsYUFBYSxFQUFFLEtBQUs7YUFDcEI7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsU0FBUyxFQUFFLFFBQVE7YUFDbkI7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLE1BQU0sRUFBRSxNQUFNO2dCQUNkLFNBQVMsRUFBRSxRQUFRO2FBQ25CO1lBQ0QsR0FBRyxFQUFFO2dCQUNKLFVBQVUsRUFBRSxZQUFZO2dCQUN4QixNQUFNLEVBQUUsV0FBVztnQkFDbkIsWUFBWSxFQUFFLENBQUM7Z0JBQ2YsZUFBZSxFQUFFLEtBQUssQ0FBQyxxQkFBcUI7Z0JBQzVDLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFdBQVcsRUFBRSxDQUFDO2dCQUNkLFlBQVksRUFBRSxDQUFDO2FBQ2Y7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLEtBQUssQ0FBQyxVQUFVO2dCQUN2QixTQUFTLEVBQUUsUUFBUTthQUNuQjtZQUNELFlBQVksa0NBQ1IsS0FBSyxDQUFDLFdBQVcsS0FDcEIsVUFBVSxFQUFFLEVBQUUsR0FDZDtZQUNELE9BQU8sa0NBQ0gsS0FBSyxDQUFDLFNBQVMsS0FDbEIsZUFBZSxFQUFFLEtBQUssQ0FBQyxzQkFBc0IsRUFDN0MsV0FBVyxFQUFFLEVBQUUsRUFDZixZQUFZLEVBQUUsRUFBRSxFQUNoQixVQUFVLEVBQUUsQ0FBQyxFQUNiLGFBQWEsRUFBRSxDQUFDLEdBQ2hCO1NBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQW5GRCx5QkFtRkMifQ==
