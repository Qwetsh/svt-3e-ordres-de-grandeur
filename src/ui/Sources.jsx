/**
 * Panneau « Sources ».
 *
 * Chaque dimension affichée dans l'application est ici rattachée à une source
 * vérifiable, avec la fourchette réelle et non seulement la valeur ronde. C'est
 * ce qui permet de répondre honnêtement à l'élève qui demande « et si on
 * mesure un autre cheveu, ça fait combien ? ».
 */

import { formaterLongueur } from '../echelle.js'
import { couleurs, libellesCategorie, limiteOeilNu, objets } from '../donnees.js'

export function Sources({ onFermer }) {
  return (
    <div className="panneau" role="dialog" aria-modal="true" aria-label="Sources des tailles">
      <div className="panneau__fond" onClick={onFermer} />
      <div className="panneau__contenu">
        <header className="panneau__entete">
          <h2>Tailles et sources</h2>
          <button type="button" className="bouton bouton--rond" onClick={onFermer} aria-label="Fermer">
            ×
          </button>
        </header>

        <p className="panneau__intro">
          Toutes les tailles sont des ordres de grandeur : un être vivant n’a pas une taille unique, il a une
          fourchette. Elle est indiquée pour chaque objet.
        </p>

        <ul className="panneau__liste">
          {objets.map((objet) => (
            <li key={objet.id} className="fiche" style={{ '--couleur': couleurs[objet.categorie] }}>
              <div className="fiche__entete">
                <span className="fiche__pastille" />
                <span className="fiche__nom">{objet.nom}</span>
                <span className="fiche__categorie">{libellesCategorie[objet.categorie]}</span>
              </div>
              <div className="fiche__mesures">
                <strong>{formaterLongueur(objet.longueurNm)}</strong>
                <span className="fiche__fourchette">fourchette réelle : {objet.fourchette}</span>
              </div>
              {objet.note && <p className="fiche__note">{objet.note}</p>}
              <p className="fiche__source">
                {objet.source.texte}{' '}
                <a href={objet.source.url} target="_blank" rel="noreferrer noopener">
                  consulter la source
                </a>
              </p>
            </li>
          ))}

          <li className="fiche fiche--oeil">
            <div className="fiche__entete">
              <span className="fiche__pastille" />
              <span className="fiche__nom">{limiteOeilNu.libelle}</span>
            </div>
            <div className="fiche__mesures">
              <strong>
                {formaterLongueur(limiteOeilNu.basNm)} à {formaterLongueur(limiteOeilNu.hautNm)}
              </strong>
              <span className="fiche__fourchette">c’est une bande, pas un seuil net</span>
            </div>
            <p className="fiche__note">
              On affiche volontairement une bande et non un trait : le chiffre de 0,1 mm est le seuil couramment
              retenu, mais un très bon œil distingue encore un fil deux fois plus fin dans de bonnes conditions.
            </p>
            <p className="fiche__source">
              {limiteOeilNu.source.texte}{' '}
              <a href={limiteOeilNu.source.url} target="_blank" rel="noreferrer noopener">
                consulter la source
              </a>
            </p>
          </li>
        </ul>

        <footer className="panneau__pied">
          Vérifications effectuées le 2 septembre 2026. Pour modifier une valeur, éditer le fichier{' '}
          <code>src/donnees.js</code> : c’est le seul fichier à toucher.
        </footer>
      </div>
    </div>
  )
}
