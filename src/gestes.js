/**
 * ============================================================================
 *  GESTES ET PILOTAGE
 * ============================================================================
 *
 *  Répartition des commandes :
 *      1 doigt qui glisse  →  tourner autour des objets (tour complet)
 *      2 doigts qui pincent →  zoomer / dézoomer
 *      double tap          →  recadrer (retour à la vue de face)
 *      molette             →  zoomer (pour le poste du professeur)
 *      + / − au clavier    →  zoomer (pilotage au vidéoprojecteur)
 *
 *  Toutes les valeurs vivent dans des `ref` et sont modifiées directement, sans
 *  passer par l'état React. Un unique `requestAnimationFrame` les recopie dans
 *  l'état React une fois par image. Sans cela, un pincement à deux doigts
 *  déclencherait plusieurs dizaines de rendus React par seconde et saccaderait
 *  sur iPad.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { appliquerFacteurZoom, contraindreZoom, curseurVersZoom, nmParPixelDeFocus } from './echelle.js'
import { bornesZoom, objets } from './donnees.js'

/**
 * L'AZIMUT N'EST PAS BRIDÉ : on fait le tour complet des objets, pour les voir
 * de face, de profil, de dos.
 *
 * L'ÉLÉVATION, elle, est bornée aux deux bouts.
 *
 * En haut, elle s'arrête juste avant la verticale, et ce n'est pas un choix de
 * confort : à 90° exactement, la direction de visée devient colinéaire au
 * vecteur « haut » de la caméra, son orientation n'est plus définie et l'image
 * bascule d'un quart de tour d'une image à l'autre. 85° laissent survoler la
 * scène pratiquement à la verticale sans jamais atteindre ce point.
 *
 * En bas, elle s'arrête UN PEU AVANT LE NIVEAU DU SOL. Passer dessous donnait
 * une vue où les objets pendent au plafond, la ligne de base file au-dessus de
 * la tête et plus rien ne dit où est le haut : on s'y perdait en deux gestes.
 * Mais s'arrêter pile à l'horizontale ne suffisait pas non plus : à 0°, le sol
 * est vu par la tranche, son carrelage se réduit à un trait et disparaît d'un
 * coup. Ces 6° gardent toujours quelques carreaux visibles, donc toujours un
 * repère.
 */
export const ELEVATION_MAX = (85 * Math.PI) / 180
export const ELEVATION_MIN = (6 * Math.PI) / 180

/** Sensibilité de l'orbite : radians par pixel de glissement. À cette valeur,
 *  un glissement de la largeur d'un iPad fait un peu plus d'un demi-tour. */
const SENSIBILITE_ORBITE = 0.0045

/** Durée du mode présentation, en millisecondes. */
const DUREE_PRESENTATION = 30000

const briderElevation = (valeur) => Math.min(ELEVATION_MAX, Math.max(ELEVATION_MIN, valeur))

/**
 * Ramène un angle dans [−π, π].
 *
 * L'azimut tourne sans fin ; sans cela il s'accumulerait indéfiniment au fil
 * des gestes et finirait par perdre en précision. Ramener l'angle ne change
 * rien à ce qui est affiché — c'est le même point de vue.
 */
function normaliserAngle(angle) {
  const tour = Math.PI * 2
  return angle - tour * Math.round(angle / tour)
}

