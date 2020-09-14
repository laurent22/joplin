#!/usr/bin/tclsh
#
# Generate the file opcodes.h.
#
# This TCL script scans a concatenation of the parse.h output file from the
# parser and the vdbe.c source file in order to generate the opcodes numbers
# for all opcodes.  
#
# The lines of the vdbe.c that we are interested in are of the form:
#
#       case OP_aaaa:      /* same as TK_bbbbb */
#
# The TK_ comment is optional.  If it is present, then the value assigned to
# the OP_ is the same as the TK_ value.  If missing, the OP_ value is assigned
# a small integer that is different from every other OP_ value.
#
# We go to the trouble of making some OP_ values the same as TK_ values
# as an optimization.  During parsing, things like expression operators
# are coded with TK_ values such as TK_ADD, TK_DIVIDE, and so forth.  Later
# during code generation, we need to generate corresponding opcodes like
# OP_Add and OP_Divide.  By making TK_ADD==OP_Add and TK_DIVIDE==OP_Divide,
# code to translate from one to the other is avoided.  This makes the
# code generator smaller and faster.
#
# This script also scans for lines of the form:
#
#       case OP_aaaa:       /* jump, in1, in2, in3, out2, out3 */
#
# When such comments are found on an opcode, it means that certain
# properties apply to that opcode.  Set corresponding flags using the
# OPFLG_INITIALIZER macro.
#

