import { Canvas } from '@react-three/fiber'
import { Perf } from 'r3f-perf'
import { GameScene } from './game/components/GameScene'

function App() {
  return (
    <div className="h-screen w-screen bg-black">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        {import.meta.env.DEV && <Perf position="top-left" />}
        <GameScene />
      </Canvas>
    </div>
  )
}

export default App
