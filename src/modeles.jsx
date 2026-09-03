/**
 * ============================================================================
 *  MODÈLES 3D PROCÉDURAUX
 * ============================================================================
 *
 *  Aucun fichier externe : chaque objet est construit ici, en code, à partir de
 *  primitives déformées. Conséquences pratiques : l'application fonctionne hors
 *  ligne sans rien télécharger, le paquet reste léger, il n'y a aucune licence
 *  à vérifier, et les proportions restent pilotées par le fichier de données.
 *
 *  ---------------------------------------------------------------------------
 *  DEUX RÈGLES QUE TOUT MODÈLE DOIT RESPECTER
 *  ---------------------------------------------------------------------------
 *  1. NORMALISATION : le modèle est construit à l'échelle 1, c'est-à-dire que
 *     sa plus grande dimension vaut 1 unité. C'est la scène qui le
 *     redimensionne ensuite d'un facteur `longueurPx` compris entre 1 et
 *     quelques milliers. On ne construit JAMAIS un modèle à sa taille réelle en
 *     nanomètres : les coordonnées atteindraient 10⁶ et la précision des
 *     flottants 32 bits de WebGL s'effondrerait.
 *
 *  2. PIED À L'ORIGINE : le modèle occupe l'espace y ∈ [0, hauteur]. Son point
 *     le plus bas est donc en y = 0. C'est ce qui permet de poser tous les
 *     objets sur la même ligne de base sans aucun calcul par objet.
 *
 *  ---------------------------------------------------------------------------
 *  NIVEAUX DE DÉTAIL
 *  ---------------------------------------------------------------------------
 *      0  — moins de 18 px : silhouette pleine, aucune structure interne
 *      1  — moins de 70 px : formes principales
 *      2  — au-delà        : tous les détails
 *
 *  Sans cela, on demanderait à la carte graphique de rasteriser des milliers de
 *  triangles plus petits qu'un pixel : coûteux, et illisible à l'écran.
 */

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { couleurNoyau, couleurs, couleursRendu } from './donnees.js'

// Modèle sculpté, fourni par l'enseignant, puis allégé (voir la section Demodex
// en bas de fichier). Importé par Vite, donc versionné par empreinte et copié
// dans le bundle : le chemin reste juste quel que soit le sous-dossier de
// déploiement, et le service worker le met en cache comme le reste.
import urlDemodex from './assets/demodex.glb?url'

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Pseudo-aléatoire déterministe. On n'utilise pas Math.random : les géométries
 * sont mises en cache, et un tirage différent à chaque reconstruction ferait
 * « sauter » les bosses d'une cellule au franchissement d'un seuil de détail.
 */
function bruit(graine) {
  const x = Math.sin(graine * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Points répartis régulièrement sur une sphère (spirale de Fibonacci). */
function directionsSphere(nombre) {
  const points = []
  const or = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < nombre; i++) {
    const y = 1 - (i / (nombre - 1)) * 2
    const rayon = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = or * i
    points.push(new THREE.Vector3(Math.cos(theta) * rayon, y, Math.sin(theta) * rayon))
  }
  return points
}

/**
 * Construit un solide de révolution à partir d'un profil [position, rayon].
 * Sert au globule rouge (disque biconcave) et au corps de Demodex (annelé).
 */
function solideDeRevolution(profil, segments = 32) {
  const points = [new THREE.Vector2(0, profil[0][0])]
  for (const [position, rayon] of profil) points.push(new THREE.Vector2(Math.max(1e-5, rayon), position))
  points.push(new THREE.Vector2(0, profil[profil.length - 1][0]))
  const geometrie = new THREE.LatheGeometry(points, segments)
  geometrie.computeVertexNormals()
  return geometrie
}

/**
 * Sème des piquants sur la surface d'une capsule couchée le long de l'axe X.
 *
 * Une sphère ne convient pas pour un bâtonnet : les piquants se regrouperaient
 * tous au centre du corps et formeraient une étoile en plein milieu, au lieu de
 * garnir toute la longueur.
 */
function piquantsSurCapsule(rayon, demiLongueur, nombre, longueur, epaisseur) {
  const morceaux = []
  const cone = new THREE.ConeGeometry(epaisseur, longueur, 5)
  const orientation = new THREE.Quaternion()
  const axeY = new THREE.Vector3(0, 1, 0)
  const orDore = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < nombre; i++) {
    const x = (i / (nombre - 1) - 0.5) * 2 * demiLongueur
    const angle = orDore * i
    const direction = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle))
    const geometrie = cone.clone()
    orientation.setFromUnitVectors(axeY, direction)
    geometrie.applyQuaternion(orientation)
    const centre = direction.clone().multiplyScalar(rayon + longueur * 0.42)
    geometrie.translate(x, centre.y, centre.z)
    morceaux.push(geometrie)
  }
  cone.dispose()
  return mergeGeometries(morceaux, false)
}

