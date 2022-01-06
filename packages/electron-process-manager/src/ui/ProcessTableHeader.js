import React from 'react';
import PropTypes from 'prop-types';


export default class ProcessTableHeader extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }
  static propTypes = {
    children: PropTypes.node,
    path: PropTypes.string.isRequired,
    sorting: PropTypes.PropTypes.shape({
      path: PropTypes.string,
      how: PropTypes.string
    }),
    onSortingChange: PropTypes.func
  }

  getSortCharacter() {
    if (!this.sortHow) return (
      <span>&nbsp;</span>
    );
    return this.sortHow == 'ascending' ? '👆' : '👇'
  }

  get sortHow() {
    if (!this.props.sorting) return null;

    if (this.props.sorting.path == this.props.path){
      return this.props.sorting.how;
    }
    return null;
  }

  handleClick() {
    let nextSortHow = null;
    if(this.sortHow === null) {
      nextSortHow = 'ascending';
    } else if (this.sortHow === 'ascending') {
      nextSortHow = 'descending';
    } else {
      nextSortHow = null;
    }
    this.props.onSortingChange({
      path: this.props.path,
      how: nextSortHow
    });
  }
  render() {
    return (
      <th onClick={this.handleClick}>
        {this.props.children}
        &nbsp;
        {this.getSortCharacter()}
      </th>
    )
  }
}
