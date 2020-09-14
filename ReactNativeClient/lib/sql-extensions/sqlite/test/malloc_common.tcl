# 2007 May 05
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
# This file contains common code used by many different malloc tests
# within the test suite.
#
# $Id: malloc_common.tcl,v 1.22 2008/09/23 16:41:30 danielk1977 Exp $

# If we did not compile with malloc testing enabled, then do nothing.
#
ifcapable builtin_test {
  set MEMDEBUG 1
} else {
  set MEMDEBUG 0
  return 0
}

# Transient and persistent OOM errors:
#
set FAULTSIM(oom-transient) [list          \
  -injectstart   {oom_injectstart 0}       \
  -injectstop    oom_injectstop            \
  -injecterrlist {{1 {out of memory}}}     \
]
set FAULTSIM(oom-persistent) [list         \
  -injectstart {oom_injectstart 1000000}   \
  -injectstop oom_injectstop               \
  -injecterrlist {{1 {out of memory}}}     \
]
  
# Transient and persistent IO errors:
#
set FAULTSIM(ioerr-transient) [list        \
  -injectstart   {ioerr_injectstart 0}     \
  -injectstop    ioerr_injectstop          \
  -injecterrlist {{1 {disk I/O error}}}    \
]
set FAULTSIM(ioerr-persistent) [list       \
  -injectstart   {ioerr_injectstart 1}     \
  -injectstop    ioerr_injectstop          \
  -injecterrlist {{1 {disk I/O error}}}    \
]

# SQLITE_FULL errors (always persistent):
#
set FAULTSIM(full) [list                   \
  -injectinstall   fullerr_injectinstall   \
  -injectstart     fullerr_injectstart     \
  -injectstop      fullerr_injectstop      \
  -injecterrlist   {{1 {database or disk is full}}} \
  -injectuninstall fullerr_injectuninstall \
]

# Transient and persistent SHM errors:
#
set FAULTSIM(shmerr-transient) [list       \
  -injectinstall   shmerr_injectinstall    \
  -injectstart     {shmerr_injectstart 0}  \
  -injectstop      shmerr_injectstop       \
  -injecterrlist   {{1 {disk I/O error}}}  \
  -injectuninstall shmerr_injectuninstall  \
]
set FAULTSIM(shmerr-persistent) [list      \
  -injectinstall   shmerr_injectinstall    \
  -injectstart     {shmerr_injectstart 1}  \
  -injectstop      shmerr_injectstop       \
  -injecterrlist   {{1 {disk I/O error}}}  \
  -injectuninstall shmerr_injectuninstall  \
]

# Transient and persistent CANTOPEN errors:
#
set FAULTSIM(cantopen-transient) [list       \
  -injectinstall   cantopen_injectinstall    \
  -injectstart     {cantopen_injectstart 0}  \
  -injectstop      cantopen_injectstop       \
  -injecterrlist   {{1 {unable to open database file}}}  \
  -injectuninstall cantopen_injectuninstall  \
]
set FAULTSIM(cantopen-persistent) [list      \
  -injectinstall   cantopen_injectinstall    \
  -injectstart     {cantopen_injectstart 1}  \
  -injectstop      cantopen_injectstop       \
  -injecterrlist   {{1 {unable to open database file}}}  \
  -injectuninstall cantopen_injectuninstall  \
]

set FAULTSIM(interrupt) [list                 \
  -injectinstall   interrupt_injectinstall    \
  -injectstart     interrupt_injectstart      \
  -injectstop      interrupt_injectstop       \
  -injecterrlist   {{1 interrupted} {1 interrupt}}        \
  -injectuninstall interrupt_injectuninstall  \
]



