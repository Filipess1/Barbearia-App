import { Ban, Camera, Clock, Pencil, Settings2, Star, UtensilsCrossed, X, Zap } from 'lucide-react';
import { ChangeEvent } from 'react';
import {
  Appointment,
  Barber,
  DayOption,
  ProSlotMode,
  ServiceItem,
  UserSession,
} from '../types';
import { formatBRL, generateTimeSlots } from '../data/barbershopData';

interface BarberScheduleViewProps {
  barbers: Barber[];
  services: ServiceItem[];
  appointments: Appointment[];
  days: DayOption[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  session: UserSession;
  proSlotMode: ProSlotMode;
  onChangeProSlotMode: (mode: ProSlotMode) => void;
  getLunchSlots: (barberId: string, date: string) => string[];
  getUnavailableSlots: (barberId: string, date: string) => string[];
  onToggleLunchSlot: (barberId: string, time: string) => void;
  onToggleUnavailableSlot: (barberId: string, time: string) => void;
  onToggleUnavailablePeriod: (barberId: string, period: 'morning' | 'afternoon' | 'day') => void;
  onSelectSlot: (barberId: string, time: string) => void;
  onSelectOccupiedSlot: (appointment: Appointment) => void;
  barberPhotos: Record<string, string>;
  onUploadBarberPhoto: (barberId: string, dataUrl: string) => void;
  onRemoveBarberPhoto: (barberId: string) => void;
  onOpenShopSettings: () => void;
  onQuickWalkIn: () => void;
}

export function BarberScheduleView({
  barbers,
  services,
  appointments,
  days,
  selectedDate,
  onSelectDate,
  session,
  proSlotMode,
  onChangeProSlotMode,
  getLunchSlots,
  getUnavailableSlots,
  onToggleLunchSlot,
  onToggleUnavailableSlot,
  onToggleUnavailablePeriod,
  onSelectSlot,
  onSelectOccupiedSlot,
  barberPhotos,
  onUploadBarberPhoto,
  onRemoveBarberPhoto,
  onOpenShopSettings,
  onQuickWalkIn,
}: BarberScheduleViewProps) {
  const handlePhotoFileChange = (
    barberId: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 320;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          onUploadBarberPhoto(barberId, canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const isOwnClientAppointment = (apt: Appointment) => {
    if (session.role !== 'client') return false;
    const name = session.clientName.trim().toLowerCase();
    const phone = session.clientPhone.replace(/\D/g, '');
    if (name && name !== 'cliente' && apt.clientName.toLowerCase().includes(name)) {
      return true;
    }
    if (phone.length >= 4 && apt.clientPhone.replace(/\D/g, '').includes(phone)) {
      return true;
    }
    return false;
  };

  const orderedBarbers =
    session.role === 'pro' && session.barberId !== 'all'
      ? [...barbers].sort((a, b) =>
          a.id === session.barberId ? -1 : b.id === session.barberId ? 1 : 0
        )
      : barbers;

  return (
    <section>
      <div className="controls-bar">
        <div className="day-pills" role="tablist" aria-label="Selecionar data">
          {days.map((day) => (
            <button
              key={day.dateStr}
              type="button"
              role="tab"
              aria-selected={selectedDate === day.dateStr}
              className={`day-pill ${selectedDate === day.dateStr ? 'active' : ''}`}
              onClick={() => onSelectDate(day.dateStr)}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="legend-row">
          <span className="legend-item">
            <span className="legend-dot dot-free" /> Disponível
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-busy" /> Ocupado
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-preferencial" /> Preferencial
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-kids" /> Kids
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-walkin" /> Encaixe
          </span>
          {session.role === 'client' && (
            <span className="legend-item">
              <span className="legend-dot dot-own" /> Seu horário
            </span>
          )}
          <span className="legend-item">
            <span className="legend-dot dot-lunch" /> Almoço
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-unavailable" /> Indisponível
          </span>
        </div>
      </div>

      {session.role === 'pro' && (
        <div className="pro-mode-bar">
          <div className="pro-mode-buttons">
            <button
              type="button"
              className="pro-mode-btn walkin-btn"
              onClick={onQuickWalkIn}
            >
              <Zap size={15} />
              Encaixar no Próximo Livre
            </button>

            <button
              type="button"
              className={`pro-mode-btn ${proSlotMode === 'lunch' ? 'lunch-active' : ''}`}
              onClick={() =>
                onChangeProSlotMode(proSlotMode === 'lunch' ? 'book' : 'lunch')
              }
            >
              <UtensilsCrossed size={15} />
              Selecionar Horário de Almoço
            </button>

            <button
              type="button"
              className={`pro-mode-btn ${proSlotMode === 'unavailable' ? 'unavail-active' : ''}`}
              onClick={() =>
                onChangeProSlotMode(proSlotMode === 'unavailable' ? 'book' : 'unavailable')
              }
            >
              <Ban size={15} />
              Deixar Horário Indisponível
            </button>

            <button
              type="button"
              className="pro-mode-btn"
              onClick={onOpenShopSettings}
            >
              <Settings2 size={15} />
              Editar Barbearia, Logo &amp; Nomes
            </button>
          </div>

          {proSlotMode !== 'book' && (
            <div className="pro-mode-banner" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span>
                {proSlotMode === 'lunch'
                  ? 'Modo Almoço ativo: clique nos horários abaixo para marcar ou remover o almoço.'
                  : 'Modo Indisponível ativo: clique nos horários ou bloqueie um período inteiro.'}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {proSlotMode === 'unavailable' && (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                      onClick={() => onToggleUnavailablePeriod('all', 'morning')}
                    >
                      ☀️ Manhã Indisponível (Todos)
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                      onClick={() => onToggleUnavailablePeriod('all', 'afternoon')}
                    >
                      🌇 Tarde Indisponível (Todos)
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                      onClick={() => onToggleUnavailablePeriod('all', 'day')}
                    >
                      🚫 Dia Todo Indisponível (Todos)
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                  onClick={() => onChangeProSlotMode('book')}
                >
                  Concluir edição
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="barbers-grid">
        {orderedBarbers.map((barber) => {
          const slots = generateTimeSlots(barber.workStart, barber.workEnd, 30);
          const lunchSlots = new Set(getLunchSlots(barber.id, selectedDate));
          const unavailSlots = new Set(getUnavailableSlots(barber.id, selectedDate));

          const barberDayAppointments = appointments.filter(
            (a) => a.barberId === barber.id && a.date === selectedDate
          );

          const appointmentByTime = new Map<string, Appointment>();
          barberDayAppointments.forEach((a) => appointmentByTime.set(a.time, a));

          const availableSlots = slots.filter(
            (t) =>
              !lunchSlots.has(t) && !unavailSlots.has(t) && !appointmentByTime.has(t)
          );

          const barberServices = services.filter((s) =>
            barber.featuredServices.includes(s.id)
          );

          const isHighlightedPro =
            session.role === 'pro' && session.barberId === barber.id;

          return (
            <article
              key={barber.id}
              className={`barber-card ${isHighlightedPro ? 'barber-card-highlight' : ''}`}
            >
              <div className="barber-header">
                <div className="barber-top-row">
                  <div className="barber-photo-wrap">
                    <div
                      className="barber-photo-frame"
                      style={{
                        background: `linear-gradient(135deg, ${barber.accentColor}33, ${barber.accentColor}11)`,
                        color: barber.accentColor,
                        borderColor: `${barber.accentColor}55`,
                      }}
                    >
                      {barberPhotos[barber.id] || barber.photoUrl ? (
                        <img
                          src={barberPhotos[barber.id] || barber.photoUrl}
                          alt={`Foto de ${barber.name}`}
                          className="barber-photo-img"
                        />
                      ) : (
                        <span>{barber.initials}</span>
                      )}
                    </div>

                    {session.role === 'pro' && (
                      <>
                        <label
                          className="photo-upload-label"
                          title="Adicionar ou trocar foto do barbeiro"
                        >
                          <Camera size={12} />
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handlePhotoFileChange(barber.id, e)}
                          />
                        </label>

                        {barberPhotos[barber.id] && (
                          <button
                            type="button"
                            className="photo-remove-btn"
                            title="Remover foto"
                            onClick={() => onRemoveBarberPhoto(barber.id)}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className="barber-name-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h2 className="barber-name">{barber.name}</h2>
                        {session.role === 'pro' && (
                          <button
                            type="button"
                            className="inline-edit-btn"
                            title="Editar nome do profissional"
                            onClick={onOpenShopSettings}
                            aria-label={`Editar nome de ${barber.name}`}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                      <span className="rating-badge">
                        <Star size={12} fill="currentColor" />
                        {barber.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="barber-role">
                      {barber.role} • {barber.experienceYears} anos exp.
                    </div>
                  </div>
                </div>

                <p className="barber-specialty">{barber.specialty}</p>

                <div className="barber-meta-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} />
                    {barber.workStart} às {barber.workEnd}
                  </span>

                  <span
                    className={`availability-pill ${
                      availableSlots.length > 0 ? 'open' : 'full'
                    }`}
                  >
                    {availableSlots.length > 0
                      ? `${availableSlots.length} horários livres`
                      : 'Agenda lotada'}
                  </span>
                </div>
              </div>

              <div className="barber-services-mini">
                <div className="mini-section-label">Destaques do Profissional</div>
                <div className="service-chips">
                  {barberServices.map((srv) => (
                    <span key={srv.id} className="service-chip">
                      {srv.name.split('(')[0].trim()} • {formatBRL(srv.price)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="slots-container">
                <div className="mini-section-label">
                  {session.role === 'pro' && proSlotMode === 'lunch'
                    ? 'Clique para marcar/desmarcar Almoço'
                    : session.role === 'pro' && proSlotMode === 'unavailable'
                    ? 'Clique para marcar/liberar Indisponível'
                    : session.role === 'pro'
                    ? 'Horários — Clique em livre para agendar ou ocupado para desmarcar'
                    : 'Horários Disponíveis — Clique para agendar'}
                </div>
                {session.role === 'pro' && (() => {
                  const morningSlots = slots.filter((t) => t < '12:00');
                  const afternoonSlots = slots.filter((t) => t >= '12:00');
                  const allMorningBlocked =
                    morningSlots.length > 0 && morningSlots.every((t) => unavailSlots.has(t));
                  const allAfternoonBlocked =
                    afternoonSlots.length > 0 && afternoonSlots.every((t) => unavailSlots.has(t));
                  const allDayBlocked =
                    slots.length > 0 && slots.every((t) => unavailSlots.has(t));
                  return (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      <button
                        type="button"
                        className={`pro-mode-btn ${allMorningBlocked ? 'unavail-active' : ''}`}
                        style={{ padding: '4px 9px', fontSize: '0.74rem' }}
                        onClick={() => onToggleUnavailablePeriod(barber.id, 'morning')}
                        title="Bloquear ou liberar toda a manhã (< 12:00)"
                      >
                        <Ban size={12} />
                        {allMorningBlocked ? 'Liberar Manhã' : 'Manhã Indisp.'}
                      </button>
                      <button
                        type="button"
                        className={`pro-mode-btn ${allAfternoonBlocked ? 'unavail-active' : ''}`}
                        style={{ padding: '4px 9px', fontSize: '0.74rem' }}
                        onClick={() => onToggleUnavailablePeriod(barber.id, 'afternoon')}
                        title="Bloquear ou liberar toda a tarde (>= 12:00)"
                      >
                        <Ban size={12} />
                        {allAfternoonBlocked ? 'Liberar Tarde' : 'Tarde Indisp.'}
                      </button>
                      <button
                        type="button"
                        className={`pro-mode-btn ${allDayBlocked ? 'unavail-active' : ''}`}
                        style={{ padding: '4px 9px', fontSize: '0.74rem' }}
                        onClick={() => onToggleUnavailablePeriod(barber.id, 'day')}
                        title="Bloquear ou liberar o dia inteiro"
                      >
                        <Ban size={12} />
                        {allDayBlocked ? 'Liberar Dia' : 'Dia Todo Indisp.'}
                      </button>
                    </div>
                  );
                })()}
                <div className="slots-grid">
                  {slots.map((time) => {
                    const lunch = lunchSlots.has(time);
                    const unavailable = unavailSlots.has(time);
                    const apt = appointmentByTime.get(time);

                    if (lunch) {
                      const canToggleLunch =
                        session.role === 'pro' && proSlotMode === 'lunch';
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={!canToggleLunch}
                          className={`slot-btn lunch ${canToggleLunch ? 'clickable' : ''}`}
                          onClick={() => canToggleLunch && onToggleLunchSlot(barber.id, time)}
                          title={
                            canToggleLunch
                              ? 'Clique para remover do almoço'
                              : 'Horário de almoço'
                          }
                        >
                          <span>{time}</span>
                          <span className="slot-sub">Almoço</span>
                        </button>
                      );
                    }

                    if (unavailable) {
                      const canToggleUnavail =
                        session.role === 'pro' && proSlotMode === 'unavailable';
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={!canToggleUnavail}
                          className={`slot-btn unavailable ${
                            canToggleUnavail ? 'clickable' : ''
                          }`}
                          onClick={() =>
                            canToggleUnavail && onToggleUnavailableSlot(barber.id, time)
                          }
                          title={
                            canToggleUnavail
                              ? 'Clique para liberar este horário'
                              : 'Horário indisponível'
                          }
                        >
                          <span>{time}</span>
                          <span className="slot-sub">Indisp.</span>
                        </button>
                      );
                    }

                    if (apt) {
                      const own = isOwnClientAppointment(apt);
                      const canManage =
                        (session.role === 'pro' && proSlotMode === 'book') || own;
                      const firstName = apt.clientName.split(' ')[0];
                      const typeClass =
                        apt.bookingType === 'preferencial'
                          ? 'slot-preferencial'
                          : apt.bookingType === 'kids'
                          ? 'slot-kids'
                          : apt.isWalkIn
                          ? 'slot-walkin'
                          : '';
                      const subLabel = own
                        ? 'Seu horário'
                        : session.role === 'pro'
                        ? apt.bookingType === 'preferencial'
                          ? `Pref. ${firstName}`
                          : apt.bookingType === 'kids'
                          ? `Kids ${firstName}`
                          : apt.isWalkIn
                          ? `Enc. ${firstName}`
                          : firstName
                        : apt.bookingType === 'preferencial'
                        ? 'Preferencial'
                        : apt.bookingType === 'kids'
                        ? 'Kids'
                        : 'Ocupado';

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={!canManage}
                          className={`slot-btn ${own ? 'own' : 'busy'} ${typeClass} ${
                            canManage ? 'clickable' : ''
                          }`}
                          onClick={() => canManage && onSelectOccupiedSlot(apt)}
                          title={
                            canManage
                              ? 'Clique para ver detalhes ou desmarcar'
                              : 'Horário ocupado'
                          }
                        >
                          <span>{time}</span>
                          <span className="slot-sub">{subLabel}</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={time}
                        type="button"
                        className="slot-btn free"
                        onClick={() => {
                          if (session.role === 'pro' && proSlotMode === 'lunch') {
                            onToggleLunchSlot(barber.id, time);
                          } else if (
                            session.role === 'pro' &&
                            proSlotMode === 'unavailable'
                          ) {
                            onToggleUnavailableSlot(barber.id, time);
                          } else {
                            onSelectSlot(barber.id, time);
                          }
                        }}
                      >
                        <span>{time}</span>
                        <span className="slot-sub">Livre</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
