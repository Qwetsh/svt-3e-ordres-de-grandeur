/**
 * Mini-carte logarithmique : le repère global permanent.
 *
 * Aucun objet physique ne peut rester visible à l'écran sur quatre ordres de
 * grandeur — il ferait 0,01 pixel à une extrémité et 10 000 pixels à l'autre.
 * L'ancrage de la perception passe donc par cette carte : elle montre en
 * permanence l'ensemble du chemin, où l'on se trouve dessus, et ce qu'il reste
 * à parcourir.
 *
 * Chaque point est cliquable : c'est ce qui permet au professeur d'aller
 * directement à un objet précis pendant la séance.
 */

import { FRACTION_ECRAN_FOCUS, dimensionReference, formaterLongueur } from '../echelle.js'
import { couleurs, limiteOeilNu, objets } from '../donnees.js'

const BORNE_BASSE_NM = 50
const BORNE_HAUTE_NM = 2000000

const position = (nm) => {
  const bas = Math.log10(BORNE_BASSE_NM)
  const haut = Math.log10(BORNE_HAUTE_NM)
  return ((Math.log10(nm) - bas) / (haut - bas)) * 100
}

const GRADUATIONS = [100, 1000, 10000, 100000, 1000000]

export function MiniCarte({ nmParPixel, largeur, hauteur, repere, onAllerA }) {
  // Taille de l'objet qui remplirait l'écran à l'échelle actuelle : c'est elle
  // qui situe le curseur sur la carte.
  const tailleVedette = FRACTION_ECRAN_FOCUS * dimensionReference(largeur, hauteur) * nmParPixel
  const curseur = Math.max(0, Math.min(100, position(tailleVedette)))

  return (
    <div className="minicarte">
      <div className="minicarte__titre">Où l’on se trouve</div>

      <div className="minicarte__piste">
        {/* Bande « limite de l'œil nu » reportée sur la carte. */}
        <div
          className="minicarte__oeil"
          style={{
            left: `${position(limiteOeilNu.basNm)}%`,
            width: `${position(limiteOeilNu.hautNm) - position(limiteOeilNu.basNm)}%`,
          }}
          title={limiteOeilNu.libelle}
        />

        <div className="minicarte__axe" />

        {GRADUATIONS.map((nm) => (
          <div key={nm} className="minicarte__graduation" style={{ left: `${position(nm)}%` }}>
            <span className="minicarte__graduation-trait" />
            <span className="minicarte__graduation-texte">{formaterLongueur(nm)}</span>
          </div>
        ))}

        {objets.map((objet) => (
          <button
            key={objet.id}
            type="button"
            className={`minicarte__point${repere?.id === objet.id ? ' minicarte__point--actif' : ''}`}
            style={{ left: `${position(objet.longueurNm)}%`, '--couleur': couleurs[objet.categorie] }}
            onClick={() => onAllerA(objet)}
            aria-label={`Aller à ${objet.nom}, ${formaterLongueur(objet.longueurNm)}`}
            title={`${objet.nom} — ${formaterLongueur(objet.longueurNm)}`}
          />
        ))}

        <div className="minicarte__curseur" style={{ left: `${curseur}%` }} />
      </div>

      <div className="minicarte__legende">
        <span className="minicarte__legende-oeil" /> limite de l’œil nu
      </div>
    </div>
  )
}
