/**
 * ============================================================================
 *  CŒUR DE L'APPLICATION — la gestion de l'échelle.
 * ============================================================================
 *
 *  RÈGLE ABSOLUE, à ne jamais contourner :
 *
 *      il n'existe qu'UN SEUL état d'échelle dans toute l'application,
 *      c'est `nmParPixel` — combien de nanomètres représente un pixel écran.
 *
 *  Toute taille à l'écran s'en déduit par une simple division :
 *
 *      taillePx = tailleNm / nmParPixel
 *
 *  Ce que l'on ne fait JAMAIS :
 *   - empiler des transformations d'échelle sur 4 ordres de grandeur ;
 *   - laisser des coordonnées monde dépasser quelques milliers d'unités.
 *
 *  En 3D, cette règle est encore plus critique qu'en 2D : WebGL travaille en
 *  flottants 32 bits. Une scène qui s'étendrait sur 4 ordres de grandeur
 *  produirait du z-fighting et des géométries qui tremblent. Ici, la caméra ne
 *  se déplace jamais en distance — elle ne fait que tourner — et c'est la
 *  scène qui est redimensionnée à chaque image. Résultat : les coordonnées
 *  monde restent en permanence dans la plage du viewport, quelques milliers
 *  d'unités au maximum.
 *
 *  CONVENTION : 1 unité monde = 1 pixel CSS. La caméra étant orthographique et
 *  cadrée exactement sur le viewport, cette équivalence est exacte, ce qui
 *  rend tous les calculs directement lisibles.
 */

import { bornesZoom } from './donnees.js'

/** Fraction de la hauteur d'écran occupée par un objet « à son échelle ». */
export const FRACTION_ECRAN_FOCUS = 0.38

/**
 * Distance de « stationnement » des objets devenus trop petits, en fraction de
 * la largeur du viewport. Voir positionXFrise pour le raisonnement.
 */
const PARKING = 0.42

/** Raideur de l'approche vers la position de stationnement. */
const RAIDEUR_PARKING = 3

/**
 * Écartement entre deux voies de stationnement, en fraction de la largeur.
 *
 * Tous les objets devenus minuscules convergent vers la même zone à gauche du
 * cadre : sans voies, ils s'empileraient exactement au même point et l'on n'en
 * verrait plus qu'un. On les répartit sur quatre voies selon leur rang dans le
 * fichier de données — les objets de tailles voisines s'y suivent, ils
 * atterrissent donc toujours sur des voies différentes.
 */
const ECART_VOIES = 0.075
const NOMBRE_VOIES = 4

/**
 * Hauteur de la ligne de base commune, en fraction de la hauteur du viewport,
 * comptée depuis le centre de l'écran. Négatif = vers le bas.
 * Tous les objets sont POSÉS sur cette ligne : c'est elle qui rend la
 * comparaison des tailles immédiate.
 *
 * Volontairement proche du centre, et non en bas de l'écran : les étiquettes
 * s'accrochent sous la ligne de base et peuvent occuper jusqu'à trois rangées
 * quand plusieurs objets de tailles voisines se retrouvent côte à côte. Une
 * ligne de base plus basse ferait passer ces rangées derrière le panneau de
 * commandes.
 */
export const LIGNE_BASE_FRACTION = -0.03

/**
 * Bord au-delà duquel un objet est retiré du rendu, en fraction de la largeur
 * du viewport comptée depuis le centre. 0,5 correspondrait exactement au bord
 * de l'écran ; on garde un peu de marge pour que la rotation de la scène ne
 * fasse pas apparaître de trou sur les côtés.
 */
const MARGE_CULLING = 0.62

/** En dessous de ce nombre de pixels, un objet est retiré du rendu. */
export const SEUIL_DISPARITION_PX = 1

/** En dessous de ce nombre de pixels, l'objet s'estompe progressivement. */
const SEUIL_ESTOMPAGE_PX = 6

/** Au-delà de ce multiple du viewport, un objet est retiré du rendu. */
const SEUIL_DEBORDEMENT = 8

// ---------------------------------------------------------------------------
// Zoom logarithmique
// ---------------------------------------------------------------------------

/**
 * Le zoom est logarithmique par construction : on ne manipule jamais
 * `nmParPixel` par addition, uniquement par multiplication. Un pincement qui
 * écarte les doigts d'un facteur 2 divise toujours `nmParPixel` par 2, que
 * l'on soit à l'échelle du virus ou à celle du grain de sel.
 */
