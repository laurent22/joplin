
set testdir [file dirname $argv0]
source $testdir/tester.tcl

set ::testprefix tkt-c48d99d690

do_test 1.0 {
  execsql {
    CREATE TABLE t1(a, b);
    CREATE TABLE t2(a, b);
    INSERT INTO t1 VALUES('one'  , 1);
    INSERT INTO t1 VALUES('two'  , 5);
    INSERT INTO t1 VALUES('two'  , 2);
    INSERT INTO t1 VALUES('three', 3);
    PRAGMA count_changes = 1;
  }
} {}

do_test 1.1 {
  execsql { INSERT INTO t2 SELECT * FROM t1 }
} {4}

do_test 1.2 { execsql VACUUM } {}

finish_test
