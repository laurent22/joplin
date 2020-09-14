# 2014 May 12
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS4 module.
#
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts4growth2

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

source $testdir/genesis.tcl

do_execsql_test 1.0 { CREATE TABLE t1(docid, words); }
fts_kjv_genesis 

proc structure {} {
  puts [ db eval {SELECT level, count(*) FROM x1_segdir GROUP BY level} ]
}

proc tt {val} {
  execsql {
    DELETE FROM x1 
      WHERE docid IN (SELECT docid FROM t1 WHERE (rowid-1)%4==$val+0);
  }
  execsql {
    INSERT INTO x1(docid, content) 
      SELECT docid, words FROM t1 WHERE (rowid%4)==$val+0;
  }
}

do_execsql_test 1.1 {
  CREATE VIRTUAL TABLE x1 USING fts4;
  INSERT INTO x1(x1) VALUES('automerge=2');
}

do_test 1.2 {
  for {set i 0} {$i < 40} {incr i} {
    tt 0 ; tt 1 ; tt 2 ; tt 3
  }
  execsql { 
    SELECT max(level) FROM x1_segdir; 
    SELECT count(*) FROM x1_segdir WHERE level=2;
  }
} {2 1}

do_test 1.3 {
  for {set i 0} {$i < 40} {incr i} {
    tt 0 ; tt 1 ; tt 2 ; tt 3
  }
  execsql { 
    SELECT max(level) FROM x1_segdir; 
    SELECT count(*) FROM x1_segdir WHERE level=2;
  }
} {2 1}

#-------------------------------------------------------------------------
#
do_execsql_test 2.1 {
  DELETE FROM t1 WHERE rowid>16;
  DROP TABLE IF EXISTS x1;
  CREATE VIRTUAL TABLE x1 USING fts4;
}

db func second second
proc second {L} {lindex $L 1}

for {set tn 0} {$tn < 40} {incr tn} {
  do_test 2.2.$tn {
    for {set i 0} {$i < 100} {incr i} {
      tt 0 ; tt 1 ; tt 2 ; tt 3
    }
    execsql { SELECT max(level) FROM x1_segdir }
  } {1}
}


finish_test
