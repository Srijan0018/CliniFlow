import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { useMemo, useState } from 'react'
import { Building2, ChevronDown, DoorOpen, Layers3, Map as MapIcon, Maximize2, Search, X } from 'lucide-react'
import { buildings, campusStats, floors, getBuilding, getFloor } from './data/hospitalData'
import './Hospital.css'

const typeColors = {
  reception: '#b96d50', waiting: '#c6d0c8', emergency: '#c87563', clinical: '#aebfae', diagnostic: '#a8b8c2', support: '#d1c4a4', office: '#c3c0b5', ward: '#b0b9c1', lift: '#c5a15d', stairs: '#7c8e88',
}

const accessNodes = floors.flatMap((floor) => [
  { id: `${floor.id}-lift`, name: 'Lift', type: 'lift', buildingId: floor.buildingId, floorId: floor.id, x: 4, z: 18, width: 3, depth: 3 },
  { id: `${floor.id}-stairs`, name: 'Staircase', type: 'stairs', buildingId: floor.buildingId, floorId: floor.id, x: 53, z: 18, width: 3, depth: 5 },
])
const navigationNodes = [...floors.flatMap((floor) => floor.rooms), ...accessNodes]
const localDoorPosition = (node, building) => [Math.round(node.x + node.width / 2), Math.min(Math.round(node.z + node.depth + 1), building.depth - 2)]
const cellKey = ([x, z]) => `${x},${z}`

function findWalkablePath(building, destination) {
  const start = [6, 20]
  const goal = localDoorPosition(destination, building)
  const blocked = new Set()
  const width = Math.round(building.width)
  const depth = Math.round(building.depth)
  const floorRooms = floors.find((floor) => floor.id === destination.floorId)?.rooms || []
  const obstacles = [...floorRooms, ...accessNodes.filter((node) => node.floorId === destination.floorId && node.id !== destination.id)]
  obstacles.forEach((room) => {
    for (let x = Math.floor(room.x); x < Math.ceil(room.x + room.width); x += 1) {
      for (let z = Math.floor(room.z); z < Math.ceil(room.z + room.depth); z += 1) blocked.add(cellKey([x, z]))
    }
  })
  const queue = [start]
  const cameFrom = new Map([[cellKey(start), null]])
  const distance = new Map([[cellKey(start), 0]])
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  while (queue.length) {
    queue.sort((a, b) => distance.get(cellKey(a)) - distance.get(cellKey(b)))
    const current = queue.shift()
    if (current[0] === goal[0] && current[1] === goal[1]) break
    neighbors.forEach(([dx, dz]) => {
      const next = [current[0] + dx, current[1] + dz]
      const key = cellKey(next)
      if (next[0] < 0 || next[0] >= width || next[1] < 0 || next[1] >= depth || blocked.has(key) || cameFrom.has(key)) return
      cameFrom.set(key, current)
      distance.set(key, distance.get(cellKey(current)) + 1)
      queue.push(next)
    })
  }
  const path = []
  let current = goal
  while (current && cameFrom.has(cellKey(current))) {
    path.unshift(current)
    current = cameFrom.get(cellKey(current))
  }
  if (!path.length || cellKey(path[0]) !== cellKey(start)) return [start]
  return path.filter((point, index) => index === 0 || point[0] !== path[index - 1][0] || point[1] !== path[index - 1][1])
}

function simplifyPath(path) {
  return path.filter((point, index) => index === 0 || index === path.length - 1 || (point[0] - path[index - 1][0]) * (path[index + 1][1] - point[1]) !== (point[1] - path[index - 1][1]) * (path[index + 1][0] - point[0]))
}

function VerticalCore({ type, position, elevation }) {
  if (type === 'lift') return <group position={[position[0], elevation, position[1]]}><RoundedBox args={[3, 1.8, 3]} radius={0.12}><meshStandardMaterial color="#526e70" roughness={0.5} /></RoundedBox><mesh position={[0, 0.95, 1.52]}><boxGeometry args={[1.2, 1.1, 0.08]} /><meshStandardMaterial color="#c3a45f" metalness={0.35} roughness={0.4} /></mesh><Text position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#e7d59b">LIFT</Text></group>
  return <group position={[position[0], elevation, position[1]]}>{[0, 1, 2, 3, 4].map((step) => <mesh key={step} position={[-0.8 + step * 0.4, 0.12 + step * 0.12, 0]}><boxGeometry args={[0.42, 0.22, 2.2]} /><meshStandardMaterial color="#7c8b84" roughness={0.85} /></mesh>)}<Text position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.48} color="#d7dfd7">STAIRS</Text></group>
}

