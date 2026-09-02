/**
 * ============================================================================
 *  FICHIER DE DONNÉES — c'est le SEUL fichier à modifier pour changer le
 *  contenu scientifique de l'application.
 * ============================================================================
 *
 *  Toutes les dimensions sont exprimées en NANOMÈTRES (nm), sans exception.
 *  C'est volontaire : une seule unité dans tout le code, aucune conversion
 *  cachée, donc aucune erreur d'un facteur 1000 possible.
 *
 *      1 µm = 1 000 nm
 *      1 mm = 1 000 000 nm
 *
 *  ---------------------------------------------------------------------------
 *  CHAMPS DE CHAQUE OBJET
 *  ---------------------------------------------------------------------------
 *  id           identifiant interne, doit être unique (sert à choisir le modèle 3D)
 *  nom          nom affiché à l'écran, en gros
 *  sousTitre    précision affichée en petit sous le nom (peut être vide)
 *  categorie    'virus' | 'bacterie' | 'levure' | 'cellule' | 'animal' | 'repere'
 *               → détermine la couleur ET le classement vivant / non vivant
 *  longueurNm   plus grande dimension. C'EST ELLE qui pilote la taille à l'écran.
 *  largeurNm    deuxième dimension (sert aux proportions du modèle 3D)
 *  epaisseurNm  troisième dimension (sert aux proportions du modèle 3D)
 *  fourchette   texte affiché en classe : dit honnêtement la variabilité réelle
 *  decalageX    ajustement fin de la position sur la frise, en fraction de la
 *               largeur d'écran. Sert à séparer deux objets de tailles trop
 *               proches qui se chevaucheraient au moment où ils entrent en
 *               scène. 0 = pas d'ajustement. Négatif = vers la gauche.
 *               N'agit QUE tant que l'objet est encore trop grand pour le
 *               cadre. Une fois devenu minuscule, il rejoint une voie de
 *               stationnement calculée automatiquement d'après son rang dans
 *               cette liste : garder les objets classés par taille croissante
 *               suffit à ce que deux voisins ne se superposent jamais.
 *  z            décalage en profondeur, exprimé en MULTIPLES DE LA TAILLE DE
 *               L'OBJET (et non en pixels : un décalage fixe décollerait les
 *               petits objets de la ligne de base dès qu'on incline la vue).
 *               La caméra étant ORTHOGRAPHIQUE, ce décalage ne change PAS la
 *               taille apparente : il ne sert qu'à créer du relief et de la
 *               parallaxe quand on tourne autour. Valeurs raisonnables : −1 à 1.
 *  source       { texte, url } — une source par ligne, affichée dans le
 *               panneau « Sources » de l'application.
 *  note         commentaire pédagogique optionnel, affiché dans le panneau.
 *
 *  ---------------------------------------------------------------------------
 *  ÉCARTS PAR RAPPORT À LA LISTE DE DÉPART (vérification faite le 02/09/2026)
 *  ---------------------------------------------------------------------------
 *  herpès    180 nm → 200 nm   (le virion enveloppé fait ~155–240 nm ;
 *                               la capside seule, elle, fait ~125 nm)
 *  E. coli   largeur ajoutée   (~0,73 µm mesuré, et non 0,5 µm)
 *  Candida     5 µm → 4 µm     (les levures publiées sont à 2–6 µm)
 *  globule     7 µm → 7,5 µm   (fourchette réelle 6,2–8,2 µm)
 *  cheveu     70 µm → 75 µm    (moyenne réelle ; l'étendue va de 17 à 181 µm)
 *  sel       500 µm → 400 µm   (le sel de table courant est plutôt à 300–600 µm)
 * ============================================================================
 */

export const NM_PAR_UM = 1000
export const NM_PAR_MM = 1000000

