/*
** 2018-05-25
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
** This file implements an alternative R-Tree virtual table that
** uses polygons to express the boundaries of 2-dimensional objects.
**
** This file is #include-ed onto the end of "rtree.c" so that it has
** access to all of the R-Tree internals.
*/
#include <stdlib.h>

/* Enable -DGEOPOLY_ENABLE_DEBUG for debugging facilities */
#ifdef GEOPOLY_ENABLE_DEBUG
  static int geo_debug = 0;
# define GEODEBUG(X) if(geo_debug)printf X
#else
# define GEODEBUG(X)
#endif

#ifndef JSON_NULL   /* The following stuff repeats things found in json1 */
/*
** Versions of isspace(), isalnum() and isdigit() to which it is safe
** to pass signed char values.
*/
#ifdef sqlite3Isdigit
   /* Use the SQLite core versions if this routine is part of the
   ** SQLite amalgamation */
#  define safe_isdigit(x)  sqlite3Isdigit(x)
#  define safe_isalnum(x)  sqlite3Isalnum(x)
#  define safe_isxdigit(x) sqlite3Isxdigit(x)
#else
   /* Use the standard library for separate compilation */
#include <ctype.h>  /* amalgamator: keep */
#  define safe_isdigit(x)  isdigit((unsigned char)(x))
#  define safe_isalnum(x)  isalnum((unsigned char)(x))
#  define safe_isxdigit(x) isxdigit((unsigned char)(x))
#endif

/*
** Growing our own isspace() routine this way is twice as fast as
** the library isspace() function.
*/
static const char geopolyIsSpace[] = {
  0, 0, 0, 0, 0, 0, 0, 0,     0, 1, 1, 0, 0, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
};
#define safe_isspace(x) (geopolyIsSpace[(unsigned char)x])
#endif /* JSON NULL - back to original code */

/* Compiler and version */
#ifndef GCC_VERSION
#if defined(__GNUC__) && !defined(SQLITE_DISABLE_INTRINSIC)
# define GCC_VERSION (__GNUC__*1000000+__GNUC_MINOR__*1000+__GNUC_PATCHLEVEL__)
#else
# define GCC_VERSION 0
#endif
#endif
#ifndef MSVC_VERSION
#if defined(_MSC_VER) && !defined(SQLITE_DISABLE_INTRINSIC)
# define MSVC_VERSION _MSC_VER
#else
# define MSVC_VERSION 0
#endif
#endif

/* Datatype for coordinates
*/
typedef float GeoCoord;

/*
** Internal representation of a polygon.
**
** The polygon consists of a sequence of vertexes.  There is a line
** segment between each pair of vertexes, and one final segment from
** the last vertex back to the first.  (This differs from the GeoJSON
** standard in which the final vertex is a repeat of the first.)
**
** The polygon follows the right-hand rule.  The area to the right of
** each segment is "outside" and the area to the left is "inside".
**
** The on-disk representation consists of a 4-byte header followed by
** the values.  The 4-byte header is:
**
**      encoding    (1 byte)   0=big-endian, 1=little-endian
**      nvertex     (3 bytes)  Number of vertexes as a big-endian integer
**
** Enough space is allocated for 4 coordinates, to work around over-zealous
** warnings coming from some compiler (notably, clang). In reality, the size
** of each GeoPoly memory allocate is adjusted as necessary so that the
** GeoPoly.a[] array at the end is the appropriate size.
*/
typedef struct GeoPoly GeoPoly;
struct GeoPoly {
  int nVertex;          /* Number of vertexes */
  unsigned char hdr[4]; /* Header for on-disk representation */
  GeoCoord a[8];        /* 2*nVertex values. X (longitude) first, then Y */
};

/* The size of a memory allocation needed for a GeoPoly object sufficient
** to hold N coordinate pairs.
*/
#define GEOPOLY_SZ(N)  (sizeof(GeoPoly) + sizeof(GeoCoord)*2*((N)-4))

/* Macros to access coordinates of a GeoPoly.
** We have to use these macros, rather than just say p->a[i] in order
** to silence (incorrect) UBSAN warnings if the array index is too large.
*/
#define GeoX(P,I)  (((GeoCoord*)(P)->a)[(I)*2])
#define GeoY(P,I)  (((GeoCoord*)(P)->a)[(I)*2+1])


/*
** State of a parse of a GeoJSON input.
*/
typedef struct GeoParse GeoParse;
struct GeoParse {
  const unsigned char *z;   /* Unparsed input */
  int nVertex;              /* Number of vertexes in a[] */
  int nAlloc;               /* Space allocated to a[] */
  int nErr;                 /* Number of errors encountered */
  GeoCoord *a;          /* Array of vertexes.  From sqlite3_malloc64() */
};

/* Do a 4-byte byte swap */
static void geopolySwab32(unsigned char *a){
  unsigned char t = a[0];
  a[0] = a[3];
  a[3] = t;
  t = a[1];
  a[1] = a[2];
  a[2] = t;
}

/* Skip whitespace.  Return the next non-whitespace character. */
static char geopolySkipSpace(GeoParse *p){
  while( safe_isspace(p->z[0]) ) p->z++;
  return p->z[0];
}

/* Parse out a number.  Write the value into *pVal if pVal!=0.
** return non-zero on success and zero if the next token is not a number.
*/
static int geopolyParseNumber(GeoParse *p, GeoCoord *pVal){
  char c = geopolySkipSpace(p);
  const unsigned char *z = p->z;
  int j = 0;
  int seenDP = 0;
  int seenE = 0;
  if( c=='-' ){
    j = 1;
    c = z[j];
  }
  if( c=='0' && z[j+1]>='0' && z[j+1]<='9' ) return 0;
  for(;; j++){
    c = z[j];
    if( safe_isdigit(c) ) continue;
    if( c=='.' ){
      if( z[j-1]=='-' ) return 0;
      if( seenDP ) return 0;
      seenDP = 1;
      continue;
    }
    if( c=='e' || c=='E' ){
      if( z[j-1]<'0' ) return 0;
      if( seenE ) return -1;
      seenDP = seenE = 1;
      c = z[j+1];
      if( c=='+' || c=='-' ){
        j++;
        c = z[j+1];
      }
      if( c<'0' || c>'9' ) return 0;
      continue;
    }
    break;
  }
  if( z[j-1]<'0' ) return 0;
  if( pVal ){
#ifdef SQLITE_AMALGAMATION
     /* The sqlite3AtoF() routine is much much faster than atof(), if it
     ** is available */
     double r;
     (void)sqlite3AtoF((const char*)p->z, &r, j, SQLITE_UTF8);
     *pVal = r;
#else
     *pVal = (GeoCoord)atof((const char*)p->z);
#endif
  }
  p->z += j;
  return 1;
}