/** Sème des piquants (spicules virales) sur une sphère de rayon donné. */
function piquantsSurSphere(rayon, nombre, longueur, epaisseur) {
  const morceaux = []
  const cone = new THREE.ConeGeometry(epaisseur, longueur, 5)
  const orientation = new THREE.Quaternion()
  const axeY = new THREE.Vector3(0, 1, 0)

  for (const direction of directionsSphere(nombre)) {
    const geometrie = cone.clone()
    orientation.setFromUnitVectors(axeY, direction)
    geometrie.applyQuaternion(orientation)
    const centre = direction.clone().multiplyScalar(rayon + longueur * 0.42)
    geometrie.translate(centre.x, centre.y, centre.z)
    morceaux.push(geometrie)
  }
  cone.dispose()
  return mergeGeometries(morceaux, false)
}

/** Déforme une géométrie par un bruit doux, pour casser l'aspect « boule parfaite ». */
function bosseler(geometrie, amplitude, frequence, graine = 1) {
  const positions = geometrie.attributes.position
  const point = new THREE.Vector3()
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i)
    const longueur = point.length()
    if (longueur < 1e-6) continue
    const deformation =
      Math.sin(point.x * frequence + graine) *
      Math.sin(point.y * frequence * 1.31 + graine * 2.3) *
      Math.sin(point.z * frequence * 0.87 + graine * 3.7)
    point.multiplyScalar(1 + deformation * amplitude)
    positions.setXYZ(i, point.x, point.y, point.z)
  }
  positions.needsUpdate = true
  geometrie.computeVertexNormals()
  return geometrie
}

/**
 * Propriétés de matériau communes.
 *
 * `opacite` est l'estompage de disparition calculé par la scène ; il se
 * multiplie à la transparence propre du matériau (une enveloppe virale est
 * translucide en permanence). On ne bascule en mode transparent que si c'est
 * réellement nécessaire : un matériau transparent désactive l'écriture dans le
 * tampon de profondeur et coûte un tri supplémentaire à chaque image.
 */
function materiau(couleur, opacite, extra = {}) {
  const { opacity: opacitePropre = 1, ...reste } = extra
  const finale = opacite * opacitePropre
  return {
    color: couleur,
    roughness: 0.55,
    metalness: 0.05,
    ...reste,
    transparent: finale < 0.999,
    opacity: finale,
    depthWrite: finale > 0.95,
  }
}

// ---------------------------------------------------------------------------
// Virus de la grippe — sphère hérissée de spicules HA et NA
// ---------------------------------------------------------------------------

