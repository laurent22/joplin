#!/usr/bin/tclsh
#
# Parse the output of 
#
#         objdump -d sqlite3.o
#
# for x64 and generate a report showing:
#
#    (1)  Stack used by each function
#    (2)  Recursion paths and their aggregate stack depth
#
set getStack 0
while {![eof stdin]} {
  set line [gets stdin]
  if {[regexp {^[0-9a-f]+ <([^>]+)>:\s*$} $line all procname]} {
    set curfunc $procname
    set root($curfunc) 1
    set calls($curfunc) {}
    set calledby($curfunc) {}
    set recursive($curfunc) {}
    set stkdepth($curfunc) 0
    set getStack 1
    continue
  }
  if {[regexp {callq? +[0-9a-z]+ <([^>]+)>} $line all other]} {
    set key [list $curfunc $other]
    set callpair($key) 1
    unset -nocomplain root($curfunc)
    continue
  }
  if {[regexp {sub +\$(0x[0-9a-z]+),%[er]sp} $line all xdepth]} {
    if {$getStack} {
      scan $xdepth %x depth
      set stkdepth($curfunc) $depth
      set getStack 0
    }
    continue
  }
}

puts "****************** Stack Usage By Function ********************"
set sdlist {}
foreach f [array names stkdepth] {
  lappend sdlist [list $stkdepth($f) $f]
}
foreach sd [lsort -integer -decr -index 0 $sdlist] {
  foreach {depth fname} $sd break
  puts [format {%6d %s} $depth $fname]
}

puts "****************** Stack Usage By Recursion *******************"
foreach key [array names callpair] {
  foreach {from to} $key break
  lappend calls($from) $to
  # lappend calledby($to) $from
}
proc all_descendents {root} {
  global calls recursive
  set todo($root) $root
  set go 1
  while {$go} {
    set go 0
    foreach f [array names todo] {
      set path $todo($f)
      unset todo($f)
      if {![info exists calls($f)]} continue
      foreach x $calls($f) {
        if {$x==$root} {
          lappend recursive($root) [concat $path $root]
        } elseif {![info exists d($x)]} {
          set go 1
          set todo($x) [concat $path $x]
          set d($x) 1
        }
      }
    }
  }
  return [array names d]
}
set pathlist {}
foreach f [array names recursive] {
  all_descendents $f
  foreach m $recursive($f) {
    set depth 0
    foreach b [lrange $m 0 end-1] {
      set depth [expr {$depth+$stkdepth($b)}]
    }
    lappend pathlist [list $depth $m]
  }
}
foreach path [lsort -integer -decr -index 0 $pathlist] {
  foreach {depth m} $path break
  set first [lindex $m 0]
  puts [format {%6d %s %d} $depth $first $stkdepth($first)]
  foreach b [lrange $m 1 end] {
    puts "          $b $stkdepth($b)"
  }
}
