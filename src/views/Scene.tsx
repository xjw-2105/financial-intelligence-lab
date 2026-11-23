import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

function Apparatus() {
  const group = useRef<Group>(null)
  useFrame((state) => {
    if (!group.current) return
    const progress = Math.min(state.clock.elapsedTime / 2.8, 1)
    const remaining = (1 - progress) ** 3
    group.current.rotation.y = -0.28 + 0.58 * remaining
    group.current.rotation.x = 0.15 + 0.25 * remaining
    if (progress < 1) state.invalidate()
  })
  return (
    <group ref={group}>
      <mesh rotation={[0.1, 0.34, 0]}>
        <torusGeometry args={[2, 0.006, 6, 104]} />
        <meshBasicMaterial color="#83b8db" transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <mesh rotation={[0.48, -0.06, 0.2]}>
        <torusGeometry args={[2.29, 0.006, 6, 104, Math.PI * 1.52]} />
        <meshBasicMaterial color="#bca783" transparent opacity={0.63} depthWrite={false} />
      </mesh>
      <mesh rotation={[0.07, 0.17, 1.9]}>
        <torusGeometry args={[2.44, 0.004, 6, 104, Math.PI * 1.02]} />
        <meshBasicMaterial color="#56788b" transparent opacity={0.57} depthWrite={false} />
      </mesh>
      <mesh position={[1.99, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="#b5dfff" />
      </mesh>
    </group>
  )
}

export default function Scene() {
  return (
    <div className="scene-canvas" aria-hidden="true">
      <Canvas frameloop="demand" dpr={[1, 1.35]} camera={{ position: [0, 0, 7.4], fov: 41 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
        <Apparatus />
      </Canvas>
    </div>
  )
}
