# 2014 June 26
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
# This file implements tests to verify that ticket [9a8b09f8e6] has been
# fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-9a8b09f8e6

do_test 1.1 {
  execsql {
    CREATE TABLE t1(x TEXT);
    INSERT INTO t1 VALUES('1');
  }
} {}

do_test 1.2 {
  execsql {
    CREATE TABLE t2(x INTEGER);
    INSERT INTO t2 VALUES(1);
  }
} {}

do_test 1.3 {
  execsql {
    CREATE TABLE t3(x REAL);
    INSERT INTO t3 VALUES(1.0);
  }
} {}

do_test 1.4 {
  execsql {
    CREATE TABLE t4(x REAL);
    INSERT INTO t4 VALUES(1.11);
  }
} {}

do_test 1.5 {
  execsql {
    CREATE TABLE t5(x, y);
    INSERT INTO t5 VALUES('1', 'one');
    INSERT INTO t5 VALUES(1, 'two');
    INSERT INTO t5 VALUES('1.0', 'three');
    INSERT INTO t5 VALUES(1.0, 'four');
  }
} {}

do_test 2.1 {
  execsql {
    SELECT x FROM t1 WHERE x IN (1);
  }
} {1}

do_test 2.2 {
  execsql {
    SELECT x FROM t1 WHERE x IN (1.0);
  }
} {}

do_test 2.3 {
  execsql {
    SELECT x FROM t1 WHERE x IN ('1');
  }
} {1}

do_test 2.4 {
  execsql {
    SELECT x FROM t1 WHERE x IN ('1.0');
  }
} {}

do_test 2.5 {
  execsql {
    SELECT x FROM t1 WHERE 1 IN (x);
  }
} {}

do_test 2.6 {
  execsql {
    SELECT x FROM t1 WHERE 1.0 IN (x);
  }
} {}

do_test 2.7 {
  execsql {
    SELECT x FROM t1 WHERE '1' IN (x);
  }
} {1}

do_test 2.8 {
  execsql {
    SELECT x FROM t1 WHERE '1.0' IN (x);
  }
} {}

do_test 3.1 {
  execsql {
    SELECT x FROM t2 WHERE x IN (1);
  }
} {1}

do_test 3.2 {
  execsql {
    SELECT x FROM t2 WHERE x IN (1.0);
  }
} {1}

do_test 3.3 {
  execsql {
    SELECT x FROM t2 WHERE x IN ('1');
  }
} {1}

do_test 3.4 {
  execsql {
    SELECT x FROM t2 WHERE x IN ('1.0');
  }
} {1}

do_test 3.5 {
  execsql {
    SELECT x FROM t2 WHERE 1 IN (x);
  }
} {1}

do_test 3.6 {
  execsql {
    SELECT x FROM t2 WHERE 1.0 IN (x);
  }
} {1}

do_test 3.7 {
  execsql {
    SELECT x FROM t2 WHERE '1' IN (x);
  }
} {}

do_test 3.8 {
  execsql {
    SELECT x FROM t2 WHERE '1.0' IN (x);
  }
} {}

do_test 4.1 {
  execsql {
    SELECT x FROM t3 WHERE x IN (1);
  }
} {1.0}

do_test 4.2 {
  execsql {
    SELECT x FROM t3 WHERE x IN (1.0);
  }
} {1.0}

do_test 4.3 {
  execsql {
    SELECT x FROM t3 WHERE x IN ('1');
  }
} {1.0}

do_test 4.4 {
  execsql {
    SELECT x FROM t3 WHERE x IN ('1.0');
  }
} {1.0}

do_test 4.5 {
  execsql {
    SELECT x FROM t3 WHERE 1 IN (x);
  }
} {1.0}

do_test 4.6 {
  execsql {
    SELECT x FROM t3 WHERE 1.0 IN (x);
  }
} {1.0}

do_test 4.7 {
  execsql {
    SELECT x FROM t3 WHERE '1' IN (x);
  }
} {}

do_test 4.8 {
  execsql {
    SELECT x FROM t3 WHERE '1.0' IN (x);
  }
} {}

do_test 5.1 {
  execsql {
    SELECT x FROM t4 WHERE x IN (1);
  }
} {}

do_test 5.2 {
  execsql {
    SELECT x FROM t4 WHERE x IN (1.0);
  }
} {}

do_test 5.3 {
  execsql {
    SELECT x FROM t4 WHERE x IN ('1');
  }
} {}

do_test 5.4 {
  execsql {
    SELECT x FROM t4 WHERE x IN ('1.0');
  }
} {}

do_test 5.5 {
  execsql {
    SELECT x FROM t4 WHERE x IN (1.11);
  }
} {1.11}

do_test 5.6 {
  execsql {
    SELECT x FROM t4 WHERE x IN ('1.11');
  }
} {1.11}

do_test 5.7 {
  execsql {
    SELECT x FROM t4 WHERE 1 IN (x);
  }
} {}

do_test 5.8 {
  execsql {
    SELECT x FROM t4 WHERE 1.0 IN (x);
  }
} {}

do_test 5.9 {
  execsql {
    SELECT x FROM t4 WHERE '1' IN (x);
  }
} {}

do_test 5.10 {
  execsql {
    SELECT x FROM t4 WHERE '1.0' IN (x);
  }
} {}

do_test 5.11 {
  execsql {
    SELECT x FROM t4 WHERE 1.11 IN (x);
  }
} {1.11}

do_test 5.12 {
  execsql {
    SELECT x FROM t4 WHERE '1.11' IN (x);
  }
} {}

do_test 6.1 {
  execsql {
    SELECT x, y FROM t5 WHERE x IN (1);
  }
} {1 two 1.0 four}

do_test 6.2 {
  execsql {
    SELECT x, y FROM t5 WHERE x IN (1.0);
  }
} {1 two 1.0 four}

do_test 6.3 {
  execsql {
    SELECT x, y FROM t5 WHERE x IN ('1');
  }
} {1 one}

do_test 6.4 {
  execsql {
    SELECT x, y FROM t5 WHERE x IN ('1.0');
  }
} {1.0 three}

do_test 6.5 {
  execsql {
    SELECT x, y FROM t5 WHERE 1 IN (x);
  }
} {1 two 1.0 four}

do_test 6.6 {
  execsql {
    SELECT x, y FROM t5 WHERE 1.0 IN (x);
  }
} {1 two 1.0 four}

do_test 6.7 {
  execsql {
    SELECT x, y FROM t5 WHERE '1' IN (x);
  }
} {1 one}

do_test 6.8 {
  execsql {
    SELECT x, y FROM t5 WHERE '1.0' IN (x);
  }
} {1.0 three}

finish_test
