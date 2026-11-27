import { Scissors, Smartphone, User, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Barber, UserSession } from '../types';

interface AccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  session: UserSession;
  onChangeSession: (session: UserSession) => void;
}

export function AccessModal({
  isOpen,
  onClose,
  barbers,
  session,
  onChangeSession,
}: AccessModalProps) {
  const [mode, setMode] = useState<'client' | 'pro'>(session.role);
  const [clientName, setClientName] = useState(
    session.role === 'client' ? session.clientName : ''
  );
  const [clientPhone, setClientPhone] = useState(
    session.role === 'client' ? session.clientPhone : ''
  );
  const [proBarberId, setProBarberId] = useState(
    session.role === 'pro' ? session.barberId : 'all'
  );
  const [pin, setPin] = useState('1234');
  const [pinError, setPinError] = useState('');

  if (!isOpen) return null;

  const handleClientSubmit = (e: FormEvent) => {
    e.preventDefault();
    onChangeSession({
      role: 'client',
      clientName: clientName.trim() || 'Cliente',
      clientPhone: clientPhone.trim(),
    });
    onClose();
  };

  const handleProSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId: proBarberId, pin: pin.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setPinError(json.error || 'PIN incorreto.');
        return;
      }
    } catch {
      if (pin.trim() !== '1234') {
        setPinError('PIN incorreto. Use 1234 para acesso.');
        return;
      }
    }
    setPinError('');
    onChangeSession({
      role: 'pro',
      barberId: proBarberId,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h3 id="access-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Acesso ao Aplicativo
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Escolha como deseja acessar pelo celular ou computador
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: 7 }}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="access-mode-tabs">
            <button
              type="button"
              className={`access-mode-tab ${mode === 'client' ? 'active' : ''}`}
              onClick={() => setMode('client')}
            >
              <User size={16} />
              Sou Cliente
            </button>
            <button
              type="button"
              className={`access-mode-tab ${mode === 'pro' ? 'active' : ''}`}
              onClick={() => setMode('pro')}
            >
              <Scissors size={16} />
              Sou Profissional
            </button>
          </div>

          {mode === 'client' ? (
            <form onSubmit={handleClientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="access-client-name">
                  Seu Nome
                </label>
                <input
                  id="access-client-name"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Carlos Eduardo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="access-client-phone">
                  Seu WhatsApp / Telefone
                </label>
                <input
                  id="access-client-phone"
                  type="tel"
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                No acesso de cliente você vê os horários livres, consulta a tabela de cortes e pode{' '}
                <strong>agendar ou desmarcar</strong> seus horários direto do celular.
              </p>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Entrar como Cliente
              </button>
            </form>
          ) : (
            <form onSubmit={handleProSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-field">
                <label className="form-label" htmlFor="access-pro-barber">
                  Perfil do Profissional
                </label>
                <select
                  id="access-pro-barber"
                  className="form-select"
                  value={proBarberId}
                  onChange={(e) => setProBarberId(e.target.value)}
                >
                  <option value="all">Recepção / Todos os 3 Barbeiros</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="access-pro-pin">
                  PIN de Acesso (padrão: 1234)
                </label>
                <input
                  id="access-pro-pin"
                  type="password"
                  inputMode="numeric"
                  className="form-input"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError('');
                  }}
                />
                {pinError && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--rose)' }}>{pinError}</span>
                )}
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                No acesso profissional você acompanha sua agenda pelo celular, inicia e conclui
                atendimentos e pode desmarcar horários.
              </p>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Entrar como Profissional
              </button>
            </form>
          )}

          <div className="mobile-access-box">
            <Smartphone size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Acesso pelo celular (Wi-Fi):</strong>{' '}
              Abra no navegador do seu celular usando o endereço de rede local exibido no terminal
              (porta <code>5173</code>).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
