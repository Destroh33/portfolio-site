import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useStore } from '@nanostores/react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import SpaceDust from './SpaceDust'
import CameraRig from './CameraRig'
import Ship from './Ship'
import IntroPlanet from './IntroPlanet'
import HeroSurfaceCard from './HeroSurfaceCard'
import ProjectPlanets from './ProjectPlanets'
import AsteroidBelt from './AsteroidBelt'
import SpaceStation from './SpaceStation'
import FlybyBlurbs from './FlybyBlurbs'
import VolumetricNebula from './VolumetricNebula'
import BackgroundStars from './BackgroundStars'
import { perfTierAtom } from '../../stores/device'
// Note: the old camera-following <Starfield> was removed — at 10x world scale
// its tiny-radius points formed a "ghost" clump that dragged with the camera.
// BackgroundStars (fixed deep field) is the only star layer now.

// Ship in its chase rig. (The engine trail was removed — the thruster flame
// alone carries the exhaust look; Ship's thrusterAnchor prop remains unused
// but wired in case a trail returns.)
function ShipRig() {
  return (
    <CameraRig>
      <Ship />
    </CameraRig>
  )
}

// Fixed full-viewport background layer. client:load (not client:visible/idle)
// because this canvas is the persistent backdrop for the whole scroll
// experience and must be ready before the user's first scroll.
export default function SceneCanvas() {
  // Bloom (blur + composite) is gated on the device's perf tier, decided once
  // at load from cheap device signals (cores / memory / coarse-pointer) in
  // stores/device.ts. Low-tier devices skip Bloom; everyone keeps Vignette,
  // which is a single near-free gradient pass. This is a one-time decision on
  // purpose — a live FPS monitor was tried and removed because its constant
  // quality-probing flip-flopped Bloom on and off, which visibly flickered.
  const bloomEnabled = useStore(perfTierAtom) === 'high'

  // Canvas accepts pointer events (for the interactive asteroid field); the DOM
  // content layer (main) is pointer-events:none except its own interactive
  // children, so it doesn't block raycasts. See global.css.
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'auto' }}>
      <Canvas
        camera={{ fov: 60, near: 1, far: 60000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: false }}
      >
        <color attach="background" args={['#04050b']} />

        {/* Lighting rig: dim ambient fill + a warm "sun" key light from one
            side + a cool rim from the other, so planets read as lit spheres
            with a bright edge rather than flat discs. */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[4000, 3000, 2000]} intensity={2.4} color="#fff2d6" />
        <directionalLight position={[-5000, -1000, -3000]} intensity={0.6} color="#4a6bd6" />

        <BackgroundStars />
        <VolumetricNebula />
        <IntroPlanet />
        {/* GLTF-loading components suspend while their models stream in. */}
        <Suspense fallback={null}>
          <AsteroidBelt />
          <ShipRig />
        </Suspense>
        <HeroSurfaceCard />
        <ProjectPlanets />
        <SpaceStation />
        <FlybyBlurbs />
        <SpaceDust />

        {/* bloomEnabled is fixed for the session, so these branches never swap
            at runtime — no composer remount, no flicker. */}
        {bloomEnabled ? (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.8} luminanceThreshold={0.65} luminanceSmoothing={0.25} />
            <Vignette eskil={false} offset={0.3} darkness={0.7} />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={0}>
            <Vignette eskil={false} offset={0.3} darkness={0.7} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
