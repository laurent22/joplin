/*
** 2001 September 15
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** Internal interface definitions for SQLite.
**
*/
#ifndef SQLITEINT_H
#define SQLITEINT_H

/* Special Comments:
**
** Some comments have special meaning to the tools that measure test
** coverage:
**
**    NO_TEST                     - The branches on this line are not
**                                  measured by branch coverage.  This is
**                                  used on lines of code that actually
**                                  implement parts of coverage testing.
**
**    OPTIMIZATION-IF-TRUE        - This branch is allowed to alway be false
**                                  and the correct answer is still obtained,
**                                  though perhaps more slowly.
**
**    OPTIMIZATION-IF-FALSE       - This branch is allowed to alway be true
**                                  and the correct answer is still obtained,
**                                  though perhaps more slowly.
**
**    PREVENTS-HARMLESS-OVERREAD  - This branch prevents a buffer overread
**                                  that would be harmless and undetectable
**                                  if it did occur.  
**
** In all cases, the special comment must be enclosed in the usual
** slash-asterisk...asterisk-slash comment marks, with no spaces between the 
** asterisks and the comment text.
*/

/*
** Make sure the Tcl calling convention macro is defined.  This macro is
** only used by test code and Tcl integration code.
*/
#ifndef SQLITE_TCLAPI
#  define SQLITE_TCLAPI
#endif

/*
** Include the header file used to customize the compiler options for MSVC.
** This should be done first so that it can successfully prevent spurious
** compiler warnings due to subsequent content in this file and other files
** that are included by this file.
*/
#include "msvc.h"

/*
** Special setup for VxWorks
*/
#include "vxworks.h"

/*
** These #defines should enable >2GB file support on POSIX if the
** underlying operating system supports it.  If the OS lacks
** large file support, or if the OS is windows, these should be no-ops.
**
** Ticket #2739:  The _LARGEFILE_SOURCE macro must appear before any
** system #includes.  Hence, this block of code must be the very first
** code in all source files.
**
** Large file support can be disabled using the -DSQLITE_DISABLE_LFS switch
** on the compiler command line.  This is necessary if you are compiling
** on a recent machine (ex: Red Hat 7.2) but you want your code to work
** on an older machine (ex: Red Hat 6.0).  If you compile on Red Hat 7.2
** without this option, LFS is enable.  But LFS does not exist in the kernel
** in Red Hat 6.0, so the code won't work.  Hence, for maximum binary
** portability you should omit LFS.
**
** The previous paragraph was written in 2005.  (This paragraph is written
** on 2008-11-28.) These days, all Linux kernels support large files, so
** you should probably leave LFS enabled.  But some embedded platforms might
** lack LFS in which case the SQLITE_DISABLE_LFS macro might still be useful.
**
** Similar is true for Mac OS X.  LFS is only supported on Mac OS X 9 and later.
*/
#ifndef SQLITE_DISABLE_LFS
# define _LARGE_FILE       1
# ifndef _FILE_OFFSET_BITS
#   define _FILE_OFFSET_BITS 64
# endif
# define _LARGEFILE_SOURCE 1
#endif

/* The GCC_VERSION and MSVC_VERSION macros are used to
** conditionally include optimizations for each of these compilers.  A
** value of 0 means that compiler is not being used.  The
** SQLITE_DISABLE_INTRINSIC macro means do not use any compiler-specific
** optimizations, and hence set all compiler macros to 0
**
** There was once also a CLANG_VERSION macro.  However, we learn that the
** version numbers in clang are for "marketing" only and are inconsistent
** and unreliable.  Fortunately, all versions of clang also recognize the
** gcc version numbers and have reasonable settings for gcc version numbers,
** so the GCC_VERSION macro will be set to a correct non-zero value even
** when compiling with clang.
*/
#if defined(__GNUC__) && !defined(SQLITE_DISABLE_INTRINSIC)
# define GCC_VERSION (__GNUC__*1000000+__GNUC_MINOR__*1000+__GNUC_PATCHLEVEL__)
#else
# define GCC_VERSION 0
#endif
#if defined(_MSC_VER) && !defined(SQLITE_DISABLE_INTRINSIC)
# define MSVC_VERSION _MSC_VER
#else
# define MSVC_VERSION 0
#endif

/* Needed for various definitions... */
#if defined(__GNUC__) && !defined(_GNU_SOURCE)
# define _GNU_SOURCE
#endif

#if defined(__OpenBSD__) && !defined(_BSD_SOURCE)
# define _BSD_SOURCE
#endif

/*
** Macro to disable warnings about missing "break" at the end of a "case".
*/
#if GCC_VERSION>=7000000
# define deliberate_fall_through __attribute__((fallthrough));
#else
# define deliberate_fall_through
#endif

/*
** For MinGW, check to see if we can include the header file containing its
** version information, among other things.  Normally, this internal MinGW
** header file would [only] be included automatically by other MinGW header
** files; however, the contained version information is now required by this
** header file to work around binary compatibility issues (see below) and
** this is the only known way to reliably obtain it.  This entire #if block
** would be completely unnecessary if there was any other way of detecting
** MinGW via their preprocessor (e.g. if they customized their GCC to define
** some MinGW-specific macros).  When compiling for MinGW, either the
** _HAVE_MINGW_H or _HAVE__MINGW_H (note the extra underscore) macro must be
** defined; otherwise, detection of conditions specific to MinGW will be
** disabled.
*/
#if defined(_HAVE_MINGW_H)
# include "mingw.h"
#elif defined(_HAVE__MINGW_H)
# include "_mingw.h"
#endif

/*
** For MinGW version 4.x (and higher), check to see if the _USE_32BIT_TIME_T
** define is required to maintain binary compatibility with the MSVC runtime
** library in use (e.g. for Windows XP).
*/
#if !defined(_USE_32BIT_TIME_T) && !defined(_USE_64BIT_TIME_T) && \
    defined(_WIN32) && !defined(_WIN64) && \
    defined(__MINGW_MAJOR_VERSION) && __MINGW_MAJOR_VERSION >= 4 && \
    defined(__MSVCRT__)
# define _USE_32BIT_TIME_T
#endif

/* The public SQLite interface.  The _FILE_OFFSET_BITS macro must appear
** first in QNX.  Also, the _USE_32BIT_TIME_T macro must appear first for
** MinGW.
*/
#include "sqlite3.h"

/*
** Include the configuration header output by 'configure' if we're using the
** autoconf-based build
*/
#if defined(_HAVE_SQLITE_CONFIG_H) && !defined(SQLITECONFIG_H)
#include "config.h"
#define SQLITECONFIG_H 1
#endif

#include "sqliteLimit.h"

/* Disable nuisance warnings on Borland compilers */
#if defined(__BORLANDC__)
#pragma warn -rch /* unreachable code */
#pragma warn -ccc /* Condition is always true or false */
#pragma warn -aus /* Assigned value is never used */
#pragma warn -csu /* Comparing signed and unsigned */
#pragma warn -spa /* Suspicious pointer arithmetic */
#endif

/*
** WAL mode depends on atomic aligned 32-bit loads and stores in a few
** places.  The following macros try to make this explicit.
*/
#ifndef __has_extension
# define __has_extension(x) 0     /* compatibility with non-clang compilers */
#endif
#if GCC_VERSION>=4007000 || __has_extension(c_atomic)
# define AtomicLoad(PTR)       __atomic_load_n((PTR),__ATOMIC_RELAXED)
# define AtomicStore(PTR,VAL)  __atomic_store_n((PTR),(VAL),__ATOMIC_RELAXED)
#else
# define AtomicLoad(PTR)       (*(PTR))
# define AtomicStore(PTR,VAL)  (*(PTR) = (VAL))
#endif

/*
** Include standard header files as necessary
*/
#ifdef HAVE_STDINT_H
#include <stdint.h>
#endif
#ifdef HAVE_INTTYPES_H
#include <inttypes.h>
#endif

/*
** The following macros are used to cast pointers to integers and
** integers to pointers.  The way you do this varies from one compiler
** to the next, so we have developed the following set of #if statements
** to generate appropriate macros for a wide range of compilers.
**
** The correct "ANSI" way to do this is to use the intptr_t type.
** Unfortunately, that typedef is not available on all compilers, or
** if it is available, it requires an #include of specific headers
** that vary from one machine to the next.
**
** Ticket #3860:  The llvm-gcc-4.2 compiler from Apple chokes on
** the ((void*)&((char*)0)[X]) construct.  But MSVC chokes on ((void*)(X)).
** So we have to define the macros in different ways depending on the
** compiler.
*/
#if defined(HAVE_STDINT_H)   /* Use this case if we have ANSI headers */
# define SQLITE_INT_TO_PTR(X)  ((void*)(intptr_t)(X))
# define SQLITE_PTR_TO_INT(X)  ((int)(intptr_t)(X))
#elif defined(__PTRDIFF_TYPE__)  /* This case should work for GCC */
# define SQLITE_INT_TO_PTR(X)  ((void*)(__PTRDIFF_TYPE__)(X))
# define SQLITE_PTR_TO_INT(X)  ((int)(__PTRDIFF_TYPE__)(X))
#elif !defined(__GNUC__)       /* Works for compilers other than LLVM */
# define SQLITE_INT_TO_PTR(X)  ((void*)&((char*)0)[X])
# define SQLITE_PTR_TO_INT(X)  ((int)(((char*)X)-(char*)0))
#else                          /* Generates a warning - but it always works */
# define SQLITE_INT_TO_PTR(X)  ((void*)(X))
# define SQLITE_PTR_TO_INT(X)  ((int)(X))
#endif

/*
** A macro to hint to the compiler that a function should not be
** inlined.
*/
#if defined(__GNUC__)
#  define SQLITE_NOINLINE  __attribute__((noinline))
#elif defined(_MSC_VER) && _MSC_VER>=1310
#  define SQLITE_NOINLINE  __declspec(noinline)
#else
#  define SQLITE_NOINLINE
#endif

/*
** Make sure that the compiler intrinsics we desire are enabled when
** compiling with an appropriate version of MSVC unless prevented by
** the SQLITE_DISABLE_INTRINSIC define.
*/
#if !defined(SQLITE_DISABLE_INTRINSIC)
#  if defined(_MSC_VER) && _MSC_VER>=1400
#    if !defined(_WIN32_WCE)
#      include <intrin.h>
#      pragma intrinsic(_byteswap_ushort)
#      pragma intrinsic(_byteswap_ulong)
#      pragma intrinsic(_byteswap_uint64)
#      pragma intrinsic(_ReadWriteBarrier)
#    else
#      include <cmnintrin.h>
#    endif
#  endif
#endif

/*
** The SQLITE_THREADSAFE macro must be defined as 0, 1, or 2.
** 0 means mutexes are permanently disable and the library is never
** threadsafe.  1 means the library is serialized which is the highest
** level of threadsafety.  2 means the library is multithreaded - multiple
** threads can use SQLite as long as no two threads try to use the same
** database connection at the same time.
**
** Older versions of SQLite used an optional THREADSAFE macro.
** We support that for legacy.
**
** To ensure that the correct value of "THREADSAFE" is reported when querying
** for compile-time options at runtime (e.g. "PRAGMA compile_options"), this
** logic is partially replicated in ctime.c. If it is updated here, it should
** also be updated there.
*/
#if !defined(SQLITE_THREADSAFE)
# if defined(THREADSAFE)
#   define SQLITE_THREADSAFE THREADSAFE
# else
#   define SQLITE_THREADSAFE 1 /* IMP: R-07272-22309 */
# endif
#endif

/*
** Powersafe overwrite is on by default.  But can be turned off using
** the -DSQLITE_POWERSAFE_OVERWRITE=0 command-line option.
*/
#ifndef SQLITE_POWERSAFE_OVERWRITE
# define SQLITE_POWERSAFE_OVERWRITE 1
#endif

/*
** EVIDENCE-OF: R-25715-37072 Memory allocation statistics are enabled by
** default unless SQLite is compiled with SQLITE_DEFAULT_MEMSTATUS=0 in
** which case memory allocation statistics are disabled by default.
*/
#if !defined(SQLITE_DEFAULT_MEMSTATUS)
# define SQLITE_DEFAULT_MEMSTATUS 1
#endif

/*
** Exactly one of the following macros must be defined in order to
** specify which memory allocation subsystem to use.
**
**     SQLITE_SYSTEM_MALLOC          // Use normal system malloc()
**     SQLITE_WIN32_MALLOC           // Use Win32 native heap API
**     SQLITE_ZERO_MALLOC            // Use a stub allocator that always fails
**     SQLITE_MEMDEBUG               // Debugging version of system malloc()
**
** On Windows, if the SQLITE_WIN32_MALLOC_VALIDATE macro is defined and the
** assert() macro is enabled, each call into the Win32 native heap subsystem
** will cause HeapValidate to be called.  If heap validation should fail, an
** assertion will be triggered.
**
** If none of the above are defined, then set SQLITE_SYSTEM_MALLOC as
** the default.
*/
#if defined(SQLITE_SYSTEM_MALLOC) \
  + defined(SQLITE_WIN32_MALLOC) \
  + defined(SQLITE_ZERO_MALLOC) \
  + defined(SQLITE_MEMDEBUG)>1
# error "Two or more of the following compile-time configuration options\
 are defined but at most one is allowed:\
 SQLITE_SYSTEM_MALLOC, SQLITE_WIN32_MALLOC, SQLITE_MEMDEBUG,\
 SQLITE_ZERO_MALLOC"
#endif
#if defined(SQLITE_SYSTEM_MALLOC) \
  + defined(SQLITE_WIN32_MALLOC) \
  + defined(SQLITE_ZERO_MALLOC) \
  + defined(SQLITE_MEMDEBUG)==0
# define SQLITE_SYSTEM_MALLOC 1
#endif

/*
** If SQLITE_MALLOC_SOFT_LIMIT is not zero, then try to keep the
** sizes of memory allocations below this value where possible.
*/
#if !defined(SQLITE_MALLOC_SOFT_LIMIT)
# define SQLITE_MALLOC_SOFT_LIMIT 1024
#endif

/*
** We need to define _XOPEN_SOURCE as follows in order to enable
** recursive mutexes on most Unix systems and fchmod() on OpenBSD.
** But _XOPEN_SOURCE define causes problems for Mac OS X, so omit
** it.
*/
#if !defined(_XOPEN_SOURCE) && !defined(__DARWIN__) && !defined(__APPLE__)
#  define _XOPEN_SOURCE 600
#endif

/*
** NDEBUG and SQLITE_DEBUG are opposites.  It should always be true that
** defined(NDEBUG)==!defined(SQLITE_DEBUG).  If this is not currently true,
** make it true by defining or undefining NDEBUG.
**
** Setting NDEBUG makes the code smaller and faster by disabling the
** assert() statements in the code.  So we want the default action
** to be for NDEBUG to be set and NDEBUG to be undefined only if SQLITE_DEBUG
** is set.  Thus NDEBUG becomes an opt-in rather than an opt-out
** feature.
*/
#if !defined(NDEBUG) && !defined(SQLITE_DEBUG)
# define NDEBUG 1
#endif
#if defined(NDEBUG) && defined(SQLITE_DEBUG)
# undef NDEBUG
#endif

/*
** Enable SQLITE_ENABLE_EXPLAIN_COMMENTS if SQLITE_DEBUG is turned on.
*/
#if !defined(SQLITE_ENABLE_EXPLAIN_COMMENTS) && defined(SQLITE_DEBUG)
# define SQLITE_ENABLE_EXPLAIN_COMMENTS 1
#endif

/*
** The testcase() macro is used to aid in coverage testing.  When
** doing coverage testing, the condition inside the argument to
** testcase() must be evaluated both true and false in order to
** get full branch coverage.  The testcase() macro is inserted
** to help ensure adequate test coverage in places where simple
** condition/decision coverage is inadequate.  For example, testcase()
** can be used to make sure boundary values are tested.  For
** bitmask tests, testcase() can be used to make sure each bit
** is significant and used at least once.  On switch statements
** where multiple cases go to the same block of code, testcase()
** can insure that all cases are evaluated.
**
*/
#ifdef SQLITE_COVERAGE_TEST
  void sqlite3Coverage(int);
# define testcase(X)  if( X ){ sqlite3Coverage(__LINE__); }
#else
# define testcase(X)
#endif

/*
** The TESTONLY macro is used to enclose variable declarations or
** other bits of code that are needed to support the arguments
** within testcase() and assert() macros.
*/
#if !defined(NDEBUG) || defined(SQLITE_COVERAGE_TEST)
# define TESTONLY(X)  X
#else
# define TESTONLY(X)
#endif

/*
** Sometimes we need a small amount of code such as a variable initialization
** to setup for a later assert() statement.  We do not want this code to
** appear when assert() is disabled.  The following macro is therefore
** used to contain that setup code.  The "VVA" acronym stands for
** "Verification, Validation, and Accreditation".  In other words, the
** code within VVA_ONLY() will only run during verification processes.
*/
#ifndef NDEBUG
# define VVA_ONLY(X)  X
#else
# define VVA_ONLY(X)
#endif

/*
** The ALWAYS and NEVER macros surround boolean expressions which
** are intended to always be true or false, respectively.  Such
** expressions could be omitted from the code completely.  But they
** are included in a few cases in order to enhance the resilience
** of SQLite to unexpected behavior - to make the code "self-healing"
** or "ductile" rather than being "brittle" and crashing at the first
** hint of unplanned behavior.
**
** In other words, ALWAYS and NEVER are added for defensive code.
**
** When doing coverage testing ALWAYS and NEVER are hard-coded to
** be true and false so that the unreachable code they specify will
** not be counted as untested code.
*/
#if defined(SQLITE_COVERAGE_TEST) || defined(SQLITE_MUTATION_TEST)
# define ALWAYS(X)      (1)
# define NEVER(X)       (0)
#elif !defined(NDEBUG)
# define ALWAYS(X)      ((X)?1:(assert(0),0))
# define NEVER(X)       ((X)?(assert(0),1):0)
#else
# define ALWAYS(X)      (X)
# define NEVER(X)       (X)
#endif

/*
** The harmless(X) macro indicates that expression X is usually false
** but can be true without causing any problems, but we don't know of
** any way to cause X to be true.
**
** In debugging and testing builds, this macro will abort if X is ever
** true.  In this way, developers are alerted to a possible test case
** that causes X to be true.  If a harmless macro ever fails, that is
** an opportunity to change the macro into a testcase() and add a new
** test case to the test suite.
**
** For normal production builds, harmless(X) is a no-op, since it does
** not matter whether expression X is true or false.
*/
#ifdef SQLITE_DEBUG
# define harmless(X)  assert(!(X));
#else
# define harmless(X)
#endif

/*
** Some conditionals are optimizations only.  In other words, if the
** conditionals are replaced with a constant 1 (true) or 0 (false) then
** the correct answer is still obtained, though perhaps not as quickly.
**
** The following macros mark these optimizations conditionals.
*/
#if defined(SQLITE_MUTATION_TEST)
# define OK_IF_ALWAYS_TRUE(X)  (1)
# define OK_IF_ALWAYS_FALSE(X) (0)
#else
# define OK_IF_ALWAYS_TRUE(X)  (X)
# define OK_IF_ALWAYS_FALSE(X) (X)
#endif

/*
** Some malloc failures are only possible if SQLITE_TEST_REALLOC_STRESS is
** defined.  We need to defend against those failures when testing with
** SQLITE_TEST_REALLOC_STRESS, but we don't want the unreachable branches
** during a normal build.  The following macro can be used to disable tests
** that are always false except when SQLITE_TEST_REALLOC_STRESS is set.
*/
#if defined(SQLITE_TEST_REALLOC_STRESS)
# define ONLY_IF_REALLOC_STRESS(X)  (X)
#elif !defined(NDEBUG)
# define ONLY_IF_REALLOC_STRESS(X)  ((X)?(assert(0),1):0)
#else
# define ONLY_IF_REALLOC_STRESS(X)  (0)
#endif

/*
** Declarations used for tracing the operating system interfaces.
*/
#if defined(SQLITE_FORCE_OS_TRACE) || defined(SQLITE_TEST) || \
    (defined(SQLITE_DEBUG) && SQLITE_OS_WIN)
  extern int sqlite3OSTrace;
# define OSTRACE(X)          if( sqlite3OSTrace ) sqlite3DebugPrintf X
# define SQLITE_HAVE_OS_TRACE
#else
# define OSTRACE(X)
# undef  SQLITE_HAVE_OS_TRACE
#endif

/*
** Is the sqlite3ErrName() function needed in the build?  Currently,
** it is needed by "mutex_w32.c" (when debugging), "os_win.c" (when
** OSTRACE is enabled), and by several "test*.c" files (which are
** compiled using SQLITE_TEST).
*/
#if defined(SQLITE_HAVE_OS_TRACE) || defined(SQLITE_TEST) || \
    (defined(SQLITE_DEBUG) && SQLITE_OS_WIN)
# define SQLITE_NEED_ERR_NAME
#else
# undef  SQLITE_NEED_ERR_NAME
#endif

/*
** SQLITE_ENABLE_EXPLAIN_COMMENTS is incompatible with SQLITE_OMIT_EXPLAIN
*/
#ifdef SQLITE_OMIT_EXPLAIN
# undef SQLITE_ENABLE_EXPLAIN_COMMENTS
#endif

/*
** Return true (non-zero) if the input is an integer that is too large
** to fit in 32-bits.  This macro is used inside of various testcase()
** macros to verify that we have tested SQLite for large-file support.
*/
#define IS_BIG_INT(X)  (((X)&~(i64)0xffffffff)!=0)

/*
** The macro unlikely() is a hint that surrounds a boolean
** expression that is usually false.  Macro likely() surrounds
** a boolean expression that is usually true.  These hints could,
** in theory, be used by the compiler to generate better code, but
** currently they are just comments for human readers.
*/
#define likely(X)    (X)
#define unlikely(X)  (X)

#include "hash.h"
#include "parse.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <stddef.h>

/*
** Use a macro to replace memcpy() if compiled with SQLITE_INLINE_MEMCPY.
** This allows better measurements of where memcpy() is used when running
** cachegrind.  But this macro version of memcpy() is very slow so it
** should not be used in production.  This is a performance measurement
** hack only.
*/
#ifdef SQLITE_INLINE_MEMCPY
# define memcpy(D,S,N) {char*xxd=(char*)(D);const char*xxs=(const char*)(S);\
                        int xxn=(N);while(xxn-->0)*(xxd++)=*(xxs++);}
#endif

/*
** If compiling for a processor that lacks floating point support,
** substitute integer for floating-point
*/
#ifdef SQLITE_OMIT_FLOATING_POINT
# define double sqlite_int64
# define float sqlite_int64
# define LONGDOUBLE_TYPE sqlite_int64
# ifndef SQLITE_BIG_DBL
#   define SQLITE_BIG_DBL (((sqlite3_int64)1)<<50)
# endif
# define SQLITE_OMIT_DATETIME_FUNCS 1
# define SQLITE_OMIT_TRACE 1
# undef SQLITE_MIXED_ENDIAN_64BIT_FLOAT
# undef SQLITE_HAVE_ISNAN
#endif
#ifndef SQLITE_BIG_DBL
# define SQLITE_BIG_DBL (1e99)
#endif

/*
** OMIT_TEMPDB is set to 1 if SQLITE_OMIT_TEMPDB is defined, or 0
** afterward. Having this macro allows us to cause the C compiler
** to omit code used by TEMP tables without messy #ifndef statements.
*/
#ifdef SQLITE_OMIT_TEMPDB
#define OMIT_TEMPDB 1
#else
#define OMIT_TEMPDB 0
#endif

/*
** The "file format" number is an integer that is incremented whenever
** the VDBE-level file format changes.  The following macros define the
** the default file format for new databases and the maximum file format
** that the library can read.
*/
#define SQLITE_MAX_FILE_FORMAT 4
#ifndef SQLITE_DEFAULT_FILE_FORMAT
# define SQLITE_DEFAULT_FILE_FORMAT 4
#endif

/*
** Determine whether triggers are recursive by default.  This can be
** changed at run-time using a pragma.
*/
#ifndef SQLITE_DEFAULT_RECURSIVE_TRIGGERS
# define SQLITE_DEFAULT_RECURSIVE_TRIGGERS 0
#endif

/*
** Provide a default value for SQLITE_TEMP_STORE in case it is not specified
** on the command-line
*/
#ifndef SQLITE_TEMP_STORE
# define SQLITE_TEMP_STORE 1
#endif

/*
** If no value has been provided for SQLITE_MAX_WORKER_THREADS, or if
** SQLITE_TEMP_STORE is set to 3 (never use temporary files), set it
** to zero.
*/
#if SQLITE_TEMP_STORE==3 || SQLITE_THREADSAFE==0
# undef SQLITE_MAX_WORKER_THREADS
# define SQLITE_MAX_WORKER_THREADS 0
#endif
#ifndef SQLITE_MAX_WORKER_THREADS
# define SQLITE_MAX_WORKER_THREADS 8
#endif
#ifndef SQLITE_DEFAULT_WORKER_THREADS
# define SQLITE_DEFAULT_WORKER_THREADS 0
#endif
#if SQLITE_DEFAULT_WORKER_THREADS>SQLITE_MAX_WORKER_THREADS
# undef SQLITE_MAX_WORKER_THREADS
# define SQLITE_MAX_WORKER_THREADS SQLITE_DEFAULT_WORKER_THREADS
#endif

/*
** The default initial allocation for the pagecache when using separate
** pagecaches for each database connection.  A positive number is the
** number of pages.  A negative number N translations means that a buffer
** of -1024*N bytes is allocated and used for as many pages as it will hold.
**
** The default value of "20" was choosen to minimize the run-time of the
** speedtest1 test program with options: --shrink-memory --reprepare
*/
#ifndef SQLITE_DEFAULT_PCACHE_INITSZ
# define SQLITE_DEFAULT_PCACHE_INITSZ 20
#endif

/*
** Default value for the SQLITE_CONFIG_SORTERREF_SIZE option.
*/
#ifndef SQLITE_DEFAULT_SORTERREF_SIZE
# define SQLITE_DEFAULT_SORTERREF_SIZE 0x7fffffff
#endif

/*
** The compile-time options SQLITE_MMAP_READWRITE and 
** SQLITE_ENABLE_BATCH_ATOMIC_WRITE are not compatible with one another.
** You must choose one or the other (or neither) but not both.
*/
#if defined(SQLITE_MMAP_READWRITE) && defined(SQLITE_ENABLE_BATCH_ATOMIC_WRITE)
#error Cannot use both SQLITE_MMAP_READWRITE and SQLITE_ENABLE_BATCH_ATOMIC_WRITE
#endif

/*
** GCC does not define the offsetof() macro so we'll have to do it
** ourselves.
*/
#ifndef offsetof
#define offsetof(STRUCTURE,FIELD) ((int)((char*)&((STRUCTURE*)0)->FIELD))
#endif

/*
** Macros to compute minimum and maximum of two numbers.
*/
#ifndef MIN
# define MIN(A,B) ((A)<(B)?(A):(B))
#endif
#ifndef MAX
# define MAX(A,B) ((A)>(B)?(A):(B))
#endif

/*
** Swap two objects of type TYPE.
*/
#define SWAP(TYPE,A,B) {TYPE t=A; A=B; B=t;}

/*
** Check to see if this machine uses EBCDIC.  (Yes, believe it or
** not, there are still machines out there that use EBCDIC.)
*/
#if 'A' == '\301'
# define SQLITE_EBCDIC 1
#else
# define SQLITE_ASCII 1
#endif

/*
** Integers of known sizes.  These typedefs might change for architectures
** where the sizes very.  Preprocessor macros are available so that the
** types can be conveniently redefined at compile-type.  Like this:
**
**         cc '-DUINTPTR_TYPE=long long int' ...
*/
#ifndef UINT32_TYPE
# ifdef HAVE_UINT32_T
#  define UINT32_TYPE uint32_t
# else
#  define UINT32_TYPE unsigned int
# endif
#endif
#ifndef UINT16_TYPE
# ifdef HAVE_UINT16_T
#  define UINT16_TYPE uint16_t
# else
#  define UINT16_TYPE unsigned short int
# endif
#endif
#ifndef INT16_TYPE
# ifdef HAVE_INT16_T
#  define INT16_TYPE int16_t
# else
#  define INT16_TYPE short int
# endif
#endif
#ifndef UINT8_TYPE
# ifdef HAVE_UINT8_T
#  define UINT8_TYPE uint8_t
# else
#  define UINT8_TYPE unsigned char
# endif
#endif
#ifndef INT8_TYPE
# ifdef HAVE_INT8_T
#  define INT8_TYPE int8_t
# else
#  define INT8_TYPE signed char
# endif
#endif
#ifndef LONGDOUBLE_TYPE
# define LONGDOUBLE_TYPE long double
#endif
typedef sqlite_int64 i64;          /* 8-byte signed integer */
typedef sqlite_uint64 u64;         /* 8-byte unsigned integer */
typedef UINT32_TYPE u32;           /* 4-byte unsigned integer */
typedef UINT16_TYPE u16;           /* 2-byte unsigned integer */
typedef INT16_TYPE i16;            /* 2-byte signed integer */
typedef UINT8_TYPE u8;             /* 1-byte unsigned integer */
typedef INT8_TYPE i8;              /* 1-byte signed integer */

/*
** SQLITE_MAX_U32 is a u64 constant that is the maximum u64 value
** that can be stored in a u32 without loss of data.  The value
** is 0x00000000ffffffff.  But because of quirks of some compilers, we
** have to specify the value in the less intuitive manner shown:
*/
#define SQLITE_MAX_U32  ((((u64)1)<<32)-1)

/*
** The datatype used to store estimates of the number of rows in a
** table or index.  This is an unsigned integer type.  For 99.9% of
** the world, a 32-bit integer is sufficient.  But a 64-bit integer
** can be used at compile-time if desired.
*/
#ifdef SQLITE_64BIT_STATS
 typedef u64 tRowcnt;    /* 64-bit only if requested at compile-time */
#else
 typedef u32 tRowcnt;    /* 32-bit is the default */
#endif