/*
** If the input is a well-formed JSON array of coordinates with at least
** four coordinates and where each coordinate is itself a two-value array,
** then convert the JSON into a GeoPoly object and return a pointer to
** that object.
**
** If any error occurs, return NULL.
*/
static GeoPoly *geopolyParseJson(const unsigned char *z, int *pRc){
  GeoParse s;
  int rc = SQLITE_OK;
  memset(&s, 0, sizeof(s));
  s.z = z;
  if( geopolySkipSpace(&s)=='[' ){
    s.z++;
    while( geopolySkipSpace(&s)=='[' ){
      int ii = 0;
      char c;
      s.z++;
      if( s.nVertex>=s.nAlloc ){
        GeoCoord *aNew;
        s.nAlloc = s.nAlloc*2 + 16;
        aNew = sqlite3_realloc64(s.a, s.nAlloc*sizeof(GeoCoord)*2 );
        if( aNew==0 ){
          rc = SQLITE_NOMEM;
          s.nErr++;
          break;
        }
        s.a = aNew;
      }
      while( geopolyParseNumber(&s, ii<=1 ? &s.a[s.nVertex*2+ii] : 0) ){
        ii++;
        if( ii==2 ) s.nVertex++;
        c = geopolySkipSpace(&s);
        s.z++;
        if( c==',' ) continue;
        if( c==']' && ii>=2 ) break;
        s.nErr++;
        rc = SQLITE_ERROR;
        goto parse_json_err;
      }
      if( geopolySkipSpace(&s)==',' ){
        s.z++;
        continue;
      }
      break;
    }
    if( geopolySkipSpace(&s)==']'
     && s.nVertex>=4
     && s.a[0]==s.a[s.nVertex*2-2]
     && s.a[1]==s.a[s.nVertex*2-1]
     && (s.z++, geopolySkipSpace(&s)==0)
    ){
      GeoPoly *pOut;
      int x = 1;
      s.nVertex--;  /* Remove the redundant vertex at the end */
      pOut = sqlite3_malloc64( GEOPOLY_SZ((sqlite3_int64)s.nVertex) );
      x = 1;
      if( pOut==0 ) goto parse_json_err;
      pOut->nVertex = s.nVertex;
      memcpy(pOut->a, s.a, s.nVertex*2*sizeof(GeoCoord));
      pOut->hdr[0] = *(unsigned char*)&x;
      pOut->hdr[1] = (s.nVertex>>16)&0xff;
      pOut->hdr[2] = (s.nVertex>>8)&0xff;
      pOut->hdr[3] = s.nVertex&0xff;
      sqlite3_free(s.a);
      if( pRc ) *pRc = SQLITE_OK;
      return pOut;
    }else{
      s.nErr++;
      rc = SQLITE_ERROR;
    }
  }
parse_json_err:
  if( pRc ) *pRc = rc;
  sqlite3_free(s.a);
  return 0;
}

/*
** Given a function parameter, try to interpret it as a polygon, either
** in the binary format or JSON text.  Compute a GeoPoly object and
** return a pointer to that object.  Or if the input is not a well-formed
** polygon, put an error message in sqlite3_context and return NULL.
*/
static GeoPoly *geopolyFuncParam(
  sqlite3_context *pCtx,      /* Context for error messages */
  sqlite3_value *pVal,        /* The value to decode */
  int *pRc                    /* Write error here */
){
  GeoPoly *p = 0;
  int nByte;
  if( sqlite3_value_type(pVal)==SQLITE_BLOB
   && (nByte = sqlite3_value_bytes(pVal))>=(4+6*sizeof(GeoCoord))
  ){
    const unsigned char *a = sqlite3_value_blob(pVal);
    int nVertex;
    nVertex = (a[1]<<16) + (a[2]<<8) + a[3];
    if( (a[0]==0 || a[0]==1)
     && (nVertex*2*sizeof(GeoCoord) + 4)==(unsigned int)nByte
    ){
      p = sqlite3_malloc64( sizeof(*p) + (nVertex-1)*2*sizeof(GeoCoord) );
      if( p==0 ){
        if( pRc ) *pRc = SQLITE_NOMEM;
        if( pCtx ) sqlite3_result_error_nomem(pCtx);
      }else{
        int x = 1;
        p->nVertex = nVertex;
        memcpy(p->hdr, a, nByte);
        if( a[0] != *(unsigned char*)&x ){
          int ii;
          for(ii=0; ii<nVertex; ii++){
            geopolySwab32((unsigned char*)&GeoX(p,ii));
            geopolySwab32((unsigned char*)&GeoY(p,ii));
          }
          p->hdr[0] ^= 1;
        }
      }
    }
    if( pRc ) *pRc = SQLITE_OK;
    return p;
  }else if( sqlite3_value_type(pVal)==SQLITE_TEXT ){
    const unsigned char *zJson = sqlite3_value_text(pVal);
    if( zJson==0 ){
      if( pRc ) *pRc = SQLITE_NOMEM;
      return 0;
    }
    return geopolyParseJson(zJson, pRc);
  }else{
    if( pRc ) *pRc = SQLITE_ERROR;
    return 0;
  }
}

/*
** Implementation of the geopoly_blob(X) function.
**
** If the input is a well-formed Geopoly BLOB or JSON string
** then return the BLOB representation of the polygon.  Otherwise
** return NULL.
*/
static void geopolyBlobFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p = geopolyFuncParam(context, argv[0], 0);
  if( p ){
    sqlite3_result_blob(context, p->hdr, 
       4+8*p->nVertex, SQLITE_TRANSIENT);
    sqlite3_free(p);
  }
}

/*
** SQL function:     geopoly_json(X)
**
** Interpret X as a polygon and render it as a JSON array
** of coordinates.  Or, if X is not a valid polygon, return NULL.
*/
static void geopolyJsonFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p = geopolyFuncParam(context, argv[0], 0);
  if( p ){
    sqlite3 *db = sqlite3_context_db_handle(context);
    sqlite3_str *x = sqlite3_str_new(db);
    int i;
    sqlite3_str_append(x, "[", 1);
    for(i=0; i<p->nVertex; i++){
      sqlite3_str_appendf(x, "[%!g,%!g],", GeoX(p,i), GeoY(p,i));
    }
    sqlite3_str_appendf(x, "[%!g,%!g]]", GeoX(p,0), GeoY(p,0));
    sqlite3_result_text(context, sqlite3_str_finish(x), -1, sqlite3_free);
    sqlite3_free(p);
  }
}

/*
** SQL function:     geopoly_svg(X, ....)
**
** Interpret X as a polygon and render it as a SVG <polyline>.
** Additional arguments are added as attributes to the <polyline>.
*/
static void geopolySvgFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p;
  if( argc<1 ) return;
  p = geopolyFuncParam(context, argv[0], 0);
  if( p ){
    sqlite3 *db = sqlite3_context_db_handle(context);
    sqlite3_str *x = sqlite3_str_new(db);
    int i;
    char cSep = '\'';
    sqlite3_str_appendf(x, "<polyline points=");
    for(i=0; i<p->nVertex; i++){
      sqlite3_str_appendf(x, "%c%g,%g", cSep, GeoX(p,i), GeoY(p,i));
      cSep = ' ';
    }
    sqlite3_str_appendf(x, " %g,%g'", GeoX(p,0), GeoY(p,0));
    for(i=1; i<argc; i++){
      const char *z = (const char*)sqlite3_value_text(argv[i]);
      if( z && z[0] ){
        sqlite3_str_appendf(x, " %s", z);
      }
    }
    sqlite3_str_appendf(x, "></polyline>");
    sqlite3_result_text(context, sqlite3_str_finish(x), -1, sqlite3_free);
    sqlite3_free(p);
  }
}

/*
** SQL Function:      geopoly_xform(poly, A, B, C, D, E, F)
**
** Transform and/or translate a polygon as follows:
**
**      x1 = A*x0 + B*y0 + E
**      y1 = C*x0 + D*y0 + F
**
** For a translation:
**
**      geopoly_xform(poly, 1, 0, 0, 1, x-offset, y-offset)
**
** Rotate by R around the point (0,0):
**
**      geopoly_xform(poly, cos(R), sin(R), -sin(R), cos(R), 0, 0)
*/
static void geopolyXformFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p = geopolyFuncParam(context, argv[0], 0);
  double A = sqlite3_value_double(argv[1]);
  double B = sqlite3_value_double(argv[2]);
  double C = sqlite3_value_double(argv[3]);
  double D = sqlite3_value_double(argv[4]);
  double E = sqlite3_value_double(argv[5]);
  double F = sqlite3_value_double(argv[6]);
  GeoCoord x1, y1, x0, y0;
  int ii;
  if( p ){
    for(ii=0; ii<p->nVertex; ii++){
      x0 = GeoX(p,ii);
      y0 = GeoY(p,ii);
      x1 = (GeoCoord)(A*x0 + B*y0 + E);
      y1 = (GeoCoord)(C*x0 + D*y0 + F);
      GeoX(p,ii) = x1;
      GeoY(p,ii) = y1;
    }
    sqlite3_result_blob(context, p->hdr, 
       4+8*p->nVertex, SQLITE_TRANSIENT);
    sqlite3_free(p);
  }
}

