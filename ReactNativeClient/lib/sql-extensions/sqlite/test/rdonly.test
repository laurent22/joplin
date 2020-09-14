# 2007 April 24
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests to make sure SQLite treats a database
# as readonly if its write version is set to  high.
#
# $Id: rdonly.test,v 1.2 2008/07/08 10:19:58 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# Create a database.
#
do_test rdonly-1.1 {
  execsql {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    SELECT * FROM t1;
  }
} {1}

# EVIDENCE-OF: R-29639-16887 The sqlite3_db_readonly(D,N) interface
# returns 1 if the database N of connection D is read-only, 0 if it is
# read/write, or -1 if N is not the name of a database on connection D.
#
do_test rdonly-1.1.1 {
  sqlite3_db_readonly db main
} {0}

# Changes the write version from 1 to 3.  Verify that the database
# can be read but not written.
#
do_test rdonly-1.2 {
  db close
  hexio_get_int [hexio_read test.db 18 1]
} 1
do_test rdonly-1.3 {
  hexio_write test.db 18 03
  sqlite3 db test.db
  execsql {
    SELECT * FROM t1;
  }
} {1}
do_test rdonly-1.3.1 {
  sqlite3_db_readonly db main
} {1}
do_test rdonly-1.4 {
  catchsql {
    INSERT INTO t1 VALUES(2)
  }
} {1 {attempt to write a readonly database}}

# Change the write version back to 1.  Verify that the database
# is read-write again.
#
do_test rdonly-1.5 {
  db close
  hexio_write test.db 18 01
  sqlite3 db test.db
  catchsql {
    INSERT INTO t1 VALUES(2);
    SELECT * FROM t1;
  }
} {0 {1 2}}

# Now, after connection [db] has loaded the database schema, modify the
# write-version of the file (and the change-counter, so that the 
# write-version is reloaded). This way, SQLite does not discover that
# the database is read-only until after it is locked.
#
set ro_version 02
ifcapable wal { set ro_version 03 }
do_test rdonly-1.6 {
  hexio_write test.db 18 $ro_version     ; # write-version
  hexio_write test.db 24 11223344        ; # change-counter
  catchsql {
    INSERT INTO t1 VALUES(2);
  }
} {1 {attempt to write a readonly database}}

finish_test