export function appliquerFacteurZoom(nmParPixel, facteur) {
  return contraindreZoom(nmParPixel / facteur)
}

export function contraindreZoom(nmParPixel) {
  const { minNmParPixel, maxNmParPixel } = bornesZoom
  return Math.min(maxNmParPixel, Math.max(minNmParPixel, nmParPixel))
}

/**
 * Position du curseur de zoom, de 0 (le plus près) à 1 (le plus loin).
 * Linéaire en logarithme : c'est ce qui rend le curseur utilisable sur toute
 * la plage. Un curseur linéaire en `nmParPixel` passerait 99 % de sa course
 * dans le monde du grain de sel.
 */
export function zoomVersCurseur(nmParPixel) {
  const { minNmParPixel, maxNmParPixel } = bornesZoom
  const bas = Math.log10(minNmParPixel)
  const haut = Math.log10(maxNmParPixel)
  return (Math.log10(nmParPixel) - bas) / (haut - bas)
}

export function curseurVersZoom(t) {
  const { minNmParPixel, maxNmParPixel } = bornesZoom
  const bas = Math.log10(minNmParPixel)
  const haut = Math.log10(maxNmParPixel)
  return contraindreZoom(Math.pow(10, bas + t * (haut - bas)))
}

// ---------------------------------------------------------------------------
// Disposition de la frise
// ---------------------------------------------------------------------------

/**
 * Dimension de référence servant à calibrer la taille des objets.
 *
 * On ne peut pas se caler sur la seule hauteur. Sur une tablette tenue en
 * PORTRAIT, la hauteur dépasse largement la largeur : un objet dimensionné à
 * 38 % de la hauteur occuperait alors la moitié de la largeur du cadre, et
 * viendrait recouvrir les objets stationnés sur sa gauche. On borne donc la
 * référence par la largeur, ce qui rend la mise en page correcte quelles que
 * soient les proportions de l'écran, et l'orientation de la tablette sans
 * conséquence.
 */
export function dimensionReference(largeurViewport, hauteurViewport) {
  return Math.min(hauteurViewport, largeurViewport * 0.8)
}

/**
 * Échelle à laquelle un objet donné est « la vedette », c'est-à-dire centré à
 * l'écran et occupant la fraction de la dimension de référence définie plus haut.
 */
export function nmParPixelDeFocus(objet, largeurViewport, hauteurViewport) {
  return objet.longueurNm / (FRACTION_ECRAN_FOCUS * dimensionReference(largeurViewport, hauteurViewport))
}

/**
 * Position horizontale d'un objet sur la frise, en pixels, centre écran = 0.
 *
 * `d` désigne le nombre de décades qui séparent l'échelle courante de l'échelle
 * où l'objet est la vedette. d = 0 : l'objet est centré. d > 0 : il est encore
 * trop grand pour le cadre (on n'a pas assez dézoomé). d < 0 : il est devenu
 * trop petit.
 *
 * Les deux côtés sont traités DIFFÉREMMENT, et c'est tout l'enjeu de cette
 * fonction. Une simple position proportionnelle à `d`, symétrique, ne peut pas
 * marcher : la position croît alors linéairement pendant que la taille croît
 * exponentiellement. Un objet une décade plus grand se retrouve à recouvrir
 * l'écran entier d'un aplat de couleur, sans bord visible — on ne voit plus
 * rien du tout.
 *
 * CÔTÉ DES GRANDS (d > 0) — on ne pilote pas le centre de l'objet, on pilote
 * son BORD GAUCHE, linéairement. Le bord gauche entre donc dans le cadre à un
 * rythme régulier, exactement une décade avant que l'objet ne devienne la
 * vedette. On voit un arc immense balayer l'écran de droite à gauche, puis se
 * refermer en un objet entier : c'est lisible, et c'est monotone, donc sans
 * clignotement.
 *
 * CÔTÉ DES PETITS (d < 0) — la position SATURE vers une place de
 * stationnement, près du bord gauche du cadre. L'objet ne sort jamais par le
 * côté : il reste à l'écran et rétrécit jusqu'à passer sous le pixel, où le
 * culling le supprime. C'est très exactement ce qu'on veut donner à voir : le
 * virus ne s'en va pas, il DISPARAÎT pendant que Demodex apparaît.
 */
