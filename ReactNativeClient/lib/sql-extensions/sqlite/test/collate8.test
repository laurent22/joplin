#
# 2007 June 20
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
# focus of this script is making sure collations pass through the
# unary + operator.
#
# 2015-02-09:  Added tests to make sure COLLATE passes through function
# calls.  Ticket [ca0d20b6cdddec5e81b8d66f89c46a5583b5f6f6].
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test collate8-1.1 {
  execsql {
    CREATE TABLE t1(a TEXT COLLATE nocase);
    INSERT INTO t1 VALUES('aaa');
    INSERT INTO t1 VALUES('BBB');
    INSERT INTO t1 VALUES('ccc');
    INSERT INTO t1 VALUES('DDD');
    SELECT a FROM t1 ORDER BY a;
  }
} {aaa BBB ccc DDD}
do_test collate8-1.2 {
  execsql {
    SELECT rowid FROM t1 WHERE a<'ccc' ORDER BY 1
  }
} {1 2}
do_test collate8-1.3 {
  execsql {
    SELECT rowid FROM t1 WHERE a<'ccc' COLLATE binary ORDER BY 1
  }
} {1 2 4}
do_test collate8-1.4 {
  execsql {
    SELECT rowid FROM t1 WHERE +a<'ccc' ORDER BY 1
  }
} {1 2}
do_test collate8-1.5 {
  execsql {
    SELECT a FROM t1 ORDER BY +a
  }
} {aaa BBB ccc DDD}
do_test collate8-1.11 {
  execsql {
    SELECT a AS x FROM t1 ORDER BY "x";
  }
} {aaa BBB ccc DDD}
do_test collate8-1.12 {
  execsql {
    SELECT a AS x FROM t1 WHERE x<'ccc' ORDER BY 1
  }
} {aaa BBB}
do_test collate8-1.13 {
  execsql {
    SELECT a AS x FROM t1 WHERE x<'ccc' COLLATE binary ORDER BY [x]
  }
} {aaa BBB DDD}
do_test collate8-1.14 {
  execsql {
    SELECT a AS x FROM t1 WHERE +x<'ccc' ORDER BY 1
  }
} {aaa BBB}
do_test collate8-1.15 {
  execsql {
    SELECT a AS x FROM t1 ORDER BY +x
  }
} {aaa BBB ccc DDD}


# When a result-set column is aliased into a WHERE clause, make sure the
# collating sequence logic works correctly.
#
do_test collate8-2.1 {
  execsql {
    CREATE TABLE t2(a);
    INSERT INTO t2 VALUES('abc');
    INSERT INTO t2 VALUES('ABC');
    SELECT a AS x FROM t2 WHERE x='abc';
  }
} {abc}
do_test collate8-2.2 {
  execsql {
    SELECT a AS x FROM t2 WHERE x='abc' COLLATE nocase;
  }
} {abc ABC}
do_test collate8-2.3 {
  execsql {
    SELECT a AS x FROM t2 WHERE (x COLLATE nocase)='abc';
  }
} {abc ABC}
do_test collate8-2.4 {
  execsql {
    SELECT a COLLATE nocase AS x FROM t2 WHERE x='abc';
  }
} {abc ABC}
do_test collate8-2.5 {
  execsql {
    SELECT a COLLATE nocase AS x FROM t2 WHERE (x COLLATE binary)='abc';
  }
} {abc}
do_test collate8-2.6 {
  execsql {
    SELECT a COLLATE nocase AS x FROM t2 WHERE x='abc' COLLATE binary;
  }
} {abc ABC}
do_test collate8-2.7 {
  execsql {
    SELECT * FROM t2 WHERE (a COLLATE nocase)='abc' COLLATE binary;
  }
} {abc ABC}
do_test collate8-2.8 {
  execsql {
    SELECT a COLLATE nocase AS x FROM t2 WHERE 'abc'=x COLLATE binary;
  }
} {abc}

# Make sure the COLLATE operator perculates up through function calls
# and other Expr structures that use the Expr.x.pList field.
#
do_execsql_test collate8-3.1 {
  SELECT 'abc'==('ABC'||'') COLLATE nocase;
  SELECT 'abc'==('ABC'||'' COLLATE nocase);
  SELECT 'abc'==('ABC'||('' COLLATE nocase));
  SELECT 'abc'==('ABC'||upper('' COLLATE nocase));
} {1 1 1 1}
do_execsql_test collate8-3.2 {
  SELECT 'abc'==('ABC'||max('' COLLATE nocase,'' COLLATE binary));
} {1}

# The COLLATE binary is on the left and so takes precedence
do_execsql_test collate8-3.3 {
  SELECT 'abc'==('ABC'||max('' COLLATE binary,'' COLLATE nocase));
} {0}

do_execsql_test collate8-3.4 {
  SELECT 'abc'==('ABC'||CASE WHEN 1-1=2 THEN '' COLLATE nocase
                                        ELSE '' COLLATE binary END);
  SELECT 'abc'==('ABC'||CASE WHEN 1+1=2 THEN '' COLLATE nocase
                                        ELSE '' COLLATE binary END);
} {1 1}
do_execsql_test collate8-3.5 {
  SELECT 'abc'==('ABC'||CASE WHEN 1=2 THEN '' COLLATE binary
                                      ELSE '' COLLATE nocase END);
} {0}


finish_test
