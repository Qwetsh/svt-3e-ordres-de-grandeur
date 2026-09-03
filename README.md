# Ordres de grandeur du monde microscopique

Zoom continu en 3D de **100 nm à 1 mm**, tous les objets dessinés simultanément
à la même échelle réelle. SVT, cycle 4.

Objectif unique : faire percevoir les **ordres de grandeur**. Pas de quiz, pas de
fiches, pas d'encyclopédie. L'élève pince pour zoomer et voit le virus disparaître
pendant que Demodex apparaît.

---

## Utilisation en classe

| Geste | Effet |
|---|---|
| **1 doigt** qui glisse (ou la souris) | faire le tour de l'objet, sur 360° |
| **2 doigts** qui pincent, ou la **molette** | zoomer / dézoomer |
| **double tap** (ou double-clic) | recadrer (vue de face) |
| **▶ Présentation** | voyage automatique du virus au grain de sel, 30 s |
| **points de la mini-carte** | aller directement à un objet |
| **« i » d'une étiquette** | afficher le nom et la catégorie de cet objet |

Sous chaque objet, l'étiquette ne porte **que sa taille** : c'est elle qu'on
compare d'un objet à l'autre, et la frise reste lisible même quand cinq objets
se côtoient. Le nom se lit d'un appui sur le « i » ; celui de l'objet de
l'échelle courante est de toute façon écrit en haut à gauche.

Au clavier, depuis le poste professeur : `+` / `−` pour l'échelle, les flèches
pour tourner, `0` pour recadrer, `espace` pour la présentation.

**Ce qui se passe quand on tourne.** De face, toute la frise est visible : c'est
la comparaison des tailles. En pivotant, les objets voisins s'effacent
progressivement, et de profil il ne reste que celui de l'échelle courante — on
en fait alors le tour, dessus et dessous compris. Le zoom continue de
fonctionner pendant ce temps : en tournant la molette, on passe à l'objet
suivant, qui apparaît à son tour. Un demi-tour complet ramène la frise entière,
vue de l'autre côté.

Les tablettes n'ont besoin du réseau **qu'au premier chargement**. Ensuite
l'application est mise en cache et fonctionne hors ligne, y compris ajoutée à
l'écran d'accueil de l'iPad.

---

## Modifier le contenu scientifique

Tout est dans **`src/donnees.js`**, et uniquement là. C'est le seul fichier à
ouvrir pour changer une taille, ajouter un objet, corriger une source ou
retoucher la bande « limite de l'œil nu ».

Toutes les dimensions y sont en **nanomètres**, sans exception : une seule unité
dans tout le code, donc aucune erreur d'un facteur 1000 possible.

```
1 µm = 1 000 nm       1 mm = 1 000 000 nm
```

Pour ajouter un objet, copier une entrée existante et l'insérer **à sa place dans
l'ordre des tailles croissantes** — le classement sert à répartir automatiquement
les objets devenus minuscules pour qu'ils ne se superposent pas.

Un objet ajouté sans modèle 3D dédié s'affiche sous forme de sphère à sa
couleur : l'application ne casse jamais. Pour lui donner une forme propre,
ajouter un composant dans `src/modeles.jsx` et l'inscrire dans la table `MODELES`.

### Couleurs

`couleurs` code la **catégorie** : c'est ce qui colore les étiquettes, la
mini-carte et les fiches de sources. `couleursRendu`, juste en dessous, permet de
donner à un objet précis sa **couleur réelle** en 3D sans toucher au code
couleur des étiquettes. Deux objets s'en servent, parce que les élèves savent à
quoi ils ressemblent : le globule rouge est rouge, la cellule de la joue est
rosée. Tout objet absent de cette table garde la couleur de sa catégorie.

### Tailles retenues et écarts avec les valeurs de départ

Vérifications faites le 2 septembre 2026, sources dans le fichier de données et
dans le panneau « Sources » de l'application.

| Objet | Retenu | Fourchette réelle |
|---|---|---|
| Virus de la grippe | 100 nm | 80–120 nm |
| Virus de l'herpès | **200 nm** | 155–240 nm (capside seule : ~125 nm) |
| *Staphylococcus epidermidis* | 1 µm | 0,5–1,5 µm |
| *Escherichia coli* | 2 µm × **0,73 µm** | 1–3 µm de long |
| *Candida albicans* | **4 µm** | 2–6 µm |
| Globule rouge | **7,5 µm** | 6,2–8,2 µm |
| Cellule de la joue | 60 µm | 50–100 µm |
| Cheveu | **75 µm** | 17–181 µm |
| *Demodex folliculorum* | 350 µm | 300–400 µm |
| Grain de sel | **400 µm** | 300–600 µm |
| Limite de l'œil nu | **bande 50–100 µm** | pas un seuil net |

