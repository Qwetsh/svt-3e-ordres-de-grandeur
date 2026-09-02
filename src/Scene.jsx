/**
 * ============================================================================
 *  LA SCÈNE 3D
 * ============================================================================
 *
 *  CAMÉRA ORTHOGRAPHIQUE, et ce n'est pas un choix esthétique.
 *
 *  En projection perspective, la taille apparente d'un objet dépend de sa
 *  distance à la caméra. Deux objets de même taille réelle placés à deux
 *  endroits de la frise apparaîtraient de tailles différentes — ce qui
 *  détruirait le seul objectif de cette application. En orthographique, la
 *  taille à l'écran ne dépend QUE de la taille réelle. On garde le volume,
 *  l'ombrage et la rotation ; on perd seulement la fuite des lignes.
 *
 *  CONVENTION : React Three Fiber cadre par défaut une caméra orthographique
 *  exactement sur les dimensions du canvas en pixels. Une unité monde vaut donc
 *  très précisément un pixel CSS, ce qui rend tous les calculs directement
 *  lisibles et vérifiables.
 *
 *  LA CAMÉRA NE SE RAPPROCHE JAMAIS. Elle reste à distance fixe et ne fait que
 *  tourner ; c'est la SCÈNE qui est redimensionnée à chaque image. C'est ce qui
 *  permet de traverser quatre ordres de grandeur sans jamais sortir de la plage
 *  de précision des flottants 32 bits de WebGL.
 */

import { useLayoutEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Modele } from './modeles.jsx'
import { LIGNE_BASE_FRACTION } from './echelle.js'
import { limiteOeilNu } from './donnees.js'

/** Distance fixe de la caméra. Sans effet sur la taille apparente (orthographique). */
const DISTANCE_CAMERA = 30000

function Camera({ azimut, elevation }) {
  const camera = useThree((etat) => etat.camera)

  useLayoutEffect(() => {
    const ce = Math.cos(elevation)
    camera.position.set(
      DISTANCE_CAMERA * Math.sin(azimut) * ce,
      DISTANCE_CAMERA * Math.sin(elevation),
      DISTANCE_CAMERA * Math.cos(azimut) * ce,
    )
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
    camera.near = 1
    camera.far = DISTANCE_CAMERA * 2
    camera.updateProjectionMatrix()
  }, [camera, azimut, elevation])

  return null
}

function Eclairage() {
  return (
    <>
      {/* Les lumières sont fixes dans le monde, pas attachées à la caméra :
          c'est ce qui fait que l'ombrage change quand on tourne autour, et
          donc que le relief se lit. */}
      {/* Intensités volontairement mesurées. Une scène surexposée délave les
          couleurs jusqu'au blanc, et c'est précisément la couleur qui distingue
          ici un virus d'une bactérie ou d'une cellule : la sur-illumination
          détruirait l'information, pas seulement l'esthétique. */}
      <ambientLight intensity={0.85} />
      <directionalLight position={[4000, 8000, 6000]} intensity={1.5} />
      <directionalLight position={[-6000, 2000, -4000]} intensity={0.55} color="#9fc4e8" />
      <directionalLight position={[0, -4000, 2000]} intensity={0.25} color="#ffd9b0" />
    </>
  )
}

