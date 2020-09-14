

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
source $testdir/malloc_common.tcl
set ::testprefix fts4merge2

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

do_test 1.0 {
  fts3_build_db_1 1000
  faultsim_save_and_close
} {}

do_faultsim_test 1.1 -faults oom-* -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { INSERT INTO t1(t1) VALUES('merge=32,4') }
} -test {
  faultsim_test_result {0 {}} 
}

do_faultsim_test 1.2 -faults oom-t* -prep {
  if {$iFail<100} {set iFail 803}
  faultsim_restore_and_reopen
} -body {
  execsql { INSERT INTO t1(t1) VALUES('merge=1,2') }
  execsql { INSERT INTO t1(t1) VALUES('merge=1,2') }
} -test {
  faultsim_test_result {0 {}} 
}

finish_test
