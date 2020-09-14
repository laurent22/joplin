# 2009 March 24
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

ifcapable {!pager_pragmas} {
  finish_test
  return
}

if {[atomic_batch_write test.db]} {
  finish_test
  return
}

#-------------------------------------------------------------------------
# The tests in this file check that the following two bugs (both now fixed)
# do not reappear.
#
# jrnlmode2-1.*: Demonstrate bug #3745:
#
#     In persistent journal mode, if:
#
#       * There is a persistent journal in the file-system, AND
#       * there exists a connection with a shared lock on the db file, 
#
#     then a second connection cannot open a read-transaction on the database.
#     The reason is because while determining that the persistent-journal is
#     not a hot-journal, SQLite currently grabs an exclusive lock on the
#     database file. If this fails because another connection has a shared
#     lock, then SQLITE_BUSY is returned to the user.  
#
# jrnlmode2-2.*: Demonstrate bug #3751:
#
#     If a connection is opened in SQLITE_OPEN_READONLY mode, the underlying
#     unix file descriptor on the database file is opened in O_RDONLY mode.
#
#     When SQLite queries the database file for the schema in order to compile
#     the SELECT statement, it sees the empty journal in the file system, it
#     attempts to obtain an exclusive lock on the database file (this is a
#     bug). The attempt to obtain an exclusive (write) lock on a read-only file
#     fails at the OS level. Under unix, fcntl() reports an EBADF - "Bad file
#     descriptor" - error. 
#

do_test jrnlmode2-1.1 {
  execsql {
    PRAGMA journal_mode = persist;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
  }
} {persist}

do_test jrnlmode2-1.2 {
  file exists test.db-journal
} {1}

do_test jrnlmode2-1.3 {
  sqlite3 db2 test.db
  execsql { SELECT * FROM t1 } db2
} {1 2}

do_test jrnlmode2-1.4 {
  execsql {
    INSERT INTO t1 VALUES(3, 4);
  }
  execsql {
    BEGIN;
    SELECT * FROM t1;
  }
  execsql { PRAGMA lock_status }
} {main shared temp closed}

do_test jrnlmode2-1.5 {
  file exists test.db-journal
} {1}

do_test jrnlmode2-1.6 {
  catchsql { SELECT * FROM t1 } db2
} {0 {1 2 3 4}}

do_test jrnlmode2-1.7 {
  execsql { COMMIT }
  catchsql { SELECT * FROM t1 } db2
} {0 {1 2 3 4}}



do_test jrnlmode2-2.1 {
  db2 close
  execsql { PRAGMA journal_mode = truncate }
  execsql { INSERT INTO t1 VALUES(5, 6) }
} {}

do_test jrnlmode2-2.2 {
  file exists test.db-journal
} {1}

do_test jrnlmode2-2.3 {
  file size test.db-journal
} {0}

do_test jrnlmode2-2.4 {
  sqlite3 db2 test.db -readonly 1
  catchsql { SELECT * FROM t1 } db2
} {0 {1 2 3 4 5 6}}

do_test jrnlmode2-2.5 {
  db close
  delete_file test.db-journal
} {}
do_test jrnlmode2-2.6 {
  sqlite3 db2 test.db -readonly 1
  catchsql { SELECT * FROM t1 } db2
} {0 {1 2 3 4 5 6}}

catch { db2 close }
finish_test
