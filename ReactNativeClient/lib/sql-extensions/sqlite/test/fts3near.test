
# 2007 October 15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#
# $Id: fts3near.test,v 1.3 2009/01/02 17:33:46 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

db eval {
  CREATE VIRTUAL TABLE t1 USING fts3(content);
  INSERT INTO t1(content) VALUES('one three four five');
  INSERT INTO t1(content) VALUES('two three four five');
  INSERT INTO t1(content) VALUES('one two three four five');
}

do_test fts3near-1.1 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'one NEAR/0 three'}
} {1}
do_test fts3near-1.2 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'one NEAR/1 two'}
} {3}
do_test fts3near-1.3 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'one NEAR/1 three'}
} {1 3}
do_test fts3near-1.4 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'three NEAR/1 one'}
} {1 3}
do_test fts3near-1.5 {
  execsql {SELECT docid FROM t1 WHERE content MATCH '"one two" NEAR/1 five'}
} {}
do_test fts3near-1.6 {
  execsql {SELECT docid FROM t1 WHERE content MATCH '"one two" NEAR/2 five'}
} {3}
do_test fts3near-1.7 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'one NEAR four'}
} {1 3}
do_test fts3near-1.8 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'four NEAR three'}
} {1 2 3}
do_test fts3near-1.9 {
  execsql {SELECT docid FROM t1 WHERE content MATCH '"four five" NEAR/0 three'}
} {1 2 3}
do_test fts3near-1.10 {
  execsql {SELECT docid FROM t1 WHERE content MATCH '"four five" NEAR/2 one'}
} {1 3}
do_test fts3near-1.11 {
  execsql {SELECT docid FROM t1 WHERE content MATCH '"four five" NEAR/1 one'}
} {1}
do_test fts3near-1.12 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'five NEAR/1 "two three"'}
} {2 3} 
do_test fts3near-1.13 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'one NEAR five'}
} {1 3} 

do_test fts3near-1.14 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'four NEAR four'}
} {} 
do_test fts3near-1.15 {
  execsql {SELECT docid FROM t1 WHERE content MATCH 'one NEAR two NEAR one'}
} {3} 

do_test fts3near-1.16 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH '"one three" NEAR/0 "four five"'
  }
} {1} 
do_test fts3near-1.17 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH '"four five" NEAR/0 "one three"'
  }
} {1} 


# Output format of the offsets() function:
#
#     <column number> <term number> <starting offset> <number of bytes>
#
db eval {
  INSERT INTO t1(content) VALUES('A X B C D A B');
}
do_test fts3near-2.1 {
  execsql {
    SELECT offsets(t1) FROM t1 WHERE content MATCH 'A NEAR/0 B'
  }
} {{0 0 10 1 0 1 12 1}}
do_test fts3near-2.2 {
  execsql {
    SELECT offsets(t1) FROM t1 WHERE content MATCH 'B NEAR/0 A'
  }
} {{0 1 10 1 0 0 12 1}}
do_test fts3near-2.3 {
  execsql {
    SELECT offsets(t1) FROM t1 WHERE content MATCH '"C D" NEAR/0 A'
  }
} {{0 0 6 1 0 1 8 1 0 2 10 1}}
do_test fts3near-2.4 {
  execsql {
    SELECT offsets(t1) FROM t1 WHERE content MATCH 'A NEAR/0 "C D"'
  }
} {{0 1 6 1 0 2 8 1 0 0 10 1}}
do_test fts3near-2.5 {
  execsql {
    SELECT offsets(t1) FROM t1 WHERE content MATCH 'A NEAR A'
  }
} {{0 0 0 1 0 1 0 1 0 0 10 1 0 1 10 1}}
do_test fts3near-2.6 {
  execsql {
    INSERT INTO t1 VALUES('A A A');
    SELECT offsets(t1) FROM t1 WHERE content MATCH 'A NEAR/2 A';
  }
} [list [list 0 0 0 1   0 1 0 1   0 0 2 1   0 1 2 1   0 0 4 1   0 1 4 1]]
do_test fts3near-2.7 {
  execsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES('A A A A');
    SELECT offsets(t1) FROM t1 WHERE content MATCH 'A NEAR A NEAR A';
  }
} [list [list \
    0 0 0 1   0 1 0 1   0 2 0 1   0 0 2 1   \
    0 1 2 1   0 2 2 1   0 0 4 1   0 1 4 1   \
    0 2 4 1   0 0 6 1   0 1 6 1   0 2 6 1   \
]]

