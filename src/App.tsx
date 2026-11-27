import { CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessModal } from './components/AccessModal';
import { AppointmentActionModal } from './components/AppointmentActionModal';
import { BarberScheduleView } from './components/BarberScheduleView';
import { BookingModal } from './components/BookingModal';
import { DailyAttendanceView } from './components/DailyAttendanceView';
import { FinanceView } from './components/FinanceView';
import { AppTab, Header } from './components/Header';
import { MyAppointmentsView } from './components/MyAppointmentsView';
import { ServiceTableView } from './components/ServiceTableView';
import { ShopSettingsModal } from './components/ShopSettingsModal';
import {
  BARBERS,
  SERVICES,
  generateTimeSlots,
  getInitialAppointments,
  getUpcomingDays,
} from './data/barbershopData';
import {
  Appointment,
  AppointmentStatus,
  Barber,
  BookingType,
  PaymentMethod,
  ProSlotMode,
  ShopSettings,
  UserSession,
  WaitlistEntry,
} from './types';
import { buildBarberOccupiedMap, canBookAtTime } from './utils/scheduleUtils';

const SESSION_KEY = 'barbearia_classica_session_v1';

interface ServerState {
  appointments: Appointment[];
  barbers: Barber[];
  shopSettings: ShopSettings;
  lunchOverrides: Record<string, string[]>;
  unavailableSlots: Record<string, string[]>;
  barberPhotos: Record<string, string>;
  waitlist?: WaitlistEntry[];
}

