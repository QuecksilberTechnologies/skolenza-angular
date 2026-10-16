import {
  AgentConnectionStatus,
  FieldVisit,
  FieldVisitStatus,
  ScreenCapture,
} from '@shared/interfaces';

/**
 * Demo data until the backend ships capture and field-visit read endpoints. Generated per
 * (staffMember, day) from a seeded PRNG so a day always shows the same screenshots and visits,
 * and "today" never shows anything later than now.
 */

const AGENTS: Record<string, { device: string; status: AgentConnectionStatus; field: boolean }> = {
  'EMP-1001': { device: 'AXN-LT-0142', status: 'Online', field: false },
  'EMP-1002': { device: 'AXN-LT-0187', status: 'Delayed', field: true },
  'EMP-1003': { device: 'AXN-LT-0203', status: 'Online', field: true },
  'EMP-1004': { device: 'AXN-LT-0099', status: 'Unreachable', field: false },
  'EMP-1005': { device: 'AXN-LT-0231', status: 'UploadFailure', field: true },
};

const SCREEN_IMAGES = 6;

const PLACES: readonly { name: string; address: string; lat: number; lng: number }[] = [
  { name: 'Client office', address: 'Sector 62, Noida, Uttar Pradesh', lat: 28.6271, lng: 77.3727 },
  {
    name: 'Distributor warehouse',
    address: 'Okhla Phase II, New Delhi',
    lat: 28.5355,
    lng: 77.2732,
  },
  { name: 'Retail partner', address: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
  { name: 'Prospect meeting', address: 'Cyber City, Gurugram, Haryana', lat: 28.495, lng: 77.0895 },
  {
    name: 'Service call',
    address: 'Indirapuram, Ghaziabad, Uttar Pradesh',
    lat: 28.6411,
    lng: 77.3714,
  },
  { name: 'Site survey', address: 'Sector 18, Noida, Uttar Pradesh', lat: 28.5708, lng: 77.3261 },
  { name: 'Branch office', address: 'Nehru Place, New Delhi', lat: 28.5494, lng: 77.2526 },
];

const PURPOSES = [
  'Product demo',
  'Installation',
  'Payment follow-up',
  'Quarterly review',
  'Complaint resolution',
  'New order discussion',
];

/** mulberry32 seeded from a string hash. */
function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dayAt(date: string, minutes: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 0, minutes);
}

function isWeekend(date: string): boolean {
  const day = dayAt(date, 0).getDay();
  return day === 0 || day === 6;
}

export function mockCaptures(staffMemberId: string, date: string, now = new Date()): ScreenCapture[] {
  if (!AGENTS[staffMemberId] || isWeekend(date)) return [];

  const rand = rng(`cap|${staffMemberId}|${date}`);
  const captures: ScreenCapture[] = [];
  // 09:30 to 18:30, one capture every 8-15 minutes, a lunch gap 13:00-13:45.
  for (let min = 570 + Math.floor(rand() * 10); min < 1110; min += 8 + Math.floor(rand() * 8)) {
    if (min >= 780 && min < 825) continue;
    const at = dayAt(date, min);
    if (at > now) break;
    const monitors = rand() < 0.25 ? 2 : 1;
    for (let monitorNumber = 0; monitorNumber < monitors; monitorNumber++) {
      const image = 1 + Math.floor(rand() * SCREEN_IMAGES);
      captures.push({
        captureId: `${staffMemberId}-${date}-${min}-${monitorNumber}`,
        staffMemberId,
        capturedAtUtc: at.toISOString(),
        monitorNumber,
        imageUrl: `mock/screens/screen-${image}.svg`,
      });
    }
  }
  return captures;
}

export function mockFieldVisits(staffMemberId: string, date: string, now = new Date()): FieldVisit[] {
  if (!AGENTS[staffMemberId]?.field || isWeekend(date)) return [];

  const rand = rng(`visit|${staffMemberId}|${date}`);
  const count = 2 + Math.floor(rand() * 4);
  const visits: FieldVisit[] = [];
  let min = 600 + Math.floor(rand() * 30);

  for (let i = 0; i < count && min < 1080; i++) {
    const place = PLACES[Math.floor(rand() * PLACES.length)];
    const checkIn = dayAt(date, min);
    if (checkIn > now) break;

    const duration = 30 + Math.floor(rand() * 75);
    const checkOut = dayAt(date, min + duration);
    const missed = rand() < 0.1;
    const status: FieldVisitStatus = missed
      ? 'Missed'
      : checkOut > now
        ? 'InProgress'
        : 'Completed';

    visits.push({
      id: `${staffMemberId}-${date}-${i}`,
      staffMemberId,
      checkInUtc: checkIn.toISOString(),
      checkOutUtc: status === 'Completed' ? checkOut.toISOString() : null,
      placeName: place.name,
      address: place.address,
      latitude: +(place.lat + (rand() - 0.5) * 0.01).toFixed(5),
      longitude: +(place.lng + (rand() - 0.5) * 0.01).toFixed(5),
      distanceMeters: i === 0 ? 0 : 1500 + Math.floor(rand() * 14000),
      purpose: PURPOSES[Math.floor(rand() * PURPOSES.length)],
      status,
    });
    min += duration + 25 + Math.floor(rand() * 50);
  }
  return visits;
}
