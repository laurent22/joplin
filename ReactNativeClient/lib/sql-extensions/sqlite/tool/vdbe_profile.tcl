#!/bin/tclsh
#
# SUMMARY:
# Run this script in the same directory as the "vdbe_profile.out" file.
# This script summarizes the results contained in that file.
#
# DETAILS:
# Compile SQLite using the -DVDBE_PROFILE option on Linux.  This causes 
# performance information about individual VDBE operations to be appended
# to the "vdbe_profile.out" file.  After content has been accumulated in
# vdbe_profile.out, run this script to analyze the output and generate a
# report.
#
if {![file readable vdbe_profile.out]} {
  error "run this script in the same directory as the vdbe_profile.out file"
}
set in [open vdbe_profile.out r]
set stmt {}
set allstmt {}
while {![eof $in]} {
  set line [gets $in]
  if {$line==""} continue
  if {[regexp {^---- } $line]} {
    set stmt [lindex $line 1]
    if {[info exists cnt($stmt)]} {
      incr cnt($stmt)
      set firsttime 0
    } else {
      set cnt($stmt) 1
      set sql($stmt) {}
      set firsttime 1
      lappend allstmt $stmt
    }
    continue;
  }
  if {[regexp {^-- } $line]} {
    if {$firsttime} {
      append sql($stmt) [string range $line 3 end]\n
    }
    continue
  }
  if {![regexp {^ *\d+ *\d+ *\d+ *\d+ ([A-Z].*)} $line all detail]} continue
  set c [lindex $line 0]
  set t [lindex $line 1]
  set addr [lindex $line 3]
  set op [lindex $line 4]
  if {[info exists opcnt($op)]} {
    incr opcnt($op) $c
    incr opcycle($op) $t
  } else {
    set opcnt($op) $c
    set opcycle($op) $t
  }
  if {[info exists stat($stmt,$addr)]} {
    foreach {cx tx detail} $stat($stmt,$addr) break
    incr cx $c
    incr tx $t
    set stat($stmt,$addr) [list $cx $tx $detail]
  } else {
    set stat($stmt,$addr) [list $c $t $detail]
  }
}
close $in

foreach stmt $allstmt {
  puts "********************************************************************"
  puts [string trim $sql($stmt)]
  puts "Execution count: $cnt($stmt)"
  for {set i 0} {[info exists stat($stmt,$i)]} {incr i} {
    foreach {cx tx detail} $stat($stmt,$i) break
    if {$cx==0} {
      set ax 0
    } else {
      set ax [expr {$tx/$cx}]
    }
    puts [format {%8d %12d %12d %4d %s} $cx $tx $ax $i $detail]
  }
}
puts "********************************************************************"
puts "OPCODES:"
foreach op [lsort [array names opcnt]] {
  set cx $opcnt($op)
  set tx $opcycle($op)
  if {$cx==0} {
    set ax 0
  } else {
    set ax [expr {$tx/$cx}]
  }
  puts [format {%8d %12d %12d %s} $cx $tx $ax $op]
}