function RoomFurniture({ type, width, depth }) {
  const furnitureColor = type === 'diagnostic' ? '#657a80' : '#68736c'
  const bed = (position, rotation = 0) => <group position={position} rotation={[0, rotation, 0]}><mesh position={[0, 0.38, 0]}><boxGeometry args={[Math.min(width * 0.46, 3.8), 0.18, Math.min(depth * 0.18, 1.4)]} /><meshStandardMaterial color="#d9ddd5" roughness={0.9} /></mesh><mesh position={[0, 0.58, -0.46]}><boxGeometry args={[Math.min(width * 0.46, 3.8), 0.22, 0.34]} /><meshStandardMaterial color="#c3d0c8" roughness={0.8} /></mesh><mesh position={[0, 0.78, -0.63]}><boxGeometry args={[Math.min(width * 0.46, 3.8), 1.5, 0.08]} /><meshStandardMaterial color={furnitureColor} roughness={0.8} /></mesh></group>
  const desk = <group><mesh position={[0, 0.55, 0]}><boxGeometry args={[Math.min(width * 0.6, 4), 0.18, 1.1]} /><meshStandardMaterial color="#8a6e57" roughness={0.75} /></mesh><mesh position={[0, 0.95, 0]}><boxGeometry args={[1.1, 0.7, 0.08]} /><meshStandardMaterial color="#303c3d" roughness={0.5} /></mesh><mesh position={[0, 0.3, 0.9]}><cylinderGeometry args={[0.35, 0.35, 0.55, 12]} /><meshStandardMaterial color={furnitureColor} /></mesh></group>
  const chairs = <group>{[-1, 0, 1].map((position) => <group key={position} position={[position * 1.1, 0.25, 0]}><mesh><boxGeometry args={[0.7, 0.18, 0.7]} /><meshStandardMaterial color="#87948c" /></mesh><mesh position={[0, 0.48, -0.27]}><boxGeometry args={[0.7, 0.65, 0.12]} /><meshStandardMaterial color="#87948c" /></mesh></group>)}</group>
  if (type === 'ward' || type === 'emergency') return <group>{bed([-width * 0.22, 0, -depth * 0.16], Math.PI / 2)}{bed([width * 0.22, 0, -depth * 0.16], Math.PI / 2)}</group>
  if (type === 'clinical') return <group>{bed([0, 0, -depth * 0.14])}<mesh position={[width * 0.28, 0.45, depth * 0.18]}><boxGeometry args={[0.65, 0.9, 0.65]} /><meshStandardMaterial color="#778983" /></mesh></group>
  if (type === 'diagnostic') return <group><mesh position={[0, 0.7, 0]}><cylinderGeometry args={[Math.min(width, depth) * 0.23, Math.min(width, depth) * 0.23, 0.9, 20]} /><meshStandardMaterial color="#6e8084" metalness={0.35} roughness={0.45} /></mesh><mesh position={[0, 1.18, 0]}><torusGeometry args={[Math.min(width, depth) * 0.18, 0.08, 12, 24]} /><meshStandardMaterial color="#c5a15d" metalness={0.5} roughness={0.35} /></mesh></group>
  if (type === 'waiting') return chairs
  if (type === 'reception' || type === 'office' || type === 'support') return desk
  return <mesh position={[0, 0.35, 0]}><boxGeometry args={[1.3, 0.7, 1.1]} /><meshStandardMaterial color={furnitureColor} roughness={0.8} /></mesh>
}