/** Le sol sur lequel tous les objets sont posés — il ancre la rotation. */
function Sol({ ligneBase, largeur, hauteur, azimut }) {
  // Dimensionné sur la plus grande dimension de l'écran, pas seulement sur la
  // largeur : sur une tablette tenue en portrait, un sol dimensionné en largeur
  // laisse voir ses propres bords en haut et en bas du cadre.
  const etendue = Math.max(largeur, hauteur) * 12

  return (
    // Le sol TOURNE avec l'orbite. Le plan, carré et immense, est indifférent à
    // cette rotation ; c'est le trait de la ligne de base qui a besoin d'elle.
    // Fixe, ce trait s'enfoncerait vers l'horizon dès qu'on quitte la vue de
    // face et barrerait l'écran en diagonale. Il reste ainsi ce qu'il est : la
    // ligne au sol sur laquelle tout est posé, vue de plein pied sous
    // n'importe quel angle.
    <group position={[0, ligneBase, 0]} rotation={[0, azimut, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[etendue, etendue]} />
        <meshStandardMaterial color="#141a24" roughness={1} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* Ligne de base proprement dite : c'est elle qui rend la comparaison
          des hauteurs immédiate. */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[etendue, 1.5, 1.5]} />
        <meshBasicMaterial color="#3d4c63" transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

/**
 * La bande « limite de l'œil nu ».
 *
 * Représentée comme une dalle horizontale flottante, et non comme un trait
 * vertical : ce qui compte, c'est la HAUTEUR atteinte par un objet. Tout ce qui
 * dépasse au-dessus de la dalle est visible à l'œil nu, tout ce qui reste en
 * dessous ne l'est pas. Pendant le zoom, la dalle descend visiblement et
 * traverse les objets les uns après les autres.
 */
function BandeOeilNu({ nmParPixel, ligneBase, largeur, hauteur, azimut }) {
  const basPx = limiteOeilNu.basNm / nmParPixel
  const hautPx = limiteOeilNu.hautNm / nmParPixel

  // Culling : quand on est très zoomé, la bande est à des centaines de milliers
  // de pixels au-dessus de l'écran. Inutile de la dessiner.
  if (basPx > 4 * hauteur || hautPx < 2) return null

  const epaisseur = hautPx - basPx

  // La bande est dessinée à PLAT, dans le plan de l'écran, et non comme un
  // volume horizontal.
  //
  // C'est contre-intuitif dans une scène en 3D, mais c'est le seul rendu juste.
  // Un volume horizontal, même très mince, présente une profondeur : vu par une
  // caméra ne serait-ce que légèrement surélevée, cette profondeur se projette
  // et transforme un trait de 2 pixels en un ruban de cent pixels de haut. La
  // bande cesserait alors d'indiquer une hauteur pour devenir une nappe qui
  // recouvre la scène.
  //
  // Ce que la bande représente est une HAUTEUR, pas un objet : un plan
  // vertical face à la caméra la restitue exactement, à n'importe quel angle
  // d'orbite.
  const etendue = largeur * 6

  return (
    // La bande PIVOTE avec l'orbite pour rester face à la caméra. Un plan fixe
    // se verrait par la tranche dès un quart de tour et disparaîtrait purement
    // et simplement — alors que la hauteur qu'il indique, elle, reste vraie
    // sous tous les angles.
    <group position={[0, ligneBase + basPx + epaisseur / 2, 0]} rotation={[0, azimut, 0]}>
      <mesh>
        <planeGeometry args={[etendue, epaisseur]} />
        <meshBasicMaterial color="#ffd166" transparent opacity={0.11} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Les deux bords, tracés nettement : c'est leur franchissement par un
          objet qui doit se voir, pas le remplissage. */}
      {[-epaisseur / 2, epaisseur / 2].map((decalage, index) => (
        <mesh key={index} position={[0, decalage, 0]}>
          <planeGeometry args={[etendue, 2]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function Contenu({ visibles, nmParPixel, azimut, elevation, largeur, hauteur }) {
  const ligneBase = LIGNE_BASE_FRACTION * hauteur

  return (
    <>
      <Camera azimut={azimut} elevation={elevation} />
      <Eclairage />
      <Sol ligneBase={ligneBase} largeur={largeur} hauteur={hauteur} azimut={azimut} />
      <BandeOeilNu
        nmParPixel={nmParPixel}
        ligneBase={ligneBase}
        largeur={largeur}
        hauteur={hauteur}
        azimut={azimut}
      />

      {visibles.map((visible) => (
        <group
          key={visible.objet.id}
          position={[visible.x, visible.y, visible.z]}
          // Le facteur d'échelle reste compris entre 1 et quelques milliers,
          // JAMAIS entre 1 et 10⁶ : c'est toute la différence entre une scène
          // stable et une scène qui tremble.
          scale={visible.longueurPx}
        >
          <Modele
            objet={visible.objet}
            detail={visible.detail}
            opacite={visible.opacite}
            longueurPx={visible.longueurPx}
            hauteurViewport={hauteur}
          />
        </group>
      ))}
    </>
  )
}

export function Scene({ visibles, nmParPixel, azimut, elevation, largeur, hauteur }) {
  const parametresGL = useMemo(
    () => ({ antialias: true, powerPreference: 'high-performance', alpha: false }),
    [],
  )

  return (
    <Canvas
      orthographic
      // Plafonné à 2 : sur un iPad Pro, un rapport de 3 triplerait le nombre de
      // pixels à calculer pour un gain visuel imperceptible à cette distance.
      dpr={[1, 2]}
      gl={parametresGL}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color('#0b0f16'))
        scene.fog = null
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <Contenu
        visibles={visibles}
        nmParPixel={nmParPixel}
        azimut={azimut}
        elevation={elevation}
        largeur={largeur}
        hauteur={hauteur}
      />
    </Canvas>
  )
}