export const objets = [
  {
    id: 'grippe',
    nom: 'Virus de la grippe',
    sousTitre: 'Influenza A',
    categorie: 'virus',
    longueurNm: 100,
    largeurNm: 100,
    epaisseurNm: 100,
    fourchette: '80 à 120 nm',
    decalageX: -0.18,
    z: -0.55,
    source: {
      texte: "Vijayakrishnan et al., Structure (2022) — analyse quantitative du virion grippal par cryo-tomographie : particules sphériques de 80 à 120 nm de diamètre.",
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9610019/',
    },
    note: "Les souches cliniques produisent aussi des formes filamenteuses qui peuvent atteindre 20 µm. On ne représente ici que la forme sphérique, la plus courante en laboratoire.",
  },
  {
    id: 'herpes',
    nom: "Virus de l'herpès",
    sousTitre: 'Herpes simplex, virion complet',
    categorie: 'virus',
    longueurNm: 200,
    largeurNm: 200,
    epaisseurNm: 200,
    fourchette: '155 à 240 nm',
    decalageX: 0.16,
    z: 0.5,
    source: {
      texte: "Encyclopædia Britannica, « Herpesvirus » — virions d'environ 150 à 200 nm de diamètre ; le virion enveloppé atteint ~220 nm, la capside seule ~125 nm.",
      url: 'https://www.britannica.com/science/herpesvirus',
    },
    note: "Attention au piège classique : selon qu'on mesure la capside nue (~125 nm) ou le virion enveloppé complet (~200 nm), le chiffre double. Ici on montre le virion complet, avec son enveloppe.",
  },
  {
    id: 'staph',
    nom: 'Staphylocoque blanc',
    sousTitre: 'Staphylococcus epidermidis',
    categorie: 'bacterie',
    longueurNm: 1000,
    largeurNm: 1000,
    epaisseurNm: 1000,
    fourchette: '0,5 à 1,5 µm',
    decalageX: -0.1,
    z: -0.6,
    source: {
      texte: "Otto M., Nature Reviews Microbiology (2009) — Staphylococcus epidermidis, coque de 0,5 à 1,5 µm de diamètre, groupée en amas.",
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2807625/',
    },
    note: "Bactérie normalement présente sur la peau de tout le monde : c'est un bon exemple de micro-organisme du microbiote, ni dangereux ni sale.",
  },
  {
    id: 'ecoli',
    nom: 'Escherichia coli',
    sousTitre: 'bactérie intestinale',
    categorie: 'bacterie',
    longueurNm: 2000,
    largeurNm: 730,
    epaisseurNm: 730,
    fourchette: '1 à 3 µm de long, ~0,7 µm de large',
    decalageX: 0.14,
    z: 0.45,
    source: {
      texte: "BioNumbers BNID 111686 (Guet et al., Nucleic Acids Research, 2008) — largeur moyenne mesurée d'E. coli : 0,73 µm.",
      url: 'https://bionumbers.hms.harvard.edu/bionumber.aspx?s=n&v=0&id=111686',
    },
    note: "La largeur retenue (0,73 µm) est une mesure publiée, plus fiable que le « 0,5 µm » des manuels.",
  },
  {
    id: 'candida',
    nom: 'Candida albicans',
    sousTitre: 'levure, forme bourgeonnante',
    categorie: 'levure',
    longueurNm: 4000,
    largeurNm: 3000,
    epaisseurNm: 3000,
    fourchette: '2 à 6 µm',
    decalageX: -0.12,
    z: -0.5,
    source: {
      texte: "Microbe Notes, « Candida albicans » (synthèse de la littérature mycologique) — cellules levures ovales de 2 à 4 µm de diamètre ; les blastoconidies publiées vont jusqu'à 6 µm.",
      url: 'https://microbenotes.com/candida-albicans/',
    },
    note: "Candida change de forme : levure ronde, ou filaments (hyphes) beaucoup plus longs. On représente la forme levure, qui est celle qu'on observe au microscope en classe.",
  },
  {
    id: 'globule',
    nom: 'Globule rouge',
    sousTitre: 'hématie humaine',
    categorie: 'cellule',
    longueurNm: 7500,
    largeurNm: 7500,
    epaisseurNm: 2200,
    fourchette: '6,2 à 8,2 µm de diamètre',
    decalageX: 0.15,
    z: 0.55,
    source: {
      texte: "BioNumbers BNID 100798 — diamètre du globule rouge humain : 6,2 à 8,2 µm ; épaisseur au bord 2 à 2,5 µm, au centre 0,8 à 1 µm.",
      url: 'https://bionumbers.hms.harvard.edu/bionumber.aspx?id=100798&ver=1',
    },
    note: "Sa forme en disque creusé au centre (biconcave) est reproduite fidèlement : c'est ce qui lui permet de se déformer pour passer dans les plus fins capillaires.",
  },
  {
    id: 'cellulejoue',
    nom: 'Cellule de la joue',
    sousTitre: 'cellule épithéliale buccale',
    categorie: 'cellule',
    longueurNm: 60000,
    largeurNm: 55000,
    epaisseurNm: 3000,
    fourchette: '50 à 100 µm',
    decalageX: -0.14,
    z: -0.45,
    source: {
      texte: "Acadia University, protocole de TP « Human cheek epithelial cells » — cellules squameuses de 50 à 100 µm, noyau d'environ 10 µm.",
      url: 'http://plato.acadiau.ca/courses/biol/reekie/1113/SCOPES/CHEEK.HTM',
    },
    note: "C'est la cellule que les élèves observent eux-mêmes au microscope. Elle est très plate : 60 µm de large mais seulement 3 µm d'épaisseur. Tournez la scène pour le voir.",
  },
  {
    id: 'cheveu',
    nom: 'Cheveu',
    sousTitre: 'épaisseur d’un cheveu humain',
    categorie: 'repere',
    longueurNm: 75000,
    largeurNm: 75000,
    epaisseurNm: 75000,
    fourchette: '17 à 181 µm ; la plupart entre 50 et 100 µm',
    decalageX: 0.17,
    z: 0.6,
    source: {
      texte: "Ley B., The Physics Factbook (compilation de sources mesurées) — diamètre du cheveu humain de 17 à 181 µm, moyenne autour de 75 µm.",
      url: 'https://hypertextbook.com/facts/1999/BrianLey.shtml',
    },
    note: "Repère, pas un micro-organisme. C'est ici la seule dimension qui compte : l'ÉPAISSEUR. La longueur du cheveu sort de l'écran, ce qui est normal.",
  },
  {
    id: 'demodex',
    nom: 'Demodex folliculorum',
    sousTitre: 'acarien des follicules pileux',
    categorie: 'animal',
    longueurNm: 350000,
    largeurNm: 45000,
    epaisseurNm: 45000,
    fourchette: '300 à 400 µm de long',
    // Décalage réduit (il valait −0,13) : à son échelle, l'acarien vient sinon
    // se poser en plein sur le cheveu déjà stationné à gauche, et son corps en
    // est coupé en deux. Reste assez négatif pour ne pas percuter le grain de
    // sel, qui entre en scène presque en même temps.
    decalageX: -0.06,
    z: -0.5,
    source: {
      texte: "DermNet NZ, « Demodex, demodicosis » — Demodex folliculorum adulte : 0,3 à 0,4 mm de long ; D. brevis, plus court, 0,15 à 0,2 mm.",
      url: 'https://dermnetnz.org/topics/demodex',
    },
    note: "Un animal à huit pattes qui vit dans les follicules des cils et du visage de presque tous les adultes. Il est juste sous la limite de l'œil nu : c'est l'objet le plus frappant de la séance.",
  },
  {
    id: 'sel',
    nom: 'Grain de sel',
    sousTitre: 'cristal de sel de table',
    categorie: 'repere',
    longueurNm: 400000,
    largeurNm: 400000,
    epaisseurNm: 400000,
    fourchette: '300 à 600 µm',
    decalageX: 0.15,
    z: 0.5,
    source: {
      texte: "Sympatec GmbH, note d'application « Salts » — le sel de table courant présente une taille de particule moyenne d'environ 300 µm, le sel gemme dépassant 700 µm.",
      url: 'https://www.sympatec.com/en/applications/salts',
    },
    note: "Repère, pas un micro-organisme. Cristal cubique, bien visible à l'œil nu : c'est le point d'arrivée du voyage.",
  },
]

