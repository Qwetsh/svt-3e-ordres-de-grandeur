/**
 * Étiquettes des objets.
 *
 * Elles sont en HTML, au-dessus du canvas 3D, et non dessinées dans la scène :
 * le texte reste ainsi net à n'importe quelle définition d'écran, dans la
 * police du système, avec un contraste maîtrisé — ce qui compte quand la même
 * page est projetée au tableau et lue sur une tablette à bout de bras.
 *
 * Chaque étiquette est ancrée sur la LIGNE DE BASE, jamais sur le sommet de
 * l'objet : elles s'alignent donc toutes proprement, ne recouvrent jamais ce
 * qu'elles désignent, et il n'y a aucune hauteur d'objet à calculer.
 *
 * L'étiquette n'affiche QUE LA TAILLE. Le nom et la catégorie se lisent d'un
 * appui sur le « i ». Ce qui est comparé d'un objet à l'autre, c'est la taille ;
 * afficher les noms en permanence remplissait la frise de texte, forçait des
 * étiquettes larges, donc des rangées supplémentaires, donc des étiquettes
 * abandonnées faute de place. Le nom de l'objet de l'échelle courante reste de
 * toute façon écrit en clair dans la carte « À cette échelle ».
 */

import { useEffect, useState } from 'react'
import { LIGNE_BASE_FRACTION, formaterLongueur, projeter } from '../echelle.js'
import { couleurs, libellesCategorie } from '../donnees.js'

/** En dessous de cette taille, l'objet est trop petit pour mériter une étiquette. */
const SEUIL_ETIQUETTE_PX = 5

/**
 * Largeur supposée d'une étiquette, pour la détection de chevauchement.
 * Réduite avec le passage à la taille seule : l'étiquette ne contient plus
 * qu'un nombre et un bouton rond.
 */
const LARGEUR_ETIQUETTE = 108

/** Demi-largeur, marge comprise : de quoi brider une étiquette contre le bord. */
const DEMI_ETIQUETTE = 58

/** Décalage vertical entre deux rangées d'étiquettes. */
const HAUTEUR_RANGEE = 46

/**
 * En dessous de cette opacité, l'étiquette est en train de s'effacer : on n'y
 * laisse pas de bouton, qui resterait tactile alors qu'il n'est plus visible.
 */
const OPACITE_INTERACTIVE = 0.4

/**
 * Nombre maximal de rangées. Au-delà, l'étiquette passerait derrière le panneau
 * de commandes : mieux vaut ne pas l'afficher du tout qu'à moitié tronquée.
 */
const RANGEES_MAX = 3

/**
 * Répartit les étiquettes sur plusieurs rangées pour qu'elles ne se recouvrent
 * jamais.
 *
 * Le cas se produit systématiquement, et pas par accident : deux objets de
 * tailles voisines — le globule rouge et la levure, la cellule de la joue et le
 * cheveu — occupent forcément des positions voisines sur la frise, puisque
 * c'est la taille qui détermine la position. Sans cette répartition, leurs
 * étiquettes se superposent exactement au moment où l'on veut les comparer.
 *
 * On descend chaque étiquette d'une rangée tant qu'elle en croise une déjà
 * placée. Les objets sont traités de gauche à droite pour que le résultat soit
 * stable d'une image à l'autre et ne clignote pas.
 */
function repartirEnRangees(candidats) {
  const rangees = []

  return [...candidats]
    .sort((a, b) => a.gauche - b.gauche)
    .map((candidat) => {
      let rangee = 0
      while (
        rangees[rangee] !== undefined &&
        Math.abs(candidat.gauche - rangees[rangee]) < LARGEUR_ETIQUETTE
      ) {
        rangee++
      }
      rangees[rangee] = candidat.gauche
      return { ...candidat, rangee }
    })
    .filter((candidat) => candidat.rangee < RANGEES_MAX)
}

