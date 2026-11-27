import { Appointment, Barber, ServiceItem } from '../types';

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function getOccupiedSlotTimes(startTime: string, durationMinutes = 30): string[] {
  const blocks = Math.max(1, Math.ceil(durationMinutes / 30));
  const startMin = timeToMinutes(startTime);
  const result: string[] = [];
  for (let i = 0; i < blocks; i++) {
    result.push(minutesToTime(startMin + i * 30));
  }
  return result;
}

export function buildBarberOccupiedMap(
  appointments: Appointment[],
  services: ServiceItem[],
  barberId: string,
  date: string
): Map<string, { appointment: Appointment; isContinuation: boolean }> {
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const map = new Map<string, { appointment: Appointment; isContinuation: boolean }>();

  appointments
    .filter((a) => a.barberId === barberId && a.date === date)
    .forEach((apt) => {
      const srv = serviceMap.get(apt.serviceId);
      const slots = getOccupiedSlotTimes(apt.time, srv?.durationMinutes ?? 30);
      slots.forEach((slotTime, idx) => {
        if (!map.has(slotTime)) {
          map.set(slotTime, { appointment: apt, isContinuation: idx > 0 });
        }
      });
    });

  return map;
}

export function canBookAtTime(
  barber: Barber,
  startTime: string,
  durationMinutes: number,
  lunchSlots: Set<string>,
  unavailSlots: Set<string>,
  occupiedSlots: Set<string>
): boolean {
  const needed = getOccupiedSlotTimes(startTime, durationMinutes);
  const workEndMin = timeToMinutes(barber.workEnd);

  return needed.every((slot) => {
    const slotMin = timeToMinutes(slot);
    if (slotMin >= workEndMin) return false;
    if (lunchSlots.has(slot)) return false;
    if (unavailSlots.has(slot)) return false;
    if (occupiedSlots.has(slot)) return false;
    return true;
  });
}

export function getClientLoyaltyCount(
  appointments: Appointment[],
  clientName: string,
  clientPhone: string
): number {
  const normName = clientName.trim().toLowerCase();
  const normPhone = clientPhone.replace(/\D/g, '');
  if (normName.length < 2 && normPhone.length < 8) return 0;

  return appointments.filter((a) => {
    if (a.status !== 'Concluído') return false;
    const aName = a.clientName.trim().toLowerCase();
    const aPhone = a.clientPhone.replace(/\D/g, '');
    const phoneMatch = normPhone.length >= 8 && aPhone === normPhone;
    const nameMatch = normName.length >= 2 && aName === normName;
    return phoneMatch || nameMatch;
  }).length;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  if (!digits) {
    return `https://wa.me/?text=${encoded}`;
  }
  const fullDigits = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${fullDigits}?text=${encoded}`;
}