export function positionXFrise(objet, nmParPixel, largeurViewport, hauteurViewport, longueurPx, rang) {
  const decades = Math.log10(nmParPixelDeFocus(objet, largeurViewport, hauteurViewport) / nmParPixel)

  if (decades >= 0) {
    const demiVedette = (FRACTION_ECRAN_FOCUS * dimensionReference(largeurViewport, hauteurViewport)) / 2
    // Étalement calculé, non réglé à la main : il vaut la distance qui sépare
    // le bord droit du cadre du bord gauche de l'objet vedette. L'entrée dans
    // le champ tombe donc pile à d = 1, quelles que soient les proportions de
    // l'écran de la tablette.
    const etalement = largeurViewport / 2 + demiVedette
    // `decalageX` ne sert que de ce côté-ci : il écarte deux objets de tailles
    // trop voisines pour ne pas se chevaucher au moment où ils entrent en scène.
    return longueurPx / 2 + etalement * decades - demiVedette + (objet.decalageX || 0) * largeurViewport
  }

  // Côté des petits : la position sature vers une voie de stationnement.
  // `decalageX` est ignoré ici — la voie suffit à séparer les objets, et un
  // décalage supplémentaire pousserait les plus petits hors du cadre à gauche.
  const voie = (-PARKING + (rang % NOMBRE_VOIES) * ECART_VOIES) * largeurViewport
  return voie * (1 - Math.exp(decades * RAIDEUR_PARKING))
}

/**
 * Décide ce qui est rendu et ce qui ne l'est pas, et calcule tout ce dont le
 * rendu a besoin. C'est l'unique endroit où le culling est décidé.
 *
 * Renvoie un tableau ne contenant QUE les objets effectivement visibles —
 * typiquement 3 à 5 sur les 10, à n'importe quelle échelle.
 */
export function calculerScene(objets, nmParPixel, largeurViewport, hauteurViewport) {
  const limiteTaille = SEUIL_DEBORDEMENT * Math.max(largeurViewport, hauteurViewport)
  const bordEcran = MARGE_CULLING * largeurViewport
  const ligneBase = LIGNE_BASE_FRACTION * hauteurViewport
  const visibles = []

  for (let rang = 0; rang < objets.length; rang++) {
    const objet = objets[rang]
    const longueurPx = objet.longueurNm / nmParPixel

    // Culling par taille : sous le pixel, l'objet n'existe plus à l'écran.
    if (longueurPx < SEUIL_DISPARITION_PX) continue
    // Garde-fou : inutile de demander à la carte graphique de rastériser un
    // objet plusieurs dizaines de fois plus grand que l'écran.
    if (longueurPx > limiteTaille) continue

    const x = positionXFrise(objet, nmParPixel, largeurViewport, hauteurViewport, longueurPx, rang)

    // Culling horizontal exact : on teste les BORDS de l'objet, pas son centre.
    // Tester le centre supprimerait un objet géant dont le centre est loin hors
    // cadre alors que son bord traverse encore l'écran.
    const demiLargeur = longueurPx / 2
    if (x + demiLargeur < -bordEcran || x - demiLargeur > bordEcran) continue

    // Estompage progressif juste avant la disparition : sans cela, l'objet
    // « pop » brutalement, ce qui se lit comme un bug plutôt que comme une
    // disparition d'échelle.
    const opacite =
      longueurPx >= SEUIL_ESTOMPAGE_PX
        ? 1
        : (longueurPx - SEUIL_DISPARITION_PX) / (SEUIL_ESTOMPAGE_PX - SEUIL_DISPARITION_PX)

    visibles.push({
      objet,
      x,
      // Tous les objets sans exception sont posés sur la ligne de base. C'est
      // possible parce que chaque modèle 3D est construit avec son PIED à
      // l'origine locale, jamais son centre : la règle est donc uniforme et il
      // n'y a aucun cas particulier à gérer ici.
      y: ligneBase,
      // Le décalage en profondeur est PROPORTIONNEL à la taille de l'objet, et
      // non exprimé en pixels fixes. Vue sous un angle, la profondeur déplace
      // légèrement un objet vers le haut ou le bas de l'écran ; un décalage
      // constant représenterait alors, pour un objet minuscule, plusieurs fois
      // sa propre taille, et il paraîtrait décollé de la ligne de base — ce qui
      // ruinerait la comparaison que cette ligne sert précisément à permettre.
      z: (objet.z || 0) * longueurPx,
      longueurPx,
      opacite: Math.max(0, Math.min(1, opacite)),
      detail: niveauDetail(longueurPx),
    })
  }

  return visibles
}

