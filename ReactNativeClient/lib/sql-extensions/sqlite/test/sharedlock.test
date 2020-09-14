# 2009 July 2
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# $Id: sharedlock.test,v 1.1 2009/07/02 17:21:58 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix sharedlock
db close

ifcapable !shared_cache {
  finish_test
  return
}

set ::enable_shared_cache [sqlite3_enable_shared_cache 1]
sqlite3 db  test.db
sqlite3 db2 test.db

do_test sharedlock-1.1 {
  execsql {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 'one');
    INSERT INTO t1 VALUES(2, 'two');
  }
} {}

do_test sharedlock-1.2 {
  set res [list]
  db eval { SELECT * FROM t1 ORDER BY rowid } {
    lappend res $a $b
    if {$a == 1} { catch { db  eval "INSERT INTO t1 VALUES(3, 'three')" } }

    # This should fail. Connection [db] has a read-lock on t1, which should
    # prevent connection [db2] from obtaining the write-lock it needs to
    # modify t1. At one point there was a bug causing the previous INSERT
    # to drop the read-lock belonging to [db].
    if {$a == 2} { catch { db2 eval "INSERT INTO t1 VALUES(4, 'four')"  } }
  }
  set res
} {1 one 2 two 3 three}


#-------------------------------------------------------------------------
# Test that a write-lock is taken on a table when its entire contents
# are deleted using the OP_Clear optimization.
#
foreach {tn delete_sql} {
  1 { DELETE FROM t2 WHERE 1 }
  2 { DELETE FROM t2 }
} {
  do_execsql_test 2.1 {
    DROP TABLE IF EXISTS t2;
    CREATE TABLE t2(x, y);
    INSERT INTO t2 VALUES(1, 2);
    INSERT INTO t2 VALUES(3, 4);
  }

  do_test 2.2 { execsql { SELECT * FROM t2 } db2 } {1 2 3 4}

  do_execsql_test 2.3 " BEGIN; $delete_sql; "

  do_test 2.4 { 
    catchsql { SELECT * FROM t2 } db2 
  } {1 {database table is locked: t2}}

  do_execsql_test 2.5 COMMIT
}


db close
db2 close
sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
