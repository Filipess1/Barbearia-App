import { Award, Calendar, Clock, Plus, Scissors, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Appointment, Barber, BookingType, DayOption, ServiceItem, WaitlistEntry } from '../types';
import { formatBRL } from '../data/barbershopData';
import { getClientLoyaltyCount } from '../utils/scheduleUtils';
import { WaitlistPanel } from './WaitlistPanel';

interface MyAppointmentsViewProps {
  appointments: Appointment[];
  barbers: Barber[];
  services: ServiceItem[];
  days: DayOption[];
  clientName: string;
  clientPhone: string;
  loyaltyGoal: number;
  selectedDate: string;
  waitlist: WaitlistEntry[];
  onAddWaitlist: (entry: {
    clientName: string;
    clientPhone: string;
    preferredBarberId: 'any' | string;
    serviceId: string;
    bookingType: BookingType;
    date: string;
  }) => void;
  onRemoveWaitlist: (id: string) => void;
  onCancelAppointment: (id: string) => void;
  onOpenNewBooking: () => void;
}

export function MyAppointmentsView({
  appointments,
  barbers,
  services,
  days,
  clientName,
  clientPhone,
  loyaltyGoal,
  selectedDate,
  waitlist,
  onAddWaitlist,
  onRemoveWaitlist,
  onCancelAppointment,
  onOpenNewBooking,
}: MyAppointmentsViewProps) {
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const barberMap = new Map(barbers.map((b) => [b.id, b]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const dayMap = new Map(days.map((d) => [d.dateStr, d.label]));

  const normalizedName = clientName.trim().toLowerCase();
  const normalizedPhone = clientPhone.replace(/\D/g, '');

  const myAppointments = appointments
    .filter((apt) => {
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        return (
          apt.clientName.toLowerCase().includes(q) ||
          apt.clientPhone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
        );
      }
      if (normalizedName && normalizedName !== 'cliente' && normalizedName !== 'visitante') {
        if (apt.clientName.toLowerCase().includes(normalizedName)) return true;
      }
      if (normalizedPhone.length >= 4) {
        if (apt.clientPhone.replace(/\D/g, '').includes(normalizedPhone)) return true;
      }
      return false;
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const completedCount = getClientLoyaltyCount(
    appointments,
    searchFilter.trim() || clientName,
    clientPhone
  );
  const currentCycle = completedCount % loyaltyGoal;
  const freeEarned = completedCount > 0 && currentCycle === 0;

  return (
    <div>
      <section className="section-card">
        <div className="filter-toolbar" style={{ marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, marginBottom: 4 }}>
              Meus Agendamentos
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Consulte seus horários reservados, acompanhe sua fidelidade ou desmarque pelo celular.
            </p>
          </div>

          <button type="button" className="btn-primary" onClick={onOpenNewBooking}>
            <Plus size={16} />
            Agendar Horário
          </button>
        </div>

        {/* Cartão Fidelidade */}
        <div className="loyalty-card-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Award size={22} color="var(--gold)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
                  Cartão Fidelidade ({loyaltyGoal} cortes = 1 grátis)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {freeEarned
                    ? 'Parabéns! Você completou o ciclo e tem direito a um corte cortesia!'
                    : `Você tem ${currentCycle} de ${loyaltyGoal} cortes concluídos neste ciclo.`}
                </div>
              </div>
            </div>
            <span className="rating-badge" style={{ fontSize: '0.84rem', padding: '5px 12px' }}>
              {freeEarned ? 'Cortesia liberada!' : `${currentCycle}/${loyaltyGoal}`}
            </span>
          </div>

          <div className="loyalty-stamps">
            {Array.from({ length: loyaltyGoal }).map((_, idx) => {
              const filled = freeEarned || idx < currentCycle;
              return (
                <div
                  key={idx}
                  className={`loyalty-stamp ${filled ? 'filled' : ''}`}
                  title={`Corte ${idx + 1}`}
                >
                  {filled ? '✓' : idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-field" style={{ marginBottom: 18, maxWidth: 420 }}>
          <label className="form-label" htmlFor="search-my-apt">
            Buscar por seu nome ou telefone
          </label>
          <input
            id="search-my-apt"
            type="text"
            className="form-input"
            placeholder="Digite seu nome ou telefone para localizar..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        {myAppointments.length === 0 ? (
          <div className="empty-state-box">
            <Scissors size={28} color="var(--gold)" />
            <p style={{ fontWeight: 600, marginTop: 8 }}>
              Nenhum agendamento encontrado para {clientName || 'você'}.
            </p>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Escolha um horário livre na aba Horários ou clique em Agendar Horário.
            </p>
          </div>
        ) : (
          <div className="my-apts-grid">
            {myAppointments.map((apt) => {
              const barber = barberMap.get(apt.barberId);
              const srv = serviceMap.get(apt.serviceId);
              const isConfirming = confirmCancelId === apt.id;
              const cardTypeClass =
                apt.bookingType === 'preferencial'
                  ? 'apt-preferencial'
                  : apt.bookingType === 'kids'
                  ? 'apt-kids'
                  : '';

              return (
                <article key={apt.id} className={`apt-card ${cardTypeClass}`}>
                  <div className="apt-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="apt-time" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} />
                        {dayMap.get(apt.date) ?? apt.date} • {apt.time}
                      </span>
                      {apt.bookingType === 'preferencial' && (
                        <span className="badge-preferencial">Preferencial</span>
                      )}
                      {apt.bookingType === 'kids' && (
                        <span className="badge-kids">Kids</span>
                      )}
                    </div>
                    <span
                      className={`status-badge ${
                        apt.status === 'Aguardando'
                          ? 'status-aguardando'
                          : apt.status === 'Em Atendimento'
                          ? 'status-atendimento'
                          : 'status-concluido'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {srv?.name ?? 'Serviço'}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Profissional: <strong style={{ color: 'var(--text-primary)' }}>{barber?.name}</strong>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 6,
                        fontSize: '0.84rem',
                      }}
                    >
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                        {srv ? formatBRL(srv.price) : ''}
                      </span>
                      {srv && (
                        <span className="duration-badge">
                          <Clock size={13} /> {srv.durationMinutes} min
                        </span>
                      )}
                    </div>
                  </div>

                  {apt.status !== 'Concluído' && (
                    <div className="apt-actions" style={{ marginTop: 6 }}>
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            className="apt-action-btn danger-solid"
                            onClick={() => {
                              onCancelAppointment(apt.id);
                              setConfirmCancelId(null);
                            }}
                          >
                            Confirmar Desmarcação
                          </button>
                          <button
                            type="button"
                            className="apt-action-btn"
                            onClick={() => setConfirmCancelId(null)}
                          >
                            Manter
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="apt-action-btn danger"
                          onClick={() => setConfirmCancelId(apt.id)}
                        >
                          <Trash2 size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                          Desmarcar Agendamento
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <WaitlistPanel
        waitlist={waitlist}
        barbers={barbers}
        services={services}
        selectedDate={selectedDate}
        isPro={false}
        onAddWaitlist={onAddWaitlist}
        onRemoveWaitlist={onRemoveWaitlist}
        onFitWaitlistEntry={() => {}}
      />
    </div>
  );
}
