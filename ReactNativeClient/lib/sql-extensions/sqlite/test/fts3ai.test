# 2007 January 17
#
# The author disclaims copyright to this source code.
#
#*************************************************************************
# This file implements regression tests for SQLite fts3 library.  The
# focus here is testing handling of UPDATE when using UTF-16-encoded
# databases.
#
# $Id: fts3ai.test,v 1.1 2007/08/20 17:38:42 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

ifcapable !utf16 {
  finish_test
  return
}

# Return the UTF-16 representation of the supplied UTF-8 string $str.
# If $nt is true, append two 0x00 bytes as a nul terminator.
# NOTE(shess) Copied from capi3.test.
proc utf16 {str {nt 1}} {
  set r [encoding convertto unicode $str]
  if {$nt} {
    append r "\x00\x00"
  }
  return $r
}

db eval {
  PRAGMA encoding = "UTF-16le";
  CREATE VIRTUAL TABLE t1 USING fts3(content);
}

do_test fts3ai-1.0 {
  execsql {PRAGMA encoding}
} {UTF-16le}

do_test fts3ai-1.1 {
  execsql {INSERT INTO t1 (rowid, content) VALUES(1, 'one')}
  execsql {SELECT content FROM t1 WHERE rowid = 1}
} {one}

do_test fts3ai-1.2 {
  set sql "INSERT INTO t1 (rowid, content) VALUES(2, 'two')"
  set STMT [sqlite3_prepare $DB $sql -1 TAIL]
  sqlite3_step $STMT
  sqlite3_finalize $STMT
  execsql {SELECT content FROM t1 WHERE rowid = 2}
} {two}

do_test fts3ai-1.3 {
  set sql "INSERT INTO t1 (rowid, content) VALUES(3, 'three')"
  set STMT [sqlite3_prepare $DB $sql -1 TAIL]
  sqlite3_step $STMT
  sqlite3_finalize $STMT
  set sql "UPDATE t1 SET content = 'trois' WHERE rowid = 3"
  set STMT [sqlite3_prepare $DB $sql -1 TAIL]
  sqlite3_step $STMT
  sqlite3_finalize $STMT
  execsql {SELECT content FROM t1 WHERE rowid = 3}
} {trois}

do_test fts3ai-1.4 {
  set sql16 [utf16 {INSERT INTO t1 (rowid, content) VALUES(4, 'four')}]
  set STMT [sqlite3_prepare16 $DB $sql16 -1 TAIL]
  sqlite3_step $STMT
  sqlite3_finalize $STMT
  execsql {SELECT content FROM t1 WHERE rowid = 4}
} {four}

do_test fts3ai-1.5 {
  set sql16 [utf16 {INSERT INTO t1 (rowid, content) VALUES(5, 'five')}]
  set STMT [sqlite3_prepare16 $DB $sql16 -1 TAIL]
  sqlite3_step $STMT
  sqlite3_finalize $STMT
  set sql "UPDATE t1 SET content = 'cinq' WHERE rowid = 5"
  set STMT [sqlite3_prepare $DB $sql -1 TAIL]
  sqlite3_step $STMT
  sqlite3_finalize $STMT
  execsql {SELECT content FROM t1 WHERE rowid = 5}
} {cinq}

finish_test