set in stdin
set currentOp {}
set prevName {}
set nOp 0
set nGroup 0
while {![eof $in]} {
  set line [gets $in]

  # Remember the TK_ values from the parse.h file. 
  # NB:  The "TK_" prefix stands for "ToKen", not the graphical Tk toolkit
  # commonly associated with TCL.
  #
  if {[regexp {^#define TK_} $line]} {
    set tk([lindex $line 1]) [lindex $line 2]
    continue
  }

  # Find "/* Opcode: " lines in the vdbe.c file.  Each one introduces
  # a new opcode.  Remember which parameters are used.
  #
  if {[regexp {^.. Opcode: } $line]} {
    set currentOp OP_[lindex $line 2]
    set m 0
    foreach term $line {
      switch $term {
        P1 {incr m 1}
        P2 {incr m 2}
        P3 {incr m 4}
        P4 {incr m 8}
        P5 {incr m 16}
      }
    }
    set paramused($currentOp) $m
  }

  # Find "** Synopsis: " lines that follow Opcode:
  #
  if {[regexp {^.. Synopsis: (.*)} $line all x] && $currentOp!=""} {
    set synopsis($currentOp) [string trim $x]
  }

  # Scan for "case OP_aaaa:" lines in the vdbe.c file
  #
  if {[regexp {^case OP_} $line]} {
    set line [split $line]
    set name [string trim [lindex $line 1] :]
    if {$name=="OP_Abortable"} continue;  # put OP_Abortable last 
    set op($name) -1
    set group($name) 0
    set jump($name) 0
    set in1($name) 0
    set in2($name) 0
    set in3($name) 0
    set out2($name) 0
    set out3($name) 0
    for {set i 3} {$i<[llength $line]-1} {incr i} {
       switch [string trim [lindex $line $i] ,] {
         same {
           incr i
           if {[lindex $line $i]=="as"} {
             incr i
             set sym [string trim [lindex $line $i] ,]
             set val $tk($sym)
             set op($name) $val
             set used($val) 1
             set sameas($val) $sym
             set def($val) $name
           }
         }
         group {set group($name) 1}
         jump  {set jump($name) 1}
         in1   {set in1($name) 1}
         in2   {set in2($name) 1}
         in3   {set in3($name) 1}
         out2  {set out2($name) 1}
         out3  {set out3($name) 1}
       }
    }
    if {$group($name)} {
      set newGroup 0
      if {[info exists groups($nGroup)]} {
        if {$prevName=="" || !$group($prevName)} {
          set newGroup 1
        }
      }
      lappend groups($nGroup) $name
      if {$newGroup} {incr nGroup}
    } else {
      if {$prevName!="" && $group($prevName)} {
        incr nGroup
      }
    }
    set order($nOp) $name
    set prevName $name
    incr nOp
  }
}

# Assign numbers to all opcodes and output the result.
#
puts "/* Automatically generated.  Do not edit */"
puts "/* See the tool/mkopcodeh.tcl script for details */"
foreach name {OP_Noop OP_Explain OP_Abortable} {
  set jump($name) 0
  set in1($name) 0
  set in2($name) 0
  set in3($name) 0
  set out2($name) 0
  set out3($name) 0
  set op($name) -1
  set order($nOp) $name
  incr nOp
}

# The following are the opcodes that are processed by resolveP2Values()
#
set rp2v_ops {
  OP_Transaction
  OP_AutoCommit
  OP_Savepoint
  OP_Checkpoint
  OP_Vacuum
  OP_JournalMode
  OP_VUpdate
  OP_VFilter
  OP_Next
  OP_NextIfOpen
  OP_SorterNext
  OP_Prev
  OP_PrevIfOpen
}

# Assign small values to opcodes that are processed by resolveP2Values()
# to make code generation for the switch() statement smaller and faster.
#
set cnt -1
for {set i 0} {$i<$nOp} {incr i} {
  set name $order($i)
  if {[lsearch $rp2v_ops $name]>=0} {
    incr cnt
    while {[info exists used($cnt)]} {incr cnt}
    set op($name) $cnt
    set used($cnt) 1
    set def($cnt) $name
  }
}

# Assign the next group of values to JUMP opcodes
#
for {set i 0} {$i<$nOp} {incr i} {
  set name $order($i)
  if {$op($name)>=0} continue
  if {!$jump($name)} continue
  incr cnt
  while {[info exists used($cnt)]} {incr cnt}
  set op($name) $cnt
  set used($cnt) 1
  set def($cnt) $name
}

# Find the numeric value for the largest JUMP opcode
#
set mxJump -1
for {set i 0} {$i<$nOp} {incr i} {
  set name $order($i)
  if {$jump($name) && $op($name)>$mxJump} {set mxJump $op($name)}
}


# Generate the numeric values for all remaining opcodes, while
# preserving any groupings of opcodes (i.e. those that must be
# together).
#
for {set g 0} {$g<$nGroup} {incr g} {
  set gLen [llength $groups($g)]
  set ok 0; set start -1
  while {!$ok} {
    set seek $cnt; incr seek
    while {[info exists used($seek)]} {incr seek}
    set ok 1; set start $seek
    for {set j 0} {$j<$gLen} {incr j} {
      incr seek
      if {[info exists used($seek)]} {
        set ok 0; break
      }
    }
  }
  if {$ok} {
    set next $start
    for {set j 0} {$j<$gLen} {incr j} {
      set name [lindex $groups($g) $j]
      if {$op($name)>=0} continue
      set op($name) $next
      set used($next) 1
      set def($next) $name
      incr next
    }
  } else {
    error "cannot find opcodes for group: $groups($g)"
  }
}

for {set i 0} {$i<$nOp} {incr i} {
  set name $order($i)
  if {$op($name)<0} {
    incr cnt
    while {[info exists used($cnt)]} {incr cnt}
    set op($name) $cnt
    set used($cnt) 1
    set def($cnt) $name
  }
}

set max [lindex [lsort -decr -integer [array names used]] 0]
for {set i 0} {$i<=$max} {incr i} {
  if {![info exists used($i)]} {
    set def($i) "OP_NotUsed_$i"
  }
  if {$i>$max} {set max $i}
  set name $def($i)
  puts -nonewline [format {#define %-16s %3d} $name $i]
  set com {}
  if {[info exists jump($name)] && $jump($name)} {
    lappend com "jump"
  }
  if {[info exists sameas($i)]} {
    lappend com "same as $sameas($i)"
  }
  if {[info exists synopsis($name)]} {
    lappend com "synopsis: $synopsis($name)"
  }
  if {[llength $com]} {
    puts -nonewline [format " /* %-42s */" [join $com {, }]]
  }
  puts ""
}

if {$max>255} {
  error "More than 255 opcodes - VdbeOp.opcode is of type u8!"
}

# Generate the bitvectors:
#
set bv(0) 0
for {set i 0} {$i<=$max} {incr i} {
  set x 0
  set name $def($i)
  if {[string match OP_NotUsed* $name]==0} {
    if {$jump($name)}  {incr x 1}
    if {$in1($name)}   {incr x 2}
    if {$in2($name)}   {incr x 4}
    if {$in3($name)}   {incr x 8}
    if {$out2($name)}  {incr x 16}
    if {$out3($name)}  {incr x 32}
  }
  set bv($i) $x
}
puts ""
puts "/* Properties such as \"out2\" or \"jump\" that are specified in"
puts "** comments following the \"case\" for each opcode in the vdbe.c"
puts "** are encoded into bitvectors as follows:"
puts "*/"
puts "#define OPFLG_JUMP        0x01  /* jump:  P2 holds jmp target */"
puts "#define OPFLG_IN1         0x02  /* in1:   P1 is an input */"
puts "#define OPFLG_IN2         0x04  /* in2:   P2 is an input */"
puts "#define OPFLG_IN3         0x08  /* in3:   P3 is an input */"
puts "#define OPFLG_OUT2        0x10  /* out2:  P2 is an output */"
puts "#define OPFLG_OUT3        0x20  /* out3:  P3 is an output */"
puts "#define OPFLG_INITIALIZER \173\\"
for {set i 0} {$i<=$max} {incr i} {
  if {$i%8==0} {
    puts -nonewline [format "/* %3d */" $i]
  }
  puts -nonewline [format " 0x%02x," $bv($i)]
  if {$i%8==7} {
    puts "\\"
  }
}
puts "\175"
puts ""
puts "/* The sqlite3P2Values() routine is able to run faster if it knows"
puts "** the value of the largest JUMP opcode.  The smaller the maximum"
puts "** JUMP opcode the better, so the mkopcodeh.tcl script that"
puts "** generated this include file strives to group all JUMP opcodes"
puts "** together near the beginning of the list."
puts "*/"
puts "#define SQLITE_MX_JUMP_OPCODE  $mxJump  /* Maximum JUMP opcode */"
