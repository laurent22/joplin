# 2013-11-21
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#
# Testing of function factoring and the SQLITE_DETERMINISTIC flag.
#
set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Verify that constant string expressions that get factored into initializing
# code are not reused between function parameters and other values in the
# VDBE program, as the function might have changed the encoding.
#
do_execsql_test func5-1.1 {
  PRAGMA encoding=UTF16le;
  CREATE TABLE t1(x,a,b,c);
  INSERT INTO t1 VALUES(1,'ab','cd',1);
  INSERT INTO t1 VALUES(2,'gh','ef',5);
  INSERT INTO t1 VALUES(3,'pqr','fuzzy',99);
  INSERT INTO t1 VALUES(4,'abcdefg','xy',22);
  INSERT INTO t1 VALUES(5,'shoe','mayer',2953);
  SELECT x FROM t1 WHERE c=instr('abcdefg',b) OR a='abcdefg' ORDER BY +x;
} {2 4}
do_execsql_test func5-1.2 {
  SELECT x FROM t1 WHERE a='abcdefg' OR c=instr('abcdefg',b) ORDER BY +x;
} {2 4}

# Verify that SQLITE_DETERMINISTIC functions get factored out of the
# evaluation loop whereas non-deterministic functions do not.  counter1()
# is marked as non-deterministic and so is not factored out of the loop,
# and it really is non-deterministic, returning a different result each
# time.  But counter2() is marked as deterministic, so it does get factored
# out of the loop.  counter2() has the same implementation as counter1(),
# returning a different result on each invocation, but because it is 
# only invoked once outside of the loop, it appears to return the same
# result multiple times.
#
do_execsql_test func5-2.1 {
  CREATE TABLE t2(x,y);
  INSERT INTO t2 VALUES(1,2),(3,4),(5,6),(7,8);
  SELECT x, y FROM t2 WHERE x+5=5+x ORDER BY +x;
} {1 2 3 4 5 6 7 8}
sqlite3_create_function db
do_execsql_test func5-2.2 {
  SELECT x, y FROM t2
   WHERE x+counter1('hello')=counter1('hello')+x
   ORDER BY +x;
} {}
set cvalue [db one {SELECT counter2('hello')+1}]
do_execsql_test func5-2.3 {
  SELECT x, y FROM t2
   WHERE x+counter2('hello')=$cvalue+x
   ORDER BY +x;
} {1 2 3 4 5 6 7 8}


finish_test
