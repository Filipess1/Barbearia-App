import { Ban, CheckCircle2, Play, RotateCcw, Settings2, Trash2, UtensilsCrossed, Zap } from 'lucide-react';
import { useState } from 'react';
import {
  Appointment,
  AppointmentStatus,
  Barber,
  DayOption,
  ProSlotMode,
  ServiceItem,
  UserSession,
} from '../types';
import { formatBRL } from '../data/barbershopData';

interface DailyAttendanceViewProps {
  barbers: Barber[];
  services: ServiceItem[];
  appointments: Appointment[];
  days: DayOption[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  session: UserSession;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  onDeleteAppointment: (id: string) => void;
  onResetDemo: () => void;
  onOpenScheduleMode: (mode: ProSlotMode) => void;
  barberPhotos: Record<string, string>;
  onOpenShopSettings: () => void;
  onQuickWalkIn: () => void;
}

export function DailyAttendanceView({
  barbers,
  services,
  appointments,
  days,
  selectedDate,
  onSelectDate,
  session,
  onUpdateStatus,
  onDeleteAppointment,
  onResetDemo,
  onOpenScheduleMode,
  barberPhotos,
  onOpenShopSettings,
  onQuickWalkIn,
}: DailyAttendanceViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const activeProBarberId =
    session.role === 'pro' && session.barberId !== 'all' ? session.barberId : null;

  const visibleBarbers = activeProBarberId
    ? barbers.filter((b) => b.id === activeProBarberId)
    : barbers;

  const dayAppointments = appointments.filter(
    (a) =>
      a.date === selectedDate &&
      (!activeProBarberId || a.barberId === activeProBarberId)
  );

  const waitingCount = dayAppointments.filter((a) => a.status === 'Aguardando').length;
  const inProgressCount = dayAppointments.filter((a) => a.status === 'Em Atendimento').length;
  const doneCount = dayAppointments.filter((a) => a.status === 'Concluído').length;

  const getStatusClass = (status: AppointmentStatus) => {
    if (status === 'Aguardando') return 'status-badge status-aguardando';
    if (status === 'Em Atendimento') return 'status-badge status-atendimento';
    return 'status-badge status-concluido';
  };

  return (
    <section>
      <div className="controls-bar">
        <div className="day-pills">
          {days.map((day) => (
            <button
              key={day.dateStr}
              type="button"
              className={`day-pill ${selectedDate === day.dateStr ? 'active' : ''}`}
              onClick={() => onSelectDate(day.dateStr)}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="pro-mode-btn walkin-btn"
            onClick={onQuickWalkIn}
          >
            <Zap size={14} />
            Encaixar no Próximo Livre
          </button>
          <button
            type="button"
            className="pro-mode-btn"
            onClick={() => onOpenScheduleMode('lunch')}
          >
            <UtensilsCrossed size={14} />
            Horário de Almoço
          </button>
          <button
            type="button"
            className="pro-mode-btn"
            onClick={() => onOpenScheduleMode('unavailable')}
          >
            <Ban size={14} />
            Deixar Indisponível
          </button>
          <button
            type="button"
            className="pro-mode-btn"
            onClick={onOpenShopSettings}
          >
            <Settings2 size={14} />
            Editar Barbearia &amp; Nomes
          </button>
          <button type="button" className="btn-secondary" onClick={onResetDemo}>
            <RotateCcw size={14} />
            Restaurar agenda
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total na Data</div>
          <div className="stat-value">{dayAppointments.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aguardando</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>
            {waitingCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Em Atendimento</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>
            {inProgressCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Concluídos</div>
          <div className="stat-value" style={{ color: 'var(--emerald)' }}>
            {doneCount}
          </div>
        </div>
      </div>

      <div
        className="attendance-columns"
        style={
          visibleBarbers.length === 1
            ? { gridTemplateColumns: 'minmax(0, 560px)' }
            : undefined
        }
      >
        {visibleBarbers.map((barber) => {
          const list = dayAppointments
            .filter((a) => a.barberId === barber.id)
            .sort((a, b) => a.time.localeCompare(b.time));

          return (
            <div key={barber.id} className="attendance-col">
              <div className="attendance-col-header">
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700 }}>{barber.name}</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {list.length} {list.length === 1 ? 'atendimento' : 'atendimentos'}
                  </span>
                </div>
                <span
                  className="barber-avatar"
                  style={{
                    width: 40,
                    height: 40,
                    fontSize: '0.85rem',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: `${barber.accentColor}22`,
                    color: barber.accentColor,
                  }}
                >
                  {barberPhotos[barber.id] || barber.photoUrl ? (
                    <img
                      src={barberPhotos[barber.id] || barber.photoUrl}
                      alt={barber.name}
                      className="barber-photo-img"
                    />
                  ) : (
                    barber.initials
                  )}
                </span>
              </div>

              {list.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                  Nenhum atendimento agendado para esta data.
                </p>
              ) : (
                <div className="apt-list">
                  {list.map((apt) => {
                    const srv = serviceMap.get(apt.serviceId);
                    const isConfirming = confirmDeleteId === apt.id;

                    const cardTypeClass =
                      apt.bookingType === 'preferencial'
                        ? 'apt-preferencial'
                        : apt.bookingType === 'kids'
                        ? 'apt-kids'
                        : apt.isWalkIn
                        ? 'apt-walkin'
                        : '';

                    return (
                      <div key={apt.id} className={`apt-card ${cardTypeClass}`}>
                        <div className="apt-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="apt-time">{apt.time}</span>
                            {apt.bookingType === 'preferencial' && (
                              <span className="badge-preferencial">Preferencial</span>
                            )}
                            {apt.bookingType === 'kids' && (
                              <span className="badge-kids">Kids</span>
                            )}
                            {apt.isWalkIn && (
                              <span className="badge-walkin">Encaixe</span>
                            )}
                          </div>
                          <span className={getStatusClass(apt.status)}>{apt.status}</span>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                            {apt.clientName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {srv ? `${srv.name} • ${formatBRL(srv.price)}` : 'Serviço'}
                          </div>
                          {apt.clientPhone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {apt.clientPhone}
                            </div>
                          )}
                        </div>

                        <div className="apt-actions">
                          {isConfirming ? (
                            <>
                              <button
                                type="button"
                                className="apt-action-btn danger-solid"
                                onClick={() => {
                                  onDeleteAppointment(apt.id);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                Confirmar Desmarcação
                              </button>
                              <button
                                type="button"
                                className="apt-action-btn"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Voltar
                              </button>
                            </>
                          ) : (
                            <>
                              {apt.status === 'Aguardando' && (
                                <button
                                  type="button"
                                  className="apt-action-btn"
                                  onClick={() => onUpdateStatus(apt.id, 'Em Atendimento')}
                                >
                                  <Play size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                  Iniciar
                                </button>
                              )}
                              {apt.status !== 'Concluído' && (
                                <button
                                  type="button"
                                  className="apt-action-btn"
                                  onClick={() => onUpdateStatus(apt.id, 'Concluído')}
                                >
                                  <CheckCircle2
                                    size={12}
                                    style={{ marginRight: 4, verticalAlign: 'middle' }}
                                  />
                                  Concluir
                                </button>
                              )}
                              {apt.status !== 'Concluído' && (
                                <button
                                  type="button"
                                  className="apt-action-btn danger"
                                  onClick={() => setConfirmDeleteId(apt.id)}
                                  title="Desmarcar agendamento"
                                >
                                  <Trash2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                  Desmarcar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
