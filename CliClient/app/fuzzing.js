require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { time } from 'lib/time-utils.js';
import { Logger } from 'lib/logger.js';
import lodash from 'lodash';

const exec = require('child_process').exec
const fs = require('fs-extra');

const baseDir = '/var/www/joplin/CliClient/tests/fuzzing';
const syncDir = baseDir + '/sync';
const joplinAppPath = __dirname + '/main.js';
let syncDurations = [];

const logger = new Logger();
logger.addTarget('console');
logger.setLevel(Logger.LEVEL_DEBUG);

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
});

function createClient(id) {
	return {
		'id': id,
		'profileDir': baseDir + '/client' + id,
	};
}

async function createClients() {
	let output = [];
	let promises = [];
	for (let clientId = 0; clientId < 2; clientId++) {
		let client = createClient(clientId);
		promises.push(fs.remove(client.profileDir));
		promises.push(execCommand(client, 'config sync.target local').then(() => { return execCommand(client, 'config sync.local.path ' + syncDir); }));
		output.push(client);
	}

	await Promise.all(promises);

	return output;
}

function randomElement(array) {
	if (!array.length) return null;
	return array[Math.floor(Math.random() * array.length)];
}

function randomWord() {
	const words = ['future','breezy','north','untidy','welcome','tenuous','material','tour','erect','bounce','skirt','compare','needle','abstracted','flower','detect','market','boring','lively','ragged','many','safe','credit','periodic','fold','whip','lewd','perform','nonchalant','rigid','amusing','giant','slippery','dog','tranquil','ajar','fanatical','flood','learned','helpless','size','ambiguous','long','six','jealous','history','distance','automatic','soggy','statuesque','prevent','full','price','parallel','mine','garrulous','wandering','puzzled','argument','sack','boil','marked','alive','observe','earsplitting','loving','fallacious','ice','parched','gleaming','horse','frame','gorgeous','quartz','quill','found','stranger','digestion','balance','cut','savory','peace','passenger','driving','sand','offer','rightful','earthquake','ear','spark','seashore','godly','rabbits','time','flowers','womanly','sulky','penitent','detail','warm','functional','silver','bushes','veil','filthy','jar','stitch','heartbreaking','bite-sized','station','play','plastic','common','save','subsequent','miscreant','slimy','train','disgusted','new','crib','boundless','stop','zephyr','roof','boiling','humdrum','record','park','symptomatic','vegetable','interest','ring','dusty','pet','depressed','murder','humor','capricious','kiss','gold','fax','cycle','river','black','four','irritating','mature','well-groomed','guard','hand','spotty','celery','air','scent','jelly','alleged','preach','anger','daffy','wrestle','torpid','excuse','jump','paint','exotic','tasty','auspicious','shirt','exercise','planes','romantic','telephone','teaching','towering','line','grouchy','eggnog','treat','powerful','abortive','paddle','belief','smash','fowl','steam','scale','workable','overwrought','elated','rustic','cuddly','star','extra-small','wacky','marry','optimal','muddle','care','turn','wealthy','phobic','ticket','petite','order','curly','lazy','careful','unequaled','mountain','attract','guide','robin','plant','hook','sail','creature','sparkle','sugar','volcano','grate','plough','undesirable','clever','mark','sea','responsible','destroy','broken','bore','spell','gate','lean','eye','afternoon','grease','note','smiling','puzzling','annoy','disagreeable','valuable','judge','frequent','live','gentle','reward','calm','aloof','old-fashioned','rule','sweet','hat','lumber','cheer','writing','able','roasted','scream','awful','meaty','nutty','trade','protest','letter','half','spiteful','library','food','sign','side','adhesive','itch','fuzzy','force','circle','historical','door','behavior','smile','bitter','scatter','crow','risk','rebel','milky','wise','rule','confuse','motion','roll','grain','structure','ship','admire','discreet','test','ask','meddle','tacit','abundant','skin','wound','beds','saw','few','rhyme','heavenly','jaded','finger','advice','letters','satisfying','general','add','fork','impartial','remind','rate','rotten','beam','puffy','march','horn','practise','brief','coordinated','ahead','woebegone','insidious','continue','rapid','adamant','gray','bless','dinosaurs','dress','woman','stir','songs','unwieldy','jump','cows','dust','terrify','acrid','illegal','desire','share','strange','damaged','entertaining','stare','underwear','legal','oven','refuse','accidental','blot','snakes','talk','lunchroom','man','blushing','waste','aggressive','oval','tax','clam','present','important','chicken','name','town','mend','knowing','long','wrathful','kettle','difficult','account','choke','decorate','bead','fear','majestic','shame','laborer','wine','story','hissing','stingy','plant','potato','houses','leg','number','condemned','hollow','bashful','distinct','ray','evanescent','whimsical','magic','bomb','cute','omniscient','plane','immense','brake','time','marvelous','mask','conscious','explain','answer','physical','berry','guide','machine','toad','business','milk','examine','chickens','uppity','red','kind','medical','shiver','punch','lake','sleepy','axiomatic','matter','nosy','zealous','mint','embarrassed','psychedelic','imagine','collar','tame','wing','soup','efficient','rat','signal','delight','belong','ducks','wicked','nod','close','snotty','measly','front','flag','smoke','magenta','squash','bubble','downtown','thirsty','tremendous','closed','stupid','shaggy','receipt','low','famous','momentous','grateful','concerned','tart','bomb','existence','vacation','grandfather','duck','bubble','reason','glue','assorted','peaceful','questionable','type','industry','chemical','rambunctious','plant','heap','church','suggestion','tickle','income','aberrant','enormous','knock'];
	return randomElement(words);
}

