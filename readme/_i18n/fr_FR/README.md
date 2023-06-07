<!-- DONATELINKS -->
[! [Faire un don via PayPal] (https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Donate-PayPal-green.svg)](https://www.paypal.com/donate/?business=E8JMYD2LQ8MMA&no_recurring=0&item_name=I+rely+on+donations+to+maintain+and+improve+the+Joplin+open+source+project.+Thank+you+for+your+help+-+it+makes+a+difference%21&currency_code=EUR) [! [Sponsor sur GitHub] (https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/GitHub-Badge.svg)](https://github.com/sponsors/laurent22/) [! [Devenez mécène] (https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Patreon-Badge.svg)](https://www.patreon.com/joplin) [! [Faire un don en utilisant un IBAN] (https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Donate-IBAN.svg)](https://joplinapp.org/donate/#donations)
<!-- DONATELINKS -->

* * * 
**TEST ONLY**
* * *

[test link](/spec/e2ee)

<img width="64" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/LinuxIcons/256x256.png" align="left" />**Joplin** est une application gratuite et open source de prise de notes et de tâches, qui peut gérer un grand nombre de notes organisées dans des carnets de notes. Les notes sont consultables, peuvent être copiées, balisées et modifiées directement depuis les applications ou depuis votre propre éditeur de texte. Les notes sont au format [Markdown] (#markdown).

Les notes exportées depuis Evernote [peuvent être importées] (#importing) dans Joplin, y compris le contenu formaté (qui est converti en Markdown), les ressources (images, pièces jointes, etc.) et les métadonnées complètes (géolocalisation, heure de mise à jour, heure de création, etc.). Les fichiers Markdown simples peuvent également être importés.

Les notes peuvent être [synchronisées] (#synchronisation) en toute sécurité à l'aide du [chiffrement de bout en bout] (#encryption) avec divers services cloud, notamment Nextcloud, Dropbox, OneDrive et [Joplin Cloud] (https://joplinapp.org/plans/).

La recherche en texte intégral est disponible sur toutes les plateformes pour trouver rapidement les informations dont vous avez besoin. L'application peut être personnalisée à l'aide de plugins et de thèmes, et vous pouvez également créer facilement le vôtre.

L'application est disponible pour Windows, Linux, macOS, Android et iOS. Un [Web Clipper] (https://github.com/laurent22/joplin/blob/dev/readme/clipper.md), qui permet d'enregistrer des pages Web et des captures d'écran depuis votre navigateur, est également disponible pour [Firefox] (https://addons.mozilla.org/firefox/addon/joplin-web-clipper/) et [Chrome] (https://chrome.google.com/webstore/detail/joplin-web-clipper/alofnhikmmkdbbbgpnglcpdollgjjfek?hl=en-GB).

<div class="top-screenshot"></div><img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/home-top-img.png" style="max-width: 100%; max-height: 35em;">

# Installation

Trois types d'applications sont disponibles : pour **bureau** (Windows, macOS et Linux), pour **mobile** (Android et iOS) et pour **terminal** (Windows, macOS, Linux et FreeBSD). Toutes les applications disposent d'interfaces utilisateur similaires et peuvent se synchroniser entre elles.

## Applications de bureau

Système d'exploitation | Télécharger
---|---
Windows (32 et 64 bits) | <a href='https://github.com/laurent22/joplin/releases/download/v2.9.17/Joplin-Setup-2.9.17.exe'><img alt='Get it on Windows' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeWindows.png'/></a>
MacOS | <a href='https://github.com/laurent22/joplin/releases/download/v2.9.17/Joplin-2.9.17.dmg'><img alt='Get it on macOS' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeMacOS.png'/></a>
Linux | <a href='https://github.com/laurent22/joplin/releases/download/v2.9.17/Joplin-2.9.17.AppImage'><img alt='Get it on Linux' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeLinux.png'/></a>

<a href='https://github.com/laurent22/joplin/releases/download/v2.9.17/JoplinPortable.exe'>**Sous Windows**, vous pouvez également utiliser la version portable.</a> L' [application portable] (https://en.wikipedia.org/wiki/Portable_application) permet d'installer le logiciel sur un appareil portable tel qu'une clé USB. Copiez simplement le fichier JoplinPortable.exe dans n'importe quel répertoire de cette clé USB ; l'application créera alors un répertoire appelé « JoplinProfile » à côté du fichier exécutable.

**Sous Linux**, la méthode recommandée est d'utiliser le script d'installation suivant car il gérera également l'icône du bureau :

<pre><code style="word-break: break-all">wget -O - https://raw.githubusercontent.com/laurent22/joplin/dev/Joplin_install_and_update.sh | bash</code></pre>

## Applications mobiles

Système d'exploitation | Télécharger | Alt. Télécharger
---|---|---
Android | <a href='https://play.google.com/store/apps/details?id=net.cozic.joplin&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeAndroid.png'/></a>| ou téléchargez le fichier APK : [64 bits] (https://github.com/laurent22/joplin-android/releases/download/android-v2.9.8/joplin-v2.9.8.apk) [32 bits] ( https://github.com/laurent22/joplin-android/releases/download/android-v2.9.8/joplin-v2.9.8-32bit.apk)
iOS | <a href='https://itunes.apple.com/us/app/joplin/id1315599797'><img alt='Get it on the App Store' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeIOS.png'/></a>| -

## Application du terminal

Système d'exploitation | Méthode
-----------------|----------------
macOS, Linux ou Windows (via [WSL] (https://msdn.microsoft.com/en-us/commandline/wsl/faq?f=255&MSPPError=-2147217396)) | **Important :** Tout d'abord, [installez Node 12+] (https://nodejs.org/en/download/package-manager/). <br/><br/><br><br>`NPM_CONFIG_PREFIX=~/.joplin-bin npm install -g joplin` `sudo ln -s ~/.joplin-bin/bin/joplin /usr/bin/joplin `Par défaut, le binaire de l'application sera installé sous <br/> `~/.joplin-bin`. Vous pouvez modifier ce répertoire si nécessaire. Sinon, si vos autorisations npm sont configurées comme décrit [ici] (https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory) (Option 2), il suffit d'exécuter `npm -g install joplin`.

Pour le démarrer, tapez `joplin`.

Pour des informations d'utilisation, veuillez consulter la [Documentation complète de l'application Joplin Terminal] (https://joplinapp.org/terminal/).

## Web Clipper

Le Web Clipper est une extension de navigateur qui vous permet d'enregistrer des pages Web et des captures d'écran à partir de votre navigateur. Pour plus d'informations sur son installation et son utilisation, consultez la [Page d'aide de Web Clipper] (https://github.com/laurent22/joplin/blob/dev/readme/clipper.md).

## Distributions alternatives non officielles

Il existe un certain nombre de distributions alternatives non officielles de Joplin. Si vous ne voulez pas ou ne pouvez pas utiliser appimages ou l'une des autres versions officiellement prises en charge, vous pouvez envisager de les utiliser.

Cependant, ils sont assortis d'une mise en garde dans la mesure où ils ne sont pas officiellement pris en charge, de sorte que certains problèmes peuvent ne pas être pris en charge par le projet principal. Les demandes d'assistance, les rapports de bogues et les conseils généraux devraient plutôt être adressés aux responsables de ces distributions.

Une liste de ces distributions gérée par la communauté est disponible ici : [Distributions Joplin non officielles] (https://discourse.joplinapp.org/t/unofficial-alternative-joplin-distributions/23703)

# Sponsors

<!-- SPONSORS-ORG -->
</a><a href="https://seirei.ne.jp"><img title="Serei Network" width="256" src="https://joplinapp.org/images/sponsors/SeireiNetwork.png"/><a href="https://www.hosting.de/nextcloud/?mtm_campaign=managed-nextcloud&mtm_kwd=joplinapp&mtm_source=joplinapp-webseite&mtm_medium=banner"><img title="Hosting.de" width="256" src="https://joplinapp.org/images/sponsors/HostingDe.png"/></a><a href="https://residence-greece.com/"><img title="Greece Golden Visa" width="256" src="https://joplinapp.org/images/sponsors/ResidenceGreece.jpg"/></a> <a href="https://grundstueckspreise.info/"><img title="SP Software GmbH" width="256" src="https://joplinapp.org/images/sponsors/Grundstueckspreise.png"/></a>
<!-- SPONSORS-ORG -->