/*
** Compute the area enclosed by the polygon.
**
** This routine can also be used to detect polygons that rotate in
** the wrong direction.  Polygons are suppose to be counter-clockwise (CCW).
** This routine returns a negative value for clockwise (CW) polygons.
*/
static double geopolyArea(GeoPoly *p){
  double rArea = 0.0;
  int ii;
  for(ii=0; ii<p->nVertex-1; ii++){
    rArea += (GeoX(p,ii) - GeoX(p,ii+1))           /* (x0 - x1) */
              * (GeoY(p,ii) + GeoY(p,ii+1))        /* (y0 + y1) */
              * 0.5;
  }
  rArea += (GeoX(p,ii) - GeoX(p,0))                /* (xN - x0) */
           * (GeoY(p,ii) + GeoY(p,0))              /* (yN + y0) */
           * 0.5;
  return rArea;
}

/*
** Implementation of the geopoly_area(X) function.
**
** If the input is a well-formed Geopoly BLOB then return the area
** enclosed by the polygon.  If the polygon circulates clockwise instead
** of counterclockwise (as it should) then return the negative of the
** enclosed area.  Otherwise return NULL.
*/
static void geopolyAreaFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p = geopolyFuncParam(context, argv[0], 0);
  if( p ){
    sqlite3_result_double(context, geopolyArea(p));
    sqlite3_free(p);
  }            
}

/*
** Implementation of the geopoly_ccw(X) function.
**
** If the rotation of polygon X is clockwise (incorrect) instead of
** counter-clockwise (the correct winding order according to RFC7946)
** then reverse the order of the vertexes in polygon X.  
**
** In other words, this routine returns a CCW polygon regardless of the
** winding order of its input.
**
** Use this routine to sanitize historical inputs that that sometimes
** contain polygons that wind in the wrong direction.
*/
static void geopolyCcwFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p = geopolyFuncParam(context, argv[0], 0);
  if( p ){
    if( geopolyArea(p)<0.0 ){
      int ii, jj;
      for(ii=1, jj=p->nVertex-1; ii<jj; ii++, jj--){
        GeoCoord t = GeoX(p,ii);
        GeoX(p,ii) = GeoX(p,jj);
        GeoX(p,jj) = t;
        t = GeoY(p,ii);
        GeoY(p,ii) = GeoY(p,jj);
        GeoY(p,jj) = t;
      }
    }
    sqlite3_result_blob(context, p->hdr, 
       4+8*p->nVertex, SQLITE_TRANSIENT);
    sqlite3_free(p);
  }            
}

#define GEOPOLY_PI 3.1415926535897932385

/* Fast approximation for sine(X) for X between -0.5*pi and 2*pi
*/
static double geopolySine(double r){
  assert( r>=-0.5*GEOPOLY_PI && r<=2.0*GEOPOLY_PI );
  if( r>=1.5*GEOPOLY_PI ){
    r -= 2.0*GEOPOLY_PI;
  }
  if( r>=0.5*GEOPOLY_PI ){
    return -geopolySine(r-GEOPOLY_PI);
  }else{
    double r2 = r*r;
    double r3 = r2*r;
    double r5 = r3*r2;
    return 0.9996949*r - 0.1656700*r3 + 0.0075134*r5;
  }
}

/*
** Function:   geopoly_regular(X,Y,R,N)
**
** Construct a simple, convex, regular polygon centered at X, Y
** with circumradius R and with N sides.
*/
static void geopolyRegularFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  double x = sqlite3_value_double(argv[0]);
  double y = sqlite3_value_double(argv[1]);
  double r = sqlite3_value_double(argv[2]);
  int n = sqlite3_value_int(argv[3]);
  int i;
  GeoPoly *p;

  if( n<3 || r<=0.0 ) return;
  if( n>1000 ) n = 1000;
  p = sqlite3_malloc64( sizeof(*p) + (n-1)*2*sizeof(GeoCoord) );
  if( p==0 ){
    sqlite3_result_error_nomem(context);
    return;
  }
  i = 1;
  p->hdr[0] = *(unsigned char*)&i;
  p->hdr[1] = 0;
  p->hdr[2] = (n>>8)&0xff;
  p->hdr[3] = n&0xff;
  for(i=0; i<n; i++){
    double rAngle = 2.0*GEOPOLY_PI*i/n;
    GeoX(p,i) = x - r*geopolySine(rAngle-0.5*GEOPOLY_PI);
    GeoY(p,i) = y + r*geopolySine(rAngle);
  }
  sqlite3_result_blob(context, p->hdr, 4+8*n, SQLITE_TRANSIENT);
  sqlite3_free(p);
}

/*
** If pPoly is a polygon, compute its bounding box. Then:
**
**    (1) if aCoord!=0 store the bounding box in aCoord, returning NULL
**    (2) otherwise, compute a GeoPoly for the bounding box and return the
**        new GeoPoly
**
** If pPoly is NULL but aCoord is not NULL, then compute a new GeoPoly from
** the bounding box in aCoord and return a pointer to that GeoPoly.
*/
static GeoPoly *geopolyBBox(
  sqlite3_context *context,   /* For recording the error */
  sqlite3_value *pPoly,       /* The polygon */
  RtreeCoord *aCoord,         /* Results here */
  int *pRc                    /* Error code here */
){
  GeoPoly *pOut = 0;
  GeoPoly *p;
  float mnX, mxX, mnY, mxY;
  if( pPoly==0 && aCoord!=0 ){
    p = 0;
    mnX = aCoord[0].f;
    mxX = aCoord[1].f;
    mnY = aCoord[2].f;
    mxY = aCoord[3].f;
    goto geopolyBboxFill;
  }else{
    p = geopolyFuncParam(context, pPoly, pRc);
  }
  if( p ){
    int ii;
    mnX = mxX = GeoX(p,0);
    mnY = mxY = GeoY(p,0);
    for(ii=1; ii<p->nVertex; ii++){
      double r = GeoX(p,ii);
      if( r<mnX ) mnX = (float)r;
      else if( r>mxX ) mxX = (float)r;
      r = GeoY(p,ii);
      if( r<mnY ) mnY = (float)r;
      else if( r>mxY ) mxY = (float)r;
    }
    if( pRc ) *pRc = SQLITE_OK;
    if( aCoord==0 ){
      geopolyBboxFill:
      pOut = sqlite3_realloc64(p, GEOPOLY_SZ(4));
      if( pOut==0 ){
        sqlite3_free(p);
        if( context ) sqlite3_result_error_nomem(context);
        if( pRc ) *pRc = SQLITE_NOMEM;
        return 0;
      }
      pOut->nVertex = 4;
      ii = 1;
      pOut->hdr[0] = *(unsigned char*)&ii;
      pOut->hdr[1] = 0;
      pOut->hdr[2] = 0;
      pOut->hdr[3] = 4;
      GeoX(pOut,0) = mnX;
      GeoY(pOut,0) = mnY;
      GeoX(pOut,1) = mxX;
      GeoY(pOut,1) = mnY;
      GeoX(pOut,2) = mxX;
      GeoY(pOut,2) = mxY;
      GeoX(pOut,3) = mnX;
      GeoY(pOut,3) = mxY;
    }else{
      sqlite3_free(p);
      aCoord[0].f = mnX;
      aCoord[1].f = mxX;
      aCoord[2].f = mnY;
      aCoord[3].f = mxY;
    }
  }else{
    memset(aCoord, 0, sizeof(RtreeCoord)*4);
  }
  return pOut;
}

/*
** Implementation of the geopoly_bbox(X) SQL function.
*/
static void geopolyBBoxFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p = geopolyBBox(context, argv[0], 0, 0);
  if( p ){
    sqlite3_result_blob(context, p->hdr, 
       4+8*p->nVertex, SQLITE_TRANSIENT);
    sqlite3_free(p);
  }
}

/*
** State vector for the geopoly_group_bbox() aggregate function.
*/
typedef struct GeoBBox GeoBBox;
struct GeoBBox {
  int isInit;
  RtreeCoord a[4];
};