#--------------------------------------------------------------------------
# Usage do_faultsim_test NAME ?OPTIONS...? 
#
#     -faults           List of fault types to simulate.
#
#     -prep             Script to execute before -body.
#
#     -body             Script to execute (with fault injection).
#
#     -test             Script to execute after -body.
#
#     -install          Script to execute after faultsim -injectinstall
#
#     -uninstall        Script to execute after faultsim -uninjectinstall
#
proc do_faultsim_test {name args} {
  global FAULTSIM
  
  foreach n [array names FAULTSIM] {
    if {$n != "interrupt"} {lappend DEFAULT(-faults) $n}
  }
  set DEFAULT(-prep)          ""
  set DEFAULT(-body)          ""
  set DEFAULT(-test)          ""
  set DEFAULT(-install)       ""
  set DEFAULT(-uninstall)     ""
  set DEFAULT(-start)          1
  set DEFAULT(-end)            0

  fix_testname name

  array set O [array get DEFAULT]
  array set O $args
  foreach o [array names O] {
    if {[info exists DEFAULT($o)]==0} { error "unknown option: $o" }
  }

  set faultlist [list]
  foreach f $O(-faults) {
    set flist [array names FAULTSIM $f]
    if {[llength $flist]==0} { error "unknown fault: $f" }
    set faultlist [concat $faultlist $flist]
  }

  set testspec [list -prep $O(-prep) -body $O(-body) \
      -test $O(-test) -install $O(-install) -uninstall $O(-uninstall) \
      -start $O(-start) -end $O(-end)
  ]
  foreach f [lsort -unique $faultlist] {
    eval do_one_faultsim_test "$name-$f" $FAULTSIM($f) $testspec
  }
}


#-------------------------------------------------------------------------
# Procedures to save and restore the current file-system state:
#
#   faultsim_save
#   faultsim_restore
#   faultsim_save_and_close
#   faultsim_restore_and_reopen
#   faultsim_delete_and_reopen
#
proc faultsim_save {args} { uplevel db_save $args }
proc faultsim_save_and_close {args} { uplevel db_save_and_close $args }
proc faultsim_restore {args} { uplevel db_restore $args }
proc faultsim_restore_and_reopen {args} { 
  uplevel db_restore_and_reopen $args 
  sqlite3_extended_result_codes db 1
  sqlite3_db_config_lookaside db 0 0 0
}
proc faultsim_delete_and_reopen {args} {
  uplevel db_delete_and_reopen $args 
  sqlite3_extended_result_codes db 1
  sqlite3_db_config_lookaside db 0 0 0
}

proc faultsim_integrity_check {{db db}} {
  set ic [$db eval { PRAGMA integrity_check }]
  if {$ic != "ok"} { error "Integrity check: $ic" }
}


# The following procs are used as [do_one_faultsim_test] callbacks when 
# injecting OOM faults into test cases.
#
proc oom_injectstart {nRepeat iFail} {
  sqlite3_memdebug_fail [expr $iFail-1] -repeat $nRepeat
}
proc oom_injectstop {} {
  sqlite3_memdebug_fail -1
}

# The following procs are used as [do_one_faultsim_test] callbacks when 
# injecting IO error faults into test cases.
#
proc ioerr_injectstart {persist iFail} {
  set ::sqlite_io_error_persist $persist
  set ::sqlite_io_error_pending $iFail
}
proc ioerr_injectstop {} {
  set sv $::sqlite_io_error_hit
  set ::sqlite_io_error_persist 0
  set ::sqlite_io_error_pending 0
  set ::sqlite_io_error_hardhit 0
  set ::sqlite_io_error_hit     0
  set ::sqlite_io_error_pending 0
  return $sv
}

# The following procs are used as [do_one_faultsim_test] callbacks when 
# injecting shared-memory related error faults into test cases.
#
proc shmerr_injectinstall {} {
  testvfs shmfault -default true
  shmfault filter {xShmOpen xShmMap xShmLock}
}
proc shmerr_injectuninstall {} {
  catch {db  close}
  catch {db2 close}
  shmfault delete
}
proc shmerr_injectstart {persist iFail} {
  shmfault ioerr $iFail $persist
}
proc shmerr_injectstop {} {
  shmfault ioerr
}

