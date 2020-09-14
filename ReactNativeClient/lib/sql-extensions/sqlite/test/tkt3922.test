# 2009 June 17
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# $Id: tkt3922.test,v 1.2 2009/06/26 14:17:47 shane Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

if {[working_64bit_int]} {
  do_test tkt3922.1 {
    execsql {
      CREATE TABLE t1(a NUMBER);
      INSERT INTO t1 VALUES('-9223372036854775808');
      SELECT a, typeof(a) FROM t1;
    }
  } {-9223372036854775808 integer}
} else {
  # this alternate version of tkt3922.1 doesn't
  # really test the same thing as the original, 
  # but is needed to create the table and 
  # provided simply as a place holder for 
  # platforms without working 64bit support.
  do_test tkt3922.1 {
    execsql {
      CREATE TABLE t1(a NUMBER);
      INSERT INTO t1 VALUES('-1');
      SELECT a, typeof(a) FROM t1;
    }
  } {-1 integer}
}
do_realnum_test tkt3922.2 {
  execsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES('-9223372036854775809');
    SELECT a, typeof(a) FROM t1;
  }
} {-9.22337203685478e+18 real}
do_realnum_test tkt3922.3 {
  execsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES('-9223372036854776832');
    SELECT a, typeof(a) FROM t1;
  }
} {-9.22337203685478e+18 real}
do_realnum_test tkt3922.4 {
  execsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES('-9223372036854776833');
    SELECT a, typeof(a) FROM t1;
  }
} {-9.22337203685478e+18 real}
if {[working_64bit_int]} {
  do_test tkt3922.5 {
    execsql {
      DELETE FROM t1;
      INSERT INTO t1 VALUES('9223372036854775807');
      SELECT a, typeof(a) FROM t1;
    }
  } {9223372036854775807 integer}
} else {
  # this alternate version of tkt3922.5 doesn't
  # really test the same thing as the original, 
  # but provided simply as a place holder for 
  # platforms without working 64bit support.
  do_test tkt3922.5 {
    execsql {
      DELETE FROM t1;
      INSERT INTO t1 VALUES('1');
      SELECT a, typeof(a) FROM t1;
    }
  } {1 integer}
}
do_realnum_test tkt3922.6 {
  execsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES('9223372036854775808');
    SELECT a, typeof(a) FROM t1;
  }
} {9.22337203685478e+18 real}

finish_test