/*
** Implementation of the geopoly_group_bbox(X) aggregate SQL function.
*/
static void geopolyBBoxStep(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  RtreeCoord a[4];
  int rc = SQLITE_OK;
  (void)geopolyBBox(context, argv[0], a, &rc);
  if( rc==SQLITE_OK ){
    GeoBBox *pBBox;
    pBBox = (GeoBBox*)sqlite3_aggregate_context(context, sizeof(*pBBox));
    if( pBBox==0 ) return;
    if( pBBox->isInit==0 ){
      pBBox->isInit = 1;
      memcpy(pBBox->a, a, sizeof(RtreeCoord)*4);
    }else{
      if( a[0].f < pBBox->a[0].f ) pBBox->a[0] = a[0];
      if( a[1].f > pBBox->a[1].f ) pBBox->a[1] = a[1];
      if( a[2].f < pBBox->a[2].f ) pBBox->a[2] = a[2];
      if( a[3].f > pBBox->a[3].f ) pBBox->a[3] = a[3];
    }
  }
}
static void geopolyBBoxFinal(
  sqlite3_context *context
){
  GeoPoly *p;
  GeoBBox *pBBox;
  pBBox = (GeoBBox*)sqlite3_aggregate_context(context, 0);
  if( pBBox==0 ) return;
  p = geopolyBBox(context, 0, pBBox->a, 0);
  if( p ){
    sqlite3_result_blob(context, p->hdr, 
       4+8*p->nVertex, SQLITE_TRANSIENT);
    sqlite3_free(p);
  }
}


/*
** Determine if point (x0,y0) is beneath line segment (x1,y1)->(x2,y2).
** Returns:
**
**    +2  x0,y0 is on the line segement
**
**    +1  x0,y0 is beneath line segment
**
**    0   x0,y0 is not on or beneath the line segment or the line segment
**        is vertical and x0,y0 is not on the line segment
**
** The left-most coordinate min(x1,x2) is not considered to be part of
** the line segment for the purposes of this analysis.
*/
static int pointBeneathLine(
  double x0, double y0,
  double x1, double y1,
  double x2, double y2
){
  double y;
  if( x0==x1 && y0==y1 ) return 2;
  if( x1<x2 ){
    if( x0<=x1 || x0>x2 ) return 0;
  }else if( x1>x2 ){
    if( x0<=x2 || x0>x1 ) return 0;
  }else{
    /* Vertical line segment */
    if( x0!=x1 ) return 0;
    if( y0<y1 && y0<y2 ) return 0;
    if( y0>y1 && y0>y2 ) return 0;
    return 2;
  }
  y = y1 + (y2-y1)*(x0-x1)/(x2-x1);
  if( y0==y ) return 2;
  if( y0<y ) return 1;
  return 0;
}

/*
** SQL function:    geopoly_contains_point(P,X,Y)
**
** Return +2 if point X,Y is within polygon P.
** Return +1 if point X,Y is on the polygon boundary.
** Return 0 if point X,Y is outside the polygon
*/
static void geopolyContainsPointFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p1 = geopolyFuncParam(context, argv[0], 0);
  double x0 = sqlite3_value_double(argv[1]);
  double y0 = sqlite3_value_double(argv[2]);
  int v = 0;
  int cnt = 0;
  int ii;
  if( p1==0 ) return;
  for(ii=0; ii<p1->nVertex-1; ii++){
    v = pointBeneathLine(x0,y0,GeoX(p1,ii), GeoY(p1,ii),
                               GeoX(p1,ii+1),GeoY(p1,ii+1));
    if( v==2 ) break;
    cnt += v;
  }
  if( v!=2 ){
    v = pointBeneathLine(x0,y0,GeoX(p1,ii), GeoY(p1,ii),
                               GeoX(p1,0),  GeoY(p1,0));
  }
  if( v==2 ){
    sqlite3_result_int(context, 1);
  }else if( ((v+cnt)&1)==0 ){
    sqlite3_result_int(context, 0);
  }else{
    sqlite3_result_int(context, 2);
  }
  sqlite3_free(p1);
}

/* Forward declaration */
static int geopolyOverlap(GeoPoly *p1, GeoPoly *p2);

/*
** SQL function:    geopoly_within(P1,P2)
**
** Return +2 if P1 and P2 are the same polygon
** Return +1 if P2 is contained within P1
** Return 0 if any part of P2 is on the outside of P1
**
*/
static void geopolyWithinFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p1 = geopolyFuncParam(context, argv[0], 0);
  GeoPoly *p2 = geopolyFuncParam(context, argv[1], 0);
  if( p1 && p2 ){
    int x = geopolyOverlap(p1, p2);
    if( x<0 ){
      sqlite3_result_error_nomem(context);
    }else{
      sqlite3_result_int(context, x==2 ? 1 : x==4 ? 2 : 0);
    }
  }
  sqlite3_free(p1);
  sqlite3_free(p2);
}

/* Objects used by the overlap algorihm. */
typedef struct GeoEvent GeoEvent;
typedef struct GeoSegment GeoSegment;
typedef struct GeoOverlap GeoOverlap;
struct GeoEvent {
  double x;              /* X coordinate at which event occurs */
  int eType;             /* 0 for ADD, 1 for REMOVE */
  GeoSegment *pSeg;      /* The segment to be added or removed */
  GeoEvent *pNext;       /* Next event in the sorted list */
};
struct GeoSegment {
  double C, B;           /* y = C*x + B */
  double y;              /* Current y value */
  float y0;              /* Initial y value */
  unsigned char side;    /* 1 for p1, 2 for p2 */
  unsigned int idx;      /* Which segment within the side */
  GeoSegment *pNext;     /* Next segment in a list sorted by y */
};
struct GeoOverlap {
  GeoEvent *aEvent;          /* Array of all events */
  GeoSegment *aSegment;      /* Array of all segments */
  int nEvent;                /* Number of events */
  int nSegment;              /* Number of segments */
};

/*
** Add a single segment and its associated events.
*/
static void geopolyAddOneSegment(
  GeoOverlap *p,
  GeoCoord x0,
  GeoCoord y0,
  GeoCoord x1,
  GeoCoord y1,
  unsigned char side,
  unsigned int idx
){
  GeoSegment *pSeg;
  GeoEvent *pEvent;
  if( x0==x1 ) return;  /* Ignore vertical segments */
  if( x0>x1 ){
    GeoCoord t = x0;
    x0 = x1;
    x1 = t;
    t = y0;
    y0 = y1;
    y1 = t;
  }
  pSeg = p->aSegment + p->nSegment;
  p->nSegment++;
  pSeg->C = (y1-y0)/(x1-x0);
  pSeg->B = y1 - x1*pSeg->C;
  pSeg->y0 = y0;
  pSeg->side = side;
  pSeg->idx = idx;
  pEvent = p->aEvent + p->nEvent;
  p->nEvent++;
  pEvent->x = x0;
  pEvent->eType = 0;
  pEvent->pSeg = pSeg;
  pEvent = p->aEvent + p->nEvent;
  p->nEvent++;
  pEvent->x = x1;
  pEvent->eType = 1;
  pEvent->pSeg = pSeg;
}
  


/*
** Insert all segments and events for polygon pPoly.
*/
static void geopolyAddSegments(
  GeoOverlap *p,          /* Add segments to this Overlap object */
  GeoPoly *pPoly,         /* Take all segments from this polygon */
  unsigned char side      /* The side of pPoly */
){
  unsigned int i;
  GeoCoord *x;
  for(i=0; i<(unsigned)pPoly->nVertex-1; i++){
    x = &GeoX(pPoly,i);
    geopolyAddOneSegment(p, x[0], x[1], x[2], x[3], side, i);
  }
  x = &GeoX(pPoly,i);
  geopolyAddOneSegment(p, x[0], x[1], pPoly->a[0], pPoly->a[1], side, i);
}

