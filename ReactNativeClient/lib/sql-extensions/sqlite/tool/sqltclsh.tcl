# Try to open the executable as a database and read the "scripts.data"
# field where "scripts.name" is 'main.tcl'
#
catch {
  if {![file exists $argv0] && [file exists $argv0.exe]} {
    append argv0 .exe
  }
  sqlite3 db $argv0 -vfs apndvfs -create 0
  set mainscript [db one {
      SELECT sqlar_uncompress(data,sz) FROM sqlar WHERE name='main.tcl'
  }]
}
if {[info exists mainscript]} {
  eval $mainscript
  return
} else {
  catch {db close}
}

# Try to open file named in the first argument as a database and
# read the "scripts.data" field where "scripts.name" is 'main.tcl'
#
if {[llength $argv]>0 && [file readable [lindex $argv 0]]} {
  catch {
    sqlite3 db [lindex $argv 0] -vfs apndvfs -create 0
    set mainscript [db one {SELECT data FROM scripts WHERE name='main.tcl'}]
    set argv0 [lindex $argv 0]
    set argv [lrange $argv 1 end]
  }
  if {[info exists mainscript]} {
    eval $mainscript
    return
  } else {
    catch {db close}
  }
  if {[string match *.tcl [lindex $argv 0]]} {
    set fd [open [lindex $argv 0] rb]
    set mainscript [read $fd]
    close $fd
    unset fd
    set argv0 [lindex $argv 0]
    set argv [lrange $argv 1 end]
  }
  if {[info exists mainscript]} {
    eval $mainscript
    return
  }
}

# If all else fails, do an interactive loop
#
set line {}
while {![eof stdin]} {
  if {$line!=""} {
    puts -nonewline "> "
  } else {
    puts -nonewline "% "
  }
  flush stdout
  append line [gets stdin]
  if {[info complete $line]} {
    if {[catch {uplevel #0 $line} result]} {
      puts stderr "Error: $result"
    } elseif {$result!=""} {
      puts $result
    }
    set line {}
  } else {
    append line \\n"
  }
}