db eval {
  DELETE FROM t1;
  INSERT INTO t1(content) VALUES(
    'one two three two four six three six nine four eight twelve'
  );
}

do_test fts3near-3.1 {
  execsql {SELECT offsets(t1) FROM t1 WHERE content MATCH 'three NEAR/1 one'}
} {{0 1 0 3 0 0 8 5}}
do_test fts3near-3.2 {
  execsql {SELECT offsets(t1) FROM t1 WHERE content MATCH 'one NEAR/1 three'}
} {{0 0 0 3 0 1 8 5}}
do_test fts3near-3.3 {
  execsql {SELECT offsets(t1) FROM t1 WHERE content MATCH 'three NEAR/1 two'}
} {{0 1 4 3 0 0 8 5 0 1 14 3}}
do_test fts3near-3.4 {
  execsql {SELECT offsets(t1) FROM t1 WHERE content MATCH 'three NEAR/2 two'}
} {{0 1 4 3 0 0 8 5 0 1 14 3 0 0 27 5}}
do_test fts3near-3.5 {
  execsql {SELECT offsets(t1) FROM t1 WHERE content MATCH 'two NEAR/2 three'}
} {{0 0 4 3 0 1 8 5 0 0 14 3 0 1 27 5}}
do_test fts3near-3.6 {
  execsql {
    SELECT offsets(t1) FROM t1 WHERE content MATCH 'three NEAR/0 "two four"'
  }
} {{0 0 8 5 0 1 14 3 0 2 18 4}}
do_test fts3near-3.7 {
  execsql {
    SELECT offsets(t1) FROM t1 WHERE content MATCH '"two four" NEAR/0 three'}
} {{0 2 8 5 0 0 14 3 0 1 18 4}}

db eval {
  INSERT INTO t1(content) VALUES('
    This specification defines Cascading Style Sheets, level 2 (CSS2). CSS2 is a style sheet language that allows authors and users to attach style (e.g., fonts, spacing, and aural cues) to structured documents (e.g., HTML documents and XML applications). By separating the presentation style of documents from the content of documents, CSS2 simplifies Web authoring and site maintenance.

    CSS2 builds on CSS1 (see [CSS1]) and, with very few exceptions, all valid CSS1 style sheets are valid CSS2 style sheets. CSS2 supports media-specific style sheets so that authors may tailor the presentation of their documents to visual browsers, aural devices, printers, braille devices, handheld devices, etc. This specification also supports content positioning, downloadable fonts, table layout, features for internationalization, automatic counters and numbering, and some properties related to user interface.
  ') 
}
do_test fts3near-4.1 {
  execsql {
    SELECT snippet(t1) FROM t1 WHERE content MATCH 'specification NEAR supports'
  }
} {{<b>...</b>braille devices, handheld devices, etc. This <b>specification</b> also <b>supports</b> content positioning, downloadable fonts, table layout<b>...</b>}}

do_test fts3near-5.1 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'specification attach'
  }
} {2}
do_test fts3near-5.2 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'specification NEAR attach'
  }
} {}
do_test fts3near-5.3 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'specification NEAR/18 attach'
  }
} {}
do_test fts3near-5.4 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'specification NEAR/19 attach'
  }
} {2}
do_test fts3near-5.5 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'specification NEAR/000018 attach'
  }
} {}
do_test fts3near-5.6 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'specification NEAR/000019 attach'
  }
} {2}

