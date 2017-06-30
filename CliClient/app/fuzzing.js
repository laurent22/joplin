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

const logger = new Logger();
logger.addTarget('console');
logger.setLevel(Logger.LEVEL_DEBUG);

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

function execCommand(client, command) {
	let exePath = 'node ' + joplinAppPath;
	let cmd = exePath + ' --profile ' + client.profileDir + ' ' + command;
	//logger.info(cmd.substr(exePath.length + 1));
	logger.info(cmd);

	return new Promise((resolve, reject) => {
		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				logger.error(stderr);
				reject(error);
			} else {
				resolve(stdout);
			}
		});
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
				await execCommand(client, 'rm -f ' + item.title);
			} else if (item.type_ == 2) {
				await execCommand(client, 'rm -f ' + '../' + item.title);
			} else {
				throw new Error('Unknown type: ' + item.type_);
			}
		}, 40],
		['sync', 10],
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

function randomNextCheckTime() {
	let output = time.unixMs() + 1000 + Math.random() * 1000 * 10;
	logger.info('Next sync check: ' + time.unixMsToIso(output) + ' (' + (Math.round((output - time.unixMs()) / 1000)) + ' sec.)');
	return output;
}

async function compareClientItems(clientItems) {
	let itemCounts = [];
	for (let i = 0; i < clientItems.length; i++) {
		let items = clientItems[i];
		itemCounts.push(items.length);
	}
	logger.info('Item count: ' + itemCounts.join(', '));

	let r = lodash.uniq(itemCounts);
	if (r.length > 1) {
		logger.error('Item count is different');

		await time.sleep(2); // Let the logger finish writing
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
			// In order for all the clients to send their items and get those from the other
			// clients, they need to perform 2 sync.
			for (let loopCount = 0; loopCount < 2; loopCount++) {
				for (let i = 0; i < clients.length; i++) {
					await execCommand(clients[i], 'sync');
					if (loopCount === 1) {
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

main(process.argv);