/*
** Merge two lists of sorted events by X coordinate
*/
static GeoEvent *geopolyEventMerge(GeoEvent *pLeft, GeoEvent *pRight){
  GeoEvent head, *pLast;
  head.pNext = 0;
  pLast = &head;
  while( pRight && pLeft ){
    if( pRight->x <= pLeft->x ){
      pLast->pNext = pRight;
      pLast = pRight;
      pRight = pRight->pNext;
    }else{
      pLast->pNext = pLeft;
      pLast = pLeft;
      pLeft = pLeft->pNext;
    }
  }
  pLast->pNext = pRight ? pRight : pLeft;
  return head.pNext;  
}

/*
** Sort an array of nEvent event objects into a list.
*/
static GeoEvent *geopolySortEventsByX(GeoEvent *aEvent, int nEvent){
  int mx = 0;
  int i, j;
  GeoEvent *p;
  GeoEvent *a[50];
  for(i=0; i<nEvent; i++){
    p = &aEvent[i];
    p->pNext = 0;
    for(j=0; j<mx && a[j]; j++){
      p = geopolyEventMerge(a[j], p);
      a[j] = 0;
    }
    a[j] = p;
    if( j>=mx ) mx = j+1;
  }
  p = 0;
  for(i=0; i<mx; i++){
    p = geopolyEventMerge(a[i], p);
  }
  return p;
}

/*
** Merge two lists of sorted segments by Y, and then by C.
*/
static GeoSegment *geopolySegmentMerge(GeoSegment *pLeft, GeoSegment *pRight){
  GeoSegment head, *pLast;
  head.pNext = 0;
  pLast = &head;
  while( pRight && pLeft ){
    double r = pRight->y - pLeft->y;
    if( r==0.0 ) r = pRight->C - pLeft->C;
    if( r<0.0 ){
      pLast->pNext = pRight;
      pLast = pRight;
      pRight = pRight->pNext;
    }else{
      pLast->pNext = pLeft;
      pLast = pLeft;
      pLeft = pLeft->pNext;
    }
  }
  pLast->pNext = pRight ? pRight : pLeft;
  return head.pNext;  
}

/*
** Sort a list of GeoSegments in order of increasing Y and in the event of
** a tie, increasing C (slope).
*/
static GeoSegment *geopolySortSegmentsByYAndC(GeoSegment *pList){
  int mx = 0;
  int i;
  GeoSegment *p;
  GeoSegment *a[50];
  while( pList ){
    p = pList;
    pList = pList->pNext;
    p->pNext = 0;
    for(i=0; i<mx && a[i]; i++){
      p = geopolySegmentMerge(a[i], p);
      a[i] = 0;
    }
    a[i] = p;
    if( i>=mx ) mx = i+1;
  }
  p = 0;
  for(i=0; i<mx; i++){
    p = geopolySegmentMerge(a[i], p);
  }
  return p;
}

/*
** Determine the overlap between two polygons
*/
static int geopolyOverlap(GeoPoly *p1, GeoPoly *p2){
  sqlite3_int64 nVertex = p1->nVertex + p2->nVertex + 2;
  GeoOverlap *p;
  sqlite3_int64 nByte;
  GeoEvent *pThisEvent;
  double rX;
  int rc = 0;
  int needSort = 0;
  GeoSegment *pActive = 0;
  GeoSegment *pSeg;
  unsigned char aOverlap[4];

  nByte = sizeof(GeoEvent)*nVertex*2 
           + sizeof(GeoSegment)*nVertex 
           + sizeof(GeoOverlap);
  p = sqlite3_malloc64( nByte );
  if( p==0 ) return -1;
  p->aEvent = (GeoEvent*)&p[1];
  p->aSegment = (GeoSegment*)&p->aEvent[nVertex*2];
  p->nEvent = p->nSegment = 0;
  geopolyAddSegments(p, p1, 1);
  geopolyAddSegments(p, p2, 2);
  pThisEvent = geopolySortEventsByX(p->aEvent, p->nEvent);
  rX = pThisEvent->x==0.0 ? -1.0 : 0.0;
  memset(aOverlap, 0, sizeof(aOverlap));
  while( pThisEvent ){
    if( pThisEvent->x!=rX ){
      GeoSegment *pPrev = 0;
      int iMask = 0;
      GEODEBUG(("Distinct X: %g\n", pThisEvent->x));
      rX = pThisEvent->x;
      if( needSort ){
        GEODEBUG(("SORT\n"));
        pActive = geopolySortSegmentsByYAndC(pActive);
        needSort = 0;
      }
      for(pSeg=pActive; pSeg; pSeg=pSeg->pNext){
        if( pPrev ){
          if( pPrev->y!=pSeg->y ){
            GEODEBUG(("MASK: %d\n", iMask));
            aOverlap[iMask] = 1;
          }
        }
        iMask ^= pSeg->side;
        pPrev = pSeg;
      }
      pPrev = 0;
      for(pSeg=pActive; pSeg; pSeg=pSeg->pNext){
        double y = pSeg->C*rX + pSeg->B;
        GEODEBUG(("Segment %d.%d %g->%g\n", pSeg->side, pSeg->idx, pSeg->y, y));
        pSeg->y = y;
        if( pPrev ){
          if( pPrev->y>pSeg->y && pPrev->side!=pSeg->side ){
            rc = 1;
            GEODEBUG(("Crossing: %d.%d and %d.%d\n",
                    pPrev->side, pPrev->idx,
                    pSeg->side, pSeg->idx));
            goto geopolyOverlapDone;
          }else if( pPrev->y!=pSeg->y ){
            GEODEBUG(("MASK: %d\n", iMask));
            aOverlap[iMask] = 1;
          }
        }
        iMask ^= pSeg->side;
        pPrev = pSeg;
      }
    }
    GEODEBUG(("%s %d.%d C=%g B=%g\n",
      pThisEvent->eType ? "RM " : "ADD",
      pThisEvent->pSeg->side, pThisEvent->pSeg->idx,
      pThisEvent->pSeg->C,
      pThisEvent->pSeg->B));
    if( pThisEvent->eType==0 ){
      /* Add a segment */
      pSeg = pThisEvent->pSeg;
      pSeg->y = pSeg->y0;
      pSeg->pNext = pActive;
      pActive = pSeg;
      needSort = 1;
    }else{
      /* Remove a segment */
      if( pActive==pThisEvent->pSeg ){
        pActive = pActive->pNext;
      }else{
        for(pSeg=pActive; pSeg; pSeg=pSeg->pNext){
          if( pSeg->pNext==pThisEvent->pSeg ){
            pSeg->pNext = pSeg->pNext->pNext;
            break;
          }
        }
      }
    }
    pThisEvent = pThisEvent->pNext;
  }
  if( aOverlap[3]==0 ){
    rc = 0;
  }else if( aOverlap[1]!=0 && aOverlap[2]==0 ){
    rc = 3;
  }else if( aOverlap[1]==0 && aOverlap[2]!=0 ){
    rc = 2;
  }else if( aOverlap[1]==0 && aOverlap[2]==0 ){
    rc = 4;
  }else{
    rc = 1;
  }

geopolyOverlapDone:
  sqlite3_free(p);
  return rc;
}

/*
** SQL function:    geopoly_overlap(P1,P2)
**
** Determine whether or not P1 and P2 overlap. Return value:
**
**   0     The two polygons are disjoint
**   1     They overlap
**   2     P1 is completely contained within P2
**   3     P2 is completely contained within P1
**   4     P1 and P2 are the same polygon
**   NULL  Either P1 or P2 or both are not valid polygons
*/
static void geopolyOverlapFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  GeoPoly *p1 = geopolyFuncParam(context, argv[0], 0);
  GeoPoly *p2 = geopolyFuncParam(context, argv[1], 0);
  if( p1 && p2 ){
    int x = geopolyOverlap(p1, p2);
    if( x<0 ){
      sqlite3_result_error_nomem(context);
    }else{
      sqlite3_result_int(context, x);
    }
  }
  sqlite3_free(p1);
  sqlite3_free(p2);
}

/*
** Enable or disable debugging output
*/
static void geopolyDebugFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
#ifdef GEOPOLY_ENABLE_DEBUG
  geo_debug = sqlite3_value_int(argv[0]);
#endif
}

