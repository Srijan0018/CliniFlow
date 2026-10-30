const buildingA = {
  id: 'main',
  name: 'Main Hospital',
  shortName: 'Building A',
  position: [0, 0],
  width: 60,
  depth: 40,
  accent: '#2f7d8f',
}

const buildingB = {
  id: 'specialty',
  name: 'Diagnostic & Specialty Block',
  shortName: 'Building B',
  position: [70, 5],
  width: 40,
  depth: 30,
  accent: '#8168a9',
}

const layouts = {
  main: [
    [
      ['Reception', 25, 3, 10, 8, 'reception'], ['Waiting Area', 5, 3, 12, 10, 'waiting'], ['Emergency Department', 0, 25, 14, 12, 'emergency'], ['General Medicine', 15, 25, 12, 10, 'clinical'], ['Pharmacy', 40, 3, 10, 8, 'support'], ['Registration', 40, 13, 10, 8, 'support'], ['Consultation Room 1', 15, 13, 8, 8, 'clinical'], ['Consultation Room 2', 25, 13, 8, 8, 'clinical'], ['Public Restroom', 50, 30, 6, 6, 'support'],
    ],
    [
      ['Cardiology', 3, 25, 12, 10, 'clinical'], ['Neurology', 17, 25, 12, 10, 'clinical'], ['Orthopedics', 31, 25, 12, 10, 'clinical'], ['Pediatrics', 45, 25, 12, 10, 'clinical'], ['Consultation Room 3', 3, 13, 8, 8, 'clinical'], ['Consultation Room 4', 13, 13, 8, 8, 'clinical'], ['Consultation Room 5', 23, 13, 8, 8, 'clinical'], ['Waiting Area', 35, 13, 15, 8, 'waiting'], ['Public Restroom', 50, 3, 6, 6, 'support'],
    ],
    [
      ['Administration', 3, 25, 12, 10, 'office'], ['Medical Records Office', 17, 25, 10, 10, 'office'], ['Conference Room', 31, 25, 14, 10, 'office'], ['Staff Room', 45, 25, 10, 10, 'office'], ['General Ward', 3, 3, 20, 12, 'ward'], ['Patient Waiting Area', 25, 3, 12, 10, 'waiting'], ['Staff Office', 40, 3, 12, 10, 'office'], ['Public Restroom', 50, 15, 6, 6, 'support'],
    ],
  ],
  specialty: [
    [
      ['Diagnostic Reception', 15, 3, 10, 6, 'reception'], ['Laboratory', 2, 18, 12, 10, 'diagnostic'], ['Sample Collection', 2, 8, 8, 8, 'clinical'], ['X-Ray Room', 16, 18, 10, 10, 'diagnostic'], ['CT Scan', 27, 18, 10, 10, 'diagnostic'], ['Waiting Area', 26, 8, 12, 8, 'waiting'], ['Public Restroom', 2, 1, 6, 5, 'support'],
    ],
    [
      ['MRI Room', 2, 16, 12, 12, 'diagnostic'], ['Ultrasound', 15, 16, 10, 10, 'diagnostic'], ['ECG Room', 26, 16, 8, 8, 'diagnostic'], ['Testing Room', 2, 4, 10, 10, 'clinical'], ['Consultation Room', 14, 4, 10, 10, 'clinical'], ['Waiting Area', 26, 4, 12, 8, 'waiting'],
    ],
    [
      ['Physiotherapy', 2, 16, 12, 12, 'clinical'], ['Rehabilitation', 15, 16, 12, 10, 'clinical'], ['Nutrition Department', 28, 16, 10, 10, 'clinical'], ['Specialist Consultation 1', 2, 4, 10, 10, 'clinical'], ['Specialist Consultation 2', 14, 4, 10, 10, 'clinical'], ['Waiting Area', 26, 4, 12, 8, 'waiting'],
    ],
  ],
}

const floorNames = ['Ground floor', 'First floor', 'Second floor']
const elevations = [0, 4, 8]

export const buildings = [buildingA, buildingB]
export const floors = buildings.flatMap((building) => floorNames.map((name, floorIndex) => ({
  id: `${building.id}-${floorIndex}`,
  buildingId: building.id,
  name,
  elevation: elevations[floorIndex],
  rooms: layouts[building.id][floorIndex].map(([name, x, z, width, depth, type], index) => ({
    id: `${building.id}-${floorIndex}-${index}`,
    name,
    buildingId: building.id,
    floorId: `${building.id}-${floorIndex}`,
    x,
    z,
    width,
    depth,
    type,
  })),
})))

export const campusStats = { buildings: 2, floors: 6, rooms: floors.reduce((total, floor) => total + floor.rooms.length, 0) }

export const getFloor = (buildingId, floorIndex) => floors.find((floor) => floor.id === `${buildingId}-${floorIndex}`)
export const getBuilding = (buildingId) => buildings.find((building) => building.id === buildingId)
