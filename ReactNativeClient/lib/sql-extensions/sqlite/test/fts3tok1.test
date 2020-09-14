# 2013 April 22
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the "fts3tokenize" virtual table
# that is part of the FTS3 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !fts3 { finish_test ; return }
set ::testprefix fts3tok1

#-------------------------------------------------------------------------
# Simple test cases. Using the default (simple) tokenizer.
#
do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts3tokenize(simple);
  CREATE VIRTUAL TABLE t2 USING fts3tokenize();
  CREATE VIRTUAL TABLE t3 USING fts3tokenize(simple, '', 'xyz ');
}

foreach {tn tbl} {1 t1 2 t2 3 t3} {
  do_execsql_test 1.$tn.1 "SELECT * FROM $tbl WHERE input = 'one two three'" {
    {one two three} one   0  3 0 
    {one two three} two   4  7 1 
    {one two three} three 8 13 2
  }

  do_execsql_test 1.$tn.2 "
    SELECT token FROM $tbl WHERE input = 'OnE tWo tHrEe'
  " {
    one two three
  }
}

do_execsql_test 1.4 {
  SELECT token FROM t3 WHERE input = '1x2x3x'
} {1 2 3}

do_execsql_test 1.5 {
  SELECT token FROM t1 WHERE input = '1x2x3x'
} {1x2x3x}

do_execsql_test 1.6 {
  SELECT token FROM t3 WHERE input = '1''2x3x'
} {1'2 3}

do_execsql_test 1.7 {
  SELECT token FROM t3 WHERE input = ''
} {}

do_execsql_test 1.8 {
  SELECT token FROM t3 WHERE input = NULL
} {}

do_execsql_test 1.9 {
  SELECT * FROM t3 WHERE input = 123
} {123 123 0 3 0}

do_execsql_test 1.10 {
  SELECT * FROM t1 WHERE input = 'a b c' AND token = 'b';
} {
  {a b c} b 2 3 1
}

do_execsql_test 1.11 {
  SELECT * FROM t1 WHERE token = 'b' AND input = 'a b c';
} {
  {a b c} b 2 3 1
}

do_execsql_test 1.12 {
  SELECT * FROM t1 WHERE input < 'b' AND input = 'a b c';
} {
  {a b c} a 0 1 0 
  {a b c} b 2 3 1 
  {a b c} c 4 5 2
}

do_execsql_test 1.13.1 {
  CREATE TABLE c1(x);
  INSERT INTO c1(x) VALUES('a b c');
  INSERT INTO c1(x) VALUES('d e f');
}
do_execsql_test 1.13.2 {
  SELECT * FROM c1, t1 WHERE input = x AND c1.rowid=t1.rowid;
} {
  {a b c} {a b c} a 0 1 0 
  {d e f} {d e f} e 2 3 1 
}


#-------------------------------------------------------------------------
# Error cases.
#
do_catchsql_test 2.0 {
  CREATE VIRTUAL TABLE tX USING fts3tokenize(nosuchtokenizer);
} {1 {unknown tokenizer: nosuchtokenizer}}

do_catchsql_test 2.1 {
  CREATE VIRTUAL TABLE t4 USING fts3tokenize;
  SELECT * FROM t4;
} {1 {SQL logic error}}

do_catchsql_test 2.2 {
  CREATE VIRTUAL TABLE t USING fts4(tokenize=simple""); 
} {0 {}}

ifcapable fts3_unicode {
  do_catchsql_test 2.3 {
    CREATE VIRTUAL TABLE u USING fts4(tokenize=unicode61""); 
  } {1 {unknown tokenizer}}
}


finish_test