En gras, les six valeurs qui diffèrent de la liste initiale. La justification de
chacune est en tête de `src/donnees.js`.

---

## Adresse publique et intégration dans Genially

L'application est en ligne à cette adresse, mise à jour automatiquement à chaque
envoi sur `main` :

**https://qwetsh.github.io/svt-3e-ordres-de-grandeur/**

Pour l'intégrer dans Genially : *Insérer → Autre → Code HTML*, puis coller

```html
<iframe src="https://qwetsh.github.io/svt-3e-ordres-de-grandeur/"
        width="100%" height="100%" style="border:0"
        allow="fullscreen"
        title="Ordres de grandeur du monde microscopique"></iframe>
```

Deux réserves à connaître :

- **Prévoir le cadre le plus grand possible.** L'application dispose les objets
  sur toute la largeur disponible ; dans une vignette étroite, les plus gros se
  recouvrent davantage.
- **Doubler l'iframe d'un lien direct vers l'adresse ci-dessus.** Dans un cadre
  intégré, le pincement à deux doigts est parfois capté par la page qui
  l'héberge, et le hors-ligne ne fonctionne que sur l'application ouverte pour
  elle-même — Genially, lui, exige de toute façon une connexion.

---

## Développement

```bash
npm install
npm run dev       # serveur local
npm run build     # produit dist/, à déposer tel quel sur l'ENT
npm run preview   # vérifier le build avant de le déployer
```

Le build utilise des chemins relatifs : `dist/` fonctionne dans n'importe quel
sous-dossier, sans reconfiguration.

---

## Notes techniques

Trois décisions structurent tout le reste. Elles sont documentées en détail en
tête des fichiers concernés.

**Un seul état d'échelle** (`src/echelle.js`). L'application ne connaît qu'un
nombre, `nmParPixel`. Toute taille à l'écran en découle par une division. Le zoom
n'est jamais additif, uniquement multiplicatif : il est donc logarithmique par
construction, et un pincement produit le même effet à l'échelle du virus qu'à
celle du grain de sel.

**Rien n'est mis à l'échelle sur quatre ordres de grandeur** (`src/modeles.jsx`).
Chaque modèle est construit à l'échelle 1 et redimensionné d'un facteur compris
entre 1 et quelques milliers. Les coordonnées monde restent dans la plage du
viewport, hors de portée des problèmes de précision des flottants 32 bits de
WebGL. Ce qui mesure moins d'un pixel ou déborde largement du cadre n'est pas
rendu du tout — 3 à 5 objets sur 10 sont à l'écran à un instant donné.

**Caméra orthographique** (`src/Scene.jsx`). En perspective, la taille apparente
dépend de la distance : deux objets identiques placés à deux endroits de la
frise paraîtraient de tailles différentes, ce qui détruirait le seul objectif de
l'application. En orthographique, la taille à l'écran ne dépend que de la taille
réelle. On garde le volume, l'ombrage et la rotation ; on perd la fuite des
lignes. La caméra ne se rapproche jamais : elle ne fait que tourner, et c'est la
scène qui est redimensionnée.

**Un seul modèle 3D vient d'un fichier** (`src/assets/demodex.glb`, 1,1 Mo).
Tous les autres objets sont construits en code, à partir de primitives
déformées. L'acarien fait exception : un animal avec une tête, des pattes et une
cuticule ne s'obtient pas par empilement de sphères. Le fichier sculpté d'origine
pesait 80 Mo ; la suite de commandes qui l'a ramené à 1,1 Mo sans différence
visible est écrite en toutes lettres au-dessus du composant `Demodex`, dans
`src/modeles.jsx`. Il est mis en cache par le service worker comme le reste, donc
disponible hors ligne, et s'il venait à manquer l'application bascule d'elle-même
sur un modèle simplifié construit en code.

Deux détails valent d'être connus avant toute modification :

- Le `meta viewport` avec `user-scalable=no` est **indispensable**. Sans lui,
  Safari sur iPad intercepte le pincement pour zoomer la page et la scène ne
  reçoit jamais le geste.
- La bande « limite de l'œil nu » est dessinée à plat, dans le plan de l'écran,
  et non comme un volume horizontal. Un volume, même très mince, présente une
  profondeur qui se projette : vu sous un angle, un trait de 2 px deviendrait un
  ruban de 100 px recouvrant la scène.
