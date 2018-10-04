const mimeTypes = [{t:"application/andrew-inset",e:["ez"]},{t:"application/applixware",e:["aw"]},{t:"application/atom+xml",e:["atom"]},{t:"application/atomcat+xml",e:["atomcat"]},{t:"application/atomsvc+xml",e:["atomsvc"]},{t:"application/ccxml+xml",e:["ccxml"]},{t:"application/cdmi-capability",e:["cdmia"]},{t:"application/cdmi-container",e:["cdmic"]},{t:"application/cdmi-domain",e:["cdmid"]},{t:"application/cdmi-object",e:["cdmio"]},{t:"application/cdmi-queue",e:["cdmiq"]},{t:"application/cu-seeme",e:["cu"]},{t:"application/davmount+xml",e:["davmount"]},{t:"application/docbook+xml",e:["dbk"]},{t:"application/dssc+der",e:["dssc"]},{t:"application/dssc+xml",e:["xdssc"]},{t:"application/ecmascript",e:["ecma"]},{t:"application/emma+xml",e:["emma"]},{t:"application/epub+zip",e:["epub"]},{t:"application/exi",e:["exi"]},{t:"application/font-tdpfr",e:["pfr"]},{t:"application/font-woff",e:["woff"]},{t:"application/gml+xml",e:["gml"]},{t:"application/gpx+xml",e:["gpx"]},{t:"application/gxf",e:["gxf"]},{t:"application/hyperstudio",e:["stk"]},{t:"application/inkml+xml",e:["ink","inkml"]},{t:"application/ipfix",e:["ipfix"]},{t:"application/java-archive",e:["jar"]},{t:"application/java-serialized-object",e:["ser"]},{t:"application/java-vm",e:["class"]},{t:"application/javascript",e:["js"]},{t:"application/json",e:["json"]},{t:"application/jsonml+json",e:["jsonml"]},{t:"application/lost+xml",e:["lostxml"]},{t:"application/mac-binhex40",e:["hqx"]},{t:"application/mac-compactpro",e:["cpt"]},{t:"application/mads+xml",e:["mads"]},{t:"application/marc",e:["mrc"]},{t:"application/marcxml+xml",e:["mrcx"]},{t:"application/mathematica",e:["ma","nb","mb"]},{t:"application/mathml+xml",e:["mathml"]},{t:"application/mbox",e:["mbox"]},{t:"application/mediaservercontrol+xml",e:["mscml"]},{t:"application/metalink+xml",e:["metalink"]},{t:"application/metalink4+xml",e:["meta4"]},{t:"application/mets+xml",e:["mets"]},{t:"application/mods+xml",e:["mods"]},{t:"application/mp21",e:["m21","mp21"]},{t:"application/mp4",e:["mp4s"]},{t:"application/msword",e:["doc","dot"]},{t:"application/mxf",e:["mxf"]},{t:"application/octet-stream",e:["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy"]},{t:"application/oda",e:["oda"]},{t:"application/oebps-package+xml",e:["opf"]},{t:"application/ogg",e:["ogx"]},{t:"application/omdoc+xml",e:["omdoc"]},{t:"application/onenote",e:["onetoc","onetoc2","onetmp","onepkg"]},{t:"application/oxps",e:["oxps"]},{t:"application/patch-ops-error+xml",e:["xer"]},{t:"application/pdf",e:["pdf"]},{t:"application/pgp-encrypted",e:["pgp"]},{t:"application/pgp-signature",e:["asc","sig"]},{t:"application/pics-rules",e:["prf"]},{t:"application/pkcs10",e:["p10"]},{t:"application/pkcs7-mime",e:["p7m","p7c"]},{t:"application/pkcs7-signature",e:["p7s"]},{t:"application/pkcs8",e:["p8"]},{t:"application/pkix-attr-cert",e:["ac"]},{t:"application/pkix-cert",e:["cer"]},{t:"application/pkix-crl",e:["crl"]},{t:"application/pkix-pkipath",e:["pkipath"]},{t:"application/pkixcmp",e:["pki"]},{t:"application/pls+xml",e:["pls"]},{t:"application/postscript",e:["ai","eps","ps"]},{t:"application/prs.cww",e:["cww"]},{t:"application/pskc+xml",e:["pskcxml"]},{t:"application/rdf+xml",e:["rdf"]},{t:"application/reginfo+xml",e:["rif"]},{t:"application/relax-ng-compact-syntax",e:["rnc"]},{t:"application/resource-lists+xml",e:["rl"]},{t:"application/resource-lists-diff+xml",e:["rld"]},{t:"application/rls-services+xml",e:["rs"]},{t:"application/rpki-ghostbusters",e:["gbr"]},{t:"application/rpki-manifest",e:["mft"]},{t:"application/rpki-roa",e:["roa"]},{t:"application/rsd+xml",e:["rsd"]},{t:"application/rss+xml",e:["rss"]},{t:"application/rtf",e:["rtf"]},{t:"application/sbml+xml",e:["sbml"]},{t:"application/scvp-cv-request",e:["scq"]},{t:"application/scvp-cv-response",e:["scs"]},{t:"application/scvp-vp-request",e:["spq"]},{t:"application/scvp-vp-response",e:["spp"]},{t:"application/sdp",e:["sdp"]},{t:"application/set-payment-initiation",e:["setpay"]},{t:"application/set-registration-initiation",e:["setreg"]},{t:"application/shf+xml",e:["shf"]},{t:"application/smil+xml",e:["smi","smil"]},{t:"application/sparql-query",e:["rq"]},{t:"application/sparql-results+xml",e:["srx"]},{t:"application/srgs",e:["gram"]},{t:"application/srgs+xml",e:["grxml"]},{t:"application/sru+xml",e:["sru"]},{t:"application/ssdl+xml",e:["ssdl"]},{t:"application/ssml+xml",e:["ssml"]},{t:"application/tei+xml",e:["tei","teicorpus"]},{t:"application/thraud+xml",e:["tfi"]},{t:"application/timestamped-data",e:["tsd"]},{t:"application/vnd.3gpp.pic-bw-large",e:["plb"]},{t:"application/vnd.3gpp.pic-bw-small",e:["psb"]},{t:"application/vnd.3gpp.pic-bw-var",e:["pvb"]},{t:"application/vnd.3gpp2.tcap",e:["tcap"]},{t:"application/vnd.3m.post-it-notes",e:["pwn"]},{t:"application/vnd.accpac.simply.aso",e:["aso"]},{t:"application/vnd.accpac.simply.imp",e:["imp"]},{t:"application/vnd.acucobol",e:["acu"]},{t:"application/vnd.acucorp",e:["atc","acutc"]},{t:"application/vnd.adobe.air-application-installer-package+zip",e:["air"]},{t:"application/vnd.adobe.formscentral.fcdt",e:["fcdt"]},{t:"application/vnd.adobe.fxp",e:["fxp","fxpl"]},{t:"application/vnd.adobe.xdp+xml",e:["xdp"]},{t:"application/vnd.adobe.xfdf",e:["xfdf"]},{t:"application/vnd.ahead.space",e:["ahead"]},{t:"application/vnd.airzip.filesecure.azf",e:["azf"]},{t:"application/vnd.airzip.filesecure.azs",e:["azs"]},{t:"application/vnd.amazon.ebook",e:["azw"]},{t:"application/vnd.americandynamics.acc",e:["acc"]},{t:"application/vnd.amiga.ami",e:["ami"]},{t:"application/vnd.android.package-archive",e:["apk"]},{t:"application/vnd.anser-web-certificate-issue-initiation",e:["cii"]},{t:"application/vnd.anser-web-funds-transfer-initiation",e:["fti"]},{t:"application/vnd.antix.game-component",e:["atx"]},{t:"application/vnd.apple.installer+xml",e:["mpkg"]},{t:"application/vnd.apple.mpegurl",e:["m3u8"]},{t:"application/vnd.aristanetworks.swi",e:["swi"]},{t:"application/vnd.astraea-software.iota",e:["iota"]},{t:"application/vnd.audiograph",e:["aep"]},{t:"application/vnd.blueice.multipass",e:["mpm"]},{t:"application/vnd.bmi",e:["bmi"]},{t:"application/vnd.businessobjects",e:["rep"]},{t:"application/vnd.chemdraw+xml",e:["cdxml"]},{t:"application/vnd.chipnuts.karaoke-mmd",e:["mmd"]},{t:"application/vnd.cinderella",e:["cdy"]},{t:"application/vnd.claymore",e:["cla"]},{t:"application/vnd.cloanto.rp9",e:["rp9"]},{t:"application/vnd.clonk.c4group",e:["c4g","c4d","c4f","c4p","c4u"]},{t:"application/vnd.cluetrust.cartomobile-config",e:["c11amc"]},{t:"application/vnd.cluetrust.cartomobile-config-pkg",e:["c11amz"]},{t:"application/vnd.commonspace",e:["csp"]},{t:"application/vnd.contact.cmsg",e:["cdbcmsg"]},{t:"application/vnd.cosmocaller",e:["cmc"]},{t:"application/vnd.crick.clicker",e:["clkx"]},{t:"application/vnd.crick.clicker.keyboard",e:["clkk"]},{t:"application/vnd.crick.clicker.palette",e:["clkp"]},{t:"application/vnd.crick.clicker.template",e:["clkt"]},{t:"application/vnd.crick.clicker.wordbank",e:["clkw"]},{t:"application/vnd.criticaltools.wbs+xml",e:["wbs"]},{t:"application/vnd.ctc-posml",e:["pml"]},{t:"application/vnd.cups-ppd",e:["ppd"]},{t:"application/vnd.curl.car",e:["car"]},{t:"application/vnd.curl.pcurl",e:["pcurl"]},{t:"application/vnd.dart",e:["dart"]},{t:"application/vnd.data-vision.rdz",e:["rdz"]},{t:"application/vnd.dece.data",e:["uvf","uvvf","uvd","uvvd"]},{t:"application/vnd.dece.ttml+xml",e:["uvt","uvvt"]},{t:"application/vnd.dece.unspecified",e:["uvx","uvvx"]},{t:"application/vnd.dece.zip",e:["uvz","uvvz"]},{t:"application/vnd.denovo.fcselayout-link",e:["fe_launch"]},{t:"application/vnd.dna",e:["dna"]},{t:"application/vnd.dolby.mlp",e:["mlp"]},{t:"application/vnd.dpgraph",e:["dpg"]},{t:"application/vnd.dreamfactory",e:["dfac"]},{t:"application/vnd.ds-keypoint",e:["kpxx"]},{t:"application/vnd.dvb.ait",e:["ait"]},{t:"application/vnd.dvb.service",e:["svc"]},{t:"application/vnd.dynageo",e:["geo"]},{t:"application/vnd.ecowin.chart",e:["mag"]},{t:"application/vnd.enliven",e:["nml"]},{t:"application/vnd.epson.esf",e:["esf"]},{t:"application/vnd.epson.msf",e:["msf"]},{t:"application/vnd.epson.quickanime",e:["qam"]},{t:"application/vnd.epson.salt",e:["slt"]},{t:"application/vnd.epson.ssf",e:["ssf"]},{t:"application/vnd.eszigno3+xml",e:["es3","et3"]},{t:"application/vnd.ezpix-album",e:["ez2"]},{t:"application/vnd.ezpix-package",e:["ez3"]},{t:"application/vnd.fdf",e:["fdf"]},{t:"application/vnd.fdsn.mseed",e:["mseed"]},{t:"application/vnd.fdsn.seed",e:["seed","dataless"]},{t:"application/vnd.flographit",e:["gph"]},{t:"application/vnd.fluxtime.clip",e:["ftc"]},{t:"application/vnd.framemaker",e:["fm","frame","maker","book"]},{t:"application/vnd.frogans.fnc",e:["fnc"]},{t:"application/vnd.frogans.ltf",e:["ltf"]},{t:"application/vnd.fsc.weblaunch",e:["fsc"]},{t:"application/vnd.fujitsu.oasys",e:["oas"]},{t:"application/vnd.fujitsu.oasys2",e:["oa2"]},{t:"application/vnd.fujitsu.oasys3",e:["oa3"]},{t:"application/vnd.fujitsu.oasysgp",e:["fg5"]},{t:"application/vnd.fujitsu.oasysprs",e:["bh2"]},{t:"application/vnd.fujixerox.ddd",e:["ddd"]},{t:"application/vnd.fujixerox.docuworks",e:["xdw"]},{t:"application/vnd.fujixerox.docuworks.binder",e:["xbd"]},{t:"application/vnd.fuzzysheet",e:["fzs"]},{t:"application/vnd.genomatix.tuxedo",e:["txd"]},{t:"application/vnd.geogebra.file",e:["ggb"]},{t:"application/vnd.geogebra.tool",e:["ggt"]},{t:"application/vnd.geometry-explorer",e:["gex","gre"]},{t:"application/vnd.geonext",e:["gxt"]},{t:"application/vnd.geoplan",e:["g2w"]},{t:"application/vnd.geospace",e:["g3w"]},{t:"application/vnd.gmx",e:["gmx"]},{t:"application/vnd.google-earth.kml+xml",e:["kml"]},{t:"application/vnd.google-earth.kmz",e:["kmz"]},{t:"application/vnd.grafeq",e:["gqf","gqs"]},{t:"application/vnd.groove-account",e:["gac"]},{t:"application/vnd.groove-help",e:["ghf"]},{t:"application/vnd.groove-identity-message",e:["gim"]},{t:"application/vnd.groove-injector",e:["grv"]},{t:"application/vnd.groove-tool-message",e:["gtm"]},{t:"application/vnd.groove-tool-template",e:["tpl"]},{t:"application/vnd.groove-vcard",e:["vcg"]},{t:"application/vnd.hal+xml",e:["hal"]},{t:"application/vnd.handheld-entertainment+xml",e:["zmm"]},{t:"application/vnd.hbci",e:["hbci"]},{t:"application/vnd.hhe.lesson-player",e:["les"]},{t:"application/vnd.hp-hpgl",e:["hpgl"]},{t:"application/vnd.hp-hpid",e:["hpid"]},{t:"application/vnd.hp-hps",e:["hps"]},{t:"application/vnd.hp-jlyt",e:["jlt"]},{t:"application/vnd.hp-pcl",e:["pcl"]},{t:"application/vnd.hp-pclxl",e:["pclxl"]},{t:"application/vnd.hydrostatix.sof-data",e:["sfd-hdstx"]},{t:"application/vnd.ibm.minipay",e:["mpy"]},{t:"application/vnd.ibm.modcap",e:["afp","listafp","list3820"]},{t:"application/vnd.ibm.rights-management",e:["irm"]},{t:"application/vnd.ibm.secure-container",e:["sc"]},{t:"application/vnd.iccprofile",e:["icc","icm"]},{t:"application/vnd.igloader",e:["igl"]},{t:"application/vnd.immervision-ivp",e:["ivp"]},{t:"application/vnd.immervision-ivu",e:["ivu"]},{t:"application/vnd.insors.igm",e:["igm"]},{t:"application/vnd.intercon.formnet",e:["xpw","xpx"]},{t:"application/vnd.intergeo",e:["i2g"]},{t:"application/vnd.intu.qbo",e:["qbo"]},{t:"application/vnd.intu.qfx",e:["qfx"]},{t:"application/vnd.ipunplugged.rcprofile",e:["rcprofile"]},{t:"application/vnd.irepository.package+xml",e:["irp"]},{t:"application/vnd.is-xpr",e:["xpr"]},{t:"application/vnd.isac.fcs",e:["fcs"]},{t:"application/vnd.jam",e:["jam"]},{t:"application/vnd.jcp.javame.midlet-rms",e:["rms"]},{t:"application/vnd.jisp",e:["jisp"]},{t:"application/vnd.joost.joda-archive",e:["joda"]},{t:"application/vnd.kahootz",e:["ktz","ktr"]},{t:"application/vnd.kde.karbon",e:["karbon"]},{t:"application/vnd.kde.kchart",e:["chrt"]},{t:"application/vnd.kde.kformula",e:["kfo"]},{t:"application/vnd.kde.kivio",e:["flw"]},{t:"application/vnd.kde.kontour",e:["kon"]},{t:"application/vnd.kde.kpresenter",e:["kpr","kpt"]},{t:"application/vnd.kde.kspread",e:["ksp"]},{t:"application/vnd.kde.kword",e:["kwd","kwt"]},{t:"application/vnd.kenameaapp",e:["htke"]},{t:"application/vnd.kidspiration",e:["kia"]},{t:"application/vnd.kinar",e:["kne","knp"]},{t:"application/vnd.koan",e:["skp","skd","skt","skm"]},{t:"application/vnd.kodak-descriptor",e:["sse"]},{t:"application/vnd.las.las+xml",e:["lasxml"]},{t:"application/vnd.llamagraphics.life-balance.desktop",e:["lbd"]},{t:"application/vnd.llamagraphics.life-balance.exchange+xml",e:["lbe"]},{t:"application/vnd.lotus-1-2-3",e:["123"]},{t:"application/vnd.lotus-approach",e:["apr"]},{t:"application/vnd.lotus-freelance",e:["pre"]},{t:"application/vnd.lotus-notes",e:["nsf"]},{t:"application/vnd.lotus-organizer",e:["org"]},{t:"application/vnd.lotus-screencam",e:["scm"]},{t:"application/vnd.lotus-wordpro",e:["lwp"]},{t:"application/vnd.macports.portpkg",e:["portpkg"]},{t:"application/vnd.mcd",e:["mcd"]},{t:"application/vnd.medcalcdata",e:["mc1"]},{t:"application/vnd.mediastation.cdkey",e:["cdkey"]},{t:"application/vnd.mfer",e:["mwf"]},{t:"application/vnd.mfmp",e:["mfm"]},{t:"application/vnd.micrografx.flo",e:["flo"]},{t:"application/vnd.micrografx.igx",e:["igx"]},{t:"application/vnd.mif",e:["mif"]},{t:"application/vnd.mobius.daf",e:["daf"]},{t:"application/vnd.mobius.dis",e:["dis"]},{t:"application/vnd.mobius.mbk",e:["mbk"]},{t:"application/vnd.mobius.mqy",e:["mqy"]},{t:"application/vnd.mobius.msl",e:["msl"]},{t:"application/vnd.mobius.plc",e:["plc"]},{t:"application/vnd.mobius.txf",e:["txf"]},{t:"application/vnd.mophun.application",e:["mpn"]},{t:"application/vnd.mophun.certificate",e:["mpc"]},{t:"application/vnd.mozilla.xul+xml",e:["xul"]},{t:"application/vnd.ms-artgalry",e:["cil"]},{t:"application/vnd.ms-cab-compressed",e:["cab"]},{t:"application/vnd.ms-excel",e:["xls","xlm","xla","xlc","xlt","xlw"]},{t:"application/vnd.ms-excel.addin.macroenabled.12",e:["xlam"]},{t:"application/vnd.ms-excel.sheet.binary.macroenabled.12",e:["xlsb"]},{t:"application/vnd.ms-excel.sheet.macroenabled.12",e:["xlsm"]},{t:"application/vnd.ms-excel.template.macroenabled.12",e:["xltm"]},{t:"application/vnd.ms-fontobject",e:["eot"]},{t:"application/vnd.ms-htmlhelp",e:["chm"]},{t:"application/vnd.ms-ims",e:["ims"]},{t:"application/vnd.ms-lrm",e:["lrm"]},{t:"application/vnd.ms-officetheme",e:["thmx"]},{t:"application/vnd.ms-pki.seccat",e:["cat"]},{t:"application/vnd.ms-pki.stl",e:["stl"]},{t:"application/vnd.ms-powerpoint",e:["ppt","pps","pot"]},{t:"application/vnd.ms-powerpoint.addin.macroenabled.12",e:["ppam"]},{t:"application/vnd.ms-powerpoint.presentation.macroenabled.12",e:["pptm"]},{t:"application/vnd.ms-powerpoint.slide.macroenabled.12",e:["sldm"]},{t:"application/vnd.ms-powerpoint.slideshow.macroenabled.12",e:["ppsm"]},{t:"application/vnd.ms-powerpoint.template.macroenabled.12",e:["potm"]},{t:"application/vnd.ms-project",e:["mpp","mpt"]},{t:"application/vnd.ms-word.document.macroenabled.12",e:["docm"]},{t:"application/vnd.ms-word.template.macroenabled.12",e:["dotm"]},{t:"application/vnd.ms-works",e:["wps","wks","wcm","wdb"]},{t:"application/vnd.ms-wpl",e:["wpl"]},{t:"application/vnd.ms-xpsdocument",e:["xps"]},{t:"application/vnd.mseq",e:["mseq"]},{t:"application/vnd.musician",e:["mus"]},{t:"application/vnd.muvee.style",e:["msty"]},{t:"application/vnd.mynfc",e:["taglet"]},{t:"application/vnd.neurolanguage.nlu",e:["nlu"]},{t:"application/vnd.nitf",e:["ntf","nitf"]},{t:"application/vnd.noblenet-directory",e:["nnd"]},{t:"application/vnd.noblenet-sealer",e:["nns"]},{t:"application/vnd.noblenet-web",e:["nnw"]},{t:"application/vnd.nokia.n-gage.data",e:["ngdat"]},{t:"application/vnd.nokia.n-gage.symbian.install",e:["n-gage"]},{t:"application/vnd.nokia.radio-preset",e:["rpst"]},{t:"application/vnd.nokia.radio-presets",e:["rpss"]},{t:"application/vnd.novadigm.edm",e:["edm"]},{t:"application/vnd.novadigm.edx",e:["edx"]},{t:"application/vnd.novadigm.ext",e:["ext"]},{t:"application/vnd.oasis.opendocument.chart",e:["odc"]},{t:"application/vnd.oasis.opendocument.chart-template",e:["otc"]},{t:"application/vnd.oasis.opendocument.database",e:["odb"]},{t:"application/vnd.oasis.opendocument.formula",e:["odf"]},{t:"application/vnd.oasis.opendocument.formula-template",e:["odft"]},{t:"application/vnd.oasis.opendocument.graphics",e:["odg"]},{t:"application/vnd.oasis.opendocument.graphics-template",e:["otg"]},{t:"application/vnd.oasis.opendocument.image",e:["odi"]},{t:"application/vnd.oasis.opendocument.image-template",e:["oti"]},{t:"application/vnd.oasis.opendocument.presentation",e:["odp"]},{t:"application/vnd.oasis.opendocument.presentation-template",e:["otp"]},{t:"application/vnd.oasis.opendocument.spreadsheet",e:["ods"]},{t:"application/vnd.oasis.opendocument.spreadsheet-template",e:["ots"]},{t:"application/vnd.oasis.opendocument.text",e:["odt"]},{t:"application/vnd.oasis.opendocument.text-master",e:["odm"]},{t:"application/vnd.oasis.opendocument.text-template",e:["ott"]},{t:"application/vnd.oasis.opendocument.text-web",e:["oth"]},{t:"application/vnd.olpc-sugar",e:["xo"]},{t:"application/vnd.oma.dd2+xml",e:["dd2"]},{t:"application/vnd.openofficeorg.extension",e:["oxt"]},{t:"application/vnd.openxmlformats-officedocument.presentationml.presentation",e:["pptx"]},{t:"application/vnd.openxmlformats-officedocument.presentationml.slide",e:["sldx"]},{t:"application/vnd.openxmlformats-officedocument.presentationml.slideshow",e:["ppsx"]},{t:"application/vnd.openxmlformats-officedocument.presentationml.template",e:["potx"]},{t:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",e:["xlsx"]},{t:"application/vnd.openxmlformats-officedocument.spreadsheetml.template",e:["xltx"]},{t:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",e:["docx"]},{t:"application/vnd.openxmlformats-officedocument.wordprocessingml.template",e:["dotx"]},{t:"application/vnd.osgeo.mapguide.package",e:["mgp"]},{t:"application/vnd.osgi.dp",e:["dp"]},{t:"application/vnd.osgi.subsystem",e:["esa"]},{t:"application/vnd.palm",e:["pdb","pqa","oprc"]},{t:"application/vnd.pawaafile",e:["paw"]},{t:"application/vnd.pg.format",e:["str"]},{t:"application/vnd.pg.osasli",e:["ei6"]},{t:"application/vnd.picsel",e:["efif"]},{t:"application/vnd.pmi.widget",e:["wg"]},{t:"application/vnd.pocketlearn",e:["plf"]},{t:"application/vnd.powerbuilder6",e:["pbd"]},{t:"application/vnd.previewsystems.box",e:["box"]},{t:"application/vnd.proteus.magazine",e:["mgz"]},{t:"application/vnd.publishare-delta-tree",e:["qps"]},{t:"application/vnd.pvi.ptid1",e:["ptid"]},{t:"application/vnd.quark.quarkxpress",e:["qxd","qxt","qwd","qwt","qxl","qxb"]},{t:"application/vnd.realvnc.bed",e:["bed"]},{t:"application/vnd.recordare.musicxml",e:["mxl"]},{t:"application/vnd.recordare.musicxml+xml",e:["musicxml"]},{t:"application/vnd.rig.cryptonote",e:["cryptonote"]},{t:"application/vnd.rim.cod",e:["cod"]},{t:"application/vnd.rn-realmedia",e:["rm"]},{t:"application/vnd.rn-realmedia-vbr",e:["rmvb"]},{t:"application/vnd.route66.link66+xml",e:["link66"]},{t:"application/vnd.sailingtracker.track",e:["st"]},{t:"application/vnd.seemail",e:["see"]},{t:"application/vnd.sema",e:["sema"]},{t:"application/vnd.semd",e:["semd"]},{t:"application/vnd.semf",e:["semf"]},{t:"application/vnd.shana.informed.formdata",e:["ifm"]},{t:"application/vnd.shana.informed.formtemplate",e:["itp"]},{t:"application/vnd.shana.informed.interchange",e:["iif"]},{t:"application/vnd.shana.informed.package",e:["ipk"]},{t:"application/vnd.simtech-mindmapper",e:["twd","twds"]},{t:"application/vnd.smaf",e:["mmf"]},{t:"application/vnd.smart.teacher",e:["teacher"]},{t:"application/vnd.solent.sdkm+xml",e:["sdkm","sdkd"]},{t:"application/vnd.spotfire.dxp",e:["dxp"]},{t:"application/vnd.spotfire.sfs",e:["sfs"]},{t:"application/vnd.stardivision.calc",e:["sdc"]},{t:"application/vnd.stardivision.draw",e:["sda"]},{t:"application/vnd.stardivision.impress",e:["sdd"]},{t:"application/vnd.stardivision.math",e:["smf"]},{t:"application/vnd.stardivision.writer",e:["sdw","vor"]},{t:"application/vnd.stardivision.writer-global",e:["sgl"]},{t:"application/vnd.stepmania.package",e:["smzip"]},{t:"application/vnd.stepmania.stepchart",e:["sm"]},{t:"application/vnd.sun.xml.calc",e:["sxc"]},{t:"application/vnd.sun.xml.calc.template",e:["stc"]},{t:"application/vnd.sun.xml.draw",e:["sxd"]},{t:"application/vnd.sun.xml.draw.template",e:["std"]},{t:"application/vnd.sun.xml.impress",e:["sxi"]},{t:"application/vnd.sun.xml.impress.template",e:["sti"]},{t:"application/vnd.sun.xml.math",e:["sxm"]},{t:"application/vnd.sun.xml.writer",e:["sxw"]},{t:"application/vnd.sun.xml.writer.global",e:["sxg"]},{t:"application/vnd.sun.xml.writer.template",e:["stw"]},{t:"application/vnd.sus-calendar",e:["sus","susp"]},{t:"application/vnd.svd",e:["svd"]},{t:"application/vnd.symbian.install",e:["sis","sisx"]},{t:"application/vnd.syncml+xml",e:["xsm"]},{t:"application/vnd.syncml.dm+wbxml",e:["bdm"]},{t:"application/vnd.syncml.dm+xml",e:["xdm"]},{t:"application/vnd.tao.intent-module-archive",e:["tao"]},{t:"application/vnd.tcpdump.pcap",e:["pcap","cap","dmp"]},{t:"application/vnd.tmobile-livetv",e:["tmo"]},{t:"application/vnd.trid.tpt",e:["tpt"]},{t:"application/vnd.triscape.mxs",e:["mxs"]},{t:"application/vnd.trueapp",e:["tra"]},{t:"application/vnd.ufdl",e:["ufd","ufdl"]},{t:"application/vnd.uiq.theme",e:["utz"]},{t:"application/vnd.umajin",e:["umj"]},{t:"application/vnd.unity",e:["unityweb"]},{t:"application/vnd.uoml+xml",e:["uoml"]},{t:"application/vnd.vcx",e:["vcx"]},{t:"application/vnd.visio",e:["vsd","vst","vss","vsw"]},{t:"application/vnd.visionary",e:["vis"]},{t:"application/vnd.vsf",e:["vsf"]},{t:"application/vnd.wap.wbxml",e:["wbxml"]},{t:"application/vnd.wap.wmlc",e:["wmlc"]},{t:"application/vnd.wap.wmlscriptc",e:["wmlsc"]},{t:"application/vnd.webturbo",e:["wtb"]},{t:"application/vnd.wolfram.player",e:["nbp"]},{t:"application/vnd.wordperfect",e:["wpd"]},{t:"application/vnd.wqd",e:["wqd"]},{t:"application/vnd.wt.stf",e:["stf"]},{t:"application/vnd.xara",e:["xar"]},{t:"application/vnd.xfdl",e:["xfdl"]},{t:"application/vnd.yamaha.hv-dic",e:["hvd"]},{t:"application/vnd.yamaha.hv-script",e:["hvs"]},{t:"application/vnd.yamaha.hv-voice",e:["hvp"]},{t:"application/vnd.yamaha.openscoreformat",e:["osf"]},{t:"application/vnd.yamaha.openscoreformat.osfpvg+xml",e:["osfpvg"]},{t:"application/vnd.yamaha.smaf-audio",e:["saf"]},{t:"application/vnd.yamaha.smaf-phrase",e:["spf"]},{t:"application/vnd.yellowriver-custom-menu",e:["cmp"]},{t:"application/vnd.zul",e:["zir","zirz"]},{t:"application/vnd.zzazz.deck+xml",e:["zaz"]},{t:"application/voicexml+xml",e:["vxml"]},{t:"application/widget",e:["wgt"]},{t:"application/winhlp",e:["hlp"]},{t:"application/wsdl+xml",e:["wsdl"]},{t:"application/wspolicy+xml",e:["wspolicy"]},{t:"application/x-7z-compressed",e:["7z"]},{t:"application/x-abiword",e:["abw"]},{t:"application/x-ace-compressed",e:["ace"]},{t:"application/x-apple-diskimage",e:["dmg"]},{t:"application/x-authorware-bin",e:["aab","x32","u32","vox"]},{t:"application/x-authorware-map",e:["aam"]},{t:"application/x-authorware-seg",e:["aas"]},{t:"application/x-bcpio",e:["bcpio"]},{t:"application/x-bittorrent",e:["torrent"]},{t:"application/x-blorb",e:["blb","blorb"]},{t:"application/x-bzip",e:["bz"]},{t:"application/x-bzip2",e:["bz2","boz"]},{t:"application/x-cbr",e:["cbr","cba","cbt","cbz","cb7"]},{t:"application/x-cdlink",e:["vcd"]},{t:"application/x-cfs-compressed",e:["cfs"]},{t:"application/x-chat",e:["chat"]},{t:"application/x-chess-pgn",e:["pgn"]},{t:"application/x-conference",e:["nsc"]},{t:"application/x-cpio",e:["cpio"]},{t:"application/x-csh",e:["csh"]},{t:"application/x-debian-package",e:["deb","udeb"]},{t:"application/x-dgc-compressed",e:["dgc"]},{t:"application/x-director",e:["dir","dcr","dxr","cst","cct","cxt","w3d","fgd","swa"]},{t:"application/x-doom",e:["wad"]},{t:"application/x-dtbncx+xml",e:["ncx"]},{t:"application/x-dtbook+xml",e:["dtb"]},{t:"application/x-dtbresource+xml",e:["res"]},{t:"application/x-dvi",e:["dvi"]},{t:"application/x-envoy",e:["evy"]},{t:"application/x-eva",e:["eva"]},{t:"application/x-font-bdf",e:["bdf"]},{t:"application/x-font-ghostscript",e:["gsf"]},{t:"application/x-font-linux-psf",e:["psf"]},{t:"application/x-font-otf",e:["otf"]},{t:"application/x-font-pcf",e:["pcf"]},{t:"application/x-font-snf",e:["snf"]},{t:"application/x-font-ttf",e:["ttf","ttc"]},{t:"application/x-font-type1",e:["pfa","pfb","pfm","afm"]},{t:"application/x-freearc",e:["arc"]},{t:"application/x-futuresplash",e:["spl"]},{t:"application/x-gca-compressed",e:["gca"]},{t:"application/x-glulx",e:["ulx"]},{t:"application/x-gnumeric",e:["gnumeric"]},{t:"application/x-gramps-xml",e:["gramps"]},{t:"application/x-gtar",e:["gtar"]},{t:"application/x-hdf",e:["hdf"]},{t:"application/x-install-instructions",e:["install"]},{t:"application/x-iso9660-image",e:["iso"]},{t:"application/x-java-jnlp-file",e:["jnlp"]},{t:"application/x-latex",e:["latex"]},{t:"application/x-lzh-compressed",e:["lzh","lha"]},{t:"application/x-mie",e:["mie"]},{t:"application/x-mobipocket-ebook",e:["prc","mobi"]},{t:"application/x-ms-application",e:["application"]},{t:"application/x-ms-shortcut",e:["lnk"]},{t:"application/x-ms-wmd",e:["wmd"]},{t:"application/x-ms-wmz",e:["wmz"]},{t:"application/x-ms-xbap",e:["xbap"]},{t:"application/x-msaccess",e:["mdb"]},{t:"application/x-msbinder",e:["obd"]},{t:"application/x-mscardfile",e:["crd"]},{t:"application/x-msclip",e:["clp"]},{t:"application/x-msdownload",e:["exe","dll","com","bat","msi"]},{t:"application/x-msmediaview",e:["mvb","m13","m14"]},{t:"application/x-msmetafile",e:["wmf","wmz","emf","emz"]},{t:"application/x-msmoney",e:["mny"]},{t:"application/x-mspublisher",e:["pub"]},{t:"application/x-msschedule",e:["scd"]},{t:"application/x-msterminal",e:["trm"]},{t:"application/x-mswrite",e:["wri"]},{t:"application/x-netcdf",e:["nc","cdf"]},{t:"application/x-nzb",e:["nzb"]},{t:"application/x-pkcs12",e:["p12","pfx"]},{t:"application/x-pkcs7-certificates",e:["p7b","spc"]},{t:"application/x-pkcs7-certreqresp",e:["p7r"]},{t:"application/x-rar-compressed",e:["rar"]},{t:"application/x-research-info-systems",e:["ris"]},{t:"application/x-sh",e:["sh"]},{t:"application/x-shar",e:["shar"]},{t:"application/x-shockwave-flash",e:["swf"]},{t:"application/x-silverlight-app",e:["xap"]},{t:"application/x-sql",e:["sql"]},{t:"application/x-stuffit",e:["sit"]},{t:"application/x-stuffitx",e:["sitx"]},{t:"application/x-subrip",e:["srt"]},{t:"application/x-sv4cpio",e:["sv4cpio"]},{t:"application/x-sv4crc",e:["sv4crc"]},{t:"application/x-t3vm-image",e:["t3"]},{t:"application/x-tads",e:["gam"]},{t:"application/x-tar",e:["tar"]},{t:"application/x-tcl",e:["tcl"]},{t:"application/x-tex",e:["tex"]},{t:"application/x-tex-tfm",e:["tfm"]},{t:"application/x-texinfo",e:["texinfo","texi"]},{t:"application/x-tgif",e:["obj"]},{t:"application/x-ustar",e:["ustar"]},{t:"application/x-wais-source",e:["src"]},{t:"application/x-x509-ca-cert",e:["der","crt"]},{t:"application/x-xfig",e:["fig"]},{t:"application/x-xliff+xml",e:["xlf"]},{t:"application/x-xpinstall",e:["xpi"]},{t:"application/x-xz",e:["xz"]},{t:"application/x-zmachine",e:["z1","z2","z3","z4","z5","z6","z7","z8"]},{t:"application/xaml+xml",e:["xaml"]},{t:"application/xcap-diff+xml",e:["xdf"]},{t:"application/xenc+xml",e:["xenc"]},{t:"application/xhtml+xml",e:["xhtml","xht"]},{t:"application/xml",e:["xml","xsl"]},{t:"application/xml-dtd",e:["dtd"]},{t:"application/xop+xml",e:["xop"]},{t:"application/xproc+xml",e:["xpl"]},{t:"application/xslt+xml",e:["xslt"]},{t:"application/xspf+xml",e:["xspf"]},{t:"application/xv+xml",e:["mxml","xhvml","xvml","xvm"]},{t:"application/yang",e:["yang"]},{t:"application/yin+xml",e:["yin"]},{t:"application/zip",e:["zip"]},{t:"audio/adpcm",e:["adp"]},{t:"audio/basic",e:["au","snd"]},{t:"audio/midi",e:["mid","midi","kar","rmi"]},{t:"audio/mp4",e:["m4a","mp4a"]},{t:"audio/mpeg",e:["mpga","mp2","mp2a","mp3","m2a","m3a"]},{t:"audio/ogg",e:["oga","ogg","spx"]},{t:"audio/s3m",e:["s3m"]},{t:"audio/silk",e:["sil"]},{t:"audio/vnd.dece.audio",e:["uva","uvva"]},{t:"audio/vnd.digital-winds",e:["eol"]},{t:"audio/vnd.dra",e:["dra"]},{t:"audio/vnd.dts",e:["dts"]},{t:"audio/vnd.dts.hd",e:["dtshd"]},{t:"audio/vnd.lucent.voice",e:["lvp"]},{t:"audio/vnd.ms-playready.media.pya",e:["pya"]},{t:"audio/vnd.nuera.ecelp4800",e:["ecelp4800"]},{t:"audio/vnd.nuera.ecelp7470",e:["ecelp7470"]},{t:"audio/vnd.nuera.ecelp9600",e:["ecelp9600"]},{t:"audio/vnd.rip",e:["rip"]},{t:"audio/webm",e:["weba"]},{t:"audio/x-aac",e:["aac"]},{t:"audio/x-aiff",e:["aif","aiff","aifc"]},{t:"audio/x-caf",e:["caf"]},{t:"audio/x-flac",e:["flac"]},{t:"audio/x-matroska",e:["mka"]},{t:"audio/x-mpegurl",e:["m3u"]},{t:"audio/x-ms-wax",e:["wax"]},{t:"audio/x-ms-wma",e:["wma"]},{t:"audio/x-pn-realaudio",e:["ram","ra"]},{t:"audio/x-pn-realaudio-plugin",e:["rmp"]},{t:"audio/x-wav",e:["wav"]},{t:"audio/xm",e:["xm"]},{t:"chemical/x-cdx",e:["cdx"]},{t:"chemical/x-cif",e:["cif"]},{t:"chemical/x-cmdf",e:["cmdf"]},{t:"chemical/x-cml",e:["cml"]},{t:"chemical/x-csml",e:["csml"]},{t:"chemical/x-xyz",e:["xyz"]},{t:"image/bmp",e:["bmp"]},{t:"image/cgm",e:["cgm"]},{t:"image/g3fax",e:["g3"]},{t:"image/gif",e:["gif"]},{t:"image/ief",e:["ief"]},{t:"image/jpeg",e:["jpeg","jpg","jpe"]},{t:"image/ktx",e:["ktx"]},{t:"image/png",e:["png"]},{t:"image/prs.btif",e:["btif"]},{t:"image/sgi",e:["sgi"]},{t:"image/svg+xml",e:["svg","svgz"]},{t:"image/tiff",e:["tiff","tif"]},{t:"image/vnd.adobe.photoshop",e:["psd"]},{t:"image/vnd.dece.graphic",e:["uvi","uvvi","uvg","uvvg"]},{t:"image/vnd.djvu",e:["djvu","djv"]},{t:"image/vnd.dvb.subtitle",e:["sub"]},{t:"image/vnd.dwg",e:["dwg"]},{t:"image/vnd.dxf",e:["dxf"]},{t:"image/vnd.fastbidsheet",e:["fbs"]},{t:"image/vnd.fpx",e:["fpx"]},{t:"image/vnd.fst",e:["fst"]},{t:"image/vnd.fujixerox.edmics-mmr",e:["mmr"]},{t:"image/vnd.fujixerox.edmics-rlc",e:["rlc"]},{t:"image/vnd.ms-modi",e:["mdi"]},{t:"image/vnd.ms-photo",e:["wdp"]},{t:"image/vnd.net-fpx",e:["npx"]},{t:"image/vnd.wap.wbmp",e:["wbmp"]},{t:"image/vnd.xiff",e:["xif"]},{t:"image/webp",e:["webp"]},{t:"image/x-3ds",e:["3ds"]},{t:"image/x-cmu-raster",e:["ras"]},{t:"image/x-cmx",e:["cmx"]},{t:"image/x-freehand",e:["fh","fhc","fh4","fh5","fh7"]},{t:"image/x-icon",e:["ico"]},{t:"image/x-mrsid-image",e:["sid"]},{t:"image/x-pcx",e:["pcx"]},{t:"image/x-pict",e:["pic","pct"]},{t:"image/x-portable-anymap",e:["pnm"]},{t:"image/x-portable-bitmap",e:["pbm"]},{t:"image/x-portable-graymap",e:["pgm"]},{t:"image/x-portable-pixmap",e:["ppm"]},{t:"image/x-rgb",e:["rgb"]},{t:"image/x-tga",e:["tga"]},{t:"image/x-xbitmap",e:["xbm"]},{t:"image/x-xpixmap",e:["xpm"]},{t:"image/x-xwindowdump",e:["xwd"]},{t:"message/rfc822",e:["eml","mime"]},{t:"model/iges",e:["igs","iges"]},{t:"model/mesh",e:["msh","mesh","silo"]},{t:"model/vnd.collada+xml",e:["dae"]},{t:"model/vnd.dwf",e:["dwf"]},{t:"model/vnd.gdl",e:["gdl"]},{t:"model/vnd.gtw",e:["gtw"]},{t:"model/vnd.mts",e:["mts"]},{t:"model/vnd.vtu",e:["vtu"]},{t:"model/vrml",e:["wrl","vrml"]},{t:"model/x3d+binary",e:["x3db","x3dbz"]},{t:"model/x3d+vrml",e:["x3dv","x3dvz"]},{t:"model/x3d+xml",e:["x3d","x3dz"]},{t:"text/cache-manifest",e:["appcache"]},{t:"text/calendar",e:["ics","ifb"]},{t:"text/css",e:["css"]},{t:"text/csv",e:["csv"]},{t:"text/html",e:["html","htm"]},{t:"text/n3",e:["n3"]},{t:"text/plain",e:["txt","text","conf","def","list","log","in"]},{t:"text/prs.lines.tag",e:["dsc"]},{t:"text/richtext",e:["rtx"]},{t:"text/sgml",e:["sgml","sgm"]},{t:"text/tab-separated-values",e:["tsv"]},{t:"text/troff",e:["t","tr","roff","man","me","ms"]},{t:"text/turtle",e:["ttl"]},{t:"text/uri-list",e:["uri","uris","urls"]},{t:"text/vcard",e:["vcard"]},{t:"text/vnd.curl",e:["curl"]},{t:"text/vnd.curl.dcurl",e:["dcurl"]},{t:"text/vnd.curl.mcurl",e:["mcurl"]},{t:"text/vnd.curl.scurl",e:["scurl"]},{t:"text/vnd.dvb.subtitle",e:["sub"]},{t:"text/vnd.fly",e:["fly"]},{t:"text/vnd.fmi.flexstor",e:["flx"]},{t:"text/vnd.graphviz",e:["gv"]},{t:"text/vnd.in3d.3dml",e:["3dml"]},{t:"text/vnd.in3d.spot",e:["spot"]},{t:"text/vnd.sun.j2me.app-descriptor",e:["jad"]},{t:"text/vnd.wap.wml",e:["wml"]},{t:"text/vnd.wap.wmlscript",e:["wmls"]},{t:"text/x-asm",e:["s","asm"]},{t:"text/x-c",e:["c","cc","cxx","cpp","h","hh","dic"]},{t:"text/x-fortran",e:["f","for","f77","f90"]},{t:"text/x-java-source",e:["java"]},{t:"text/x-nfo",e:["nfo"]},{t:"text/x-opml",e:["opml"]},{t:"text/x-pascal",e:["p","pas"]},{t:"text/x-setext",e:["etx"]},{t:"text/x-sfv",e:["sfv"]},{t:"text/x-uuencode",e:["uu"]},{t:"text/x-vcalendar",e:["vcs"]},{t:"text/x-vcard",e:["vcf"]},{t:"video/3gpp",e:["3gp"]},{t:"video/3gpp2",e:["3g2"]},{t:"video/h261",e:["h261"]},{t:"video/h263",e:["h263"]},{t:"video/h264",e:["h264"]},{t:"video/jpeg",e:["jpgv"]},{t:"video/jpm",e:["jpm","jpgm"]},{t:"video/mj2",e:["mj2","mjp2"]},{t:"video/mp4",e:["mp4","mp4v","mpg4"]},{t:"video/mpeg",e:["mpeg","mpg","mpe","m1v","m2v"]},{t:"video/ogg",e:["ogv"]},{t:"video/quicktime",e:["qt","mov"]},{t:"video/vnd.dece.hd",e:["uvh","uvvh"]},{t:"video/vnd.dece.mobile",e:["uvm","uvvm"]},{t:"video/vnd.dece.pd",e:["uvp","uvvp"]},{t:"video/vnd.dece.sd",e:["uvs","uvvs"]},{t:"video/vnd.dece.video",e:["uvv","uvvv"]},{t:"video/vnd.dvb.file",e:["dvb"]},{t:"video/vnd.fvt",e:["fvt"]},{t:"video/vnd.mpegurl",e:["mxu","m4u"]},{t:"video/vnd.ms-playready.media.pyv",e:["pyv"]},{t:"video/vnd.uvvu.mp4",e:["uvu","uvvu"]},{t:"video/vnd.vivo",e:["viv"]},{t:"video/webm",e:["webm"]},{t:"video/x-f4v",e:["f4v"]},{t:"video/x-fli",e:["fli"]},{t:"video/x-flv",e:["flv"]},{t:"video/x-m4v",e:["m4v"]},{t:"video/x-matroska",e:["mkv","mk3d","mks"]},{t:"video/x-mng",e:["mng"]},{t:"video/x-ms-asf",e:["asf","asx"]},{t:"video/x-ms-vob",e:["vob"]},{t:"video/x-ms-wm",e:["wm"]},{t:"video/x-ms-wmv",e:["wmv"]},{t:"video/x-ms-wmx",e:["wmx"]},{t:"video/x-ms-wvx",e:["wvx"]},{t:"video/x-msvideo",e:["avi"]},{t:"video/x-sgi-movie",e:["movie"]},{t:"video/x-smv",e:["smv"]},{t:"x-conference/x-cooltalk",e:["ice"]}];

const mime = {

	fromFileExtension(ext) {
		ext = ext.toLowerCase();
		for (let i = 0; i < mimeTypes.length; i++) {
			const t = mimeTypes[i];
			if (t.e.indexOf(ext) >= 0) {
				return t.t;
			}
		}
		return null;
	},

	toFileExtension(mimeType) {
		mimeType = mimeType.toLowerCase();
		for (let i = 0; i < mimeTypes.length; i++) {
			const t = mimeTypes[i];
			if (mimeType == t.t) {
				// Return the first file extension that is 3 characters long
				// If none exist return the first one in the list.
				for (let j = 0; j < t.e.length; j++) {
					if (t.e[j].length == 3) return t.e[j];
				}
				return t.e[0];
			}
		}
		return null;
	},

	fromDataUrl(dataUrl) {
		// Example: data:image/jpeg;base64,/9j/4AAQSkZJR.....
		const defaultMime = 'text/plain';
		let p = dataUrl.substr(0, dataUrl.indexOf(',')).split(';');
		let s = p[0];
		s = s.split(':');
		if (s.length <= 1) return defaultMime;
		s = s[1];
		return s.indexOf('/') >= 0 ? s : defaultMime; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
	},

}

module.exports = { mime };
