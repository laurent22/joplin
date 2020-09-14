# 2010 October 30
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Test that the FTS3 extension does not crash when it encounters a
# corrupt data structure on disk.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 { finish_test ; return }

set ::testprefix fts3corrupt2
sqlite3_fts3_may_be_corrupt 1

set data [list]
lappend data {*}{
   "amxtvoo adqwroyhz auq aithtir avniqnuynvf axp ahibayfynig agbicpm"
   "ajdtebs anteaxr aieynenwmd awpl alo akxcrwow aoxftge aoqvgul"
   "amcfvdr auz apu aebelm ahuxyz aqc asyafdb agulvhvqu"
   "apepwfyz azkhdvkw aenyelxzbk aslnitbyet aycdsdcpgr aqzzdbc agfi axnypydou"
   "aaqrzzcm apcxdxo atumltzj aevvivo aodknoft aqoyytoz alobx apldt"
   "adjllxlhnmj aiuhvuj adwppceuht atvj azrsam ahkjqdhny audlqxr aotgcd"
   "aira azflsceos awj auzbobfkc awmezplr aeh awec ahndxlmv"
   "aydwnied alk auoap agihyqeix aymqxzajnl aydwnied aojkarx agbo"
   "ahajsmcl anvx amdhjm aoptsj agugzjjm apkevm acnj acjg"
   "amwtkw aogttbykvt aubwrfqnbjf ajow agsj aerkqzjdqst anenlvbalkn arfajzzgckx"
   "adqqqofkmz amjpavjuhw aqgehgnb awvvxlbtqzn agstqko akmkzehyh atagzey agwja"
   "amag ahe autkllywhr avnk atmt akn anvdh aixfrv"
   "aqdyerbws avefykly awl azaduojgzo anxfsmw axpt abgbvk ati"
   "attyqkwz aiweypiczul afy asitaqbczhh aitxisizpv auhviq aibql ajfqc"
   "aylzprtmta aiuemihqrpi awluvgsw ampbuy axlifpzfqr aems aoaxwads apianfn"
   "aodrkijelq acdb aaserrdxm aqyasgofqu aevvivo afi apmwu aeoqysl"
   "amqnk ankaotm ayfy ajcupeeoc advcbukan aucahlwnyk adbfyo azqjpeant"
   "afczpp asqrs ahslvda akhlf aiqgdp atyd aznuglxqbrg awirndrh"
   "aqhiajp amxeazb asxuehg akod axvolvsp agcz asmovmohy acmqa"
   "avvomv aafms ashuaec arevx audtq alrwqhjvao avgsgpg ajbrctpsel"
   "atxoirr ayopboobqdu ajunntua arh aernimxid aipljda aglo aefk"
   "aonxf acmnnkna abgviaswe aulvcbv axp apemgakpzo aibql acioaid"
   "axo alrwqhjvao ayqounftdzl azmoakdyh apajze ajk artvy apxiamy"
   "ayjafsraz addjj agsj asejtziqws acatvhegu aoxdjqblsvv aekdmmbs aaobe"
   "abjjvzubkwt alczv ati awz auyxgcxeb aymjoym anqoukprtyt atwfhpmbooh"
   "ajfqz aethlgir aclcx aowlyvetby aproqm afjlqtkv anebfy akzrcpfrrvw"
   "aoledfotm aiwlfm aeejlaej anz abgbvk aktfn aayoh anpywgdvgz"
   "acvmldguld asdvz aqb aeomsyzyu aggylhprbdz asrfkwz auipybpsn agsnszzfb"
}

sqlite3_db_config db DEFENSIVE 0
do_test fts3corrupt2-1.0 {
  execsql BEGIN
  execsql { CREATE VIRTUAL TABLE t2 USING FTS3(a, b); }
  execsql { INSERT INTO t2(t2) VALUES('nodesize=32') }
  foreach d $data {
    execsql { INSERT INTO t2 VALUES($d, $d) }
  }
  execsql COMMIT
  execsql { SELECT count(*) FROM t2_segments }
} {163}

proc set_byte {blob byte val} {
  binary format a*ca*                         \
      [string range $blob 0 [expr $byte-1]]   \
      $val                                    \
      [string range $blob [expr $byte+1] end] \
}

set tn 0
set c 256
foreach {rowid sz blob} [
  db eval {SELECT rowid, length(block), block FROM t2_segments}
] {
  incr tn
  set c [expr (($c+255)%256)]
  for {set i 0} {$i < $sz} {incr i} {
    set b2 [set_byte $blob $i $c]
    execsql { UPDATE t2_segments SET block = $b2 WHERE rowid = $rowid }
    do_test fts3corrupt2-1.$tn.$i {
      catchsql { SELECT * FROM t2 WHERE t2 MATCH 'a*' }
      set {} {}
    } {}
  }
  execsql { UPDATE t2_segments SET block = $blob WHERE rowid = $rowid }
}

foreach c {50 100 150 200 250} {
  foreach {rowid sz blob} [
    db eval {SELECT rowid, length(root), root FROM t2_segdir}
  ] {
    incr tn
    for {set i 0} {$i < $sz} {incr i} {
      set b2 [set_byte $blob $i $c]
      execsql { UPDATE t2_segdir SET root = $b2 WHERE rowid = $rowid }
      do_test fts3corrupt2-2.$c.$tn.$i {
        catchsql { SELECT * FROM t2 WHERE t2 MATCH 'a*' }
        set {} {}
      } {}
    }
    execsql { UPDATE t2_segdir SET root = $blob WHERE rowid = $rowid }
  }
}





finish_test