function Grippe({ detail, opacite }) {
  const couleur = couleurs.virus

  const enveloppe = useMemo(() => {
    const geometrie = new THREE.SphereGeometry(0.42, detail === 0 ? 16 : 40, detail === 0 ? 12 : 28)
    if (detail > 0) bosseler(geometrie, 0.05, 9, 1.7)
    return geometrie
  }, [detail])

  const spicules = useMemo(
    () => (detail === 0 ? null : piquantsSurSphere(0.42, detail === 1 ? 70 : 190, 0.08, 0.014)),
    [detail],
  )

  return (
    <group position={[0, 0.5, 0]}>
      <mesh geometry={enveloppe}>
        <meshStandardMaterial {...materiau(couleur, opacite)} />
      </mesh>
      {spicules && (
        <mesh geometry={spicules}>
          <meshStandardMaterial {...materiau('#f0a09c', opacite, { roughness: 0.4 })} />
        </mesh>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Virus de l'herpès — capside icosaédrique dans une enveloppe lipidique
// ---------------------------------------------------------------------------

function Herpes({ detail, opacite }) {
  const couleur = couleurs.virus

  const capside = useMemo(() => new THREE.IcosahedronGeometry(0.3, 1), [])
  const spicules = useMemo(() => (detail < 2 ? null : piquantsSurSphere(0.46, 150, 0.04, 0.012)), [detail])

  if (detail === 0) {
    return (
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshStandardMaterial {...materiau(couleur, opacite)} />
      </mesh>
    )
  }

  return (
    <group position={[0, 0.5, 0]}>
      {/* Enveloppe lipidique, translucide : c'est elle qui fait passer le
          virion de 125 nm (capside seule) à 200 nm. */}
      <mesh>
        <sphereGeometry args={[0.46, 40, 28]} />
        <meshStandardMaterial
          {...materiau(couleur, opacite, { opacity: 0.28, roughness: 0.15, side: THREE.DoubleSide })}
        />
      </mesh>
      {/* Tégument, la couche protéique intermédiaire. */}
      <mesh>
        <sphereGeometry args={[0.39, 28, 20]} />
        <meshStandardMaterial {...materiau('#b8524f', opacite, { opacity: 0.45, roughness: 0.8 })} />
      </mesh>
      {/* Capside : icosaèdre à facettes franches, volontairement non lissé. */}
      <mesh geometry={capside}>
        <meshStandardMaterial {...materiau('#8f3a38', opacite, { flatShading: true, roughness: 0.45 })} />
      </mesh>
      {spicules && (
        <mesh geometry={spicules}>
          <meshStandardMaterial {...materiau('#e89b98', opacite, { roughness: 0.4 })} />
        </mesh>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Staphylocoque — une coque, accompagnée de ses voisines en amas
// ---------------------------------------------------------------------------

function Staphylocoque({ detail, opacite, compact }) {
  const couleur = couleurs.bacterie

  const principale = useMemo(() => {
    const geometrie = new THREE.SphereGeometry(0.5, detail === 0 ? 16 : 44, detail === 0 ? 12 : 30)
    if (detail > 0) bosseler(geometrie, 0.022, 14, 2.9)
    return geometrie
  }, [detail])

  // Les voisines sont dessinées à la MÊME taille que la principale : l'amas ne
  // doit surtout pas donner l'impression que la bactérie mesure 3 µm.
  const voisines = [
    { position: [0.78, 0.06, -0.5], echelle: 0.94 },
    { position: [-0.72, -0.04, -0.62], echelle: 0.88 },
    { position: [0.12, 0.84, -0.78], echelle: 0.82 },
  ]

  return (
    <group position={[0, 0.5, 0]}>
      <mesh geometry={principale}>
        <meshStandardMaterial {...materiau(couleur, opacite, { roughness: 0.62 })} />
      </mesh>
      {detail > 0 &&
        compact &&
        voisines.map((voisine, index) => (
          <mesh key={index} position={voisine.position} scale={voisine.echelle} geometry={principale}>
            <meshStandardMaterial {...materiau('#d9973a', opacite, { opacity: 0.88, roughness: 0.66 })} />
          </mesh>
        ))}
      {/* Sillon de division, visible seulement de près. */}
      {detail === 2 && (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.5, 0.018, 8, 48]} />
          <meshStandardMaterial {...materiau('#a06f22', opacite, { roughness: 0.8 })} />
        </mesh>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Escherichia coli — bâtonnet à flagelles
// ---------------------------------------------------------------------------

function EColi({ objet, detail, opacite, compact }) {
  const couleur = couleurs.bacterie
  const rayon = (objet.largeurNm / objet.longueurNm) * 0.5 // ≈ 0,18
  const corpsDroit = 1 - 2 * rayon

  const flagelles = useMemo(() => {
    if (detail === 0) return null
    const nombre = detail === 1 ? 3 : 5
    const morceaux = []
    for (let i = 0; i < nombre; i++) {
      const angle = (i / nombre) * Math.PI * 2 + 0.4
      const points = []
      for (let s = 0; s <= 22; s++) {
        const t = s / 22
        const avance = 0.5 + t * 0.72
        const amplitude = 0.055 * Math.min(1, t * 3)
        const phase = t * 16 + angle
        points.push(
          new THREE.Vector3(
            avance,
            Math.sin(phase) * amplitude + Math.sin(angle) * 0.12 * t,
            Math.cos(phase) * amplitude + Math.cos(angle) * 0.12 * t,
          ),
        )
      }
      const courbe = new THREE.CatmullRomCurve3(points)
      morceaux.push(new THREE.TubeGeometry(courbe, 30, 0.0075, 5, false))
    }
    return mergeGeometries(morceaux, false)
  }, [detail])

  const pili = useMemo(
    () => (detail < 2 ? null : piquantsSurCapsule(rayon * 0.97, corpsDroit / 2, 80, 0.05, 0.005)),
    [corpsDroit, detail, rayon],
  )

  return (
    <group position={[0, rayon, 0]}>
      {/* Capsule couchée : la géométrie est verticale par défaut, on la bascule. */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[rayon, corpsDroit, detail === 0 ? 4 : 10, detail === 0 ? 12 : 32]} />
        <meshStandardMaterial {...materiau(couleur, opacite, { roughness: 0.5 })} />
      </mesh>
      {pili && (
        <mesh geometry={pili}>
          <meshStandardMaterial {...materiau('#d8b070', opacite, { roughness: 0.7 })} />
        </mesh>
      )}
      {flagelles && compact && (
        <mesh geometry={flagelles}>
          <meshStandardMaterial {...materiau('#e8c98a', opacite, { roughness: 0.4 })} />
        </mesh>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Candida albicans — levure ovale en cours de bourgeonnement
// ---------------------------------------------------------------------------

function Candida({ objet, detail, opacite, compact }) {
  const couleur = couleurs.levure
  const largeur = objet.largeurNm / objet.longueurNm // ≈ 0,75

  const corps = useMemo(() => {
    const geometrie = new THREE.SphereGeometry(0.5, detail === 0 ? 16 : 40, detail === 0 ? 12 : 28)
    if (detail > 0) bosseler(geometrie, 0.03, 7, 4.1)
    return geometrie
  }, [detail])

  return (
    <group position={[0, 0.5, 0]}>
      <mesh geometry={corps} scale={[largeur, 1, largeur]}>
        <meshStandardMaterial {...materiau(couleur, opacite, { roughness: 0.48 })} />
      </mesh>
      {/* Le bourgeon : c'est ainsi que la levure se multiplie. Il dépasse
          volontairement du gabarit, comme dans la réalité. */}
      {detail > 0 && compact && (
        <mesh geometry={corps} position={[largeur * 0.42, 0.44, 0.05]} scale={0.44 * largeur}>
          <meshStandardMaterial {...materiau('#93c483', opacite, { roughness: 0.45 })} />
        </mesh>
      )}
      {/* Cicatrice laissée par un bourgeonnement précédent : un léger creux
          plaqué contre la paroi, et non un anneau détaché — un tore posé là se
          lirait comme une anse accrochée à la levure. */}
      {detail === 2 && (
        <mesh position={[-largeur * 0.36, -0.16, 0.08]} rotation={[0.3, 0, 1.15]} scale={[1, 0.3, 1]}>
          <sphereGeometry args={[0.11, 18, 12]} />
          <meshStandardMaterial {...materiau('#5f8f52', opacite, { roughness: 0.85 })} />
        </mesh>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Globule rouge — disque biconcave
// ---------------------------------------------------------------------------

function GlobuleRouge({ objet, detail, opacite }) {
  const couleur = couleursRendu.globule
  const epaisseur = objet.epaisseurNm / objet.longueurNm // ≈ 0,29

  const geometrie = useMemo(() => {
    // Profil biconcave classique d'Evans & Fung : creusé au centre, renflé aux
    // deux tiers du rayon. C'est cette forme qui permet au globule de se
    // déformer pour traverser des capillaires plus étroits que lui.
    const demiEpaisseurMax = epaisseur / 2
    const normalisation = 0.647 // valeur maximale du polynôme ci-dessous
    const demiEpaisseur = (rho) =>
      (demiEpaisseurMax / normalisation) *
      Math.sqrt(Math.max(0, 1 - rho * rho)) *
      (0.207 + 2.003 * rho * rho - 1.123 * Math.pow(rho, 4))

    const pas = detail === 0 ? 10 : 26
    const points = []
    // LE SENS DE PARCOURS DU PROFIL DÉCIDE DE QUEL CÔTÉ LA SURFACE EST VISIBLE.
    // Parcouru à l'envers, le globule se retrouvait retourné comme un gant :
    // ses faces avant étant éliminées par le rendu, on voyait l'intérieur de sa
    // paroi arrière et il devenait impossible de comprendre sa forme en tournant
    // autour — le creux central passait pour un trou.
    //
    // On descend donc la face inférieure du bord vers le centre, puis on remonte
    // la face supérieure du centre vers le bord.
    for (let i = pas; i >= 0; i--) {
      const rho = i / pas
      points.push(new THREE.Vector2(Math.max(1e-5, rho * 0.5), -demiEpaisseur(rho)))
    }
    for (let i = 0; i <= pas; i++) {
      const rho = i / pas
      points.push(new THREE.Vector2(Math.max(1e-5, rho * 0.5), demiEpaisseur(rho)))
    }
    const lathe = new THREE.LatheGeometry(points, detail === 0 ? 18 : 48)
    lathe.computeVertexNormals()

    // OMBRAGE DE LA CUVETTE, peint dans la géométrie.
    //
    // Le creux du globule descend d'à peine 16° : sous l'éclairage de la scène,
    // volontairement doux pour ne pas délaver les couleurs, cette pente ne
    // produit que 4 % d'écart de luminosité. Vu de dessus, le globule était donc
    // un disque rouge parfaitement plat, et sa forme — la seule chose qui le
    // distingue d'une pastille — restait invisible.
    //
    // On assombrit donc le fond de la cuvette et on laisse le bourrelet clair.
    // Ce n'est pas un artifice : une cuvette reçoit réellement moins de lumière
    // du ciel que le renflement qui l'entoure. C'est cet ombrage-là que dessinent
    // tous les manuels, et il rend la forme lisible d'un coup d'œil.
    const positions = lathe.attributes.position
    const teintes = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i++) {
      const rho = Math.min(1, Math.hypot(positions.getX(i), positions.getZ(i)) / 0.5)
      // Sombre jusqu'au fond du creux, clair dès le renflement des deux tiers.
      const t = Math.min(1, rho / 0.72)
      const facteur = 0.58 + 0.42 * t * t * (3 - 2 * t)
      teintes[i * 3] = facteur
      teintes[i * 3 + 1] = facteur
      teintes[i * 3 + 2] = facteur
    }
    lathe.setAttribute('color', new THREE.BufferAttribute(teintes, 3))

    return lathe
  }, [detail, epaisseur])

  return (
    <group position={[0, epaisseur / 2, 0]}>
      <mesh geometry={geometrie}>
        <meshStandardMaterial
          {...materiau(couleur, opacite, {
            roughness: 0.35,
            metalness: 0.1,
            // Ceinture et bretelles, sur le seul objet de la frise dont la
            // surface se replie sur elle-même : quel que soit le sens dans
            // lequel la révolution engendre ses faces, aucune ne peut manquer à
            // l'appel et laisser voir l'intérieur du globule.
            side: THREE.DoubleSide,
            vertexColors: true,
          })}
        />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Cellule de la joue — très large et très plate
// ---------------------------------------------------------------------------

function CelluleJoue({ objet, detail, opacite }) {
  const couleur = couleursRendu.cellulejoue
  const epaisseur = objet.epaisseurNm / objet.longueurNm // ≈ 0,05
  const largeur = objet.largeurNm / objet.longueurNm

  const membrane = useMemo(() => {
    const geometrie = new THREE.SphereGeometry(0.5, detail === 0 ? 16 : 48, detail === 0 ? 10 : 32)
    // Contour irrégulier : une cellule épithéliale n'est jamais un disque net.
    if (detail > 0) bosseler(geometrie, 0.075, 5.5, 6.3)

    // RENFLEMENT CENTRAL. Aplatie d'un facteur 20, la cellule se réduisait à une
    // crêpe uniforme : la sphère écrasée garde son profil, mais sa pente devient
    // vingt fois plus douce et ne renvoie plus aucun modelé. On amincit donc les
    // bords en gardant l'épaisseur annoncée au centre — l'ordre de grandeur, qui
    // est le sujet de l'application, reste exact, et la cellule reprend le
    // galbe qu'elle a réellement autour de son noyau.
    const positions = geometrie.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const rayon = Math.hypot(positions.getX(i), positions.getZ(i)) / 0.5
      positions.setY(i, positions.getY(i) * (0.35 + 0.65 * Math.exp(-2.2 * rayon * rayon)))
    }
    positions.needsUpdate = true
    // Indispensable après la déformation : ce sont les normales recalculées qui
    // font exister le galbe pour la lumière, pas le déplacement lui-même.
    geometrie.computeVertexNormals()

    return geometrie
  }, [detail])

  return (
    <group position={[0, epaisseur / 2, 0]}>
      {/* Opacité : assez translucide pour laisser voir le noyau, qui est à
          l'intérieur et qui est justement ce qui distingue cette cellule d'un
          globule rouge. C'est ce compromis qui la fixe, pas l'esthétique. */}
      <mesh geometry={membrane} scale={[1, epaisseur, largeur]}>
        <meshStandardMaterial
          {...materiau(couleur, opacite, {
            opacity: 0.82,
            roughness: 0.3,
            side: THREE.DoubleSide,
            // Une surface translucide devant un fond presque noir laisse passer
            // ce noir et vire au brun. Ce très léger auto-éclairage compense
            // exactement cela : la cellule reste rosée sans devenir lumineuse.
            emissive: couleur,
            emissiveIntensity: 0.22,
          })}
        />
      </mesh>
      {/* Noyau : environ 10 µm, soit un sixième de la cellule. C'est ce qui la
          distingue d'un globule rouge, qui lui n'en a pas. */}
      {detail > 0 && (
        <mesh scale={[0.17, epaisseur * 0.85, 0.17]}>
          <sphereGeometry args={[0.5, 24, 16]} />
          <meshStandardMaterial {...materiau(couleurNoyau, opacite, { roughness: 0.5 })} />
        </mesh>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Cheveu — traverse tout le champ de vision
// ---------------------------------------------------------------------------

function Cheveu({ detail, opacite, longueurPx, hauteurViewport }) {
  // Teinte propre, plus chaude que le gris des repères : un cheveu rendu dans
  // le gris neutre du grain de sel se lit comme une barre métallique.
  const couleur = '#9c8368'

  // Le cheveu n'a pas de longueur pertinente : seule son ÉPAISSEUR compte. On
  // le fait donc traverser tout l'écran quelle que soit l'échelle. Sa longueur
  // en unités locales doit compenser le redimensionnement de la scène — sans
  // quoi il s'allongerait avec le zoom au lieu de rester traversant.
  const longueurExacte = Math.min(500, (4 * hauteurViewport) / Math.max(longueurPx, 1))

  // Cette longueur change à CHAQUE image. Si on la mettait telle quelle dans
  // les dépendances du useMemo, la géométrie de la cuticule — 120 segments —
  // serait reconstruite 60 fois par seconde. On la quantifie donc par
  // demi-octaves : la géométrie n'est refaite qu'en franchissant un palier,
  // soit une poignée de fois sur toute la plage de zoom.
  const palier = Math.round(Math.log2(longueurExacte) * 2)
  const longueurLocale = Math.pow(2, palier / 2)

  const geometrie = useMemo(() => {
    if (detail < 2) return null
    // Écailles de la cuticule : le rayon est modulé en dents de scie le long de
    // l'axe, ce qui produit des plaques qui se chevauchent comme des tuiles.
    const segments = 140
    const profil = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const dent = (t * segments * 0.22) % 1
      profil.push([(t - 0.5) * longueurLocale, 0.5 * (1 + 0.05 * dent)])
    }
    return solideDeRevolution(profil, 28)
  }, [detail, longueurLocale])

  if (geometrie) {
    return (
      <mesh geometry={geometrie}>
        <meshStandardMaterial {...materiau(couleur, opacite, { roughness: 0.42, metalness: 0.12 })} />
      </mesh>
    )
  }

  return (
    <mesh>
      <cylinderGeometry args={[0.5, 0.5, longueurLocale, detail === 0 ? 10 : 28]} />
      <meshStandardMaterial {...materiau(couleur, opacite, { roughness: 0.42, metalness: 0.12 })} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Demodex folliculorum — l'acarien à huit pattes
// ---------------------------------------------------------------------------
//
//  SEUL OBJET À UTILISER UN FICHIER 3D EXTERNE, et c'est assumé : un acarien
//  est un animal, avec une tête, des pattes articulées et une cuticule ; aucun
//  empilement de primitives ne donne cela de façon convaincante. Le modèle a
//  été sculpté à part et fourni par l'enseignant.
//
//  PRÉPARATION DU FICHIER (à refaire à l'identique si le modèle est remplacé) —
//  le fichier livré pesait 80 Mo et 1,95 million de triangles, ce qui est
//  impossible à mettre en cache sur des tablettes pour un objet qui occupe au
//  plus quelques centaines de pixels :
//
//      npx @gltf-transform/cli weld     source.glb w.glb
//      npx @gltf-transform/cli simplify w.glb s.glb --ratio 0.03 --error 0.002
//      npx @gltf-transform/cli resize   s.glb r.glb --width 1024 --height 1024
//      npx @gltf-transform/cli meshopt  r.glb src/assets/demodex.glb --level medium
//
//  Résultat : 1,1 Mo, 58 000 triangles, aucune différence visible à l'écran.
//  La compression Meshopt est décodée par un module JavaScript embarqué dans le
//  bundle — contrairement à Draco, qui exigerait de déposer un décodeur WebAssembly
//  à côté et de le servir séparément, donc un fichier de plus à ne pas oublier
//  pour le hors-ligne.
//
//  Le chargement est ASYNCHRONE et n'utilise pas <Suspense> : tant que le
//  fichier n'est pas là — et définitivement s'il manque ou s'il est corrompu —
//  c'est le modèle procédural ci-dessous qui s'affiche. L'application ne montre
//  jamais un trou à la place de l'acarien.

/**
 * Rotation appliquée au modèle avant normalisation.
 *
 * Le fichier sculpté est orienté Y vers le haut, corps allongé selon Z. La
 * frise, elle, aligne tous les objets sur X, tête à gauche. Ce quart de tour
 * est le seul réglage à retoucher si un futur modèle arrive dans une autre
 * orientation.
 */
const ROTATION_DEMODEX = [0, -Math.PI / 2, 0]

let sceneDemodex = null
let chargementDemodex = null

/**
 * Met le modèle aux conventions de l'application : plus grande dimension = 1,
 * centré en X et en Z, pied posé sur y = 0. Exactement les deux règles imposées
 * aux modèles procéduraux, appliquées ici par calcul sur la boîte englobante
 * plutôt qu'à la main.
 */
function normaliserDemodex(racine) {
  racine.rotation.set(...ROTATION_DEMODEX)
  racine.updateMatrixWorld(true)

  const boite = new THREE.Box3().setFromObject(racine)
  const taille = boite.getSize(new THREE.Vector3())
  const centre = boite.getCenter(new THREE.Vector3())
  const facteur = 1 / Math.max(taille.x, taille.y, taille.z)

  const socle = new THREE.Group()
  socle.add(racine)
  socle.scale.setScalar(facteur)
  socle.position.set(-centre.x * facteur, -boite.min.y * facteur, -centre.z * facteur)

  // Les textures d'un modèle sculpté sont en espace sRGB ; sans cela, l'acarien
  // ressort délavé et jaunâtre.
  racine.traverse((noeud) => {
    if (!noeud.isMesh) return
    noeud.castShadow = false
    noeud.receiveShadow = false
    const materiaux = Array.isArray(noeud.material) ? noeud.material : [noeud.material]
    for (const m of materiaux) {
      if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace
    }
  })

  return socle
}

function chargerDemodex() {
  if (!chargementDemodex) {
    const chargeur = new GLTFLoader()
    chargeur.setMeshoptDecoder(MeshoptDecoder)
    chargementDemodex = chargeur
      .loadAsync(urlDemodex)
      .then((gltf) => {
        sceneDemodex = normaliserDemodex(gltf.scene)
        return sceneDemodex
      })
      .catch((erreur) => {
        // Le repli procédural prend le relais : on trace la cause en console
        // sans jamais interrompre la séance.
        console.warn('Modèle 3D du Demodex indisponible, repli sur le modèle simplifié.', erreur)
        return null
      })
  }
  return chargementDemodex
}

/** Charge le modèle une seule fois pour toute la durée de vie de la page. */
function useSceneDemodex() {
  const [scene, definirScene] = useState(sceneDemodex)

  useEffect(() => {
    if (scene) return
    let vivant = true
    chargerDemodex().then((resultat) => {
      if (vivant && resultat) definirScene(resultat)
    })
    return () => {
      vivant = false
    }
  }, [scene])

  return scene
}

function Demodex(proprietes) {
  const { opacite } = proprietes
  const scene = useSceneDemodex()

  // Une instance propre, avec ses propres matériaux : l'estompage de
  // disparition se règle par objet, il ne doit pas modifier le modèle partagé.
  const instance = useMemo(() => {
    if (!scene) return null
    const copie = scene.clone(true)
    copie.traverse((noeud) => {
      if (noeud.isMesh) noeud.material = noeud.material.clone()
    })
    return copie
  }, [scene])

  // L'opacité change à chaque image pendant une entrée ou une sortie de champ ;
  // on la pousse directement dans les matériaux plutôt que de reconstruire quoi
  // que ce soit.
  useLayoutEffect(() => {
    if (!instance) return
    instance.traverse((noeud) => {
      if (!noeud.isMesh) return
      noeud.material.transparent = opacite < 0.999
      noeud.material.opacity = opacite
      noeud.material.depthWrite = opacite > 0.95
    })
  }, [instance, opacite])

  if (!instance) return <DemodexProcedural {...proprietes} />

  return <primitive object={instance} />
}

/** Repli : construit en primitives, comme tous les autres objets de la frise. */
function DemodexProcedural({ objet, detail, opacite }) {
  const couleur = couleurs.animal
  const rayonMax = (objet.largeurNm / objet.longueurNm) * 0.5 // ≈ 0,064

  const corps = useMemo(() => {
    // Deux parties : le podosoma à l'avant, trapu, qui porte les pattes ; puis
    // l'opisthosoma, long, effilé et annelé, qui occupe les deux tiers arrière.
    const segments = detail === 0 ? 18 : 70
    const profil = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      let rayon
      if (t < 0.06) {
        rayon = rayonMax * (0.35 + (t / 0.06) * 0.55) // gnathosome, les pièces buccales
      } else if (t < 0.36) {
        rayon = rayonMax * (0.9 + 0.1 * Math.sin(((t - 0.06) / 0.3) * Math.PI)) // podosoma
      } else {
        const u = (t - 0.36) / 0.64
        rayon = rayonMax * (1 - 0.78 * Math.pow(u, 1.5)) // opisthosoma effilé
        if (detail === 2) rayon *= 1 + 0.085 * Math.sin(u * 34) // annelures
      }
      profil.push([t - 0.5, rayon])
    }
    return solideDeRevolution(profil, detail === 0 ? 10 : 24)
  }, [detail, rayonMax])

  const pattes = useMemo(() => {
    if (detail === 0) return null
    // Quatre paires, toutes implantées sur le podosoma — c'est le caractère
    // qui range Demodex parmi les acariens, donc parmi les animaux.
    const morceaux = []
    const positions = [-0.4, -0.33, -0.26, -0.19]
    for (const x of positions) {
      for (const cote of [-1, 1]) {
        const longueur = rayonMax * 1.5
        const patte = new THREE.CapsuleGeometry(rayonMax * 0.22, longueur, 3, 7)
        patte.rotateX((cote * Math.PI) / 3.1)
        patte.translate(x, -rayonMax * 0.5, cote * (rayonMax * 0.75 + longueur * 0.3))
        morceaux.push(patte)
      }
    }
    return mergeGeometries(morceaux, false)
  }, [detail, rayonMax])

  return (
    <group position={[0, rayonMax, 0]} rotation={[0, 0, 0]}>
      <mesh geometry={corps} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial {...materiau(couleur, opacite, { roughness: 0.42 })} />
      </mesh>
      {pattes && (
        <mesh geometry={pattes}>
          <meshStandardMaterial {...materiau('#7d5296', opacite, { roughness: 0.5 })} />
        </mesh>
      )}
      {/* Pièces buccales, visibles seulement de très près. */}
      {detail === 2 && (
        <mesh position={[-0.505, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[rayonMax * 0.42, rayonMax * 1.1, 10]} />
          <meshStandardMaterial {...materiau('#5f3b76', opacite, { roughness: 0.6 })} />
        </mesh>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Grain de sel — cristal cubique érodé
// ---------------------------------------------------------------------------

function GrainDeSel({ detail, opacite }) {
  const couleur = couleurs.repere

  const geometrie = useMemo(() => {
    const subdivisions = detail === 0 ? 1 : 8
    const cube = new THREE.BoxGeometry(1, 1, 1, subdivisions, subdivisions, subdivisions)
    if (detail === 0) return cube

    // On arrondit légèrement les arêtes en tirant chaque sommet vers une
    // super-ellipsoïde, puis on érode la surface : un vrai grain de sel de table
    // n'est jamais un cube géométriquement parfait.
    const positions = cube.attributes.position
    const point = new THREE.Vector3()
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i)
      const norme = Math.pow(
        Math.pow(Math.abs(point.x * 2), 8) + Math.pow(Math.abs(point.y * 2), 8) + Math.pow(Math.abs(point.z * 2), 8),
        1 / 8,
      )
      if (norme > 1e-6) point.multiplyScalar(0.98 / norme)
      if (detail === 2) {
        const erosion = 1 + (bruit(i * 1.7) - 0.5) * 0.035
        point.multiplyScalar(erosion)
      }
      positions.setXYZ(i, point.x, point.y, point.z)
    }
    positions.needsUpdate = true
    cube.computeVertexNormals()
    return cube
  }, [detail])

  return (
    <mesh position={[0, 0.5, 0]} geometry={geometrie} rotation={[0.1, 0.5, 0.06]}>
      <meshStandardMaterial {...materiau('#e6eaf0', opacite, { opacity: 0.9, roughness: 0.18 })} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Répartition
// ---------------------------------------------------------------------------

const MODELES = {
  grippe: Grippe,
  herpes: Herpes,
  staph: Staphylocoque,
  ecoli: EColi,
  candida: Candida,
  globule: GlobuleRouge,
  cellulejoue: CelluleJoue,
  cheveu: Cheveu,
  demodex: Demodex,
  sel: GrainDeSel,
}

export function Modele({ objet, detail, opacite, longueurPx, hauteurViewport }) {
  const Composant = MODELES[objet.id]

  /**
   * Un objet « compact » tient à peu près dans le cadre. Un objet non compact
   * est en train de balayer l'écran en arrivant par la droite : on n'en voit
   * qu'un arc, dix fois plus grand que le viewport.
   *
   * Cette distinction n'est pas cosmétique, elle corrige un vrai défaut. Les
   * éléments décoratifs qui débordent du gabarit — les coques voisines de
   * l'amas de staphylocoques, les flagelles d'E. coli, le bourgeon de la
   * levure — sont placés à plusieurs fois le rayon de l'objet. Quand l'objet
   * fait dix fois l'écran, ces éléments atterrissent en plein milieu du cadre
   * et le recouvrent d'un aplat de couleur : on ne voit alors plus rien, ni
   * l'objet géant, ni celui qui est réellement à l'échelle.
   *
   * Le culling ne peut pas les rattraper : il raisonne sur la taille déclarée
   * de l'objet, pas sur celle de ses satellites. On les retire donc à la
   * source, ce qui ne coûte rien puisqu'à cette taille on n'en voit de toute
   * façon qu'un fragment.
   */
  const compact = longueurPx <= 1.5 * hauteurViewport

  // Repli : un objet ajouté au fichier de données sans modèle dédié s'affiche
  // quand même, sous forme de sphère. L'application ne casse jamais.
  if (!Composant) {
    return (
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.5, 24, 16]} />
        <meshStandardMaterial {...materiau(couleurs[objet.categorie] || '#888', opacite)} />
      </mesh>
    )
  }

  return (
    <Composant
      objet={objet}
      detail={detail}
      opacite={opacite}
      compact={compact}
      longueurPx={longueurPx}
      hauteurViewport={hauteurViewport}
    />
  )
}
