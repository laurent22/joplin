<?php

$clientId = isset($argv[1]) ? $argv[1] : null;

if (!$clientId) throw new Exception('Client ID not set');

function createClient($id) {
	return array(
		'id' => $id,
		'profileDir' => dirname(__FILE__) . '/client' . $id,
	);
}

$client = createClient($clientId);

function deltree($dir) { 
	$files = array_diff(scandir($dir), array('.','..'));
	foreach ($files as $file) { 
		is_dir("$dir/$file") ? deltree("$dir/$file") : unlink("$dir/$file");
	} 
	return rmdir($dir); 
} 

function randomElement($array) {
	return $array[mt_rand(0, count($array) - 1)];
}

function randomWord() {
	$words = array('future','breezy','north','untidy','welcome','tenuous','material','tour','erect','bounce','skirt','compare','needle','abstracted','flower','detect','market','boring','lively','ragged','many','safe','credit','periodic','fold','whip','lewd','perform','nonchalant','rigid','amusing','giant','slippery','dog','tranquil','ajar','fanatical','flood','learned','helpless','size','ambiguous','long','six','jealous','history','distance','automatic','soggy','statuesque','prevent','full','price','parallel','mine','garrulous','wandering','puzzled','argument','sack','boil','marked','alive','observe','earsplitting','loving','fallacious','ice','parched','gleaming','horse','frame','gorgeous','quartz','quill','found','stranger','digestion','balance','cut','savory','peace','passenger','driving','sand','offer','rightful','earthquake','ear','spark','seashore','godly','rabbits','time','flowers','womanly','sulky','penitent','detail','warm','functional','silver','bushes','veil','filthy','jar','stitch','heartbreaking','bite-sized','station','play','plastic','common','save','subsequent','miscreant','slimy','train','disgusted','new','crib','boundless','stop','zephyr','roof','boiling','humdrum','record','park','symptomatic','vegetable','interest','ring','dusty','pet','depressed','murder','humor','capricious','kiss','gold','fax','cycle','river','black','four','irritating','mature','well-groomed','guard','hand','spotty','celery','air','scent','jelly','alleged','preach','anger','daffy','wrestle','torpid','excuse','jump','paint','exotic','tasty','auspicious','shirt','exercise','planes','romantic','telephone','teaching','towering','line','grouchy','eggnog','treat','powerful','abortive','paddle','belief','smash','fowl','steam','scale','workable','overwrought','elated','rustic','cuddly','star','extra-small','wacky','marry','optimal','muddle','care','turn','wealthy','phobic','ticket','petite','order','curly','lazy','careful','unequaled','mountain','attract','guide','robin','plant','hook','sail','creature','sparkle','sugar','volcano','grate','plough','undesirable','clever','mark','sea','responsible','destroy','broken','bore','spell','gate','lean','eye','afternoon','grease','note','smiling','puzzling','annoy','disagreeable','valuable','judge','frequent','live','gentle','reward','calm','aloof','old-fashioned','rule','sweet','hat','lumber','cheer','writing','able','roasted','scream','awful','meaty','nutty','trade','protest','letter','half','spiteful','library','food','sign','side','adhesive','itch','fuzzy','force','circle','historical','door','behavior','smile','bitter','scatter','crow','risk','rebel','milky','wise','rule','confuse','motion','roll','grain','structure','ship','admire','discreet','test','ask','meddle','tacit','abundant','skin','wound','beds','saw','few','rhyme','heavenly','jaded','finger','advice','letters','satisfying','general','add','fork','impartial','remind','rate','rotten','beam','puffy','march','horn','practise','brief','coordinated','ahead','woebegone','insidious','continue','rapid','adamant','gray','bless','dinosaurs','dress','woman','stir','songs','unwieldy','jump','cows','dust','terrify','acrid','illegal','desire','share','strange','damaged','entertaining','stare','underwear','legal','oven','refuse','accidental','blot','snakes','talk','lunchroom','man','blushing','waste','aggressive','oval','tax','clam','present','important','chicken','name','town','mend','knowing','long','wrathful','kettle','difficult','account','choke','decorate','bead','fear','majestic','shame','laborer','wine','story','hissing','stingy','plant','potato','houses','leg','number','condemned','hollow','bashful','distinct','ray','evanescent','whimsical','magic','bomb','cute','omniscient','plane','immense','brake','time','marvelous','mask','conscious','explain','answer','physical','berry','guide','machine','toad','business','milk','examine','chickens','uppity','red','kind','medical','shiver','punch','lake','sleepy','axiomatic','matter','nosy','zealous','mint','embarrassed','psychedelic','imagine','collar','tame','wing','soup','efficient','rat','signal','delight','belong','ducks','wicked','nod','close','snotty','measly','front','flag','smoke','magenta','squash','bubble','downtown','thirsty','tremendous','closed','stupid','shaggy','receipt','low','famous','momentous','grateful','concerned','tart','bomb','existence','vacation','grandfather','duck','bubble','reason','glue','assorted','peaceful','questionable','type','industry','chemical','rambunctious','plant','heap','church','suggestion','tickle','income','aberrant','enormous','knock');
	return randomElement($words);
}

function execCommand($cmd) {
	global $client;
	$cmd = 'joplin --profile ' . $client['profileDir'] . ' ' . $cmd;
	echo $cmd . "\n";
	exec($cmd, $output);
	return implode("\n", $output);
}

function execRandomCommand() {
	$possibleCommands = array(
		array('mkbook {word}', 10),
		array('mknote {word}', 100),
		array('sync', 10),
	);

	$cmd = null;
	while (true) {
		$cmd = randomElement($possibleCommands);
		$r = mt_rand(1,100);
		if ($r <= $cmd[1]) break;
	}

	$cmd = $cmd[0];
	$cmd = str_replace('{word}', randomWord(), $cmd);

	return execCommand($cmd);
}

deltree($client['profileDir']);

execCommand('config sync.target local');
execCommand('config sync.local.path ' . dirname(__FILE__) . '/sync');

while (true) {
	$r = execRandomCommand();
	if ($r) {
		echo $r . "\n";
	}
}