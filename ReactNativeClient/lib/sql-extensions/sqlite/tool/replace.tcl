#!/usr/bin/tcl
#
# Replace string with another string -OR- include
# only lines successfully modified with a regular
# expression.
#
fconfigure stdout -translation binary -encoding binary
fconfigure stderr -translation binary -encoding binary
set mode [string tolower [lindex $argv 0]]
set from [lindex $argv 1]
set to [lindex $argv 2]
if {$mode ni [list exact regsub include]} {exit 1}
if {[string length $from]==0} {exit 2}
while {![eof stdin]} {
  set line [gets stdin]
  if {[eof stdin]} break
  switch -exact $mode {
    exact {set line [string map [list $from $to] $line]}
    regsub {regsub -all -- $from $line $to line}
    include {if {[regsub -all -- $from $line $to line]==0} continue}
  }
  puts stdout $line
}
