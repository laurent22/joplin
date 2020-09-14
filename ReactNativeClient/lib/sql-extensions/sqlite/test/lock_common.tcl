# 2010 April 14
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file contains code used by several different test scripts. The
# code in this file allows testfixture to control another process (or
# processes) to test locking.
#

proc do_multiclient_test {varname script} {

  foreach {tn code} [list 1 {
    if {[info exists ::G(valgrind)]} { db close ; continue }
    set ::code2_chan [launch_testfixture]
    set ::code3_chan [launch_testfixture]
    proc code2 {tcl} { testfixture $::code2_chan $tcl }
    proc code3 {tcl} { testfixture $::code3_chan $tcl }
  } 2 {
    proc code2 {tcl} { uplevel #0 $tcl }
    proc code3 {tcl} { uplevel #0 $tcl }
  }] {
    # Do not run multi-process tests with the unix-excl VFS.
    #
    if {$tn==1 && [permutation]=="unix-excl"} continue

    faultsim_delete_and_reopen

    proc code1 {tcl} { uplevel #0 $tcl }
  
    # Open connections [db2] and [db3]. Depending on which iteration this
    # is, the connections may be created in this interpreter, or in 
    # interpreters running in other OS processes. As such, the [db2] and [db3]
    # commands should only be accessed within [code2] and [code3] blocks,
    # respectively.
    #
    eval $code
    code2 { sqlite3 db2 test.db }
    code3 { sqlite3 db3 test.db }
    
    # Shorthand commands. Execute SQL using database connection [db2] or 
    # [db3]. Return the results.
    #
    proc sql1 {sql} { db eval $sql }
    proc sql2 {sql} { code2 [list db2 eval $sql] }
    proc sql3 {sql} { code3 [list db3 eval $sql] }
  
    proc csql1 {sql} { list [catch { sql1 $sql } msg] $msg }
    proc csql2 {sql} { list [catch { sql2 $sql } msg] $msg }
    proc csql3 {sql} { list [catch { sql3 $sql } msg] $msg }

    uplevel set $varname $tn
    uplevel $script

    catch { code2 { db2 close } }
    catch { code3 { db3 close } }
    catch { close $::code2_chan }
    catch { close $::code3_chan }
    catch { db close }
  }
}

# Launch another testfixture process to be controlled by this one. A
# channel name is returned that may be passed as the first argument to proc
# 'testfixture' to execute a command. The child testfixture process is shut
# down by closing the channel.
proc launch_testfixture {{prg ""}} {
  write_main_loop
  if {$prg eq ""} { set prg [info nameofexec] }
  if {$prg eq ""} { set prg testfixture }
  if {[file tail $prg]==$prg} { set prg [file join . $prg] }
  set chan [open "|$prg tf_main.tcl" r+]
  fconfigure $chan -buffering line
  set rc [catch { 
    testfixture $chan "sqlite3_test_control_pending_byte $::sqlite_pending_byte"
  }]
  if {$rc} {
    testfixture $chan "set ::sqlite_pending_byte $::sqlite_pending_byte"
  }
  return $chan
}

# Execute a command in a child testfixture process, connected by two-way
# channel $chan. Return the result of the command, or an error message.
#
proc testfixture {chan cmd args} {

  if {[llength $args] == 0} {
    fconfigure $chan -blocking 1
    puts $chan $cmd
    puts $chan OVER

    set r ""
    while { 1 } {
      set line [gets $chan]
      if { $line == "OVER" } { 
        set res [lindex $r 1]
        if { [lindex $r 0] } { error $res }
        return $res
      }
      if {[eof $chan]} {
        return "ERROR: Child process hung up"
      }
      append r $line
    }
    return $r
  } else {
    set ::tfnb($chan) ""
    fconfigure $chan -blocking 0 -buffering none
    puts $chan $cmd
    puts $chan OVER
    fileevent $chan readable [list testfixture_script_cb $chan [lindex $args 0]]
    return ""
  }
}

proc testfixture_script_cb {chan script} {
  if {[eof $chan]} {
    append ::tfnb($chan) "ERROR: Child process hung up"
    set line "OVER"
  } else {
    set line [gets $chan]
  }

  if { $line == "OVER" } {
    uplevel #0 $script [list [lindex $::tfnb($chan) 1]]
    unset ::tfnb($chan)
    fileevent $chan readable ""
  } else {
    append ::tfnb($chan) $line
  }
}

proc testfixture_nb_cb {varname chan} {
  if {[eof $chan]} {
    append ::tfnb($chan) "ERROR: Child process hung up"
    set line "OVER"
  } else {
    set line [gets $chan]
  }

  if { $line == "OVER" } {
    set $varname [lindex $::tfnb($chan) 1]
    unset ::tfnb($chan)
    close $chan
  } else {
    append ::tfnb($chan) $line
  }
}

proc testfixture_nb {varname cmd} {
  set chan [launch_testfixture]
  set ::tfnb($chan) ""
  fconfigure $chan -blocking 0 -buffering none
  puts $chan $cmd
  puts $chan OVER
  fileevent $chan readable [list testfixture_nb_cb $varname $chan]
  return ""
}

# Write the main loop for the child testfixture processes into file
# tf_main.tcl. The parent (this script) interacts with the child processes
# via a two way pipe. The parent writes a script to the stdin of the child
# process, followed by the word "OVER" on a line of its own. The child
# process evaluates the script and writes the results to stdout, followed
# by an "OVER" of its own.
#
set main_loop_written 0
proc write_main_loop {} {
  if {$::main_loop_written} return
  set wrapper ""
  if {[sqlite3 -has-codec] && [info exists ::do_not_use_codec]==0} {
    set wrapper "
      rename sqlite3 sqlite_orig
      proc sqlite3 {args} {[info body sqlite3]}
    "
  }

  set fd [open tf_main.tcl w]
  puts $fd [string map [list %WRAPPER% $wrapper] {
    %WRAPPER%
    set script ""
    while {![eof stdin]} {
      flush stdout
      set line [gets stdin]
      if { $line == "OVER" } {
        set rc [catch {eval $script} result]
        puts [list $rc $result]
        puts OVER
        flush stdout
        set script ""
      } else {
        append script $line
        append script "\n"
      }
    }
  }]
  close $fd
  set main_loop_written 1
}