/*
** Estimated quantities used for query planning are stored as 16-bit
** logarithms.  For quantity X, the value stored is 10*log2(X).  This
** gives a possible range of values of approximately 1.0e986 to 1e-986.
** But the allowed values are "grainy".  Not every value is representable.
** For example, quantities 16 and 17 are both represented by a LogEst
** of 40.  However, since LogEst quantities are suppose to be estimates,
** not exact values, this imprecision is not a problem.
**
** "LogEst" is short for "Logarithmic Estimate".
**
** Examples:
**      1 -> 0              20 -> 43          10000 -> 132
**      2 -> 10             25 -> 46          25000 -> 146
**      3 -> 16            100 -> 66        1000000 -> 199
**      4 -> 20           1000 -> 99        1048576 -> 200
**     10 -> 33           1024 -> 100    4294967296 -> 320
**
** The LogEst can be negative to indicate fractional values.
** Examples:
**
**    0.5 -> -10           0.1 -> -33        0.0625 -> -40
*/
typedef INT16_TYPE LogEst;

/*
** Set the SQLITE_PTRSIZE macro to the number of bytes in a pointer
*/
#ifndef SQLITE_PTRSIZE
# if defined(__SIZEOF_POINTER__)
#   define SQLITE_PTRSIZE __SIZEOF_POINTER__
# elif defined(i386)     || defined(__i386__)   || defined(_M_IX86) ||    \
       defined(_M_ARM)   || defined(__arm__)    || defined(__x86)   ||    \
      (defined(__TOS_AIX__) && !defined(__64BIT__))
#   define SQLITE_PTRSIZE 4
# else
#   define SQLITE_PTRSIZE 8
# endif
#endif

/* The uptr type is an unsigned integer large enough to hold a pointer
*/
#if defined(HAVE_STDINT_H)
  typedef uintptr_t uptr;
#elif SQLITE_PTRSIZE==4
  typedef u32 uptr;
#else
  typedef u64 uptr;
#endif

/*
** The SQLITE_WITHIN(P,S,E) macro checks to see if pointer P points to
** something between S (inclusive) and E (exclusive).
**
** In other words, S is a buffer and E is a pointer to the first byte after
** the end of buffer S.  This macro returns true if P points to something
** contained within the buffer S.
*/
#define SQLITE_WITHIN(P,S,E) (((uptr)(P)>=(uptr)(S))&&((uptr)(P)<(uptr)(E)))


/*
** Macros to determine whether the machine is big or little endian,
** and whether or not that determination is run-time or compile-time.
**
** For best performance, an attempt is made to guess at the byte-order
** using C-preprocessor macros.  If that is unsuccessful, or if
** -DSQLITE_BYTEORDER=0 is set, then byte-order is determined
** at run-time.
*/
#ifndef SQLITE_BYTEORDER
# if defined(i386)      || defined(__i386__)      || defined(_M_IX86) ||    \
     defined(__x86_64)  || defined(__x86_64__)    || defined(_M_X64)  ||    \
     defined(_M_AMD64)  || defined(_M_ARM)        || defined(__x86)   ||    \
     defined(__ARMEL__) || defined(__AARCH64EL__) || defined(_M_ARM64)
#   define SQLITE_BYTEORDER    1234
# elif defined(sparc)     || defined(__ppc__) || \
       defined(__ARMEB__) || defined(__AARCH64EB__)
#   define SQLITE_BYTEORDER    4321
# else
#   define SQLITE_BYTEORDER 0
# endif
#endif
#if SQLITE_BYTEORDER==4321
# define SQLITE_BIGENDIAN    1
# define SQLITE_LITTLEENDIAN 0
# define SQLITE_UTF16NATIVE  SQLITE_UTF16BE
#elif SQLITE_BYTEORDER==1234
# define SQLITE_BIGENDIAN    0
# define SQLITE_LITTLEENDIAN 1
# define SQLITE_UTF16NATIVE  SQLITE_UTF16LE
#else
# ifdef SQLITE_AMALGAMATION
  const int sqlite3one = 1;
# else
  extern const int sqlite3one;
# endif
# define SQLITE_BIGENDIAN    (*(char *)(&sqlite3one)==0)
# define SQLITE_LITTLEENDIAN (*(char *)(&sqlite3one)==1)
# define SQLITE_UTF16NATIVE  (SQLITE_BIGENDIAN?SQLITE_UTF16BE:SQLITE_UTF16LE)
#endif

/*
** Constants for the largest and smallest possible 64-bit signed integers.
** These macros are designed to work correctly on both 32-bit and 64-bit
** compilers.
*/
#define LARGEST_INT64  (0xffffffff|(((i64)0x7fffffff)<<32))
#define LARGEST_UINT64 (0xffffffff|(((u64)0xffffffff)<<32))
#define SMALLEST_INT64 (((i64)-1) - LARGEST_INT64)

/*
** Round up a number to the next larger multiple of 8.  This is used
** to force 8-byte alignment on 64-bit architectures.
*/
#define ROUND8(x)     (((x)+7)&~7)

/*
** Round down to the nearest multiple of 8
*/
#define ROUNDDOWN8(x) ((x)&~7)

/*
** Assert that the pointer X is aligned to an 8-byte boundary.  This
** macro is used only within assert() to verify that the code gets
** all alignment restrictions correct.
**
** Except, if SQLITE_4_BYTE_ALIGNED_MALLOC is defined, then the
** underlying malloc() implementation might return us 4-byte aligned
** pointers.  In that case, only verify 4-byte alignment.
*/
#ifdef SQLITE_4_BYTE_ALIGNED_MALLOC
# define EIGHT_BYTE_ALIGNMENT(X)   ((((char*)(X) - (char*)0)&3)==0)
#else
# define EIGHT_BYTE_ALIGNMENT(X)   ((((char*)(X) - (char*)0)&7)==0)
#endif

/*
** Disable MMAP on platforms where it is known to not work
*/
#if defined(__OpenBSD__) || defined(__QNXNTO__)
# undef SQLITE_MAX_MMAP_SIZE
# define SQLITE_MAX_MMAP_SIZE 0
#endif

/*
** Default maximum size of memory used by memory-mapped I/O in the VFS
*/
#ifdef __APPLE__
# include <TargetConditionals.h>
#endif
#ifndef SQLITE_MAX_MMAP_SIZE
# if defined(__linux__) \
  || defined(_WIN32) \
  || (defined(__APPLE__) && defined(__MACH__)) \
  || defined(__sun) \
  || defined(__FreeBSD__) \
  || defined(__DragonFly__)
#   define SQLITE_MAX_MMAP_SIZE 0x7fff0000  /* 2147418112 */
# else
#   define SQLITE_MAX_MMAP_SIZE 0
# endif
#endif

/*
** The default MMAP_SIZE is zero on all platforms.  Or, even if a larger
** default MMAP_SIZE is specified at compile-time, make sure that it does
** not exceed the maximum mmap size.
*/
#ifndef SQLITE_DEFAULT_MMAP_SIZE
# define SQLITE_DEFAULT_MMAP_SIZE 0
#endif
#if SQLITE_DEFAULT_MMAP_SIZE>SQLITE_MAX_MMAP_SIZE
# undef SQLITE_DEFAULT_MMAP_SIZE
# define SQLITE_DEFAULT_MMAP_SIZE SQLITE_MAX_MMAP_SIZE
#endif

/*
** SELECTTRACE_ENABLED will be either 1 or 0 depending on whether or not
** the Select query generator tracing logic is turned on.
*/
#if defined(SQLITE_ENABLE_SELECTTRACE)
# define SELECTTRACE_ENABLED 1
#else
# define SELECTTRACE_ENABLED 0
#endif
#if defined(SQLITE_ENABLE_SELECTTRACE)
# define SELECTTRACE_ENABLED 1
# define SELECTTRACE(K,P,S,X)  \
  if(sqlite3_unsupported_selecttrace&(K))   \
    sqlite3DebugPrintf("%u/%d/%p: ",(S)->selId,(P)->addrExplain,(S)),\
    sqlite3DebugPrintf X
#else
# define SELECTTRACE(K,P,S,X)
# define SELECTTRACE_ENABLED 0
#endif

/*
** An instance of the following structure is used to store the busy-handler
** callback for a given sqlite handle.
**
** The sqlite.busyHandler member of the sqlite struct contains the busy
** callback for the database handle. Each pager opened via the sqlite
** handle is passed a pointer to sqlite.busyHandler. The busy-handler
** callback is currently invoked only from within pager.c.
*/
typedef struct BusyHandler BusyHandler;
struct BusyHandler {
  int (*xBusyHandler)(void *,int);  /* The busy callback */
  void *pBusyArg;                   /* First arg to busy callback */
  int nBusy;                        /* Incremented with each busy call */
};

/*
** Name of table that holds the database schema.
*/
#define DFLT_SCHEMA_TABLE          "sqlite_master"
#define DFLT_TEMP_SCHEMA_TABLE     "sqlite_temp_master"
#define ALT_SCHEMA_TABLE           "sqlite_schema"
#define ALT_TEMP_SCHEMA_TABLE      "sqlite_temp_schema"


/*
** The root-page of the schema table.
*/
#define SCHEMA_ROOT    1

/*
** The name of the schema table.  The name is different for TEMP.
*/
#define SCHEMA_TABLE(x) \
    ((!OMIT_TEMPDB)&&(x==1)?DFLT_TEMP_SCHEMA_TABLE:DFLT_SCHEMA_TABLE)

/*
** A convenience macro that returns the number of elements in
** an array.
*/
#define ArraySize(X)    ((int)(sizeof(X)/sizeof(X[0])))

/*
** Determine if the argument is a power of two
*/
#define IsPowerOfTwo(X) (((X)&((X)-1))==0)

/*
** The following value as a destructor means to use sqlite3DbFree().
** The sqlite3DbFree() routine requires two parameters instead of the
** one parameter that destructors normally want.  So we have to introduce
** this magic value that the code knows to handle differently.  Any
** pointer will work here as long as it is distinct from SQLITE_STATIC
** and SQLITE_TRANSIENT.
*/
#define SQLITE_DYNAMIC   ((sqlite3_destructor_type)sqlite3OomFault)

/*
** When SQLITE_OMIT_WSD is defined, it means that the target platform does
** not support Writable Static Data (WSD) such as global and static variables.
** All variables must either be on the stack or dynamically allocated from
** the heap.  When WSD is unsupported, the variable declarations scattered
** throughout the SQLite code must become constants instead.  The SQLITE_WSD
** macro is used for this purpose.  And instead of referencing the variable
** directly, we use its constant as a key to lookup the run-time allocated
** buffer that holds real variable.  The constant is also the initializer
** for the run-time allocated buffer.
**
** In the usual case where WSD is supported, the SQLITE_WSD and GLOBAL
** macros become no-ops and have zero performance impact.
*/
#ifdef SQLITE_OMIT_WSD
  #define SQLITE_WSD const
  #define GLOBAL(t,v) (*(t*)sqlite3_wsd_find((void*)&(v), sizeof(v)))
  #define sqlite3GlobalConfig GLOBAL(struct Sqlite3Config, sqlite3Config)
  int sqlite3_wsd_init(int N, int J);
  void *sqlite3_wsd_find(void *K, int L);
#else
  #define SQLITE_WSD
  #define GLOBAL(t,v) v
  #define sqlite3GlobalConfig sqlite3Config
#endif

/*
** The following macros are used to suppress compiler warnings and to
** make it clear to human readers when a function parameter is deliberately
** left unused within the body of a function. This usually happens when
** a function is called via a function pointer. For example the
** implementation of an SQL aggregate step callback may not use the
** parameter indicating the number of arguments passed to the aggregate,
** if it knows that this is enforced elsewhere.
**
** When a function parameter is not used at all within the body of a function,
** it is generally named "NotUsed" or "NotUsed2" to make things even clearer.
** However, these macros may also be used to suppress warnings related to
** parameters that may or may not be used depending on compilation options.
** For example those parameters only used in assert() statements. In these
** cases the parameters are named as per the usual conventions.
*/
#define UNUSED_PARAMETER(x) (void)(x)
#define UNUSED_PARAMETER2(x,y) UNUSED_PARAMETER(x),UNUSED_PARAMETER(y)

/*
** Forward references to structures
*/
typedef struct AggInfo AggInfo;
typedef struct AuthContext AuthContext;
typedef struct AutoincInfo AutoincInfo;
typedef struct Bitvec Bitvec;
typedef struct CollSeq CollSeq;
typedef struct Column Column;
typedef struct Db Db;
typedef struct Schema Schema;
typedef struct Expr Expr;
typedef struct ExprList ExprList;
typedef struct FKey FKey;
typedef struct FuncDestructor FuncDestructor;
typedef struct FuncDef FuncDef;
typedef struct FuncDefHash FuncDefHash;
typedef struct IdList IdList;
typedef struct Index Index;
typedef struct IndexSample IndexSample;
typedef struct KeyClass KeyClass;
typedef struct KeyInfo KeyInfo;
typedef struct Lookaside Lookaside;
typedef struct LookasideSlot LookasideSlot;
typedef struct Module Module;
typedef struct NameContext NameContext;
typedef struct Parse Parse;
typedef struct PreUpdate PreUpdate;
typedef struct PrintfArguments PrintfArguments;
typedef struct RenameToken RenameToken;
typedef struct RowSet RowSet;
typedef struct Savepoint Savepoint;
typedef struct Select Select;
typedef struct SQLiteThread SQLiteThread;
typedef struct SelectDest SelectDest;
typedef struct SrcList SrcList;
typedef struct sqlite3_str StrAccum; /* Internal alias for sqlite3_str */
typedef struct Table Table;
typedef struct TableLock TableLock;
typedef struct Token Token;
typedef struct TreeView TreeView;
typedef struct Trigger Trigger;
typedef struct TriggerPrg TriggerPrg;
typedef struct TriggerStep TriggerStep;
typedef struct UnpackedRecord UnpackedRecord;
typedef struct Upsert Upsert;
typedef struct VTable VTable;
typedef struct VtabCtx VtabCtx;
typedef struct Walker Walker;
typedef struct WhereInfo WhereInfo;
typedef struct Window Window;
typedef struct With With;


/*
** The bitmask datatype defined below is used for various optimizations.
**
** Changing this from a 64-bit to a 32-bit type limits the number of
** tables in a join to 32 instead of 64.  But it also reduces the size
** of the library by 738 bytes on ix86.
*/
#ifdef SQLITE_BITMASK_TYPE
  typedef SQLITE_BITMASK_TYPE Bitmask;
#else
  typedef u64 Bitmask;
#endif

/*
** The number of bits in a Bitmask.  "BMS" means "BitMask Size".
*/
#define BMS  ((int)(sizeof(Bitmask)*8))

/*
** A bit in a Bitmask
*/
#define MASKBIT(n)   (((Bitmask)1)<<(n))
#define MASKBIT64(n) (((u64)1)<<(n))
#define MASKBIT32(n) (((unsigned int)1)<<(n))
#define ALLBITS      ((Bitmask)-1)

/* A VList object records a mapping between parameters/variables/wildcards
** in the SQL statement (such as $abc, @pqr, or :xyz) and the integer
** variable number associated with that parameter.  See the format description
** on the sqlite3VListAdd() routine for more information.  A VList is really
** just an array of integers.
*/
typedef int VList;

/*
** Defer sourcing vdbe.h and btree.h until after the "u8" and
** "BusyHandler" typedefs. vdbe.h also requires a few of the opaque
** pointer types (i.e. FuncDef) defined above.
*/
#include "pager.h"
#include "btree.h"
#include "vdbe.h"
#include "pcache.h"
#include "os.h"
#include "mutex.h"

/* The SQLITE_EXTRA_DURABLE compile-time option used to set the default
** synchronous setting to EXTRA.  It is no longer supported.
*/
#ifdef SQLITE_EXTRA_DURABLE
# warning Use SQLITE_DEFAULT_SYNCHRONOUS=3 instead of SQLITE_EXTRA_DURABLE
# define SQLITE_DEFAULT_SYNCHRONOUS 3
#endif

/*
** Default synchronous levels.
**
** Note that (for historcal reasons) the PAGER_SYNCHRONOUS_* macros differ
** from the SQLITE_DEFAULT_SYNCHRONOUS value by 1.
**
**           PAGER_SYNCHRONOUS       DEFAULT_SYNCHRONOUS
**   OFF           1                         0
**   NORMAL        2                         1
**   FULL          3                         2
**   EXTRA         4                         3
**
** The "PRAGMA synchronous" statement also uses the zero-based numbers.
** In other words, the zero-based numbers are used for all external interfaces
** and the one-based values are used internally.
*/
#ifndef SQLITE_DEFAULT_SYNCHRONOUS
# define SQLITE_DEFAULT_SYNCHRONOUS 2
#endif
#ifndef SQLITE_DEFAULT_WAL_SYNCHRONOUS
# define SQLITE_DEFAULT_WAL_SYNCHRONOUS SQLITE_DEFAULT_SYNCHRONOUS
#endif

/*
** Each database file to be accessed by the system is an instance
** of the following structure.  There are normally two of these structures
** in the sqlite.aDb[] array.  aDb[0] is the main database file and
** aDb[1] is the database file used to hold temporary tables.  Additional
** databases may be attached.
*/
struct Db {
  char *zDbSName;      /* Name of this database. (schema name, not filename) */
  Btree *pBt;          /* The B*Tree structure for this database file */
  u8 safety_level;     /* How aggressive at syncing data to disk */
  u8 bSyncSet;         /* True if "PRAGMA synchronous=N" has been run */
  Schema *pSchema;     /* Pointer to database schema (possibly shared) */
};

/*
** An instance of the following structure stores a database schema.
**
** Most Schema objects are associated with a Btree.  The exception is
** the Schema for the TEMP databaes (sqlite3.aDb[1]) which is free-standing.
** In shared cache mode, a single Schema object can be shared by multiple
** Btrees that refer to the same underlying BtShared object.
**
** Schema objects are automatically deallocated when the last Btree that
** references them is destroyed.   The TEMP Schema is manually freed by
** sqlite3_close().
*
** A thread must be holding a mutex on the corresponding Btree in order
** to access Schema content.  This implies that the thread must also be
** holding a mutex on the sqlite3 connection pointer that owns the Btree.
** For a TEMP Schema, only the connection mutex is required.
*/
struct Schema {
  int schema_cookie;   /* Database schema version number for this file */
  int iGeneration;     /* Generation counter.  Incremented with each change */
  Hash tblHash;        /* All tables indexed by name */
  Hash idxHash;        /* All (named) indices indexed by name */
  Hash trigHash;       /* All triggers indexed by name */
  Hash fkeyHash;       /* All foreign keys by referenced table name */
  Table *pSeqTab;      /* The sqlite_sequence table used by AUTOINCREMENT */
  u8 file_format;      /* Schema format version for this file */
  u8 enc;              /* Text encoding used by this database */
  u16 schemaFlags;     /* Flags associated with this schema */
  int cache_size;      /* Number of pages to use in the cache */
};

/*
** These macros can be used to test, set, or clear bits in the
** Db.pSchema->flags field.
*/
#define DbHasProperty(D,I,P)     (((D)->aDb[I].pSchema->schemaFlags&(P))==(P))
#define DbHasAnyProperty(D,I,P)  (((D)->aDb[I].pSchema->schemaFlags&(P))!=0)
#define DbSetProperty(D,I,P)     (D)->aDb[I].pSchema->schemaFlags|=(P)
#define DbClearProperty(D,I,P)   (D)->aDb[I].pSchema->schemaFlags&=~(P)

/*
** Allowed values for the DB.pSchema->flags field.
**
** The DB_SchemaLoaded flag is set after the database schema has been
** read into internal hash tables.
**
** DB_UnresetViews means that one or more views have column names that
** have been filled out.  If the schema changes, these column names might
** changes and so the view will need to be reset.
*/
#define DB_SchemaLoaded    0x0001  /* The schema has been loaded */
#define DB_UnresetViews    0x0002  /* Some views have defined column names */
#define DB_ResetWanted     0x0008  /* Reset the schema when nSchemaLock==0 */

/*
** The number of different kinds of things that can be limited
** using the sqlite3_limit() interface.
*/
#define SQLITE_N_LIMIT (SQLITE_LIMIT_WORKER_THREADS+1)

/*
** Lookaside malloc is a set of fixed-size buffers that can be used
** to satisfy small transient memory allocation requests for objects
** associated with a particular database connection.  The use of
** lookaside malloc provides a significant performance enhancement
** (approx 10%) by avoiding numerous malloc/free requests while parsing
** SQL statements.
**
** The Lookaside structure holds configuration information about the
** lookaside malloc subsystem.  Each available memory allocation in
** the lookaside subsystem is stored on a linked list of LookasideSlot
** objects.
**
** Lookaside allocations are only allowed for objects that are associated
** with a particular database connection.  Hence, schema information cannot
** be stored in lookaside because in shared cache mode the schema information
** is shared by multiple database connections.  Therefore, while parsing
** schema information, the Lookaside.bEnabled flag is cleared so that
** lookaside allocations are not used to construct the schema objects.
**
** New lookaside allocations are only allowed if bDisable==0.  When
** bDisable is greater than zero, sz is set to zero which effectively
** disables lookaside without adding a new test for the bDisable flag
** in a performance-critical path.  sz should be set by to szTrue whenever
** bDisable changes back to zero.
**
** Lookaside buffers are initially held on the pInit list.  As they are
** used and freed, they are added back to the pFree list.  New allocations
** come off of pFree first, then pInit as a fallback.  This dual-list
** allows use to compute a high-water mark - the maximum number of allocations
** outstanding at any point in the past - by subtracting the number of
** allocations on the pInit list from the total number of allocations.
**
** Enhancement on 2019-12-12:  Two-size-lookaside
** The default lookaside configuration is 100 slots of 1200 bytes each.
** The larger slot sizes are important for performance, but they waste
** a lot of space, as most lookaside allocations are less than 128 bytes.
** The two-size-lookaside enhancement breaks up the lookaside allocation
** into two pools:  One of 128-byte slots and the other of the default size
** (1200-byte) slots.   Allocations are filled from the small-pool first,
** failing over to the full-size pool if that does not work.  Thus more
** lookaside slots are available while also using less memory.
** This enhancement can be omitted by compiling with
** SQLITE_OMIT_TWOSIZE_LOOKASIDE.
*/
struct Lookaside {
  u32 bDisable;           /* Only operate the lookaside when zero */
  u16 sz;                 /* Size of each buffer in bytes */
  u16 szTrue;             /* True value of sz, even if disabled */
  u8 bMalloced;           /* True if pStart obtained from sqlite3_malloc() */
  u32 nSlot;              /* Number of lookaside slots allocated */
  u32 anStat[3];          /* 0: hits.  1: size misses.  2: full misses */
  LookasideSlot *pInit;   /* List of buffers not previously used */
  LookasideSlot *pFree;   /* List of available buffers */
#ifndef SQLITE_OMIT_TWOSIZE_LOOKASIDE
  LookasideSlot *pSmallInit; /* List of small buffers not prediously used */
  LookasideSlot *pSmallFree; /* List of available small buffers */
  void *pMiddle;          /* First byte past end of full-size buffers and
                          ** the first byte of LOOKASIDE_SMALL buffers */
#endif /* SQLITE_OMIT_TWOSIZE_LOOKASIDE */
  void *pStart;           /* First byte of available memory space */
  void *pEnd;             /* First byte past end of available space */
};
struct LookasideSlot {
  LookasideSlot *pNext;    /* Next buffer in the list of free buffers */
};

#define DisableLookaside  db->lookaside.bDisable++;db->lookaside.sz=0
#define EnableLookaside   db->lookaside.bDisable--;\
   db->lookaside.sz=db->lookaside.bDisable?0:db->lookaside.szTrue

/* Size of the smaller allocations in two-size lookside */
#ifdef SQLITE_OMIT_TWOSIZE_LOOKASIDE
#  define LOOKASIDE_SMALL           0
#else
#  define LOOKASIDE_SMALL         128
#endif

/*
** A hash table for built-in function definitions.  (Application-defined
** functions use a regular table table from hash.h.)
**
** Hash each FuncDef structure into one of the FuncDefHash.a[] slots.
** Collisions are on the FuncDef.u.pHash chain.  Use the SQLITE_FUNC_HASH()
** macro to compute a hash on the function name.
*/
#define SQLITE_FUNC_HASH_SZ 23
struct FuncDefHash {
  FuncDef *a[SQLITE_FUNC_HASH_SZ];       /* Hash table for functions */
};
#define SQLITE_FUNC_HASH(C,L) (((C)+(L))%SQLITE_FUNC_HASH_SZ)

#ifdef SQLITE_USER_AUTHENTICATION
/*
** Information held in the "sqlite3" database connection object and used
** to manage user authentication.
*/
typedef struct sqlite3_userauth sqlite3_userauth;
struct sqlite3_userauth {
  u8 authLevel;                 /* Current authentication level */
  int nAuthPW;                  /* Size of the zAuthPW in bytes */
  char *zAuthPW;                /* Password used to authenticate */
  char *zAuthUser;              /* User name used to authenticate */
};

/* Allowed values for sqlite3_userauth.authLevel */
#define UAUTH_Unknown     0     /* Authentication not yet checked */
#define UAUTH_Fail        1     /* User authentication failed */
#define UAUTH_User        2     /* Authenticated as a normal user */
#define UAUTH_Admin       3     /* Authenticated as an administrator */

/* Functions used only by user authorization logic */
int sqlite3UserAuthTable(const char*);
int sqlite3UserAuthCheckLogin(sqlite3*,const char*,u8*);
void sqlite3UserAuthInit(sqlite3*);
void sqlite3CryptFunc(sqlite3_context*,int,sqlite3_value**);

#endif /* SQLITE_USER_AUTHENTICATION */

/*
** typedef for the authorization callback function.
*/
#ifdef SQLITE_USER_AUTHENTICATION
  typedef int (*sqlite3_xauth)(void*,int,const char*,const char*,const char*,
                               const char*, const char*);
#else
  typedef int (*sqlite3_xauth)(void*,int,const char*,const char*,const char*,
                               const char*);
#endif

#ifndef SQLITE_OMIT_DEPRECATED
/* This is an extra SQLITE_TRACE macro that indicates "legacy" tracing
** in the style of sqlite3_trace()
*/
#define SQLITE_TRACE_LEGACY          0x40     /* Use the legacy xTrace */
#define SQLITE_TRACE_XPROFILE        0x80     /* Use the legacy xProfile */
#else
#define SQLITE_TRACE_LEGACY          0
#define SQLITE_TRACE_XPROFILE        0
#endif /* SQLITE_OMIT_DEPRECATED */
#define SQLITE_TRACE_NONLEGACY_MASK  0x0f     /* Normal flags */


