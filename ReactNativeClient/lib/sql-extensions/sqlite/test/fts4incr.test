# 2012 March 26
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
set ::testprefix fts4incr

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Create the fts_kjv_genesis procedure which fills and FTS3/4 table 
# with the complete text of the Book of Genesis.
#
source $testdir/genesis.tcl

do_test 1.0 {
  execsql { CREATE VIRTUAL TABLE t1 USING fts4(words) }
  fts_kjv_genesis
} {}

do_execsql_test 1.1 {
  SELECT min(docid), max(docid) FROM t1;
} {1001001 1050026}

foreach {tn q res} {
  1 { SELECT count(*) FROM t1 WHERE t1 MATCH 'and' AND docid < 1010000} 224
  2 { SELECT count(*) FROM t1 WHERE t1 MATCH '"in the"' AND docid < 1010000} 47
  3 { SELECT count(*) FROM t1 WHERE t1 MATCH '"And God"' AND docid < 1010000} 33
  4 { SELECT count(*) FROM t1 WHERE t1 
      MATCH '"land of canaan"' AND docid < 1030000 } 7
} {
  foreach s {0 1} {
    execsql "INSERT INTO t1(t1) VALUES('test-no-incr-doclist=$s')"
    do_execsql_test 2.$tn.$s $q $res
    set t($s) [lindex [time [list execsql $q] 100] 0]
  }
  if {0} {
    puts "with optimization: $t(0)    without: $t(1)"
  }
}

do_test 2.1 {
  execsql {
    CREATE VIRTUAL TABLE t2 USING fts4(order=DESC);
  }
  set num [list one two three four five six seven eight nine ten]
  execsql BEGIN
  for {set i 0} {$i < 10000} {incr i} {
    set x "[lindex $num [expr $i%10]] zero"
    execsql { INSERT INTO t2(docid, content) VALUES($i, $x) }
  }
  execsql COMMIT
  execsql { INSERT INTO t2(t2) VALUES('optimize') }
} {}

do_execsql_test 2.2 {
  SELECT count(*) FROM t2 WHERE t2 MATCH '"never zero"'
} {0}

do_execsql_test 2.3 {
  SELECT count(*) FROM t2 WHERE t2 MATCH '"two zero"'
} {1000}

finish_test