/**
 * Niveau de détail. Les structures internes (capside, flagelles, noyau,
 * pattes, écailles) ne sont construites qu'au-dessus d'un certain nombre de
 * pixels. En dessous, elles produiraient des triangles sous-pixel : coûteux à
 * calculer et illisibles à l'écran.
 */
function niveauDetail(longueurPx) {
  if (longueurPx < 18) return 0 // silhouette pleine
  if (longueurPx < 70) return 1 // formes principales
  return 2 // tous les détails
}

/**
 * Objet le plus proche de l'échelle courante — celui qui sert de repère mis en
 * évidence. On compare en logarithme, sinon les gros objets gagneraient
 * toujours.
 */
export function objetRepere(objets, nmParPixel, largeurViewport, hauteurViewport) {
  let meilleur = null
  let meilleurEcart = Infinity
  for (const objet of objets) {
    const ecart = Math.abs(Math.log10(nmParPixelDeFocus(objet, largeurViewport, hauteurViewport) / nmParPixel))
    if (ecart < meilleurEcart) {
      meilleurEcart = ecart
      meilleur = objet
    }
  }
  return meilleur
}

// ---------------------------------------------------------------------------
// Barre d'échelle
// ---------------------------------------------------------------------------

/**
 * Choisit une longueur physique « ronde » (1, 2 ou 5 × une puissance de 10)
 * dont la représentation à l'écran tombe dans une plage lisible.
 * La barre change donc d'unité toute seule : nm → µm → mm.
 */
export function choisirBarreEchelle(nmParPixel, largeurCibleMaxPx = 220) {
  const mantisses = [1, 2, 5]
  let meilleure = null

  for (let exposant = 0; exposant <= 7; exposant++) {
    for (const mantisse of mantisses) {
      const longueurNm = mantisse * Math.pow(10, exposant)
      const largeurPx = longueurNm / nmParPixel
      if (largeurPx <= largeurCibleMaxPx && (!meilleure || largeurPx > meilleure.largeurPx)) {
        meilleure = { longueurNm, largeurPx }
      }
    }
  }

  if (!meilleure) meilleure = { longueurNm: 1, largeurPx: 1 / nmParPixel }
  return { ...meilleure, libelle: formaterLongueur(meilleure.longueurNm) }
}

/**
 * Formate une longueur en nanomètres avec l'unité qui convient, en français
 * (virgule décimale, espace insécable avant l'unité).
 */
export function formaterLongueur(nm) {
  const ESPACE = ' '
  if (nm >= 1e6) return `${formaterNombre(nm / 1e6)}${ESPACE}mm`
  if (nm >= 1e3) return `${formaterNombre(nm / 1e3)}${ESPACE}µm`
  return `${formaterNombre(nm)}${ESPACE}nm`
}

function formaterNombre(valeur) {
  const arrondi = valeur >= 100 ? Math.round(valeur) : Math.round(valeur * 10) / 10
  return String(arrondi).replace('.', ',')
}

// ---------------------------------------------------------------------------
// Projection écran
// ---------------------------------------------------------------------------

/**
 * Projette un point monde vers les coordonnées écran, pour positionner les
 * étiquettes HTML au-dessus du canvas 3D.
 *
 * On refait le calcul à la main plutôt que d'utiliser la matrice de Three.js :
 * la caméra étant orthographique et cadrée au pixel près, la projection se
 * réduit à deux produits scalaires. C'est exact, sans dépendance, et cela
 * garantit que les étiquettes ne peuvent pas dériver d'une frame par rapport
 * aux objets qu'elles désignent.
 */
export function projeter(x, y, z, azimut, elevation, largeurViewport, hauteurViewport) {
  const sa = Math.sin(azimut)
  const ca = Math.cos(azimut)
  const se = Math.sin(elevation)
  const ce = Math.cos(elevation)

  // Vecteur « droite » de la caméra, puis vecteur « haut ».
  const ecranX = x * ca - z * sa
  const ecranY = -x * sa * se + y * ce - z * ca * se

  return {
    gauche: largeurViewport / 2 + ecranX,
    haut: hauteurViewport / 2 - ecranY,
  }
}