export function useControleur(largeur, hauteur) {
  const conteneurRef = useRef(null)

  // --- Source de vérité : des refs, jamais l'état React ---------------------
  const zoomRef = useRef(null) // nmParPixel
  const azimutRef = useRef(0)
  const elevationRef = useRef(0.12)

  // --- Copie destinée au rendu, rafraîchie une fois par image ---------------
  const [etat, setEtat] = useState({ nmParPixel: 0.3, azimut: 0, elevation: 0.12 })
  const [presentationActive, setPresentationActive] = useState(false)

  const pointeursRef = useRef(new Map())
  const distancePincementRef = useRef(null)
  const dernierTapRef = useRef({ temps: 0, x: 0, y: 0 })
  const presentationRef = useRef(null)

  // Initialisation : on démarre à l'échelle du plus petit objet de la liste,
  // pour que le voyage aille bien du plus petit vers le plus grand.
  useEffect(() => {
    if (zoomRef.current === null && largeur > 0 && hauteur > 0) {
      const plusPetit = objets.reduce((a, b) => (a.longueurNm <= b.longueurNm ? a : b))
      zoomRef.current = contraindreZoom(nmParPixelDeFocus(plusPetit, largeur, hauteur))
    }
  }, [largeur, hauteur])

  const arreterPresentation = useCallback(() => {
    presentationRef.current = null
    setPresentationActive(false)
  }, [])

  const zoomer = useCallback(
    (facteur) => {
      arreterPresentation()
      zoomRef.current = appliquerFacteurZoom(zoomRef.current ?? 0.3, facteur)
    },
    [arreterPresentation],
  )

  const reglerCurseur = useCallback(
    (t) => {
      arreterPresentation()
      zoomRef.current = curseurVersZoom(t)
    },
    [arreterPresentation],
  )

  const recadrer = useCallback(() => {
    azimutRef.current = 0
    elevationRef.current = 0.12
  }, [])

  const allerA = useCallback(
    (objet) => {
      arreterPresentation()
      zoomRef.current = contraindreZoom(nmParPixelDeFocus(objet, largeur, hauteur))
    },
    [arreterPresentation, largeur, hauteur],
  )

  const basculerPresentation = useCallback(() => {
    if (presentationRef.current) {
      arreterPresentation()
      return
    }
    recadrer()
    presentationRef.current = { debut: performance.now() }
    setPresentationActive(true)
  }, [arreterPresentation, recadrer])

  // --- Boucle d'animation : présentation + recopie vers React ---------------
  useEffect(() => {
    let vivant = true

    const boucle = () => {
      if (!vivant) return

      const presentation = presentationRef.current
      if (presentation) {
        const t = Math.min(1, (performance.now() - presentation.debut) / DUREE_PRESENTATION)
        // Adoucissement aux deux extrémités : le voyage démarre et s'arrête en
        // douceur au lieu de partir d'un coup.
        const adouci = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        const bas = Math.log10(bornesZoom.minNmParPixel)
        const haut = Math.log10(bornesZoom.maxNmParPixel)
        zoomRef.current = Math.pow(10, bas + adouci * (haut - bas))
        if (t >= 1) arreterPresentation()
      }

      setEtat((precedent) => {
        const nmParPixel = zoomRef.current ?? precedent.nmParPixel
        const azimut = azimutRef.current
        const elevation = elevationRef.current
        if (
          Math.abs(nmParPixel / precedent.nmParPixel - 1) < 1e-6 &&
          azimut === precedent.azimut &&
          elevation === precedent.elevation
        ) {
          return precedent // rien n'a bougé : on évite un rendu inutile
        }
        return { nmParPixel, azimut, elevation }
      })

      requestAnimationFrame(boucle)
    }

    const id = requestAnimationFrame(boucle)
    return () => {
      vivant = false
      cancelAnimationFrame(id)
    }
  }, [arreterPresentation])

  // --- Événements pointeur --------------------------------------------------
  useEffect(() => {
    const conteneur = conteneurRef.current
    if (!conteneur) return

    const pointeurs = pointeursRef.current

    const distanceEntrePointeurs = () => {
      const [a, b] = [...pointeurs.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    const onPointerDown = (evenement) => {
      conteneur.setPointerCapture?.(evenement.pointerId)
      pointeurs.set(evenement.pointerId, { x: evenement.clientX, y: evenement.clientY })

      if (pointeurs.size === 2) distancePincementRef.current = distanceEntrePointeurs()

      // Détection du double tap : deux appuis rapprochés dans le temps ET dans
      // l'espace. Le test de distance évite qu'un doigt puis l'autre, posés à
      // deux endroits différents, soient pris pour un double tap.
      const maintenant = performance.now()
      const dernier = dernierTapRef.current
      if (
        maintenant - dernier.temps < 350 &&
        Math.hypot(evenement.clientX - dernier.x, evenement.clientY - dernier.y) < 40
      ) {
        recadrer()
        dernierTapRef.current = { temps: 0, x: 0, y: 0 }
      } else {
        dernierTapRef.current = { temps: maintenant, x: evenement.clientX, y: evenement.clientY }
      }
    }

    const onPointerMove = (evenement) => {
      const precedent = pointeurs.get(evenement.pointerId)
      if (!precedent) return

      const dx = evenement.clientX - precedent.x
      const dy = evenement.clientY - precedent.y
      pointeurs.set(evenement.pointerId, { x: evenement.clientX, y: evenement.clientY })

      if (pointeurs.size >= 2) {
        // Deux doigts : pincement. On ignore complètement l'orbite, sinon la
        // scène tournerait en même temps qu'on zoome.
        const distance = distanceEntrePointeurs()
        const reference = distancePincementRef.current
        if (reference && distance > 0) {
          arreterPresentation()
          zoomRef.current = appliquerFacteurZoom(zoomRef.current ?? 0.3, distance / reference)
        }
        distancePincementRef.current = distance
        return
      }

      // Un doigt : orbite. Le tour complet à l'horizontale, du ras du sol à la
      // verticale à l'autre.
      azimutRef.current = normaliserAngle(azimutRef.current + dx * SENSIBILITE_ORBITE)
      elevationRef.current = briderElevation(elevationRef.current - dy * SENSIBILITE_ORBITE)
    }

    const onPointerUp = (evenement) => {
      pointeurs.delete(evenement.pointerId)
      // En passant de deux doigts à un seul, on efface la distance de
      // référence : sans cela le doigt restant provoquerait un saut de zoom.
      distancePincementRef.current = pointeurs.size === 2 ? distanceEntrePointeurs() : null
    }

    const onWheel = (evenement) => {
      evenement.preventDefault()
      arreterPresentation()
      zoomRef.current = appliquerFacteurZoom(zoomRef.current ?? 0.3, Math.exp(-evenement.deltaY * 0.0016))
    }

    conteneur.addEventListener('pointerdown', onPointerDown)
    conteneur.addEventListener('pointermove', onPointerMove)
    conteneur.addEventListener('pointerup', onPointerUp)
    conteneur.addEventListener('pointercancel', onPointerUp)
    conteneur.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      conteneur.removeEventListener('pointerdown', onPointerDown)
      conteneur.removeEventListener('pointermove', onPointerMove)
      conteneur.removeEventListener('pointerup', onPointerUp)
      conteneur.removeEventListener('pointercancel', onPointerUp)
      conteneur.removeEventListener('wheel', onWheel)
    }
  }, [arreterPresentation, recadrer])

  // --- Clavier : indispensable pour piloter depuis le poste professeur ------
  useEffect(() => {
    const onKeyDown = (evenement) => {
      if (evenement.target.tagName === 'INPUT') return
      if (evenement.key === '+' || evenement.key === '=') zoomer(1.25)
      else if (evenement.key === '-' || evenement.key === '_') zoomer(1 / 1.25)
      else if (evenement.key === 'ArrowLeft') azimutRef.current = normaliserAngle(azimutRef.current - 0.06)
      else if (evenement.key === 'ArrowRight') azimutRef.current = normaliserAngle(azimutRef.current + 0.06)
      else if (evenement.key === 'ArrowUp') elevationRef.current = briderElevation(elevationRef.current + 0.05)
      else if (evenement.key === 'ArrowDown') elevationRef.current = briderElevation(elevationRef.current - 0.05)
      else if (evenement.key === '0') recadrer()
      else if (evenement.key === ' ') {
        evenement.preventDefault()
        basculerPresentation()
      } else return
      evenement.preventDefault?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [basculerPresentation, recadrer, zoomer])

  return {
    conteneurRef,
    ...etat,
    presentationActive,
    zoomer,
    reglerCurseur,
    recadrer,
    allerA,
    basculerPresentation,
  }
}