/* 
** This function is the implementation of both the xConnect and xCreate
** methods of the geopoly virtual table.
**
**   argv[0]   -> module name
**   argv[1]   -> database name
**   argv[2]   -> table name
**   argv[...] -> column names...
*/
static int geopolyInit(
  sqlite3 *db,                        /* Database connection */
  void *pAux,                         /* One of the RTREE_COORD_* constants */
  int argc, const char *const*argv,   /* Parameters to CREATE TABLE statement */
  sqlite3_vtab **ppVtab,              /* OUT: New virtual table */
  char **pzErr,                       /* OUT: Error message, if any */
  int isCreate                        /* True for xCreate, false for xConnect */
){
  int rc = SQLITE_OK;
  Rtree *pRtree;
  sqlite3_int64 nDb;              /* Length of string argv[1] */
  sqlite3_int64 nName;            /* Length of string argv[2] */
  sqlite3_str *pSql;
  char *zSql;
  int ii;

  sqlite3_vtab_config(db, SQLITE_VTAB_CONSTRAINT_SUPPORT, 1);

  /* Allocate the sqlite3_vtab structure */
  nDb = strlen(argv[1]);
  nName = strlen(argv[2]);
  pRtree = (Rtree *)sqlite3_malloc64(sizeof(Rtree)+nDb+nName+2);
  if( !pRtree ){
    return SQLITE_NOMEM;
  }
  memset(pRtree, 0, sizeof(Rtree)+nDb+nName+2);
  pRtree->nBusy = 1;
  pRtree->base.pModule = &rtreeModule;
  pRtree->zDb = (char *)&pRtree[1];
  pRtree->zName = &pRtree->zDb[nDb+1];
  pRtree->eCoordType = RTREE_COORD_REAL32;
  pRtree->nDim = 2;
  pRtree->nDim2 = 4;
  memcpy(pRtree->zDb, argv[1], nDb);
  memcpy(pRtree->zName, argv[2], nName);


  /* Create/Connect to the underlying relational database schema. If
  ** that is successful, call sqlite3_declare_vtab() to configure
  ** the r-tree table schema.
  */
  pSql = sqlite3_str_new(db);
  sqlite3_str_appendf(pSql, "CREATE TABLE x(_shape");
  pRtree->nAux = 1;         /* Add one for _shape */
  pRtree->nAuxNotNull = 1;  /* The _shape column is always not-null */
  for(ii=3; ii<argc; ii++){
    pRtree->nAux++;
    sqlite3_str_appendf(pSql, ",%s", argv[ii]);
  }
  sqlite3_str_appendf(pSql, ");");
  zSql = sqlite3_str_finish(pSql);
  if( !zSql ){
    rc = SQLITE_NOMEM;
  }else if( SQLITE_OK!=(rc = sqlite3_declare_vtab(db, zSql)) ){
    *pzErr = sqlite3_mprintf("%s", sqlite3_errmsg(db));
  }
  sqlite3_free(zSql);
  if( rc ) goto geopolyInit_fail;
  pRtree->nBytesPerCell = 8 + pRtree->nDim2*4;

  /* Figure out the node size to use. */
  rc = getNodeSize(db, pRtree, isCreate, pzErr);
  if( rc ) goto geopolyInit_fail;
  rc = rtreeSqlInit(pRtree, db, argv[1], argv[2], isCreate);
  if( rc ){
    *pzErr = sqlite3_mprintf("%s", sqlite3_errmsg(db));
    goto geopolyInit_fail;
  }

  *ppVtab = (sqlite3_vtab *)pRtree;
  return SQLITE_OK;

geopolyInit_fail:
  if( rc==SQLITE_OK ) rc = SQLITE_ERROR;
  assert( *ppVtab==0 );
  assert( pRtree->nBusy==1 );
  rtreeRelease(pRtree);
  return rc;
}


/* 
** GEOPOLY virtual table module xCreate method.
*/
static int geopolyCreate(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  return geopolyInit(db, pAux, argc, argv, ppVtab, pzErr, 1);
}

/* 
** GEOPOLY virtual table module xConnect method.
*/
static int geopolyConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  return geopolyInit(db, pAux, argc, argv, ppVtab, pzErr, 0);
}


/* 
** GEOPOLY virtual table module xFilter method.
**
** Query plans:
**
**      1         rowid lookup
**      2         search for objects overlapping the same bounding box
**                that contains polygon argv[0]
**      3         search for objects overlapping the same bounding box
**                that contains polygon argv[0]
**      4         full table scan
*/
static int geopolyFilter(
  sqlite3_vtab_cursor *pVtabCursor,     /* The cursor to initialize */
  int idxNum,                           /* Query plan */
  const char *idxStr,                   /* Not Used */
  int argc, sqlite3_value **argv        /* Parameters to the query plan */
){
  Rtree *pRtree = (Rtree *)pVtabCursor->pVtab;
  RtreeCursor *pCsr = (RtreeCursor *)pVtabCursor;
  RtreeNode *pRoot = 0;
  int rc = SQLITE_OK;
  int iCell = 0;

  rtreeReference(pRtree);

  /* Reset the cursor to the same state as rtreeOpen() leaves it in. */
  resetCursor(pCsr);

  pCsr->iStrategy = idxNum;
  if( idxNum==1 ){
    /* Special case - lookup by rowid. */
    RtreeNode *pLeaf;        /* Leaf on which the required cell resides */
    RtreeSearchPoint *p;     /* Search point for the leaf */
    i64 iRowid = sqlite3_value_int64(argv[0]);
    i64 iNode = 0;
    rc = findLeafNode(pRtree, iRowid, &pLeaf, &iNode);
    if( rc==SQLITE_OK && pLeaf!=0 ){
      p = rtreeSearchPointNew(pCsr, RTREE_ZERO, 0);
      assert( p!=0 );  /* Always returns pCsr->sPoint */
      pCsr->aNode[0] = pLeaf;
      p->id = iNode;
      p->eWithin = PARTLY_WITHIN;
      rc = nodeRowidIndex(pRtree, pLeaf, iRowid, &iCell);
      p->iCell = (u8)iCell;
      RTREE_QUEUE_TRACE(pCsr, "PUSH-F1:");
    }else{
      pCsr->atEOF = 1;
    }
  }else{
    /* Normal case - r-tree scan. Set up the RtreeCursor.aConstraint array 
    ** with the configured constraints. 
    */
    rc = nodeAcquire(pRtree, 1, 0, &pRoot);
    if( rc==SQLITE_OK && idxNum<=3 ){
      RtreeCoord bbox[4];
      RtreeConstraint *p;
      assert( argc==1 );
      geopolyBBox(0, argv[0], bbox, &rc);
      if( rc ){
        goto geopoly_filter_end;
      }
      pCsr->aConstraint = p = sqlite3_malloc(sizeof(RtreeConstraint)*4);
      pCsr->nConstraint = 4;
      if( p==0 ){
        rc = SQLITE_NOMEM;
      }else{
        memset(pCsr->aConstraint, 0, sizeof(RtreeConstraint)*4);
        memset(pCsr->anQueue, 0, sizeof(u32)*(pRtree->iDepth + 1));
        if( idxNum==2 ){
          /* Overlap query */
          p->op = 'B';
          p->iCoord = 0;
          p->u.rValue = bbox[1].f;
          p++;
          p->op = 'D';
          p->iCoord = 1;
          p->u.rValue = bbox[0].f;
          p++;
          p->op = 'B';
          p->iCoord = 2;
          p->u.rValue = bbox[3].f;
          p++;
          p->op = 'D';
          p->iCoord = 3;
          p->u.rValue = bbox[2].f;
        }else{
          /* Within query */
          p->op = 'D';
          p->iCoord = 0;
          p->u.rValue = bbox[0].f;
          p++;
          p->op = 'B';
          p->iCoord = 1;
          p->u.rValue = bbox[1].f;
          p++;
          p->op = 'D';
          p->iCoord = 2;
          p->u.rValue = bbox[2].f;
          p++;
          p->op = 'B';
          p->iCoord = 3;
          p->u.rValue = bbox[3].f;
        }
      }
    }
    if( rc==SQLITE_OK ){
      RtreeSearchPoint *pNew;
      pNew = rtreeSearchPointNew(pCsr, RTREE_ZERO, (u8)(pRtree->iDepth+1));
      if( pNew==0 ){
        rc = SQLITE_NOMEM;
        goto geopoly_filter_end;
      }
      pNew->id = 1;
      pNew->iCell = 0;
      pNew->eWithin = PARTLY_WITHIN;
      assert( pCsr->bPoint==1 );
      pCsr->aNode[0] = pRoot;
      pRoot = 0;
      RTREE_QUEUE_TRACE(pCsr, "PUSH-Fm:");
      rc = rtreeStepToLeaf(pCsr);
    }
  }

geopoly_filter_end:
  nodeRelease(pRtree, pRoot);
  rtreeRelease(pRtree);
  return rc;
}

