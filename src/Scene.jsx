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
import { choisirBarreEchelle, LIGNE_BASE_FRACTION } from './echelle.js'
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

/**
 * Le carrelage du sol.
 *
 * Une tuile peinte une fois — deux traits clairs sur deux bords — que la carte
 * graphique répète des centaines de fois. C'est très exactement ce pour quoi les
 * textures existent, et ça vaut mieux ici que des milliers de segments : les
 * mipmaps fondent d'elles-mêmes les lignes en un gris uni là où le sol fuit vers
 * le lointain, alors que des lignes géométriques y produiraient un moiré qui
 * scintille au moindre mouvement.
 *
 * Les valeurs sont en NIVEAUX DE GRIS, jamais en couleur : le matériau les
 * multiplie par sa propre couleur, c'est donc lui qui donne le ton du sol, et
 * cette tuile ne décide que du contraste entre le trait et le carreau.
 */
function useTextureGrille() {
  const gl = useThree((etat) => etat.gl)

  return useMemo(() => {
    const cote = 256
    const canvas = document.createElement('canvas')
    canvas.width = cote
    canvas.height = cote
    const contexte = canvas.getContext('2d')
    contexte.fillStyle = '#8a8a8a'
    contexte.fillRect(0, 0, cote, cote)
    contexte.fillStyle = '#ffffff'
    contexte.fillRect(0, 0, cote, 3)
    contexte.fillRect(0, 0, 3, cote)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    // Sans filtrage anisotrope, un carrelage vu en enfilade se réduit à une
    // bouillie grise à quelques carreaux de distance seulement.
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return texture
  }, [gl])
}

/**
 * Le sol sur lequel tous les objets sont posés — il ancre la rotation.
 *
 * Il est PLEIN, et non plus translucide : c'est lui qui répond à la question
 * « où est le bas ? ». Une surface qu'on traverse du regard ne la posait pas.
 * Combiné au bridage de l'élévation à l'horizontale (voir `gestes.js`), il rend
 * la scène impossible à retourner : on tourne autour des objets, jamais en
 * dessous d'eux.
 *
 * LE CÔTÉ D'UN CARREAU EST CELUI DE LA BARRE D'ÉCHELLE, au pixel près — même
 * fonction, même appel. Un quadrillage décoratif, au pas arbitraire, aurait
 * suggéré une unité inexistante à des élèves qui passent leur année à mesurer
 * sur du papier millimétré. Celui-ci se lit : la barre, en haut à droite, donne
 * la longueur réelle d'un carreau, et le carrelage étend cette mesure à tout
 * l'écran. Il change de pas en même temps qu'elle au fil du zoom.
 */
