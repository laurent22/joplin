# 2006 June 10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. The
# focus is on testing the following virtual table methods:
#
#     xBegin
#     xSync
#     xCommit
#     xRollback
#
# $Id: vtab4.test,v 1.3 2008/07/12 14:52:21 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

unset -nocomplain echo_module
unset -nocomplain echo_module_sync_fail

ifcapable !vtab {
  finish_test
  return
}

# Register the echo module
db cache size 0
register_echo_module [sqlite3_connection_pointer db]

do_test vtab4-1.1 {
  execsql {
    CREATE TABLE treal(a PRIMARY KEY, b, c);
    CREATE VIRTUAL TABLE techo USING echo(treal);
  }
} {}

# Test an INSERT, UPDATE and DELETE statement on the virtual table
# in an implicit transaction. Each should result in a single call
# to xBegin, xSync and xCommit.
#
do_test vtab4-1.2 {
  set echo_module [list]
  execsql {
    INSERT INTO techo VALUES(1, 2, 3);
  }
  set echo_module
} {xBegin echo(treal) xSync echo(treal) xCommit echo(treal)}
do_test vtab4-1.3 {
  set echo_module [list]
  execsql {
    UPDATE techo SET a = 2;
  }
  set echo_module
} [list xBestIndex {SELECT rowid, a, b, c FROM 'treal'} \
        xBegin     echo(treal)                    \
        xFilter    {SELECT rowid, a, b, c FROM 'treal'} \
        xSync      echo(treal)                    \
        xCommit    echo(treal)                    \
]
do_test vtab4-1.4 {
  set echo_module [list]
  execsql {
    DELETE FROM techo;
  }
  set echo_module
} [list xBestIndex {SELECT rowid, NULL, NULL, NULL FROM 'treal'} \
        xBegin     echo(treal)                    \
        xFilter    {SELECT rowid, NULL, NULL, NULL FROM 'treal'} \
        xSync      echo(treal)                    \
        xCommit    echo(treal)                    \
]

# Ensure xBegin is not called more than once in a single transaction.
#
do_test vtab4-2.1 {
  set echo_module [list]
  execsql {
    BEGIN;
    INSERT INTO techo VALUES(1, 2, 3);
    INSERT INTO techo VALUES(4, 5, 6);
    INSERT INTO techo VALUES(7, 8, 9);
    COMMIT;
  }
  set echo_module
} {xBegin echo(treal) xSync echo(treal) xCommit echo(treal)}

# Try a transaction with two virtual tables.
#
do_test vtab4-2.2 {
  execsql {
    CREATE TABLE sreal(a, b, c UNIQUE);
    CREATE VIRTUAL TABLE secho USING echo(sreal);
  }
  set echo_module [list]
  execsql {
    BEGIN;
    INSERT INTO secho SELECT * FROM techo;
    DELETE FROM techo;
    COMMIT;
  }
  set echo_module
} [list xBestIndex {SELECT rowid, a, b, c FROM 'treal'} \
        xBegin     echo(sreal)                    \
        xFilter    {SELECT rowid, a, b, c FROM 'treal'} \
        xBestIndex {SELECT rowid, NULL, NULL, NULL FROM 'treal'} \
        xBegin     echo(treal)                    \
        xFilter    {SELECT rowid, NULL, NULL, NULL FROM 'treal'} \
        xSync   echo(sreal)                       \
        xSync   echo(treal)                       \
        xCommit echo(sreal)                       \
        xCommit echo(treal)                       \
]
do_test vtab4-2.3 {
  execsql {
    SELECT * FROM secho;
  }
} {1 2 3 4 5 6 7 8 9}
do_test vtab4-2.4 {
  execsql {
    SELECT * FROM techo;
  }
} {}

# Try an explicit ROLLBACK on a transaction with two open virtual tables.
do_test vtab4-2.5 {
  set echo_module [list]
  execsql {
    BEGIN;
    INSERT INTO techo SELECT * FROM secho;
    DELETE FROM secho;
    ROLLBACK;
  }
  set echo_module
} [list xBestIndex {SELECT rowid, a, b, c FROM 'sreal'} \
        xBegin     echo(treal)                    \
        xFilter    {SELECT rowid, a, b, c FROM 'sreal'} \
        xBestIndex {SELECT rowid, NULL, NULL, NULL FROM 'sreal'} \
        xBegin     echo(sreal)                    \
        xFilter    {SELECT rowid, NULL, NULL, NULL FROM 'sreal'} \
        xRollback  echo(treal)                    \
        xRollback  echo(sreal)                    \
]
do_test vtab4-2.6 {
  execsql {
    SELECT * FROM secho;
  }
} {1 2 3 4 5 6 7 8 9}
do_test vtab4-2.7 {
  execsql {
    SELECT * FROM techo;
  }
} {}

do_test vtab4-3.1 {
  set echo_module [list]
  set echo_module_sync_fail treal
  catchsql {
    INSERT INTO techo VALUES(1, 2, 3);
  }
} {1 {unknown error}}
do_test vtab4-3.2 {
  set echo_module
} {xBegin echo(treal) xSync echo(treal) xRollback echo(treal)}

do_test vtab4-3.3 {
  set echo_module [list]
  set echo_module_sync_fail sreal
  catchsql {
    BEGIN;
    INSERT INTO techo SELECT * FROM secho;
    DELETE FROM secho;
    COMMIT;
  }
  set echo_module
} [list xBestIndex {SELECT rowid, a, b, c FROM 'sreal'} \
        xBegin     echo(treal)                    \
        xFilter    {SELECT rowid, a, b, c FROM 'sreal'} \
        xBestIndex {SELECT rowid, NULL, NULL, NULL FROM 'sreal'} \
        xBegin     echo(sreal)                    \
        xFilter    {SELECT rowid, NULL, NULL, NULL FROM 'sreal'} \
        xSync      echo(treal)                    \
        xSync      echo(sreal)                    \
        xRollback  echo(treal)                    \
        xRollback  echo(sreal)                    \
]

finish_test
