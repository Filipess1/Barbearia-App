import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Plus,
  Scissors,
  UserCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { Barber, UserSession } from '../types';

export type AppTab = 'horarios' | 'tabela' | 'atendimento' | 'financeiro' | 'meus-agendamentos';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenNewBooking: () => void;
  onOpenAccess: () => void;
  session: UserSession;
  barbers: Barber[];
  todayCount: number;
  shopName: string;
  shopLogoUrl: string;
  isSynced?: boolean;
}

export function Header({
  activeTab,
  onSelectTab,
  onOpenNewBooking,
  onOpenAccess,
  session,
  barbers,
  todayCount,
  shopName,
  shopLogoUrl,
  isSynced = false,
}: HeaderProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  const proBarber =
    session.role === 'pro' && session.barberId !== 'all'
      ? barbers.find((b) => b.id === session.barberId)
      : null;

  const accessLabel =
    session.role === 'client'
      ? `Cliente: ${session.clientName || 'Visitante'}`
      : proBarber
      ? `Profissional: ${proBarber.nickname}`
      : 'Recepção (Todos)';

  return (
    <>
      <header className="top-header">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            {!logoFailed ? (
              <img
                src={shopLogoUrl || '/logo-barbearia.svg'}
                alt={`Logo ${shopName}`}
                className="brand-logo-img"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <Scissors size={22} />
            )}
          </div>
          <div>
            <div className="brand-title">{shopName}</div>
            <div className="brand-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>3 Profissionais • Horários, Serviços &amp; Tabela de Cortes</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isSynced ? 'var(--emerald)' : 'var(--amber)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isSynced ? 'var(--emerald)' : 'var(--amber)',
                  }}
                />
                {isSynced ? 'Sincronizado' : 'Conectando...'}
              </span>
            </div>
          </div>
        </div>

        <nav className="nav-tabs desktop-only-nav" aria-label="Navegação principal">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'horarios' ? 'active' : ''}`}
            onClick={() => onSelectTab('horarios')}
          >
            <CalendarDays size={16} />
            Horários
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'tabela' ? 'active' : ''}`}
            onClick={() => onSelectTab('tabela')}
          >
            <Scissors size={16} />
            Tabela de Cortes
          </button>
          {session.role === 'client' ? (
            <button
              type="button"
              className={`nav-tab ${activeTab === 'meus-agendamentos' ? 'active' : ''}`}
              onClick={() => onSelectTab('meus-agendamentos')}
            >
              <CalendarCheck size={16} />
              Meus Horários
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`nav-tab ${activeTab === 'atendimento' ? 'active' : ''}`}
                onClick={() => onSelectTab('atendimento')}
              >
                <ClipboardList size={16} />
                Atendimento ({todayCount})
              </button>
              <button
                type="button"
                className={`nav-tab ${activeTab === 'financeiro' ? 'active' : ''}`}
                onClick={() => onSelectTab('financeiro')}
              >
                <DollarSign size={16} />
                Financeiro
              </button>
            </>
          )}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onOpenAccess}
            title="Trocar entre acesso de Cliente e Profissional"
          >
            <UserCircle2 size={16} color="var(--gold)" />
            <span className="access-pill-text">{accessLabel}</span>
          </button>

          <button type="button" className="btn-primary" onClick={onOpenNewBooking}>
            <Plus size={16} />
            <span className="hide-on-xs">Agendar</span>
          </button>
        </div>
      </header>

      {/* Barra inferior fixa para celular */}
      <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'horarios' ? 'active' : ''}`}
          onClick={() => onSelectTab('horarios')}
        >
          <CalendarDays size={19} />
          <span>Horários</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'tabela' ? 'active' : ''}`}
          onClick={() => onSelectTab('tabela')}
        >
          <Scissors size={19} />
          <span>Cortes</span>
        </button>

        {session.role === 'client' ? (
          <button
            type="button"
            className={`mobile-nav-item ${activeTab === 'meus-agendamentos' ? 'active' : ''}`}
            onClick={() => onSelectTab('meus-agendamentos')}
          >
            <CalendarCheck size={19} />
            <span>Meus</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`mobile-nav-item ${activeTab === 'atendimento' ? 'active' : ''}`}
              onClick={() => onSelectTab('atendimento')}
            >
              <ClipboardList size={19} />
              <span>Agenda ({todayCount})</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-item ${activeTab === 'financeiro' ? 'active' : ''}`}
              onClick={() => onSelectTab('financeiro')}
            >
              <DollarSign size={19} />
              <span>Caixa</span>
            </button>
          </>
        )}

        <button type="button" className="mobile-nav-item" onClick={onOpenAccess}>
          <UserCircle2 size={19} />
          <span>Acesso</span>
        </button>
      </nav>
    </>
  );
}