/*
** Each database connection is an instance of the following structure.
*/
struct sqlite3 {
  sqlite3_vfs *pVfs;            /* OS Interface */
  struct Vdbe *pVdbe;           /* List of active virtual machines */
  CollSeq *pDfltColl;           /* BINARY collseq for the database encoding */
  sqlite3_mutex *mutex;         /* Connection mutex */
  Db *aDb;                      /* All backends */
  int nDb;                      /* Number of backends currently in use */
  u32 mDbFlags;                 /* flags recording internal state */
  u64 flags;                    /* flags settable by pragmas. See below */
  i64 lastRowid;                /* ROWID of most recent insert (see above) */
  i64 szMmap;                   /* Default mmap_size setting */
  u32 nSchemaLock;              /* Do not reset the schema when non-zero */
  unsigned int openFlags;       /* Flags passed to sqlite3_vfs.xOpen() */
  int errCode;                  /* Most recent error code (SQLITE_*) */
  int errMask;                  /* & result codes with this before returning */
  int iSysErrno;                /* Errno value from last system error */
  u16 dbOptFlags;               /* Flags to enable/disable optimizations */
  u8 enc;                       /* Text encoding */
  u8 autoCommit;                /* The auto-commit flag. */
  u8 temp_store;                /* 1: file 2: memory 0: default */
  u8 mallocFailed;              /* True if we have seen a malloc failure */
  u8 bBenignMalloc;             /* Do not require OOMs if true */
  u8 dfltLockMode;              /* Default locking-mode for attached dbs */
  signed char nextAutovac;      /* Autovac setting after VACUUM if >=0 */
  u8 suppressErr;               /* Do not issue error messages if true */
  u8 vtabOnConflict;            /* Value to return for s3_vtab_on_conflict() */
  u8 isTransactionSavepoint;    /* True if the outermost savepoint is a TS */
  u8 mTrace;                    /* zero or more SQLITE_TRACE flags */
  u8 noSharedCache;             /* True if no shared-cache backends */
  u8 nSqlExec;                  /* Number of pending OP_SqlExec opcodes */
  int nextPagesize;             /* Pagesize after VACUUM if >0 */
  u32 magic;                    /* Magic number for detect library misuse */
  int nChange;                  /* Value returned by sqlite3_changes() */
  int nTotalChange;             /* Value returned by sqlite3_total_changes() */
  int aLimit[SQLITE_N_LIMIT];   /* Limits */
  int nMaxSorterMmap;           /* Maximum size of regions mapped by sorter */
  struct sqlite3InitInfo {      /* Information used during initialization */
    Pgno newTnum;               /* Rootpage of table being initialized */
    u8 iDb;                     /* Which db file is being initialized */
    u8 busy;                    /* TRUE if currently initializing */
    unsigned orphanTrigger : 1; /* Last statement is orphaned TEMP trigger */
    unsigned imposterTable : 1; /* Building an imposter table */
    unsigned reopenMemdb : 1;   /* ATTACH is really a reopen using MemDB */
    char **azInit;              /* "type", "name", and "tbl_name" columns */
  } init;
  int nVdbeActive;              /* Number of VDBEs currently running */
  int nVdbeRead;                /* Number of active VDBEs that read or write */
  int nVdbeWrite;               /* Number of active VDBEs that read and write */
  int nVdbeExec;                /* Number of nested calls to VdbeExec() */
  int nVDestroy;                /* Number of active OP_VDestroy operations */
  int nExtension;               /* Number of loaded extensions */
  void **aExtension;            /* Array of shared library handles */
  union {
    void (*xLegacy)(void*,const char*);     /* Legacy trace function */
    int (*xV2)(u32,void*,void*,void*);      /* V2 Trace function */
  } trace;
  void *pTraceArg;                          /* Argument to the trace function */
#ifndef SQLITE_OMIT_DEPRECATED
  void (*xProfile)(void*,const char*,u64);  /* Profiling function */
  void *pProfileArg;                        /* Argument to profile function */
#endif
  void *pCommitArg;                 /* Argument to xCommitCallback() */
  int (*xCommitCallback)(void*);    /* Invoked at every commit. */
  void *pRollbackArg;               /* Argument to xRollbackCallback() */
  void (*xRollbackCallback)(void*); /* Invoked at every commit. */
  void *pUpdateArg;
  void (*xUpdateCallback)(void*,int, const char*,const char*,sqlite_int64);
  Parse *pParse;                /* Current parse */
#ifdef SQLITE_ENABLE_PREUPDATE_HOOK
  void *pPreUpdateArg;          /* First argument to xPreUpdateCallback */
  void (*xPreUpdateCallback)(   /* Registered using sqlite3_preupdate_hook() */
    void*,sqlite3*,int,char const*,char const*,sqlite3_int64,sqlite3_int64
  );
  PreUpdate *pPreUpdate;        /* Context for active pre-update callback */
#endif /* SQLITE_ENABLE_PREUPDATE_HOOK */
#ifndef SQLITE_OMIT_WAL
  int (*xWalCallback)(void *, sqlite3 *, const char *, int);
  void *pWalArg;
#endif
  void(*xCollNeeded)(void*,sqlite3*,int eTextRep,const char*);
  void(*xCollNeeded16)(void*,sqlite3*,int eTextRep,const void*);
  void *pCollNeededArg;
  sqlite3_value *pErr;          /* Most recent error message */
  union {
    volatile int isInterrupted; /* True if sqlite3_interrupt has been called */
    double notUsed1;            /* Spacer */
  } u1;
  Lookaside lookaside;          /* Lookaside malloc configuration */
#ifndef SQLITE_OMIT_AUTHORIZATION
  sqlite3_xauth xAuth;          /* Access authorization function */
  void *pAuthArg;               /* 1st argument to the access auth function */
#endif
#ifndef SQLITE_OMIT_PROGRESS_CALLBACK
  int (*xProgress)(void *);     /* The progress callback */
  void *pProgressArg;           /* Argument to the progress callback */
  unsigned nProgressOps;        /* Number of opcodes for progress callback */
#endif
#ifndef SQLITE_OMIT_VIRTUALTABLE
  int nVTrans;                  /* Allocated size of aVTrans */
  Hash aModule;                 /* populated by sqlite3_create_module() */
  VtabCtx *pVtabCtx;            /* Context for active vtab connect/create */
  VTable **aVTrans;             /* Virtual tables with open transactions */
  VTable *pDisconnect;          /* Disconnect these in next sqlite3_prepare() */
#endif
  Hash aFunc;                   /* Hash table of connection functions */
  Hash aCollSeq;                /* All collating sequences */
  BusyHandler busyHandler;      /* Busy callback */
  Db aDbStatic[2];              /* Static space for the 2 default backends */
  Savepoint *pSavepoint;        /* List of active savepoints */
  int nAnalysisLimit;           /* Number of index rows to ANALYZE */
  int busyTimeout;              /* Busy handler timeout, in msec */
  int nSavepoint;               /* Number of non-transaction savepoints */
  int nStatement;               /* Number of nested statement-transactions  */
  i64 nDeferredCons;            /* Net deferred constraints this transaction. */
  i64 nDeferredImmCons;         /* Net deferred immediate constraints */
  int *pnBytesFreed;            /* If not NULL, increment this in DbFree() */
#ifdef SQLITE_ENABLE_UNLOCK_NOTIFY
  /* The following variables are all protected by the STATIC_MAIN
  ** mutex, not by sqlite3.mutex. They are used by code in notify.c.
  **
  ** When X.pUnlockConnection==Y, that means that X is waiting for Y to
  ** unlock so that it can proceed.
  **
  ** When X.pBlockingConnection==Y, that means that something that X tried
  ** tried to do recently failed with an SQLITE_LOCKED error due to locks
  ** held by Y.
  */
  sqlite3 *pBlockingConnection; /* Connection that caused SQLITE_LOCKED */
  sqlite3 *pUnlockConnection;           /* Connection to watch for unlock */
  void *pUnlockArg;                     /* Argument to xUnlockNotify */
  void (*xUnlockNotify)(void **, int);  /* Unlock notify callback */
  sqlite3 *pNextBlocked;        /* Next in list of all blocked connections */
#endif
#ifdef SQLITE_USER_AUTHENTICATION
  sqlite3_userauth auth;        /* User authentication information */
#endif
};

/*
** A macro to discover the encoding of a database.
*/
#define SCHEMA_ENC(db) ((db)->aDb[0].pSchema->enc)
#define ENC(db)        ((db)->enc)

/*
** A u64 constant where the lower 32 bits are all zeros.  Only the
** upper 32 bits are included in the argument.  Necessary because some
** C-compilers still do not accept LL integer literals.
*/
#define HI(X)  ((u64)(X)<<32)

/*
** Possible values for the sqlite3.flags.
**
** Value constraints (enforced via assert()):
**      SQLITE_FullFSync     == PAGER_FULLFSYNC
**      SQLITE_CkptFullFSync == PAGER_CKPT_FULLFSYNC
**      SQLITE_CacheSpill    == PAGER_CACHE_SPILL
*/
#define SQLITE_WriteSchema    0x00000001  /* OK to update SQLITE_SCHEMA */
#define SQLITE_LegacyFileFmt  0x00000002  /* Create new databases in format 1 */
#define SQLITE_FullColNames   0x00000004  /* Show full column names on SELECT */
#define SQLITE_FullFSync      0x00000008  /* Use full fsync on the backend */
#define SQLITE_CkptFullFSync  0x00000010  /* Use full fsync for checkpoint */
#define SQLITE_CacheSpill     0x00000020  /* OK to spill pager cache */
#define SQLITE_ShortColNames  0x00000040  /* Show short columns names */
#define SQLITE_TrustedSchema  0x00000080  /* Allow unsafe functions and
                                          ** vtabs in the schema definition */
#define SQLITE_NullCallback   0x00000100  /* Invoke the callback once if the */
                                          /*   result set is empty */
#define SQLITE_IgnoreChecks   0x00000200  /* Do not enforce check constraints */
#define SQLITE_ReadUncommit   0x00000400  /* READ UNCOMMITTED in shared-cache */
#define SQLITE_NoCkptOnClose  0x00000800  /* No checkpoint on close()/DETACH */
#define SQLITE_ReverseOrder   0x00001000  /* Reverse unordered SELECTs */
#define SQLITE_RecTriggers    0x00002000  /* Enable recursive triggers */
#define SQLITE_ForeignKeys    0x00004000  /* Enforce foreign key constraints  */
#define SQLITE_AutoIndex      0x00008000  /* Enable automatic indexes */
#define SQLITE_LoadExtension  0x00010000  /* Enable load_extension */
#define SQLITE_LoadExtFunc    0x00020000  /* Enable load_extension() SQL func */
#define SQLITE_EnableTrigger  0x00040000  /* True to enable triggers */
#define SQLITE_DeferFKs       0x00080000  /* Defer all FK constraints */
#define SQLITE_QueryOnly      0x00100000  /* Disable database changes */
#define SQLITE_CellSizeCk     0x00200000  /* Check btree cell sizes on load */
#define SQLITE_Fts3Tokenizer  0x00400000  /* Enable fts3_tokenizer(2) */
#define SQLITE_EnableQPSG     0x00800000  /* Query Planner Stability Guarantee*/
#define SQLITE_TriggerEQP     0x01000000  /* Show trigger EXPLAIN QUERY PLAN */
#define SQLITE_ResetDatabase  0x02000000  /* Reset the database */
#define SQLITE_LegacyAlter    0x04000000  /* Legacy ALTER TABLE behaviour */
#define SQLITE_NoSchemaError  0x08000000  /* Do not report schema parse errors*/
#define SQLITE_Defensive      0x10000000  /* Input SQL is likely hostile */
#define SQLITE_DqsDDL         0x20000000  /* dbl-quoted strings allowed in DDL*/
#define SQLITE_DqsDML         0x40000000  /* dbl-quoted strings allowed in DML*/
#define SQLITE_EnableView     0x80000000  /* Enable the use of views */
#define SQLITE_CountRows      HI(0x00001) /* Count rows changed by INSERT, */
                                          /*   DELETE, or UPDATE and return */
                                          /*   the count using a callback. */

/* Flags used only if debugging */
#ifdef SQLITE_DEBUG
#define SQLITE_SqlTrace       HI(0x0100000) /* Debug print SQL as it executes */
#define SQLITE_VdbeListing    HI(0x0200000) /* Debug listings of VDBE progs */
#define SQLITE_VdbeTrace      HI(0x0400000) /* True to trace VDBE execution */
#define SQLITE_VdbeAddopTrace HI(0x0800000) /* Trace sqlite3VdbeAddOp() calls */
#define SQLITE_VdbeEQP        HI(0x1000000) /* Debug EXPLAIN QUERY PLAN */
#define SQLITE_ParserTrace    HI(0x2000000) /* PRAGMA parser_trace=ON */
#endif

/*
** Allowed values for sqlite3.mDbFlags
*/
#define DBFLAG_SchemaChange   0x0001  /* Uncommitted Hash table changes */
#define DBFLAG_PreferBuiltin  0x0002  /* Preference to built-in funcs */
#define DBFLAG_Vacuum         0x0004  /* Currently in a VACUUM */
#define DBFLAG_VacuumInto     0x0008  /* Currently running VACUUM INTO */
#define DBFLAG_SchemaKnownOk  0x0010  /* Schema is known to be valid */
#define DBFLAG_InternalFunc   0x0020  /* Allow use of internal functions */
#define DBFLAG_EncodingFixed  0x0040  /* No longer possible to change enc. */

/*
** Bits of the sqlite3.dbOptFlags field that are used by the
** sqlite3_test_control(SQLITE_TESTCTRL_OPTIMIZATIONS,...) interface to
** selectively disable various optimizations.
*/
#define SQLITE_QueryFlattener 0x0001   /* Query flattening */
#define SQLITE_WindowFunc     0x0002   /* Use xInverse for window functions */
#define SQLITE_GroupByOrder   0x0004   /* GROUPBY cover of ORDERBY */
#define SQLITE_FactorOutConst 0x0008   /* Constant factoring */
#define SQLITE_DistinctOpt    0x0010   /* DISTINCT using indexes */
#define SQLITE_CoverIdxScan   0x0020   /* Covering index scans */
#define SQLITE_OrderByIdxJoin 0x0040   /* ORDER BY of joins via index */
#define SQLITE_Transitive     0x0080   /* Transitive constraints */
#define SQLITE_OmitNoopJoin   0x0100   /* Omit unused tables in joins */
#define SQLITE_CountOfView    0x0200   /* The count-of-view optimization */
#define SQLITE_CursorHints    0x0400   /* Add OP_CursorHint opcodes */
#define SQLITE_Stat4          0x0800   /* Use STAT4 data */
   /* TH3 expects the Stat4   ^^^^^^ value to be 0x0800.  Don't change it */
#define SQLITE_PushDown       0x1000   /* The push-down optimization */
#define SQLITE_SimplifyJoin   0x2000   /* Convert LEFT JOIN to JOIN */
#define SQLITE_SkipScan       0x4000   /* Skip-scans */
#define SQLITE_PropagateConst 0x8000   /* The constant propagation opt */
#define SQLITE_AllOpts        0xffff   /* All optimizations */

/*
** Macros for testing whether or not optimizations are enabled or disabled.
*/
#define OptimizationDisabled(db, mask)  (((db)->dbOptFlags&(mask))!=0)
#define OptimizationEnabled(db, mask)   (((db)->dbOptFlags&(mask))==0)

/*
** Return true if it OK to factor constant expressions into the initialization
** code. The argument is a Parse object for the code generator.
*/
#define ConstFactorOk(P) ((P)->okConstFactor)

/*
** Possible values for the sqlite.magic field.
** The numbers are obtained at random and have no special meaning, other
** than being distinct from one another.
*/
#define SQLITE_MAGIC_OPEN     0xa029a697  /* Database is open */
#define SQLITE_MAGIC_CLOSED   0x9f3c2d33  /* Database is closed */
#define SQLITE_MAGIC_SICK     0x4b771290  /* Error and awaiting close */
#define SQLITE_MAGIC_BUSY     0xf03b7906  /* Database currently in use */
#define SQLITE_MAGIC_ERROR    0xb5357930  /* An SQLITE_MISUSE error occurred */
#define SQLITE_MAGIC_ZOMBIE   0x64cffc7f  /* Close with last statement close */

/*
** Each SQL function is defined by an instance of the following
** structure.  For global built-in functions (ex: substr(), max(), count())
** a pointer to this structure is held in the sqlite3BuiltinFunctions object.
** For per-connection application-defined functions, a pointer to this
** structure is held in the db->aHash hash table.
**
** The u.pHash field is used by the global built-ins.  The u.pDestructor
** field is used by per-connection app-def functions.
*/
struct FuncDef {
  i8 nArg;             /* Number of arguments.  -1 means unlimited */
  u32 funcFlags;       /* Some combination of SQLITE_FUNC_* */
  void *pUserData;     /* User data parameter */
  FuncDef *pNext;      /* Next function with same name */
  void (*xSFunc)(sqlite3_context*,int,sqlite3_value**); /* func or agg-step */
  void (*xFinalize)(sqlite3_context*);                  /* Agg finalizer */
  void (*xValue)(sqlite3_context*);                     /* Current agg value */
  void (*xInverse)(sqlite3_context*,int,sqlite3_value**); /* inverse agg-step */
  const char *zName;   /* SQL name of the function. */
  union {
    FuncDef *pHash;      /* Next with a different name but the same hash */
    FuncDestructor *pDestructor;   /* Reference counted destructor function */
  } u;
};

/*
** This structure encapsulates a user-function destructor callback (as
** configured using create_function_v2()) and a reference counter. When
** create_function_v2() is called to create a function with a destructor,
** a single object of this type is allocated. FuncDestructor.nRef is set to
** the number of FuncDef objects created (either 1 or 3, depending on whether
** or not the specified encoding is SQLITE_ANY). The FuncDef.pDestructor
** member of each of the new FuncDef objects is set to point to the allocated
** FuncDestructor.
**
** Thereafter, when one of the FuncDef objects is deleted, the reference
** count on this object is decremented. When it reaches 0, the destructor
** is invoked and the FuncDestructor structure freed.
*/
struct FuncDestructor {
  int nRef;
  void (*xDestroy)(void *);
  void *pUserData;
};

/*
** Possible values for FuncDef.flags.  Note that the _LENGTH and _TYPEOF
** values must correspond to OPFLAG_LENGTHARG and OPFLAG_TYPEOFARG.  And
** SQLITE_FUNC_CONSTANT must be the same as SQLITE_DETERMINISTIC.  There
** are assert() statements in the code to verify this.
**
** Value constraints (enforced via assert()):
**     SQLITE_FUNC_MINMAX    ==  NC_MinMaxAgg      == SF_MinMaxAgg
**     SQLITE_FUNC_LENGTH    ==  OPFLAG_LENGTHARG
**     SQLITE_FUNC_TYPEOF    ==  OPFLAG_TYPEOFARG
**     SQLITE_FUNC_CONSTANT  ==  SQLITE_DETERMINISTIC from the API
**     SQLITE_FUNC_DIRECT    ==  SQLITE_DIRECTONLY from the API
**     SQLITE_FUNC_UNSAFE    ==  SQLITE_INNOCUOUS
**     SQLITE_FUNC_ENCMASK   depends on SQLITE_UTF* macros in the API
*/
#define SQLITE_FUNC_ENCMASK  0x0003 /* SQLITE_UTF8, SQLITE_UTF16BE or UTF16LE */
#define SQLITE_FUNC_LIKE     0x0004 /* Candidate for the LIKE optimization */
#define SQLITE_FUNC_CASE     0x0008 /* Case-sensitive LIKE-type function */
#define SQLITE_FUNC_EPHEM    0x0010 /* Ephemeral.  Delete with VDBE */
#define SQLITE_FUNC_NEEDCOLL 0x0020 /* sqlite3GetFuncCollSeq() might be called*/
#define SQLITE_FUNC_LENGTH   0x0040 /* Built-in length() function */
#define SQLITE_FUNC_TYPEOF   0x0080 /* Built-in typeof() function */
#define SQLITE_FUNC_COUNT    0x0100 /* Built-in count(*) aggregate */
/*                           0x0200 -- available for reuse */
#define SQLITE_FUNC_UNLIKELY 0x0400 /* Built-in unlikely() function */
#define SQLITE_FUNC_CONSTANT 0x0800 /* Constant inputs give a constant output */
#define SQLITE_FUNC_MINMAX   0x1000 /* True for min() and max() aggregates */
#define SQLITE_FUNC_SLOCHNG  0x2000 /* "Slow Change". Value constant during a
                                    ** single query - might change over time */
#define SQLITE_FUNC_TEST     0x4000 /* Built-in testing functions */
#define SQLITE_FUNC_OFFSET   0x8000 /* Built-in sqlite_offset() function */
#define SQLITE_FUNC_WINDOW   0x00010000 /* Built-in window-only function */
#define SQLITE_FUNC_INTERNAL 0x00040000 /* For use by NestedParse() only */
#define SQLITE_FUNC_DIRECT   0x00080000 /* Not for use in TRIGGERs or VIEWs */
#define SQLITE_FUNC_SUBTYPE  0x00100000 /* Result likely to have sub-type */
#define SQLITE_FUNC_UNSAFE   0x00200000 /* Function has side effects */
#define SQLITE_FUNC_INLINE   0x00400000 /* Functions implemented in-line */

/* Identifier numbers for each in-line function */
#define INLINEFUNC_coalesce             0
#define INLINEFUNC_implies_nonnull_row  1
#define INLINEFUNC_expr_implies_expr    2
#define INLINEFUNC_expr_compare         3      
#define INLINEFUNC_affinity             4
#define INLINEFUNC_iif                  5
#define INLINEFUNC_unlikely            99  /* Default case */