function execCommand(client, command, options = {}) {
	let exePath = 'node ' + joplinAppPath;
	let cmd = exePath + ' --profile ' + client.profileDir + ' ' + command;
	logger.info(cmd);

	if (options.killAfter) {
		logger.info('Kill after: ' + options.killAfter);
	}

	return new Promise((resolve, reject) => {
		let childProcess = exec(cmd, (error, stdout, stderr) => {
			if (error) {
				logger.error(stderr);
				reject(error);
			} else {
				resolve(stdout);
			}
		});

		if (options.killAfter) {
			setTimeout(() => {
				if (!childProcess.connected) return;
				logger.info('Sending kill signal...');
				childProcess.kill();
			}, options.killAfter);
		}
	});
}

async function execRandomCommand(client) {
	let possibleCommands = [
		['mkbook {word}', 30],
		['mknote {word}', 100],
		[async () => {
			let items = await execCommand(client, 'dump');
			items = JSON.parse(items);
			let item = randomElement(items);
			if (!item) return;

			if (item.type_ == 1) {
				return execCommand(client, 'rm -f ' + item.title);
			} else if (item.type_ == 2) {
				return execCommand(client, 'rm -f ' + '../' + item.title);
			} else {
				throw new Error('Unknown type: ' + item.type_);
			}
		}, 80],
		[async () => {
			let avgSyncDuration = averageSyncDuration();
			let options = {};
			if (!isNaN(avgSyncDuration)) {
				if (Math.random() >= 0.5) {
					options.killAfter = avgSyncDuration * Math.random();
				}
			}
			return execCommand(client, 'sync', options);
		}, 10],
	];

	let cmd = null;
	while (true) {
		cmd = randomElement(possibleCommands);
		let r = 1 + Math.floor(Math.random() * 100);
		if (r <= cmd[1]) break;
	}

	cmd = cmd[0];

	if (typeof cmd === 'function') {
		return cmd();
	} else {
		cmd = cmd.replace('{word}', randomWord());
		return execCommand(client, cmd);
	}
}

function averageSyncDuration() {
	return lodash.mean(syncDurations);
}

function randomNextCheckTime() {
	let output = time.unixMs() + 1000 + Math.random() * 1000 * 2;
	logger.info('Next sync check: ' + time.unixMsToIso(output) + ' (' + (Math.round((output - time.unixMs()) / 1000)) + ' sec.)');
	return output;
}

function findItem(items, itemId) {
	for (let i = 0; i  < items.length; i++) {
		if (items[i].id == itemId) return items[i];
	}
	return null;
}

function compareItems(item1, item2) {
	let output = [];
	for (let n in item1) {
		if (!item1.hasOwnProperty(n)) continue;
		if (n == 'sync_time') continue;
		let p1 = item1[n];
		let p2 = item2[n];
		if (p1 !== p2) output.push(n);
	}
	return output;
}

