"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const locale_1 = require("@joplin/lib/locale");
const theme_1 = require("@joplin/lib/theme");
const time_1 = require("@joplin/lib/time");
const Datetime = require('react-datetime').default;
const creatable_1 = require("react-select/creatable");
const react_select_1 = require("react-select");
const animated_1 = require("react-select/animated");
class PromptDialog extends React.Component {
    constructor(props) {
        super(props);
        this.answerInput_ = React.createRef();
    }
    UNSAFE_componentWillMount() {
        this.setState({
            visible: false,
            answer: this.props.defaultValue ? this.props.defaultValue : '',
        });
        this.focusInput_ = true;
    }
    UNSAFE_componentWillReceiveProps(newProps) {
        if ('visible' in newProps && newProps.visible !== this.props.visible) {
            this.setState({ visible: newProps.visible });
            if (newProps.visible)
                this.focusInput_ = true;
        }
        if ('defaultValue' in newProps && newProps.defaultValue !== this.props.defaultValue) {
            this.setState({ answer: newProps.defaultValue });
        }
    }
    componentDidUpdate() {
        if (this.focusInput_ && this.answerInput_.current)
            this.answerInput_.current.focus();
        this.focusInput_ = false;
    }
    styles(themeId, width, height, visible) {
        const styleKey = `${themeId}_${width}_${height}_${visible}`;
        if (styleKey === this.styleKey_)
            return this.styles_;
        const theme = theme_1.themeStyle(themeId);
        this.styleKey_ = styleKey;
        this.styles_ = {};
        const paddingTop = 20;
        this.styles_.modalLayer = {
            zIndex: 9999,
            position: 'absolute',
            top: 0,
            left: 0,
            width: width,
            height: height,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: visible ? 'flex' : 'none',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: `${paddingTop}px`,
        };
        this.styles_.promptDialog = {
            backgroundColor: theme.backgroundColor,
            padding: 16,
            display: 'inline-block',
            maxWidth: width * 0.5,
            boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
        };
        this.styles_.button = {
            minWidth: theme.buttonMinWidth,
            minHeight: theme.buttonMinHeight,
            marginLeft: 5,
            color: theme.color,
            backgroundColor: theme.backgroundColor,
            border: '1px solid',
            borderColor: theme.dividerColor,
        };
        this.styles_.label = {
            marginRight: 5,
            fontSize: theme.fontSize,
            color: theme.color,
            fontFamily: theme.fontFamily,
            verticalAlign: 'middle',
        };
        this.styles_.input = {
            width: 0.5 * width,
            maxWidth: 400,
            color: theme.color,
            backgroundColor: theme.backgroundColor,
            border: '1px solid',
            borderColor: theme.dividerColor,
        };
        this.styles_.select = {
            control: (provided) => Object.assign(provided, {
                minWidth: width * 0.2,
                maxWidth: width * 0.5,
                fontFamily: theme.fontFamily,
            }),
            input: (provided) => Object.assign(provided, {
                minWidth: '20px',
                color: theme.color,
            }),
            menu: (provided) => Object.assign(provided, {
                color: theme.color,
                fontFamily: theme.fontFamily,
                backgroundColor: theme.backgroundColor,
            }),
            option: (provided, state) => Object.assign(provided, {
                color: theme.color,
                fontFamily: theme.fontFamily,
                paddingLeft: `${10 + (state.data.indentDepth || 0) * 20}px`,
            }),
            multiValueLabel: (provided) => Object.assign(provided, {
                fontFamily: theme.fontFamily,
            }),
            multiValueRemove: (provided) => Object.assign(provided, {
                color: theme.color,
            }),
        };
        this.styles_.selectTheme = (tagTheme) => Object.assign(tagTheme, {
            borderRadius: 2,
            colors: Object.assign(tagTheme.colors, {
                primary: theme.raisedBackgroundColor,
                primary25: theme.raisedBackgroundColor,
                neutral0: theme.backgroundColor,
                neutral5: theme.backgroundColor,
                neutral10: theme.raisedBackgroundColor,
                neutral20: theme.raisedBackgroundColor,
                neutral30: theme.raisedBackgroundColor,
                neutral40: theme.color,
                neutral50: theme.color,
                neutral60: theme.color,
                neutral70: theme.color,
                neutral80: theme.color,
                neutral90: theme.color,
                danger: theme.backgroundColor,
                dangerLight: theme.colorError2,
            }),
        });
        this.styles_.desc = Object.assign({}, theme.textStyle, {
            marginTop: 10,
        });
        return this.styles_;
    }
    render() {
        const style = this.props.style;
        const theme = theme_1.themeStyle(this.props.themeId);
        const buttonTypes = this.props.buttons ? this.props.buttons : ['ok', 'cancel'];
        const styles = this.styles(this.props.themeId, style.width, style.height, this.state.visible);
        const onClose = (accept, buttonType = null) => {
            if (this.props.onClose) {
                let outputAnswer = this.state.answer;
                if (this.props.inputType === 'datetime') {
                    // outputAnswer = anythingToDate(outputAnswer);
                    outputAnswer = time_1.default.anythingToDateTime(outputAnswer);
                }
                this.props.onClose(accept ? outputAnswer : null, buttonType);
            }
            this.setState({ visible: false, answer: '' });
        };
        const onChange = (event) => {
            this.setState({ answer: event.target.value });
        };
        // const anythingToDate = (o) => {
        // 	if (o && o.toDate) return o.toDate();
        // 	if (!o) return null;
        // 	let m = moment(o, time.dateTimeFormat());
        // 	if (m.isValid()) return m.toDate();
        // 	m = moment(o, time.dateFormat());
        // 	return m.isValid() ? m.toDate() : null;
        // }
        const onDateTimeChange = (momentObject) => {
            this.setState({ answer: momentObject });
        };
        const onSelectChange = (newValue) => {
            this.setState({ answer: newValue });
            this.focusInput_ = true;
        };
        const onKeyDown = (event) => {
            if (event.key === 'Enter') {
                if (this.props.inputType !== 'tags' && this.props.inputType !== 'dropdown') {
                    onClose(true);
                }
                else if (this.answerInput_.current && !this.answerInput_.current.state.menuIsOpen) {
                    // The menu will be open if the user is selecting a new item
                    onClose(true);
                }
            }
            else if (event.key === 'Escape') {
                onClose(false);
            }
        };
        const descComp = this.props.description ? React.createElement("div", { style: styles.desc }, this.props.description) : null;
        let inputComp = null;
        if (this.props.inputType === 'datetime') {
            inputComp = React.createElement(Datetime, { className: "datetime-picker", value: this.state.answer, inputProps: { style: styles.input }, dateFormat: time_1.default.dateFormat(), timeFormat: time_1.default.timeFormat(), onChange: (momentObject) => onDateTimeChange(momentObject) });
        }
        else if (this.props.inputType === 'tags') {
            inputComp = React.createElement(creatable_1.default, { className: "tag-selector", styles: styles.select, theme: styles.selectTheme, ref: this.answerInput_, value: this.state.answer, placeholder: "", components: animated_1.default(), isMulti: true, isClearable: false, backspaceRemovesValue: true, options: this.props.autocomplete, onChange: onSelectChange, onKeyDown: (event) => onKeyDown(event) });
        }
        else if (this.props.inputType === 'dropdown') {
            inputComp = React.createElement(react_select_1.default, { className: "item-selector", styles: styles.select, theme: styles.selectTheme, ref: this.answerInput_, components: animated_1.default(), value: this.props.answer, defaultValue: this.props.defaultValue, isClearable: false, options: this.props.autocomplete, onChange: onSelectChange, onKeyDown: (event) => onKeyDown(event) });
        }
        else {
            inputComp = React.createElement("input", { style: styles.input, ref: this.answerInput_, value: this.state.answer, type: "text", onChange: event => onChange(event), onKeyDown: event => onKeyDown(event) });
        }
        const buttonComps = [];
        if (buttonTypes.indexOf('create') >= 0) {
            buttonComps.push(React.createElement("button", { key: "create", disabled: !this.state.answer, style: styles.button, onClick: () => onClose(true, 'create') }, locale_1._('Create')));
        }
        if (buttonTypes.indexOf('ok') >= 0) {
            buttonComps.push(React.createElement("button", { key: "ok", disabled: !this.state.answer, style: styles.button, onClick: () => onClose(true, 'ok') }, locale_1._('OK')));
        }
        if (buttonTypes.indexOf('cancel') >= 0) {
            buttonComps.push(React.createElement("button", { key: "cancel", style: styles.button, onClick: () => onClose(false, 'cancel') }, locale_1._('Cancel')));
        }
        if (buttonTypes.indexOf('clear') >= 0) {
            buttonComps.push(React.createElement("button", { key: "clear", style: styles.button, onClick: () => onClose(false, 'clear') }, locale_1._('Clear')));
        }
        return (React.createElement("div", { className: "modal-layer", style: styles.modalLayer },
            React.createElement("div", { className: "modal-dialog", style: styles.promptDialog },
                React.createElement("label", { style: styles.label }, this.props.label ? this.props.label : ''),
                React.createElement("div", { style: { display: 'inline-block', color: 'black', backgroundColor: theme.backgroundColor } },
                    inputComp,
                    descComp),
                React.createElement("div", { style: { textAlign: 'right', marginTop: 10 } }, buttonComps))));
    }
}
exports.default = PromptDialog;
//# sourceMappingURL=PromptDialog.js.map