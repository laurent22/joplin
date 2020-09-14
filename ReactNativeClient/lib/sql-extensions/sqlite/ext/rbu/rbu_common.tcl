# 2015 Aug 8
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

if {![info exists testdir]} {
  set testdir [file join [file dirname [info script]] .. .. test]
}
source $testdir/tester.tcl

proc check_prestep_state {target state} {
  set oal_exists [file exists $target-oal]
  set wal_exists [file exists $target-wal]
  set progress [rbu progress]

  if {($progress==0 && $state!="oal" && $state!="done")
   || ($oal_exists && $wal_exists)
   || ($progress>0 && $state=="oal" && (!$oal_exists || $wal_exists))
   || ($state=="move" && (!$oal_exists || $wal_exists))
   || ($state=="checkpoint" && ($oal_exists || !$wal_exists))
   || ($state=="done" && ($oal_exists && $progress!=0))
  } {
    error "B: state=$state progress=$progress oal=$oal_exists wal=$wal_exists"
  }
}

proc check_poststep_state {rc target state} {
  if {$rc=="SQLITE_OK" || $rc=="SQLITE_DONE"} {
    set oal_exists [file exists $target-oal]
    set wal_exists [file exists $target-wal]
    if {$state=="move" && ($oal_exists || !$wal_exists)} {
      error "A: state=$state progress=$progress oal=$oal_exists wal=$wal_exists"
    }
  }
}

# Run the RBU in file $rbu on target database $target until completion.
#
proc run_rbu {target rbu} {
  sqlite3rbu rbu $target $rbu
  while 1 {
    set state [rbu state]

    check_prestep_state $target $state
    set rc [rbu step]
    check_poststep_state $rc $target $state

    if {$rc!="SQLITE_OK"} break
  }
  rbu close
}

proc step_rbu {target rbu} {
  while 1 {
    sqlite3rbu rbu $target $rbu
    set state [rbu state]
    check_prestep_state $target $state
    set rc [rbu step]
    check_poststep_state $rc $target $state
    rbu close
    if {$rc != "SQLITE_OK"} break
  }
  set rc
}

proc step_rbu_legacy {target rbu} {
  while 1 {
    sqlite3rbu rbu $target $rbu
    set state [rbu state]
    check_prestep_state $target $state
    set rc [rbu step]
    check_poststep_state $rc $target $state
    rbu close
    if {$rc != "SQLITE_OK"} break
    sqlite3 tmpdb $rbu
    tmpdb eval { DELETE FROM rbu_state WHERE k==10 }
    tmpdb close
  }
  set rc
}

proc do_rbu_vacuum_test {tn step {statedb state.db}} {
  forcedelete $statedb
  if {$statedb=="" && $step==1} breakpoint
  uplevel [list do_test $tn.1 [string map [list %state% $statedb %step% $step] {
    if {%step%==0} { sqlite3rbu_vacuum rbu test.db {%state%}}
    while 1 {
      if {%step%==1} { sqlite3rbu_vacuum rbu test.db {%state%}}
      set state [rbu state]
      check_prestep_state test.db $state
      set rc [rbu step]
      check_poststep_state $rc test.db $state
      if {$rc!="SQLITE_OK"} break
      if {%step%==1} { rbu close }
    }
    rbu close
  }] {SQLITE_DONE}]

  uplevel [list do_execsql_test $tn.2 {
    PRAGMA integrity_check
  } ok]
}

