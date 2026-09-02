/**
 * L'ancrage local : la carte qui dit, en permanence, à quelle échelle on se
 * trouve et quel objet la représente.
 *
 * Elle complète la mini-carte, qui donne l'ancrage global. Ensemble, elles
 * remplacent l'« objet de référence toujours à l'écran » — qui est
 * physiquement impossible sur quatre ordres de grandeur, puisqu'un tel objet
 * mesurerait un centième de pixel à une extrémité du voyage et dix mille pixels
 * à l'autre.
 */

import { formaterLongueur } from '../echelle.js'
import { couleurs, libellesCategorie, limiteOeilNu } from '../donnees.js'

export function RepereActif({ repere }) {
  if (!repere) return null

  const visibleOeilNu = repere.longueurNm >= limiteOeilNu.hautNm
  const limite = repere.longueurNm >= limiteOeilNu.basNm && repere.longueurNm < limiteOeilNu.hautNm

  return (
    <div className="repere" style={{ '--couleur': couleurs[repere.categorie] }}>
      <div className="repere__titre">À cette échelle</div>
      <div className="repere__nom">{repere.nom}</div>
      {repere.sousTitre && <div className="repere__soustitre">{repere.sousTitre}</div>}
      <div className="repere__taille">{formaterLongueur(repere.longueurNm)}</div>
      <div className="repere__categorie">{libellesCategorie[repere.categorie]}</div>
      <div className={`repere__oeil${visibleOeilNu ? ' repere__oeil--visible' : ''}`}>
        {visibleOeilNu
          ? 'visible à l’œil nu'
          : limite
            ? 'tout juste à la limite de l’œil nu'
            : 'invisible à l’œil nu'}
      </div>
    </div>
  )
}
