# 2012 January 12
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix corruptF

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# These tests deal with corrupt database files
#
database_may_be_corrupt

proc str {i} { format %08d $i }

# Create a 6 page database containing a single table - t1. Table t1 
# consists of page 2 (the root page) and pages 5 and 6 (leaf pages). 
# Database pages 3 and 4 are on the free list.
#
proc create_test_db {} {
  catch { db close }
  forcedelete test.db
  sqlite3 db test.db
  db func str str
  execsql {
    PRAGMA auto_vacuum = 0;
    PRAGMA page_size = 1024;
    CREATE TABLE t1(x);         /* root page = 2 */
    CREATE TABLE t2(x);         /* root page = 3 */
    CREATE TABLE t3(x);         /* root page = 4 */

    INSERT INTO t1 VALUES(str(1));
    INSERT INTO t1 SELECT str(rowid+1) FROM t1;
    INSERT INTO t1 SELECT str(rowid+2) FROM t1;
    INSERT INTO t1 SELECT str(rowid+4) FROM t1;
    INSERT INTO t1 SELECT str(rowid+8) FROM t1;
    INSERT INTO t1 SELECT str(rowid+16) FROM t1;
    INSERT INTO t1 SELECT str(rowid+32) FROM t1;
    INSERT INTO t1 SELECT str(rowid+64) FROM t1;
    DROP TABLE t2;
    DROP TABLE t3;
  }
  db close
}

do_test 1.1 { create_test_db } {}

# Check the db is as we expect. 6 pages in total, with 3 and 4 on the free
# list. Page 3 is the free list trunk and page 4 is a leaf.
#
do_test 1.2 { file size test.db } [expr 6*1024]
do_test 1.3 { hexio_read test.db 32 4 } 00000003
do_test 1.4 { hexio_read test.db [expr 2*1024] 12 } 000000000000000100000004

# Change the free-list entry to page 6 and reopen the db file.
do_test 1.5 { 
  hexio_write test.db [expr 2*1024 + 8] 00000006 
  sqlite3 db test.db
} {}

# Now create a new table in the database file. The root of the new table
# is page 6, which is also the right-most leaf page in table t1.
#
do_execsql_test 1.6 { 
  CREATE TABLE t4(x);
  SELECT * FROM sqlite_master;
} {
  table t1 t1 2 {CREATE TABLE t1(x)} 
  table t4 t4 6 {CREATE TABLE t4(x)}
}

# At one point this was causing an assert to fail.
#
# This statement opens a cursor on table t1 and does a full table scan. As
# each row is visited, it is copied into table t4. There is no temporary
# table.
#
# When the t1 cursor reaches page 6 (which is both the right-most leaf of
# t1 and the root of t4), it continues to iterate through the keys within
# it (which at this point are keys that have been inserted into t4). And
# for each row visited, another row is inserted into page 6 - it being the
# root page of t4. Eventually, page 6 becomes full and the height of the
# b-tree for table t4 increased. From the point of view of the t1 cursor,
# this unexpectedly reduces the number of keys on page 6 in the middle of
# its iteration, which causes an assert() to fail.
#
db_save_and_close
if 1 {
for {set i 0} {$i < 128} {incr i} {
  db_restore_and_reopen
  do_test 1.7.$i { 
    set res [
      catchsql { INSERT INTO t4 SELECT x FROM t1 WHERE rowid>$i }
    ]
    if {$res == "0 {}" || $res == "1 {database disk image is malformed}"} {
      set res ""
    }
    set res
  } {}
}
}

do_test 2.1 { create_test_db } {}
do_test 2.2 { file size test.db } [expr 6*1024]
do_test 2.3 { hexio_read test.db 32 4 } 00000003
do_test 2.4 { hexio_read test.db [expr 2*1024] 12 } 000000000000000100000004

# Change the free-list entry to page 5 and reopen the db file.
do_test 2.5 { 
  hexio_write test.db [expr 2*1024 + 8] 00000005 
  sqlite3 db test.db
} {}

# Now create a new table in the database file. The root of the new table
# is page 5, which is also the right-most leaf page in table t1.
#
do_execsql_test 2.6 { 
  CREATE TABLE t4(x);
  SELECT * FROM sqlite_master;
} {
  table t1 t1 2 {CREATE TABLE t1(x)} 
  table t4 t4 5 {CREATE TABLE t4(x)}
}

db_save_and_close
for {set i 127} {$i >= 0} {incr i -1} {
  db_restore_and_reopen
  do_test 2.7.$i { 
    set res [
      catchsql { 
        INSERT INTO t4 SELECT x FROM t1 WHERE rowid<$i ORDER BY rowid DESC 
      }
    ]
    if {$res == "0 {}" || $res == "1 {database disk image is malformed}"} {
      set res ""
    }
    set res
  } {}
}

finish_test