function Sol({ ligneBase, largeur, hauteur, azimut, nmParPixel }) {
  const texture = useTextureGrille()

  // Dimensionné sur la plus grande dimension de l'écran, pas seulement sur la
  // largeur : sur une tablette tenue en portrait, un sol dimensionné en largeur
  // laisse voir ses propres bords en haut et en bas du cadre.
  const etendueVoulue = Math.max(largeur, hauteur) * 12

  // Un nombre PAIR de carreaux, et une étendue qui en est le multiple exact :
  // le plan est centré sur l'origine, une intersection du quadrillage tombe donc
  // pile sous le centre de la frise, et aucun carreau n'est coupé en deux au
  // bord de la texture.
  const { cote, carreaux } = useMemo(() => {
    const pas = choisirBarreEchelle(nmParPixel).largeurPx
    const nombre = Math.max(2, 2 * Math.ceil(etendueVoulue / (2 * pas)))
    return { cote: nombre * pas, carreaux: nombre }
  }, [nmParPixel, etendueVoulue])

  useLayoutEffect(() => {
    texture.repeat.set(carreaux, carreaux)
  }, [texture, carreaux])

  return (
    <group position={[0, ligneBase, 0]}>
      {/* Le carrelage NE TOURNE PAS avec l'orbite, et c'est lui qui rend la
          rotation lisible : ses lignes défilent et pivotent sous les objets,
          alors qu'un sol solidaire de la caméra resterait figé et ne dirait
          rien. C'était le défaut du sol uni précédent — on tournait sans voir
          qu'on tournait. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cote, cote]} />
        {/* Opaque et écrivant la profondeur : ce qui descend sous le sol est
            coupé net par lui, comme le serait un objet posé sur une table. */}
        <meshStandardMaterial map={texture} color="#5e7692" roughness={1} />
      </mesh>

      {/* Ligne de base proprement dite : c'est elle qui rend la comparaison des
          hauteurs immédiate. Elle, en revanche, TOURNE avec l'orbite. Fixe, elle
          s'enfoncerait vers l'horizon dès qu'on quitte la vue de face et
          barrerait l'écran en diagonale ; elle reste ainsi la ligne au sol sur
          laquelle tout est posé, vue de plein pied sous n'importe quel angle.
          Franchement au-dessus du plan du sol, jamais à cheval dessus : à ras,
          les deux surfaces se disputeraient le même pixel et la ligne
          scintillerait sur toute sa longueur. */}
      <group rotation={[0, azimut, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[cote, 1.5, 1.5]} />
          <meshBasicMaterial color="#7d93b3" />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Ombres de contact.
 *
 * Une tache sombre au sol sous chaque objet. Ce n'est pas une vraie ombre
 * calculée — il n'y a pas de shadow map dans cette scène, et il n'en faut pas :
 * elle coûterait cher pour un rendu que personne ne regarde. Elle répond à une
 * seule question, mais elle y répond mieux que tout le reste : cet objet
 * touche-t-il le sol, ou flotte-t-il ? Sans elle, à peine incliné, on ne sait
 * plus si un objet est petit et proche ou grand et lointain.
 *
 * Le dégradé est peint une fois dans un canvas et partagé par tous les objets.
 */
function useTextureOmbre() {
  return useMemo(() => {
    const cote = 128
    const canvas = document.createElement('canvas')
    canvas.width = cote
    canvas.height = cote
    const contexte = canvas.getContext('2d')
    const degrade = contexte.createRadialGradient(cote / 2, cote / 2, 0, cote / 2, cote / 2, cote / 2)
    // Peinte en BLANC, l'assombrissement venant de `color` sur le matériau :
    // une texture noire ne se teinte pas (tout produit avec 0 vaut 0) et rend
    // le réglage de l'ombre impossible à ajuster depuis le matériau.
    degrade.addColorStop(0, 'rgba(255, 255, 255, 0.75)')
    degrade.addColorStop(0.4, 'rgba(255, 255, 255, 0.42)')
    degrade.addColorStop(1, 'rgba(255, 255, 255, 0)')
    contexte.fillStyle = degrade
    contexte.fillRect(0, 0, cote, cote)
    return new THREE.CanvasTexture(canvas)
  }, [])
}

function Ombres({ visibles, ligneBase }) {
  const texture = useTextureOmbre()

  return (
    <>
      {visibles.map((visible) => (
        <mesh
          key={visible.objet.id}
          // Juste au-dessus du sol : posée dessus, elle disputerait ses pixels
          // au plan et clignoterait.
          position={[visible.x, ligneBase + 2, visible.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={visible.longueurPx * 2.1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={texture}
            color="#05070b"
            transparent
            // Elle s'efface avec son objet, sinon une ombre resterait au sol
            // sous un objet devenu invisible.
            opacity={visible.opacite}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
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
      <Sol
        ligneBase={ligneBase}
        largeur={largeur}
        hauteur={hauteur}
        azimut={azimut}
        nmParPixel={nmParPixel}
      />
      <Ombres visibles={visibles} ligneBase={ligneBase} />
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
        // Brouillard réglé sur la MOITIÉ LOINTAINE DU SOL, et sur elle seule.
        // La caméra étant à distance fixe, les objets sont tous à peu près à
        // `DISTANCE_CAMERA` : commencer le brouillard au-delà garantit qu'aucun
        // d'eux n'est terni, alors que le carrelage, lui, s'enfonce jusqu'à
        // 7 000 unités plus loin et s'éteint progressivement dans le noir du
        // fond. Sans cela le quadrillage remplit l'écran jusqu'en haut et
        // dispute l'attention aux objets, qui sont le sujet.
        scene.fog = new THREE.Fog('#0b0f16', DISTANCE_CAMERA + 600, DISTANCE_CAMERA + 6500)
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
