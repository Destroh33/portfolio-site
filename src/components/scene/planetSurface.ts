import * as THREE from 'three'

export interface PlanetStyle {
  base: string
  accent: string
  mode: number // 0 gas-bands, 1 rocky, 2 lava, 3 icy, 4 data-grid, 5 volcanic, 6 ley-lines, 7 speed-streaks, 8 neural, 9 city-map
  glow: string
}

// Procedural planet surface: fbm noise driving one of several looks, lit by a
// simple wrap-lambert against the scene's main light direction. Cheap, no
// textures, distinct per project. Time-animated so bands/lava drift.
export function makePlanetMaterial(style: PlanetStyle): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBase: { value: new THREE.Color(style.base) },
      uAccent: { value: new THREE.Color(style.accent) },
      uMode: { value: style.mode },
      uLightDir: { value: new THREE.Vector3(400, 300, 200).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormalW;
      void main() {
        vPos = position;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormalW;
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uAccent;
      uniform float uMode;
      uniform vec3 uLightDir;

      // hash / value noise / fbm
      float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){
        vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                       mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                       mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p){
        float v=0.0, a=0.5;
        for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
        return v;
      }

      // Cellular (Voronoi) edge distance: ~0 along the straight borders
      // between cells — gives angular, branching crack networks (crack-glass /
      // dried-mud look) instead of the rounded iso-lines fbm produces.
      vec3 hash3(vec3 p){
        p = vec3(dot(p,vec3(127.1,311.7,74.7)),
                 dot(p,vec3(269.5,183.3,246.1)),
                 dot(p,vec3(113.5,271.9,124.6)));
        return fract(sin(p)*43758.5453);
      }
      // Returns (F1, F2-F1): F1 ~ distance to nearest feature point (small at
      // cell centers → "nodes"/"cities"), F2-F1 ~ 0 along the straight cell
      // borders → cracks / streets / ley-lines.
      vec2 voro2(vec3 x){
        vec3 i = floor(x); vec3 f = fract(x);
        float f1 = 8.0; float f2 = 8.0;
        for(int xo=-1;xo<=1;xo++)
        for(int yo=-1;yo<=1;yo++)
        for(int zo=-1;zo<=1;zo++){
          vec3 g = vec3(float(xo),float(yo),float(zo));
          float d = length(g + hash3(i+g) - f);
          if(d<f1){ f2=f1; f1=d; } else if(d<f2){ f2=d; }
        }
        return vec2(f1, f2 - f1);
      }
      float voroEdge(vec3 x){ return voro2(x).y; }

      void main(){
        vec3 n = normalize(vNormalW);
        vec3 p = normalize(vPos);
        vec3 col;
        vec3 emissive = vec3(0.0); // added AFTER lighting (self-glowing lava etc.)

        if(uMode < 0.5){
          // gas-giant bands
          float bands = fbm(vec3(p.x*2.0, p.y*8.0 + uTime*0.05, p.z*2.0));
          float band = sin(p.y*10.0 + bands*4.0);
          col = mix(uBase, uAccent, smoothstep(-0.3,0.6,band));
        } else if(uMode < 1.5){
          // rocky / cratered
          float f = fbm(p*4.0);
          float craters = fbm(p*9.0 + 5.0);
          col = mix(uBase, uAccent, smoothstep(0.4,0.7,f)) * (0.8 + 0.3*craters);
        } else if(uMode < 2.5){
          // lava
          float f = fbm(p*3.5 + vec3(0.0, uTime*0.15, 0.0));
          float veins = pow(fbm(p*6.0 + uTime*0.1), 2.0);
          col = mix(uBase, uAccent, smoothstep(0.45,0.75,f)+veins*0.6);
        } else if(uMode < 3.5){
          // icy
          float f = fbm(p*5.0);
          col = mix(uBase, uAccent, smoothstep(0.5,0.62,f));
        } else if(uMode < 4.5){
          // data-grid
          float g = max(
            smoothstep(0.02,0.0,abs(fract(p.x*8.0)-0.5)-0.47),
            smoothstep(0.02,0.0,abs(fract(p.y*8.0)-0.5)-0.47));
          float pulse = 0.5+0.5*sin(uTime*2.0 + fbm(p*6.0)*8.0);
          col = mix(uBase, uAccent, g*pulse);
        } else if(uMode < 5.5){
          // volcanic: dark grey-brown rock crazed with glowing lava cracks.
          // Cracks = ridged noise (thin bands where |fbm-0.5| is near zero)
          // at two scales; they stay bright on the night side (emissive) and
          // pulse slowly like flowing magma.
          float rock = fbm(p*3.0);
          // Straight branching fractures: Voronoi cell borders at two scales.
          // A light domain warp keeps the lines from being ruler-perfect. The
          // fine layer is gated to the vicinity of the main fractures so it
          // reads as offshoot branches, not an independent web.
          vec3 wp2 = p + 0.25*vec3(fbm(p*2.0), fbm(p*2.0+4.0), fbm(p*2.0+9.0));
          float e1 = voroEdge(wp2*3.2);
          float e2 = voroEdge(wp2*7.5 + 5.0);
          float main = smoothstep(0.05, 0.0, e1);
          float branches = smoothstep(0.035, 0.0, e2) * smoothstep(0.3, 0.05, e1) * 0.55;
          float region = smoothstep(0.42, 0.6, fbm(p*1.5 + 11.0));
          float crack = clamp(main + branches, 0.0, 1.0) * region;
          float pulse = 0.8 + 0.2*sin(uTime*1.2 + fbm(p*5.0)*6.0);
          col = mix(uBase*0.4, uBase*0.85, rock); // dark grey rocky variation
          vec3 lava = mix(vec3(1.0,0.42,0.05), vec3(1.0,0.85,0.3), smoothstep(0.5,1.0,crack));
          emissive = lava * crack * 1.1 * pulse;
        } else if(uMode < 6.5){
          // ley-lines (Prime Weaver): dark violet mist crossed by glowing
          // arcane veins with energy visibly FLOWING along them.
          vec3 wp2 = p + 0.2*vec3(fbm(p*1.8), fbm(p*1.8+4.0), fbm(p*1.8+9.0));
          float e = voro2(wp2*2.6).y;
          float vein = smoothstep(0.05, 0.0, e);
          // flow: brightness ripples travelling along the lines
          float flow = 0.55 + 0.45*sin(uTime*2.2 + (p.x+p.y*1.7+p.z*2.3)*14.0 + fbm(p*3.0)*8.0);
          float mist = fbm(p*2.2 + vec3(0.0, uTime*0.015, 0.0));
          col = mix(uBase*0.45, uBase, mist);
          emissive = uAccent * vein * flow * 1.5;
        } else if(uMode < 7.5){
          // speed streaks (MotoMania): fast horizontal motion-blur bands
          // racing around the planet like a blurred speedway.
          // Seamless: drive the noise with a rotating unit-circle coord (no
          // atan wrap discontinuity), scrolling in the rotation angle.
          float ang = atan(p.z, p.x);
          float spin = uTime * 1.6;
          vec3 ring = vec3(cos(ang*3.0 - spin), sin(ang*3.0 - spin), p.y*7.0);
          float streak = fbm(ring);
          float s = smoothstep(0.5, 0.78, streak);
          col = mix(uBase, uAccent, s*0.8);
          emissive = uAccent * smoothstep(0.74, 0.9, streak) * 0.7;
        } else if(uMode < 8.5){
          // VR Lab: plain deep-ocean-blue globe (the glowing node NETWORK and
          // travelling signals live as real 3D geometry in PlanetDetail, like
          // the reference image — not baked into the surface).
          float land = smoothstep(0.55, 0.6, fbm(p*2.8));
          col = mix(uBase, uBase*1.5 + vec3(0.0,0.05,0.1), land);
        } else {
          // AI Guide: a mellow map/atlas planet — a soft slate-teal surface
          // with a bright, ever-present GRID of "roads" over the whole globe,
          // gentle landmass tint, and calm glowing city clusters. The grid is
          // the hero (visible everywhere, not gated to cities); the whole thing
          // reads light and chill, not pitch-black.
          float lon = atan(p.z, p.x);              // -PI..PI around
          float lat = asin(clamp(p.y, -1.0, 1.0)); // -PI/2..PI/2
          vec2 g = vec2(lon, lat) * 9.0;
          g += 0.35*vec2(fbm(p*3.0), fbm(p*3.0+7.0)); // slight warp
          vec2 gf = abs(fract(g) - 0.5);
          float streets = smoothstep(0.07, 0.0, min(gf.x, gf.y));     // major roads
          float minor = smoothstep(0.03, 0.0, min(abs(fract(g*2.0-0.5)-0.5).x,
                                                  abs(fract(g*2.0-0.5)-0.5).y)); // finer streets
          // soft landmass vs water tint
          float land = smoothstep(0.45, 0.62, fbm(p*2.4));
          vec3 water = uBase;                       // slate-teal
          vec3 landCol = mix(uBase, vec3(0.30,0.42,0.44), 0.6);
          col = mix(water, landCol, land) * 0.9;    // lit base, never near-black
          float cityMask = smoothstep(0.5, 0.82, fbm(p*2.2 + 3.0));
          float twinkle = 0.8 + 0.2*sin(uTime*1.4 + dot(floor(g),vec2(1.7,2.3)));
          emissive = uAccent * (streets*0.6 + minor*0.25) + uAccent*cityMask*0.8*twinkle;
        }

        // simple wrap lighting; emissive glows regardless of the light side.
        float diff = clamp(dot(n, normalize(uLightDir))*0.5+0.5, 0.0, 1.0);
        col = col * (0.35 + 0.9*diff) + emissive;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}
