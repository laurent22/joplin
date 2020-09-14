# 2009 October 23
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
# This file implements tests to verify that ticket [3fe897352e8d8] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# The following tests use hex_to_utf16be() and hex_to_utf16le() which 
# which are only available if SQLite is built with UTF16 support.
ifcapable {!utf16} {
  finish_test
  return
}

do_test tkt-3fe89-1.1 {
  db close
  sqlite3 db :memory:
  db eval {
    PRAGMA encoding=UTF8;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(hex_to_utf16be('D800'));
    SELECT hex(x) FROM t1;
  }
} {EDA080}
do_test tkt-3fe89-1.2 {
  db eval {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(hex_to_utf16le('00D8'));
    SELECT hex(x) FROM t1;
  }
} {EDA080}
do_test tkt-3fe89-1.3 {
  db eval {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(hex_to_utf16be('DFFF'));
    SELECT hex(x) FROM t1;
  }
} {EDBFBF}
do_test tkt-3fe89-1.4 {
  db eval {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(hex_to_utf16le('FFDF'));
    SELECT hex(x) FROM t1;
  }
} {EDBFBF}


finish_test
