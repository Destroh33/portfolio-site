import { useMemo } from 'react'
import { useGLTF, Clone } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

const URL = '/models/asteroid_01/scene.gltf'

type Props = ThreeElements['group'] & { radius: number }

// Shared asteroid mesh (public/models/asteroid_01, textured GLTF). `radius`
// is the desired world bounding-sphere radius — the raw model (which has
// arbitrary nested Sketchfab scaling) is normalized at runtime so callers
// think purely in world units. <Clone> shares geometry/materials across all
// instances (intro asteroid + the belt) — one GPU upload total.
export default function AsteroidModel({ radius, ...rest }: Props) {
  const { scene } = useGLTF(URL)
  const norm = useMemo(() => {
    // Low-poly look: re-material the mesh as flat-shaded solid stone — the
    // faceted shading over the lumpy geometry matches the site's low-poly
    // aesthetic. (The GLTF's photoreal PBR textures were stripped from
    // scene.gltf itself, so nothing is fetched for them.) Materials are
    // shared by all <Clone> instances, so this one-time swap covers every
    // asteroid.
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#8f887c',
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    })
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) mesh.material = rockMat
    })
    const sphere = new THREE.Box3().setFromObject(scene).getBoundingSphere(new THREE.Sphere())
    return sphere.radius > 0 ? 1 / sphere.radius : 1
  }, [scene])

  return (
    <group {...rest}>
      <Clone object={scene} scale={radius * norm} />
    </group>
  )
}

useGLTF.preload(URL)