/*
** Rtree virtual table module xBestIndex method. There are three
** table scan strategies to choose from (in order from most to 
** least desirable):
**
**   idxNum     idxStr        Strategy
**   ------------------------------------------------
**     1        "rowid"       Direct lookup by rowid.
**     2        "rtree"       R-tree overlap query using geopoly_overlap()
**     3        "rtree"       R-tree within query using geopoly_within()
**     4        "fullscan"    full-table scan.
**   ------------------------------------------------
*/
static int geopolyBestIndex(sqlite3_vtab *tab, sqlite3_index_info *pIdxInfo){
  int ii;
  int iRowidTerm = -1;
  int iFuncTerm = -1;
  int idxNum = 0;

  for(ii=0; ii<pIdxInfo->nConstraint; ii++){
    struct sqlite3_index_constraint *p = &pIdxInfo->aConstraint[ii];
    if( !p->usable ) continue;
    if( p->iColumn<0 && p->op==SQLITE_INDEX_CONSTRAINT_EQ  ){
      iRowidTerm = ii;
      break;
    }
    if( p->iColumn==0 && p->op>=SQLITE_INDEX_CONSTRAINT_FUNCTION ){
      /* p->op==SQLITE_INDEX_CONSTRAINT_FUNCTION for geopoly_overlap()
      ** p->op==(SQLITE_INDEX_CONTRAINT_FUNCTION+1) for geopoly_within().
      ** See geopolyFindFunction() */
      iFuncTerm = ii;
      idxNum = p->op - SQLITE_INDEX_CONSTRAINT_FUNCTION + 2;
    }
  }

  if( iRowidTerm>=0 ){
    pIdxInfo->idxNum = 1;
    pIdxInfo->idxStr = "rowid";
    pIdxInfo->aConstraintUsage[iRowidTerm].argvIndex = 1;
    pIdxInfo->aConstraintUsage[iRowidTerm].omit = 1;
    pIdxInfo->estimatedCost = 30.0;
    pIdxInfo->estimatedRows = 1;
    pIdxInfo->idxFlags = SQLITE_INDEX_SCAN_UNIQUE;
    return SQLITE_OK;
  }
  if( iFuncTerm>=0 ){
    pIdxInfo->idxNum = idxNum;
    pIdxInfo->idxStr = "rtree";
    pIdxInfo->aConstraintUsage[iFuncTerm].argvIndex = 1;
    pIdxInfo->aConstraintUsage[iFuncTerm].omit = 0;
    pIdxInfo->estimatedCost = 300.0;
    pIdxInfo->estimatedRows = 10;
    return SQLITE_OK;
  }
  pIdxInfo->idxNum = 4;
  pIdxInfo->idxStr = "fullscan";
  pIdxInfo->estimatedCost = 3000000.0;
  pIdxInfo->estimatedRows = 100000;
  return SQLITE_OK;
}


/* 
** GEOPOLY virtual table module xColumn method.
*/
static int geopolyColumn(sqlite3_vtab_cursor *cur, sqlite3_context *ctx, int i){
  Rtree *pRtree = (Rtree *)cur->pVtab;
  RtreeCursor *pCsr = (RtreeCursor *)cur;
  RtreeSearchPoint *p = rtreeSearchPointFirst(pCsr);
  int rc = SQLITE_OK;
  RtreeNode *pNode = rtreeNodeOfFirstSearchPoint(pCsr, &rc);

  if( rc ) return rc;
  if( p==0 ) return SQLITE_OK;
  if( i==0 && sqlite3_vtab_nochange(ctx) ) return SQLITE_OK;
  if( i<=pRtree->nAux ){
    if( !pCsr->bAuxValid ){
      if( pCsr->pReadAux==0 ){
        rc = sqlite3_prepare_v3(pRtree->db, pRtree->zReadAuxSql, -1, 0,
                                &pCsr->pReadAux, 0);
        if( rc ) return rc;
      }
      sqlite3_bind_int64(pCsr->pReadAux, 1, 
          nodeGetRowid(pRtree, pNode, p->iCell));
      rc = sqlite3_step(pCsr->pReadAux);
      if( rc==SQLITE_ROW ){
        pCsr->bAuxValid = 1;
      }else{
        sqlite3_reset(pCsr->pReadAux);
        if( rc==SQLITE_DONE ) rc = SQLITE_OK;
        return rc;
      }
    }
    sqlite3_result_value(ctx, sqlite3_column_value(pCsr->pReadAux, i+2));
  }
  return SQLITE_OK;
}


