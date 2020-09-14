# 2007 Dec 4
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that ticket #2820 has been fixed.
# Ticket #2820 observes that a DROP TABLE statement that
# occurs while a query is in process will fail with a
# "database is locked" error, but the entry in the sqlite_master
# table will still be removed.  This is incorrect.  The
# entry in the sqlite_master table should persist when 
# the DROP fails due to an error.
#
# $Id: tkt2820.test,v 1.1 2007/12/04 16:54:53 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

proc test_schema_change {testid init ddl res} {
  db close
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  execsql $init
  do_test tkt2820-$testid.1 {
    set STMT [sqlite3_prepare db {SELECT * FROM sqlite_master} -1 DUMMY]
    sqlite3_step $STMT
  } {SQLITE_ROW}
#if {$testid==3} {execsql {PRAGMA vdbe_trace=ON}}
  do_test tkt2820-$testid.2 "catchsql [list $ddl]" \
       {1 {database table is locked}}
  do_test tkt2820-$testid.3 {
    sqlite3_finalize $STMT
    execsql {SELECT name FROM sqlite_master ORDER BY 1}
  } $res
  integrity_check tkt2820-$testid.4
  db close
  sqlite3 db test.db
  integrity_check tkt2820-$testid.5
}

test_schema_change 1 {
  CREATE TABLE t1(a);
} {
  DROP TABLE t1
} {t1}
test_schema_change 2 {
  CREATE TABLE t1(a);
  CREATE TABLE t2(b);
} {
  DROP TABLE t2
} {t1 t2}
test_schema_change 3 {
  CREATE TABLE t1(a);
  CREATE INDEX i1 ON t1(a);
} {
  DROP INDEX i1
} {i1 t1}

# We further observe that prior to the fix associated with ticket #2820,
# no statement journal would be created on an SQL statement that was run
# while a second statement was active, as long as we are in autocommit
# mode.  This is incorrect.
#
do_test tkt2820-4.1 {
  db close
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  db eval {
    CREATE TABLE t1(a INTEGER PRIMARY KEY);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
  }

  # The INSERT statement within the loop should fail on a
  # constraint violation on the second inserted row.  This
  # should cause the entire INSERT to rollback using a statement
  # journal.
  #
  db eval {SELECT name FROM sqlite_master} {
    catch {db eval {
      INSERT INTO t1 SELECT a+1 FROM t1 ORDER BY a DESC
    }}
  }
  db eval {SELECT a FROM t1 ORDER BY a}
} {1 2}

finish_test