# The following procs are used as [do_one_faultsim_test] callbacks when 
# injecting SQLITE_FULL error faults into test cases.
#
proc fullerr_injectinstall {} {
  testvfs shmfault -default true
}
proc fullerr_injectuninstall {} {
  catch {db  close}
  catch {db2 close}
  shmfault delete
}
proc fullerr_injectstart {iFail} {
  shmfault full $iFail 1
}
proc fullerr_injectstop {} {
  shmfault full
}

# The following procs are used as [do_one_faultsim_test] callbacks when 
# injecting SQLITE_CANTOPEN error faults into test cases.
#
proc cantopen_injectinstall {} {
  testvfs shmfault -default true
}
proc cantopen_injectuninstall {} {
  catch {db  close}
  catch {db2 close}
  shmfault delete
}
proc cantopen_injectstart {persist iFail} {
  shmfault cantopen $iFail $persist
}
proc cantopen_injectstop {} {
  shmfault cantopen
}

# The following procs are used as [do_one_faultsim_test] callbacks 
# when injecting SQLITE_INTERRUPT error faults into test cases.
#
proc interrupt_injectinstall {} {
}
proc interrupt_injectuninstall {} {
}
proc interrupt_injectstart {iFail} {
  set ::sqlite_interrupt_count $iFail
}
proc interrupt_injectstop {} {
  set res [expr $::sqlite_interrupt_count<=0]
  set ::sqlite_interrupt_count 0
  set res
}

# This command is not called directly. It is used by the 
# [faultsim_test_result] command created by [do_faultsim_test] and used
# by -test scripts.
#
proc faultsim_test_result_int {args} {
  upvar testrc testrc testresult testresult testnfail testnfail
  set t [list $testrc $testresult]
  set r $args
  if { ($testnfail==0 && $t != [lindex $r 0]) || [lsearch -exact $r $t]<0 } {
    error "nfail=$testnfail rc=$testrc result=$testresult list=$r"
  }
}

#--------------------------------------------------------------------------
# Usage do_one_faultsim_test NAME ?OPTIONS...? 
#
# The first argument, <test number>, is used as a prefix of the test names
# taken by tests executed by this command. Options are as follows. All
# options take a single argument.
#
#     -injectstart      Script to enable fault-injection.
#
#     -injectstop       Script to disable fault-injection.
#
#     -injecterrlist    List of generally acceptable test results (i.e. error
#                       messages). Example: [list {1 {out of memory}}]
#
#     -injectinstall
#
#     -injectuninstall
#
#     -prep             Script to execute before -body.
#
#     -body             Script to execute (with fault injection).
#
#     -test             Script to execute after -body.
#
#     -start            Index of first fault to inject (default 1)
#
proc do_one_faultsim_test {testname args} {

  set DEFAULT(-injectstart)     "expr"
  set DEFAULT(-injectstop)      "expr 0"
  set DEFAULT(-injecterrlist)   [list]
  set DEFAULT(-injectinstall)   ""
  set DEFAULT(-injectuninstall) ""
  set DEFAULT(-prep)            ""
  set DEFAULT(-body)            ""
  set DEFAULT(-test)            ""
  set DEFAULT(-install)         ""
  set DEFAULT(-uninstall)       ""
  set DEFAULT(-start)           1
  set DEFAULT(-end)             0

  array set O [array get DEFAULT]
  array set O $args
  foreach o [array names O] {
    if {[info exists DEFAULT($o)]==0} { error "unknown option: $o" }
  }

  proc faultsim_test_proc {testrc testresult testnfail} $O(-test)
  proc faultsim_test_result {args} "
    uplevel faultsim_test_result_int \$args [list $O(-injecterrlist)]
  "

  eval $O(-injectinstall)
  eval $O(-install)

  set stop 0
  for {set iFail $O(-start)}                        \
      {!$stop && ($O(-end)==0 || $iFail<=$O(-end))} \
      {incr iFail}                                  \
  {

    # Evaluate the -prep script.
    #
    eval $O(-prep)

    # Start the fault-injection. Run the -body script. Stop the fault
    # injection. Local var $nfail is set to the total number of faults 
    # injected into the system this trial.
    #
    eval $O(-injectstart) $iFail
    set rc [catch $O(-body) res]
    set nfail [eval $O(-injectstop)]

    # Run the -test script. If it throws no error, consider this trial
    # sucessful. If it does throw an error, cause a [do_test] test to
    # fail (and print out the unexpected exception thrown by the -test
    # script at the same time).
    #
    set rc [catch [list faultsim_test_proc $rc $res $nfail] res]
    if {$rc == 0} {set res ok}
    do_test $testname.$iFail [list list $rc $res] {0 ok}

    # If no faults where injected this trial, don't bother running
    # any more. This test is finished.
    #
    if {$nfail==0} { set stop 1 }
  }

  eval $O(-uninstall)
  eval $O(-injectuninstall)
}

