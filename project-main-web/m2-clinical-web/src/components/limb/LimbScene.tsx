import { useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useI18n } from '../../i18n/I18nContext'
import type { LimbModelState } from '../../types/clinical'

function heatColor(t: number) { const c = new THREE.Color(); c.setHSL(0.58 - t * 0.45, 0.85, 0.45 + t * 0.2); return c }

function LimbSegmentMesh({ position, rotation, length, radius, heat, label }: { position: [number, number, number]; rotation?: [number, number, number]; length: number; radius: number; heat: number; label: string }) {
  const color = useMemo(() => heatColor(heat), [heat])
  return <group position={position} rotation={rotation}><mesh castShadow receiveShadow><cylinderGeometry args={[radius, radius, length, 24]} /><meshStandardMaterial color={color} metalness={0.12} roughness={0.55} /></mesh><Text position={[radius + 0.08, length * 0.15, 0]} fontSize={0.07} color="#1e293b" anchorX="left">{label}</Text></group>
}

function LimbRig({ state }: { state: LimbModelState }) {
  const { t } = useI18n()
  const seg = (id: string) => state.segments.find((s) => s.id === id)
  const upper = seg('upper'); const knee = seg('knee'); const lower = seg('lower')
  const isShoulder = state.segments.some((s) => /肩|rotator|supra|infra/i.test(s.label))
  const upperLen = 0.55; const lowerLen = 0.5; const ru = 0.09; const rl = 0.07
  const kneeFlex = THREE.MathUtils.degToRad(knee?.angleDeg ?? 45)
  return (
    <group>
      <LimbSegmentMesh position={[0, 0.85, 0]} rotation={[0.15, 0, 0]} length={upperLen} radius={ru} heat={upper?.heat ?? 0.2} label={`${upper?.label ?? t('limbProximal')} ${((upper?.heat ?? 0) * 100).toFixed(0)}%`} />
      <mesh position={[0, 0.85 - upperLen / 2 - 0.06, 0]} castShadow><sphereGeometry args={[0.1, 24, 24]} /><meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.2} /></mesh>
      <group position={[0, 0.85 - upperLen / 2 - 0.12, 0]} rotation={[kneeFlex, 0, 0]}>
        <LimbSegmentMesh position={[0, -lowerLen / 2, 0]} length={lowerLen} radius={rl} heat={lower?.heat ?? 0.3} label={`${lower?.label ?? t('limbDistal')} ${((lower?.heat ?? 0) * 100).toFixed(0)}%`} />
      </group>
      <mesh position={[0, 0.85 - upperLen / 2 - 0.12 - lowerLen - 0.05, 0]}><sphereGeometry args={[0.08, 20, 20]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      {knee ? <Text position={[0.35, 0.35, 0]} fontSize={0.06} color="#334155">{isShoulder ? 'Shoulder angle' : t('kneeFlexion')}: {knee.angleDeg ?? 0}°</Text> : null}
    </group>
  )
}

export function LimbScene({ state }: { state: LimbModelState }) {
  const { t } = useI18n()
  useEffect(() => () => { THREE.Cache.clear() }, [])
  return (
    <div className="limb-canvas-wrap">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))}>
        <color attach="background" args={['#f1f5f9']} />
        <PerspectiveCamera makeDefault position={[1.1, 0.9, 1.35]} fov={45} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <LimbRig state={state} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow><planeGeometry args={[4, 4]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={0.85} maxDistance={4} target={[0, 0.35, 0]} />
      </Canvas>
      <div className="limb-overlay-hint muted small">{t('limbHint')}</div>
    </div>
  )
}