export function App() {
  const days = useMemo(() => getUpcomingDays(5), []);
  const [activeTab, setActiveTab] = useState<AppTab>('horarios');
  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [proSlotMode, setProSlotMode] = useState<ProSlotMode>('book');
  const [isSynced, setIsSynced] = useState<boolean>(false);

  const [session, setSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'client' || parsed.role === 'pro')) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return { role: 'pro', barberId: 'all' };
  });

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore storage errors
    }
  }, [session]);

  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    getInitialAppointments()
  );
  const [barbers, setBarbers] = useState<Barber[]>(BARBERS);
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    shopName: 'BARBEARIA CLÁSSICA',
    shopLogoUrl: '',
    loyaltyGoal: 10,
  });
  const [lunchOverrides, setLunchOverrides] = useState<Record<string, string[]>>({});
  const [unavailableSlots, setUnavailableSlots] = useState<Record<string, string[]>>({});
  const [barberPhotos, setBarberPhotos] = useState<Record<string, string>>({});
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  const applyServerState = useCallback((data: ServerState) => {
    if (Array.isArray(data.appointments)) setAppointments(data.appointments);
    if (Array.isArray(data.barbers) && data.barbers.length > 0) setBarbers(data.barbers);
    if (data.shopSettings) {
      setShopSettings({
        shopName: data.shopSettings.shopName || 'BARBEARIA CLÁSSICA',
        shopLogoUrl: data.shopSettings.shopLogoUrl || '',
        loyaltyGoal: data.shopSettings.loyaltyGoal ?? 10,
      });
    }
    if (data.lunchOverrides) setLunchOverrides(data.lunchOverrides);
    if (data.unavailableSlots) setUnavailableSlots(data.unavailableSlots);
    if (data.barberPhotos) setBarberPhotos(data.barberPhotos);
    if (Array.isArray(data.waitlist)) setWaitlist(data.waitlist);
  }, []);

  useEffect(() => {
    document.title = `${shopSettings.shopName} — Atendimento, Horários e Tabela de Cortes`;
  }, [shopSettings.shopName]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('API offline'))))
      .then((data: ServerState) => {
        if (!cancelled) {
          applyServerState(data);
          setIsSynced(true);
        }
      })
      .catch(() => {
        if (!cancelled) setIsSynced(false);
      });

    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('state', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as ServerState;
        if (!cancelled) {
          applyServerState(data);
          setIsSynced(true);
        }
      } catch {
        // ignore parse errors
      }
    });
    eventSource.onerror = () => {
      if (!cancelled) setIsSynced(false);
    };

    return () => {
      cancelled = true;
      eventSource.close();
    };
  }, [applyServerState]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    barberId?: string;
    serviceId?: string;
    time?: string;
    isWalkIn?: boolean;
    waitlistIdToRemove?: string;
    prefillClientName?: string;
    prefillClientPhone?: string;
  }>({ isOpen: false });

  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [isShopSettingsOpen, setIsShopSettingsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const getLunchSlots = useCallback(
    (barberId: string, date: string): string[] => {
      const key = `${barberId}_${date}`;
      if (lunchOverrides[key]) return lunchOverrides[key];
      const barber = barbers.find((b) => b.id === barberId);
      if (!barber) return [];
      return generateTimeSlots(barber.lunchStart, barber.lunchEnd, 30);
    },
    [lunchOverrides, barbers]
  );

  const getUnavailableSlots = useCallback(
    (barberId: string, date: string): string[] => {
      const key = `${barberId}_${date}`;
      return unavailableSlots[key] ?? [];
    },
    [unavailableSlots]
  );

  const handleToggleLunchSlot = async (barberId: string, time: string) => {
    try {
      const res = await fetch('/api/slots/lunch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId, date: selectedDate, time }),
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast(
        json.exists
          ? `Horário ${time} definido como almoço.`
          : `Horário ${time} removido do almoço.`
      );
    } catch {
      showToast('Erro ao comunicar com o servidor.');
    }
  };

  const handleToggleUnavailableSlot = async (barberId: string, time: string) => {
    try {
      const res = await fetch('/api/slots/unavailable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId, date: selectedDate, time }),
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast(
        json.exists
          ? `Horário ${time} marcado como indisponível.`
          : `Horário ${time} liberado novamente.`
      );
    } catch {
      showToast('Erro ao comunicar com o servidor.');
    }
  };

  const handleUploadBarberPhoto = async (barberId: string, dataUrl: string) => {
    try {
      const res = await fetch(`/api/barbers/${encodeURIComponent(barberId)}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      const barber = barbers.find((b) => b.id === barberId);
      showToast(`Foto de ${barber?.nickname ?? 'profissional'} atualizada!`);
    } catch {
      showToast('Erro ao salvar foto no servidor.');
    }
  };

  const handleRemoveBarberPhoto = async (barberId: string) => {
    try {
      const res = await fetch(`/api/barbers/${encodeURIComponent(barberId)}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: '' }),
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast('Foto removida.');
    } catch {
      showToast('Erro ao remover foto no servidor.');
    }
  };

  const handleSaveShopSettings = async (data: {
    shopName: string;
    shopLogoUrl: string;
    loyaltyGoal: number;
    barberUpdates: Array<{
      id: string;
      name: string;
      role: string;
      specialty: string;
      commissionPercent: number;
    }>;
    pinUpdates: Record<string, string>;
  }) => {
    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast('Dados da barbearia, comissões e PINs atualizados!');
    } catch {
      showToast('Erro ao salvar configurações no servidor.');
    }
  };

  const handleResetShopDefaults = async () => {
    try {
      const res = await fetch('/api/shop/reset', { method: 'POST' });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast('Nome, logo e profissionais restaurados ao padrão.');
    } catch {
      showToast('Erro ao restaurar padrões.');
    }
  };

  const todayCount = useMemo(
    () => appointments.filter((a) => a.date === days[0].dateStr).length,
    [appointments, days]
  );

  const handleChangeSession = (nextSession: UserSession) => {
    setSession(nextSession);
    setProSlotMode('book');
    if (nextSession.role === 'client' && (activeTab === 'atendimento' || activeTab === 'financeiro')) {
      setActiveTab('meus-agendamentos');
    } else if (nextSession.role === 'pro' && activeTab === 'meus-agendamentos') {
      setActiveTab('atendimento');
    }
    showToast(
      nextSession.role === 'client'
        ? `Acesso alterado para Cliente (${nextSession.clientName})`
        : 'Acesso Profissional ativado!'
    );
  };

  const findNextFreeSlot = useCallback(
    (preferredBarberId: 'any' | string, durationMinutes = 30) => {
      const targetBarbers =
        preferredBarberId !== 'any'
          ? barbers.filter((b) => b.id === preferredBarberId)
          : session.role === 'pro' && session.barberId !== 'all'
          ? barbers.filter((b) => b.id === session.barberId)
          : barbers;

      const now = new Date();
      const isToday = selectedDate === days[0].dateStr;
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      const candidates: Array<{ barberId: string; time: string }> = [];

      targetBarbers.forEach((barber) => {
        const slots = generateTimeSlots(barber.workStart, barber.workEnd, 30);
        const lunch = new Set(getLunchSlots(barber.id, selectedDate));
        const unavail = new Set(getUnavailableSlots(barber.id, selectedDate));
        const occMap = buildBarberOccupiedMap(
          appointments,
          SERVICES,
          barber.id,
          selectedDate
        );
        const occupied = new Set(occMap.keys());

        const freeSlots = slots.filter((t) =>
          canBookAtTime(barber, t, durationMinutes, lunch, unavail, occupied)
        );
        const preferred = isToday
          ? freeSlots.find((t) => t >= nowHHMM) ?? freeSlots[0]
          : freeSlots[0];

        if (preferred) {
          candidates.push({ barberId: barber.id, time: preferred });
        }
      });

      if (candidates.length === 0) return null;
      candidates.sort((a, b) => a.time.localeCompare(b.time));
      return candidates[0];
    },
    [barbers, session, selectedDate, days, getLunchSlots, getUnavailableSlots, appointments]
  );

  const handleQuickWalkIn = () => {
    const earliest = findNextFreeSlot('any', 30);
    if (!earliest) {
      showToast('Não há horários livres nesta data para encaixe.');
      return;
    }
    setModalState({
      isOpen: true,
      barberId: earliest.barberId,
      time: earliest.time,
      isWalkIn: true,
    });
  };

  const handleAddWaitlist = async (entry: {
    clientName: string;
    clientPhone: string;
    preferredBarberId: 'any' | string;
    serviceId: string;
    bookingType: BookingType;
    date: string;
  }) => {
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast(`${entry.clientName} adicionado à fila de espera!`);
    } catch {
      showToast('Erro ao adicionar na fila de espera.');
    }
  };

  const handleRemoveWaitlist = async (id: string) => {
    try {
      const res = await fetch(`/api/waitlist/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast('Removido da fila de espera.');
    } catch {
      showToast('Erro ao remover da fila.');
    }
  };

  const handleFitWaitlistEntry = (entry: WaitlistEntry) => {
    const srv = SERVICES.find((s) => s.id === entry.serviceId);
    const earliest =
      findNextFreeSlot(entry.preferredBarberId, srv?.durationMinutes ?? 30) ??
      findNextFreeSlot('any', srv?.durationMinutes ?? 30);

    if (!earliest) {
      showToast('Sem horário livre suficiente para este serviço hoje.');
      return;
    }

    setModalState({
      isOpen: true,
      barberId: earliest.barberId,
      serviceId: entry.serviceId,
      time: earliest.time,
      isWalkIn: false,
      waitlistIdToRemove: entry.id,
      prefillClientName: entry.clientName,
      prefillClientPhone: entry.clientPhone,
    });
  };

  const handleConfirmBooking = async (data: {
    barberId: string;
    serviceId: string;
    date: string;
    time: string;
    clientName: string;
    clientPhone: string;
    bookingType: BookingType;
    isWalkIn?: boolean;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          fromClient: session.role === 'client',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Não foi possível agendar este horário.');
        return false;
      }
      if (json.state) applyServerState(json.state);
      setSelectedDate(data.date);

      if (modalState.waitlistIdToRemove) {
        await handleRemoveWaitlist(modalState.waitlistIdToRemove);
      }

      if (session.role === 'client') {
        setSession({
          role: 'client',
          clientName: data.clientName,
          clientPhone: data.clientPhone || session.clientPhone,
        });
      }

      const barber = barbers.find((b) => b.id === data.barberId);
      showToast(
        `Agendado para ${data.clientName} com ${barber?.nickname ?? 'barbeiro'} às ${data.time}!`
      );
      return true;
    } catch {
      showToast('Erro ao conectar com o servidor.');
      return false;
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: AppointmentStatus,
    paymentMethod?: PaymentMethod
  ) => {
    try {
      const apt = appointments.find((a) => a.id === id);
      const srv = apt ? SERVICES.find((s) => s.id === apt.serviceId) : undefined;
      const res = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          paymentMethod,
          finalPrice: status === 'Concluído' ? srv?.price : undefined,
        }),
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      if (status === 'Concluído' && paymentMethod) {
        showToast(`Atendimento concluído (${paymentMethod})!`);
      }
    } catch {
      showToast('Erro ao atualizar status no servidor.');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast('Agendamento desmarcado e horário liberado.');
    } catch {
      showToast('Erro ao desmarcar no servidor.');
    }
  };

  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/appointments/reset', { method: 'POST' });
      const json = await res.json();
      if (json.state) applyServerState(json.state);
      showToast('Agenda, almoços e bloqueios restaurados.');
    } catch {
      showToast('Erro ao restaurar agenda.');
    }
  };

  const loyaltyGoal = shopSettings.loyaltyGoal ?? 10;

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewBooking={() => setModalState({ isOpen: true })}
        onOpenAccess={() => setIsAccessOpen(true)}
        session={session}
        barbers={barbers}
        todayCount={todayCount}
        shopName={shopSettings.shopName}
        shopLogoUrl={shopSettings.shopLogoUrl}
        isSynced={isSynced}
      />

      <main>
        {activeTab === 'horarios' && (
          <BarberScheduleView
            barbers={barbers}
            services={SERVICES}
            appointments={appointments}
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            session={session}
            proSlotMode={proSlotMode}
            onChangeProSlotMode={setProSlotMode}
            getLunchSlots={getLunchSlots}
            getUnavailableSlots={getUnavailableSlots}
            onToggleLunchSlot={handleToggleLunchSlot}
            onToggleUnavailableSlot={handleToggleUnavailableSlot}
            onSelectSlot={(barberId, time) =>
              setModalState({
                isOpen: true,
                barberId,
                time,
                isWalkIn: false,
              })
            }
            onSelectOccupiedSlot={(apt) => setSelectedAppointment(apt)}
            barberPhotos={barberPhotos}
            onUploadBarberPhoto={handleUploadBarberPhoto}
            onRemoveBarberPhoto={handleRemoveBarberPhoto}
            onOpenShopSettings={() => setIsShopSettingsOpen(true)}
            onQuickWalkIn={handleQuickWalkIn}
          />
        )}

        {activeTab === 'tabela' && (
          <ServiceTableView
            services={SERVICES}
            barbers={barbers}
            onBookService={(serviceId, barberId) =>
              setModalState({ isOpen: true, serviceId, barberId })
            }
          />
        )}

        {activeTab === 'atendimento' && (
          <DailyAttendanceView
            barbers={barbers}
            services={SERVICES}
            appointments={appointments}
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            session={session}
            onUpdateStatus={handleUpdateStatus}
            onDeleteAppointment={handleDeleteAppointment}
            onResetDemo={handleResetDemo}
            onOpenScheduleMode={(mode) => {
              setProSlotMode(mode);
              setActiveTab('horarios');
            }}
            barberPhotos={barberPhotos}
            onOpenShopSettings={() => setIsShopSettingsOpen(true)}
            onQuickWalkIn={handleQuickWalkIn}
            loyaltyGoal={loyaltyGoal}
            waitlist={waitlist}
            onAddWaitlist={handleAddWaitlist}
            onRemoveWaitlist={handleRemoveWaitlist}
            onFitWaitlistEntry={handleFitWaitlistEntry}
          />
        )}

        {activeTab === 'financeiro' && (
          <FinanceView
            appointments={appointments}
            barbers={barbers}
            services={SERVICES}
            session={session}
          />
        )}

        {activeTab === 'meus-agendamentos' && (
          <MyAppointmentsView
            appointments={appointments}
            barbers={barbers}
            services={SERVICES}
            days={days}
            clientName={session.role === 'client' ? session.clientName : ''}
            clientPhone={session.role === 'client' ? session.clientPhone : ''}
            loyaltyGoal={loyaltyGoal}
            selectedDate={selectedDate}
            waitlist={waitlist}
            onAddWaitlist={handleAddWaitlist}
            onRemoveWaitlist={handleRemoveWaitlist}
            onCancelAppointment={handleDeleteAppointment}
            onOpenNewBooking={() => setModalState({ isOpen: true })}
          />
        )}
      </main>

      <BookingModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        barbers={barbers}
        services={SERVICES}
        days={days}
        appointments={appointments}
        initialBarberId={modalState.barberId}
        initialServiceId={modalState.serviceId}
        initialDate={selectedDate}
        initialTime={modalState.time}
        initialIsWalkIn={modalState.isWalkIn}
        isClientRole={session.role === 'client'}
        defaultClientName={
          modalState.prefillClientName ??
          (session.role === 'client' ? session.clientName : '')
        }
        defaultClientPhone={
          modalState.prefillClientPhone ??
          (session.role === 'client' ? session.clientPhone : '')
        }
        getLunchSlots={getLunchSlots}
        getUnavailableSlots={getUnavailableSlots}
        onConfirm={handleConfirmBooking}
      />

      <AccessModal
        isOpen={isAccessOpen}
        onClose={() => setIsAccessOpen(false)}
        barbers={barbers}
        session={session}
        onChangeSession={handleChangeSession}
      />

      <AppointmentActionModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        barbers={barbers}
        services={SERVICES}
        days={days}
        onCancelAppointment={handleDeleteAppointment}
      />

      <ShopSettingsModal
        isOpen={isShopSettingsOpen}
        onClose={() => setIsShopSettingsOpen(false)}
        shopName={shopSettings.shopName}
        shopLogoUrl={shopSettings.shopLogoUrl}
        loyaltyGoal={loyaltyGoal}
        barbers={barbers}
        onSave={handleSaveShopSettings}
        onResetDefaults={handleResetShopDefaults}
      />

      {toastMessage && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} color="var(--emerald)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
