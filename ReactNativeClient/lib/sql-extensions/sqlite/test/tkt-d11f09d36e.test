# 2010 June 26
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
# Test that the bug reported by ticket d11f09d36e7cb0821e01f4 has
# been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

set a_string_counter 1
proc a_string {n} {
  global a_string_counter
  incr a_string_counter
  string range [string repeat "${a_string_counter}." $n] 1 $n
}
db func a_string a_string

do_test tkt-d11f09d36e.1 {
  execsql {
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10;
    CREATE TABLE t1(x, y, UNIQUE(x, y));
    BEGIN;
  }
  for {set i 0} {$i < 10000} {incr i} {
    execsql { INSERT INTO t1 VALUES($i, $i) }
  }
  execsql COMMIT
} {}
do_test tkt-d11f09d36e.2 {
  execsql {
    BEGIN;
      UPDATE t1 set x = x+10000;
    ROLLBACK;
  }
} {}
do_test tkt-d11f09d36e.3 {
  execsql { PRAGMA integrity_check }
} {ok}
do_test tkt-d11f09d36e.4 {
  execsql {
    SAVEPOINT tr;
      UPDATE t1 set x = x+10000;
    ROLLBACK TO tr;
    RELEASE tr;
  }
} {}
do_test tkt-d11f09d36e.5 {
  execsql { PRAGMA integrity_check }
} {ok}

finish_test
