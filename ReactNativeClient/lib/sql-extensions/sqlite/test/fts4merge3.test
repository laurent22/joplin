# 2012 March 06
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
# focus of this script is testing the incremental merge function.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
source $testdir/lock_common.tcl
source $testdir/bc_common.tcl

set ::testprefix fts4merge3

ifcapable !fts3 {
  finish_test
  return
}

if {"" == [bc_find_binaries backcompat.test]} {
  finish_test
  return
}

db close
do_all_bc_test {

  sql2 { PRAGMA page_size = 512 }
  if { 0==[catch { sql2 { CREATE VIRTUAL TABLE x USING fts4 } } ] } {

    # Build a large database.
    set msg "this takes around 12 seconds"
    do_test "1.1 ($msg)" { fts3_build_db_2 20000 } {}

    # Run some queries on it, using the old and new versions.
    do_test 1.2 { sql1 "SELECT docid FROM t2 WHERE t2 MATCH 'abc'" } {1485}
    do_test 1.3 { sql2 "SELECT docid FROM t2 WHERE t2 MATCH 'abc'" } {1485}

    do_test 1.4 {
      set x [sql2 "PRAGMA page_count"]
      expr {$x>=1284 && $x<=1286}
    } {1}
    do_test 1.5 { sql2 { 
      SELECT level, count(*) FROM t2_segdir GROUP BY level ORDER BY 1
    } } [list 0 15    1 1     2 14    3 4]

    # Run some incr-merge operations on the db.
    for {set i 0} {$i<10} {incr i} {
      do_test 1.6.$i.1 { sql1 { INSERT INTO t2(t2) VALUES('merge=2,2') } } {}
      do_test 1.6.$i.2 { 
        sql2 "SELECT docid FROM t2 WHERE t2 MATCH 'abc'" 
      } {1485}
    }

    do_test 1.7 { sql2 { 
      SELECT level, count(*) FROM t2_segdir GROUP BY level ORDER BY 1
    } } {2 15 3 5}

    # Using the old connection, insert many rows. 
    do_test 1.8 {
      for {set i 0} {$i < 1500} {incr i} {
        sql2 "INSERT INTO t2 SELECT content FROM t2 WHERE docid = $i"
      }
    } {}

    do_test 1.9 { sql2 { 
      SELECT level, count(*) FROM t2_segdir GROUP BY level ORDER BY 1
    } } [list  0 12  1 13  2 4  3 6]

    # Run a big incr-merge operation on the db.
    do_test 1.10 { sql1 { INSERT INTO t2(t2) VALUES('merge=2000,2') } } {}
    do_test 1.11 { 
      sql2 "SELECT docid FROM t2 WHERE t2 MATCH 'abc'" 
    } {1485 21485}

    do_test 1.12 {
      for {set i 0} {$i < 1500} {incr i} {
        sql2 "INSERT INTO t2 SELECT content FROM t2 WHERE docid = $i"
      }
    } {}
    do_test 1.13 { 
      sql2 "SELECT docid FROM t2 WHERE t2 MATCH 'abc'" 
    } {1485 21485 22985}

    do_test 1.14 { 
      sql2 "INSERT INTO t2(t2) VALUES('optimize')"
      sql2 "SELECT docid FROM t2 WHERE t2 MATCH 'abc'" 
    } {1485 21485 22985}

    do_test 1.15 { sql2 { 
      SELECT level, count(*) FROM t2_segdir GROUP BY level ORDER BY 1
    } } {4 1}
  }
}


finish_test
