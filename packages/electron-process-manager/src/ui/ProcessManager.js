import React from 'react';
import { ipcRenderer } from 'electron';
import * as remote from '@electron/remote';
import objectPath from 'object-path';

import ProcessTable from './ProcessTable';
import ToolBar from './ToolBar';

export default class ProcessManager extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      processData: null,
      selectedPid: null,
      sorting: {
        path: null,
        how: null
      }
    };
  }

  UNSAFE_componentWillMount() {
    this.setState({ sorting: remote.getCurrentWindow().defaultSorting });
    ipcRenderer.on('process-manager:data', (_, data) => {
      this.setState({ processData: data });
    })
  }

  canKill() {
    if (!this.state.selectedPid) return false;
    const pids = this.state.processData.map(p => p.pid);

    // verify that select pid is in list of processes
    return pids.indexOf(this.state.selectedPid) !== -1;
  }

  canOpenDevTool() {
    return this.canKill() && this.getWebContentsIdForSelectedProcess() !== null;
  }

  getWebContentsIdForSelectedProcess() {
    const { processData, selectedPid } = this.state;
    if (!selectedPid) return null;

    const process = processData.find(p => p.pid === selectedPid);
    if (!process || !process.webContents || process.webContents.length === 0) return null;

    return process.webContents[0].id;
  }

  handleKillProcess() {
    const pid = this.state.selectedPid;
    if (!pid) return;
    ipcRenderer.send('process-manager:kill-process', pid);
  }

  handleOpenDevTool() {
    const webContentsId = this.getWebContentsIdForSelectedProcess();
    ipcRenderer.send('process-manager:open-dev-tools', webContentsId);
  }

  getProcessData() {
    const { processData, sorting } = this.state;

    if (!sorting.path || !sorting.how) return processData;

    return processData.sort((p1, p2) => {
      const p1Metric = objectPath.get(p1, sorting.path);
      const p2Metric = objectPath.get(p2, sorting.path);

      if (p1Metric === p2Metric) return 0;
      const comp =  p1Metric < p2Metric ? -1 : 1;

      return sorting.how == 'ascending' ? comp : -comp;
    });
  }

  render () {
    const { processData } = this.state;
    if (!processData) return (<span>No data</span>);

    return (
      <div className="window">
        <header className="toolbar toolbar-header">
          <ToolBar
            disableKill={!this.canKill()}
            onKillClick={this.handleKillProcess.bind(this)}
            disabelOpenDevTool={!this.canOpenDevTool()}
            onOpenDevToolClick={this.handleOpenDevTool.bind(this)}

          />
        </header>
        <div className="process-table-container">
          <ProcessTable
            processData={this.getProcessData()}
            selectedPid={this.state.selectedPid}
            sorting={this.state.sorting}
            onSortingChange={sorting => this.setState({ sorting })}
            onSelectedPidChange={pid => this.setState({ selectedPid: pid })}
            />
        </div>
      </div>
    )
  }
}
