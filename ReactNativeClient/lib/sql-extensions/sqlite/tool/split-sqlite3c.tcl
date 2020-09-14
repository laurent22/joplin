#!/usr/bin/tclsh
#
# This script splits the sqlite3.c amalgamated source code files into
# several smaller files such that no single files is more than a fixed
# number of lines in length (32k or 64k).  Each of the split out files
# is #include-ed by the master file.
#
# Splitting files up this way allows them to be used with older compilers
# that cannot handle really long source files.
#
set MAX 32768    ;# Maximum number of lines per file.

set BEGIN {^/\*+ Begin file ([a-zA-Z0-9_.]+) \*+/}
set END   {^/\*+ End of %s \*+/}

set in [open sqlite3.c]
set out1 [open sqlite3-all.c w]
fconfigure $out1 -translation lf

# Copy the header from sqlite3.c into sqlite3-all.c
#
while {[gets $in line]} {
  if {[regexp $BEGIN $line]} break
  puts $out1 $line
}

# Gather the complete content of a file into memory.  Store the
# content in $bufout.  Store the number of lines is $nout
#
proc gather_one_file {firstline bufout nout} {
  regexp $::BEGIN $firstline all filename
  set end [format $::END $filename]
  upvar $bufout buf $nout n
  set buf $firstline\n
  global in
  set n 0
  while {[gets $in line]>=0} {
    incr n
    append buf $line\n
    if {[regexp $end $line]} break
  }
}

# Write a big chunk of text in to an auxiliary file "sqlite3-NNN.c".
# Also add an appropriate #include to sqlite3-all.c
#
set filecnt 0
proc write_one_file {content} {
  global filecnt
  incr filecnt
  set out [open sqlite3-$filecnt.c w]
  fconfigure $out -translation lf
  puts -nonewline $out $content
  close $out
  puts $::out1 "#include \"sqlite3-$filecnt.c\""
}

# Continue reading input.  Store chunks in separate files and add
# the #includes to the main sqlite3-all.c file as necessary to reference
# the extra chunks.
#
set all {}
set N 0
while {[regexp $BEGIN $line]} {
  set buf {}
  set n 0
  gather_one_file $line buf n
  if {$n+$N>=$MAX} {
    write_one_file $all
    set all {}
    set N 0
  }
  append all $buf
  incr N $n
  while {[gets $in line]>=0} {
    if {[regexp $BEGIN $line]} break
    puts $out1 $line
  }
}
if {$N>0} {
  write_one_file $all
}
close $out1
close $in
