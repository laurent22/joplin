#!/usr/bin/tclsh
#
# Run this script, redirecting input from cachegrind output, to compute the
# number of CPU cycles used by each VDBE opcode.
#
# The cachegrind output should be configured so that it reports a single
# column of Ir at the left margin. Ex:
#
#    cg_annotation --show=Ir --auto=yes cachegrind.out.* | tclsh opcodesum.tcl
#
set currentop x
set ncycle(x) 0
while {![eof stdin]} {
  set line [string map {\173 x \175 x \042 x} [gets stdin]]
  if {[regexp {  \.  case OP_.*:} $line]} {
    regexp {OP_(.+):} $line all currentop
    set ncycle($currentop) 0
  } elseif {[lindex $line 1]=="default:"
            && [regexp {really OP_Noop and OP_Explain} $line]} {
    break
  } elseif {[lindex $line 0]!="."} {
    regsub -all {[^0-9]} [lindex $line 0] {} n
    if {$n!=""} {incr ncycle($currentop) $n}
  }
}
unset ncycle(x)
set results {}
foreach op [lsort [array names ncycle]] {
  if {$ncycle($op)==0} continue
  lappend results [list $ncycle($op) $op]
}
foreach entry [lsort -index 0 -int -decr $results] {
  puts [format {%-16s %10d} [lindex $entry 1] [lindex $entry 0]]
}
