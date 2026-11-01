// Car components and the named ways each one can fail.
// sev: 'retire' (out of the race), 'limp' (slower for the rest of the race),
//      'fix' (stops and repairs; `repair` is seconds before mechanic skill).
// hazard: relative failure weight. w: relative weight among that part's modes.

export const COMPONENTS = [
  {
    id: 'bottomEnd', name: 'Engine bottom end', group: 'engine', hazard: 0.8, wearsWith: 'engine',
    modes: [
      { name: 'big-end bearing failure', sev: 'retire', w: 3 },
      { name: 'broken crankshaft', sev: 'retire', w: 1 },
      { name: 'seized piston', sev: 'retire', w: 2 },
      { name: 'connecting rod through the block', sev: 'retire', w: 1.5 },
    ],
  },
  {
    id: 'topEnd', name: 'Engine top end', group: 'engine', hazard: 1.4, wearsWith: 'engine',
    modes: [
      { name: 'burnt valve', sev: 'limp', limp: 0.06, w: 3 },
      { name: 'broken valve spring', sev: 'fix', repair: [240, 420], w: 3 },
      { name: 'blown head gasket', sev: 'limp', limp: 0.08, w: 2 },
      { name: 'camshaft drive failure', sev: 'retire', w: 1.5 },
      { name: 'cracked cylinder', sev: 'retire', w: 1 },
    ],
  },
  {
    id: 'lubrication', name: 'Lubrication', group: 'engine', hazard: 0.7, wearsWith: 'engine',
    modes: [
      { name: 'oil pump failure', sev: 'retire', w: 2 },
      { name: 'oil leak', sev: 'limp', limp: 0.05, w: 3 },
      { name: 'fractured oil pipe', sev: 'fix', repair: [200, 360], w: 2 },
    ],
  },
  {
    id: 'ignitionFuel', name: 'Ignition and fuel delivery', group: 'engine', hazard: 1.6, wearsWith: 'engine',
    modes: [
      { name: 'magneto failure', sev: 'retire', w: 1 },
      { name: 'fouled spark plugs', sev: 'fix', repair: [90, 180], w: 4 },
      { name: 'flooding carburettor', sev: 'limp', limp: 0.07, w: 2 },
      { name: 'fuel pipe leak', sev: 'fix', repair: [150, 280], w: 3 },
      { name: 'fuel tank split', sev: 'retire', w: 1 },
    ],
  },
  {
    id: 'cooling', name: 'Cooling', group: 'engine', hazard: 0.8, wearsWith: 'engine',
    modes: [
      { name: 'radiator leak', sev: 'fix', repair: [180, 300], w: 3 },
      { name: 'overheating', sev: 'limp', limp: 0.07, w: 3 },
      { name: 'water pump seized', sev: 'retire', w: 1.5 },
    ],
  },
  {
    id: 'transmission', name: 'Transmission', group: 'chassis', hazard: 0.9, wearsWith: 'drive',
    modes: [
      { name: 'clutch failure', sev: 'retire', w: 2 },
      { name: 'stripped gearbox', sev: 'retire', w: 2 },
      { name: 'broken propeller shaft', sev: 'retire', w: 1.5 },
      { name: 'rear axle failure', sev: 'retire', w: 1 },
      { name: 'jammed gear', sev: 'limp', limp: 0.09, w: 2 },
    ],
  },
  {
    id: 'brakes', name: 'Brakes', group: 'chassis', hazard: 0.6, wearsWith: 'brakes',
    modes: [
      { name: 'brake fade', sev: 'limp', limp: 0.05, w: 3 },
      { name: 'snapped brake rod', sev: 'fix', repair: [120, 240], w: 2 },
    ],
  },
  {
    id: 'suspension', name: 'Suspension', group: 'chassis', hazard: 0.8, wearsWith: 'drive',
    modes: [
      { name: 'broken spring', sev: 'fix', repair: [240, 420], w: 3 },
      { name: 'damaged hangers', sev: 'limp', limp: 0.06, w: 2 },
      { name: 'broken steering arm', sev: 'retire', w: 1.5 },
    ],
  },
  {
    id: 'frame', name: 'Frame and steering', group: 'chassis', hazard: 0.4, wearsWith: 'drive',
    modes: [
      { name: 'cracked frame', sev: 'retire', w: 2 },
      { name: 'steering box failure', sev: 'retire', w: 2 },
    ],
  },
  {
    id: 'wheels', name: 'Wheels', group: 'chassis', hazard: 0.5, wearsWith: 'drive',
    modes: [
      { name: 'collapsed wheel', sev: 'retire', w: 2 },
      { name: 'lost wheel nut', sev: 'fix', repair: [120, 200], w: 3 },
    ],
  },
];

export const TYRE_FAILURES = [
  { name: 'puncture', sev: 'fix', repair: [150, 270], w: 8 },
  { name: 'tread separation', sev: 'fix', repair: [200, 320], w: 2 },
];

export const COMPONENT_BY_ID = Object.fromEntries(COMPONENTS.map((c) => [c.id, c]));
