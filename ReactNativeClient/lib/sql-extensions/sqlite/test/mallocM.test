# 2017 March 13
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Further OOM tests.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix mallocM

sqlite3_db_config_lookaside db 0 0 0

do_execsql_test 1.0 {
  CREATE TABLE t1(x);
}
do_faultsim_test 1 -faults oom* -body {
  execsql {
    SELECT 'abc' FROM ( SELECT 'xyz' FROM t1 WHERE (SELECT 1) )
  }
} -test {
  faultsim_test_result {0 {}}
}

do_execsql_test 2.0.1 { SELECT instr(x'', x'') }         {1}
do_execsql_test 2.0.2 { SELECT instr(x'12345678', x'') } {1}
do_execsql_test 2.0.3 { SELECT instr(x'', x'1234') }     {0}

do_faultsim_test 2.1 -faults oom* -body {
  execsql { SELECT instr (x'00', zeroblob(1)) }
} -test {
  faultsim_test_result {0 1}
}

do_faultsim_test 2.2 -faults oom* -body {
  execsql { SELECT instr (zeroblob(1), x'00') }
} -test {
  faultsim_test_result {0 1}
}

finish_test
