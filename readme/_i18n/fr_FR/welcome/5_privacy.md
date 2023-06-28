# Politique de confidentialité

Les applications Joplin, y compris les applications Android, iOS, Windows, macOS et Linux, n'envoient aucune donnée à aucun service sans votre autorisation. Toutes les données enregistrées par Joplin, telles que les notes ou les images, sont enregistrées sur votre propre appareil et vous êtes libre de supprimer ces données à tout moment.

Si vous choisissez de synchroniser avec un tiers, tel que OneDrive ou Dropbox, les notes seront envoyées à ce compte, auquel cas la politique de confidentialité du tiers s'applique.

Afin de fournir certaines fonctionnalités, Joplin peut avoir besoin de se connecter à des services tiers. Vous pouvez désactiver la plupart de ces fonctionnalités dans les paramètres de l'application :

| Caractéristique | Descriptif | Par défaut | Peut être désactivé |
| -------- | -------------- | -------- | --- |
| Mise à jour automatique | Joplin se connecte périodiquement à GitHub pour vérifier les nouvelles versions. | Activé | Oui |
| Géolocalisation | Joplin enregistre les informations de géolocalisation dans les propriétés de la note lorsque vous créez une note. | Activé | Oui |
| Synchronisation | Joplin prend en charge la synchronisation de vos notes sur plusieurs appareils. Si vous choisissez de synchroniser avec un tiers, tel que OneDrive, les notes seront envoyées à votre compte OneDrive, auquel cas la politique de confidentialité du tiers s'applique. | Désactivé | Oui |
| Vérification de la connexion Wifi | Sur mobile, Joplin vérifie la connectivité Wifi pour donner la possibilité de synchroniser les données uniquement lorsque le Wifi est activé. | Activé | Non <sup>(1)</sup> |
| Dictionnaire correcteur orthographique | Sous Linux et Windows, l'application de bureau télécharge le dictionnaire du correcteur orthographique à partir de `redirector.gvt1.com`. | Activé | Oui <sup>(2)</sup> |
| Référentiel de plugins | L'application de bureau télécharge la liste des plugins disponibles depuis le [référentiel GitHub officiel](https://github.com/joplin/plugins). Si ce référentiel n'est pas accessible (par exemple en Chine), l'application essaiera d'obtenir la liste des plugins à partir de [divers miroirs](https://github.com/laurent22/joplin/blob/8ac6017c02017b6efd59f5fcab7e0b07f8d44164/packages/lib/services/plugins/RepositoryApi.ts#L22), auquel cas l'écran du plugin [fonctionne légèrement différemment](https://github.com/laurent22/joplin/issues/5161#issuecomment-925226975). | Activé | Non

<sup>(1) https://github.com/laurent22/joplin/issues/5705</sup><br/>
<sup>(2) Si le correcteur orthographique est désactivé, [il ne téléchargera pas le dictionnaire](https://discourse.joplinapp.org/t/new-version-of-joplin-contacting-google-servers-on-startup/23000/40?u=laurent).</sup>

Pour toute question concernant la politique de confidentialité de Joplin, merci de laisser un message [sur le forum](https://discourse.joplinapp.org/).