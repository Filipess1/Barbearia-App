export type ServiceCategory = 'Cortes' | 'Barba & Acabamento' | 'Combos & Especiais';

export type AppointmentStatus = 'Aguardando' | 'Em Atendimento' | 'Concluído';

export type BookingType = 'normal' | 'preferencial' | 'kids';

export type ProSlotMode = 'book' | 'lunch' | 'unavailable';

export type UserSession =
  | {
      role: 'client';
      clientName: string;
      clientPhone: string;
    }
  | {
      role: 'pro';
      barberId: 'all' | string;
    };

export interface Barber {
  id: string;
  name: string;
  nickname: string;
  role: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  reviewsCount: number;
  bio: string;
  initials: string;
  photoUrl?: string;
  accentColor: string;
  workStart: string; // HH:mm
  workEnd: string;   // HH:mm
  lunchStart: string; // HH:mm
  lunchEnd: string;   // HH:mm
  featuredServices: string[];
}

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  durationMinutes: number;
  price: number;
  barberIds: string[];
  popular?: boolean;
}

export interface Appointment {
  id: string;
  barberId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  clientName: string;
  clientPhone: string;
  status: AppointmentStatus;
  bookingType?: BookingType;
  isWalkIn?: boolean;
  notes?: string;
}

export interface DayOption {
  dateStr: string; // YYYY-MM-DD
  label: string;   // e.g. "Hoje", "Amanhã", "Qua, 26/11"
  weekday: string;
}
