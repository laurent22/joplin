#!/bin/sh
# \
exec tclsh "$0" ${1+"$@"}
#
# A wrapper around cg_annotate that sets appropriate command-line options
# and rearranges the output so that annotated files occur in a consistent
# sorted order.  Used by the speed-check.tcl script.
#

set in [open "|cg_annotate --show=Ir --auto=yes --context=40 $argv" r]
set dest !
set out(!) {}
set linenum 0
set cntlines 0      ;# true to remember cycle counts on each line
set seenSqlite3 0   ;# true if we have seen the sqlite3.c file
while {![eof $in]} {
  set line [string map {\t {        }} [gets $in]]
  if {[regexp {^-- Auto-annotated source: (.*)} $line all name]} {
    set dest $name
    if {[string match */sqlite3.c $dest]} {
      set cntlines 1
      set seenSqlite3 1
    } else {
      set cntlines 0
    }
  } elseif {[regexp {^-- line (\d+) ------} $line all ln]} {
    set line [lreplace $line 2 2 {#}]
    set linenum [expr {$ln-1}]
  } elseif {[regexp {^The following files chosen for } $line]} {
    set dest !
  }
  append out($dest) $line\n
  if {$cntlines} {
    incr linenum
    if {[regexp {^ *([0-9,]+) } $line all x]} {
      set x [string map {, {}} $x]
      set cycles($linenum) $x
    }
  }
}
foreach x [lsort [array names out]] {
  puts $out($x)
}

# If the sqlite3.c file has been seen, then output a summary of the
# cycle counts for each file that went into making up sqlite3.c
#
if {$seenSqlite3} {
  close $in
  set in [open sqlite3.c]
  set linenum 0
  set fn sqlite3.c
  set pattern1 {^/\*+ Begin file ([^ ]+) \*}
  set pattern2 {^/\*+ Continuing where we left off in ([^ ]+) \*}
  while {![eof $in]} {
    set line [gets $in]
    incr linenum
    if {[regexp $pattern1 $line all newfn]} {
      set fn $newfn
    } elseif {[regexp $pattern2 $line all newfn]} {
      set fn $newfn
    } elseif {[info exists cycles($linenum)]} {
      incr fcycles($fn) $cycles($linenum)
    }
  }
  close $in
  puts {**********************************************************************}
  set lx {}
  set sum 0
  foreach {fn cnt} [array get fcycles] {
    lappend lx [list $cnt $fn]
    incr sum $cnt
  }
  puts [format {%20s %14d  %8.3f%%} TOTAL $sum 100]
  foreach entry [lsort -index 0 -integer -decreasing $lx] {
    foreach {cnt fn} $entry break
    puts [format {%20s %14d  %8.3f%%} $fn $cnt [expr {$cnt*100.0/$sum}]]
  }
}
