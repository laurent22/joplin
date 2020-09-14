#!/usr/bin/tclsh
#
# This script is used to generate the array of strings and the enum
# that appear at the beginning of the C code implementation of a
# a TCL command and that define the available subcommands for that
# TCL command.

set prefix {}
while {![eof stdin]} {
  set line [gets stdin]
  if {$line==""} continue
  regsub -all "\[ \t\n,\]+" [string trim $line] { } line
  foreach token [split $line { }] {
    if {![regexp {(([a-zA-Z]+)_)?([_a-zA-Z0-9]+)} $token all px p2 name]} continue
    lappend namelist [string tolower $name]
    if {$px!=""} {set prefix $p2}
  }
}

puts "  static const char *${prefix}_strs\[\] = \173"
set col 0
proc put_item x {
  global col
  if {$col==0} {puts -nonewline "   "}
  if {$col<2} {
    puts -nonewline [format " %-25s" $x]
    incr col
  } else {
    puts $x
    set col 0
  }
}
proc finalize {} {
  global col
  if {$col>0} {puts {}}
  set col 0
}

foreach name [lsort $namelist] {
  put_item \"$name\",
}
put_item 0
finalize
puts "  \175;"
puts "  enum ${prefix}_enum \173"
foreach name [lsort $namelist] {
  regsub -all {@} $name {} name
  put_item ${prefix}_[string toupper $name],
}
finalize
puts "  \175;"
