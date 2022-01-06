import React from 'react';
import PropTypes from 'prop-types';
import filesize from 'filesize';
import format from 'format-number';

const KB = 1024;
const formatPercentage = format({
  round: 1,
  padRight: 1
});

export default class ProcessRow extends React.Component {
  static propTypes = {
    pid: PropTypes.number,
    type: PropTypes.string,
    memory: PropTypes.shape({
      peakWorkingSetSize: PropTypes.number,
      workingSetSize: PropTypes.number
    }),
    cpu: PropTypes.shape({
      percentCPUUsage: PropTypes.number,
      idleWakeupsPerSecond: PropTypes.number
    }),
    webContents: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      type: PropTypes.string,
      URL: PropTypes.string,
      URLDomain: PropTypes.string
    })),
    selected: PropTypes.bool,
    onSelect: PropTypes.func
  }

  render() {
    const { webContents, memory } = this.props;
    if (!webContents || webContents.length === 0) {
      return (
        <tr
          className={this.props.selected ? 'selected': ''}
          onClick={this.props.onSelect}
        >
          <td>{this.props.pid}</td>
          <td></td>
          <td>{this.props.type}</td>
          <td>{memory ? filesize(memory.workingSetSize*KB) : 'N/A'}</td>
          <td>{formatPercentage(this.props.cpu.percentCPUUsage)}</td>
          <td>{this.props.cpu.idleWakeupsPerSecond}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      )
    } else {
      // FIX ME: we consider we have only have 1 webContents per process
      const wc = webContents[0];

      return (
        <tr
          className={this.props.selected ? 'selected': ''}
          onClick={this.props.onSelect}
        >
          <td>{this.props.pid}</td>
          <td>{wc.URLDomain}</td>
          <td>{this.props.type}</td>
          <td>{memory ? filesize(memory.workingSetSize*KB) : 'N/A'}</td>
          <td>{formatPercentage(this.props.cpu.percentCPUUsage)}</td>
          <td>{this.props.cpu.idleWakeupsPerSecond}</td>
          <td>{wc.id}</td>
          <td>{wc.type}</td>
          <td>{wc.URL}</td>
        </tr>
      )
    }
  }
}
