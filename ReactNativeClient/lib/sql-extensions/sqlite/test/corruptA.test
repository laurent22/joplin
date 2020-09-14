# 2008 July 11
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
# This file implements tests to make sure SQLite does not crash or
# segfault if it sees a corrupt database file.  It specifically focuses
# on corrupt database headers.
#
# $Id: corruptA.test,v 1.1 2008/07/11 16:39:23 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# These tests deal with corrupt database files
#
database_may_be_corrupt


# Create a database to work with.
#
do_test corruptA-1.1 {
  execsql {
    CREATE TABLE t1(x);
    INSERT INTO t1(x) VALUES(1);
  }
  expr {[file size test.db]>=1024}
} {1}
integrity_check corruptA-1.2

# Corrupt the file header in various ways and make sure the corruption
# is detected when opening the database file.
#
db close
forcecopy test.db test.db-template

set unreadable_version 02
ifcapable wal { set unreadable_version 03 }
do_test corruptA-2.1 {
  forcecopy test.db-template test.db
  hexio_write test.db 19 $unreadable_version   ;# the read format number
  sqlite3 db test.db
  catchsql {SELECT * FROM t1}  
} {1 {file is not a database}}
 
do_test corruptA-2.2 {
  db close
  forcecopy test.db-template test.db
  hexio_write test.db 21 41   ;# max embedded payload fraction
  sqlite3 db test.db
  catchsql {SELECT * FROM t1}  
} {1 {file is not a database}}
 
do_test corruptA-2.3 {
  db close
  forcecopy test.db-template test.db
  hexio_write test.db 22 1f   ;# min embedded payload fraction
  sqlite3 db test.db
  catchsql {SELECT * FROM t1}  
} {1 {file is not a database}}
 
do_test corruptA-2.4 {
  db close
  forcecopy test.db-template test.db
  hexio_write test.db 23 21   ;# min leaf payload fraction
  sqlite3 db test.db
  catchsql {SELECT * FROM t1}  
} {1 {file is not a database}}
 

finish_test
