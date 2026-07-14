import { useMemo } from 'react'
import * as THREE from 'three'

interface Props {
  radius: number
  color: string
  power?: number
  intensity?: number
  /** Shell size as a multiple of radius — smaller = thinner rim band. */
  shell?: number
}

// A backface-rendered fresnel shell that hugs a planet/star and glows at its
// silhouette — cheap, shader-based atmosphere rim light. Additive so bloom
// picks up the edge.
export default function AtmosphereGlow({ radius, color, power = 3.2, intensity = 1.1, shell = 1.18 }: Props) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uPower: { value: power },
          uIntensity: { value: intensity },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uPower;
          uniform float uIntensity;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float rim = pow(1.0 - abs(dot(vNormal, vView)), uPower);
            gl_FragColor = vec4(uColor * rim * uIntensity, rim);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [color, power, intensity],
  )

  return (
    <mesh scale={radius * shell}>
      <sphereGeometry args={[1, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