/*
** The following three macros, FUNCTION(), LIKEFUNC() and AGGREGATE() are
** used to create the initializers for the FuncDef structures.
**
**   FUNCTION(zName, nArg, iArg, bNC, xFunc)
**     Used to create a scalar function definition of a function zName
**     implemented by C function xFunc that accepts nArg arguments. The
**     value passed as iArg is cast to a (void*) and made available
**     as the user-data (sqlite3_user_data()) for the function. If
**     argument bNC is true, then the SQLITE_FUNC_NEEDCOLL flag is set.
**
**   VFUNCTION(zName, nArg, iArg, bNC, xFunc)
**     Like FUNCTION except it omits the SQLITE_FUNC_CONSTANT flag.
**
**   SFUNCTION(zName, nArg, iArg, bNC, xFunc)
**     Like FUNCTION except it omits the SQLITE_FUNC_CONSTANT flag and
**     adds the SQLITE_DIRECTONLY flag.
**
**   INLINE_FUNC(zName, nArg, iFuncId, mFlags)
**     zName is the name of a function that is implemented by in-line
**     byte code rather than by the usual callbacks. The iFuncId
**     parameter determines the function id.  The mFlags parameter is
**     optional SQLITE_FUNC_ flags for this function.
**
**   TEST_FUNC(zName, nArg, iFuncId, mFlags)
**     zName is the name of a test-only function implemented by in-line
**     byte code rather than by the usual callbacks. The iFuncId
**     parameter determines the function id.  The mFlags parameter is
**     optional SQLITE_FUNC_ flags for this function.
**
**   DFUNCTION(zName, nArg, iArg, bNC, xFunc)
**     Like FUNCTION except it omits the SQLITE_FUNC_CONSTANT flag and
**     adds the SQLITE_FUNC_SLOCHNG flag.  Used for date & time functions
**     and functions like sqlite_version() that can change, but not during
**     a single query.  The iArg is ignored.  The user-data is always set
**     to a NULL pointer.  The bNC parameter is not used.
**
**   PURE_DATE(zName, nArg, iArg, bNC, xFunc)
**     Used for "pure" date/time functions, this macro is like DFUNCTION
**     except that it does set the SQLITE_FUNC_CONSTANT flags.  iArg is
**     ignored and the user-data for these functions is set to an 
**     arbitrary non-NULL pointer.  The bNC parameter is not used.
**
**   AGGREGATE(zName, nArg, iArg, bNC, xStep, xFinal)
**     Used to create an aggregate function definition implemented by
**     the C functions xStep and xFinal. The first four parameters
**     are interpreted in the same way as the first 4 parameters to
**     FUNCTION().
**
**   WFUNCTION(zName, nArg, iArg, xStep, xFinal, xValue, xInverse)
**     Used to create an aggregate function definition implemented by
**     the C functions xStep and xFinal. The first four parameters
**     are interpreted in the same way as the first 4 parameters to
**     FUNCTION().
**
**   LIKEFUNC(zName, nArg, pArg, flags)
**     Used to create a scalar function definition of a function zName
**     that accepts nArg arguments and is implemented by a call to C
**     function likeFunc. Argument pArg is cast to a (void *) and made
**     available as the function user-data (sqlite3_user_data()). The
**     FuncDef.flags variable is set to the value passed as the flags
**     parameter.
*/
#define FUNCTION(zName, nArg, iArg, bNC, xFunc) \
  {nArg, SQLITE_FUNC_CONSTANT|SQLITE_UTF8|(bNC*SQLITE_FUNC_NEEDCOLL), \
   SQLITE_INT_TO_PTR(iArg), 0, xFunc, 0, 0, 0, #zName, {0} }
#define VFUNCTION(zName, nArg, iArg, bNC, xFunc) \
  {nArg, SQLITE_UTF8|(bNC*SQLITE_FUNC_NEEDCOLL), \
   SQLITE_INT_TO_PTR(iArg), 0, xFunc, 0, 0, 0, #zName, {0} }
#define SFUNCTION(zName, nArg, iArg, bNC, xFunc) \
  {nArg, SQLITE_UTF8|SQLITE_DIRECTONLY|SQLITE_FUNC_UNSAFE, \
   SQLITE_INT_TO_PTR(iArg), 0, xFunc, 0, 0, 0, #zName, {0} }
#define INLINE_FUNC(zName, nArg, iArg, mFlags) \
  {nArg, SQLITE_UTF8|SQLITE_FUNC_INLINE|SQLITE_FUNC_CONSTANT|(mFlags), \
   SQLITE_INT_TO_PTR(iArg), 0, noopFunc, 0, 0, 0, #zName, {0} }
#define TEST_FUNC(zName, nArg, iArg, mFlags) \
  {nArg, SQLITE_UTF8|SQLITE_FUNC_INTERNAL|SQLITE_FUNC_TEST| \
         SQLITE_FUNC_INLINE|SQLITE_FUNC_CONSTANT|(mFlags), \
   SQLITE_INT_TO_PTR(iArg), 0, noopFunc, 0, 0, 0, #zName, {0} }
#define DFUNCTION(zName, nArg, iArg, bNC, xFunc) \
  {nArg, SQLITE_FUNC_SLOCHNG|SQLITE_UTF8, \
   0, 0, xFunc, 0, 0, 0, #zName, {0} }
#define PURE_DATE(zName, nArg, iArg, bNC, xFunc) \
  {nArg, SQLITE_FUNC_SLOCHNG|SQLITE_UTF8|SQLITE_FUNC_CONSTANT, \
   (void*)&sqlite3Config, 0, xFunc, 0, 0, 0, #zName, {0} }
#define FUNCTION2(zName, nArg, iArg, bNC, xFunc, extraFlags) \
  {nArg,SQLITE_FUNC_CONSTANT|SQLITE_UTF8|(bNC*SQLITE_FUNC_NEEDCOLL)|extraFlags,\
   SQLITE_INT_TO_PTR(iArg), 0, xFunc, 0, 0, 0, #zName, {0} }
#define STR_FUNCTION(zName, nArg, pArg, bNC, xFunc) \
  {nArg, SQLITE_FUNC_SLOCHNG|SQLITE_UTF8|(bNC*SQLITE_FUNC_NEEDCOLL), \
   pArg, 0, xFunc, 0, 0, 0, #zName, }
#define LIKEFUNC(zName, nArg, arg, flags) \
  {nArg, SQLITE_FUNC_CONSTANT|SQLITE_UTF8|flags, \
   (void *)arg, 0, likeFunc, 0, 0, 0, #zName, {0} }
#define WAGGREGATE(zName, nArg, arg, nc, xStep, xFinal, xValue, xInverse, f) \
  {nArg, SQLITE_UTF8|(nc*SQLITE_FUNC_NEEDCOLL)|f, \
   SQLITE_INT_TO_PTR(arg), 0, xStep,xFinal,xValue,xInverse,#zName, {0}}
#define INTERNAL_FUNCTION(zName, nArg, xFunc) \
  {nArg, SQLITE_FUNC_INTERNAL|SQLITE_UTF8|SQLITE_FUNC_CONSTANT, \
   0, 0, xFunc, 0, 0, 0, #zName, {0} }


/*
** All current savepoints are stored in a linked list starting at
** sqlite3.pSavepoint. The first element in the list is the most recently
** opened savepoint. Savepoints are added to the list by the vdbe
** OP_Savepoint instruction.
*/
struct Savepoint {
  char *zName;                        /* Savepoint name (nul-terminated) */
  i64 nDeferredCons;                  /* Number of deferred fk violations */
  i64 nDeferredImmCons;               /* Number of deferred imm fk. */
  Savepoint *pNext;                   /* Parent savepoint (if any) */
};

/*
** The following are used as the second parameter to sqlite3Savepoint(),
** and as the P1 argument to the OP_Savepoint instruction.
*/
#define SAVEPOINT_BEGIN      0
#define SAVEPOINT_RELEASE    1
#define SAVEPOINT_ROLLBACK   2


/*
** Each SQLite module (virtual table definition) is defined by an
** instance of the following structure, stored in the sqlite3.aModule
** hash table.
*/
struct Module {
  const sqlite3_module *pModule;       /* Callback pointers */
  const char *zName;                   /* Name passed to create_module() */
  int nRefModule;                      /* Number of pointers to this object */
  void *pAux;                          /* pAux passed to create_module() */
  void (*xDestroy)(void *);            /* Module destructor function */
  Table *pEpoTab;                      /* Eponymous table for this module */
};

/*
** Information about each column of an SQL table is held in an instance
** of the Column structure, in the Table.aCol[] array.
**
** Definitions:
**
**   "table column index"     This is the index of the column in the
**                            Table.aCol[] array, and also the index of
**                            the column in the original CREATE TABLE stmt.
**
**   "storage column index"   This is the index of the column in the
**                            record BLOB generated by the OP_MakeRecord
**                            opcode.  The storage column index is less than
**                            or equal to the table column index.  It is
**                            equal if and only if there are no VIRTUAL
**                            columns to the left.
*/
struct Column {
  char *zName;     /* Name of this column, \000, then the type */
  Expr *pDflt;     /* Default value or GENERATED ALWAYS AS value */
  char *zColl;     /* Collating sequence.  If NULL, use the default */
  u8 notNull;      /* An OE_ code for handling a NOT NULL constraint */
  char affinity;   /* One of the SQLITE_AFF_... values */
  u8 szEst;        /* Estimated size of value in this column. sizeof(INT)==1 */
  u8 hName;        /* Column name hash for faster lookup */
  u16 colFlags;    /* Boolean properties.  See COLFLAG_ defines below */
};

/* Allowed values for Column.colFlags:
*/
#define COLFLAG_PRIMKEY   0x0001   /* Column is part of the primary key */
#define COLFLAG_HIDDEN    0x0002   /* A hidden column in a virtual table */
#define COLFLAG_HASTYPE   0x0004   /* Type name follows column name */
#define COLFLAG_UNIQUE    0x0008   /* Column def contains "UNIQUE" or "PK" */
#define COLFLAG_SORTERREF 0x0010   /* Use sorter-refs with this column */
#define COLFLAG_VIRTUAL   0x0020   /* GENERATED ALWAYS AS ... VIRTUAL */
#define COLFLAG_STORED    0x0040   /* GENERATED ALWAYS AS ... STORED */
#define COLFLAG_NOTAVAIL  0x0080   /* STORED column not yet calculated */
#define COLFLAG_BUSY      0x0100   /* Blocks recursion on GENERATED columns */
#define COLFLAG_GENERATED 0x0060   /* Combo: _STORED, _VIRTUAL */
#define COLFLAG_NOINSERT  0x0062   /* Combo: _HIDDEN, _STORED, _VIRTUAL */

/*
** A "Collating Sequence" is defined by an instance of the following
** structure. Conceptually, a collating sequence consists of a name and
** a comparison routine that defines the order of that sequence.
**
** If CollSeq.xCmp is NULL, it means that the
** collating sequence is undefined.  Indices built on an undefined
** collating sequence may not be read or written.
*/
struct CollSeq {
  char *zName;          /* Name of the collating sequence, UTF-8 encoded */
  u8 enc;               /* Text encoding handled by xCmp() */
  void *pUser;          /* First argument to xCmp() */
  int (*xCmp)(void*,int, const void*, int, const void*);
  void (*xDel)(void*);  /* Destructor for pUser */
};

/*
** A sort order can be either ASC or DESC.
*/
#define SQLITE_SO_ASC       0  /* Sort in ascending order */
#define SQLITE_SO_DESC      1  /* Sort in ascending order */
#define SQLITE_SO_UNDEFINED -1 /* No sort order specified */

/*
** Column affinity types.
**
** These used to have mnemonic name like 'i' for SQLITE_AFF_INTEGER and
** 't' for SQLITE_AFF_TEXT.  But we can save a little space and improve
** the speed a little by numbering the values consecutively.
**
** But rather than start with 0 or 1, we begin with 'A'.  That way,
** when multiple affinity types are concatenated into a string and
** used as the P4 operand, they will be more readable.
**
** Note also that the numeric types are grouped together so that testing
** for a numeric type is a single comparison.  And the BLOB type is first.
*/
#define SQLITE_AFF_NONE     0x40  /* '@' */
#define SQLITE_AFF_BLOB     0x41  /* 'A' */
#define SQLITE_AFF_TEXT     0x42  /* 'B' */
#define SQLITE_AFF_NUMERIC  0x43  /* 'C' */
#define SQLITE_AFF_INTEGER  0x44  /* 'D' */
#define SQLITE_AFF_REAL     0x45  /* 'E' */

#define sqlite3IsNumericAffinity(X)  ((X)>=SQLITE_AFF_NUMERIC)

/*
** The SQLITE_AFF_MASK values masks off the significant bits of an
** affinity value.
*/
#define SQLITE_AFF_MASK     0x47

/*
** Additional bit values that can be ORed with an affinity without
** changing the affinity.
**
** The SQLITE_NOTNULL flag is a combination of NULLEQ and JUMPIFNULL.
** It causes an assert() to fire if either operand to a comparison
** operator is NULL.  It is added to certain comparison operators to
** prove that the operands are always NOT NULL.
*/
#define SQLITE_KEEPNULL     0x08  /* Used by vector == or <> */
#define SQLITE_JUMPIFNULL   0x10  /* jumps if either operand is NULL */
#define SQLITE_STOREP2      0x20  /* Store result in reg[P2] rather than jump */
#define SQLITE_NULLEQ       0x80  /* NULL=NULL */
#define SQLITE_NOTNULL      0x90  /* Assert that operands are never NULL */

/*
** An object of this type is created for each virtual table present in
** the database schema.
**
** If the database schema is shared, then there is one instance of this
** structure for each database connection (sqlite3*) that uses the shared
** schema. This is because each database connection requires its own unique
** instance of the sqlite3_vtab* handle used to access the virtual table
** implementation. sqlite3_vtab* handles can not be shared between
** database connections, even when the rest of the in-memory database
** schema is shared, as the implementation often stores the database
** connection handle passed to it via the xConnect() or xCreate() method
** during initialization internally. This database connection handle may
** then be used by the virtual table implementation to access real tables
** within the database. So that they appear as part of the callers
** transaction, these accesses need to be made via the same database
** connection as that used to execute SQL operations on the virtual table.
**
** All VTable objects that correspond to a single table in a shared
** database schema are initially stored in a linked-list pointed to by
** the Table.pVTable member variable of the corresponding Table object.
** When an sqlite3_prepare() operation is required to access the virtual
** table, it searches the list for the VTable that corresponds to the
** database connection doing the preparing so as to use the correct
** sqlite3_vtab* handle in the compiled query.
**
** When an in-memory Table object is deleted (for example when the
** schema is being reloaded for some reason), the VTable objects are not
** deleted and the sqlite3_vtab* handles are not xDisconnect()ed
** immediately. Instead, they are moved from the Table.pVTable list to
** another linked list headed by the sqlite3.pDisconnect member of the
** corresponding sqlite3 structure. They are then deleted/xDisconnected
** next time a statement is prepared using said sqlite3*. This is done
** to avoid deadlock issues involving multiple sqlite3.mutex mutexes.
** Refer to comments above function sqlite3VtabUnlockList() for an
** explanation as to why it is safe to add an entry to an sqlite3.pDisconnect
** list without holding the corresponding sqlite3.mutex mutex.
**
** The memory for objects of this type is always allocated by
** sqlite3DbMalloc(), using the connection handle stored in VTable.db as
** the first argument.
*/
struct VTable {
  sqlite3 *db;              /* Database connection associated with this table */
  Module *pMod;             /* Pointer to module implementation */
  sqlite3_vtab *pVtab;      /* Pointer to vtab instance */
  int nRef;                 /* Number of pointers to this structure */
  u8 bConstraint;           /* True if constraints are supported */
  u8 eVtabRisk;             /* Riskiness of allowing hacker access */
  int iSavepoint;           /* Depth of the SAVEPOINT stack */
  VTable *pNext;            /* Next in linked list (see above) */
};

/* Allowed values for VTable.eVtabRisk
*/
#define SQLITE_VTABRISK_Low          0
#define SQLITE_VTABRISK_Normal       1
#define SQLITE_VTABRISK_High         2

/*
** The schema for each SQL table and view is represented in memory
** by an instance of the following structure.
*/
struct Table {
  char *zName;         /* Name of the table or view */
  Column *aCol;        /* Information about each column */
  Index *pIndex;       /* List of SQL indexes on this table. */
  Select *pSelect;     /* NULL for tables.  Points to definition if a view. */
  FKey *pFKey;         /* Linked list of all foreign keys in this table */
  char *zColAff;       /* String defining the affinity of each column */
  ExprList *pCheck;    /* All CHECK constraints */
                       /*   ... also used as column name list in a VIEW */
  Pgno tnum;           /* Root BTree page for this table */
  u32 nTabRef;         /* Number of pointers to this Table */
  u32 tabFlags;        /* Mask of TF_* values */
  i16 iPKey;           /* If not negative, use aCol[iPKey] as the rowid */
  i16 nCol;            /* Number of columns in this table */
  i16 nNVCol;          /* Number of columns that are not VIRTUAL */
  LogEst nRowLogEst;   /* Estimated rows in table - from sqlite_stat1 table */
  LogEst szTabRow;     /* Estimated size of each table row in bytes */
#ifdef SQLITE_ENABLE_COSTMULT
  LogEst costMult;     /* Cost multiplier for using this table */
#endif
  u8 keyConf;          /* What to do in case of uniqueness conflict on iPKey */
#ifndef SQLITE_OMIT_ALTERTABLE
  int addColOffset;    /* Offset in CREATE TABLE stmt to add a new column */
#endif
#ifndef SQLITE_OMIT_VIRTUALTABLE
  int nModuleArg;      /* Number of arguments to the module */
  char **azModuleArg;  /* 0: module 1: schema 2: vtab name 3...: args */
  VTable *pVTable;     /* List of VTable objects. */
#endif
  Trigger *pTrigger;   /* List of triggers stored in pSchema */
  Schema *pSchema;     /* Schema that contains this table */
  Table *pNextZombie;  /* Next on the Parse.pZombieTab list */
};

/*
** Allowed values for Table.tabFlags.
**
** TF_OOOHidden applies to tables or view that have hidden columns that are
** followed by non-hidden columns.  Example:  "CREATE VIRTUAL TABLE x USING
** vtab1(a HIDDEN, b);".  Since "b" is a non-hidden column but "a" is hidden,
** the TF_OOOHidden attribute would apply in this case.  Such tables require
** special handling during INSERT processing. The "OOO" means "Out Of Order".
**
** Constraints:
**
**         TF_HasVirtual == COLFLAG_Virtual
**         TF_HasStored  == COLFLAG_Stored
*/
#define TF_Readonly        0x0001    /* Read-only system table */
#define TF_Ephemeral       0x0002    /* An ephemeral table */
#define TF_HasPrimaryKey   0x0004    /* Table has a primary key */
#define TF_Autoincrement   0x0008    /* Integer primary key is autoincrement */
#define TF_HasStat1        0x0010    /* nRowLogEst set from sqlite_stat1 */
#define TF_HasVirtual      0x0020    /* Has one or more VIRTUAL columns */
#define TF_HasStored       0x0040    /* Has one or more STORED columns */
#define TF_HasGenerated    0x0060    /* Combo: HasVirtual + HasStored */
#define TF_WithoutRowid    0x0080    /* No rowid.  PRIMARY KEY is the key */
#define TF_StatsUsed       0x0100    /* Query planner decisions affected by
                                     ** Index.aiRowLogEst[] values */
#define TF_NoVisibleRowid  0x0200    /* No user-visible "rowid" column */
#define TF_OOOHidden       0x0400    /* Out-of-Order hidden columns */
#define TF_HasNotNull      0x0800    /* Contains NOT NULL constraints */
#define TF_Shadow          0x1000    /* True for a shadow table */

/*
** Test to see whether or not a table is a virtual table.  This is
** done as a macro so that it will be optimized out when virtual
** table support is omitted from the build.
*/
#ifndef SQLITE_OMIT_VIRTUALTABLE
#  define IsVirtual(X)      ((X)->nModuleArg)
#  define ExprIsVtab(X)  \
              ((X)->op==TK_COLUMN && (X)->y.pTab!=0 && (X)->y.pTab->nModuleArg)
#else
#  define IsVirtual(X)      0
#  define ExprIsVtab(X)     0
#endif

/*
** Macros to determine if a column is hidden.  IsOrdinaryHiddenColumn()
** only works for non-virtual tables (ordinary tables and views) and is
** always false unless SQLITE_ENABLE_HIDDEN_COLUMNS is defined.  The
** IsHiddenColumn() macro is general purpose.
*/
#if defined(SQLITE_ENABLE_HIDDEN_COLUMNS)
#  define IsHiddenColumn(X)         (((X)->colFlags & COLFLAG_HIDDEN)!=0)
#  define IsOrdinaryHiddenColumn(X) (((X)->colFlags & COLFLAG_HIDDEN)!=0)
#elif !defined(SQLITE_OMIT_VIRTUALTABLE)
#  define IsHiddenColumn(X)         (((X)->colFlags & COLFLAG_HIDDEN)!=0)
#  define IsOrdinaryHiddenColumn(X) 0
#else
#  define IsHiddenColumn(X)         0
#  define IsOrdinaryHiddenColumn(X) 0
#endif


/* Does the table have a rowid */
#define HasRowid(X)     (((X)->tabFlags & TF_WithoutRowid)==0)
#define VisibleRowid(X) (((X)->tabFlags & TF_NoVisibleRowid)==0)

/*
** Each foreign key constraint is an instance of the following structure.
**
** A foreign key is associated with two tables.  The "from" table is
** the table that contains the REFERENCES clause that creates the foreign
** key.  The "to" table is the table that is named in the REFERENCES clause.
** Consider this example:
**
**     CREATE TABLE ex1(
**       a INTEGER PRIMARY KEY,
**       b INTEGER CONSTRAINT fk1 REFERENCES ex2(x)
**     );
**
** For foreign key "fk1", the from-table is "ex1" and the to-table is "ex2".
** Equivalent names:
**
**     from-table == child-table
**       to-table == parent-table
**
** Each REFERENCES clause generates an instance of the following structure
** which is attached to the from-table.  The to-table need not exist when
** the from-table is created.  The existence of the to-table is not checked.
**
** The list of all parents for child Table X is held at X.pFKey.
**
** A list of all children for a table named Z (which might not even exist)
** is held in Schema.fkeyHash with a hash key of Z.
*/
struct FKey {
  Table *pFrom;     /* Table containing the REFERENCES clause (aka: Child) */
  FKey *pNextFrom;  /* Next FKey with the same in pFrom. Next parent of pFrom */
  char *zTo;        /* Name of table that the key points to (aka: Parent) */
  FKey *pNextTo;    /* Next with the same zTo. Next child of zTo. */
  FKey *pPrevTo;    /* Previous with the same zTo */
  int nCol;         /* Number of columns in this key */
  /* EV: R-30323-21917 */
  u8 isDeferred;       /* True if constraint checking is deferred till COMMIT */
  u8 aAction[2];        /* ON DELETE and ON UPDATE actions, respectively */
  Trigger *apTrigger[2];/* Triggers for aAction[] actions */
  struct sColMap {      /* Mapping of columns in pFrom to columns in zTo */
    int iFrom;            /* Index of column in pFrom */
    char *zCol;           /* Name of column in zTo.  If NULL use PRIMARY KEY */
  } aCol[1];            /* One entry for each of nCol columns */
};

/*
** SQLite supports many different ways to resolve a constraint
** error.  ROLLBACK processing means that a constraint violation
** causes the operation in process to fail and for the current transaction
** to be rolled back.  ABORT processing means the operation in process
** fails and any prior changes from that one operation are backed out,
** but the transaction is not rolled back.  FAIL processing means that
** the operation in progress stops and returns an error code.  But prior
** changes due to the same operation are not backed out and no rollback
** occurs.  IGNORE means that the particular row that caused the constraint
** error is not inserted or updated.  Processing continues and no error
** is returned.  REPLACE means that preexisting database rows that caused
** a UNIQUE constraint violation are removed so that the new insert or
** update can proceed.  Processing continues and no error is reported.
**
** RESTRICT, SETNULL, and CASCADE actions apply only to foreign keys.
** RESTRICT is the same as ABORT for IMMEDIATE foreign keys and the
** same as ROLLBACK for DEFERRED keys.  SETNULL means that the foreign
** key is set to NULL.  CASCADE means that a DELETE or UPDATE of the
** referenced table row is propagated into the row that holds the
** foreign key.
**
** The following symbolic values are used to record which type
** of action to take.
*/
#define OE_None     0   /* There is no constraint to check */
#define OE_Rollback 1   /* Fail the operation and rollback the transaction */
#define OE_Abort    2   /* Back out changes but do no rollback transaction */
#define OE_Fail     3   /* Stop the operation but leave all prior changes */
#define OE_Ignore   4   /* Ignore the error. Do not do the INSERT or UPDATE */
#define OE_Replace  5   /* Delete existing record, then do INSERT or UPDATE */
#define OE_Update   6   /* Process as a DO UPDATE in an upsert */
#define OE_Restrict 7   /* OE_Abort for IMMEDIATE, OE_Rollback for DEFERRED */
#define OE_SetNull  8   /* Set the foreign key value to NULL */
#define OE_SetDflt  9   /* Set the foreign key value to its default */
#define OE_Cascade  10  /* Cascade the changes */
#define OE_Default  11  /* Do whatever the default action is */


/*
** An instance of the following structure is passed as the first
** argument to sqlite3VdbeKeyCompare and is used to control the
** comparison of the two index keys.
**
** Note that aSortOrder[] and aColl[] have nField+1 slots.  There
** are nField slots for the columns of an index then one extra slot
** for the rowid at the end.
*/
struct KeyInfo {
  u32 nRef;           /* Number of references to this KeyInfo object */
  u8 enc;             /* Text encoding - one of the SQLITE_UTF* values */
  u16 nKeyField;      /* Number of key columns in the index */
  u16 nAllField;      /* Total columns, including key plus others */
  sqlite3 *db;        /* The database connection */
  u8 *aSortFlags;     /* Sort order for each column. */
  CollSeq *aColl[1];  /* Collating sequence for each term of the key */
};

/*
** Allowed bit values for entries in the KeyInfo.aSortFlags[] array.
*/
#define KEYINFO_ORDER_DESC    0x01    /* DESC sort order */
#define KEYINFO_ORDER_BIGNULL 0x02    /* NULL is larger than any other value */

/*
** This object holds a record which has been parsed out into individual
** fields, for the purposes of doing a comparison.
**
** A record is an object that contains one or more fields of data.
** Records are used to store the content of a table row and to store
** the key of an index.  A blob encoding of a record is created by
** the OP_MakeRecord opcode of the VDBE and is disassembled by the
** OP_Column opcode.
**
** An instance of this object serves as a "key" for doing a search on
** an index b+tree. The goal of the search is to find the entry that
** is closed to the key described by this object.  This object might hold
** just a prefix of the key.  The number of fields is given by
** pKeyInfo->nField.
**
** The r1 and r2 fields are the values to return if this key is less than
** or greater than a key in the btree, respectively.  These are normally
** -1 and +1 respectively, but might be inverted to +1 and -1 if the b-tree
** is in DESC order.
**
** The key comparison functions actually return default_rc when they find
** an equals comparison.  default_rc can be -1, 0, or +1.  If there are
** multiple entries in the b-tree with the same key (when only looking
** at the first pKeyInfo->nFields,) then default_rc can be set to -1 to
** cause the search to find the last match, or +1 to cause the search to
** find the first match.
**
** The key comparison functions will set eqSeen to true if they ever
** get and equal results when comparing this structure to a b-tree record.
** When default_rc!=0, the search might end up on the record immediately
** before the first match or immediately after the last match.  The
** eqSeen field will indicate whether or not an exact match exists in the
** b-tree.
*/
struct UnpackedRecord {
  KeyInfo *pKeyInfo;  /* Collation and sort-order information */
  Mem *aMem;          /* Values */
  u16 nField;         /* Number of entries in apMem[] */
  i8 default_rc;      /* Comparison result if keys are equal */
  u8 errCode;         /* Error detected by xRecordCompare (CORRUPT or NOMEM) */
  i8 r1;              /* Value to return if (lhs < rhs) */
  i8 r2;              /* Value to return if (lhs > rhs) */
  u8 eqSeen;          /* True if an equality comparison has been seen */
};


/*
** Each SQL index is represented in memory by an
** instance of the following structure.
**
** The columns of the table that are to be indexed are described
** by the aiColumn[] field of this structure.  For example, suppose
** we have the following table and index:
**
**     CREATE TABLE Ex1(c1 int, c2 int, c3 text);
**     CREATE INDEX Ex2 ON Ex1(c3,c1);
**
** In the Table structure describing Ex1, nCol==3 because there are
** three columns in the table.  In the Index structure describing
** Ex2, nColumn==2 since 2 of the 3 columns of Ex1 are indexed.
** The value of aiColumn is {2, 0}.  aiColumn[0]==2 because the
** first column to be indexed (c3) has an index of 2 in Ex1.aCol[].
** The second column to be indexed (c1) has an index of 0 in
** Ex1.aCol[], hence Ex2.aiColumn[1]==0.
**
** The Index.onError field determines whether or not the indexed columns
** must be unique and what to do if they are not.  When Index.onError=OE_None,
** it means this is not a unique index.  Otherwise it is a unique index
** and the value of Index.onError indicate the which conflict resolution
** algorithm to employ whenever an attempt is made to insert a non-unique
** element.
**
** While parsing a CREATE TABLE or CREATE INDEX statement in order to
** generate VDBE code (as opposed to parsing one read from an sqlite_schema
** table as part of parsing an existing database schema), transient instances
** of this structure may be created. In this case the Index.tnum variable is
** used to store the address of a VDBE instruction, not a database page
** number (it cannot - the database page is not allocated until the VDBE
** program is executed). See convertToWithoutRowidTable() for details.
*/
struct Index {
  char *zName;             /* Name of this index */
  i16 *aiColumn;           /* Which columns are used by this index.  1st is 0 */
  LogEst *aiRowLogEst;     /* From ANALYZE: Est. rows selected by each column */
  Table *pTable;           /* The SQL table being indexed */
  char *zColAff;           /* String defining the affinity of each column */
  Index *pNext;            /* The next index associated with the same table */
  Schema *pSchema;         /* Schema containing this index */
  u8 *aSortOrder;          /* for each column: True==DESC, False==ASC */
  const char **azColl;     /* Array of collation sequence names for index */
  Expr *pPartIdxWhere;     /* WHERE clause for partial indices */
  ExprList *aColExpr;      /* Column expressions */
  Pgno tnum;               /* DB Page containing root of this index */
  LogEst szIdxRow;         /* Estimated average row size in bytes */
  u16 nKeyCol;             /* Number of columns forming the key */
  u16 nColumn;             /* Number of columns stored in the index */
  u8 onError;              /* OE_Abort, OE_Ignore, OE_Replace, or OE_None */
  unsigned idxType:2;      /* 0:Normal 1:UNIQUE, 2:PRIMARY KEY, 3:IPK */
  unsigned bUnordered:1;   /* Use this index for == or IN queries only */
  unsigned uniqNotNull:1;  /* True if UNIQUE and NOT NULL for all columns */
  unsigned isResized:1;    /* True if resizeIndexObject() has been called */
  unsigned isCovering:1;   /* True if this is a covering index */
  unsigned noSkipScan:1;   /* Do not try to use skip-scan if true */
  unsigned hasStat1:1;     /* aiRowLogEst values come from sqlite_stat1 */
  unsigned bNoQuery:1;     /* Do not use this index to optimize queries */
  unsigned bAscKeyBug:1;   /* True if the bba7b69f9849b5bf bug applies */
  unsigned bHasVCol:1;     /* Index references one or more VIRTUAL columns */
#ifdef SQLITE_ENABLE_STAT4
  int nSample;             /* Number of elements in aSample[] */
  int nSampleCol;          /* Size of IndexSample.anEq[] and so on */
  tRowcnt *aAvgEq;         /* Average nEq values for keys not in aSample */
  IndexSample *aSample;    /* Samples of the left-most key */
  tRowcnt *aiRowEst;       /* Non-logarithmic stat1 data for this index */
  tRowcnt nRowEst0;        /* Non-logarithmic number of rows in the index */
#endif
  Bitmask colNotIdxed;     /* 0 for unindexed columns in pTab */
};

/*
** Allowed values for Index.idxType
*/
#define SQLITE_IDXTYPE_APPDEF      0   /* Created using CREATE INDEX */
#define SQLITE_IDXTYPE_UNIQUE      1   /* Implements a UNIQUE constraint */
#define SQLITE_IDXTYPE_PRIMARYKEY  2   /* Is the PRIMARY KEY for the table */
#define SQLITE_IDXTYPE_IPK         3   /* INTEGER PRIMARY KEY index */

/* Return true if index X is a PRIMARY KEY index */
#define IsPrimaryKeyIndex(X)  ((X)->idxType==SQLITE_IDXTYPE_PRIMARYKEY)

/* Return true if index X is a UNIQUE index */
#define IsUniqueIndex(X)      ((X)->onError!=OE_None)

/* The Index.aiColumn[] values are normally positive integer.  But
** there are some negative values that have special meaning:
*/
#define XN_ROWID     (-1)     /* Indexed column is the rowid */
#define XN_EXPR      (-2)     /* Indexed column is an expression */

/*
** Each sample stored in the sqlite_stat4 table is represented in memory
** using a structure of this type.  See documentation at the top of the
** analyze.c source file for additional information.
*/
struct IndexSample {
  void *p;          /* Pointer to sampled record */
  int n;            /* Size of record in bytes */
  tRowcnt *anEq;    /* Est. number of rows where the key equals this sample */
  tRowcnt *anLt;    /* Est. number of rows where key is less than this sample */
  tRowcnt *anDLt;   /* Est. number of distinct keys less than this sample */
};

/*
** Possible values to use within the flags argument to sqlite3GetToken().
*/
#define SQLITE_TOKEN_QUOTED    0x1 /* Token is a quoted identifier. */
#define SQLITE_TOKEN_KEYWORD   0x2 /* Token is a keyword. */

/*
** Each token coming out of the lexer is an instance of
** this structure.  Tokens are also used as part of an expression.
**
** The memory that "z" points to is owned by other objects.  Take care
** that the owner of the "z" string does not deallocate the string before
** the Token goes out of scope!  Very often, the "z" points to some place
** in the middle of the Parse.zSql text.  But it might also point to a
** static string.
*/
struct Token {
  const char *z;     /* Text of the token.  Not NULL-terminated! */
  unsigned int n;    /* Number of characters in this token */
};

/*
** An instance of this structure contains information needed to generate
** code for a SELECT that contains aggregate functions.
**
** If Expr.op==TK_AGG_COLUMN or TK_AGG_FUNCTION then Expr.pAggInfo is a
** pointer to this structure.  The Expr.iAgg field is the index in
** AggInfo.aCol[] or AggInfo.aFunc[] of information needed to generate
** code for that node.
**
** AggInfo.pGroupBy and AggInfo.aFunc.pExpr point to fields within the
** original Select structure that describes the SELECT statement.  These
** fields do not need to be freed when deallocating the AggInfo structure.
*/
struct AggInfo {
  u8 directMode;          /* Direct rendering mode means take data directly
                          ** from source tables rather than from accumulators */
  u8 useSortingIdx;       /* In direct mode, reference the sorting index rather
                          ** than the source table */
  int sortingIdx;         /* Cursor number of the sorting index */
  int sortingIdxPTab;     /* Cursor number of pseudo-table */
  int nSortingColumn;     /* Number of columns in the sorting index */
  int mnReg, mxReg;       /* Range of registers allocated for aCol and aFunc */
  ExprList *pGroupBy;     /* The group by clause */
  struct AggInfo_col {    /* For each column used in source tables */
    Table *pTab;             /* Source table */
    Expr *pCExpr;            /* The original expression */
    int iTable;              /* Cursor number of the source table */
    int iMem;                /* Memory location that acts as accumulator */
    i16 iColumn;             /* Column number within the source table */
    i16 iSorterColumn;       /* Column number in the sorting index */
  } *aCol;
  int nColumn;            /* Number of used entries in aCol[] */
  int nAccumulator;       /* Number of columns that show through to the output.
                          ** Additional columns are used only as parameters to
                          ** aggregate functions */
  struct AggInfo_func {   /* For each aggregate function */
    Expr *pFExpr;            /* Expression encoding the function */
    FuncDef *pFunc;          /* The aggregate function implementation */
    int iMem;                /* Memory location that acts as accumulator */
    int iDistinct;           /* Ephemeral table used to enforce DISTINCT */
  } *aFunc;
  int nFunc;              /* Number of entries in aFunc[] */
  u32 selId;              /* Select to which this AggInfo belongs */
  AggInfo *pNext;         /* Next in list of them all */
};

/*
** The datatype ynVar is a signed integer, either 16-bit or 32-bit.
** Usually it is 16-bits.  But if SQLITE_MAX_VARIABLE_NUMBER is greater
** than 32767 we have to make it 32-bit.  16-bit is preferred because
** it uses less memory in the Expr object, which is a big memory user
** in systems with lots of prepared statements.  And few applications
** need more than about 10 or 20 variables.  But some extreme users want
** to have prepared statements with over 32766 variables, and for them
** the option is available (at compile-time).
*/
#if SQLITE_MAX_VARIABLE_NUMBER<32767
typedef i16 ynVar;
#else
typedef int ynVar;
#endif

/*
** Each node of an expression in the parse tree is an instance
** of this structure.
**
** Expr.op is the opcode. The integer parser token codes are reused
** as opcodes here. For example, the parser defines TK_GE to be an integer
** code representing the ">=" operator. This same integer code is reused
** to represent the greater-than-or-equal-to operator in the expression
** tree.
**
** If the expression is an SQL literal (TK_INTEGER, TK_FLOAT, TK_BLOB,
** or TK_STRING), then Expr.token contains the text of the SQL literal. If
** the expression is a variable (TK_VARIABLE), then Expr.token contains the
** variable name. Finally, if the expression is an SQL function (TK_FUNCTION),
** then Expr.token contains the name of the function.
**
** Expr.pRight and Expr.pLeft are the left and right subexpressions of a
** binary operator. Either or both may be NULL.
**
** Expr.x.pList is a list of arguments if the expression is an SQL function,
** a CASE expression or an IN expression of the form "<lhs> IN (<y>, <z>...)".
** Expr.x.pSelect is used if the expression is a sub-select or an expression of
** the form "<lhs> IN (SELECT ...)". If the EP_xIsSelect bit is set in the
** Expr.flags mask, then Expr.x.pSelect is valid. Otherwise, Expr.x.pList is
** valid.
**
** An expression of the form ID or ID.ID refers to a column in a table.
** For such expressions, Expr.op is set to TK_COLUMN and Expr.iTable is
** the integer cursor number of a VDBE cursor pointing to that table and
** Expr.iColumn is the column number for the specific column.  If the
** expression is used as a result in an aggregate SELECT, then the
** value is also stored in the Expr.iAgg column in the aggregate so that
** it can be accessed after all aggregates are computed.
**
** If the expression is an unbound variable marker (a question mark
** character '?' in the original SQL) then the Expr.iTable holds the index
** number for that variable.
**
** If the expression is a subquery then Expr.iColumn holds an integer
** register number containing the result of the subquery.  If the
** subquery gives a constant result, then iTable is -1.  If the subquery
** gives a different answer at different times during statement processing
** then iTable is the address of a subroutine that computes the subquery.
**
** If the Expr is of type OP_Column, and the table it is selecting from
** is a disk table or the "old.*" pseudo-table, then pTab points to the
** corresponding table definition.
**
** ALLOCATION NOTES:
**
** Expr objects can use a lot of memory space in database schema.  To
** help reduce memory requirements, sometimes an Expr object will be
** truncated.  And to reduce the number of memory allocations, sometimes
** two or more Expr objects will be stored in a single memory allocation,
** together with Expr.zToken strings.
**
** If the EP_Reduced and EP_TokenOnly flags are set when
** an Expr object is truncated.  When EP_Reduced is set, then all
** the child Expr objects in the Expr.pLeft and Expr.pRight subtrees
** are contained within the same memory allocation.  Note, however, that
** the subtrees in Expr.x.pList or Expr.x.pSelect are always separately
** allocated, regardless of whether or not EP_Reduced is set.
*/
struct Expr {
  u8 op;                 /* Operation performed by this node */
  char affExpr;          /* affinity, or RAISE type */
  u8 op2;                /* TK_REGISTER/TK_TRUTH: original value of Expr.op
                         ** TK_COLUMN: the value of p5 for OP_Column
                         ** TK_AGG_FUNCTION: nesting depth
                         ** TK_FUNCTION: NC_SelfRef flag if needs OP_PureFunc */
#ifdef SQLITE_DEBUG
  u8 vvaFlags;           /* Verification flags. */
#endif
  u32 flags;             /* Various flags.  EP_* See below */
  union {
    char *zToken;          /* Token value. Zero terminated and dequoted */
    int iValue;            /* Non-negative integer value if EP_IntValue */
  } u;

  /* If the EP_TokenOnly flag is set in the Expr.flags mask, then no
  ** space is allocated for the fields below this point. An attempt to
  ** access them will result in a segfault or malfunction.
  *********************************************************************/

  Expr *pLeft;           /* Left subnode */
  Expr *pRight;          /* Right subnode */
  union {
    ExprList *pList;     /* op = IN, EXISTS, SELECT, CASE, FUNCTION, BETWEEN */
    Select *pSelect;     /* EP_xIsSelect and op = IN, EXISTS, SELECT */
  } x;

  /* If the EP_Reduced flag is set in the Expr.flags mask, then no
  ** space is allocated for the fields below this point. An attempt to
  ** access them will result in a segfault or malfunction.
  *********************************************************************/

#if SQLITE_MAX_EXPR_DEPTH>0
  int nHeight;           /* Height of the tree headed by this node */
#endif
  int iTable;            /* TK_COLUMN: cursor number of table holding column
                         ** TK_REGISTER: register number
                         ** TK_TRIGGER: 1 -> new, 0 -> old
                         ** EP_Unlikely:  134217728 times likelihood
                         ** TK_IN: ephemerial table holding RHS
                         ** TK_SELECT_COLUMN: Number of columns on the LHS
                         ** TK_SELECT: 1st register of result vector */
  ynVar iColumn;         /* TK_COLUMN: column index.  -1 for rowid.
                         ** TK_VARIABLE: variable number (always >= 1).
                         ** TK_SELECT_COLUMN: column of the result vector */
  i16 iAgg;              /* Which entry in pAggInfo->aCol[] or ->aFunc[] */
  i16 iRightJoinTable;   /* If EP_FromJoin, the right table of the join */
  AggInfo *pAggInfo;     /* Used by TK_AGG_COLUMN and TK_AGG_FUNCTION */
  union {
    Table *pTab;           /* TK_COLUMN: Table containing column. Can be NULL
                           ** for a column of an index on an expression */
    Window *pWin;          /* EP_WinFunc: Window/Filter defn for a function */
    struct {               /* TK_IN, TK_SELECT, and TK_EXISTS */
      int iAddr;             /* Subroutine entry address */
      int regReturn;         /* Register used to hold return address */
    } sub;
  } y;
};

/*
** The following are the meanings of bits in the Expr.flags field.
** Value restrictions:
**
**          EP_Agg == NC_HasAgg == SF_HasAgg
**          EP_Win == NC_HasWin
*/
#define EP_FromJoin   0x000001 /* Originates in ON/USING clause of outer join */
#define EP_Distinct   0x000002 /* Aggregate function with DISTINCT keyword */
#define EP_HasFunc    0x000004 /* Contains one or more functions of any kind */
#define EP_FixedCol   0x000008 /* TK_Column with a known fixed value */
#define EP_Agg        0x000010 /* Contains one or more aggregate functions */
#define EP_VarSelect  0x000020 /* pSelect is correlated, not constant */
#define EP_DblQuoted  0x000040 /* token.z was originally in "..." */
#define EP_InfixFunc  0x000080 /* True for an infix function: LIKE, GLOB, etc */
#define EP_Collate    0x000100 /* Tree contains a TK_COLLATE operator */
#define EP_Commuted   0x000200 /* Comparison operator has been commuted */
#define EP_IntValue   0x000400 /* Integer value contained in u.iValue */
#define EP_xIsSelect  0x000800 /* x.pSelect is valid (otherwise x.pList is) */
#define EP_Skip       0x001000 /* Operator does not contribute to affinity */
#define EP_Reduced    0x002000 /* Expr struct EXPR_REDUCEDSIZE bytes only */
#define EP_TokenOnly  0x004000 /* Expr struct EXPR_TOKENONLYSIZE bytes only */
#define EP_Win        0x008000 /* Contains window functions */
#define EP_MemToken   0x010000 /* Need to sqlite3DbFree() Expr.zToken */
                  /*  0x020000 // available for reuse */
#define EP_Unlikely   0x040000 /* unlikely() or likelihood() function */
#define EP_ConstFunc  0x080000 /* A SQLITE_FUNC_CONSTANT or _SLOCHNG function */
#define EP_CanBeNull  0x100000 /* Can be null despite NOT NULL constraint */
#define EP_Subquery   0x200000 /* Tree contains a TK_SELECT operator */
#define EP_Alias      0x400000 /* Is an alias for a result set column */
#define EP_Leaf       0x800000 /* Expr.pLeft, .pRight, .u.pSelect all NULL */
#define EP_WinFunc   0x1000000 /* TK_FUNCTION with Expr.y.pWin set */
#define EP_Subrtn    0x2000000 /* Uses Expr.y.sub. TK_IN, _SELECT, or _EXISTS */
#define EP_Quoted    0x4000000 /* TK_ID was originally quoted */
#define EP_Static    0x8000000 /* Held in memory not obtained from malloc() */
#define EP_IsTrue   0x10000000 /* Always has boolean value of TRUE */
#define EP_IsFalse  0x20000000 /* Always has boolean value of FALSE */
#define EP_FromDDL  0x40000000 /* Originates from sqlite_schema */
               /*   0x80000000 // Available */

/*
** The EP_Propagate mask is a set of properties that automatically propagate
** upwards into parent nodes.
*/
#define EP_Propagate (EP_Collate|EP_Subquery|EP_HasFunc)

/*
** These macros can be used to test, set, or clear bits in the
** Expr.flags field.
*/
#define ExprHasProperty(E,P)     (((E)->flags&(P))!=0)
#define ExprHasAllProperty(E,P)  (((E)->flags&(P))==(P))
#define ExprSetProperty(E,P)     (E)->flags|=(P)
#define ExprClearProperty(E,P)   (E)->flags&=~(P)
#define ExprAlwaysTrue(E)   (((E)->flags&(EP_FromJoin|EP_IsTrue))==EP_IsTrue)
#define ExprAlwaysFalse(E)  (((E)->flags&(EP_FromJoin|EP_IsFalse))==EP_IsFalse)


/* Flags for use with Expr.vvaFlags
*/
#define EP_NoReduce   0x01  /* Cannot EXPRDUP_REDUCE this Expr */
#define EP_Immutable  0x02  /* Do not change this Expr node */

/* The ExprSetVVAProperty() macro is used for Verification, Validation,
** and Accreditation only.  It works like ExprSetProperty() during VVA
** processes but is a no-op for delivery.
*/
#ifdef SQLITE_DEBUG
# define ExprSetVVAProperty(E,P)   (E)->vvaFlags|=(P)
# define ExprHasVVAProperty(E,P)   (((E)->vvaFlags&(P))!=0)
# define ExprClearVVAProperties(E) (E)->vvaFlags = 0
#else
# define ExprSetVVAProperty(E,P)
# define ExprHasVVAProperty(E,P)   0
# define ExprClearVVAProperties(E)
#endif

/*
** Macros to determine the number of bytes required by a normal Expr
** struct, an Expr struct with the EP_Reduced flag set in Expr.flags
** and an Expr struct with the EP_TokenOnly flag set.
*/
#define EXPR_FULLSIZE           sizeof(Expr)           /* Full size */
#define EXPR_REDUCEDSIZE        offsetof(Expr,iTable)  /* Common features */
#define EXPR_TOKENONLYSIZE      offsetof(Expr,pLeft)   /* Fewer features */

/*
** Flags passed to the sqlite3ExprDup() function. See the header comment
** above sqlite3ExprDup() for details.
*/
#define EXPRDUP_REDUCE         0x0001  /* Used reduced-size Expr nodes */

/*
** True if the expression passed as an argument was a function with
** an OVER() clause (a window function).
*/
#ifdef SQLITE_OMIT_WINDOWFUNC
# define IsWindowFunc(p) 0
#else
# define IsWindowFunc(p) ( \
    ExprHasProperty((p), EP_WinFunc) && p->y.pWin->eFrmType!=TK_FILTER \
 )
#endif

/*
** A list of expressions.  Each expression may optionally have a
** name.  An expr/name combination can be used in several ways, such
** as the list of "expr AS ID" fields following a "SELECT" or in the
** list of "ID = expr" items in an UPDATE.  A list of expressions can
** also be used as the argument to a function, in which case the a.zName
** field is not used.
**
** In order to try to keep memory usage down, the Expr.a.zEName field
** is used for multiple purposes:
**
**     eEName          Usage
**    ----------       -------------------------
**    ENAME_NAME       (1) the AS of result set column
**                     (2) COLUMN= of an UPDATE
**
**    ENAME_TAB        DB.TABLE.NAME used to resolve names
**                     of subqueries
**
**    ENAME_SPAN       Text of the original result set
**                     expression.
*/
struct ExprList {
  int nExpr;             /* Number of expressions on the list */
  struct ExprList_item { /* For each expression in the list */
    Expr *pExpr;            /* The parse tree for this expression */
    char *zEName;           /* Token associated with this expression */
    u8 sortFlags;           /* Mask of KEYINFO_ORDER_* flags */
    unsigned eEName :2;     /* Meaning of zEName */
    unsigned done :1;       /* A flag to indicate when processing is finished */
    unsigned reusable :1;   /* Constant expression is reusable */
    unsigned bSorterRef :1; /* Defer evaluation until after sorting */
    unsigned bNulls: 1;     /* True if explicit "NULLS FIRST/LAST" */
    union {
      struct {
        u16 iOrderByCol;      /* For ORDER BY, column number in result set */
        u16 iAlias;           /* Index into Parse.aAlias[] for zName */
      } x;
      int iConstExprReg;      /* Register in which Expr value is cached */
    } u;
  } a[1];                  /* One slot for each expression in the list */
};

/*
** Allowed values for Expr.a.eEName
*/
#define ENAME_NAME  0       /* The AS clause of a result set */
#define ENAME_SPAN  1       /* Complete text of the result set expression */
#define ENAME_TAB   2       /* "DB.TABLE.NAME" for the result set */

/*
** An instance of this structure can hold a simple list of identifiers,
** such as the list "a,b,c" in the following statements:
**
**      INSERT INTO t(a,b,c) VALUES ...;
**      CREATE INDEX idx ON t(a,b,c);
**      CREATE TRIGGER trig BEFORE UPDATE ON t(a,b,c) ...;
**
** The IdList.a.idx field is used when the IdList represents the list of
** column names after a table name in an INSERT statement.  In the statement
**
**     INSERT INTO t(a,b,c) ...
**
** If "a" is the k-th column of table "t", then IdList.a[0].idx==k.
*/
struct IdList {
  struct IdList_item {
    char *zName;      /* Name of the identifier */
    int idx;          /* Index in some Table.aCol[] of a column named zName */
  } *a;
  int nId;         /* Number of identifiers on the list */
};

/*
** The following structure describes the FROM clause of a SELECT statement.
** Each table or subquery in the FROM clause is a separate element of
** the SrcList.a[] array.
**
** With the addition of multiple database support, the following structure
** can also be used to describe a particular table such as the table that
** is modified by an INSERT, DELETE, or UPDATE statement.  In standard SQL,
** such a table must be a simple name: ID.  But in SQLite, the table can
** now be identified by a database name, a dot, then the table name: ID.ID.
**
** The jointype starts out showing the join type between the current table
** and the next table on the list.  The parser builds the list this way.
** But sqlite3SrcListShiftJoinType() later shifts the jointypes so that each
** jointype expresses the join between the table and the previous table.
**
** In the colUsed field, the high-order bit (bit 63) is set if the table
** contains more than 63 columns and the 64-th or later column is used.
*/
struct SrcList {
  int nSrc;        /* Number of tables or subqueries in the FROM clause */
  u32 nAlloc;      /* Number of entries allocated in a[] below */
  struct SrcList_item {
    Schema *pSchema;  /* Schema to which this item is fixed */
    char *zDatabase;  /* Name of database holding this table */
    char *zName;      /* Name of the table */
    char *zAlias;     /* The "B" part of a "A AS B" phrase.  zName is the "A" */
    Table *pTab;      /* An SQL table corresponding to zName */
    Select *pSelect;  /* A SELECT statement used in place of a table name */
    int addrFillSub;  /* Address of subroutine to manifest a subquery */
    int regReturn;    /* Register holding return address of addrFillSub */
    int regResult;    /* Registers holding results of a co-routine */
    struct {
      u8 jointype;      /* Type of join between this table and the previous */
      unsigned notIndexed :1;    /* True if there is a NOT INDEXED clause */
      unsigned isIndexedBy :1;   /* True if there is an INDEXED BY clause */
      unsigned isTabFunc :1;     /* True if table-valued-function syntax */
      unsigned isCorrelated :1;  /* True if sub-query is correlated */
      unsigned viaCoroutine :1;  /* Implemented as a co-routine */
      unsigned isRecursive :1;   /* True for recursive reference in WITH */
      unsigned fromDDL :1;       /* Comes from sqlite_schema */
    } fg;
    int iCursor;      /* The VDBE cursor number used to access this table */
    Expr *pOn;        /* The ON clause of a join */
    IdList *pUsing;   /* The USING clause of a join */
    Bitmask colUsed;  /* Bit N (1<<N) set if column N of pTab is used */
    union {
      char *zIndexedBy;    /* Identifier from "INDEXED BY <zIndex>" clause */
      ExprList *pFuncArg;  /* Arguments to table-valued-function */
    } u1;
    Index *pIBIndex;  /* Index structure corresponding to u1.zIndexedBy */
  } a[1];             /* One entry for each identifier on the list */
};

/*
** Permitted values of the SrcList.a.jointype field
*/
#define JT_INNER     0x0001    /* Any kind of inner or cross join */
#define JT_CROSS     0x0002    /* Explicit use of the CROSS keyword */
#define JT_NATURAL   0x0004    /* True for a "natural" join */
#define JT_LEFT      0x0008    /* Left outer join */
#define JT_RIGHT     0x0010    /* Right outer join */
#define JT_OUTER     0x0020    /* The "OUTER" keyword is present */
#define JT_ERROR     0x0040    /* unknown or unsupported join type */


/*
** Flags appropriate for the wctrlFlags parameter of sqlite3WhereBegin()
** and the WhereInfo.wctrlFlags member.
**
** Value constraints (enforced via assert()):
**     WHERE_USE_LIMIT  == SF_FixedLimit
*/
#define WHERE_ORDERBY_NORMAL   0x0000 /* No-op */
#define WHERE_ORDERBY_MIN      0x0001 /* ORDER BY processing for min() func */
#define WHERE_ORDERBY_MAX      0x0002 /* ORDER BY processing for max() func */
#define WHERE_ONEPASS_DESIRED  0x0004 /* Want to do one-pass UPDATE/DELETE */
#define WHERE_ONEPASS_MULTIROW 0x0008 /* ONEPASS is ok with multiple rows */
#define WHERE_DUPLICATES_OK    0x0010 /* Ok to return a row more than once */
#define WHERE_OR_SUBCLAUSE     0x0020 /* Processing a sub-WHERE as part of
                                      ** the OR optimization  */
#define WHERE_GROUPBY          0x0040 /* pOrderBy is really a GROUP BY */
#define WHERE_DISTINCTBY       0x0080 /* pOrderby is really a DISTINCT clause */
#define WHERE_WANT_DISTINCT    0x0100 /* All output needs to be distinct */
#define WHERE_SORTBYGROUP      0x0200 /* Support sqlite3WhereIsSorted() */
#define WHERE_SEEK_TABLE       0x0400 /* Do not defer seeks on main table */
#define WHERE_ORDERBY_LIMIT    0x0800 /* ORDERBY+LIMIT on the inner loop */
#define WHERE_SEEK_UNIQ_TABLE  0x1000 /* Do not defer seeks if unique */
                        /*     0x2000    not currently used */
#define WHERE_USE_LIMIT        0x4000 /* Use the LIMIT in cost estimates */
                        /*     0x8000    not currently used */

/* Allowed return values from sqlite3WhereIsDistinct()
*/
#define WHERE_DISTINCT_NOOP      0  /* DISTINCT keyword not used */
#define WHERE_DISTINCT_UNIQUE    1  /* No duplicates */
#define WHERE_DISTINCT_ORDERED   2  /* All duplicates are adjacent */
#define WHERE_DISTINCT_UNORDERED 3  /* Duplicates are scattered */

/*
** A NameContext defines a context in which to resolve table and column
** names.  The context consists of a list of tables (the pSrcList) field and
** a list of named expression (pEList).  The named expression list may
** be NULL.  The pSrc corresponds to the FROM clause of a SELECT or
** to the table being operated on by INSERT, UPDATE, or DELETE.  The
** pEList corresponds to the result set of a SELECT and is NULL for
** other statements.
**
** NameContexts can be nested.  When resolving names, the inner-most
** context is searched first.  If no match is found, the next outer
** context is checked.  If there is still no match, the next context
** is checked.  This process continues until either a match is found
** or all contexts are check.  When a match is found, the nRef member of
** the context containing the match is incremented.
**
** Each subquery gets a new NameContext.  The pNext field points to the
** NameContext in the parent query.  Thus the process of scanning the
** NameContext list corresponds to searching through successively outer
** subqueries looking for a match.
*/
struct NameContext {
  Parse *pParse;       /* The parser */
  SrcList *pSrcList;   /* One or more tables used to resolve names */
  union {
    ExprList *pEList;    /* Optional list of result-set columns */
    AggInfo *pAggInfo;   /* Information about aggregates at this level */
    Upsert *pUpsert;     /* ON CONFLICT clause information from an upsert */
  } uNC;
  NameContext *pNext;  /* Next outer name context.  NULL for outermost */
  int nRef;            /* Number of names resolved by this context */
  int nErr;            /* Number of errors encountered while resolving names */
  int ncFlags;         /* Zero or more NC_* flags defined below */
  Select *pWinSelect;  /* SELECT statement for any window functions */
};

/*
** Allowed values for the NameContext, ncFlags field.
**
** Value constraints (all checked via assert()):
**    NC_HasAgg    == SF_HasAgg    == EP_Agg
**    NC_MinMaxAgg == SF_MinMaxAgg == SQLITE_FUNC_MINMAX
**    NC_HasWin    == EP_Win
**
*/
#define NC_AllowAgg  0x00001  /* Aggregate functions are allowed here */
#define NC_PartIdx   0x00002  /* True if resolving a partial index WHERE */
#define NC_IsCheck   0x00004  /* True if resolving a CHECK constraint */
#define NC_GenCol    0x00008  /* True for a GENERATED ALWAYS AS clause */
#define NC_HasAgg    0x00010  /* One or more aggregate functions seen */
#define NC_IdxExpr   0x00020  /* True if resolving columns of CREATE INDEX */
#define NC_SelfRef   0x0002e  /* Combo: PartIdx, isCheck, GenCol, and IdxExpr */
#define NC_VarSelect 0x00040  /* A correlated subquery has been seen */
#define NC_UEList    0x00080  /* True if uNC.pEList is used */
#define NC_UAggInfo  0x00100  /* True if uNC.pAggInfo is used */
#define NC_UUpsert   0x00200  /* True if uNC.pUpsert is used */
#define NC_MinMaxAgg 0x01000  /* min/max aggregates seen.  See note above */
#define NC_Complex   0x02000  /* True if a function or subquery seen */
#define NC_AllowWin  0x04000  /* Window functions are allowed here */
#define NC_HasWin    0x08000  /* One or more window functions seen */
#define NC_IsDDL     0x10000  /* Resolving names in a CREATE statement */
#define NC_InAggFunc 0x20000  /* True if analyzing arguments to an agg func */
#define NC_FromDDL   0x40000  /* SQL text comes from sqlite_schema */

/*
** An instance of the following object describes a single ON CONFLICT
** clause in an upsert.
**
** The pUpsertTarget field is only set if the ON CONFLICT clause includes
** conflict-target clause.  (In "ON CONFLICT(a,b)" the "(a,b)" is the
** conflict-target clause.)  The pUpsertTargetWhere is the optional
** WHERE clause used to identify partial unique indexes.
**
** pUpsertSet is the list of column=expr terms of the UPDATE statement. 
** The pUpsertSet field is NULL for a ON CONFLICT DO NOTHING.  The
** pUpsertWhere is the WHERE clause for the UPDATE and is NULL if the
** WHERE clause is omitted.
*/
struct Upsert {
  ExprList *pUpsertTarget;  /* Optional description of conflicting index */
  Expr *pUpsertTargetWhere; /* WHERE clause for partial index targets */
  ExprList *pUpsertSet;     /* The SET clause from an ON CONFLICT UPDATE */
  Expr *pUpsertWhere;       /* WHERE clause for the ON CONFLICT UPDATE */
  /* The fields above comprise the parse tree for the upsert clause.
  ** The fields below are used to transfer information from the INSERT
  ** processing down into the UPDATE processing while generating code.
  ** Upsert owns the memory allocated above, but not the memory below. */
  Index *pUpsertIdx;        /* Constraint that pUpsertTarget identifies */
  SrcList *pUpsertSrc;      /* Table to be updated */
  int regData;              /* First register holding array of VALUES */
  int iDataCur;             /* Index of the data cursor */
  int iIdxCur;              /* Index of the first index cursor */
};

/*
** An instance of the following structure contains all information
** needed to generate code for a single SELECT statement.
**
** See the header comment on the computeLimitRegisters() routine for a
** detailed description of the meaning of the iLimit and iOffset fields.
**
** addrOpenEphm[] entries contain the address of OP_OpenEphemeral opcodes.
** These addresses must be stored so that we can go back and fill in
** the P4_KEYINFO and P2 parameters later.  Neither the KeyInfo nor
** the number of columns in P2 can be computed at the same time
** as the OP_OpenEphm instruction is coded because not
** enough information about the compound query is known at that point.
** The KeyInfo for addrOpenTran[0] and [1] contains collating sequences
** for the result set.  The KeyInfo for addrOpenEphm[2] contains collating
** sequences for the ORDER BY clause.
*/
struct Select {
  u8 op;                 /* One of: TK_UNION TK_ALL TK_INTERSECT TK_EXCEPT */
  LogEst nSelectRow;     /* Estimated number of result rows */
  u32 selFlags;          /* Various SF_* values */
  int iLimit, iOffset;   /* Memory registers holding LIMIT & OFFSET counters */
  u32 selId;             /* Unique identifier number for this SELECT */
  int addrOpenEphm[2];   /* OP_OpenEphem opcodes related to this select */
  ExprList *pEList;      /* The fields of the result */
  SrcList *pSrc;         /* The FROM clause */
  Expr *pWhere;          /* The WHERE clause */
  ExprList *pGroupBy;    /* The GROUP BY clause */
  Expr *pHaving;         /* The HAVING clause */
  ExprList *pOrderBy;    /* The ORDER BY clause */
  Select *pPrior;        /* Prior select in a compound select statement */
  Select *pNext;         /* Next select to the left in a compound */
  Expr *pLimit;          /* LIMIT expression. NULL means not used. */
  With *pWith;           /* WITH clause attached to this select. Or NULL. */
#ifndef SQLITE_OMIT_WINDOWFUNC
  Window *pWin;          /* List of window functions */
  Window *pWinDefn;      /* List of named window definitions */
#endif
};

/*
** Allowed values for Select.selFlags.  The "SF" prefix stands for
** "Select Flag".
**
** Value constraints (all checked via assert())
**     SF_HasAgg     == NC_HasAgg
**     SF_MinMaxAgg  == NC_MinMaxAgg     == SQLITE_FUNC_MINMAX
**     SF_FixedLimit == WHERE_USE_LIMIT
*/
#define SF_Distinct      0x0000001 /* Output should be DISTINCT */
#define SF_All           0x0000002 /* Includes the ALL keyword */
#define SF_Resolved      0x0000004 /* Identifiers have been resolved */
#define SF_Aggregate     0x0000008 /* Contains agg functions or a GROUP BY */
#define SF_HasAgg        0x0000010 /* Contains aggregate functions */
#define SF_UsesEphemeral 0x0000020 /* Uses the OpenEphemeral opcode */
#define SF_Expanded      0x0000040 /* sqlite3SelectExpand() called on this */
#define SF_HasTypeInfo   0x0000080 /* FROM subqueries have Table metadata */
#define SF_Compound      0x0000100 /* Part of a compound query */
#define SF_Values        0x0000200 /* Synthesized from VALUES clause */
#define SF_MultiValue    0x0000400 /* Single VALUES term with multiple rows */
#define SF_NestedFrom    0x0000800 /* Part of a parenthesized FROM clause */
#define SF_MinMaxAgg     0x0001000 /* Aggregate containing min() or max() */
#define SF_Recursive     0x0002000 /* The recursive part of a recursive CTE */
#define SF_FixedLimit    0x0004000 /* nSelectRow set by a constant LIMIT */
#define SF_MaybeConvert  0x0008000 /* Need convertCompoundSelectToSubquery() */
#define SF_Converted     0x0010000 /* By convertCompoundSelectToSubquery() */
#define SF_IncludeHidden 0x0020000 /* Include hidden columns in output */
#define SF_ComplexResult 0x0040000 /* Result contains subquery or function */
#define SF_WhereBegin    0x0080000 /* Really a WhereBegin() call.  Debug Only */
#define SF_WinRewrite    0x0100000 /* Window function rewrite accomplished */
#define SF_View          0x0200000 /* SELECT statement is a view */
#define SF_NoopOrderBy   0x0400000 /* ORDER BY is ignored for this query */
#define SF_UpdateFrom    0x0800000 /* Statement is an UPDATE...FROM */

/*
** The results of a SELECT can be distributed in several ways, as defined
** by one of the following macros.  The "SRT" prefix means "SELECT Result
** Type".
**
**     SRT_Union       Store results as a key in a temporary index
**                     identified by pDest->iSDParm.
**
**     SRT_Except      Remove results from the temporary index pDest->iSDParm.
**
**     SRT_Exists      Store a 1 in memory cell pDest->iSDParm if the result
**                     set is not empty.
**
**     SRT_Discard     Throw the results away.  This is used by SELECT
**                     statements within triggers whose only purpose is
**                     the side-effects of functions.
**
** All of the above are free to ignore their ORDER BY clause. Those that
** follow must honor the ORDER BY clause.
**
**     SRT_Output      Generate a row of output (using the OP_ResultRow
**                     opcode) for each row in the result set.
**
**     SRT_Mem         Only valid if the result is a single column.
**                     Store the first column of the first result row
**                     in register pDest->iSDParm then abandon the rest
**                     of the query.  This destination implies "LIMIT 1".
**
**     SRT_Set         The result must be a single column.  Store each
**                     row of result as the key in table pDest->iSDParm.
**                     Apply the affinity pDest->affSdst before storing
**                     results.  Used to implement "IN (SELECT ...)".
**
**     SRT_EphemTab    Create an temporary table pDest->iSDParm and store
**                     the result there. The cursor is left open after
**                     returning.  This is like SRT_Table except that
**                     this destination uses OP_OpenEphemeral to create
**                     the table first.
**
**     SRT_Coroutine   Generate a co-routine that returns a new row of
**                     results each time it is invoked.  The entry point
**                     of the co-routine is stored in register pDest->iSDParm
**                     and the result row is stored in pDest->nDest registers
**                     starting with pDest->iSdst.
**
**     SRT_Table       Store results in temporary table pDest->iSDParm.
**     SRT_Fifo        This is like SRT_EphemTab except that the table
**                     is assumed to already be open.  SRT_Fifo has
**                     the additional property of being able to ignore
**                     the ORDER BY clause.
**
**     SRT_DistFifo    Store results in a temporary table pDest->iSDParm.
**                     But also use temporary table pDest->iSDParm+1 as
**                     a record of all prior results and ignore any duplicate
**                     rows.  Name means:  "Distinct Fifo".
**
**     SRT_Queue       Store results in priority queue pDest->iSDParm (really
**                     an index).  Append a sequence number so that all entries
**                     are distinct.
**
**     SRT_DistQueue   Store results in priority queue pDest->iSDParm only if
**                     the same record has never been stored before.  The
**                     index at pDest->iSDParm+1 hold all prior stores.
**
**     SRT_Upfrom      Store results in the temporary table already opened by
**                     pDest->iSDParm. If (pDest->iSDParm<0), then the temp
**                     table is an intkey table - in this case the first
**                     column returned by the SELECT is used as the integer
**                     key. If (pDest->iSDParm>0), then the table is an index
**                     table. (pDest->iSDParm) is the number of key columns in
**                     each index record in this case.
*/
#define SRT_Union        1  /* Store result as keys in an index */
#define SRT_Except       2  /* Remove result from a UNION index */
#define SRT_Exists       3  /* Store 1 if the result is not empty */
#define SRT_Discard      4  /* Do not save the results anywhere */
#define SRT_Fifo         5  /* Store result as data with an automatic rowid */
#define SRT_DistFifo     6  /* Like SRT_Fifo, but unique results only */
#define SRT_Queue        7  /* Store result in an queue */
#define SRT_DistQueue    8  /* Like SRT_Queue, but unique results only */

/* The ORDER BY clause is ignored for all of the above */
#define IgnorableOrderby(X) ((X->eDest)<=SRT_DistQueue)

#define SRT_Output       9  /* Output each row of result */
#define SRT_Mem         10  /* Store result in a memory cell */
#define SRT_Set         11  /* Store results as keys in an index */
#define SRT_EphemTab    12  /* Create transient tab and store like SRT_Table */
#define SRT_Coroutine   13  /* Generate a single row of result */
#define SRT_Table       14  /* Store result as data with an automatic rowid */
#define SRT_Upfrom      15  /* Store result as data with rowid */

/*
** An instance of this object describes where to put of the results of
** a SELECT statement.
*/
struct SelectDest {
  u8 eDest;            /* How to dispose of the results.  One of SRT_* above. */
  int iSDParm;         /* A parameter used by the eDest disposal method */
  int iSDParm2;        /* A second parameter for the eDest disposal method */
  int iSdst;           /* Base register where results are written */
  int nSdst;           /* Number of registers allocated */
  char *zAffSdst;      /* Affinity used when eDest==SRT_Set */
  ExprList *pOrderBy;  /* Key columns for SRT_Queue and SRT_DistQueue */
};

/*
** During code generation of statements that do inserts into AUTOINCREMENT
** tables, the following information is attached to the Table.u.autoInc.p
** pointer of each autoincrement table to record some side information that
** the code generator needs.  We have to keep per-table autoincrement
** information in case inserts are done within triggers.  Triggers do not
** normally coordinate their activities, but we do need to coordinate the
** loading and saving of autoincrement information.
*/
struct AutoincInfo {
  AutoincInfo *pNext;   /* Next info block in a list of them all */
  Table *pTab;          /* Table this info block refers to */
  int iDb;              /* Index in sqlite3.aDb[] of database holding pTab */
  int regCtr;           /* Memory register holding the rowid counter */
};

/*
** At least one instance of the following structure is created for each
** trigger that may be fired while parsing an INSERT, UPDATE or DELETE
** statement. All such objects are stored in the linked list headed at
** Parse.pTriggerPrg and deleted once statement compilation has been
** completed.
**
** A Vdbe sub-program that implements the body and WHEN clause of trigger
** TriggerPrg.pTrigger, assuming a default ON CONFLICT clause of
** TriggerPrg.orconf, is stored in the TriggerPrg.pProgram variable.
** The Parse.pTriggerPrg list never contains two entries with the same
** values for both pTrigger and orconf.
**
** The TriggerPrg.aColmask[0] variable is set to a mask of old.* columns
** accessed (or set to 0 for triggers fired as a result of INSERT
** statements). Similarly, the TriggerPrg.aColmask[1] variable is set to
** a mask of new.* columns used by the program.
*/
struct TriggerPrg {
  Trigger *pTrigger;      /* Trigger this program was coded from */
  TriggerPrg *pNext;      /* Next entry in Parse.pTriggerPrg list */
  SubProgram *pProgram;   /* Program implementing pTrigger/orconf */
  int orconf;             /* Default ON CONFLICT policy */
  u32 aColmask[2];        /* Masks of old.*, new.* columns accessed */
};

/*
** The yDbMask datatype for the bitmask of all attached databases.
*/
#if SQLITE_MAX_ATTACHED>30
  typedef unsigned char yDbMask[(SQLITE_MAX_ATTACHED+9)/8];
# define DbMaskTest(M,I)    (((M)[(I)/8]&(1<<((I)&7)))!=0)
# define DbMaskZero(M)      memset((M),0,sizeof(M))
# define DbMaskSet(M,I)     (M)[(I)/8]|=(1<<((I)&7))
# define DbMaskAllZero(M)   sqlite3DbMaskAllZero(M)
# define DbMaskNonZero(M)   (sqlite3DbMaskAllZero(M)==0)
#else
  typedef unsigned int yDbMask;
# define DbMaskTest(M,I)    (((M)&(((yDbMask)1)<<(I)))!=0)
# define DbMaskZero(M)      (M)=0
# define DbMaskSet(M,I)     (M)|=(((yDbMask)1)<<(I))
# define DbMaskAllZero(M)   (M)==0
# define DbMaskNonZero(M)   (M)!=0
#endif

/*
** An SQL parser context.  A copy of this structure is passed through
** the parser and down into all the parser action routine in order to
** carry around information that is global to the entire parse.
**
** The structure is divided into two parts.  When the parser and code
** generate call themselves recursively, the first part of the structure
** is constant but the second part is reset at the beginning and end of
** each recursion.
**
** The nTableLock and aTableLock variables are only used if the shared-cache
** feature is enabled (if sqlite3Tsd()->useSharedData is true). They are
** used to store the set of table-locks required by the statement being
** compiled. Function sqlite3TableLock() is used to add entries to the
** list.
*/
struct Parse {
  sqlite3 *db;         /* The main database structure */
  char *zErrMsg;       /* An error message */
  Vdbe *pVdbe;         /* An engine for executing database bytecode */
  int rc;              /* Return code from execution */
  u8 colNamesSet;      /* TRUE after OP_ColumnName has been issued to pVdbe */
  u8 checkSchema;      /* Causes schema cookie check after an error */
  u8 nested;           /* Number of nested calls to the parser/code generator */
  u8 nTempReg;         /* Number of temporary registers in aTempReg[] */
  u8 isMultiWrite;     /* True if statement may modify/insert multiple rows */
  u8 mayAbort;         /* True if statement may throw an ABORT exception */
  u8 hasCompound;      /* Need to invoke convertCompoundSelectToSubquery() */
  u8 okConstFactor;    /* OK to factor out constants */
  u8 disableLookaside; /* Number of times lookaside has been disabled */
  u8 disableVtab;      /* Disable all virtual tables for this parse */
  int nRangeReg;       /* Size of the temporary register block */
  int iRangeReg;       /* First register in temporary register block */
  int nErr;            /* Number of errors seen */
  int nTab;            /* Number of previously allocated VDBE cursors */
  int nMem;            /* Number of memory cells used so far */
  int szOpAlloc;       /* Bytes of memory space allocated for Vdbe.aOp[] */
  int iSelfTab;        /* Table associated with an index on expr, or negative
                       ** of the base register during check-constraint eval */
  int nLabel;          /* The *negative* of the number of labels used */
  int nLabelAlloc;     /* Number of slots in aLabel */
  int *aLabel;         /* Space to hold the labels */
  ExprList *pConstExpr;/* Constant expressions */
  Token constraintName;/* Name of the constraint currently being parsed */
  yDbMask writeMask;   /* Start a write transaction on these databases */
  yDbMask cookieMask;  /* Bitmask of schema verified databases */
  int regRowid;        /* Register holding rowid of CREATE TABLE entry */
  int regRoot;         /* Register holding root page number for new objects */
  int nMaxArg;         /* Max args passed to user function by sub-program */
  int nSelect;         /* Number of SELECT stmts. Counter for Select.selId */
#ifndef SQLITE_OMIT_SHARED_CACHE
  int nTableLock;        /* Number of locks in aTableLock */
  TableLock *aTableLock; /* Required table locks for shared-cache mode */
#endif
  AutoincInfo *pAinc;  /* Information about AUTOINCREMENT counters */
  Parse *pToplevel;    /* Parse structure for main program (or NULL) */
  Table *pTriggerTab;  /* Table triggers are being coded for */
  Parse *pParentParse; /* Parent parser if this parser is nested */
  AggInfo *pAggList;   /* List of all AggInfo objects */
  int addrCrTab;       /* Address of OP_CreateBtree opcode on CREATE TABLE */
  u32 nQueryLoop;      /* Est number of iterations of a query (10*log2(N)) */
  u32 oldmask;         /* Mask of old.* columns referenced */
  u32 newmask;         /* Mask of new.* columns referenced */
  u8 eTriggerOp;       /* TK_UPDATE, TK_INSERT or TK_DELETE */
  u8 eOrconf;          /* Default ON CONFLICT policy for trigger steps */
  u8 disableTriggers;  /* True to disable triggers */

  /**************************************************************************
  ** Fields above must be initialized to zero.  The fields that follow,
  ** down to the beginning of the recursive section, do not need to be
  ** initialized as they will be set before being used.  The boundary is
  ** determined by offsetof(Parse,aTempReg).
  **************************************************************************/

  int aTempReg[8];        /* Holding area for temporary registers */
  Token sNameToken;       /* Token with unqualified schema object name */

  /************************************************************************
  ** Above is constant between recursions.  Below is reset before and after
  ** each recursion.  The boundary between these two regions is determined
  ** using offsetof(Parse,sLastToken) so the sLastToken field must be the
  ** first field in the recursive region.
  ************************************************************************/

  Token sLastToken;       /* The last token parsed */
  ynVar nVar;               /* Number of '?' variables seen in the SQL so far */
  u8 iPkSortOrder;          /* ASC or DESC for INTEGER PRIMARY KEY */
  u8 explain;               /* True if the EXPLAIN flag is found on the query */
  u8 eParseMode;            /* PARSE_MODE_XXX constant */
#ifndef SQLITE_OMIT_VIRTUALTABLE
  int nVtabLock;            /* Number of virtual tables to lock */
#endif
  int nHeight;              /* Expression tree height of current sub-select */
#ifndef SQLITE_OMIT_EXPLAIN
  int addrExplain;          /* Address of current OP_Explain opcode */
#endif
  VList *pVList;            /* Mapping between variable names and numbers */
  Vdbe *pReprepare;         /* VM being reprepared (sqlite3Reprepare()) */
  const char *zTail;        /* All SQL text past the last semicolon parsed */
  Table *pNewTable;         /* A table being constructed by CREATE TABLE */
  Index *pNewIndex;         /* An index being constructed by CREATE INDEX.
                            ** Also used to hold redundant UNIQUE constraints
                            ** during a RENAME COLUMN */
  Trigger *pNewTrigger;     /* Trigger under construct by a CREATE TRIGGER */
  const char *zAuthContext; /* The 6th parameter to db->xAuth callbacks */
#ifndef SQLITE_OMIT_VIRTUALTABLE
  Token sArg;               /* Complete text of a module argument */
  Table **apVtabLock;       /* Pointer to virtual tables needing locking */
#endif
  Table *pZombieTab;        /* List of Table objects to delete after code gen */
  TriggerPrg *pTriggerPrg;  /* Linked list of coded triggers */
  With *pWith;              /* Current WITH clause, or NULL */
  With *pWithToFree;        /* Free this WITH object at the end of the parse */
#ifndef SQLITE_OMIT_ALTERTABLE
  RenameToken *pRename;     /* Tokens subject to renaming by ALTER TABLE */
#endif
};

#define PARSE_MODE_NORMAL        0
#define PARSE_MODE_DECLARE_VTAB  1
#define PARSE_MODE_RENAME        2
#define PARSE_MODE_UNMAP         3

/*
** Sizes and pointers of various parts of the Parse object.
*/
#define PARSE_HDR_SZ offsetof(Parse,aTempReg) /* Recursive part w/o aColCache*/
#define PARSE_RECURSE_SZ offsetof(Parse,sLastToken)    /* Recursive part */
#define PARSE_TAIL_SZ (sizeof(Parse)-PARSE_RECURSE_SZ) /* Non-recursive part */
#define PARSE_TAIL(X) (((char*)(X))+PARSE_RECURSE_SZ)  /* Pointer to tail */

/*
** Return true if currently inside an sqlite3_declare_vtab() call.
*/
#ifdef SQLITE_OMIT_VIRTUALTABLE
  #define IN_DECLARE_VTAB 0
#else
  #define IN_DECLARE_VTAB (pParse->eParseMode==PARSE_MODE_DECLARE_VTAB)
#endif

#if defined(SQLITE_OMIT_ALTERTABLE)
  #define IN_RENAME_OBJECT 0
#else
  #define IN_RENAME_OBJECT (pParse->eParseMode>=PARSE_MODE_RENAME)
#endif

#if defined(SQLITE_OMIT_VIRTUALTABLE) && defined(SQLITE_OMIT_ALTERTABLE)
  #define IN_SPECIAL_PARSE 0
#else
  #define IN_SPECIAL_PARSE (pParse->eParseMode!=PARSE_MODE_NORMAL)
#endif

/*
** An instance of the following structure can be declared on a stack and used
** to save the Parse.zAuthContext value so that it can be restored later.
*/
struct AuthContext {
  const char *zAuthContext;   /* Put saved Parse.zAuthContext here */
  Parse *pParse;              /* The Parse structure */
};

/*
** Bitfield flags for P5 value in various opcodes.
**
** Value constraints (enforced via assert()):
**    OPFLAG_LENGTHARG    == SQLITE_FUNC_LENGTH
**    OPFLAG_TYPEOFARG    == SQLITE_FUNC_TYPEOF
**    OPFLAG_BULKCSR      == BTREE_BULKLOAD
**    OPFLAG_SEEKEQ       == BTREE_SEEK_EQ
**    OPFLAG_FORDELETE    == BTREE_FORDELETE
**    OPFLAG_SAVEPOSITION == BTREE_SAVEPOSITION
**    OPFLAG_AUXDELETE    == BTREE_AUXDELETE
*/
#define OPFLAG_NCHANGE       0x01    /* OP_Insert: Set to update db->nChange */
                                     /* Also used in P2 (not P5) of OP_Delete */
#define OPFLAG_NOCHNG        0x01    /* OP_VColumn nochange for UPDATE */
#define OPFLAG_EPHEM         0x01    /* OP_Column: Ephemeral output is ok */
#define OPFLAG_LASTROWID     0x20    /* Set to update db->lastRowid */
#define OPFLAG_ISUPDATE      0x04    /* This OP_Insert is an sql UPDATE */
#define OPFLAG_APPEND        0x08    /* This is likely to be an append */
#define OPFLAG_USESEEKRESULT 0x10    /* Try to avoid a seek in BtreeInsert() */
#define OPFLAG_ISNOOP        0x40    /* OP_Delete does pre-update-hook only */
#define OPFLAG_LENGTHARG     0x40    /* OP_Column only used for length() */
#define OPFLAG_TYPEOFARG     0x80    /* OP_Column only used for typeof() */
#define OPFLAG_BULKCSR       0x01    /* OP_Open** used to open bulk cursor */
#define OPFLAG_SEEKEQ        0x02    /* OP_Open** cursor uses EQ seek only */
#define OPFLAG_FORDELETE     0x08    /* OP_Open should use BTREE_FORDELETE */
#define OPFLAG_P2ISREG       0x10    /* P2 to OP_Open** is a register number */
#define OPFLAG_PERMUTE       0x01    /* OP_Compare: use the permutation */
#define OPFLAG_SAVEPOSITION  0x02    /* OP_Delete/Insert: save cursor pos */
#define OPFLAG_AUXDELETE     0x04    /* OP_Delete: index in a DELETE op */
#define OPFLAG_NOCHNG_MAGIC  0x6d    /* OP_MakeRecord: serialtype 10 is ok */

/*
 * Each trigger present in the database schema is stored as an instance of
 * struct Trigger.
 *
 * Pointers to instances of struct Trigger are stored in two ways.
 * 1. In the "trigHash" hash table (part of the sqlite3* that represents the
 *    database). This allows Trigger structures to be retrieved by name.
 * 2. All triggers associated with a single table form a linked list, using the
 *    pNext member of struct Trigger. A pointer to the first element of the
 *    linked list is stored as the "pTrigger" member of the associated
 *    struct Table.
 *
 * The "step_list" member points to the first element of a linked list
 * containing the SQL statements specified as the trigger program.
 */
struct Trigger {
  char *zName;            /* The name of the trigger                        */
  char *table;            /* The table or view to which the trigger applies */
  u8 op;                  /* One of TK_DELETE, TK_UPDATE, TK_INSERT         */
  u8 tr_tm;               /* One of TRIGGER_BEFORE, TRIGGER_AFTER */
  Expr *pWhen;            /* The WHEN clause of the expression (may be NULL) */
  IdList *pColumns;       /* If this is an UPDATE OF <column-list> trigger,
                             the <column-list> is stored here */
  Schema *pSchema;        /* Schema containing the trigger */
  Schema *pTabSchema;     /* Schema containing the table */
  TriggerStep *step_list; /* Link list of trigger program steps             */
  Trigger *pNext;         /* Next trigger associated with the table */
};

/*
** A trigger is either a BEFORE or an AFTER trigger.  The following constants
** determine which.
**
** If there are multiple triggers, you might of some BEFORE and some AFTER.
** In that cases, the constants below can be ORed together.
*/
#define TRIGGER_BEFORE  1
#define TRIGGER_AFTER   2

/*
 * An instance of struct TriggerStep is used to store a single SQL statement
 * that is a part of a trigger-program.
 *
 * Instances of struct TriggerStep are stored in a singly linked list (linked
 * using the "pNext" member) referenced by the "step_list" member of the
 * associated struct Trigger instance. The first element of the linked list is
 * the first step of the trigger-program.
 *
 * The "op" member indicates whether this is a "DELETE", "INSERT", "UPDATE" or
 * "SELECT" statement. The meanings of the other members is determined by the
 * value of "op" as follows:
 *
 * (op == TK_INSERT)
 * orconf    -> stores the ON CONFLICT algorithm
 * pSelect   -> If this is an INSERT INTO ... SELECT ... statement, then
 *              this stores a pointer to the SELECT statement. Otherwise NULL.
 * zTarget   -> Dequoted name of the table to insert into.
 * pExprList -> If this is an INSERT INTO ... VALUES ... statement, then
 *              this stores values to be inserted. Otherwise NULL.
 * pIdList   -> If this is an INSERT INTO ... (<column-names>) VALUES ...
 *              statement, then this stores the column-names to be
 *              inserted into.
 *
 * (op == TK_DELETE)
 * zTarget   -> Dequoted name of the table to delete from.
 * pWhere    -> The WHERE clause of the DELETE statement if one is specified.
 *              Otherwise NULL.
 *
 * (op == TK_UPDATE)
 * zTarget   -> Dequoted name of the table to update.
 * pWhere    -> The WHERE clause of the UPDATE statement if one is specified.
 *              Otherwise NULL.
 * pExprList -> A list of the columns to update and the expressions to update
 *              them to. See sqlite3Update() documentation of "pChanges"
 *              argument.
 *
 */
struct TriggerStep {
  u8 op;               /* One of TK_DELETE, TK_UPDATE, TK_INSERT, TK_SELECT */
  u8 orconf;           /* OE_Rollback etc. */
  Trigger *pTrig;      /* The trigger that this step is a part of */
  Select *pSelect;     /* SELECT statement or RHS of INSERT INTO SELECT ... */
  char *zTarget;       /* Target table for DELETE, UPDATE, INSERT */
  SrcList *pFrom;      /* FROM clause for UPDATE statement (if any) */
  Expr *pWhere;        /* The WHERE clause for DELETE or UPDATE steps */
  ExprList *pExprList; /* SET clause for UPDATE */
  IdList *pIdList;     /* Column names for INSERT */
  Upsert *pUpsert;     /* Upsert clauses on an INSERT */
  char *zSpan;         /* Original SQL text of this command */
  TriggerStep *pNext;  /* Next in the link-list */
  TriggerStep *pLast;  /* Last element in link-list. Valid for 1st elem only */
};

/*
** The following structure contains information used by the sqliteFix...
** routines as they walk the parse tree to make database references
** explicit.
*/
typedef struct DbFixer DbFixer;
struct DbFixer {
  Parse *pParse;      /* The parsing context.  Error messages written here */
  Schema *pSchema;    /* Fix items to this schema */
  u8 bTemp;           /* True for TEMP schema entries */
  const char *zDb;    /* Make sure all objects are contained in this database */
  const char *zType;  /* Type of the container - used for error messages */
  const Token *pName; /* Name of the container - used for error messages */
};

/*
** An objected used to accumulate the text of a string where we
** do not necessarily know how big the string will be in the end.
*/
struct sqlite3_str {
  sqlite3 *db;         /* Optional database for lookaside.  Can be NULL */
  char *zText;         /* The string collected so far */
  u32  nAlloc;         /* Amount of space allocated in zText */
  u32  mxAlloc;        /* Maximum allowed allocation.  0 for no malloc usage */
  u32  nChar;          /* Length of the string so far */
  u8   accError;       /* SQLITE_NOMEM or SQLITE_TOOBIG */
  u8   printfFlags;    /* SQLITE_PRINTF flags below */
};
#define SQLITE_PRINTF_INTERNAL 0x01  /* Internal-use-only converters allowed */
#define SQLITE_PRINTF_SQLFUNC  0x02  /* SQL function arguments to VXPrintf */
#define SQLITE_PRINTF_MALLOCED 0x04  /* True if xText is allocated space */

#define isMalloced(X)  (((X)->printfFlags & SQLITE_PRINTF_MALLOCED)!=0)


/*
** A pointer to this structure is used to communicate information
** from sqlite3Init and OP_ParseSchema into the sqlite3InitCallback.
*/
typedef struct {
  sqlite3 *db;        /* The database being initialized */
  char **pzErrMsg;    /* Error message stored here */
  int iDb;            /* 0 for main database.  1 for TEMP, 2.. for ATTACHed */
  int rc;             /* Result code stored here */
  u32 mInitFlags;     /* Flags controlling error messages */
  u32 nInitRow;       /* Number of rows processed */
  Pgno mxPage;        /* Maximum page number.  0 for no limit. */
} InitData;

/*
** Allowed values for mInitFlags
*/
#define INITFLAG_AlterTable   0x0001  /* This is a reparse after ALTER TABLE */

/*
** Structure containing global configuration data for the SQLite library.
**
** This structure also contains some state information.
*/
struct Sqlite3Config {
  int bMemstat;                     /* True to enable memory status */
  u8 bCoreMutex;                    /* True to enable core mutexing */
  u8 bFullMutex;                    /* True to enable full mutexing */
  u8 bOpenUri;                      /* True to interpret filenames as URIs */
  u8 bUseCis;                       /* Use covering indices for full-scans */
  u8 bSmallMalloc;                  /* Avoid large memory allocations if true */
  u8 bExtraSchemaChecks;            /* Verify type,name,tbl_name in schema */
  int mxStrlen;                     /* Maximum string length */
  int neverCorrupt;                 /* Database is always well-formed */
  int szLookaside;                  /* Default lookaside buffer size */
  int nLookaside;                   /* Default lookaside buffer count */
  int nStmtSpill;                   /* Stmt-journal spill-to-disk threshold */
  sqlite3_mem_methods m;            /* Low-level memory allocation interface */
  sqlite3_mutex_methods mutex;      /* Low-level mutex interface */
  sqlite3_pcache_methods2 pcache2;  /* Low-level page-cache interface */
  void *pHeap;                      /* Heap storage space */
  int nHeap;                        /* Size of pHeap[] */
  int mnReq, mxReq;                 /* Min and max heap requests sizes */
  sqlite3_int64 szMmap;             /* mmap() space per open file */
  sqlite3_int64 mxMmap;             /* Maximum value for szMmap */
  void *pPage;                      /* Page cache memory */
  int szPage;                       /* Size of each page in pPage[] */
  int nPage;                        /* Number of pages in pPage[] */
  int mxParserStack;                /* maximum depth of the parser stack */
  int sharedCacheEnabled;           /* true if shared-cache mode enabled */
  u32 szPma;                        /* Maximum Sorter PMA size */
  /* The above might be initialized to non-zero.  The following need to always
  ** initially be zero, however. */
  int isInit;                       /* True after initialization has finished */
  int inProgress;                   /* True while initialization in progress */
  int isMutexInit;                  /* True after mutexes are initialized */
  int isMallocInit;                 /* True after malloc is initialized */
  int isPCacheInit;                 /* True after malloc is initialized */
  int nRefInitMutex;                /* Number of users of pInitMutex */
  sqlite3_mutex *pInitMutex;        /* Mutex used by sqlite3_initialize() */
  void (*xLog)(void*,int,const char*); /* Function for logging */
  void *pLogArg;                       /* First argument to xLog() */
#ifdef SQLITE_ENABLE_SQLLOG
  void(*xSqllog)(void*,sqlite3*,const char*, int);
  void *pSqllogArg;
#endif
#ifdef SQLITE_VDBE_COVERAGE
  /* The following callback (if not NULL) is invoked on every VDBE branch
  ** operation.  Set the callback using SQLITE_TESTCTRL_VDBE_COVERAGE.
  */
  void (*xVdbeBranch)(void*,unsigned iSrcLine,u8 eThis,u8 eMx);  /* Callback */
  void *pVdbeBranchArg;                                     /* 1st argument */
#endif
#ifdef SQLITE_ENABLE_DESERIALIZE
  sqlite3_int64 mxMemdbSize;        /* Default max memdb size */
#endif
#ifndef SQLITE_UNTESTABLE
  int (*xTestCallback)(int);        /* Invoked by sqlite3FaultSim() */
#endif
  int bLocaltimeFault;              /* True to fail localtime() calls */
  int iOnceResetThreshold;          /* When to reset OP_Once counters */
  u32 szSorterRef;                  /* Min size in bytes to use sorter-refs */
  unsigned int iPrngSeed;           /* Alternative fixed seed for the PRNG */
};

/*
** This macro is used inside of assert() statements to indicate that
** the assert is only valid on a well-formed database.  Instead of:
**
**     assert( X );
**
** One writes:
**
**     assert( X || CORRUPT_DB );
**
** CORRUPT_DB is true during normal operation.  CORRUPT_DB does not indicate
** that the database is definitely corrupt, only that it might be corrupt.
** For most test cases, CORRUPT_DB is set to false using a special
** sqlite3_test_control().  This enables assert() statements to prove
** things that are always true for well-formed databases.
*/
#define CORRUPT_DB  (sqlite3Config.neverCorrupt==0)

/*
** Context pointer passed down through the tree-walk.
*/
struct Walker {
  Parse *pParse;                            /* Parser context.  */
  int (*xExprCallback)(Walker*, Expr*);     /* Callback for expressions */
  int (*xSelectCallback)(Walker*,Select*);  /* Callback for SELECTs */
  void (*xSelectCallback2)(Walker*,Select*);/* Second callback for SELECTs */
  int walkerDepth;                          /* Number of subqueries */
  u16 eCode;                                /* A small processing code */
  union {                                   /* Extra data for callback */
    NameContext *pNC;                         /* Naming context */
    int n;                                    /* A counter */
    int iCur;                                 /* A cursor number */
    SrcList *pSrcList;                        /* FROM clause */
    struct SrcCount *pSrcCount;               /* Counting column references */
    struct CCurHint *pCCurHint;               /* Used by codeCursorHint() */
    int *aiCol;                               /* array of column indexes */
    struct IdxCover *pIdxCover;               /* Check for index coverage */
    struct IdxExprTrans *pIdxTrans;           /* Convert idxed expr to column */
    ExprList *pGroupBy;                       /* GROUP BY clause */
    Select *pSelect;                          /* HAVING to WHERE clause ctx */
    struct WindowRewrite *pRewrite;           /* Window rewrite context */
    struct WhereConst *pConst;                /* WHERE clause constants */
    struct RenameCtx *pRename;                /* RENAME COLUMN context */
    struct Table *pTab;                       /* Table of generated column */
    struct SrcList_item *pSrcItem;            /* A single FROM clause item */
  } u;
};

/* Forward declarations */
int sqlite3WalkExpr(Walker*, Expr*);
int sqlite3WalkExprList(Walker*, ExprList*);
int sqlite3WalkSelect(Walker*, Select*);
int sqlite3WalkSelectExpr(Walker*, Select*);
int sqlite3WalkSelectFrom(Walker*, Select*);
int sqlite3ExprWalkNoop(Walker*, Expr*);
int sqlite3SelectWalkNoop(Walker*, Select*);
int sqlite3SelectWalkFail(Walker*, Select*);
int sqlite3WalkerDepthIncrease(Walker*,Select*);
void sqlite3WalkerDepthDecrease(Walker*,Select*);

#ifdef SQLITE_DEBUG
void sqlite3SelectWalkAssert2(Walker*, Select*);
#endif

/*
** Return code from the parse-tree walking primitives and their
** callbacks.
*/
#define WRC_Continue    0   /* Continue down into children */
#define WRC_Prune       1   /* Omit children but continue walking siblings */
#define WRC_Abort       2   /* Abandon the tree walk */

/*
** An instance of this structure represents a set of one or more CTEs
** (common table expressions) created by a single WITH clause.
*/
struct With {
  int nCte;                       /* Number of CTEs in the WITH clause */
  With *pOuter;                   /* Containing WITH clause, or NULL */
  struct Cte {                    /* For each CTE in the WITH clause.... */
    char *zName;                    /* Name of this CTE */
    ExprList *pCols;                /* List of explicit column names, or NULL */
    Select *pSelect;                /* The definition of this CTE */
    const char *zCteErr;            /* Error message for circular references */
  } a[1];
};

#ifdef SQLITE_DEBUG
/*
** An instance of the TreeView object is used for printing the content of
** data structures on sqlite3DebugPrintf() using a tree-like view.
*/
struct TreeView {
  int iLevel;             /* Which level of the tree we are on */
  u8  bLine[100];         /* Draw vertical in column i if bLine[i] is true */
};
#endif /* SQLITE_DEBUG */

/*
** This object is used in various ways, most (but not all) related to window
** functions.
**
**   (1) A single instance of this structure is attached to the
**       the Expr.y.pWin field for each window function in an expression tree.
**       This object holds the information contained in the OVER clause,
**       plus additional fields used during code generation.
**
**   (2) All window functions in a single SELECT form a linked-list
**       attached to Select.pWin.  The Window.pFunc and Window.pExpr
**       fields point back to the expression that is the window function.
**
**   (3) The terms of the WINDOW clause of a SELECT are instances of this
**       object on a linked list attached to Select.pWinDefn.
**
**   (4) For an aggregate function with a FILTER clause, an instance
**       of this object is stored in Expr.y.pWin with eFrmType set to
**       TK_FILTER. In this case the only field used is Window.pFilter.
**
** The uses (1) and (2) are really the same Window object that just happens
** to be accessible in two different ways.  Use case (3) are separate objects.
*/
struct Window {
  char *zName;            /* Name of window (may be NULL) */
  char *zBase;            /* Name of base window for chaining (may be NULL) */
  ExprList *pPartition;   /* PARTITION BY clause */
  ExprList *pOrderBy;     /* ORDER BY clause */
  u8 eFrmType;            /* TK_RANGE, TK_GROUPS, TK_ROWS, or 0 */
  u8 eStart;              /* UNBOUNDED, CURRENT, PRECEDING or FOLLOWING */
  u8 eEnd;                /* UNBOUNDED, CURRENT, PRECEDING or FOLLOWING */
  u8 bImplicitFrame;      /* True if frame was implicitly specified */
  u8 eExclude;            /* TK_NO, TK_CURRENT, TK_TIES, TK_GROUP, or 0 */
  Expr *pStart;           /* Expression for "<expr> PRECEDING" */
  Expr *pEnd;             /* Expression for "<expr> FOLLOWING" */
  Window **ppThis;        /* Pointer to this object in Select.pWin list */
  Window *pNextWin;       /* Next window function belonging to this SELECT */
  Expr *pFilter;          /* The FILTER expression */
  FuncDef *pFunc;         /* The function */
  int iEphCsr;            /* Partition buffer or Peer buffer */
  int regAccum;           /* Accumulator */
  int regResult;          /* Interim result */
  int csrApp;             /* Function cursor (used by min/max) */
  int regApp;             /* Function register (also used by min/max) */
  int regPart;            /* Array of registers for PARTITION BY values */
  Expr *pOwner;           /* Expression object this window is attached to */
  int nBufferCol;         /* Number of columns in buffer table */
  int iArgCol;            /* Offset of first argument for this function */
  int regOne;             /* Register containing constant value 1 */
  int regStartRowid;
  int regEndRowid;
  u8 bExprArgs;           /* Defer evaluation of window function arguments
                          ** due to the SQLITE_SUBTYPE flag */
};

#ifndef SQLITE_OMIT_WINDOWFUNC
void sqlite3WindowDelete(sqlite3*, Window*);
void sqlite3WindowUnlinkFromSelect(Window*);
void sqlite3WindowListDelete(sqlite3 *db, Window *p);
Window *sqlite3WindowAlloc(Parse*, int, int, Expr*, int , Expr*, u8);
void sqlite3WindowAttach(Parse*, Expr*, Window*);
void sqlite3WindowLink(Select *pSel, Window *pWin);
int sqlite3WindowCompare(Parse*, Window*, Window*, int);
void sqlite3WindowCodeInit(Parse*, Select*);
void sqlite3WindowCodeStep(Parse*, Select*, WhereInfo*, int, int);
int sqlite3WindowRewrite(Parse*, Select*);
int sqlite3ExpandSubquery(Parse*, struct SrcList_item*);
void sqlite3WindowUpdate(Parse*, Window*, Window*, FuncDef*);
Window *sqlite3WindowDup(sqlite3 *db, Expr *pOwner, Window *p);
Window *sqlite3WindowListDup(sqlite3 *db, Window *p);
void sqlite3WindowFunctions(void);
void sqlite3WindowChain(Parse*, Window*, Window*);
Window *sqlite3WindowAssemble(Parse*, Window*, ExprList*, ExprList*, Token*);
#else
# define sqlite3WindowDelete(a,b)
# define sqlite3WindowFunctions()
# define sqlite3WindowAttach(a,b,c)
#endif

/*
** Assuming zIn points to the first byte of a UTF-8 character,
** advance zIn to point to the first byte of the next UTF-8 character.
*/
#define SQLITE_SKIP_UTF8(zIn) {                        \
  if( (*(zIn++))>=0xc0 ){                              \
    while( (*zIn & 0xc0)==0x80 ){ zIn++; }             \
  }                                                    \
}

/*
** The SQLITE_*_BKPT macros are substitutes for the error codes with
** the same name but without the _BKPT suffix.  These macros invoke
** routines that report the line-number on which the error originated
** using sqlite3_log().  The routines also provide a convenient place
** to set a debugger breakpoint.
*/
int sqlite3ReportError(int iErr, int lineno, const char *zType);
int sqlite3CorruptError(int);
int sqlite3MisuseError(int);
int sqlite3CantopenError(int);
#define SQLITE_CORRUPT_BKPT sqlite3CorruptError(__LINE__)
#define SQLITE_MISUSE_BKPT sqlite3MisuseError(__LINE__)
#define SQLITE_CANTOPEN_BKPT sqlite3CantopenError(__LINE__)
#ifdef SQLITE_DEBUG
  int sqlite3NomemError(int);
  int sqlite3IoerrnomemError(int);
# define SQLITE_NOMEM_BKPT sqlite3NomemError(__LINE__)
# define SQLITE_IOERR_NOMEM_BKPT sqlite3IoerrnomemError(__LINE__)
#else
# define SQLITE_NOMEM_BKPT SQLITE_NOMEM
# define SQLITE_IOERR_NOMEM_BKPT SQLITE_IOERR_NOMEM
#endif
#if defined(SQLITE_DEBUG) || defined(SQLITE_ENABLE_CORRUPT_PGNO)
  int sqlite3CorruptPgnoError(int,Pgno);
# define SQLITE_CORRUPT_PGNO(P) sqlite3CorruptPgnoError(__LINE__,(P))
#else
# define SQLITE_CORRUPT_PGNO(P) sqlite3CorruptError(__LINE__)
#endif

/*
** FTS3 and FTS4 both require virtual table support
*/
#if defined(SQLITE_OMIT_VIRTUALTABLE)
# undef SQLITE_ENABLE_FTS3
# undef SQLITE_ENABLE_FTS4
#endif

/*
** FTS4 is really an extension for FTS3.  It is enabled using the
** SQLITE_ENABLE_FTS3 macro.  But to avoid confusion we also call
** the SQLITE_ENABLE_FTS4 macro to serve as an alias for SQLITE_ENABLE_FTS3.
*/
#if defined(SQLITE_ENABLE_FTS4) && !defined(SQLITE_ENABLE_FTS3)
# define SQLITE_ENABLE_FTS3 1
#endif

/*
** The ctype.h header is needed for non-ASCII systems.  It is also
** needed by FTS3 when FTS3 is included in the amalgamation.
*/
#if !defined(SQLITE_ASCII) || \
    (defined(SQLITE_ENABLE_FTS3) && defined(SQLITE_AMALGAMATION))
# include <ctype.h>
#endif

/*
** The following macros mimic the standard library functions toupper(),
** isspace(), isalnum(), isdigit() and isxdigit(), respectively. The
** sqlite versions only work for ASCII characters, regardless of locale.
*/
#ifdef SQLITE_ASCII
# define sqlite3Toupper(x)  ((x)&~(sqlite3CtypeMap[(unsigned char)(x)]&0x20))
# define sqlite3Isspace(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x01)
# define sqlite3Isalnum(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x06)
# define sqlite3Isalpha(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x02)
# define sqlite3Isdigit(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x04)
# define sqlite3Isxdigit(x)  (sqlite3CtypeMap[(unsigned char)(x)]&0x08)
# define sqlite3Tolower(x)   (sqlite3UpperToLower[(unsigned char)(x)])
# define sqlite3Isquote(x)   (sqlite3CtypeMap[(unsigned char)(x)]&0x80)
#else
# define sqlite3Toupper(x)   toupper((unsigned char)(x))
# define sqlite3Isspace(x)   isspace((unsigned char)(x))
# define sqlite3Isalnum(x)   isalnum((unsigned char)(x))
# define sqlite3Isalpha(x)   isalpha((unsigned char)(x))
# define sqlite3Isdigit(x)   isdigit((unsigned char)(x))
# define sqlite3Isxdigit(x)  isxdigit((unsigned char)(x))
# define sqlite3Tolower(x)   tolower((unsigned char)(x))
# define sqlite3Isquote(x)   ((x)=='"'||(x)=='\''||(x)=='['||(x)=='`')
#endif
int sqlite3IsIdChar(u8);

/*
** Internal function prototypes
*/
int sqlite3StrICmp(const char*,const char*);
int sqlite3Strlen30(const char*);
#define sqlite3Strlen30NN(C) (strlen(C)&0x3fffffff)
char *sqlite3ColumnType(Column*,char*);
#define sqlite3StrNICmp sqlite3_strnicmp

int sqlite3MallocInit(void);
void sqlite3MallocEnd(void);
void *sqlite3Malloc(u64);
void *sqlite3MallocZero(u64);
void *sqlite3DbMallocZero(sqlite3*, u64);
void *sqlite3DbMallocRaw(sqlite3*, u64);
void *sqlite3DbMallocRawNN(sqlite3*, u64);
char *sqlite3DbStrDup(sqlite3*,const char*);
char *sqlite3DbStrNDup(sqlite3*,const char*, u64);
char *sqlite3DbSpanDup(sqlite3*,const char*,const char*);
void *sqlite3Realloc(void*, u64);
void *sqlite3DbReallocOrFree(sqlite3 *, void *, u64);
void *sqlite3DbRealloc(sqlite3 *, void *, u64);
void sqlite3DbFree(sqlite3*, void*);
void sqlite3DbFreeNN(sqlite3*, void*);
int sqlite3MallocSize(void*);
int sqlite3DbMallocSize(sqlite3*, void*);
void *sqlite3PageMalloc(int);
void sqlite3PageFree(void*);
void sqlite3MemSetDefault(void);
#ifndef SQLITE_UNTESTABLE
void sqlite3BenignMallocHooks(void (*)(void), void (*)(void));
#endif
int sqlite3HeapNearlyFull(void);

/*
** On systems with ample stack space and that support alloca(), make
** use of alloca() to obtain space for large automatic objects.  By default,
** obtain space from malloc().
**
** The alloca() routine never returns NULL.  This will cause code paths
** that deal with sqlite3StackAlloc() failures to be unreachable.
*/
#ifdef SQLITE_USE_ALLOCA
# define sqlite3StackAllocRaw(D,N)   alloca(N)
# define sqlite3StackAllocZero(D,N)  memset(alloca(N), 0, N)
# define sqlite3StackFree(D,P)
#else
# define sqlite3StackAllocRaw(D,N)   sqlite3DbMallocRaw(D,N)
# define sqlite3StackAllocZero(D,N)  sqlite3DbMallocZero(D,N)
# define sqlite3StackFree(D,P)       sqlite3DbFree(D,P)
#endif

/* Do not allow both MEMSYS5 and MEMSYS3 to be defined together.  If they
** are, disable MEMSYS3
*/
#ifdef SQLITE_ENABLE_MEMSYS5
const sqlite3_mem_methods *sqlite3MemGetMemsys5(void);
#undef SQLITE_ENABLE_MEMSYS3
#endif
#ifdef SQLITE_ENABLE_MEMSYS3
const sqlite3_mem_methods *sqlite3MemGetMemsys3(void);
#endif


#ifndef SQLITE_MUTEX_OMIT
  sqlite3_mutex_methods const *sqlite3DefaultMutex(void);
  sqlite3_mutex_methods const *sqlite3NoopMutex(void);
  sqlite3_mutex *sqlite3MutexAlloc(int);
  int sqlite3MutexInit(void);
  int sqlite3MutexEnd(void);
#endif
#if !defined(SQLITE_MUTEX_OMIT) && !defined(SQLITE_MUTEX_NOOP)
  void sqlite3MemoryBarrier(void);
#else
# define sqlite3MemoryBarrier()
#endif

sqlite3_int64 sqlite3StatusValue(int);
void sqlite3StatusUp(int, int);
void sqlite3StatusDown(int, int);
void sqlite3StatusHighwater(int, int);
int sqlite3LookasideUsed(sqlite3*,int*);

/* Access to mutexes used by sqlite3_status() */
sqlite3_mutex *sqlite3Pcache1Mutex(void);
sqlite3_mutex *sqlite3MallocMutex(void);

#if defined(SQLITE_ENABLE_MULTITHREADED_CHECKS) && !defined(SQLITE_MUTEX_OMIT)
void sqlite3MutexWarnOnContention(sqlite3_mutex*);
#else
# define sqlite3MutexWarnOnContention(x)
#endif

#ifndef SQLITE_OMIT_FLOATING_POINT
# define EXP754 (((u64)0x7ff)<<52)
# define MAN754 ((((u64)1)<<52)-1)
# define IsNaN(X) (((X)&EXP754)==EXP754 && ((X)&MAN754)!=0)
  int sqlite3IsNaN(double);
#else
# define IsNaN(X)         0
# define sqlite3IsNaN(X)  0
#endif

/*
** An instance of the following structure holds information about SQL
** functions arguments that are the parameters to the printf() function.
*/
struct PrintfArguments {
  int nArg;                /* Total number of arguments */
  int nUsed;               /* Number of arguments used so far */
  sqlite3_value **apArg;   /* The argument values */
};

char *sqlite3MPrintf(sqlite3*,const char*, ...);
char *sqlite3VMPrintf(sqlite3*,const char*, va_list);
#if defined(SQLITE_DEBUG) || defined(SQLITE_HAVE_OS_TRACE)
  void sqlite3DebugPrintf(const char*, ...);
#endif
#if defined(SQLITE_TEST)
  void *sqlite3TestTextToPtr(const char*);
#endif

#if defined(SQLITE_DEBUG)
  void sqlite3TreeViewExpr(TreeView*, const Expr*, u8);
  void sqlite3TreeViewBareExprList(TreeView*, const ExprList*, const char*);
  void sqlite3TreeViewExprList(TreeView*, const ExprList*, u8, const char*);
  void sqlite3TreeViewSrcList(TreeView*, const SrcList*);
  void sqlite3TreeViewSelect(TreeView*, const Select*, u8);
  void sqlite3TreeViewWith(TreeView*, const With*, u8);
#ifndef SQLITE_OMIT_WINDOWFUNC
  void sqlite3TreeViewWindow(TreeView*, const Window*, u8);
  void sqlite3TreeViewWinFunc(TreeView*, const Window*, u8);
#endif
#endif


void sqlite3SetString(char **, sqlite3*, const char*);
void sqlite3ErrorMsg(Parse*, const char*, ...);
int sqlite3ErrorToParser(sqlite3*,int);
void sqlite3Dequote(char*);
void sqlite3DequoteExpr(Expr*);
void sqlite3TokenInit(Token*,char*);
int sqlite3KeywordCode(const unsigned char*, int);
int sqlite3RunParser(Parse*, const char*, char **);
void sqlite3FinishCoding(Parse*);
int sqlite3GetTempReg(Parse*);
void sqlite3ReleaseTempReg(Parse*,int);
int sqlite3GetTempRange(Parse*,int);
void sqlite3ReleaseTempRange(Parse*,int,int);
void sqlite3ClearTempRegCache(Parse*);
#ifdef SQLITE_DEBUG
int sqlite3NoTempsInRange(Parse*,int,int);
#endif
Expr *sqlite3ExprAlloc(sqlite3*,int,const Token*,int);
Expr *sqlite3Expr(sqlite3*,int,const char*);
void sqlite3ExprAttachSubtrees(sqlite3*,Expr*,Expr*,Expr*);
Expr *sqlite3PExpr(Parse*, int, Expr*, Expr*);
void sqlite3PExprAddSelect(Parse*, Expr*, Select*);
Expr *sqlite3ExprAnd(Parse*,Expr*, Expr*);
Expr *sqlite3ExprSimplifiedAndOr(Expr*);
Expr *sqlite3ExprFunction(Parse*,ExprList*, Token*, int);
void sqlite3ExprFunctionUsable(Parse*,Expr*,FuncDef*);
void sqlite3ExprAssignVarNumber(Parse*, Expr*, u32);
void sqlite3ExprDelete(sqlite3*, Expr*);
void sqlite3ExprUnmapAndDelete(Parse*, Expr*);
ExprList *sqlite3ExprListAppend(Parse*,ExprList*,Expr*);
ExprList *sqlite3ExprListAppendVector(Parse*,ExprList*,IdList*,Expr*);
void sqlite3ExprListSetSortOrder(ExprList*,int,int);
void sqlite3ExprListSetName(Parse*,ExprList*,Token*,int);
void sqlite3ExprListSetSpan(Parse*,ExprList*,const char*,const char*);
void sqlite3ExprListDelete(sqlite3*, ExprList*);
u32 sqlite3ExprListFlags(const ExprList*);
int sqlite3IndexHasDuplicateRootPage(Index*);
int sqlite3Init(sqlite3*, char**);
int sqlite3InitCallback(void*, int, char**, char**);
int sqlite3InitOne(sqlite3*, int, char**, u32);
void sqlite3Pragma(Parse*,Token*,Token*,Token*,int);
#ifndef SQLITE_OMIT_VIRTUALTABLE
Module *sqlite3PragmaVtabRegister(sqlite3*,const char *zName);
#endif
void sqlite3ResetAllSchemasOfConnection(sqlite3*);
void sqlite3ResetOneSchema(sqlite3*,int);
void sqlite3CollapseDatabaseArray(sqlite3*);
void sqlite3CommitInternalChanges(sqlite3*);
void sqlite3DeleteColumnNames(sqlite3*,Table*);
int sqlite3ColumnsFromExprList(Parse*,ExprList*,i16*,Column**);
void sqlite3SelectAddColumnTypeAndCollation(Parse*,Table*,Select*,char);
Table *sqlite3ResultSetOfSelect(Parse*,Select*,char);
void sqlite3OpenSchemaTable(Parse *, int);
Index *sqlite3PrimaryKeyIndex(Table*);
i16 sqlite3TableColumnToIndex(Index*, i16);
#ifdef SQLITE_OMIT_GENERATED_COLUMNS
# define sqlite3TableColumnToStorage(T,X) (X)  /* No-op pass-through */
# define sqlite3StorageColumnToTable(T,X) (X)  /* No-op pass-through */
#else
  i16 sqlite3TableColumnToStorage(Table*, i16);
  i16 sqlite3StorageColumnToTable(Table*, i16);
#endif
void sqlite3StartTable(Parse*,Token*,Token*,int,int,int,int);
#if SQLITE_ENABLE_HIDDEN_COLUMNS
  void sqlite3ColumnPropertiesFromName(Table*, Column*);
#else
# define sqlite3ColumnPropertiesFromName(T,C) /* no-op */
#endif
void sqlite3AddColumn(Parse*,Token*,Token*);
void sqlite3AddNotNull(Parse*, int);
void sqlite3AddPrimaryKey(Parse*, ExprList*, int, int, int);
void sqlite3AddCheckConstraint(Parse*, Expr*);
void sqlite3AddDefaultValue(Parse*,Expr*,const char*,const char*);
void sqlite3AddCollateType(Parse*, Token*);
void sqlite3AddGenerated(Parse*,Expr*,Token*);
void sqlite3EndTable(Parse*,Token*,Token*,u8,Select*);
int sqlite3ParseUri(const char*,const char*,unsigned int*,
                    sqlite3_vfs**,char**,char **);
#define sqlite3CodecQueryParameters(A,B,C) 0
Btree *sqlite3DbNameToBtree(sqlite3*,const char*);

#ifdef SQLITE_UNTESTABLE
# define sqlite3FaultSim(X) SQLITE_OK
#else
  int sqlite3FaultSim(int);
#endif

Bitvec *sqlite3BitvecCreate(u32);
int sqlite3BitvecTest(Bitvec*, u32);
int sqlite3BitvecTestNotNull(Bitvec*, u32);
int sqlite3BitvecSet(Bitvec*, u32);
void sqlite3BitvecClear(Bitvec*, u32, void*);
void sqlite3BitvecDestroy(Bitvec*);
u32 sqlite3BitvecSize(Bitvec*);
#ifndef SQLITE_UNTESTABLE
int sqlite3BitvecBuiltinTest(int,int*);
#endif

RowSet *sqlite3RowSetInit(sqlite3*);
void sqlite3RowSetDelete(void*);
void sqlite3RowSetClear(void*);
void sqlite3RowSetInsert(RowSet*, i64);
int sqlite3RowSetTest(RowSet*, int iBatch, i64);
int sqlite3RowSetNext(RowSet*, i64*);

void sqlite3CreateView(Parse*,Token*,Token*,Token*,ExprList*,Select*,int,int);

#if !defined(SQLITE_OMIT_VIEW) || !defined(SQLITE_OMIT_VIRTUALTABLE)
  int sqlite3ViewGetColumnNames(Parse*,Table*);
#else
# define sqlite3ViewGetColumnNames(A,B) 0
#endif

#if SQLITE_MAX_ATTACHED>30
  int sqlite3DbMaskAllZero(yDbMask);
#endif
void sqlite3DropTable(Parse*, SrcList*, int, int);
void sqlite3CodeDropTable(Parse*, Table*, int, int);
void sqlite3DeleteTable(sqlite3*, Table*);
void sqlite3FreeIndex(sqlite3*, Index*);
#ifndef SQLITE_OMIT_AUTOINCREMENT
  void sqlite3AutoincrementBegin(Parse *pParse);
  void sqlite3AutoincrementEnd(Parse *pParse);
#else
# define sqlite3AutoincrementBegin(X)
# define sqlite3AutoincrementEnd(X)
#endif
void sqlite3Insert(Parse*, SrcList*, Select*, IdList*, int, Upsert*);
#ifndef SQLITE_OMIT_GENERATED_COLUMNS
  void sqlite3ComputeGeneratedColumns(Parse*, int, Table*);
#endif
void *sqlite3ArrayAllocate(sqlite3*,void*,int,int*,int*);
IdList *sqlite3IdListAppend(Parse*, IdList*, Token*);
int sqlite3IdListIndex(IdList*,const char*);
SrcList *sqlite3SrcListEnlarge(Parse*, SrcList*, int, int);
SrcList *sqlite3SrcListAppendList(Parse *pParse, SrcList *p1, SrcList *p2);
SrcList *sqlite3SrcListAppend(Parse*, SrcList*, Token*, Token*);
SrcList *sqlite3SrcListAppendFromTerm(Parse*, SrcList*, Token*, Token*,
                                      Token*, Select*, Expr*, IdList*);
void sqlite3SrcListIndexedBy(Parse *, SrcList *, Token *);
void sqlite3SrcListFuncArgs(Parse*, SrcList*, ExprList*);
int sqlite3IndexedByLookup(Parse *, struct SrcList_item *);
void sqlite3SrcListShiftJoinType(SrcList*);
void sqlite3SrcListAssignCursors(Parse*, SrcList*);
void sqlite3IdListDelete(sqlite3*, IdList*);
void sqlite3SrcListDelete(sqlite3*, SrcList*);
Index *sqlite3AllocateIndexObject(sqlite3*,i16,int,char**);
void sqlite3CreateIndex(Parse*,Token*,Token*,SrcList*,ExprList*,int,Token*,
                          Expr*, int, int, u8);
void sqlite3DropIndex(Parse*, SrcList*, int);
int sqlite3Select(Parse*, Select*, SelectDest*);
Select *sqlite3SelectNew(Parse*,ExprList*,SrcList*,Expr*,ExprList*,
                         Expr*,ExprList*,u32,Expr*);
void sqlite3SelectDelete(sqlite3*, Select*);
Table *sqlite3SrcListLookup(Parse*, SrcList*);
int sqlite3IsReadOnly(Parse*, Table*, int);
void sqlite3OpenTable(Parse*, int iCur, int iDb, Table*, int);
#if defined(SQLITE_ENABLE_UPDATE_DELETE_LIMIT) && !defined(SQLITE_OMIT_SUBQUERY)
Expr *sqlite3LimitWhere(Parse*,SrcList*,Expr*,ExprList*,Expr*,char*);
#endif
void sqlite3DeleteFrom(Parse*, SrcList*, Expr*, ExprList*, Expr*);
void sqlite3Update(Parse*, SrcList*, ExprList*,Expr*,int,ExprList*,Expr*,
                   Upsert*);
WhereInfo *sqlite3WhereBegin(Parse*,SrcList*,Expr*,ExprList*,ExprList*,u16,int);
void sqlite3WhereEnd(WhereInfo*);
LogEst sqlite3WhereOutputRowCount(WhereInfo*);
int sqlite3WhereIsDistinct(WhereInfo*);
int sqlite3WhereIsOrdered(WhereInfo*);
int sqlite3WhereOrderByLimitOptLabel(WhereInfo*);
int sqlite3WhereIsSorted(WhereInfo*);
int sqlite3WhereContinueLabel(WhereInfo*);
int sqlite3WhereBreakLabel(WhereInfo*);
int sqlite3WhereOkOnePass(WhereInfo*, int*);
#define ONEPASS_OFF      0        /* Use of ONEPASS not allowed */
#define ONEPASS_SINGLE   1        /* ONEPASS valid for a single row update */
#define ONEPASS_MULTI    2        /* ONEPASS is valid for multiple rows */
int sqlite3WhereUsesDeferredSeek(WhereInfo*);
void sqlite3ExprCodeLoadIndexColumn(Parse*, Index*, int, int, int);
int sqlite3ExprCodeGetColumn(Parse*, Table*, int, int, int, u8);
void sqlite3ExprCodeGetColumnOfTable(Vdbe*, Table*, int, int, int);
void sqlite3ExprCodeMove(Parse*, int, int, int);
void sqlite3ExprCode(Parse*, Expr*, int);
#ifndef SQLITE_OMIT_GENERATED_COLUMNS
void sqlite3ExprCodeGeneratedColumn(Parse*, Column*, int);
#endif
void sqlite3ExprCodeCopy(Parse*, Expr*, int);
void sqlite3ExprCodeFactorable(Parse*, Expr*, int);
int sqlite3ExprCodeRunJustOnce(Parse*, Expr*, int);
int sqlite3ExprCodeTemp(Parse*, Expr*, int*);
int sqlite3ExprCodeTarget(Parse*, Expr*, int);
int sqlite3ExprCodeExprList(Parse*, ExprList*, int, int, u8);
#define SQLITE_ECEL_DUP      0x01  /* Deep, not shallow copies */
#define SQLITE_ECEL_FACTOR   0x02  /* Factor out constant terms */
#define SQLITE_ECEL_REF      0x04  /* Use ExprList.u.x.iOrderByCol */
#define SQLITE_ECEL_OMITREF  0x08  /* Omit if ExprList.u.x.iOrderByCol */
void sqlite3ExprIfTrue(Parse*, Expr*, int, int);
void sqlite3ExprIfFalse(Parse*, Expr*, int, int);
void sqlite3ExprIfFalseDup(Parse*, Expr*, int, int);
Table *sqlite3FindTable(sqlite3*,const char*, const char*);
#define LOCATE_VIEW    0x01
#define LOCATE_NOERR   0x02
Table *sqlite3LocateTable(Parse*,u32 flags,const char*, const char*);
Table *sqlite3LocateTableItem(Parse*,u32 flags,struct SrcList_item *);
Index *sqlite3FindIndex(sqlite3*,const char*, const char*);
void sqlite3UnlinkAndDeleteTable(sqlite3*,int,const char*);
void sqlite3UnlinkAndDeleteIndex(sqlite3*,int,const char*);
void sqlite3Vacuum(Parse*,Token*,Expr*);
int sqlite3RunVacuum(char**, sqlite3*, int, sqlite3_value*);
char *sqlite3NameFromToken(sqlite3*, Token*);
int sqlite3ExprCompare(Parse*,Expr*, Expr*, int);
int sqlite3ExprCompareSkip(Expr*, Expr*, int);
int sqlite3ExprListCompare(ExprList*, ExprList*, int);
int sqlite3ExprImpliesExpr(Parse*,Expr*, Expr*, int);
int sqlite3ExprImpliesNonNullRow(Expr*,int);
void sqlite3AggInfoPersistWalkerInit(Walker*,Parse*);
void sqlite3ExprAnalyzeAggregates(NameContext*, Expr*);
void sqlite3ExprAnalyzeAggList(NameContext*,ExprList*);
int sqlite3ExprCoveredByIndex(Expr*, int iCur, Index *pIdx);
int sqlite3FunctionUsesThisSrc(Expr*, SrcList*);
Vdbe *sqlite3GetVdbe(Parse*);
#ifndef SQLITE_UNTESTABLE
void sqlite3PrngSaveState(void);
void sqlite3PrngRestoreState(void);
#endif
void sqlite3RollbackAll(sqlite3*,int);
void sqlite3CodeVerifySchema(Parse*, int);
void sqlite3CodeVerifyNamedSchema(Parse*, const char *zDb);
void sqlite3BeginTransaction(Parse*, int);
void sqlite3EndTransaction(Parse*,int);
void sqlite3Savepoint(Parse*, int, Token*);
void sqlite3CloseSavepoints(sqlite3 *);
void sqlite3LeaveMutexAndCloseZombie(sqlite3*);
u32 sqlite3IsTrueOrFalse(const char*);
int sqlite3ExprIdToTrueFalse(Expr*);
int sqlite3ExprTruthValue(const Expr*);
int sqlite3ExprIsConstant(Expr*);
int sqlite3ExprIsConstantNotJoin(Expr*);
int sqlite3ExprIsConstantOrFunction(Expr*, u8);
int sqlite3ExprIsConstantOrGroupBy(Parse*, Expr*, ExprList*);
int sqlite3ExprIsTableConstant(Expr*,int);
#ifdef SQLITE_ENABLE_CURSOR_HINTS
int sqlite3ExprContainsSubquery(Expr*);
#endif
int sqlite3ExprIsInteger(Expr*, int*);
int sqlite3ExprCanBeNull(const Expr*);
int sqlite3ExprNeedsNoAffinityChange(const Expr*, char);
int sqlite3IsRowid(const char*);
void sqlite3GenerateRowDelete(
    Parse*,Table*,Trigger*,int,int,int,i16,u8,u8,u8,int);
void sqlite3GenerateRowIndexDelete(Parse*, Table*, int, int, int*, int);
int sqlite3GenerateIndexKey(Parse*, Index*, int, int, int, int*,Index*,int);
void sqlite3ResolvePartIdxLabel(Parse*,int);
int sqlite3ExprReferencesUpdatedColumn(Expr*,int*,int);
void sqlite3GenerateConstraintChecks(Parse*,Table*,int*,int,int,int,int,
                                     u8,u8,int,int*,int*,Upsert*);
#ifdef SQLITE_ENABLE_NULL_TRIM
  void sqlite3SetMakeRecordP5(Vdbe*,Table*);
#else
# define sqlite3SetMakeRecordP5(A,B)
#endif
void sqlite3CompleteInsertion(Parse*,Table*,int,int,int,int*,int,int,int);
int sqlite3OpenTableAndIndices(Parse*, Table*, int, u8, int, u8*, int*, int*);
void sqlite3BeginWriteOperation(Parse*, int, int);
void sqlite3MultiWrite(Parse*);
void sqlite3MayAbort(Parse*);
void sqlite3HaltConstraint(Parse*, int, int, char*, i8, u8);
void sqlite3UniqueConstraint(Parse*, int, Index*);
void sqlite3RowidConstraint(Parse*, int, Table*);
Expr *sqlite3ExprDup(sqlite3*,Expr*,int);
ExprList *sqlite3ExprListDup(sqlite3*,ExprList*,int);
SrcList *sqlite3SrcListDup(sqlite3*,SrcList*,int);
IdList *sqlite3IdListDup(sqlite3*,IdList*);
Select *sqlite3SelectDup(sqlite3*,Select*,int);
FuncDef *sqlite3FunctionSearch(int,const char*);
void sqlite3InsertBuiltinFuncs(FuncDef*,int);
FuncDef *sqlite3FindFunction(sqlite3*,const char*,int,u8,u8);
void sqlite3RegisterBuiltinFunctions(void);
void sqlite3RegisterDateTimeFunctions(void);
void sqlite3RegisterPerConnectionBuiltinFunctions(sqlite3*);
int sqlite3SafetyCheckOk(sqlite3*);
int sqlite3SafetyCheckSickOrOk(sqlite3*);
void sqlite3ChangeCookie(Parse*, int);

#if !defined(SQLITE_OMIT_VIEW) && !defined(SQLITE_OMIT_TRIGGER)
void sqlite3MaterializeView(Parse*, Table*, Expr*, ExprList*,Expr*,int);
#endif

#ifndef SQLITE_OMIT_TRIGGER
  void sqlite3BeginTrigger(Parse*, Token*,Token*,int,int,IdList*,SrcList*,
                           Expr*,int, int);
  void sqlite3FinishTrigger(Parse*, TriggerStep*, Token*);
  void sqlite3DropTrigger(Parse*, SrcList*, int);
  void sqlite3DropTriggerPtr(Parse*, Trigger*);
  Trigger *sqlite3TriggersExist(Parse *, Table*, int, ExprList*, int *pMask);
  Trigger *sqlite3TriggerList(Parse *, Table *);
  void sqlite3CodeRowTrigger(Parse*, Trigger *, int, ExprList*, int, Table *,
                            int, int, int);
  void sqlite3CodeRowTriggerDirect(Parse *, Trigger *, Table *, int, int, int);
  void sqliteViewTriggers(Parse*, Table*, Expr*, int, ExprList*);
  void sqlite3DeleteTriggerStep(sqlite3*, TriggerStep*);
  TriggerStep *sqlite3TriggerSelectStep(sqlite3*,Select*,
                                        const char*,const char*);
  TriggerStep *sqlite3TriggerInsertStep(Parse*,Token*, IdList*,
                                        Select*,u8,Upsert*,
                                        const char*,const char*);
  TriggerStep *sqlite3TriggerUpdateStep(Parse*,Token*,SrcList*,ExprList*,
                                        Expr*, u8, const char*,const char*);
  TriggerStep *sqlite3TriggerDeleteStep(Parse*,Token*, Expr*,
                                        const char*,const char*);
  void sqlite3DeleteTrigger(sqlite3*, Trigger*);
  void sqlite3UnlinkAndDeleteTrigger(sqlite3*,int,const char*);
  u32 sqlite3TriggerColmask(Parse*,Trigger*,ExprList*,int,int,Table*,int);
  SrcList *sqlite3TriggerStepSrc(Parse*, TriggerStep*);
# define sqlite3ParseToplevel(p) ((p)->pToplevel ? (p)->pToplevel : (p))
# define sqlite3IsToplevel(p) ((p)->pToplevel==0)
#else
# define sqlite3TriggersExist(B,C,D,E,F) 0
# define sqlite3DeleteTrigger(A,B)
# define sqlite3DropTriggerPtr(A,B)
# define sqlite3UnlinkAndDeleteTrigger(A,B,C)
# define sqlite3CodeRowTrigger(A,B,C,D,E,F,G,H,I)
# define sqlite3CodeRowTriggerDirect(A,B,C,D,E,F)
# define sqlite3TriggerList(X, Y) 0
# define sqlite3ParseToplevel(p) p
# define sqlite3IsToplevel(p) 1
# define sqlite3TriggerColmask(A,B,C,D,E,F,G) 0
# define sqlite3TriggerStepSrc(A,B) 0
#endif

int sqlite3JoinType(Parse*, Token*, Token*, Token*);
void sqlite3SetJoinExpr(Expr*,int);
void sqlite3CreateForeignKey(Parse*, ExprList*, Token*, ExprList*, int);
void sqlite3DeferForeignKey(Parse*, int);
#ifndef SQLITE_OMIT_AUTHORIZATION
  void sqlite3AuthRead(Parse*,Expr*,Schema*,SrcList*);
  int sqlite3AuthCheck(Parse*,int, const char*, const char*, const char*);
  void sqlite3AuthContextPush(Parse*, AuthContext*, const char*);
  void sqlite3AuthContextPop(AuthContext*);
  int sqlite3AuthReadCol(Parse*, const char *, const char *, int);
#else
# define sqlite3AuthRead(a,b,c,d)
# define sqlite3AuthCheck(a,b,c,d,e)    SQLITE_OK
# define sqlite3AuthContextPush(a,b,c)
# define sqlite3AuthContextPop(a)  ((void)(a))
#endif
int sqlite3DbIsNamed(sqlite3 *db, int iDb, const char *zName);
void sqlite3Attach(Parse*, Expr*, Expr*, Expr*);
void sqlite3Detach(Parse*, Expr*);
void sqlite3FixInit(DbFixer*, Parse*, int, const char*, const Token*);
int sqlite3FixSrcList(DbFixer*, SrcList*);
int sqlite3FixSelect(DbFixer*, Select*);
int sqlite3FixExpr(DbFixer*, Expr*);
int sqlite3FixExprList(DbFixer*, ExprList*);
int sqlite3FixTriggerStep(DbFixer*, TriggerStep*);
int sqlite3RealSameAsInt(double,sqlite3_int64);
void sqlite3Int64ToText(i64,char*);
int sqlite3AtoF(const char *z, double*, int, u8);
int sqlite3GetInt32(const char *, int*);
int sqlite3GetUInt32(const char*, u32*);
int sqlite3Atoi(const char*);
#ifndef SQLITE_OMIT_UTF16
int sqlite3Utf16ByteLen(const void *pData, int nChar);
#endif
int sqlite3Utf8CharLen(const char *pData, int nByte);
u32 sqlite3Utf8Read(const u8**);
LogEst sqlite3LogEst(u64);
LogEst sqlite3LogEstAdd(LogEst,LogEst);
#ifndef SQLITE_OMIT_VIRTUALTABLE
LogEst sqlite3LogEstFromDouble(double);
#endif
#if defined(SQLITE_ENABLE_STMT_SCANSTATUS) || \
    defined(SQLITE_ENABLE_STAT4) || \
    defined(SQLITE_EXPLAIN_ESTIMATED_ROWS)
u64 sqlite3LogEstToInt(LogEst);
#endif
VList *sqlite3VListAdd(sqlite3*,VList*,const char*,int,int);
const char *sqlite3VListNumToName(VList*,int);
int sqlite3VListNameToNum(VList*,const char*,int);

/*
** Routines to read and write variable-length integers.  These used to
** be defined locally, but now we use the varint routines in the util.c
** file.
*/
int sqlite3PutVarint(unsigned char*, u64);
u8 sqlite3GetVarint(const unsigned char *, u64 *);
u8 sqlite3GetVarint32(const unsigned char *, u32 *);
int sqlite3VarintLen(u64 v);

/*
** The common case is for a varint to be a single byte.  They following
** macros handle the common case without a procedure call, but then call
** the procedure for larger varints.
*/
#define getVarint32(A,B)  \
  (u8)((*(A)<(u8)0x80)?((B)=(u32)*(A)),1:sqlite3GetVarint32((A),(u32 *)&(B)))
#define getVarint32NR(A,B) \
  B=(u32)*(A);if(B>=0x80)sqlite3GetVarint32((A),(u32*)&(B))
#define putVarint32(A,B)  \
  (u8)(((u32)(B)<(u32)0x80)?(*(A)=(unsigned char)(B)),1:\
  sqlite3PutVarint((A),(B)))
#define getVarint    sqlite3GetVarint
#define putVarint    sqlite3PutVarint


const char *sqlite3IndexAffinityStr(sqlite3*, Index*);
void sqlite3TableAffinity(Vdbe*, Table*, int);
char sqlite3CompareAffinity(const Expr *pExpr, char aff2);
int sqlite3IndexAffinityOk(const Expr *pExpr, char idx_affinity);
char sqlite3TableColumnAffinity(Table*,int);
char sqlite3ExprAffinity(const Expr *pExpr);
int sqlite3Atoi64(const char*, i64*, int, u8);
int sqlite3DecOrHexToI64(const char*, i64*);
void sqlite3ErrorWithMsg(sqlite3*, int, const char*,...);
void sqlite3Error(sqlite3*,int);
void sqlite3SystemError(sqlite3*,int);
void *sqlite3HexToBlob(sqlite3*, const char *z, int n);
u8 sqlite3HexToInt(int h);
int sqlite3TwoPartName(Parse *, Token *, Token *, Token **);

#if defined(SQLITE_NEED_ERR_NAME)
const char *sqlite3ErrName(int);
#endif

#ifdef SQLITE_ENABLE_DESERIALIZE
int sqlite3MemdbInit(void);
#endif

const char *sqlite3ErrStr(int);
int sqlite3ReadSchema(Parse *pParse);
CollSeq *sqlite3FindCollSeq(sqlite3*,u8 enc, const char*,int);
int sqlite3IsBinary(const CollSeq*);
CollSeq *sqlite3LocateCollSeq(Parse *pParse, const char*zName);
void sqlite3SetTextEncoding(sqlite3 *db, u8);
CollSeq *sqlite3ExprCollSeq(Parse *pParse, const Expr *pExpr);
CollSeq *sqlite3ExprNNCollSeq(Parse *pParse, const Expr *pExpr);
int sqlite3ExprCollSeqMatch(Parse*,const Expr*,const Expr*);
Expr *sqlite3ExprAddCollateToken(Parse *pParse, Expr*, const Token*, int);
Expr *sqlite3ExprAddCollateString(Parse*,Expr*,const char*);
Expr *sqlite3ExprSkipCollate(Expr*);
Expr *sqlite3ExprSkipCollateAndLikely(Expr*);
int sqlite3CheckCollSeq(Parse *, CollSeq *);
int sqlite3WritableSchema(sqlite3*);
int sqlite3CheckObjectName(Parse*, const char*,const char*,const char*);
void sqlite3VdbeSetChanges(sqlite3 *, int);
int sqlite3AddInt64(i64*,i64);
int sqlite3SubInt64(i64*,i64);
int sqlite3MulInt64(i64*,i64);
int sqlite3AbsInt32(int);
#ifdef SQLITE_ENABLE_8_3_NAMES
void sqlite3FileSuffix3(const char*, char*);
#else
# define sqlite3FileSuffix3(X,Y)
#endif
u8 sqlite3GetBoolean(const char *z,u8);

const void *sqlite3ValueText(sqlite3_value*, u8);
int sqlite3ValueBytes(sqlite3_value*, u8);
void sqlite3ValueSetStr(sqlite3_value*, int, const void *,u8,
                        void(*)(void*));
void sqlite3ValueSetNull(sqlite3_value*);
void sqlite3ValueFree(sqlite3_value*);
#ifndef SQLITE_UNTESTABLE
void sqlite3ResultIntReal(sqlite3_context*);
#endif
sqlite3_value *sqlite3ValueNew(sqlite3 *);
#ifndef SQLITE_OMIT_UTF16
char *sqlite3Utf16to8(sqlite3 *, const void*, int, u8);
#endif
int sqlite3ValueFromExpr(sqlite3 *, Expr *, u8, u8, sqlite3_value **);
void sqlite3ValueApplyAffinity(sqlite3_value *, u8, u8);
#ifndef SQLITE_AMALGAMATION
extern const unsigned char sqlite3OpcodeProperty[];
extern const char sqlite3StrBINARY[];
extern const unsigned char sqlite3UpperToLower[];
extern const unsigned char sqlite3CtypeMap[];
extern SQLITE_WSD struct Sqlite3Config sqlite3Config;
extern FuncDefHash sqlite3BuiltinFunctions;
extern u32 sqlite3_unsupported_selecttrace;
#ifndef SQLITE_OMIT_WSD
extern int sqlite3PendingByte;
#endif
#endif /* SQLITE_AMALGAMATION */
#ifdef VDBE_PROFILE
extern sqlite3_uint64 sqlite3NProfileCnt;
#endif
void sqlite3RootPageMoved(sqlite3*, int, Pgno, Pgno);
void sqlite3Reindex(Parse*, Token*, Token*);
void sqlite3AlterFunctions(void);
void sqlite3AlterRenameTable(Parse*, SrcList*, Token*);
void sqlite3AlterRenameColumn(Parse*, SrcList*, Token*, Token*);
int sqlite3GetToken(const unsigned char *, int *);
void sqlite3NestedParse(Parse*, const char*, ...);
void sqlite3ExpirePreparedStatements(sqlite3*, int);
void sqlite3CodeRhsOfIN(Parse*, Expr*, int);
int sqlite3CodeSubselect(Parse*, Expr*);
void sqlite3SelectPrep(Parse*, Select*, NameContext*);
void sqlite3SelectWrongNumTermsError(Parse *pParse, Select *p);
int sqlite3MatchEName(
  const struct ExprList_item*,
  const char*,
  const char*,
  const char*
);
Bitmask sqlite3ExprColUsed(Expr*);
u8 sqlite3StrIHash(const char*);
int sqlite3ResolveExprNames(NameContext*, Expr*);
int sqlite3ResolveExprListNames(NameContext*, ExprList*);
void sqlite3ResolveSelectNames(Parse*, Select*, NameContext*);
int sqlite3ResolveSelfReference(Parse*,Table*,int,Expr*,ExprList*);
int sqlite3ResolveOrderGroupBy(Parse*, Select*, ExprList*, const char*);
void sqlite3ColumnDefault(Vdbe *, Table *, int, int);
void sqlite3AlterFinishAddColumn(Parse *, Token *);
void sqlite3AlterBeginAddColumn(Parse *, SrcList *);
void *sqlite3RenameTokenMap(Parse*, void*, Token*);
void sqlite3RenameTokenRemap(Parse*, void *pTo, void *pFrom);
void sqlite3RenameExprUnmap(Parse*, Expr*);
void sqlite3RenameExprlistUnmap(Parse*, ExprList*);
CollSeq *sqlite3GetCollSeq(Parse*, u8, CollSeq *, const char*);
char sqlite3AffinityType(const char*, Column*);
void sqlite3Analyze(Parse*, Token*, Token*);
int sqlite3InvokeBusyHandler(BusyHandler*);
int sqlite3FindDb(sqlite3*, Token*);
int sqlite3FindDbName(sqlite3 *, const char *);
int sqlite3AnalysisLoad(sqlite3*,int iDB);
void sqlite3DeleteIndexSamples(sqlite3*,Index*);
void sqlite3DefaultRowEst(Index*);
void sqlite3RegisterLikeFunctions(sqlite3*, int);
int sqlite3IsLikeFunction(sqlite3*,Expr*,int*,char*);
void sqlite3SchemaClear(void *);
Schema *sqlite3SchemaGet(sqlite3 *, Btree *);
int sqlite3SchemaToIndex(sqlite3 *db, Schema *);
KeyInfo *sqlite3KeyInfoAlloc(sqlite3*,int,int);
void sqlite3KeyInfoUnref(KeyInfo*);
KeyInfo *sqlite3KeyInfoRef(KeyInfo*);
KeyInfo *sqlite3KeyInfoOfIndex(Parse*, Index*);
KeyInfo *sqlite3KeyInfoFromExprList(Parse*, ExprList*, int, int);
int sqlite3HasExplicitNulls(Parse*, ExprList*);

#ifdef SQLITE_DEBUG
int sqlite3KeyInfoIsWriteable(KeyInfo*);
#endif
int sqlite3CreateFunc(sqlite3 *, const char *, int, int, void *,
  void (*)(sqlite3_context*,int,sqlite3_value **),
  void (*)(sqlite3_context*,int,sqlite3_value **), 
  void (*)(sqlite3_context*),
  void (*)(sqlite3_context*),
  void (*)(sqlite3_context*,int,sqlite3_value **), 
  FuncDestructor *pDestructor
);
void sqlite3NoopDestructor(void*);
void sqlite3OomFault(sqlite3*);
void sqlite3OomClear(sqlite3*);
int sqlite3ApiExit(sqlite3 *db, int);
int sqlite3OpenTempDatabase(Parse *);

void sqlite3StrAccumInit(StrAccum*, sqlite3*, char*, int, int);
char *sqlite3StrAccumFinish(StrAccum*);
void sqlite3SelectDestInit(SelectDest*,int,int);
Expr *sqlite3CreateColumnExpr(sqlite3 *, SrcList *, int, int);

void sqlite3BackupRestart(sqlite3_backup *);
void sqlite3BackupUpdate(sqlite3_backup *, Pgno, const u8 *);

#ifndef SQLITE_OMIT_SUBQUERY
int sqlite3ExprCheckIN(Parse*, Expr*);
#else
# define sqlite3ExprCheckIN(x,y) SQLITE_OK
#endif

#ifdef SQLITE_ENABLE_STAT4
int sqlite3Stat4ProbeSetValue(
    Parse*,Index*,UnpackedRecord**,Expr*,int,int,int*);
int sqlite3Stat4ValueFromExpr(Parse*, Expr*, u8, sqlite3_value**);
void sqlite3Stat4ProbeFree(UnpackedRecord*);
int sqlite3Stat4Column(sqlite3*, const void*, int, int, sqlite3_value**);
char sqlite3IndexColumnAffinity(sqlite3*, Index*, int);
#endif

/*
** The interface to the LEMON-generated parser
*/
#ifndef SQLITE_AMALGAMATION
  void *sqlite3ParserAlloc(void*(*)(u64), Parse*);
  void sqlite3ParserFree(void*, void(*)(void*));
#endif
void sqlite3Parser(void*, int, Token);
int sqlite3ParserFallback(int);
#ifdef YYTRACKMAXSTACKDEPTH
  int sqlite3ParserStackPeak(void*);
#endif

void sqlite3AutoLoadExtensions(sqlite3*);
#ifndef SQLITE_OMIT_LOAD_EXTENSION
  void sqlite3CloseExtensions(sqlite3*);
#else
# define sqlite3CloseExtensions(X)
#endif

#ifndef SQLITE_OMIT_SHARED_CACHE
  void sqlite3TableLock(Parse *, int, Pgno, u8, const char *);
#else
  #define sqlite3TableLock(v,w,x,y,z)
#endif

#ifdef SQLITE_TEST
  int sqlite3Utf8To8(unsigned char*);
#endif

#ifdef SQLITE_OMIT_VIRTUALTABLE
#  define sqlite3VtabClear(Y)
#  define sqlite3VtabSync(X,Y) SQLITE_OK
#  define sqlite3VtabRollback(X)
#  define sqlite3VtabCommit(X)
#  define sqlite3VtabInSync(db) 0
#  define sqlite3VtabLock(X)
#  define sqlite3VtabUnlock(X)
#  define sqlite3VtabModuleUnref(D,X)
#  define sqlite3VtabUnlockList(X)
#  define sqlite3VtabSavepoint(X, Y, Z) SQLITE_OK
#  define sqlite3GetVTable(X,Y)  ((VTable*)0)
#else
   void sqlite3VtabClear(sqlite3 *db, Table*);
   void sqlite3VtabDisconnect(sqlite3 *db, Table *p);
   int sqlite3VtabSync(sqlite3 *db, Vdbe*);
   int sqlite3VtabRollback(sqlite3 *db);
   int sqlite3VtabCommit(sqlite3 *db);
   void sqlite3VtabLock(VTable *);
   void sqlite3VtabUnlock(VTable *);
   void sqlite3VtabModuleUnref(sqlite3*,Module*);
   void sqlite3VtabUnlockList(sqlite3*);
   int sqlite3VtabSavepoint(sqlite3 *, int, int);
   void sqlite3VtabImportErrmsg(Vdbe*, sqlite3_vtab*);
   VTable *sqlite3GetVTable(sqlite3*, Table*);
   Module *sqlite3VtabCreateModule(
     sqlite3*,
     const char*,
     const sqlite3_module*,
     void*,
     void(*)(void*)
   );
#  define sqlite3VtabInSync(db) ((db)->nVTrans>0 && (db)->aVTrans==0)
#endif
int sqlite3ReadOnlyShadowTables(sqlite3 *db);
#ifndef SQLITE_OMIT_VIRTUALTABLE
  int sqlite3ShadowTableName(sqlite3 *db, const char *zName);
  int sqlite3IsShadowTableOf(sqlite3*,Table*,const char*);
#else
# define sqlite3ShadowTableName(A,B) 0
# define sqlite3IsShadowTableOf(A,B,C) 0
#endif
int sqlite3VtabEponymousTableInit(Parse*,Module*);
void sqlite3VtabEponymousTableClear(sqlite3*,Module*);
void sqlite3VtabMakeWritable(Parse*,Table*);
void sqlite3VtabBeginParse(Parse*, Token*, Token*, Token*, int);
void sqlite3VtabFinishParse(Parse*, Token*);
void sqlite3VtabArgInit(Parse*);
void sqlite3VtabArgExtend(Parse*, Token*);
int sqlite3VtabCallCreate(sqlite3*, int, const char *, char **);
int sqlite3VtabCallConnect(Parse*, Table*);
int sqlite3VtabCallDestroy(sqlite3*, int, const char *);
int sqlite3VtabBegin(sqlite3 *, VTable *);
FuncDef *sqlite3VtabOverloadFunction(sqlite3 *,FuncDef*, int nArg, Expr*);
sqlite3_int64 sqlite3StmtCurrentTime(sqlite3_context*);
int sqlite3VdbeParameterIndex(Vdbe*, const char*, int);
int sqlite3TransferBindings(sqlite3_stmt *, sqlite3_stmt *);
void sqlite3ParserReset(Parse*);
#ifdef SQLITE_ENABLE_NORMALIZE
char *sqlite3Normalize(Vdbe*, const char*);
#endif
int sqlite3Reprepare(Vdbe*);
void sqlite3ExprListCheckLength(Parse*, ExprList*, const char*);
CollSeq *sqlite3ExprCompareCollSeq(Parse*,const Expr*);
CollSeq *sqlite3BinaryCompareCollSeq(Parse *, const Expr*, const Expr*);
int sqlite3TempInMemory(const sqlite3*);
const char *sqlite3JournalModename(int);
#ifndef SQLITE_OMIT_WAL
  int sqlite3Checkpoint(sqlite3*, int, int, int*, int*);
  int sqlite3WalDefaultHook(void*,sqlite3*,const char*,int);
#endif
#ifndef SQLITE_OMIT_CTE
  With *sqlite3WithAdd(Parse*,With*,Token*,ExprList*,Select*);
  void sqlite3WithDelete(sqlite3*,With*);
  void sqlite3WithPush(Parse*, With*, u8);
#else
#define sqlite3WithPush(x,y,z)
#define sqlite3WithDelete(x,y)
#endif
#ifndef SQLITE_OMIT_UPSERT
  Upsert *sqlite3UpsertNew(sqlite3*,ExprList*,Expr*,ExprList*,Expr*);
  void sqlite3UpsertDelete(sqlite3*,Upsert*);
  Upsert *sqlite3UpsertDup(sqlite3*,Upsert*);
  int sqlite3UpsertAnalyzeTarget(Parse*,SrcList*,Upsert*);
  void sqlite3UpsertDoUpdate(Parse*,Upsert*,Table*,Index*,int);
#else
#define sqlite3UpsertNew(v,w,x,y,z) ((Upsert*)0)
#define sqlite3UpsertDelete(x,y)
#define sqlite3UpsertDup(x,y)       ((Upsert*)0)
#endif


/* Declarations for functions in fkey.c. All of these are replaced by
** no-op macros if OMIT_FOREIGN_KEY is defined. In this case no foreign
** key functionality is available. If OMIT_TRIGGER is defined but
** OMIT_FOREIGN_KEY is not, only some of the functions are no-oped. In
** this case foreign keys are parsed, but no other functionality is
** provided (enforcement of FK constraints requires the triggers sub-system).
*/
#if !defined(SQLITE_OMIT_FOREIGN_KEY) && !defined(SQLITE_OMIT_TRIGGER)
  void sqlite3FkCheck(Parse*, Table*, int, int, int*, int);
  void sqlite3FkDropTable(Parse*, SrcList *, Table*);
  void sqlite3FkActions(Parse*, Table*, ExprList*, int, int*, int);
  int sqlite3FkRequired(Parse*, Table*, int*, int);
  u32 sqlite3FkOldmask(Parse*, Table*);
  FKey *sqlite3FkReferences(Table *);
#else
  #define sqlite3FkActions(a,b,c,d,e,f)
  #define sqlite3FkCheck(a,b,c,d,e,f)
  #define sqlite3FkDropTable(a,b,c)
  #define sqlite3FkOldmask(a,b)         0
  #define sqlite3FkRequired(a,b,c,d)    0
  #define sqlite3FkReferences(a)        0
#endif
#ifndef SQLITE_OMIT_FOREIGN_KEY
  void sqlite3FkDelete(sqlite3 *, Table*);
  int sqlite3FkLocateIndex(Parse*,Table*,FKey*,Index**,int**);
#else
  #define sqlite3FkDelete(a,b)
  #define sqlite3FkLocateIndex(a,b,c,d,e)
#endif


/*
** Available fault injectors.  Should be numbered beginning with 0.
*/
#define SQLITE_FAULTINJECTOR_MALLOC     0
#define SQLITE_FAULTINJECTOR_COUNT      1

/*
** The interface to the code in fault.c used for identifying "benign"
** malloc failures. This is only present if SQLITE_UNTESTABLE
** is not defined.
*/
#ifndef SQLITE_UNTESTABLE
  void sqlite3BeginBenignMalloc(void);
  void sqlite3EndBenignMalloc(void);
#else
  #define sqlite3BeginBenignMalloc()
  #define sqlite3EndBenignMalloc()
#endif

/*
** Allowed return values from sqlite3FindInIndex()
*/
#define IN_INDEX_ROWID        1   /* Search the rowid of the table */
#define IN_INDEX_EPH          2   /* Search an ephemeral b-tree */
#define IN_INDEX_INDEX_ASC    3   /* Existing index ASCENDING */
#define IN_INDEX_INDEX_DESC   4   /* Existing index DESCENDING */
#define IN_INDEX_NOOP         5   /* No table available. Use comparisons */
/*
** Allowed flags for the 3rd parameter to sqlite3FindInIndex().
*/
#define IN_INDEX_NOOP_OK     0x0001  /* OK to return IN_INDEX_NOOP */
#define IN_INDEX_MEMBERSHIP  0x0002  /* IN operator used for membership test */
#define IN_INDEX_LOOP        0x0004  /* IN operator used as a loop */
int sqlite3FindInIndex(Parse *, Expr *, u32, int*, int*, int*);

int sqlite3JournalOpen(sqlite3_vfs *, const char *, sqlite3_file *, int, int);
int sqlite3JournalSize(sqlite3_vfs *);
#if defined(SQLITE_ENABLE_ATOMIC_WRITE) \
 || defined(SQLITE_ENABLE_BATCH_ATOMIC_WRITE)
  int sqlite3JournalCreate(sqlite3_file *);
#endif

int sqlite3JournalIsInMemory(sqlite3_file *p);
void sqlite3MemJournalOpen(sqlite3_file *);

void sqlite3ExprSetHeightAndFlags(Parse *pParse, Expr *p);
#if SQLITE_MAX_EXPR_DEPTH>0
  int sqlite3SelectExprHeight(Select *);
  int sqlite3ExprCheckHeight(Parse*, int);
#else
  #define sqlite3SelectExprHeight(x) 0
  #define sqlite3ExprCheckHeight(x,y)
#endif

u32 sqlite3Get4byte(const u8*);
void sqlite3Put4byte(u8*, u32);

#ifdef SQLITE_ENABLE_UNLOCK_NOTIFY
  void sqlite3ConnectionBlocked(sqlite3 *, sqlite3 *);
  void sqlite3ConnectionUnlocked(sqlite3 *db);
  void sqlite3ConnectionClosed(sqlite3 *db);
#else
  #define sqlite3ConnectionBlocked(x,y)
  #define sqlite3ConnectionUnlocked(x)
  #define sqlite3ConnectionClosed(x)
#endif

#ifdef SQLITE_DEBUG
  void sqlite3ParserTrace(FILE*, char *);
#endif
#if defined(YYCOVERAGE)
  int sqlite3ParserCoverage(FILE*);
#endif

/*
** If the SQLITE_ENABLE IOTRACE exists then the global variable
** sqlite3IoTrace is a pointer to a printf-like routine used to
** print I/O tracing messages.
*/
#ifdef SQLITE_ENABLE_IOTRACE
# define IOTRACE(A)  if( sqlite3IoTrace ){ sqlite3IoTrace A; }
  void sqlite3VdbeIOTraceSql(Vdbe*);
SQLITE_API SQLITE_EXTERN void (SQLITE_CDECL *sqlite3IoTrace)(const char*,...);
#else
# define IOTRACE(A)
# define sqlite3VdbeIOTraceSql(X)
#endif

/*
** These routines are available for the mem2.c debugging memory allocator
** only.  They are used to verify that different "types" of memory
** allocations are properly tracked by the system.
**
** sqlite3MemdebugSetType() sets the "type" of an allocation to one of
** the MEMTYPE_* macros defined below.  The type must be a bitmask with
** a single bit set.
**
** sqlite3MemdebugHasType() returns true if any of the bits in its second
** argument match the type set by the previous sqlite3MemdebugSetType().
** sqlite3MemdebugHasType() is intended for use inside assert() statements.
**
** sqlite3MemdebugNoType() returns true if none of the bits in its second
** argument match the type set by the previous sqlite3MemdebugSetType().
**
** Perhaps the most important point is the difference between MEMTYPE_HEAP
** and MEMTYPE_LOOKASIDE.  If an allocation is MEMTYPE_LOOKASIDE, that means
** it might have been allocated by lookaside, except the allocation was
** too large or lookaside was already full.  It is important to verify
** that allocations that might have been satisfied by lookaside are not
** passed back to non-lookaside free() routines.  Asserts such as the
** example above are placed on the non-lookaside free() routines to verify
** this constraint.
**
** All of this is no-op for a production build.  It only comes into
** play when the SQLITE_MEMDEBUG compile-time option is used.
*/
#ifdef SQLITE_MEMDEBUG
  void sqlite3MemdebugSetType(void*,u8);
  int sqlite3MemdebugHasType(void*,u8);
  int sqlite3MemdebugNoType(void*,u8);
#else
# define sqlite3MemdebugSetType(X,Y)  /* no-op */
# define sqlite3MemdebugHasType(X,Y)  1
# define sqlite3MemdebugNoType(X,Y)   1
#endif
#define MEMTYPE_HEAP       0x01  /* General heap allocations */
#define MEMTYPE_LOOKASIDE  0x02  /* Heap that might have been lookaside */
#define MEMTYPE_PCACHE     0x04  /* Page cache allocations */

/*
** Threading interface
*/
#if SQLITE_MAX_WORKER_THREADS>0
int sqlite3ThreadCreate(SQLiteThread**,void*(*)(void*),void*);
int sqlite3ThreadJoin(SQLiteThread*, void**);
#endif

#if defined(SQLITE_ENABLE_DBPAGE_VTAB) || defined(SQLITE_TEST)
int sqlite3DbpageRegister(sqlite3*);
#endif
#if defined(SQLITE_ENABLE_DBSTAT_VTAB) || defined(SQLITE_TEST)
int sqlite3DbstatRegister(sqlite3*);
#endif

int sqlite3ExprVectorSize(Expr *pExpr);
int sqlite3ExprIsVector(Expr *pExpr);
Expr *sqlite3VectorFieldSubexpr(Expr*, int);
Expr *sqlite3ExprForVectorField(Parse*,Expr*,int);
void sqlite3VectorErrorMsg(Parse*, Expr*);

#ifndef SQLITE_OMIT_COMPILEOPTION_DIAGS
const char **sqlite3CompileOptions(int *pnOpt);
#endif

#endif /* SQLITEINT_H */
