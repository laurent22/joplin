# 2008 July 7
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
# focus of this script testing the tokenizer
#
# $Id: tokenize.test,v 1.1 2008/07/08 00:06:51 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tokenize-1.1 {
  catchsql {SELECT 1.0e+}
} {1 {unrecognized token: "1.0e"}}
do_test tokenize-1.2 {
  catchsql {SELECT 1.0E+}
} {1 {unrecognized token: "1.0E"}}
do_test tokenize-1.3 {
  catchsql {SELECT 1.0e-}
} {1 {unrecognized token: "1.0e"}}
do_test tokenize-1.4 {
  catchsql {SELECT 1.0E-}
} {1 {unrecognized token: "1.0E"}}
do_test tokenize-1.5 {
  catchsql {SELECT 1.0e+/}
} {1 {unrecognized token: "1.0e"}}
do_test tokenize-1.6 {
  catchsql {SELECT 1.0E+:}
} {1 {unrecognized token: "1.0E"}}
do_test tokenize-1.7 {
  catchsql {SELECT 1.0e-:}
} {1 {unrecognized token: "1.0e"}}
do_test tokenize-1.8 {
  catchsql {SELECT 1.0E-/}
} {1 {unrecognized token: "1.0E"}}
do_test tokenize-1.9 {
  catchsql {SELECT 1.0F+5}
} {1 {unrecognized token: "1.0F"}}
do_test tokenize-1.10 {
  catchsql {SELECT 1.0d-10}
} {1 {unrecognized token: "1.0d"}}
do_test tokenize-1.11 {
  catchsql {SELECT 1.0e,5}
} {1 {unrecognized token: "1.0e"}}
do_test tokenize-1.12 {
  catchsql {SELECT 1.0E.10}
} {1 {unrecognized token: "1.0E"}}

do_test tokenize-2.1 {
  catchsql {SELECT 1, 2 /*}
} {1 {near "*": syntax error}}
do_test tokenize-2.2 {
  catchsql {SELECT 1, 2 /* }
} {0 {1 2}}


finish_test
