# PROJECT: INTERACTIVE HYBRID 2.5D HOSPITAL MODEL

## 1. PROJECT OVERVIEW

Develop a visually impressive, interactive, responsive hybrid 2.5D hospital visualization application.

The application represents a fictional hospital campus containing:

* 2 separate hospital buildings.
* 3 floors in each building.
* Multiple departments and consultation rooms.
* Connecting corridors.
* Reception and waiting areas.
* Elevators and staircases.
* An enclosed bridge connecting the two buildings.

The application will eventually become part of an AI-powered indoor hospital navigation platform.

IMPORTANT:
For this development stage, implement ONLY the interactive 2.5D hospital model.

Do not implement:

* AI voice assistant.
* Patient database integration.
* Appointment booking.
* Patient records.
* Authentication.
* Hospital management functionality.

The current objective is to create a high-quality, realistic-looking, interactive hospital model using fictional demonstration data.

The actual hospital layout will replace the demonstration data later.

---

# 2. TECHNOLOGY STACK

Use the following technologies:

* React with Vite.
* JavaScript.
* Three.js.
* React Three Fiber.
* @react-three/drei.
* Tailwind CSS.
* Lucide React for interface icons.

Use functional React components and reusable architecture.

Use Three.js geometry for architectural elements.

Do not use static images as the actual hospital model.

Rooms, floors, walls, doors, corridors, elevators and stairs must be actual 3D objects.

Use procedural geometry wherever practical.

---

# 3. HOSPITAL CAMPUS SPECIFICATIONS

Create a fictional hospital campus consisting of two buildings.

BUILDING A:
Name: Main Hospital
Dimensions: 60 metres × 40 metres.
Number of floors: 3.

BUILDING B:
Name: Diagnostic and Specialty Block.
Dimensions: 40 metres × 30 metres.
Number of floors: 3.

Both buildings must be represented as separate but coordinated 3D structures.

Use a shared campus coordinate system.

Set:

* X = Width.
* Y = Height.
* Z = Depth.

All measurements are in metres.

Building A starts at campus coordinate X=0, Z=0.

Building B starts at campus coordinate X=70, Z=5.

This leaves a 10-metre horizontal separation between the buildings.

Use these elevations:

* Ground floor: Y=0.
* First floor: Y=4.
* Second floor: Y=8.

Floor thickness: 0.25 metres.
Wall height: 3 metres.
Wall thickness: 0.20 metres.

Keep the ceilings invisible.

---

# 4. BUILDING A – MAIN HOSPITAL

Overall dimensions: 60m × 40m.

## GROUND FLOOR

Create these rooms:

| Department | X | Z | Width | Depth |
| Reception | 25 | 3 | 10 | 8 |
| Waiting Area | 5 | 3 | 12 | 10 |
| Emergency Department | 0 | 25 | 14 | 12 |
| General Medicine | 15 | 25 | 12 | 10 |
| Pharmacy | 40 | 3 | 10 | 8 |
| Registration | 40 | 13 | 10 | 8 |
| Consultation Room 1 | 15 | 13 | 8 | 8 |
| Consultation Room 2 | 25 | 13 | 8 | 8 |
| Public Restroom | 50 | 30 | 6 | 6 |

Create a main entrance on the southern side.

Add a clearly identifiable reception near the entrance.

## FIRST FLOOR

Create:

| Department | X | Z | Width | Depth |
| Cardiology | 3 | 25 | 12 | 10 |
| Neurology | 17 | 25 | 12 | 10 |
| Orthopedics | 31 | 25 | 12 | 10 |
| Pediatrics | 45 | 25 | 12 | 10 |
| Consultation Room 3 | 3 | 13 | 8 | 8 |
| Consultation Room 4 | 13 | 13 | 8 | 8 |
| Consultation Room 5 | 23 | 13 | 8 | 8 |
| Waiting Area | 35 | 13 | 15 | 8 |
| Public Restroom | 50 | 3 | 6 | 6 |

## SECOND FLOOR

Create:

| Department | X | Z | Width | Depth |
| Administration | 3 | 25 | 12 | 10 |
| Medical Records Office | 17 | 25 | 10 | 10 |
| Conference Room | 31 | 25 | 14 | 10 |
| Staff Room | 45 | 25 | 10 | 10 |
| General Ward | 3 | 3 | 20 | 12 |
| Patient Waiting Area | 25 | 3 | 12 | 10 |
| Staff Office | 40 | 3 | 12 | 10 |
| Public Restroom | 50 | 15 | 6 | 6 |

---

# 5. BUILDING B – DIAGNOSTIC AND SPECIALTY BLOCK

Overall dimensions: 40m × 30m.

## GROUND FLOOR

Create:

| Department | X | Z | Width | Depth |
| Diagnostic Reception | 15 | 3 | 10 | 6 |
| Laboratory | 2 | 18 | 12 | 10 |
| Sample Collection | 2 | 8 | 8 | 8 |
| X-Ray Room | 16 | 18 | 10 | 10 |
| CT Scan | 27 | 18 | 10 | 10 |
| Waiting Area | 26 | 8 | 12 | 8 |
| Public Restroom | 2 | 1 | 6 | 5 |