db eval {
  INSERT INTO t1 VALUES('
      abbrev aberrations abjurations aboding abr abscesses absolutistic
      abstention abuses acanthuses acceptance acclaimers accomplish
      accoutring accusation acetonic acid acolytes acquitting acrylonitrile
      actives acyclic addicted adenoid adjacently adjusting admissible
      adoption adulated advantaging advertisers aedes aerogramme aetiology
      affiliative afforest afterclap agamogenesis aggrade agings agonize
      agron ailurophile airfreight airspeed alarmists alchemizing
      alexandrines alien aliped all allergenic allocator allowances almost
      alphabetizes altho alvine amaurosis ambles ameliorate amicability amnio
      amour ampicillin amusement anadromous analogues anarchy anchormen
      anecdota aneurin angst animating anlage announcements anodized
      answerable antemeridian anthracene antiabortionist anticlimaxes
      antifriction antimitotic antiphon antiques antithetic anviled
      apatosaurus aphrodisia apodal aposiopesis apparatus appendectomies
      applications appraisingly appropriate apteryx arabinose
      arboricultural archdeaconates archipelago ardently arguers armadillo
      arnicas arrayed arrowy arthroscope artisans ascensive ashier
      aspersorium assail assentor assignees assonants astereognosis
      astringency astutest atheistical atomize attachment attenuates
      attrahent audibility augite auricle auteurists autobus autolysis
      autosome avenge avidest aw awl ayes babirusa backbeats backgrounder
      backseat backswings baddie bagnios baked balefuller ballista balmily
      bandbox bandylegged bankruptcy baptism barbering bargain barneys
      barracuda barterer bashes bassists bathers batterer bavardage
      beachfront beanstalk beauteous become bedim bedtimes beermats begat
      begun belabors bellarmine belongings bending benthos bereavements
      besieger bestialized betide bevels biases bicarbonates bidentate bigger
      bile billow bine biodynamics biomedicine biotites birding bisection
      bitingly bkg blackheads blaeberry blanking blatherer bleeper blindage
      blithefulness blockish bloodstreams bloused blubbing bluestocking
      blurted boatbill bobtailed boffo bold boltrope bondservant bonks
      bookbinding bookworm booting borating boscages botchers bougainvillea
      bounty bowlegged boyhood bracketed brainstorm brandishes
      braunschweigers brazilin breakneck breathlessness brewage bridesmaids
      brighter brisker broader brokerages bronziest browband brunets bryology
      bucking budlike bugleweed bulkily bulling bummer bunglers bureau burgs
      burrito bushfire buss butlery buttressing bylines cabdriver cached
      cadaverousnesses cafeterias cakewalk calcifies calendula callboy calms
      calyptra camisoles camps candelabrum caned cannolis canoodling cantors
      cape caponize capsuling caracoled carbolics carcase carditis caretakers
      carnallite carousel carrageenan cartels carves cashbook castanets
      casuistry catalyzer catchers categorizations cathexis caucuses
      causeway cavetto cede cella cementite centenary centrals ceramics ceria
      cervixes chafferer chalcopyrites chamfers change chaotically
      characteristically charivari chases chatterer cheats cheeks chef
      chemurgy chetah chickaree chigoes chillies chinning chirp chive
      chloroforms chokebore choplogic chorioids chromatic chronically
      chubbiest chunder chutzpah cimetidine cinque circulated circumscribe
      cirrose citrin claddagh clamorousness clapperboards classicalism
      clauses cleanse clemency clicker clinchers cliquiest clods closeting
      cloudscape clucking cnidarian coalfish coatrack coca cockfights coddled
      coeducation coexistence cognitively coiffed colatitude collage
      collections collinear colonelcy colorimetric columelliform combos
      comforters commence commercialist commit commorancy communized compar
      compendiously complainers compliance composition comprised comradery
      concelebrants concerted conciliation concourses condensate
      condonations confab confessionals confirmed conforming congeal
      congregant conjectured conjurers connoisseurs conscripting
      conservator consolable conspired constricting consuls contagious
      contemporaneity contesters continuities contractors contrarian
      contrive convalescents convents convexly convulsed cooncan coparcenary
      coprolite copyreader cordially corklike cornflour coroner corralling
      corrigible corsages cosies cosmonauts costumer cottontails counselings
      counterclaim counterpane countertenors courageously couth coveting
      coworker cozier cracklings crampon crappies craved cream credenzas
      crematoriums cresol cricoid crinkle criterion crocodile crore crossover
      crowded cruelest crunch cruzeiros cryptomeria cubism cuesta culprit
      cumquat cupped curdle curly cursoring curvy customized cutting cyclamens
      cylindrical cytaster dachshund daikon damages damselfly dangling
      darkest databanks dauphine dazzling deadpanned deathday debauchers
      debunking decameter decedents decibel decisions declinations
      decomposition decoratively decretive deduct deescalated defecating
      deferentially definiendum defluxion defrocks degrade deice dekaliters
      deli delinquencies deludedly demarcates demineralizers demodulating
      demonstrabilities demurred deniabilities denouncement denudation
      departure deplorable deposing depredatory deputizes derivational
      desalinization descriptors desexes desisted despising destitute
      detectability determiner detoxifying devalued devilries devotions
      dextrous diagenesis dialling diaphoresis diazonium dickeys diddums
      differencing dig dignified dildo dimetric dineric dinosaurs diplodocus
      directer dirty disagrees disassembler disburses disclosures
      disconcerts discountability discrete disembarrass disenthrone
      disgruntled dishpans disintegrators dislodged disobedient
      dispassionate dispiritednesses dispraised disqualifying
      dissatisfying dissidence dissolvers distich distracting distrusts
      ditto diverse divineness dizzily dockyard dodgers doggish doited dom
      dominium doohickey doozie dorsum doubleheaders dourer downbeats
      downshifted doyennes draftsman dramatic drawling dredge drifter
      drivelines droopier drowsed drunkards dubiosities duding dulcifying
      dumpcart duodecillion durable duteous dyed dysgenic eagles earplugs
      earwitness ebonite echoers economical ectothermous edibility educates
      effected effigies eggbeaters egresses ejaculates elasticize elector
      electrodynamometer electrophorus elem eligibly eloped emaciating
      embarcaderos embezzlers embosses embryectomy emfs emotionalizing
      empiricist emu enamels enchained encoded encrusts endeavored endogamous
      endothelioma energizes engager engrosses enl enologist enrolls ensphere
      enters entirety entrap entryways envies eosinophil epicentral
      epigrammatized episodic epochs equestrian equitably erect ernes
      errorless escalated eschatology espaliers essonite estop eternity
      ethnologically eudemonics euphonious euthenist evangelizations
      eventuality evilest evulsion examinee exceptionably exciter
      excremental execrably exemplars exhalant exhorter exocrine exothermic
      expected expends explainable exploratory expostulatory expunges
      extends externals extorts extrapolative extrorse eyebolt eyra
      facetiously factor faeries fairings fallacies falsities fancifulness
      fantasticalness farmhouse fascinate fatalistically fattener fave
      fearlessly featly federates feints fellowman fencers ferny
      fertilenesses feta feudality fibers fictionalize fiefs fightback
      filefish filmier finaglers fingerboards finochio firefly firmament
      fishmeal fitted fjords flagitiousnesses flamen flaps flatfooting
      flauntier fleapit fleshes flickertail flints floaty floorboards
      floristic flow fluffily fluorescein flutes flyspecks foetal folderols
      followable foolhardier footlockers foppish forceless foredo foreknows
      foreseeing foretaste forgather forlorn formidableness fortalice
      forwarding founding foxhunting fragmentarily frangipani fray freeform
      freezable freshening fridges frilliest frizzed frontbench frottages
      fruitcake fryable fugleman fulminated functionalists fungoid furfuran
      furtive fussy fwd gadolinium galabias gallinaceous galvanism gamers
      gangland gaoling garganey garrisoning gasp gate gauger gayety geed
      geminately generalissimos genii gentled geochronology geomorphic
      geriatricians gesellschaft ghat gibbeting giggles gimps girdlers
      glabella glaive glassfuls gleefully glistered globetrotted glorifier
      gloving glutathione glyptodont goaled gobsmacked goggliest golliwog
      goobers gooseberries gormandizer gouramis grabbier gradually grampuses
      grandmothers granulated graptolite gratuitously gravitates greaten
      greenmailer greys grills grippers groan gropingly grounding groveling
      grueled grunter guardroom guggle guineas gummed gunnysacks gushingly
      gutturals gynecoid gyrostabilizer habitudes haemophilia hailer hairs
      halest hallow halters hamsters handhelds handsaw hangup haranguer
      hardheartedness harlotry harps hashing hated hauntingly hayrack
      headcases headphone headword heartbreakers heaters hebephrenia
      hedonist heightening heliozoan helots hemelytron hemorrhagic hent
      herbicides hereunto heroines heteroclitics heterotrophs hexers
      hidebound hies hightails hindmost hippopotomonstrosesquipedalian
      histologist hittable hobbledehoys hogans holdings holocrine homegirls
      homesteader homogeneousness homopolar honeys hoodwinks hoovered
      horizontally horridness horseshoers hospitalization hotdogging houri
      housemate howitzers huffier humanist humid humors huntress husbandmen
      hyaenas hydride hydrokinetics hydroponically hygrothermograph
      hyperbolically hypersensitiveness hypnogogic hypodermically
      hypothermia iatrochemistry ichthyological idealist ideograms idling
      igniting illegal illuminatingly ilmenite imbibing immateriality
      immigrating immortalizes immures imparts impeder imperfection
      impersonated implant implying imposition imprecating imprimis
      improvising impv inanenesses inaugurate incapably incentivize
      incineration incloses incomparableness inconsequential incorporate
      incrementing incumbered indecorous indentation indicative indignities
      indistinguishably indoors indulges ineducation inerrable
      inexperienced infants infestations infirmnesses inflicting
      infracostal ingathered ingressions inheritances iniquity
      injuriousnesses innervated inoculates inquisitionist insectile
      insiders insolate inspirers instatement instr insulates intactness
      intellects intensifies intercalations intercontinental interferon
      interlarded intermarrying internalizing interpersonally
      interrelatednesses intersperse interviewees intolerance
      intransigents introducing intubates invades inventing inveterate
      invocate iodides irenicism ironsmith irreducibly irresistibility
      irriguous isobarisms isometrically issuable itineracies jackdaws
      jaggery jangling javelins jeeringly jeremiad jeweler jigsawing jitter
      jocosity jokester jot jowls judicative juicy jungly jurists juxtaposed
      kalpa karstify keddah kendo kermesses keynote kibbutznik kidnaper
      kilogram kindred kingpins kissers klatch kneads knobbed knowingest
      kookaburras kruller labefaction labyrinths lacquer laddered lagoons
      lambency laminates lancinate landscapist lankiness lapse larked lasso
      laterite laudableness laundrywomen lawgiver laypersons leafhoppers
      leapfrogs leaven leeches legated legislature leitmotifs lenients
      leprous letterheads levelling lexicographically liberalists
      librettist licorice lifesaving lightheadedly likelier limekiln limped
      lines linkers lipoma liquidator listeners litharge litmus
      liverishnesses loamier lobeline locative locutionary loggier loiterer
      longevity loomed loping lotion louts lowboys luaus lucrativeness lulus
      lumpier lungi lush luthern lymphangial lythraceous machinists maculate
      maggot magnetochemistry maharani maimers majored malaprops malignants
      maloti mammary manchineel manfully manicotti manipulativenesses
      mansards manufactories maraschino margin markdown marooning marshland
      mascaraing massaging masticate matchmark matings mattes mausoleum
      mayflies mealworm meataxe medevaced medievalist meetings megavitamin
      melded melodramatic memorableness mendaciousnesses mensurable
      mercenaries mere meronymous mesmerizes mestee metallurgical
      metastasize meterages meticulosity mewed microbe microcrystalline
      micromanager microsporophyll midiron miffed milder militiamen
      millesimal milometer mincing mingily minims minstrelsy mires
      misanthropic miscalculate miscomprehended misdefines misery mishears
      misled mispickel misrepresent misspending mistranslate miswriting
      mixologists mobilizers moderators modulate mojo mollies momentum monde
      monied monocles monographs monophyletic monotonousness moocher
      moorages morality morion mortally moseyed motherly motorboat mouldering
      mousers moveables mucky mudslides mulatto multicellularity
      multipartite multivalences mundanities murkiest mushed muskiness
      mutability mutisms mycelia myosotis mythicist nacred namable napkin
      narghile nastiness nattering nauseations nearliest necessitate
      necrophobia neg negotiators neologizes nephrotomy netiquette
      neurophysiology newbie newspaper niccolite nielsbohriums nightlong
      nincompoops nitpicked nix noddling nomadize nonadhesive noncandidates
      nonconducting nondigestible nones nongreasy nonjoinder nonoccurrence
      nonporousness nonrestrictive nonstaining nonuniform nooses northwards
      nostalgic notepaper nourishment noyades nuclides numberless numskulls
      nutmegged nymphaea oatmeal obis objurgators oblivious obsequiousness
      obsoletism obtruding occlusions ocher octettes odeums offcuts
      officiation ogival oilstone olestras omikron oncogenesis onsetting
      oomphs openly ophthalmoscope opposites optimum orangutans
      orchestrations ordn organophosphates origin ornithosis orthognathous
      oscillatory ossuaries ostracized ounce outbreaks outearning outgrows
      outlived outpoints outrunning outspends outwearing overabound
      overbalance overcautious overcrowds overdubbing overexpanding
      overgraze overindustrialize overlearning overoptimism overproducing
      overripe overshadowing overspreading overstuff overtones overwind ow
      oxidizing pacer packs paganish painstakingly palate palette pally
      palsying pandemic panhandled pantheism papaws papped parading
      parallelize paranoia parasitically pardners parietal parodied pars
      participator partridgeberry passerines password pastors
      paterfamiliases patination patrolman paunch pawnshops peacekeeper
      peatbog peculator pedestrianism peduncles pegboard pellucidnesses
      pendency penitentiary penstock pentylenetetrazol peptidase perched
      perennial performing perigynous peripheralize perjurer permissively
      perpetuals persistency perspicuously perturbingly pesky petcock
      petrologists pfennige pharmacies phenformin philanderers
      philosophically phonecards phosgenes photocomposer photogenic photons
      phototype phylloid physiotherapeutics picadores pickup pieces pigging
      pilaster pillion pimples pinioned pinpricks pipers pirogi pit
      pitifullest pizza placental plainly planing plasmin platforming
      playacts playwrights plectra pleurisy plopped plug plumule plussed
      poaches poetasters pointless polarize policyholder polkaed
      polyadelphous polygraphing polyphonous pomace ponderers pooch poplar
      porcelains portableness portly positioning postage posthumously
      postponed potages potholed poulard powdering practised pranksters
      preadapt preassigning precentors precipitous preconditions predefined
      predictors preengage prefers prehumans premedical prenotification
      preplanning prepuberty presbytery presentation presidia prestissimo
      preterites prevailer prewarmed priding primitively principalships
      prisage privileged probed prochurch proctoscope products proficients
      prognathism prohibiting proletarianisms prominence promulgates
      proofreading property proportions prorate proselytize prosthesis
      proteins prototypic provenances provitamin prudish pseudonymities
      psychoanalysts psychoneuroses psychrometer publishable pufferies
      pullet pulses punchy punkins purchased purities pursers pushover
      putridity pylons pyrogenous pzazz quadricepses quaff qualmish quarriers
      quasilinear queerness questionnaires quieten quintals quislings quoits
      rabidness racketeers radiative radioisotope radiotherapists ragingly
      rainband rakishness rampagers rands raped rare raspy ratiocinator
      rattlebrain ravening razz reactivation readoption realm reapportioning
      reasoning reattempts rebidding rebuts recapitulatory receptiveness
      recipes reckonings recognizee recommendatory reconciled reconnoiters
      recontaminated recoupments recruits recumbently redact redefine
      redheaded redistributable redraw redwing reeled reenlistment reexports
      refiles reflate reflowing refortified refried refuses regelate
      registrant regretting rehabilitative reigning reinduced reinstalled
      reinvesting rejoining relations relegates religiosities reluctivity
      remastered reminisce remodifying remounted rends renovate reordered
      repartee repel rephrase replicate repossessing reprint reprogramed
      repugnantly requiter rescheduling resegregate resettled residually
      resold resourcefulness respondent restating restrainedly resubmission
      resurveyed retaliating retiarius retorsion retreated retrofitting
      returning revanchism reverberated reverted revitalization
      revolutionize rewind rhapsodizing rhizogenic rhythms ricketinesses
      ridicule righteous rilles rinks rippliest ritualize riyals roast rockery
      roguish romanizations rookiest roquelaure rotation rotundity rounder
      routinizing rubberize rubricated ruefully ruining rummaged runic
      russets ruttish sackers sacrosanctly safeguarding said salaciousness
      salinity salsas salutatorians sampan sandbag saned santonin
      saprophagous sarnies satem saturant savaged sawbucks scablike scalp
      scant scared scatter schedulers schizophrenics schnauzers schoolmarms
      scintillae scleroses scoped scotched scram scratchiness screwball
      scripting scrubwomen scrutinizing scumbled scuttled seals seasickness
      seccos secretions secularizing seditiousnesses seeking segregators
      seize selfish semeiology seminarian semitropical sensate sensors
      sentimo septicemic sequentially serener serine serums
      sesquicentennials seventeen sexiest sforzandos shadowing shallot
      shampooing sharking shearer sheered shelters shifter shiner shipper
      shitted shoaled shofroth shorebirds shortsightedly showboated shrank
      shrines shucking shuttlecocks sickeningly sideling sidewise sigil
      signifiers siliceous silty simony simulative singled sinkings sirrah
      situps skateboarder sketchpad skim skirmished skulkers skywalk slander
      slating sleaziest sleepyheads slicking slink slitting slot slub
      slumlords smallest smattered smilier smokers smriti snailfish snatch
      snides snitching snooze snowblowers snub soapboxing socialite sockeyes
      softest sold solicitings solleret sombreros somnolencies sons sopor
      sorites soubrette soupspoon southpaw spaces spandex sparkers spatially
      speccing specking spectroscopists speedsters spermatics sphincter
      spiffied spindlings spirals spitball splayfeet splitter spokeswomen
      spooled sportily spousals sprightliness sprogs spurner squalene
      squattered squelches squirms stablish staggerings stalactitic stamp
      stands starflower starwort stations stayed steamroll steeplebush
      stemmatics stepfathers stereos steroid sticks stillage stinker
      stirringly stockpiling stomaching stopcock stormers strabismuses
      strainer strappado strawberries streetwise striae strikeouts strives
      stroppiest stubbed study stunting style suavity subchloride subdeb
      subfields subjoin sublittoral subnotebooks subprograms subside
      substantial subtenants subtreasuries succeeding sucked sufferers
      sugarier sulfaguanidine sulphating summerhouse sunbonnets sunned
      superagency supercontinent superheroes supernatural superscribing
      superthin supplest suppositive surcease surfs surprise survey
      suspiration svelte swamplands swashes sweatshop swellhead swindling
      switching sworn syllabuses sympathetics synchrocyclotron syndic
      synonymously syringed tablatures tabulation tackling taiga takas talker
      tamarisks tangential tans taproom tarpapers taskmaster tattiest
      tautologically taxied teacup tearjerkers technocracies teepee
      telegenic telephony telexed temperaments temptress tenderizing tensed
      tenuring tergal terned terror testatrices tetherball textile thatched
      their theorem thereof thermometers thewy thimerosal thirsty
      thoroughwort threateningly thrived through thumbnails thwacks
      ticketing tie til timekeepers timorousness tinkers tippers tisane
      titrating toastmaster toff toking tomb tongs toolmakings topes topple
      torose tortilla totalizing touchlines tousling townsmen trachea
      tradeable tragedienne traitorous trances transcendentalists
      transferrable tranship translating transmogrifying transportable
      transvestism traumatize treachery treed trenail tressing tribeswoman
      trichromatism triennials trikes trims triplicate tristich trivializes
      trombonist trots trouts trued trunnion tryster tubes tulle tundras turban
      turgescence turnround tutelar tweedinesses twill twit tympanum typists
      tzarists ulcered ultramodern umbles unaccountability unamended
      unassertivenesses unbanned unblocked unbundled uncertified unclaimed
      uncoated unconcerns unconvinced uncrossing undefined underbodice
      underemphasize undergrowth underpayment undershirts understudy
      underwritten undissolved unearthed unentered unexpended unfeeling
      unforeseen unfussy unhair unhinges unifilar unimproved uninvitingly
      universalization unknowns unlimbering unman unmet unnaturalness
      unornament unperturbed unprecedentedly unproportionate unread
      unreflecting unreproducible unripe unsatisfying unseaworthiness
      unsharable unsociable unstacking unsubtly untactfully untied untruest
      unveils unwilled unyokes upheave upraised upstart upwind urethrae
      urtexts usurers uvula vacillators vailed validation valvule vanities
      varia variously vassaled vav veggies velours venerator ventrals
      verbalizes verification vernacularized verticality vestigially via
      vicariously victoriousness viewpoint villainies vines violoncellist
      virtual viscus vital vitrify viviparous vocalizers voidable volleys
      volutes vouches vulcanology wackos waggery wainwrights waling wallowing
      wanking wardroom warmup wartiest washwoman watchman watermarks waverer
      wayzgoose weariest weatherstripped weediness weevil welcomed
      wentletrap whackers wheatworm whelp whf whinged whirl whistles whithers
      wholesomeness whosoever widows wikiup willowier windburned windsail
      wingspread winterkilled wisecracking witchgrass witling wobbliest
      womanliness woodcut woodworking woozy working worldwide worthiest
      wrappings wretched writhe wynd xylophone yardarm yea yelped yippee yoni
      yuks zealotry zigzagger zitherists zoologists zygosis');
}

do_test fts3near-6.1 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'abbrev zygosis'
  }
} {3}
do_test fts3near-6.2 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'abbrev NEAR zygosis'
  }
} {}
do_test fts3near-6.3 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'abbrev NEAR/100 zygosis'
  }
} {}
do_test fts3near-6.4 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'abbrev NEAR/1000 zygosis'
  }
} {}
do_test fts3near-6.5 {
  execsql {
    SELECT docid FROM t1 WHERE content MATCH 'abbrev NEAR/10000 zygosis'
  }
} {3}

# Ticket 38b1ae018f.
#
do_execsql_test fts3near-7.1 {
  CREATE VIRTUAL TABLE x USING fts4(y,z);
  INSERT INTO x VALUES('aaa bbb ccc ddd', 'bbb ddd aaa ccc');
  SELECT * FROM x where y MATCH 'bbb NEAR/6 aaa';
} {{aaa bbb ccc ddd} {bbb ddd aaa ccc}}

do_execsql_test fts3near-7.2 {
  CREATE VIRTUAL TABLE t2 USING fts4(a, b);
  INSERT INTO t2 VALUES('A B C', 'A D E');
  SELECT * FROM t2 where t2 MATCH 'a:A NEAR E'
} {}


finish_test