/**
 * La bande « limite de l'œil nu ».
 *
 * Il n'existe pas UNE valeur : la littérature donne 0,1 mm (100 µm) comme
 * seuil de visibilité courant, alors qu'un œil excellent distingue encore un
 * fil de 40 µm dans de bonnes conditions. On affiche donc une BANDE, pas un
 * trait — c'est plus honnête, et c'est un bon point de discussion en classe.
 */
export const limiteOeilNu = {
  basNm: 50000, //  50 µm — un très bon œil, conditions favorables
  hautNm: 100000, // 100 µm — le seuil communément retenu
  libelle: "Limite de l'œil nu",
  source: {
    texte: "BBC Science Focus, « How small can the naked eye see? » — l'œil nu détecte des objets d'environ 0,1 mm ; dans de bonnes conditions un fil de 0,04 mm reste perceptible.",
    url: 'https://www.sciencefocus.com/the-human-body/how-small-can-the-naked-eye-see',
  },
}

/**
 * Bornes du zoom, en nanomètres par pixel.
 * Volontairement un peu plus larges que la plage 100 nm – 1 mm demandée, pour
 * que le virus soit encore franchement visible tout en bas et que le grain de
 * sel puisse déborder de l'écran tout en haut.
 */
export const bornesZoom = {
  // Rappel du sens : nmParPixel PETIT = très zoomé (un pixel ne couvre presque
  // rien) ; nmParPixel GRAND = très dézoomé (un pixel couvre beaucoup).
  //
  //   0,15 nm/px → un écran de 800 px de haut couvre 120 nm : le virus de la
  //                grippe remplit 83 % de la hauteur.
  //   2500 nm/px → un écran de 1400 px de large couvre 3,5 mm : le grain de sel
  //                et le monde visible tiennent largement dedans.
  //
  // Soit 4,2 ordres de grandeur, pour 3,6 réellement occupés par les objets :
  // il reste une marge de respiration à chaque extrémité.
  minNmParPixel: 0.15,
  maxNmParPixel: 2500,
}

