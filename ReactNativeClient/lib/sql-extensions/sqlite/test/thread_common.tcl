# 2007 September 10
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
# $Id: thread_common.tcl,v 1.5 2009/03/26 14:48:07 danielk1977 Exp $

if {[info exists ::thread_procs]} {
  return 0
}

# The following script is sourced by every thread spawned using 
# [sqlthread spawn]:
set thread_procs {

  # Execute the supplied SQL using database handle $::DB.
  #
  proc execsql {sql} {

    set rc SQLITE_LOCKED
    while {$rc eq "SQLITE_LOCKED" 
        || $rc eq "SQLITE_BUSY" 
        || $rc eq "SQLITE_SCHEMA"} {
      set res [list]

      enter_db_mutex $::DB
      set err [catch {
        set ::STMT [sqlite3_prepare_v2 $::DB $sql -1 dummy_tail]
      } msg]

      if {$err == 0} {
        while {[set rc [sqlite3_step $::STMT]] eq "SQLITE_ROW"} {
          for {set i 0} {$i < [sqlite3_column_count $::STMT]} {incr i} {
            lappend res [sqlite3_column_text $::STMT 0]
          }
        }
        set rc [sqlite3_finalize $::STMT]
      } else {
        if {[lindex $msg 0]=="(6)"} {
          set rc SQLITE_LOCKED
        } else {
          set rc SQLITE_ERROR
        }
      }

      if {[string first locked [sqlite3_errmsg $::DB]]>=0} {
        set rc SQLITE_LOCKED
      }
      if {$rc ne "SQLITE_OK"} {
        set errtxt "$rc - [sqlite3_errmsg $::DB] (debug1)"
      }
      leave_db_mutex $::DB

      if {$rc eq "SQLITE_LOCKED" || $rc eq "SQLITE_BUSY"} {
        #sqlthread parent "puts \"thread [sqlthread id] is busy.  rc=$rc\""
        after 200
      } else {
        #sqlthread parent "puts \"thread [sqlthread id] ran $sql\""
      }
    }

    if {$rc ne "SQLITE_OK"} {
      error $errtxt
    }
    set res
  }

  proc do_test {name script result} {
    set res [eval $script]
    if {$res ne $result} {
      error "$name failed: expected \"$result\" got \"$res\""
    }
  }
}

proc thread_spawn {varname args} {
  sqlthread spawn $varname [join $args {;}]
}

# Return true if this build can run the multi-threaded tests.
#
proc run_thread_tests {{print_warning 0}} {
  ifcapable !mutex { 
    set zProblem "SQLite build is not threadsafe"
  }
  ifcapable mutex_noop { 
    set zProblem "SQLite build uses SQLITE_MUTEX_NOOP"
  }
  if {[info commands sqlthread] eq ""} {
    set zProblem "SQLite build is not threadsafe"
  }
  if {![info exists ::tcl_platform(threaded)]} {
    set zProblem "Linked against a non-threadsafe Tcl build"
  }
  if {[info exists zProblem]} {
    puts "WARNING: Multi-threaded tests skipped: $zProblem"
    return 0
  }
  set ::run_thread_tests_called 1
  return 1;
}

return 0

