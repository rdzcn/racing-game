import { Suspense } from 'react'
import { Physics } from '@react-three/rapier'
import { Car } from './Car'
import { Ground } from './Ground'
import { Lights } from './Lights'

export function GameScene() {
  return (
    <Suspense fallback={null}>
      <Lights />
      <Physics>
        <Ground />
        <Car />
      </Physics>
    </Suspense>
  )
}