## FIRST FLOOR

Create:

| Department | X | Z | Width | Depth |
| MRI Room | 2 | 16 | 12 | 12 |
| Ultrasound | 15 | 16 | 10 | 10 |
| ECG Room | 26 | 16 | 8 | 8 |
| Testing Room | 2 | 4 | 10 | 10 |
| Consultation Room | 14 | 4 | 10 | 10 |
| Waiting Area | 26 | 4 | 12 | 8 |

## SECOND FLOOR

Create:

| Department | X | Z | Width | Depth |
| Physiotherapy | 2 | 16 | 12 | 12 |
| Rehabilitation | 15 | 16 | 12 | 10 |
| Nutrition Department | 28 | 16 | 10 | 10 |
| Specialist Consultation 1 | 2 | 4 | 10 | 10 |
| Specialist Consultation 2 | 14 | 4 | 10 | 10 |
| Waiting Area | 26 | 4 | 12 | 8 |

IMPORTANT:
Treat these coordinates as initial layout data, not a validated architectural plan.

Review all room placements, corridor widths, building boundaries and structural overlaps.

Resolve overlaps before rendering.

Generate corridor geometry based on the final validated layout.

Do not assume that rooms are automatically connected just because they are close to each other.

---

# 6. ARCHITECTURAL COMPONENTS

Create reusable components for:

1. HospitalFloor.
2. Room.
3. Wall.
4. Door.
5. Window.
6. Corridor.
7. Elevator.
8. Staircase.
9. ReceptionDesk.
10. WaitingArea.
11. RoomLabel.
12. HospitalBuilding.

## FLOOR

* Use clean rectangular floor geometry.
* Apply subtle material textures.
* Clearly distinguish walkable areas from rooms.

## WALLS

* Use white or light neutral walls.
* Wall height: 3 metres.
* Wall thickness: 0.20 metres.
* Create actual openings for doors.
* Avoid obstructing the map view.

## DOORS

* Standard door width: 1 metre.
* Door height: 2.1 metres.
* Main entrance width: 3 metres.
* Show door openings clearly.

## CORRIDORS

* Main corridor width: 3 metres.
* Secondary corridor width: 2.4 metres.
* Department passage width: 2 metres.

Corridors must form continuous, walkable paths.

## ELEVATORS

* Dimensions: 2.5m × 2.5m.
* Maintain consistent positions across all three floors.

## STAIRCASES

* Staircase width: 1.5 metres.
* Use visible 3D steps.
* Maintain consistent positions across floors.

## INTER-BUILDING BRIDGE

Create an enclosed bridge:

* Length: 8 metres.
* Width: 4 metres.
* Connect Building A and Building B at first-floor level.
* Ensure both ends connect to walkable corridors.
* Show its position clearly.

---

# 7. VISUAL DESIGN

The visual design should look like a professional architectural visualization combined with a modern navigation application.

STYLE:

* Hybrid 2.5D.
* Isometric architectural view.
* Clean and minimal.
* Soft shadows.
* Subtle lighting.
* Modern hospital aesthetic.
* White and pastel colour palette.

COLOUR SYSTEM:

| Element | Colour |
| Floor | Light grey |
| Walls | White |
| Corridors | Light blue-grey |
| Reception | Soft blue |
| Consultation rooms | Soft green |
| Diagnostics | Soft purple |
| Emergency | Soft red |
| Elevators | Dark grey |
| Selected department | Blue highlight |

Avoid excessive colours.

Use consistent materials and lighting.

Do not make the hospital look like a cartoon or a game environment.

The final result should look like a polished architectural 3D floor plan.

---

# 8. CAMERA AND INTERACTION

Use an isometric camera by default.

Camera requirements:

* Orthographic camera preferred.
* Fixed isometric viewing angle.
* Show the complete selected building floor.
* Keep the map centred.
* Maintain readable room labels.

INTERACTIONS:

1. Zoom in.
2. Zoom out.
3. Pan.
4. Select individual rooms.
5. Highlight selected rooms.
6. Reset camera.
7. Change floor.
8. Switch between Building A and Building B.
9. View both buildings together.
10. Select a department from the search interface.

Touchscreen interactions must work on mobile devices.

Avoid requiring users to rotate the model.

Allow optional manual camera rotation only if it does not interfere with navigation usability.

---

# 9. RESPONSIVE DESIGN

Mobile is the primary target.

The application must work well on:

* Small Android phones.
* Large Android phones.
* iPhones.
* Tablets.
* Laptops.
* Desktop monitors.

MOBILE DESIGN:

* Map occupies most of the screen.
* Minimal top header.
* Compact building selector.
* Compact floor selector.
* Large touch-friendly controls.
* Department search.
* Selected room information displayed in a bottom sheet.
* Avoid unnecessary sidebars.
* Hide secondary labels when zoomed out.
* Show additional labels when zoomed in.

