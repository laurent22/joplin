# 2016 March 3
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tempdb2

db close
sqlite3 db ""

set unlocked unlocked
if {$::TEMP_STORE>=2} { set unlocked unknown }

proc int2str {i} { string range [string repeat "$i." 450] 0 899 }
db func int2str int2str

#-------------------------------------------------------------------------
#
#  1.1: Write a big transaction to the db. One so large that it forces
#       the file to be created and the cache flushed to disk on COMMIT.
#
#  1.2: Write a small transaction - one small enough that it remains in
#       memory on COMMIT. All the pages of table [t1] are now dirty.
#
#  1.3: Delete the contents of [t1]. This moves all of its leaves to the
#       free-list and causes the btree layer to call PagerDontWrite() on
#       each of them.
#
#       Then do a big update on table [t2]. So big that the former leaves
#       of [t1] are forced out of the cache. Then roll back the transaction.
#       If the PagerDontWrite() calls are honoured and the data is not written
#       to disk, the update made in test 1.2 will be lost at this point. Or, if
#       they are ignored (as they should be for temp databases), the update
#       will be safely written out to disk before the cache entries are
#       discarded.
#
do_execsql_test 1.1 {
  PRAGMA page_size=1024;
  PRAGMA cache_size=50;

  BEGIN;
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
    INSERT INTO t1 VALUES(1, int2str(1));
    INSERT INTO t1 VALUES(2, int2str(1));
    INSERT INTO t1 VALUES(3, int2str(1));

    CREATE TABLE t2(a INTEGER PRIMARY KEY, b);
    WITH c(x) AS ( VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<100 ) 
    INSERT INTO t2 SELECT x, int2str(x) FROM c;
  COMMIT;

  PRAGMA lock_status;
} [list main $unlocked temp closed]

do_execsql_test 1.2 {
  UPDATE t1 SET b=int2str(2);
  SELECT b=int2str(2) FROM t1
} {1 1 1}

do_execsql_test 1.3 {
  BEGIN;
    DELETE FROM t1;
    UPDATE t2 SET b=int2str(a+1);
  ROLLBACK;
}

do_execsql_test 1.4 {
  SELECT b=int2str(2) FROM t1
} {1 1 1}

#-------------------------------------------------------------------------
db close
sqlite3 db ""
db func int2str int2str

do_execsql_test 2.0 {
  PRAGMA cache_size = -100;
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  WITH c(x) AS ( VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<100 ) 
    INSERT INTO t1 SELECT x, int2str(x) FROM c;
}

do_execsql_test 2.1 {
  INSERT INTO t1 VALUES(10001, int2str(1001) || int2str(1001) || int2str(1001));
}

do_execsql_test 2.2 {
  SELECT b FROM t1 WHERE a = 10001;
} "[int2str 1001][int2str 1001][int2str 1001]"

finish_test