function Room({ room, selected, onSelect, origin, elevation }) {
  const color = typeColors[room.type] || typeColors.clinical
  const x = origin[0] + room.x + room.width / 2 - 30
  const z = origin[1] + room.z + room.depth / 2 - 20
  return (
    <group position={[x, elevation, z]} onClick={(event) => { event.stopPropagation(); onSelect(room) }}>
      <mesh position={[0, 0.1, 0]} receiveShadow><boxGeometry args={[room.width - 0.3, 0.18, room.depth - 0.3]} /><meshStandardMaterial color={selected ? '#b7654d' : color} roughness={0.88} /></mesh>
      {[[[-room.width * 0.31, room.depth / 2 - 0.1, room.width * 0.36, 0.2], [room.width * 0.31, room.depth / 2 - 0.1, room.width * 0.36, 0.2]], [[0, -room.depth / 2 + 0.1, room.width, 0.2]], [[room.width / 2 - 0.1, 0, 0.2, room.depth]], [[-room.width / 2 + 0.1, 0, 0.2, room.depth]]].flat().map(([wallX, wallZ, wallW, wallD], index) => <mesh key={index} position={[wallX, 0.88, wallZ]} castShadow><boxGeometry args={[wallW, 1.7, wallD]} /><meshStandardMaterial color={selected ? '#d2b58e' : '#aeb7af'} roughness={0.82} transparent opacity={0.92} /></mesh>)}
      <mesh position={[0, 0.5, room.depth / 2 - 0.08]}><boxGeometry args={[0.95, 1, 0.08]} /><meshStandardMaterial color="#4b5553" roughness={0.7} /></mesh>
      <RoomFurniture type={room.type} width={room.width} depth={room.depth} />
      <mesh position={[0, 1.76, 0]}><boxGeometry args={[room.width - 0.3, 0.07, room.depth - 0.3]} /><meshStandardMaterial color={color} transparent opacity={0.16} /></mesh>
      <Text position={[0, 2.02, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.58} color={selected ? '#e5c074' : '#e1e4dc'} anchorX="center" anchorY="middle" maxWidth={Math.max(room.width - 1, 4)}>{room.name}</Text>
    </group>
  )
}

function Building({ building, floorIndex, selectedRoom, onSelect, campusView }) {
  const floor = getFloor(building.id, floorIndex)
  const y = floor.elevation
  const origin = building.position
  return (
    <group position={[0, campusView ? 0 : -y, 0]}>
      <mesh position={[origin[0] + building.width / 2 - 30, y - 0.18, origin[1] + building.depth / 2 - 20]} receiveShadow><boxGeometry args={[building.width, 0.3, building.depth]} /><meshStandardMaterial color="#364346" roughness={0.92} /></mesh>
      <mesh position={[origin[0] + building.width / 2 - 30, y + 0.03, origin[1] + building.depth / 2 - 20]}><boxGeometry args={[building.width - 1, 0.08, building.depth - 1]} /><meshStandardMaterial color="#4d5a58" roughness={0.95} /></mesh>
      {floor.rooms.map((room) => <Room key={room.id} room={room} elevation={y} origin={origin} selected={selectedRoom?.id === room.id} onSelect={onSelect} />)}
      <VerticalCore type="lift" position={[origin[0] + 4 - 30, origin[1] + 19 - 20]} elevation={y} />
      <VerticalCore type="stairs" position={[origin[0] + 54 - 30, origin[1] + 20 - 20]} elevation={y} />
      {floorIndex % 2 === 0 ? <mesh position={[origin[0] + 30 - 30, y + 0.06, origin[1] + 21 - 20]}><boxGeometry args={[3, 0.12, building.depth - 2]} /><meshStandardMaterial color="#7c8e88" roughness={0.9} /></mesh> : <mesh position={[origin[0] + building.width / 2 - 30, y + 0.06, origin[1] + 20 - 20]}><boxGeometry args={[building.width - 2, 0.12, 3]} /><meshStandardMaterial color="#7c8e88" roughness={0.9} /></mesh>}
      <RoundedBox args={[2.8, 2, 2.8]} radius={0.1} position={[origin[0] + 4 - 30, y + 1, origin[1] + 20 - 20]}><meshStandardMaterial color="#4c5c5d" roughness={0.55} /></RoundedBox>
      <Text position={[origin[0] + building.width / 2 - 30, y + 0.14, origin[1] - 0.9 - 20]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.78} color={building.accent} anchorX="center">{building.shortName}</Text>
    </group>
  )
}

function CampusScene({ buildingId, floorIndex, selectedRoom, onSelect, campusView, routeTarget }) {
  const visibleBuildings = campusView ? buildings : buildings.filter((building) => building.id === buildingId)
  const activeBuilding = getBuilding(buildingId)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650
  const sceneTarget = campusView ? [20, 0, 0] : [activeBuilding.position[0] + activeBuilding.width / 2 - 30, 0, activeBuilding.position[1] + activeBuilding.depth / 2 - 20]
  const cameraOffset = isMobile ? [42, 34, 50] : [32, 48, 62]
  const routeRoom = routeTarget && routeTarget.buildingId === buildingId ? routeTarget : null
  const routeCells = routeRoom ? simplifyPath(findWalkablePath(activeBuilding, routeRoom)) : []
  const routePoints = routeCells.map(([x, z]) => [activeBuilding.position[0] + x - 30, 2.25, activeBuilding.position[1] + z - 20])
  const start = routePoints[0]
  const destination = routePoints[routePoints.length - 1]
  return (
    <Canvas shadows orthographic camera={{ position: [sceneTarget[0] + cameraOffset[0], sceneTarget[1] + cameraOffset[1], sceneTarget[2] + cameraOffset[2]], zoom: isMobile ? (campusView ? 7.5 : 9.6) : (campusView ? 9 : 11) }} dpr={[1, 1.5]}>
      <color attach="background" args={['#1b2528']} /><ambientLight intensity={1.75} /><directionalLight position={[20, 42, 18]} intensity={3.1} castShadow shadow-mapSize={[1024, 1024]} /><mesh position={[25, -0.55, 2]} receiveShadow><boxGeometry args={[114, 0.16, 48]} /><meshStandardMaterial color="#202c2f" roughness={0.96} /></mesh>
      {visibleBuildings.map((building) => <Building key={building.id} building={building} floorIndex={floorIndex} selectedRoom={selectedRoom} onSelect={onSelect} campusView={campusView} />)}
      {routePoints.length > 1 && <><Line points={routePoints} color="#ffd166" lineWidth={7} /><mesh position={start}><sphereGeometry args={[0.42, 16, 16]} /><meshStandardMaterial color="#ffd166" emissive="#a46d18" emissiveIntensity={0.7} /></mesh>{routePoints.slice(1, -1).map((point, index) => <mesh key={index} position={point}><sphereGeometry args={[0.16, 12, 12]} /><meshStandardMaterial color="#ffd166" emissive="#a46d18" emissiveIntensity={0.55} /></mesh>)}<mesh position={destination}><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color="#ef8062" emissive="#9b3625" emissiveIntensity={0.65} /></mesh></>}
      {campusView && <group position={[35, 4, -1]}><mesh><boxGeometry args={[8, 0.55, 4]} /><meshStandardMaterial color="#8ebbc5" transparent opacity={0.9} /></mesh><Text position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#205565">ENCLOSED BRIDGE</Text></group>}
      <OrbitControls enablePan enableZoom minZoom={5} maxZoom={24} maxPolarAngle={Math.PI / 2.1} minPolarAngle={0.45} target={sceneTarget} />
    </Canvas>
  )
}

function App() {
  const [buildingId, setBuildingId] = useState('main')
  const [floorIndex, setFloorIndex] = useState(0)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [query, setQuery] = useState('')
  const [campusView, setCampusView] = useState(false)
  const [routeTarget, setRouteTarget] = useState(null)
  const currentFloor = getFloor(buildingId, floorIndex)
  const building = getBuilding(buildingId)
  const rooms = useMemo(() => currentFloor.rooms.filter((room) => room.name.toLowerCase().includes(query.toLowerCase())), [currentFloor, query])
  const searchResults = useMemo(() => navigationNodes.filter((node) => node.name.toLowerCase().includes(query.toLowerCase())).slice(0, 7), [query])
  const chooseDestination = (node) => { setBuildingId(node.buildingId); setFloorIndex(Number(node.floorId.split('-').pop())); setCampusView(false); setSelectedRoom(node); setRouteTarget(node); setQuery(node.name) }
  const chooseBuilding = (id) => { setBuildingId(id); setCampusView(false); setSelectedRoom(null); setRouteTarget(null) }
  const chooseFloor = (index) => { setFloorIndex(index); setSelectedRoom(null) }

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><div className="brand-mark"><Building2 size={19} /></div><div><strong>CliniFlow</strong><span>Hospital navigation</span></div></div><div className="header-meta"><span className="status-dot" /> Live campus model <span className="divider" /> {campusStats.rooms} spaces mapped</div><button className="icon-button mobile-menu" aria-label="Open map overview" onClick={() => setCampusView(true)}><MapIcon size={19} /></button></header>
      <div className="workspace">
        <aside className="sidebar"><div className="eyebrow">Campus explorer</div><h1>Find your way<br /><em>through care.</em></h1><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && searchResults[0]) chooseDestination(searchResults[0]) }} placeholder="Search rooms, lifts, stairs" aria-label="Search destination" /><button className="search-submit" onClick={() => searchResults[0] && chooseDestination(searchResults[0])} aria-label="Search destination"><Search size={15} /></button></div><div className="mobile-controls"><div className="mobile-buildings">{buildings.map((item) => <button key={item.id} className={buildingId === item.id && !campusView ? 'active' : ''} onClick={() => chooseBuilding(item.id)}>{item.shortName.replace('Building ', '')}</button>)}</div><div className="mobile-floors">{['G', '1', '2'].map((label, index) => <button key={label} className={floorIndex === index && !campusView ? 'active' : ''} onClick={() => chooseFloor(index)}>{label}</button>)}</div></div>{query && <div className="search-results">{searchResults.map((node) => <button key={node.id} onClick={() => chooseDestination(node)}><span className={`result-icon ${node.type}`}>{node.type === 'lift' ? 'L' : node.type === 'stairs' ? 'S' : 'R'}</span><span><b>{node.name}</b><small>{getBuilding(node.buildingId).shortName} · {getFloor(node.buildingId, Number(node.floorId.split('-').pop())).name}</small></span><ChevronDown size={14} /></button>)}</div>}<div className="control-group"><div className="control-label"><Building2 size={14} /> Buildings</div>{buildings.map((item) => <button key={item.id} className={`selector ${buildingId === item.id && !campusView ? 'active' : ''}`} onClick={() => chooseBuilding(item.id)}><span className="building-swatch" style={{ background: item.accent }} />{item.shortName}<span className="selector-detail">{item.width} × {item.depth}m</span></button>)}<button className={`overview-button ${campusView ? 'active' : ''}`} onClick={() => setCampusView(true)}><Maximize2 size={15} /> View full campus</button></div>{!campusView && <div className="control-group"><div className="control-label"><Layers3 size={14} /> Floor level</div><div className="floor-tabs">{['G', '1', '2'].map((label, index) => <button key={label} className={floorIndex === index ? 'active' : ''} onClick={() => chooseFloor(index)}><b>{label}</b><span>{index === 0 ? 'Ground' : `${index} floor`}</span></button>)}</div></div>}{!campusView && <div className="room-list"><div className="room-list-heading"><span>{currentFloor.name}</span><small>{rooms.length} results</small></div>{rooms.map((room) => <button key={room.id} className={`room-row ${selectedRoom?.id === room.id ? 'selected' : ''}`} onClick={() => setSelectedRoom(room)}><span className="room-dot" style={{ background: typeColors[room.type] }} /><span>{room.name}</span><ChevronDown size={14} /></button>)}</div>}</aside>
        <section className="map-panel"><div className="map-toolbar"><div><span className="map-kicker">{campusView ? 'All buildings' : building.name}</span><strong>{campusView ? 'Campus overview' : currentFloor.name}</strong></div><div className="toolbar-actions"><span className="view-pill"><DoorOpen size={14} /> Walkable plan</span><button className="reset-button" onClick={() => { setSelectedRoom(null); setRouteTarget(null) }}>Reset view</button></div></div><div className="canvas-wrap"><CampusScene buildingId={buildingId} floorIndex={floorIndex} selectedRoom={selectedRoom} onSelect={(room) => setSelectedRoom(room)} campusView={campusView} routeTarget={routeTarget} /></div><div className="map-footer"><span><i className="legend-dot corridor" /> Corridors</span><span><i className="legend-dot room" /> Departments</span><span><i className="legend-dot bridge" /> Connection bridge</span><span className="footer-note">Gold line: current position to destination</span></div></section>
        {selectedRoom && <aside className="details-panel"><button className="close-button" onClick={() => setSelectedRoom(null)} aria-label="Close room details"><X size={18} /></button><div className="detail-kicker">Selected space</div><div className="detail-icon" style={{ background: typeColors[selectedRoom.type] }}><DoorOpen size={25} /></div><h2>{selectedRoom.name}</h2><p className="detail-type">{selectedRoom.type === 'clinical' ? 'Clinical department' : `${selectedRoom.type[0].toUpperCase()}${selectedRoom.type.slice(1)} space`}</p><div className="detail-rule" /><dl><div><dt>Building</dt><dd>{building.name}</dd></div><div><dt>Floor</dt><dd>{currentFloor.name}</dd></div><div><dt>Room size</dt><dd>{selectedRoom.width} × {selectedRoom.depth} m</dd></div></dl><button className={`navigate-button ${routeTarget?.id === selectedRoom.id ? 'active' : ''}`} onClick={() => setRouteTarget(selectedRoom)}>{routeTarget?.id === selectedRoom.id ? 'Route shown' : 'Navigate here'}</button><button className="clear-selection" onClick={() => setSelectedRoom(null)}>Clear selection</button></aside>}
      </div>
    </main>
  )
}

export default App