DESKTOP DESIGN:

* Large central map workspace.
* Left sidebar containing building and floor selection.
* Searchable department list.
* Right-side room information panel.
* Mouse zoom and pan.
* Detailed labels.

Use one common 3D model for both interfaces.

Do not create separate maps for mobile and desktop.

---

# 10. USER INTERFACE

Create a polished application interface.

HEADER:

* Hospital name: MediWay Hospital.
* Building selector.
* Floor selector.
* Map view controls.

LEFT SIDEBAR ON DESKTOP:

* Search department.
* Department list.
* Building A.
* Building B.
* Floor selection.

MOBILE:

* Compact header.
* Search bar.
* Building and floor selectors.
* Full map view.
* Bottom information panel.

ROOM SELECTION:

When a room is clicked:

* Highlight the room.
* Display department name.
* Display building name.
* Display floor name.
* Display room number.
* Show a close button.

Provide a clear selected-state visual.

---

# 11. DATA ARCHITECTURE

Do not hardcode all room information inside Three.js components.

Create a separate hospital data file.

Recommended structure:

src/
components/
HospitalCampus.jsx
HospitalBuilding.jsx
HospitalFloor.jsx
Room.jsx
Wall.jsx
Door.jsx
Corridor.jsx
Elevator.jsx
Staircase.jsx
RoomLabel.jsx
MapControls.jsx

data/
hospitalData.js
buildings.js
floors.js
rooms.js

layouts/
MobileLayout.jsx
DesktopLayout.jsx

hooks/
useMapControls.js
useResponsiveLayout.js

utils/
coordinateUtils.js
layoutValidator.js

App.jsx
main.jsx

Every room should have:

* Unique ID.
* Department name.
* Building ID.
* Floor ID.
* X coordinate.
* Z coordinate.
* Width.
* Depth.
* Height.
* Room type.
* Door position.

Every floor should have:

* Unique ID.
* Building ID.
* Floor name.
* Elevation.
* Rooms.
* Corridors.
* Elevators.
* Staircases.

Create a coordinate system that can later support navigation routing.

Include a separate navigation graph data structure, but do not implement the routing algorithm in this phase.

---

# 12. PERFORMANCE

The model must run smoothly on ordinary mobile devices.

Requirements:

* Avoid unnecessarily high polygon counts.
* Use reusable geometries.
* Use instancing for repeated objects where useful.
* Avoid excessive real-time shadows.
* Use efficient materials.
* Avoid unnecessary React re-renders.
* Keep labels readable without creating excessive draw calls.
* Dispose of unused Three.js resources.
* Ensure responsive canvas sizing.
* Handle mobile touch events correctly.

Prioritize smooth rendering over highly realistic details.

---

# 13. VALIDATION

Implement basic layout validation.

Check:

* Rooms do not extend outside building boundaries.
* Room geometry does not unintentionally overlap.
* Corridors connect to appropriate doorways.
* Elevators remain vertically aligned.
* Staircases remain vertically aligned.
* Floors have correct elevations.
* The connecting bridge reaches both buildings.
* All rooms have unique IDs.
* All floor and building references are valid.

Display development warnings for invalid geometry.

Do not silently create incorrect layouts.

---

# 14. DEVELOPMENT PROCESS

Build the project in the following stages.

STAGE 1:
Set up the React application and dependencies.

STAGE 2:
Create the hospital data architecture.

STAGE 3:
Create Building A ground floor.

STAGE 4:
Create Building B ground floor.

STAGE 5:
Create reusable 3D components.

STAGE 6:
Create the remaining floors.

STAGE 7:
Add elevators, stairs and bridge.

STAGE 8:
Implement isometric camera and controls.

STAGE 9:
Implement department selection and labels.

STAGE 10:
Implement responsive mobile and desktop layouts.

STAGE 11:
Optimize performance.

STAGE 12:
Test all interactions and resolve layout issues.

Do not attempt to implement every feature in one file.

Build modularly and verify each stage before proceeding.

---

# 15. FINAL EXPECTED RESULT

The final application should provide:

1. Two visually separate hospital buildings.
2. Three floors in each building.
3. Interactive 3D architectural elements.
4. Realistic-looking rooms and corridors.
5. Clearly visible departments.
6. Functional floor switching.
7. Functional building switching.
8. Room selection and highlighting.
9. Isometric camera.
10. Smooth zooming and panning.
11. Responsive mobile and desktop interfaces.
12. A clean, modern hospital navigation aesthetic.

The application must be a functional interactive 3D model, not a static rendering or screenshot.

IMPORTANT FINAL INSTRUCTION:

Start by inspecting the existing project files.

If the project is empty, set up the application.

Then implement the project in stages.

Before finishing, run the application, inspect the rendered result, fix compilation errors and resolve obvious visual or interaction problems.

Do not claim a feature is implemented unless it actually works.

Use fictional demonstration data throughout.
