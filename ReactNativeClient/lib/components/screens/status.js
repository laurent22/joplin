import React, { Component } from 'react';
import { ListView, View, Text, Button } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { reg } from 'lib/registry.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { time } from 'lib/time-utils'
import { Logger } from 'lib/logger.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { _ } from 'lib/locale.js';

class StatusScreenComponent extends React.Component {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			reportLines: [],
		};
	}

	componentWillMount() {
		this.resfreshScreen();
	}

	async resfreshScreen() {
		let r = await BaseItem.stats();
		let reportLines = [];

		reportLines.push(_('Sync status (sync items / total items):'));

		for (let n in r.items) {
			if (!r.items.hasOwnProperty(n)) continue;
			reportLines.push(_('%s: %d/%d', n, r.items[n].synced, r.items[n].total));
		}

		if (r.total) reportLines.push(_('Total: %d/%d', r.total.synced, r.total.total));
		if (r.toDelete) reportLines.push(_('To delete: %d', r.toDelete.total));

		reportLines.push('');

		reportLines.push(_('Folders:'));

		let folders = await Folder.all();
		for (let i = 0; i < folders.length; i++) {
			let folder = folders[i];
			reportLines.push(_('%s: %d notes', folders[i].title, await Folder.noteCount(folders[i].id)));
		}

		this.setState({ reportLines: reportLines });
	}

	render() {
		let report = this.state.reportLines ? this.state.reportLines.join("\n") : '';

		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<Text style={{padding: 6, flex: 1, textAlignVertical: 'top'}} multiline={true}>{report}</Text>
				<Button title="Refresh" onPress={() => this.resfreshScreen()}/>
			</View>
		);
	}

}

const StatusScreen = connect(
	(state) => {
		return {};
	}
)(StatusScreenComponent)

export { StatusScreen };