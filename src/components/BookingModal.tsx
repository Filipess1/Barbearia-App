import { CheckCircle2, HeartHandshake, Info, MessageCircle, Smile, User, X, Zap } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Appointment, Barber, BookingType, DayOption, ServiceItem } from '../types';
import { formatBRL, generateTimeSlots } from '../data/barbershopData';
import { buildBarberOccupiedMap, buildWhatsAppUrl, canBookAtTime } from '../utils/scheduleUtils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  services: ServiceItem[];
  days: DayOption[];
  appointments: Appointment[];
  initialBarberId?: string;
  initialServiceId?: string;
  initialDate: string;
  initialTime?: string;
  initialIsWalkIn?: boolean;
  isClientRole?: boolean;
  defaultClientName?: string;
  defaultClientPhone?: string;
  getLunchSlots: (barberId: string, date: string) => string[];
  getUnavailableSlots: (barberId: string, date: string) => string[];
  onConfirm: (data: {
    barberId: string;
    serviceId: string;
    date: string;
    time: string;
    clientName: string;
    clientPhone: string;
    bookingType: BookingType;
    isWalkIn?: boolean;
  }) => Promise<boolean> | boolean | void;
}

export function BookingModal({
  isOpen,
  onClose,
  barbers,
  services,
  days,
  appointments,
  initialBarberId,
  initialServiceId,
  initialDate,
  initialTime,
  initialIsWalkIn = false,
  isClientRole = false,
  defaultClientName = '',
  defaultClientPhone = '',
  getLunchSlots,
  getUnavailableSlots,
  onConfirm,
}: BookingModalProps) {
  const [barberId, setBarberId] = useState(initialBarberId || barbers[0].id);
  const [serviceId, setServiceId] = useState(initialServiceId || services[0].id);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime || '');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('normal');
  const [isWalkInMode, setIsWalkInMode] = useState(initialIsWalkIn);
  const [confirmedSummary, setConfirmedSummary] = useState<{
    barberName: string;
    serviceName: string;
    dateLabel: string;
    time: string;
    clientName: string;
    clientPhone: string;
    bookingType: BookingType;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const nextBarber = initialBarberId || barbers[0].id;
    setBarberId(nextBarber);
    setDate(initialDate);

    if (initialServiceId) {
      setServiceId(initialServiceId);
      const srv = services.find((s) => s.id === initialServiceId);
      if (srv && !initialBarberId && !srv.barberIds.includes(nextBarber)) {
        setBarberId(srv.barberIds[0]);
      }
    } else {
      const valid = services.find((s) => s.barberIds.includes(nextBarber));
      if (valid) setServiceId(valid.id);
    }

    setTime(initialTime || '');
    setClientName(defaultClientName !== 'Cliente' ? defaultClientName : '');
    setClientPhone(defaultClientPhone);
    setBookingType(initialServiceId === 'corte-infantil' ? 'kids' : 'normal');
    setIsWalkInMode(initialIsWalkIn);
    setConfirmedSummary(null);
  }, [
    isOpen,
    initialBarberId,
    initialServiceId,
    initialDate,
    initialTime,
    initialIsWalkIn,
    defaultClientName,
    defaultClientPhone,
    barbers,
    services,
  ]);

  const availableServices = useMemo(
    () => services.filter((s) => s.barberIds.includes(barberId)),
    [services, barberId]
  );

  useEffect(() => {
    if (!availableServices.some((s) => s.id === serviceId) && availableServices.length > 0) {
      setServiceId(availableServices[0].id);
    }
  }, [availableServices, serviceId]);

  const availableTimes = useMemo(() => {
    const barber = barbers.find((b) => b.id === barberId);
    if (!barber) return [];
    const allSlots = generateTimeSlots(barber.workStart, barber.workEnd, 30);
    const lunch = new Set(getLunchSlots(barberId, date));
    const unavail = new Set(getUnavailableSlots(barberId, date));
    const occMap = buildBarberOccupiedMap(appointments, services, barberId, date);
    const occupied = new Set(occMap.keys());
    const srv = services.find((s) => s.id === serviceId);
    const duration = isWalkInMode ? 30 : srv?.durationMinutes ?? 30;

    return allSlots.filter((t) =>
      canBookAtTime(barber, t, duration, lunch, unavail, occupied)
    );
  }, [
    barbers,
    barberId,
    date,
    appointments,
    services,
    serviceId,
    isWalkInMode,
    getLunchSlots,
    getUnavailableSlots,
  ]);

  useEffect(() => {
    if (availableTimes.length > 0 && !availableTimes.includes(time)) {
      setTime(availableTimes[0]);
    } else if (availableTimes.length === 0) {
      setTime('');
    }
  }, [availableTimes, time]);

  const conflictingBarberAppointment = useMemo(() => {
    if (!isClientRole || isWalkInMode) return null;
    const normName = clientName.trim().toLowerCase();
    const normPhone = clientPhone.replace(/\D/g, '');
    if (normName.length < 2 && normPhone.length < 8) return null;

    return (
      appointments.find((a) => {
        if (a.date !== date || a.status === 'Concluído' || a.barberId === barberId) {
          return false;
        }
        const aName = a.clientName.trim().toLowerCase();
        const aPhone = a.clientPhone.replace(/\D/g, '');
        const phoneMatch = normPhone.length >= 8 && aPhone === normPhone;
        const nameMatch = normName.length >= 2 && aName === normName;
        return phoneMatch || nameMatch;
      }) || null
    );
  }, [isClientRole, isWalkInMode, clientName, clientPhone, appointments, date, barberId]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === serviceId);
  const conflictBarber = conflictingBarberAppointment
    ? barbers.find((b) => b.id === conflictingBarberAppointment.barberId)
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!time || !clientName.trim() || conflictingBarberAppointment) return;
    const trimmedName = clientName.trim();
    const barber = barbers.find((b) => b.id === barberId);
    const day = days.find((d) => d.dateStr === date);

    const ok = await onConfirm({
      barberId,
      serviceId,
      date,
      time,
      clientName: trimmedName,
      clientPhone: clientPhone.trim(),
      bookingType,
      isWalkIn: isWalkInMode,
    });

    if (ok === false) return;

    setConfirmedSummary({
      barberName: barber?.name ?? 'Profissional',
      serviceName: selectedService?.name ?? 'Serviço',
      dateLabel: day?.label ?? date,
      time,
      clientName: trimmedName,
      clientPhone: clientPhone.trim(),
      bookingType,
    });
  };

  if (confirmedSummary) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-panel">
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={22} color="var(--emerald)" />
              <div>
                <h3 id="confirm-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  Agendamento Confirmado!
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Horário reservado com sucesso
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ padding: 7 }}
              aria-label="Fechar modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="modal-body">
            <div className="apt-detail-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
                  {confirmedSummary.serviceName}
                </div>
                {confirmedSummary.bookingType === 'preferencial' && (
                  <span className="badge-preferencial">Preferencial</span>
                )}
                {confirmedSummary.bookingType === 'kids' && (
                  <span className="badge-kids">Kids</span>
                )}
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Cliente: <strong style={{ color: 'var(--text-primary)' }}>{confirmedSummary.clientName}</strong>
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Profissional: <strong style={{ color: 'var(--text-primary)' }}>{confirmedSummary.barberName}</strong>
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--gold)', fontWeight: 700 }}>
                {confirmedSummary.dateLabel} às {confirmedSummary.time}
              </div>
            </div>

            <div className="booking-notice-box">
              <Info size={18} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                <strong>Aviso importante ao cliente:</strong> Os atendimentos e cortes podem
                sofrer pequenas variações de alguns minutos. Caso você chegue e o barbeiro ainda
                esteja finalizando o corte anterior, pedimos por gentileza que aguarde a
                conclusão para ser atendido com a mesma qualidade.
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
            <a
              href={buildWhatsAppUrl(
                confirmedSummary.clientPhone,
                `Olá! Agendamento confirmado na Barbearia: ${confirmedSummary.serviceName} com ${confirmedSummary.barberName} em ${confirmedSummary.dateLabel} às ${confirmedSummary.time}. (Obs: os atendimentos podem sofrer pequenas variações de alguns minutos.)`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                flex: '1 1 auto',
                textDecoration: 'none',
                color: 'var(--emerald)',
                borderColor: 'var(--emerald-border)',
              }}
            >
              <MessageCircle size={16} />
              Enviar no WhatsApp
            </a>
            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{ flex: '1 1 auto' }}
            >
              Entendi, Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <form className="modal-panel" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 id="modal-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {isWalkInMode ? 'Encaixe Rápido' : 'Agendar Atendimento'}
              </h3>
              {isWalkInMode && <span className="badge-walkin">Sem Agendamento</span>}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isWalkInMode
                ? 'Horário selecionado — digite o nome para encaixar'
                : 'Reserve um horário disponível com o profissional escolhido'}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: 7 }}
            aria-label="Fechar modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isWalkInMode ? (
            <>
              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="booking-barber">
                    Profissional
                  </label>
                  <select
                    id="booking-barber"
                    className="form-select"
                    value={barberId}
                    onChange={(e) => setBarberId(e.target.value)}
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="booking-time">
                    Horário Livre ({days.find((d) => d.dateStr === date)?.label ?? date})
                  </label>
                  <select
                    id="booking-time"
                    className="form-select"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={availableTimes.length === 0}
                  >
                    {availableTimes.length === 0 ? (
                      <option value="">Sem horários livres</option>
                    ) : (
                      availableTimes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="booking-client">
                  Nome do Cliente *
                </label>
                <input
                  id="booking-client"
                  type="text"
                  className="form-input"
                  placeholder="Digite apenas o nome para encaixar..."
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', fontSize: '0.78rem', padding: '6px 10px' }}
                onClick={() => setIsWalkInMode(false)}
              >
                Usar agendamento completo (serviço / preferencial / kids)
              </button>
            </>
          ) : (
            <>
              <div className="form-field">
                <span className="form-label">Tipo de Atendimento</span>
                <div className="booking-type-pills">
                  <button
                    type="button"
                    className={`booking-type-pill ${bookingType === 'normal' ? 'active' : ''}`}
                    onClick={() => setBookingType('normal')}
                  >
                    <User size={14} />
                    Normal
                  </button>
                  <button
                    type="button"
                    className={`booking-type-pill preferencial ${
                      bookingType === 'preferencial' ? 'active' : ''
                    }`}
                    onClick={() => setBookingType('preferencial')}
                    title="Idosos 60+, PCD, Gestantes"
                  >
                    <HeartHandshake size={14} />
                    Preferencial
                  </button>
                  <button
                    type="button"
                    className={`booking-type-pill kids ${bookingType === 'kids' ? 'active' : ''}`}
                    onClick={() => {
                      setBookingType('kids');
                      const kidsService = availableServices.find(
                        (s) => s.id === 'corte-infantil'
                      );
                      if (kidsService) setServiceId(kidsService.id);
                    }}
                  >
                    <Smile size={14} />
                    Kids
                  </button>
                  <button
                    type="button"
                    className="booking-type-pill walkin"
                    onClick={() => setIsWalkInMode(true)}
                    title="Encaixe rápido (apenas profissional, horário e nome)"
                  >
                    <Zap size={14} />
                    Encaixe
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="booking-barber">
                  Profissional
                </label>
                <select
                  id="booking-barber"
                  className="form-select"
                  value={barberId}
                  onChange={(e) => setBarberId(e.target.value)}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="booking-service">
                  Serviço / Corte
                </label>
                <select
                  id="booking-service"
                  className="form-select"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatBRL(s.price)} ({s.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="booking-date">
                    Data
                  </label>
                  <select
                    id="booking-date"
                    className="form-select"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  >
                    {days.map((d) => (
                      <option key={d.dateStr} value={d.dateStr}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="booking-time">
                    Horário Livre
                  </label>
                  <select
                    id="booking-time"
                    className="form-select"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={availableTimes.length === 0}
                  >
                    {availableTimes.length === 0 ? (
                      <option value="">Sem horários livres</option>
                    ) : (
                      availableTimes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="booking-client">
                  Nome do Cliente *
                </label>
                <input
                  id="booking-client"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Carlos Eduardo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="booking-phone">
                  WhatsApp / Telefone (opcional)
                </label>
                <input
                  id="booking-phone"
                  type="tel"
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>

              {conflictingBarberAppointment && (
                <div className="confirm-cancel-box">
                  <p style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fecaca' }}>
                    Você já possui um agendamento nesta data com{' '}
                    <strong>{conflictBarber?.name ?? 'outro profissional'}</strong> às{' '}
                    <strong>{conflictingBarberAppointment.time}</strong>. Só é permitido marcar com
                    1 profissional por dia (desmarque o anterior para trocar).
                  </p>
                </div>
              )}

              {selectedService && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--gold-soft)',
                    border: '1px solid var(--gold-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.88rem',
                  }}
                >
                  <span>Total estimado ({selectedService.durationMinutes} min)</span>
                  <strong style={{ color: 'var(--gold)', fontSize: '1.05rem' }}>
                    {formatBRL(selectedService.price)}
                  </strong>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!time || !clientName.trim() || Boolean(conflictingBarberAppointment)}
          >
            {isWalkInMode ? 'Confirmar Encaixe' : 'Confirmar Agendamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