export function Etiquettes({ visibles, azimut, elevation, largeur, hauteur, repere }) {
  // Une seule fiche ouverte à la fois : deux fiches ouvertes se recouvriraient,
  // et l'écran redeviendrait ce qu'on cherche justement à désencombrer.
  const [ficheOuverte, setFicheOuverte] = useState(null)

  // Elle se referme dès qu'on change d'échelle : elle a été ouverte pour lire un
  // nom ici, pas pour voyager avec nous en recouvrant les étiquettes suivantes.
  // La rotation, elle, ne la referme pas — on tourne justement autour de l'objet
  // dont on vient de lire le nom.
  const idRepere = repere?.id
  useEffect(() => setFicheOuverte(null), [idRepere])

  const ligneBase = LIGNE_BASE_FRACTION * hauteur

  const candidats = visibles
    .filter((visible) => visible.longueurPx >= SEUIL_ETIQUETTE_PX)
    .map((visible) => ({
      visible,
      // Horizontalement, l'étiquette suit son objet, décalage en profondeur
      // compris : quand on tourne la scène, elle reste sous ce qu'elle désigne.
      // Bridé aux bords DÈS MAINTENANT, avant la répartition en rangées : une
      // étiquette centrée sur un objet collé au bord serait tronquée de moitié,
      // et brider après coup ferait entrer en collision deux étiquettes que la
      // répartition venait justement de séparer.
      gauche: Math.max(
        DEMI_ETIQUETTE,
        Math.min(
          largeur - DEMI_ETIQUETTE,
          projeter(visible.x, ligneBase, visible.z, azimut, elevation, largeur, hauteur).gauche,
        ),
      ),
      // Verticalement en revanche, on projette à profondeur nulle. Sinon le
      // décalage en z de chaque objet — quelques dizaines de pixels — viendrait
      // se soustraire à l'écart entre deux rangées, et deux étiquettes réparties
      // sur des rangées différentes se retrouveraient malgré tout collées.
      haut: projeter(visible.x, ligneBase, 0, azimut, elevation, largeur, hauteur).haut,
    }))
    // On écarte les étiquettes sorties du cadre : sinon elles s'empilent sur
    // les bords et deviennent illisibles.
    .filter((candidat) => candidat.gauche > -80 && candidat.gauche < largeur + 80)

  return (
    <div className="etiquettes">
      {repartirEnRangees(candidats).map(({ visible, gauche, haut, rangee }) => {
        const objet = visible.objet
        const estRepere = repere?.id === objet.id
        const estNonVivant = objet.categorie === 'repere'
        // Une étiquette à demi effacée par la rotation ne prend plus les appuis :
        // sa fiche se referme et son bouton disparaît avec elle.
        const interactive = visible.opacite >= OPACITE_INTERACTIVE
        const ouverte = interactive && ficheOuverte === objet.id

        return (
          <div
            key={objet.id}
            className={`etiquette${estRepere ? ' etiquette--active' : ''}${estNonVivant ? ' etiquette--non-vivant' : ''}${ouverte ? ' etiquette--ouverte' : ''}`}
            style={{
              left: `${gauche}px`,
              top: `${haut + rangee * HAUTEUR_RANGEE}px`,
              opacity: visible.opacite,
              '--couleur': couleurs[objet.categorie],
            }}
          >
            <span className="etiquette__ligne">
              <span className="etiquette__taille">{formaterLongueur(objet.longueurNm)}</span>
              {interactive && (
                <button
                  type="button"
                  className="etiquette__info"
                  aria-expanded={ouverte}
                  aria-label={ouverte ? 'Masquer le nom de l’objet' : 'Afficher le nom de l’objet'}
                  onClick={() => setFicheOuverte(ouverte ? null : objet.id)}
                >
                  i
                </button>
              )}
            </span>

            {ouverte && (
              <span className="etiquette__fiche">
                <span className="etiquette__nom">{objet.nom}</span>
                {objet.sousTitre && <span className="etiquette__soustitre">{objet.sousTitre}</span>}
                <span className="etiquette__categorie">{libellesCategorie[objet.categorie]}</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
