#!/usr/bin/tclsh
#
# Usage:
#
#    tclsh soak1.tcl local-makefile.mk ?target? ?scenario?
#
# This generates many variations on local-makefile.mk (by modifing
# the OPT = lines) and runs them will fulltest, one by one.  The
# constructed makefiles are named "soak1.mk".
#
# If ?target? is provided, that is the makefile target that is run.
# The default is "fulltest"
#
# If ?scenario? is provided, it is the name of a single scenario to
# be run.   All other scenarios are skipped.
#
set localmake [lindex $argv 0]
set target [lindex $argv 1]
set scene [lindex $argv 2]
if {$target==""} {set target fulltest}
if {$scene==""} {set scene all}

set in [open $localmake]
set maketxt [read $in]
close $in
regsub -all {\\\n} $maketxt {} maketxt
#set makefilename "soak1-[expr {int(rand()*1000000000)}].mk"
set makefilename "soak1.mk"

# Generate a makefile
#
proc generate_makefile {pattern} {
  global makefilename maketxt
  set out [open $makefilename w]
  set seen_opt 0
  foreach line [split $maketxt \n] {
    if {[regexp {^ *#? *OPTS[ =+]} $line]} {
      if {!$seen_opt} {
         puts $out "OPTS += -DSQLITE_NO_SYNC=1"
         foreach x $pattern {
           puts $out "OPTS += -D$x"
         }
         set seen_opt 1
      }
    } else {
      puts $out $line
    }
  }
  close $out
}

# Run a test
#
proc scenario {id title pattern} {
  global makefilename target scene
  if {$scene!="all" && $scene!=$id && $scene!=$title} return
  puts "**************** $title ***************"
  generate_makefile $pattern
  exec make -f $makefilename clean >@stdout 2>@stdout
  exec make -f $makefilename $target >@stdout 2>@stdout
}

###############################################################################
# Add new scenarios here
#
scenario 0 {Default} {}
scenario 1 {Debug} {
  SQLITE_DEBUG=1
  SQLITE_MEMDEBUG=1
}
scenario 2 {Everything} {
  SQLITE_DEBUG=1
  SQLITE_MEMDEBUG=1
  SQLITE_ENABLE_MEMORY_MANAGEMENT=1
  SQLITE_ENABLE_COLUMN_METADATA=1
  SQLITE_ENABLE_LOAD_EXTENSION=1 HAVE_DLOPEN=1
  SQLITE_ENABLE_MEMORY_MANAGEMENT=1
}
scenario 3 {Customer-1} {
  SQLITE_DEBUG=1 SQLITE_MEMDEBUG=1
  SQLITE_THREADSAFE=1 SQLITE_OS_UNIX=1
  SQLITE_DISABLE_LFS=1
  SQLITE_DEFAULT_AUTOVACUUM=1
  SQLITE_DEFAULT_PAGE_SIZE=1024
  SQLITE_MAX_PAGE_SIZE=4096
  SQLITE_DEFAULT_CACHE_SIZE=64
  SQLITE_DEFAULT_TEMP_CACHE_SIZE=32
  SQLITE_TEMP_STORE=3
  SQLITE_OMIT_PROGRESS_CALLBACK=1
  SQLITE_OMIT_LOAD_EXTENSION=1
  SQLITE_OMIT_VIRTUALTABLE=1
  SQLITE_ENABLE_IOTRACE=1
}
scenario 4 {Small-Cache} {
  SQLITE_DEBUG=1 SQLITE_MEMDEBUG=1
  SQLITE_THREADSAFE=1 SQLITE_OS_UNIX=1
  SQLITE_DEFAULT_AUTOVACUUM=1
  SQLITE_DEFAULT_PAGE_SIZE=1024
  SQLITE_MAX_PAGE_SIZE=2048
  SQLITE_DEFAULT_CACHE_SIZE=13
  SQLITE_DEFAULT_TEMP_CACHE_SIZE=11
  SQLITE_TEMP_STORE=1
}
