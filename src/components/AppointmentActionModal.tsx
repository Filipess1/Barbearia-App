import { Calendar, Clock, MessageCircle, Scissors, Trash2, User, X } from 'lucide-react';
import { useState } from 'react';
import { Appointment, Barber, DayOption, ServiceItem } from '../types';
import { formatBRL } from '../data/barbershopData';
import { buildWhatsAppUrl } from '../utils/scheduleUtils';

interface AppointmentActionModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  barbers: Barber[];
  services: ServiceItem[];
  days: DayOption[];
  onCancelAppointment: (id: string) => void;
}

export function AppointmentActionModal({
  appointment,
  onClose,
  barbers,
  services,
  days,
  onCancelAppointment,
}: AppointmentActionModalProps) {
  const [confirming, setConfirming] = useState(false);

  if (!appointment) return null;

  const barber = barbers.find((b) => b.id === appointment.barberId);
  const service = services.find((s) => s.id === appointment.serviceId);
  const day = days.find((d) => d.dateStr === appointment.date);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="apt-detail-title">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h3 id="apt-detail-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Detalhes do Agendamento
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Gerencie ou desmarque este horário
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setConfirming(false);
              onClose();
            }}
            style={{ padding: 7 }}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="apt-detail-card">
            <div className="apt-detail-row">
              <User size={16} color="var(--gold)" />
              <span>
                Cliente: <strong>{appointment.clientName}</strong>
              </span>
              {appointment.bookingType === 'preferencial' && (
                <span className="badge-preferencial">Preferencial</span>
              )}
              {appointment.bookingType === 'kids' && (
                <span className="badge-kids">Kids</span>
              )}
            </div>
            {appointment.clientPhone && (
              <div className="apt-detail-row" style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                <span>Telefone: {appointment.clientPhone}</span>
              </div>
            )}
            <div className="apt-detail-row">
              <Scissors size={16} color="var(--gold)" />
              <span>
                Serviço: <strong>{service?.name ?? 'Serviço'}</strong>{' '}
                {service ? `(${formatBRL(service.price)})` : ''}
              </span>
            </div>
            <div className="apt-detail-row">
              <Calendar size={16} color="var(--gold)" />
              <span>
                Data: <strong>{day?.label ?? appointment.date}</strong>
              </span>
            </div>
            <div className="apt-detail-row">
              <Clock size={16} color="var(--gold)" />
              <span>
                Horário: <strong>{appointment.time}</strong> com{' '}
                <strong>{barber?.name}</strong>
              </span>
            </div>
          </div>

          {confirming ? (
            <div className="confirm-cancel-box">
              <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                Tem certeza que deseja desmarcar este horário? Ele ficará disponível novamente na agenda.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="apt-action-btn danger-solid"
                  onClick={() => {
                    onCancelAppointment(appointment.id);
                    setConfirming(false);
                    onClose();
                  }}
                >
                  Sim, Desmarcar Agora
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirming(false)}
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
          <a
            href={buildWhatsAppUrl(
              appointment.clientPhone,
              `Olá ${appointment.clientName}! Lembrando do seu horário (${service?.name ?? 'Corte'}) com ${barber?.name ?? 'nosso barbeiro'} em ${day?.label ?? appointment.date} às ${appointment.time}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none', color: 'var(--emerald)', borderColor: 'var(--emerald-border)' }}
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setConfirming(false);
              onClose();
            }}
          >
            Fechar
          </button>
          {appointment.status !== 'Concluído' && !confirming && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={15} />
              Desmarcar Agendamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
