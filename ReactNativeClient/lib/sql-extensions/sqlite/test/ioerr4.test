# 2007 December 19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing for correct handling of I/O errors
# during incremental vacuum with a shared cache.
#
# $Id: ioerr4.test,v 1.2 2008/05/08 01:11:42 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# This test requires both shared cache and incremental vacuum.
#
ifcapable {!shared_cache || !autovacuum} {
  finish_test
  return
}

# Enable shared cache mode and incremental vacuum.
#
do_test ioerr4-1.1 {
  db close
  set ::enable_shared_cache [sqlite3_enable_shared_cache 1]
} {0}
do_test ioerr4-1.2 {
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  sqlite3 db2 test.db
  db eval {
    PRAGMA auto_vacuum=INCREMENTAL;
    CREATE TABLE a(i INTEGER, b BLOB);
  }
  db2 eval {
    SELECT name FROM sqlite_master
  }
} {a}
do_test ioerr4-1.3 {
  db eval {
    PRAGMA auto_vacuum;
  }
} {2}

# Insert and delete many records in order to put lots of pages
# on the freelist.
#
do_test ioerr4-1.4 {
  db eval {
    INSERT INTO a VALUES(1, zeroblob(2000));
    INSERT INTO a VALUES(2, zeroblob(2000));
    INSERT INTO a SELECT i+2, zeroblob(2000) FROM a;
    INSERT INTO a SELECT i+4, zeroblob(2000) FROM a;
    INSERT INTO a SELECT i+8, zeroblob(2000) FROM a;
    INSERT INTO a SELECT i+16, zeroblob(2000) FROM a;
    SELECT count(*) FROM a;
  }
} {32}
do_test ioerr4-1.5 {
  db eval {
    PRAGMA freelist_count
  }
} {0}
do_test ioerr4-1.6 {
  db eval {
    DELETE FROM a;
    PRAGMA freelist_count;
  }
} {64}

# Set up for an I/O error on incremental vacuum
# with two connections on shared cache.
#
db close
db2 close
forcecopy test.db test.db-bu
do_ioerr_test ioerr4-2 -tclprep {
  catch {db2 close}
  db close
  forcedelete test.db test.db-journal
  forcecopy test.db-bu test.db
  sqlite3_enable_shared_cache 1
  set ::DB [sqlite3 db test.db; sqlite3_connection_pointer db]
  db eval {PRAGMA auto_vacuum=INCREMENTAL}
  sqlite3 db2 test.db
} -tclbody {
  db eval {PRAGMA incremental_vacuum(5)}
}

db2 close
forcedelete test.db-bu
sqlite3_enable_shared_cache $::enable_shared_cache

finish_test
