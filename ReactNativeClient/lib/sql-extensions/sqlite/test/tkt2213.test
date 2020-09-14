# 2007 Febuary 05
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
# This file implements tests to verify that ticket #2213 has been
# fixed.  
#
#
# $Id: tkt2213.test,v 1.2 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt2213-1 {
  sqlite3_create_function db
  catchsql {
    SELECT tkt2213func(tkt2213func('abcd'));
  }
} {0 abcd}

finish_test
