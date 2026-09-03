/**
 * ============================================================================
 *  ASSEMBLAGE
 * ============================================================================
 *
 *  Le flux de données est délibérément à sens unique et tient en trois lignes :
 *
 *      nmParPixel  →  calculerScene()  →  la liste des objets visibles
 *                                          →  la scène 3D et les étiquettes
 *
 *  Il n'existe aucun autre état d'échelle nulle part dans l'application. Tout
 *  ce qui est affiché — taille des objets, position sur la frise, barre
 *  d'échelle, hauteur de la bande de l'œil nu, curseur de la mini-carte —
 *  se recalcule à partir de ce seul nombre.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Scene } from './Scene.jsx'
import { useControleur } from './gestes.js'
import { calculerScene, objetRepere } from './echelle.js'
import { objets } from './donnees.js'
import { BarreEchelle } from './ui/BarreEchelle.jsx'
import { MiniCarte } from './ui/MiniCarte.jsx'
import { Etiquettes } from './ui/Etiquettes.jsx'
import { Controles } from './ui/Controles.jsx'
import { RepereActif } from './ui/RepereActif.jsx'
import { Sources } from './ui/Sources.jsx'

/** Mesure la taille réelle du conteneur, et la suit lors des rotations de tablette. */
function useTaille(reference) {
  const [taille, setTaille] = useState({ largeur: 0, hauteur: 0 })

  useEffect(() => {
    const element = reference.current
    if (!element) return

    const mesurer = () => {
      const rectangle = element.getBoundingClientRect()
      setTaille({ largeur: Math.round(rectangle.width), hauteur: Math.round(rectangle.height) })
    }

    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [reference])

  return taille
}

/** Vrai si l'appareil possède un pointeur précis — souris ou pavé tactile. */
const sourisPresente =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches === true

export default function App() {
  const cadreRef = useRef(null)
  const { largeur, hauteur } = useTaille(cadreRef)
  const [sourcesOuvertes, setSourcesOuvertes] = useState(false)

  // Le panneau du bas est REPLIÉ AU DÉMARRAGE. Il occupe un bon quart de l'écran
  // sur une tablette en portrait, et ce quart est justement celui où arrivent
  // les plus gros objets de la frise. Tout ce qu'il commande reste accessible
  // sans lui — molette et pincement pour l'échelle, double tap pour recadrer,
  // barre d'espace pour la présentation — il n'est donc pas nécessaire à
  // l'exploration, seulement au pilotage précis.
  const [commandesOuvertes, setCommandesOuvertes] = useState(false)

  const {
    conteneurRef,
    nmParPixel,
    azimut,
    elevation,
    presentationActive,
    zoomer,
    reglerCurseur,
    recadrer,
    allerA,
    basculerPresentation,
  } = useControleur(largeur, hauteur)

  // « c » comme commandes : de quoi replier et déplier le panneau depuis le
  // poste professeur, sans avoir à viser un bouton pendant la projection.
  useEffect(() => {
    const onKeyDown = (evenement) => {
      if (evenement.target.tagName === 'INPUT') return
      if (evenement.key === 'c' || evenement.key === 'C') setCommandesOuvertes((ouvert) => !ouvert)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const pret = largeur > 0 && hauteur > 0

  // L'objet de l'échelle courante. Calculé AVANT la scène : c'est lui qui reste
  // visible quand on tourne autour, les autres s'effaçant progressivement.
  const repere = useMemo(
    () => (pret ? objetRepere(objets, nmParPixel, largeur, hauteur) : null),
    [pret, nmParPixel, largeur, hauteur],
  )

  // L'unique calcul de la scène. Il décide de ce qui existe à l'écran et de ce
  // qui n'existe pas : c'est le seul endroit où le culling est appliqué.
  const visibles = useMemo(
    () => (pret ? calculerScene(objets, nmParPixel, largeur, hauteur, azimut, repere) : []),
    [pret, nmParPixel, largeur, hauteur, azimut, repere],
  )

  return (
    <div className="application" ref={cadreRef}>
      {/* Le conteneur des gestes recouvre toute la scène. Les commandes sont
          placées AU-DESSUS de lui, pour qu'un appui sur un bouton ne fasse pas
          tourner la scène par la même occasion. */}
      <div className="scene" ref={conteneurRef}>
        {pret && (
          <Scene
            visibles={visibles}
            nmParPixel={nmParPixel}
            azimut={azimut}
            elevation={elevation}
            largeur={largeur}
            hauteur={hauteur}
          />
        )}
      </div>

      {pret && (
        <>
          <Etiquettes
            visibles={visibles}
            azimut={azimut}
            elevation={elevation}
            largeur={largeur}
            hauteur={hauteur}
            repere={repere}
          />

          <RepereActif repere={repere} />
          <BarreEchelle nmParPixel={nmParPixel} largeur={largeur} />

          {commandesOuvertes ? (
            <div className="panneau-bas">
              <MiniCarte
                nmParPixel={nmParPixel}
                largeur={largeur}
                hauteur={hauteur}
                repere={repere}
                onAllerA={allerA}
              />
              <Controles
                nmParPixel={nmParPixel}
                presentationActive={presentationActive}
                onCurseur={reglerCurseur}
                onZoom={zoomer}
                onRecadrer={recadrer}
                onPresentation={basculerPresentation}
                onSources={() => setSourcesOuvertes(true)}
                onMasquer={() => setCommandesOuvertes(false)}
              />
            </div>
          ) : (
            /* Replié, le panneau ne laisse qu'un bouton dans le coin. Il reste
               visible en permanence : un panneau qu'on ne sait pas rappeler est
               un panneau perdu. */
            <button
              type="button"
              className="bouton bouton--commandes"
              onClick={() => setCommandesOuvertes(true)}
              aria-label="Afficher les commandes"
            >
              ☰<span className="bouton__texte">Commandes</span>
            </button>
          )}

          {/* L'aide est écrite dans les termes du matériel réellement utilisé :
              « 2 doigts pour zoomer » n'aide personne au vidéoprojecteur, et
              « molette » n'aide personne sur une tablette. */}
          <div className="aide">
            {sourisPresente ? (
              <>
                <strong>Glisser</strong> pour tourner tout autour · <strong>molette</strong> pour
                zoomer · <strong>double-clic</strong> pour recadrer
              </>
            ) : (
              <>
                <strong>1 doigt</strong> pour tourner tout autour · <strong>2 doigts</strong> pour
                zoomer · <strong>double tap</strong> pour recadrer
              </>
            )}
          </div>
        </>
      )}

      {sourcesOuvertes && <Sources onFermer={() => setSourcesOuvertes(false)} />}
    </div>
  )
}
