# 2007 December 02 
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
# Specifically, it tests that bug 2817 is fixed.
#
# $Id: tkt2817.test,v 1.2 2008/07/12 14:52:21 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt2817-1.0 {
  execsql {
    CREATE TEMP TABLE tbl(a, b, c);
    -- INSERT INTO tbl VALUES(1, 'abc', 'def');
    -- INSERT INTO tbl VALUES(2, 'ghi', 'jkl');
  }
} {}
do_test tkt2817-1.1 {
  execsql {
    CREATE TABLE main.tbl(a, b, c); 
    CREATE INDEX main.tbli ON tbl(a, b, c);
    INSERT INTO main.tbl SELECT a, b, c FROM temp.tbl;
  }
} {}

# When bug #2817 existed, this test was failing.
#
integrity_check tkt2817-1.2

# So was this one.
#
db close
sqlite3 db test.db
integrity_check tkt2817-1.3


# These tests - tkt2817-2.* - are the same as the previous block, except
# for the fact that the temp-table and the main table do not share the
# same name. #2817 did not cause a problem with these tests.
#
db close
forcedelete test.db
sqlite3 db test.db
do_test tkt2817-2.0 {
  execsql {
    CREATE TEMP TABLE tmp(a, b, c);
    INSERT INTO tmp VALUES(1, 'abc', 'def');
    INSERT INTO tmp VALUES(2, 'ghi', 'jkl');
  }
} {}
do_test tkt2817-2.1 {
  execsql {
    CREATE TABLE main.tbl(a, b, c); 
    CREATE INDEX main.tbli ON tbl(a, b, c);
    INSERT INTO main.tbl SELECT a, b, c FROM temp.tmp;
  }
} {}
integrity_check tkt2817-2.2
db close
sqlite3 db test.db
integrity_check tkt2817-2.3

finish_test
