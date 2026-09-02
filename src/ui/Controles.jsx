/**
 * Barre de commandes.
 *
 * Le curseur est LINÉAIRE EN LOGARITHME. Un curseur linéaire en nanomètres par
 * pixel passerait 99 % de sa course dans le monde du grain de sel et laisserait
 * tout le monde microscopique écrasé sur les premiers millimètres : la plage
 * utile serait inexploitable.
 *
 * Le curseur existe en plus du pincement parce qu'il est reproductible : il
 * permet de revenir exactement au même endroit d'une classe à l'autre, et de
 * piloter la projection au tableau sans toucher l'écran.
 */

import { zoomVersCurseur } from '../echelle.js'

export function Controles({
  nmParPixel,
  presentationActive,
  onCurseur,
  onZoom,
  onRecadrer,
  onPresentation,
  onSources,
}) {
  return (
    <div className="controles">
      <button
        type="button"
        className={`bouton bouton--lecture${presentationActive ? ' bouton--actif' : ''}`}
        onClick={onPresentation}
        aria-label={presentationActive ? 'Arrêter la présentation' : 'Lancer la présentation automatique'}
      >
        {presentationActive ? '■' : '▶'}
        <span className="bouton__texte">{presentationActive ? 'Arrêter' : 'Présentation'}</span>
      </button>

      <button type="button" className="bouton bouton--rond" onClick={() => onZoom(1 / 1.6)} aria-label="Dézoomer">
        −
      </button>

      <div className="curseur">
        <span className="curseur__extremite">100 nm</span>
        <input
          type="range"
          min="0"
          max="1000"
          value={Math.round(zoomVersCurseur(nmParPixel) * 1000)}
          onChange={(evenement) => onCurseur(Number(evenement.target.value) / 1000)}
          aria-label="Échelle"
        />
        <span className="curseur__extremite">1 mm</span>
      </div>

      <button type="button" className="bouton bouton--rond" onClick={() => onZoom(1.6)} aria-label="Zoomer">
        +
      </button>

      <button type="button" className="bouton" onClick={onRecadrer} aria-label="Recadrer la vue">
        ⟲<span className="bouton__texte">Recadrer</span>
      </button>

      <button type="button" className="bouton" onClick={onSources} aria-label="Afficher les sources">
        ?<span className="bouton__texte">Sources</span>
      </button>
    </div>
  )
}
