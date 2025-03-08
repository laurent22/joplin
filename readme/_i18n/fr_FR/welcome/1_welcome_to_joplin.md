# Bienvenue dans Joplin !

Joplin est une application gratuite et open source de prise de notes, qui vous aide à rédiger et à organiser vos notes, et à les synchroniser entre vos appareils. Les notes sont consultables, peuvent être copiées, étiquetées et modifiées directement depuis l'application ou depuis votre propre éditeur de texte. Les notes sont au [format Markdown](https://joplinapp.org/help/apps/markdown). Joplin est disponible en tant qu'application de **bureau**, **mobile** et **terminal**.

Les notes de ce carnet donnent un aperçu de ce que Joplin peut faire et comment l'utiliser. En général, les trois applications partagent à peu près les mêmes fonctionnalités ; toute différence sera clairement indiquée.

![](./AllClients.png)

## Joplin est divisé en trois parties

Joplin a trois colonnes principales :

- La **barre latérale** contient la liste de vos carnets et étiquettes, ainsi que l'état de la synchronisation.

- La **liste de notes** contient la liste actuelle des notes - soit les notes du bloc-notes actuellement sélectionné, les notes de l'étiquette actuellement sélectionnée ou les résultats de la recherche.

- L'**éditeur de notes** est là où vous écrivez vos notes. Il existe un **éditeur de texte enrichi** et un **éditeur Markdown** - cliquez sur le bouton **Basculer l'éditeur** dans le coin supérieur droit pour basculer entre les deux ! Vous pouvez également utiliser un [éditeur externe](https://joplinapp.org/help/apps/external_text_editor) pour modifier les notes. Par exemple, vous pouvez utiliser Typora comme éditeur externe et il affichera la note ainsi que toutes les images intégrées.

## Écrire des notes en Markdown

Markdown est un langage de balisage léger. Joplin prend en charge une [syntaxe Markdown à saveur Github](https://joplinapp.org/help/apps/markdown) avec quelques variantes et ajouts.

En général, bien que Markdown soit un langage de balisage, il lisible directement. Ceci est un exemple simple (vous pouvez voir à quoi il ressemble dans le panneau de visualisation) :

* * *

# En-tête

## Sous-titre

Les paragraphes sont séparés par une ligne blanche. Les attributs de texte _italique_, **gras** et `monospace` sont pris en charge. Vous pouvez créer des listes à puces :

* pommes
* des oranges
* des poires

Ou des listes numérotées :

1. laver
2. rincer
3. répéter

Ceci est un [lien](https://joplinapp.org) et, enfin, ci-dessous est une règle horizontale :

* * *

Beaucoup plus est possible, y compris l'ajout d'exemples de code informatique, de formules mathématiques ou de listes de cases à cocher - voir la [documentation Markdown](https://joplinapp.org/help/apps/markdown) pour plus d'informations.

## Organiser vos notes

### Avec des carnets

Les notes de Joplin sont organisées en une arborescence de carnets et de sous-carnets.

- Sur l'appli de **bureau**, vous pouvez créer un carnet en cliquant sur "Nouveau carnet", puis vous pouvez les organiser à votre guise en les faisant glisser-déposer dans d'autres carnets ou en cliquant droit et sélectionnant "Déplacer vers le carnet". Vous pouvez également déplacer un sous-carnet vers la racine en le faisant glisser sur l'intitulé "Carnets".
- Sur **mobile**, appuyez sur l'icône "+" et sélectionnez "Nouveau carnet".
- Sur le **terminal**, appuyez sur `:mn`

![](./SubNotebooks.png)

### Avec des étiquettes

La deuxième façon d'organiser vos notes consiste à utiliser des étiquettes :

- Sur **bureau**, faites un clic droit sur n'importe quelle note dans la liste des notes et sélectionnez "Modifier les étiquettes". Vous pouvez ensuite ajouter les étiquettes en les séparant par des virgules.
- Sur **mobile**, ouvrez la note et appuyez sur le bouton "⋮" et sélectionnez "étiquettes".
- Sur le **terminal**, tapez `:help tag` pour les commandes disponibles.
