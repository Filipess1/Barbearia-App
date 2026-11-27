import { Clock, MessageCircle, Plus, Trash2, UserPlus, Zap } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Barber, BookingType, ServiceItem, WaitlistEntry } from '../types';
import { buildWhatsAppUrl } from '../utils/scheduleUtils';

interface WaitlistPanelProps {
  waitlist: WaitlistEntry[];
  barbers: Barber[];
  services: ServiceItem[];
  selectedDate: string;
  isPro: boolean;
  onAddWaitlist: (entry: {
    clientName: string;
    clientPhone: string;
    preferredBarberId: 'any' | string;
    serviceId: string;
    bookingType: BookingType;
    date: string;
  }) => void;
  onRemoveWaitlist: (id: string) => void;
  onFitWaitlistEntry: (entry: WaitlistEntry) => void;
}

export function WaitlistPanel({
  waitlist,
  barbers,
  services,
  selectedDate,
  isPro,
  onAddWaitlist,
  onRemoveWaitlist,
  onFitWaitlistEntry,
}: WaitlistPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [preferredBarberId, setPreferredBarberId] = useState<'any' | string>('any');
  const [serviceId, setServiceId] = useState(services[0]?.id || 'corte-social');
  const [bookingType, setBookingType] = useState<BookingType>('normal');

  const barberMap = new Map(barbers.map((b) => [b.id, b]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const dayList = waitlist.filter((w) => w.date === selectedDate);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    onAddWaitlist({
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      preferredBarberId,
      serviceId,
      bookingType,
      date: selectedDate,
    });
    setClientName('');
    setClientPhone('');
    setShowForm(false);
  };

  return (
    <section className="section-card" style={{ marginTop: 22 }}>
      <div className="filter-toolbar" style={{ marginBottom: showForm ? 16 : 12 }}>
        <div>
          <h3 style={{ fontSize: '1.08rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="var(--gold)" />
            Fila de Espera (Sem Agendamento) — {dayList.length}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Para clientes que chegaram sem horário ou aguardam desistência
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={15} />
          {showForm ? 'Fechar formulário' : 'Adicionar na Fila'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="waitlist-form">
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label" htmlFor="wl-name">
                Nome do Cliente *
              </label>
              <input
                id="wl-name"
                type="text"
                className="form-input"
                placeholder="Ex: Lucas Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="wl-phone">
                WhatsApp (para chamar)
              </label>
              <input
                id="wl-phone"
                type="tel"
                className="form-input"
                placeholder="(11) 99999-9999"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label" htmlFor="wl-barber">
                Preferência de Profissional
              </label>
              <select
                id="wl-barber"
                className="form-select"
                value={preferredBarberId}
                onChange={(e) => setPreferredBarberId(e.target.value)}
              >
                <option value="any">Qualquer barbeiro disponível</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="wl-service">
                Serviço Desejado
              </label>
              <select
                id="wl-service"
                className="form-select"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['normal', 'preferencial', 'kids'] as BookingType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`filter-pill ${bookingType === t ? 'active' : ''}`}
                  onClick={() => setBookingType(t)}
                >
                  {t === 'normal' ? 'Normal' : t === 'preferencial' ? 'Preferencial' : 'Kids'}
                </button>
              ))}
            </div>

            <button type="submit" className="btn-primary">
              Confirmar na Fila
            </button>
          </div>
        </form>
      )}

      {dayList.length === 0 ? (
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Ninguém aguardando na fila de espera para esta data.
        </p>
      ) : (
        <div className="my-apts-grid">
          {dayList.map((entry, idx) => {
            const srv = serviceMap.get(entry.serviceId);
            const prefBarber =
              entry.preferredBarberId === 'any'
                ? 'Qualquer profissional'
                : barberMap.get(entry.preferredBarberId)?.name ?? 'Barbeiro';

            const waMsg = `Olá ${entry.clientName}! Surgiu uma vaga agora na barbearia para seu atendimento (${srv?.name ?? 'Corte'}). Pode vir!`;

            return (
              <div key={entry.id} className="apt-card">
                <div className="apt-top">
                  <span className="apt-time">#{idx + 1} na fila</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {entry.bookingType === 'preferencial' && (
                      <span className="badge-preferencial">Preferencial</span>
                    )}
                    {entry.bookingType === 'kids' && (
                      <span className="badge-kids">Kids</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{entry.clientName}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {srv?.name ?? 'Serviço'} • {prefBarber}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <Clock size={12} /> Entrada às {entry.createdAt}
                    {entry.clientPhone ? ` • ${entry.clientPhone}` : ''}
                  </div>
                </div>

                {isPro && (
                  <div className="apt-actions">
                    <button
                      type="button"
                      className="apt-action-btn"
                      style={{ borderColor: 'var(--emerald-border)', color: 'var(--emerald)' }}
                      onClick={() => onFitWaitlistEntry(entry)}
                    >
                      <Zap size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Encaixar Agora
                    </button>
                    <a
                      href={buildWhatsAppUrl(entry.clientPhone, waMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apt-action-btn"
                      style={{ textAlign: 'center', textDecoration: 'none' }}
                    >
                      <MessageCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Chamar
                    </a>
                    <button
                      type="button"
                      className="apt-action-btn danger"
                      style={{ flex: '0 0 auto' }}
                      onClick={() => onRemoveWaitlist(entry.id)}
                      title="Remover da fila"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
