# 2007 June 24
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that ticket #2450 has been fixed.
#
# $Id: tkt2450.test,v 1.1 2007/06/24 06:32:18 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt2450-1 {
  execsql {
    CREATE TABLE "t a" ("""cb""");
    INSERT INTO "t a" ("""cb""") VALUES (1);
    SELECT """cb""" FROM "t a";
  }
} {1}

do_test tkt2450-2 {
  execsql {
    SELECT * FROM "t a";
  }
} {1}

do_test tkt2450-3 {
  execsql {
    SELECT "t a".* FROM "t a";
  }
} {1}

do_test tkt2450-3 {
  execsql {
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES(2);
    SELECT * FROM "t a", t1;
  }
} {1 2}

finish_test