function findMissingItems_(items1, items2) {
	let output = [];

	for (let i = 0; i < items1.length; i++) {
		let item1 = items1[i];
		let found = false;
		for (let j = 0; j < items2.length; j++) {
			let item2 = items2[j];
			if (item1.id == item2.id) {
				found = true;
				break;
			}
		}

		if (!found) {
			output.push(item1);
		}
	}

	return output;
}

function findMissingItems(items1, items2) {
	return [
		findMissingItems_(items1, items2),
		findMissingItems_(items2, items1),
	];
}

async function compareClientItems(clientItems) {
	let itemCounts = [];
	for (let i = 0; i < clientItems.length; i++) {
		let items = clientItems[i];
		itemCounts.push(items.length);
	}
	logger.info('Item count: ' + itemCounts.join(', '));
	
	let missingItems = findMissingItems(clientItems[0], clientItems[1]);
	if (missingItems[0].length || missingItems[1].length) {
		logger.error('Items are different');
		logger.error(missingItems);
		process.exit(1);
	}

	// let r = lodash.uniq(itemCounts);
	// if (r.length > 1) {
	// 	logger.error('Item count is different');
	// 	process.exit(1);
	// }

	let differences = [];
	let items = clientItems[0];
	for (let i = 0; i < items.length; i++) {
		let item1 = items[i];
		for (let clientId = 1; clientId < clientItems.length; clientId++) {
			let item2 = findItem(clientItems[clientId], item1.id);
			if (!item2) {
				logger.error('Item not found on client ' + clientId + ':');
				logger.error(item1);
				process.exit(1);
			}

			let diff = compareItems(item1, item2);
			if (diff.length) {
				differences.push({
					item1: item1,
					item2: item2,
				});
			}
		}
	}

	if (differences.length) {
		logger.error('Found differences between items:');
		logger.error(differences);
		process.exit(1);
	}
}

async function main(argv) {
	await fs.remove(syncDir);
	
	let clients = await createClients();
	let activeCommandCounts = [];
	let clientId = 0;

	for (let i = 0; i < clients.length; i++) {
		clients[i].activeCommandCount = 0;
	}

	function handleCommand(clientId) {
		if (clients[clientId].activeCommandCount >= 1) return;

		clients[clientId].activeCommandCount++;

		execRandomCommand(clients[clientId]).catch((error) => {
			logger.info('Client ' + clientId + ':');
			logger.error(error);
		}).then((r) => {
			if (r) {
				logger.info('Client ' + clientId + ':');
				logger.info(r);
			}
			clients[clientId].activeCommandCount--;
		});
	}

	let nextSyncCheckTime = randomNextCheckTime();
	let state = 'commands';

	setInterval(async () => {
		if (state == 'waitForSyncCheck') return;

		if (state == 'syncCheck') {
			state = 'waitForSyncCheck';
			let clientItems = [];
			// Up to 3 sync operations must be performed by each clients in order for them
			// to be perfectly in sync - in order for each items to send their changes
			// and get those from the other clients, and to also get changes that are
			// made as a result of a sync operation (eg. renaming a folder that conflicts
			// with another one).
			for (let loopCount = 0; loopCount < 3; loopCount++) {
				for (let i = 0; i < clients.length; i++) {
					let beforeTime = time.unixMs();
					await execCommand(clients[i], 'sync');
					syncDurations.push(time.unixMs() - beforeTime);
					if (syncDurations.length > 20) syncDurations.splice(0, 1);
					if (loopCount === 2) {
						let dump = await execCommand(clients[i], 'dump');
						clientItems[i] = JSON.parse(dump);
					}
				}
			}

			await compareClientItems(clientItems);

			nextSyncCheckTime = randomNextCheckTime();
			state = 'commands';
			return;
		}

		if (state == 'waitForClients') {
			for (let i = 0; i < clients.length; i++) {
				if (clients[i].activeCommandCount > 0) return;
			}

			state = 'syncCheck';
			return;
		}

		if (state == 'commands') {
			if (nextSyncCheckTime <= time.unixMs()) {
				state = 'waitForClients';
				return;
			}

			handleCommand(clientId);
			clientId++;
			if (clientId >= clients.length) clientId = 0;
		}
	}, 100);
}

main(process.argv).catch((error) => {
	logger.error(error);
});