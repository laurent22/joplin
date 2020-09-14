# 2007 March 24
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
# $Id: cache.test,v 1.4 2007/08/22 02:56:44 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !pager_pragmas||!compound {
  finish_test
  return
}
sqlite3_soft_heap_limit 0

proc pager_cache_size {db} {
  set bt [btree_from_db $db]
  db_enter $db
  array set stats [btree_pager_stats $bt]
  db_leave $db
  return $stats(page)
}

if {[permutation] == ""} { 
  do_test cache-1.1 { pager_cache_size db } {0}
}

do_test cache-1.2 {
  execsql {
    PRAGMA auto_vacuum=OFF;
    CREATE TABLE abc(a, b, c);
    INSERT INTO abc VALUES(1, 2, 3);
  }
  pager_cache_size db
} {2}

# At one point, repeatedly locking and unlocking the cache was causing
# a resource leak of one page per repetition. The page wasn't actually
# leaked, but would not be reused until the pager-cache was full (i.e. 
# 2000 pages by default).
#
# This tests that once the pager-cache is initialized, it can be locked
# and unlocked repeatedly without internally allocating any new pages.
#
set cache_size [pager_cache_size db]
for {set ii 0} {$ii < 10} {incr ii} {
  do_test cache-1.3.$ii {
    execsql {SELECT * FROM abc}
    pager_cache_size db
  } $::cache_size
}

#-------------------------------------------------------------------------
# This block of tests checks that it is possible to set the cache_size of a
# database to a small (< 10) value. More specifically:
#
#   cache-2.1.*: Test that "PRAGMA cache_size" appears to work with small 
#                values.
#   cache-2.2.*: Test that "PRAGMA main.cache_size" appears to work with 
#                small values.
#   cache-2.3.*: Test cache_size=1 correctly spills/flushes the cache. 
#   cache-2.4.*: Test cache_size=0 correctly spills/flushes the cache. 
#
#
db_delete_and_reopen
do_execsql_test cache-2.0 {
  PRAGMA auto_vacuum=OFF;
  PRAGMA journal_mode=DELETE;
  CREATE TABLE t1(a, b);
  CREATE TABLE t2(c, d);
  INSERT INTO t1 VALUES('x', 'y');
  INSERT INTO t2 VALUES('i', 'j');
} {delete}

for {set i 0} {$i < 20} {incr i} {
  do_execsql_test cache-2.1.$i.1 "PRAGMA cache_size = $i"
  do_execsql_test cache-2.1.$i.2 "PRAGMA cache_size" $i
  do_execsql_test cache-2.1.$i.3 "SELECT * FROM t1" {x y}
  do_execsql_test cache-2.1.$i.4 "PRAGMA cache_size" $i
}
for {set i 0} {$i < 20} {incr i} {
  do_execsql_test cache-2.2.$i.1 "PRAGMA main.cache_size = $i"
  do_execsql_test cache-2.2.$i.2 "PRAGMA main.cache_size" $i
  do_execsql_test cache-2.2.$i.3 "SELECT * FROM t1" {x y}
  do_execsql_test cache-2.2.$i.4 "PRAGMA main.cache_size" $i
}

# Tests for cache_size = 1.
#
do_execsql_test cache-2.3.1 {
  PRAGMA cache_size = 1;
  BEGIN;
    INSERT INTO t1 VALUES(1, 2);
    PRAGMA lock_status;
} {main reserved temp closed}
do_test cache-2.3.2 { pager_cache_size db } 2
do_execsql_test cache-2.3.3 {
    INSERT INTO t2 VALUES(1, 2);
    PRAGMA lock_status;
} {main exclusive temp closed}
do_test cache-2.3.4 { pager_cache_size db } 2
do_execsql_test cache-2.3.5 COMMIT
do_test cache-2.3.6 { pager_cache_size db } 1

do_execsql_test cache-2.3.7 {
  SELECT * FROM t1 UNION SELECT * FROM t2;
} {1 2 i j x y}
do_test cache-2.3.8 { pager_cache_size db } 1

# Tests for cache_size = 0.
#
do_execsql_test cache-2.4.1 {
  PRAGMA cache_size = 0;
  BEGIN;
    INSERT INTO t1 VALUES(1, 2);
    PRAGMA lock_status;
} {main reserved temp closed}
do_test cache-2.4.2 { pager_cache_size db } 2
do_execsql_test cache-2.4.3 {
    INSERT INTO t2 VALUES(1, 2);
    PRAGMA lock_status;
} {main exclusive temp closed}
do_test cache-2.4.4 { pager_cache_size db } 2
do_execsql_test cache-2.4.5 COMMIT

do_test cache-2.4.6 { pager_cache_size db } 0
do_execsql_test cache-2.4.7 {
  SELECT * FROM t1 UNION SELECT * FROM t2;
} {1 2 i j x y}
do_test cache-2.4.8 { pager_cache_size db } 0

sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)
finish_test