# Usage: do_malloc_test <test number> <options...>
#
# The first argument, <test number>, is an integer used to name the
# tests executed by this proc. Options are as follows:
#
#     -tclprep          TCL script to run to prepare test.
#     -sqlprep          SQL script to run to prepare test.
#     -tclbody          TCL script to run with malloc failure simulation.
#     -sqlbody          TCL script to run with malloc failure simulation.
#     -cleanup          TCL script to run after the test.
#
# This command runs a series of tests to verify SQLite's ability
# to handle an out-of-memory condition gracefully. It is assumed
# that if this condition occurs a malloc() call will return a
# NULL pointer. Linux, for example, doesn't do that by default. See
# the "BUGS" section of malloc(3).
#
# Each iteration of a loop, the TCL commands in any argument passed
# to the -tclbody switch, followed by the SQL commands in any argument
# passed to the -sqlbody switch are executed. Each iteration the
# Nth call to sqliteMalloc() is made to fail, where N is increased
# each time the loop runs starting from 1. When all commands execute
# successfully, the loop ends.
#
proc do_malloc_test {tn args} {
  array unset ::mallocopts 
  array set ::mallocopts $args

  if {[string is integer $tn]} {
    set tn malloc-$tn
    catch { set tn $::testprefix-$tn }
  }
  if {[info exists ::mallocopts(-start)]} {
    set start $::mallocopts(-start)
  } else {
    set start 0
  }
  if {[info exists ::mallocopts(-end)]} {
    set end $::mallocopts(-end)
  } else {
    set end 50000
  }
  save_prng_state

  foreach ::iRepeat {0 10000000} {
    set ::go 1
    for {set ::n $start} {$::go && $::n <= $end} {incr ::n} {

      # If $::iRepeat is 0, then the malloc() failure is transient - it
      # fails and then subsequent calls succeed. If $::iRepeat is 1, 
      # then the failure is persistent - once malloc() fails it keeps
      # failing.
      #
      set zRepeat "transient"
      if {$::iRepeat} {set zRepeat "persistent"}
      restore_prng_state
      foreach file [glob -nocomplain test.db-mj*] {forcedelete $file}

      do_test ${tn}.${zRepeat}.${::n} {
  
        # Remove all traces of database files test.db and test2.db 
        # from the file-system. Then open (empty database) "test.db" 
        # with the handle [db].
        # 
        catch {db close} 
        catch {db2 close} 
        forcedelete test.db
        forcedelete test.db-journal
        forcedelete test.db-wal
        forcedelete test2.db
        forcedelete test2.db-journal
        forcedelete test2.db-wal
        if {[info exists ::mallocopts(-testdb)]} {
          copy_file $::mallocopts(-testdb) test.db
        }
        catch { sqlite3 db test.db }
        if {[info commands db] ne ""} {
          sqlite3_extended_result_codes db 1
        }
        sqlite3_db_config_lookaside db 0 0 0
  
        # Execute any -tclprep and -sqlprep scripts.
        #
        if {[info exists ::mallocopts(-tclprep)]} {
          eval $::mallocopts(-tclprep)
        }
        if {[info exists ::mallocopts(-sqlprep)]} {
          execsql $::mallocopts(-sqlprep)
        }
  
        # Now set the ${::n}th malloc() to fail and execute the -tclbody 
        # and -sqlbody scripts.
        #
        sqlite3_memdebug_fail $::n -repeat $::iRepeat
        set ::mallocbody {}
        if {[info exists ::mallocopts(-tclbody)]} {
          append ::mallocbody "$::mallocopts(-tclbody)\n"
        }
        if {[info exists ::mallocopts(-sqlbody)]} {
          append ::mallocbody "db eval {$::mallocopts(-sqlbody)}"
        }

        # The following block sets local variables as follows:
        #
        #     isFail  - True if an error (any error) was reported by sqlite.
        #     nFail   - The total number of simulated malloc() failures.
        #     nBenign - The number of benign simulated malloc() failures.
        #
        set isFail [catch $::mallocbody msg]
        set nFail [sqlite3_memdebug_fail -1 -benigncnt nBenign]
        # puts -nonewline " (isFail=$isFail nFail=$nFail nBenign=$nBenign) "

        # If one or more mallocs failed, run this loop body again.
        #
        set go [expr {$nFail>0}]

        if {($nFail-$nBenign)==0} {
          if {$isFail} {
            set v2 $msg
          } else {
            set isFail 1
            set v2 1
          }
        } elseif {!$isFail} {
          set v2 $msg
        } elseif {
          [info command db]=="" || 
          [db errorcode]==7 ||
          $msg=="out of memory"
        } {
          set v2 1
        } else {
          set v2 $msg
          puts [db errorcode]
        }
        lappend isFail $v2
      } {1 1}
  
      if {[info exists ::mallocopts(-cleanup)]} {
        catch [list uplevel #0 $::mallocopts(-cleanup)] msg
      }
    }
  }
  unset ::mallocopts
  sqlite3_memdebug_fail -1
}


#-------------------------------------------------------------------------
# This proc is used to test a single SELECT statement. Parameter $name is
# passed a name for the test case (i.e. "fts3_malloc-1.4.1") and parameter
# $sql is passed the text of the SELECT statement. Parameter $result is
# set to the expected output if the SELECT statement is successfully
# executed using [db eval].
#
# Example:
#
#   do_select_test testcase-1.1 "SELECT 1+1, 1+2" {1 2}
#
# If global variable DO_MALLOC_TEST is set to a non-zero value, or if
# it is not defined at all, then OOM testing is performed on the SELECT
# statement. Each OOM test case is said to pass if either (a) executing
# the SELECT statement succeeds and the results match those specified
# by parameter $result, or (b) TCL throws an "out of memory" error.
#
# If DO_MALLOC_TEST is defined and set to zero, then the SELECT statement
# is executed just once. In this case the test case passes if the results
# match the expected results passed via parameter $result.
#
proc do_select_test {name sql result} {
  uplevel [list doPassiveTest 0 $name $sql [list 0 [list {*}$result]]]
}

proc do_restart_select_test {name sql result} {
  uplevel [list doPassiveTest 1 $name $sql [list 0 $result]]
}

proc do_error_test {name sql error} {
  uplevel [list doPassiveTest 0 $name $sql [list 1 $error]]
}

proc doPassiveTest {isRestart name sql catchres} {
  if {![info exists ::DO_MALLOC_TEST]} { set ::DO_MALLOC_TEST 1 }

  if {[info exists ::testprefix] 
   && [string is integer [string range $name 0 0]]
  } {
    set name $::testprefix.$name
  }

  switch $::DO_MALLOC_TEST {
    0 { # No malloc failures.
      do_test $name [list set {} [uplevel [list catchsql $sql]]] $catchres
      return
    }
    1 { # Simulate transient failures.
      set nRepeat 1
      set zName "transient"
      set nStartLimit 100000
      set nBackup 1
    }
    2 { # Simulate persistent failures.
      set nRepeat 1
      set zName "persistent"
      set nStartLimit 100000
      set nBackup 1
    }
    3 { # Simulate transient failures with extra brute force.
      set nRepeat 100000
      set zName "ridiculous"
      set nStartLimit 1
      set nBackup 10
    }
  }

  # The set of acceptable results from running [catchsql $sql].
  #
  set answers [list {1 {out of memory}} $catchres]
  set str [join $answers " OR "]

  set nFail 1
  for {set iLimit $nStartLimit} {$nFail} {incr iLimit} {
    for {set iFail 1} {$nFail && $iFail<=$iLimit} {incr iFail} {
      for {set iTest 0} {$iTest<$nBackup && ($iFail-$iTest)>0} {incr iTest} {

        if {$isRestart} { sqlite3 db test.db }

        sqlite3_memdebug_fail [expr $iFail-$iTest] -repeat $nRepeat
        set res [uplevel [list catchsql $sql]]
        if {[lsearch -exact $answers $res]>=0} { set res $str }
        set testname "$name.$zName.$iFail"
        do_test "$name.$zName.$iLimit.$iFail" [list set {} $res] $str

        set nFail [sqlite3_memdebug_fail -1 -benigncnt nBenign]
      }
    }
  }
}


#-------------------------------------------------------------------------
# Test a single write to the database. In this case a  "write" is a 
# DELETE, UPDATE or INSERT statement.
#
# If OOM testing is performed, there are several acceptable outcomes:
#
#   1) The write succeeds. No error is returned.
#
#   2) An "out of memory" exception is thrown and:
#
#     a) The statement has no effect, OR
#     b) The current transaction is rolled back, OR
#     c) The statement succeeds. This can only happen if the connection
#        is in auto-commit mode (after the statement is executed, so this
#        includes COMMIT statements).
#
# If the write operation eventually succeeds, zero is returned. If a
# transaction is rolled back, non-zero is returned.
#
# Parameter $name is the name to use for the test case (or test cases).
# The second parameter, $tbl, should be the name of the database table
# being modified. Parameter $sql contains the SQL statement to test.
#
proc do_write_test {name tbl sql} {
  if {![info exists ::DO_MALLOC_TEST]} { set ::DO_MALLOC_TEST 1 }

  # Figure out an statement to get a checksum for table $tbl.
  db eval "SELECT * FROM $tbl" V break
  set cksumsql "SELECT md5sum([join [concat rowid $V(*)] ,]) FROM $tbl"

  # Calculate the initial table checksum.
  set cksum1 [db one $cksumsql]

  if {$::DO_MALLOC_TEST } {
    set answers [list {1 {out of memory}} {0 {}}]
    if {$::DO_MALLOC_TEST==1} {
      set modes {100000 persistent}
    } else {
      set modes {1 transient}
    }
  } else {
    set answers [list {0 {}}]
    set modes [list 0 nofail]
  }
  set str [join $answers " OR "]

  foreach {nRepeat zName} $modes {
    for {set iFail 1} 1 {incr iFail} {
      if {$::DO_MALLOC_TEST} {sqlite3_memdebug_fail $iFail -repeat $nRepeat}

      set res [uplevel [list catchsql $sql]]
      set nFail [sqlite3_memdebug_fail -1 -benigncnt nBenign]
      if {$nFail==0} {
        do_test $name.$zName.$iFail [list set {} $res] {0 {}}
        return
      } else {
        if {[lsearch $answers $res]>=0} {
          set res $str
        }
        do_test $name.$zName.$iFail [list set {} $res] $str
        set cksum2 [db one $cksumsql]
        if {$cksum1 != $cksum2} return
      }
    }
  }
}
