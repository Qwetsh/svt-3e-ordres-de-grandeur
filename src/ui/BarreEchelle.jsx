/**
 * Barre d'échelle. Elle choisit toute seule une longueur physique « ronde »
 * (1, 2 ou 5 fois une puissance de 10) dont la représentation à l'écran reste
 * lisible, et change donc d'unité d'elle-même au fil du zoom : nm → µm → mm.
 *
 * C'est le repère le plus important de l'application : c'est le seul élément
 * qui relie ce que l'élève voit à une grandeur réelle.
 */

import { choisirBarreEchelle, formaterLongueur } from '../echelle.js'

export function BarreEchelle({ nmParPixel, largeur }) {
  const barre = choisirBarreEchelle(nmParPixel)
  const champDeVision = formaterLongueur(largeur * nmParPixel)

  return (
    <div className="barre-echelle">
      <div className="barre-echelle__trait" style={{ width: `${barre.largeurPx}px` }}>
        <span className="barre-echelle__embout" />
        <span className="barre-echelle__embout" />
      </div>
      <div className="barre-echelle__valeur">{barre.libelle}</div>
      <div className="barre-echelle__champ">largeur de l’écran : {champDeVision}</div>
    </div>
  )
}