/*
** The xUpdate method for GEOPOLY module virtual tables.
**
** For DELETE:
**
**     argv[0] = the rowid to be deleted
**
** For INSERT:
**
**     argv[0] = SQL NULL
**     argv[1] = rowid to insert, or an SQL NULL to select automatically
**     argv[2] = _shape column
**     argv[3] = first application-defined column....
**
** For UPDATE:
**
**     argv[0] = rowid to modify.  Never NULL
**     argv[1] = rowid after the change.  Never NULL
**     argv[2] = new value for _shape
**     argv[3] = new value for first application-defined column....
*/
static int geopolyUpdate(
  sqlite3_vtab *pVtab, 
  int nData, 
  sqlite3_value **aData, 
  sqlite_int64 *pRowid
){
  Rtree *pRtree = (Rtree *)pVtab;
  int rc = SQLITE_OK;
  RtreeCell cell;                 /* New cell to insert if nData>1 */
  i64 oldRowid;                   /* The old rowid */
  int oldRowidValid;              /* True if oldRowid is valid */
  i64 newRowid;                   /* The new rowid */
  int newRowidValid;              /* True if newRowid is valid */
  int coordChange = 0;            /* Change in coordinates */

  if( pRtree->nNodeRef ){
    /* Unable to write to the btree while another cursor is reading from it,
    ** since the write might do a rebalance which would disrupt the read
    ** cursor. */
    return SQLITE_LOCKED_VTAB;
  }
  rtreeReference(pRtree);
  assert(nData>=1);

  oldRowidValid = sqlite3_value_type(aData[0])!=SQLITE_NULL;;
  oldRowid = oldRowidValid ? sqlite3_value_int64(aData[0]) : 0;
  newRowidValid = nData>1 && sqlite3_value_type(aData[1])!=SQLITE_NULL;
  newRowid = newRowidValid ? sqlite3_value_int64(aData[1]) : 0;
  cell.iRowid = newRowid;

  if( nData>1                                 /* not a DELETE */
   && (!oldRowidValid                         /* INSERT */
        || !sqlite3_value_nochange(aData[2])  /* UPDATE _shape */
        || oldRowid!=newRowid)                /* Rowid change */
  ){
    geopolyBBox(0, aData[2], cell.aCoord, &rc);
    if( rc ){
      if( rc==SQLITE_ERROR ){
        pVtab->zErrMsg =
          sqlite3_mprintf("_shape does not contain a valid polygon");
      }
      goto geopoly_update_end;
    }
    coordChange = 1;

    /* If a rowid value was supplied, check if it is already present in 
    ** the table. If so, the constraint has failed. */
    if( newRowidValid && (!oldRowidValid || oldRowid!=newRowid) ){
      int steprc;
      sqlite3_bind_int64(pRtree->pReadRowid, 1, cell.iRowid);
      steprc = sqlite3_step(pRtree->pReadRowid);
      rc = sqlite3_reset(pRtree->pReadRowid);
      if( SQLITE_ROW==steprc ){
        if( sqlite3_vtab_on_conflict(pRtree->db)==SQLITE_REPLACE ){
          rc = rtreeDeleteRowid(pRtree, cell.iRowid);
        }else{
          rc = rtreeConstraintError(pRtree, 0);
        }
      }
    }
  }

  /* If aData[0] is not an SQL NULL value, it is the rowid of a
  ** record to delete from the r-tree table. The following block does
  ** just that.
  */
  if( rc==SQLITE_OK && (nData==1 || (coordChange && oldRowidValid)) ){
    rc = rtreeDeleteRowid(pRtree, oldRowid);
  }

  /* If the aData[] array contains more than one element, elements
  ** (aData[2]..aData[argc-1]) contain a new record to insert into
  ** the r-tree structure.
  */
  if( rc==SQLITE_OK && nData>1 && coordChange ){
    /* Insert the new record into the r-tree */
    RtreeNode *pLeaf = 0;
    if( !newRowidValid ){
      rc = rtreeNewRowid(pRtree, &cell.iRowid);
    }
    *pRowid = cell.iRowid;
    if( rc==SQLITE_OK ){
      rc = ChooseLeaf(pRtree, &cell, 0, &pLeaf);
    }
    if( rc==SQLITE_OK ){
      int rc2;
      pRtree->iReinsertHeight = -1;
      rc = rtreeInsertCell(pRtree, pLeaf, &cell, 0);
      rc2 = nodeRelease(pRtree, pLeaf);
      if( rc==SQLITE_OK ){
        rc = rc2;
      }
    }
  }

  /* Change the data */
  if( rc==SQLITE_OK && nData>1 ){
    sqlite3_stmt *pUp = pRtree->pWriteAux;
    int jj;
    int nChange = 0;
    sqlite3_bind_int64(pUp, 1, cell.iRowid);
    assert( pRtree->nAux>=1 );
    if( sqlite3_value_nochange(aData[2]) ){
      sqlite3_bind_null(pUp, 2);
    }else{
      GeoPoly *p = 0;
      if( sqlite3_value_type(aData[2])==SQLITE_TEXT
       && (p = geopolyFuncParam(0, aData[2], &rc))!=0
       && rc==SQLITE_OK
      ){
        sqlite3_bind_blob(pUp, 2, p->hdr, 4+8*p->nVertex, SQLITE_TRANSIENT);
      }else{
        sqlite3_bind_value(pUp, 2, aData[2]);
      }
      sqlite3_free(p);
      nChange = 1;
    }
    for(jj=1; jj<pRtree->nAux; jj++){
      nChange++;
      sqlite3_bind_value(pUp, jj+2, aData[jj+2]);
    }
    if( nChange ){
      sqlite3_step(pUp);
      rc = sqlite3_reset(pUp);
    }
  }

geopoly_update_end:
  rtreeRelease(pRtree);
  return rc;
}

/*
** Report that geopoly_overlap() is an overloaded function suitable
** for use in xBestIndex.
*/
static int geopolyFindFunction(
  sqlite3_vtab *pVtab,
  int nArg,
  const char *zName,
  void (**pxFunc)(sqlite3_context*,int,sqlite3_value**),
  void **ppArg
){
  if( sqlite3_stricmp(zName, "geopoly_overlap")==0 ){
    *pxFunc = geopolyOverlapFunc;
    *ppArg = 0;
    return SQLITE_INDEX_CONSTRAINT_FUNCTION;
  }
  if( sqlite3_stricmp(zName, "geopoly_within")==0 ){
    *pxFunc = geopolyWithinFunc;
    *ppArg = 0;
    return SQLITE_INDEX_CONSTRAINT_FUNCTION+1;
  }
  return 0;
}


static sqlite3_module geopolyModule = {
  3,                          /* iVersion */
  geopolyCreate,              /* xCreate - create a table */
  geopolyConnect,             /* xConnect - connect to an existing table */
  geopolyBestIndex,           /* xBestIndex - Determine search strategy */
  rtreeDisconnect,            /* xDisconnect - Disconnect from a table */
  rtreeDestroy,               /* xDestroy - Drop a table */
  rtreeOpen,                  /* xOpen - open a cursor */
  rtreeClose,                 /* xClose - close a cursor */
  geopolyFilter,              /* xFilter - configure scan constraints */
  rtreeNext,                  /* xNext - advance a cursor */
  rtreeEof,                   /* xEof */
  geopolyColumn,              /* xColumn - read data */
  rtreeRowid,                 /* xRowid - read data */
  geopolyUpdate,              /* xUpdate - write data */
  rtreeBeginTransaction,      /* xBegin - begin transaction */
  rtreeEndTransaction,        /* xSync - sync transaction */
  rtreeEndTransaction,        /* xCommit - commit transaction */
  rtreeEndTransaction,        /* xRollback - rollback transaction */
  geopolyFindFunction,        /* xFindFunction - function overloading */
  rtreeRename,                /* xRename - rename the table */
  rtreeSavepoint,             /* xSavepoint */
  0,                          /* xRelease */
  0,                          /* xRollbackTo */
  rtreeShadowName             /* xShadowName */
};

static int sqlite3_geopoly_init(sqlite3 *db){
  int rc = SQLITE_OK;
  static const struct {
    void (*xFunc)(sqlite3_context*,int,sqlite3_value**);
    signed char nArg;
    unsigned char bPure;
    const char *zName;
  } aFunc[] = {
     { geopolyAreaFunc,          1, 1,    "geopoly_area"             },
     { geopolyBlobFunc,          1, 1,    "geopoly_blob"             },
     { geopolyJsonFunc,          1, 1,    "geopoly_json"             },
     { geopolySvgFunc,          -1, 1,    "geopoly_svg"              },
     { geopolyWithinFunc,        2, 1,    "geopoly_within"           },
     { geopolyContainsPointFunc, 3, 1,    "geopoly_contains_point"   },
     { geopolyOverlapFunc,       2, 1,    "geopoly_overlap"          },
     { geopolyDebugFunc,         1, 0,    "geopoly_debug"            },
     { geopolyBBoxFunc,          1, 1,    "geopoly_bbox"             },
     { geopolyXformFunc,         7, 1,    "geopoly_xform"            },
     { geopolyRegularFunc,       4, 1,    "geopoly_regular"          },
     { geopolyCcwFunc,           1, 1,    "geopoly_ccw"              },
  };
  static const struct {
    void (*xStep)(sqlite3_context*,int,sqlite3_value**);
    void (*xFinal)(sqlite3_context*);
    const char *zName;
  } aAgg[] = {
     { geopolyBBoxStep, geopolyBBoxFinal, "geopoly_group_bbox"    },
  };
  int i;
  for(i=0; i<sizeof(aFunc)/sizeof(aFunc[0]) && rc==SQLITE_OK; i++){
    int enc;
    if( aFunc[i].bPure ){
      enc = SQLITE_UTF8|SQLITE_DETERMINISTIC|SQLITE_INNOCUOUS;
    }else{
      enc = SQLITE_UTF8|SQLITE_DIRECTONLY;
    }
    rc = sqlite3_create_function(db, aFunc[i].zName, aFunc[i].nArg,
                                 enc, 0,
                                 aFunc[i].xFunc, 0, 0);
  }
  for(i=0; i<sizeof(aAgg)/sizeof(aAgg[0]) && rc==SQLITE_OK; i++){
    rc = sqlite3_create_function(db, aAgg[i].zName, 1, 
              SQLITE_UTF8|SQLITE_DETERMINISTIC|SQLITE_INNOCUOUS, 0,
              0, aAgg[i].xStep, aAgg[i].xFinal);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_module_v2(db, "geopoly", &geopolyModule, 0, 0);
  }
  return rc;
}
