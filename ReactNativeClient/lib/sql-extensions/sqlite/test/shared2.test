# 2005 January 19
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
# $Id: shared2.test,v 1.8 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl
db close

ifcapable !shared_cache {
  finish_test
  return
}
set ::enable_shared_cache [sqlite3_enable_shared_cache 1]

# Test that if we delete all rows from a table any read-uncommitted 
# cursors are correctly invalidated. Test on both table and index btrees.
do_test shared2-1.1 {
  sqlite3 db1 test.db
  sqlite3 db2 test.db

  # Set up some data. Table "numbers" has 64 rows after this block 
  # is executed.
  execsql {
    BEGIN;
    CREATE TABLE numbers(a PRIMARY KEY, b);
    INSERT INTO numbers(oid) VALUES(NULL);
    INSERT INTO numbers(oid) SELECT NULL FROM numbers;
    INSERT INTO numbers(oid) SELECT NULL FROM numbers;
    INSERT INTO numbers(oid) SELECT NULL FROM numbers;
    INSERT INTO numbers(oid) SELECT NULL FROM numbers;
    INSERT INTO numbers(oid) SELECT NULL FROM numbers;
    INSERT INTO numbers(oid) SELECT NULL FROM numbers;
    UPDATE numbers set a = oid, b = 'abcdefghijklmnopqrstuvwxyz0123456789';
    COMMIT;
  } db1
} {}
do_test shared2-1.2 {
  # Put connection 2 in read-uncommitted mode and start a SELECT on table 
  # 'numbers'. Half way through the SELECT, use connection 1 to delete the
  # contents of this table.
  execsql {
    pragma read_uncommitted = 1;
  } db2
  set count [execsql {SELECT count(*) FROM numbers} db2]
  db2 eval {SELECT a FROM numbers ORDER BY oid} {
    if {$a==32} {
      execsql {
        BEGIN;
        DELETE FROM numbers;
      } db1
    }
  }
  list $a $count
} {32 64}
do_test shared2-1.3 {
  # Same test as 1.2, except scan using the index this time.
  execsql {
    ROLLBACK;
  } db1
  set count [execsql {SELECT count(*) FROM numbers} db2]
  db2 eval {SELECT a, b FROM numbers ORDER BY a} {
    if {$a==32} {
      execsql {
        DELETE FROM numbers;
      } db1
    }
  }
  list $a $count
} {32 64}


db1 close
db2 close

do_test shared2-3.2 {
  sqlite3_enable_shared_cache 1
} {1}

forcedelete test.db

sqlite3 db test.db
do_test shared2-4.1 {
  execsql {
    CREATE TABLE t0(a, b);
    CREATE TABLE t1(a, b DEFAULT 'hello world');
  }
} {}
db close

sqlite3 db test.db
sqlite3 db2 test.db

do_test shared2-4.2 {
  execsql { SELECT a, b FROM t0 } db
  execsql { INSERT INTO t1(a) VALUES(1) } db2
} {}

do_test shared2-4.3 {
  db2 close
  db close
} {}

# At one point, this was causing a crash.
#
do_test shared2-5.1 {
  sqlite3 db test.db
  sqlite3 db2 test.db
  execsql { CREATE TABLE t2(a, b, c) }
  
  # The following statement would crash when attempting to sqlite3_free()
  # a pointer allocated from a lookaside buffer.
  execsql { CREATE INDEX i1 ON t2(a) } db2
} {}

db close
db2 close

# The following test verifies that shared-cache mode does not automatically
# turn on exclusive-locking mode for some reason.
do_multiclient_test {tn} {
  sql1 { CREATE TABLE t1(a, b) }
  sql2 { CREATE TABLE t2(a, b) }
  do_test shared2-6.$tn.1 { sql1 { SELECT * FROM t2 } } {}
  do_test shared2-6.$tn.2 { sql2 { SELECT * FROM t1 } } {}
}

sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
