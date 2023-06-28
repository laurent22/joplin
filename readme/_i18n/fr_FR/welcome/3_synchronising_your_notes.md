# Synchroniser vos notes

Joplin vous permet de synchroniser vos données à l'aide de divers services d'hébergement de fichiers. Les services cloud pris en charge sont les suivants :

## Configuration de la synchronisation Joplin Cloud

[Joplin Cloud](https://joplinapp.org/plans/) est un service Web spécialement conçu pour Joplin. Outre la synchronisation de vos données, il vous permet également de publier une note sur Internet ou de partager un carnet avec vos amis, votre famille ou vos collègues. Joplin Cloud, par rapport à d'autres services, présente également un certain nombre d'améliorations des performances permettant une synchronisation plus rapide.

Pour l'utiliser, rendez-vous dans l'écran de configuration, puis dans la rubrique Synchronisation. Dans la liste des cibles de synchronisation, sélectionnez "Joplin Cloud". Entrez votre e-mail et votre mot de passe, et vous êtes prêt à utiliser Joplin Cloud.

## Configuration de la synchronisation Dropbox

Sélectionnez "Dropbox" comme cible de synchronisation dans l'écran de configuration. Ensuite, pour lancer le processus de synchronisation, cliquez sur le bouton "Synchroniser" dans la barre latérale et suivez les instructions.

## Configuration de la synchronisation Nextcloud

Nextcloud est une solution de cloud pouvant être auto-hébergée. Pour le configurer, accédez à l'écran de configuration et sélectionnez Nextcloud comme cible de synchronisation. Saisissez ensuite l'URL WebDAV (pour l'obtenir, rendez-vous sur votre page Nextcloud, cliquez sur Paramètres dans le coin inférieur gauche de la page et copiez l'URL). Notez qu'il doit s'agir de l'**URL complète**, donc par exemple si vous voulez que les notes soient sous `/Joplin`, l'URL serait quelque chose comme `https://example.com/remote.php/webdav /Joplin` (notez que la partie "/Joplin"). Et **assurez-vous de créer le répertoire "/Joplin" dans Nextcloud**. Définissez enfin le nom d'utilisateur et le mot de passe. Si cela ne fonctionne pas, veuillez [voir cette explication](https://github.com/laurent22/joplin/issues/61#issuecomment-373282608) pour plus de détails.

## Configuration de la synchronisation OneDrive ou WebDAV

OneDrive et WebDAV sont également pris en charge en tant que services de synchronisation. Veuillez consulter [la documentation de synchronisation](https://github.com/laurent22/joplin#synchronisation) pour plus d'informations.

## Utilisation du chiffrement de bout en bout

Joplin prend en charge le chiffrement de bout en bout (E2EE) sur toutes les applications. E2EE est un système où seul le propriétaire des données peut les lire. Il empêche les espions potentiels, y compris les fournisseurs de télécommunications, les fournisseurs d'accès Internet et même les développeurs de Joplin, d'accéder aux données. Veuillez consulter le [tutoriel sur le chiffrement de bout en bout](https://joplinapp.org/e2ee/) pour plus d'informations sur cette fonctionnalité et comment l'activer.