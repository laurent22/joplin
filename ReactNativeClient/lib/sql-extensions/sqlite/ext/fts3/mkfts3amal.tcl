#!/usr/bin/tclsh
#
# This script builds a single C code file holding all of FTS3 code.
# The name of the output file is fts3amal.c.  To build this file,
# first do:
#
#      make target_source
#
# The make target above moves all of the source code files into
# a subdirectory named "tsrc".  (This script expects to find the files
# there and will not work if they are not found.)
#
# After the "tsrc" directory has been created and populated, run
# this script:
#
#      tclsh mkfts3amal.tcl
#
# The amalgamated FTS3 code will be written into fts3amal.c
#

# Open the output file and write a header comment at the beginning
# of the file.
#
set out [open fts3amal.c w]
set today [clock format [clock seconds] -format "%Y-%m-%d %H:%M:%S UTC" -gmt 1]
puts $out [subst \
{/******************************************************************************
** This file is an amalgamation of separate C source files from the SQLite
** Full Text Search extension 2 (fts3).  By combining all the individual C 
** code  files into this single large file, the entire code can be compiled 
** as a one translation unit.  This allows many compilers to do optimizations
** that would not be possible if the files were compiled separately.  It also
** makes the code easier to import into other projects.
**
** This amalgamation was generated on $today.
*/}]

# These are the header files used by FTS3.  The first time any of these 
# files are seen in a #include statement in the C code, include the complete
# text of the file in-line.  The file only needs to be included once.
#
foreach hdr {
   fts3.h
   fts3_hash.h
   fts3_tokenizer.h
   sqlite3.h
   sqlite3ext.h
} {
  set available_hdr($hdr) 1
}

# 78 stars used for comment formatting.
set s78 \
{*****************************************************************************}

# Insert a comment into the code
#
proc section_comment {text} {
  global out s78
  set n [string length $text]
  set nstar [expr {60 - $n}]
  set stars [string range $s78 0 $nstar]
  puts $out "/************** $text $stars/"
}

# Read the source file named $filename and write it into the
# sqlite3.c output file.  If any #include statements are seen,
# process them approprately.
#
proc copy_file {filename} {
  global seen_hdr available_hdr out
  set tail [file tail $filename]
  section_comment "Begin file $tail"
  set in [open $filename r]
  while {![eof $in]} {
    set line [gets $in]
    if {[regexp {^#\s*include\s+["<]([^">]+)[">]} $line all hdr]} {
      if {[info exists available_hdr($hdr)]} {
        if {$available_hdr($hdr)} {
          section_comment "Include $hdr in the middle of $tail"
          copy_file tsrc/$hdr
          section_comment "Continuing where we left off in $tail"
        }
      } elseif {![info exists seen_hdr($hdr)]} {
        set seen_hdr($hdr) 1
        puts $out $line
      }
    } elseif {[regexp {^#ifdef __cplusplus} $line]} {
      puts $out "#if 0"
    } elseif {[regexp {^#line} $line]} {
      # Skip #line directives.
    } else {
      puts $out $line
    }
  }
  close $in
  section_comment "End of $tail"
}


# Process the source files.  Process files containing commonly
# used subroutines first in order to help the compiler find
# inlining opportunities.
#
foreach file {
   fts3.c
   fts3_hash.c
   fts3_porter.c
   fts3_tokenizer.c
   fts3_tokenizer1.c
} {
  copy_file tsrc/$file
}

close $out