/** Couleurs par catégorie. Modifiables librement. */
export const couleurs = {
  virus: '#d9534f',
  bacterie: '#e8a33d',
  levure: '#7fb069',
  cellule: '#4a90d9',
  animal: '#9b6bb5',
  repere: '#8b93a1',
}

/**
 * Couleurs de RENDU 3D, objet par objet.
 *
 * `couleurs` ci-dessus code la CATÉGORIE : c'est ce qui colore les étiquettes,
 * la mini-carte et les fiches de sources. Par défaut le modèle 3D reprend cette
 * couleur, et c'est très bien pour un virus ou une bactérie, dont personne ne
 * connaît la « vraie » couleur.
 *
 * Deux objets font exception, parce que les élèves savent à quoi ils
 * ressemblent : un globule rouge est rouge, une cellule de la joue est rosée et
 * presque transparente. Les afficher dans le bleu de la catégorie « cellule
 * humaine » désoriente plus que ça n'informe. Ces deux-là sont donc rendus dans
 * leur couleur réelle, tandis que leur étiquette reste bleue et continue
 * d'indiquer la catégorie : les deux informations sont portées, chacune à sa
 * place.
 *
 * Tout objet absent de cette liste utilise simplement la couleur de sa catégorie.
 */
export const couleursRendu = {
  globule: '#c0353a', //  rouge de l'hémoglobine oxygénée
  cellulejoue: '#f0a08c', //  rose chair franc : le modèle étant translucide sur
  //  un fond presque noir, une teinte pâle ressortirait grise et terne
}

/** Couleur du noyau de la cellule de la joue (contraste avec le cytoplasme rosé). */
export const couleurNoyau = '#7a3a68'

/** Libellés affichés sur l'étiquette pour distinguer vivant / non vivant. */
export const libellesCategorie = {
  virus: 'virus',
  bacterie: 'bactérie',
  levure: 'levure (champignon)',
  cellule: 'cellule humaine',
  animal: 'animal',
  repere: 'repère — non vivant',
}
