import { Banknote, CreditCard, DollarSign, QrCode, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Appointment, Barber, PaymentMethod, ServiceItem, UserSession } from '../types';
import { formatBRL, formatDateYYYYMMDD } from '../data/barbershopData';

interface FinanceViewProps {
  appointments: Appointment[];
  barbers: Barber[];
  services: ServiceItem[];
  session: UserSession;
}

type PeriodFilter = 'today' | '7d' | 'month' | 'all';

export function FinanceView({
  appointments,
  barbers,
  services,
  session,
}: FinanceViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const activeProBarberId =
    session.role === 'pro' && session.barberId !== 'all' ? session.barberId : null;

  const todayStr = formatDateYYYYMMDD(new Date());
  const monthPrefix = todayStr.slice(0, 7);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysStr = formatDateYYYYMMDD(sevenDaysAgo);

  const completed = useMemo(() => {
    return appointments.filter((a) => {
      if (a.status !== 'Concluído') return false;
      if (activeProBarberId && a.barberId !== activeProBarberId) return false;
      if (period === 'today') return a.date === todayStr;
      if (period === '7d') return a.date >= sevenDaysStr && a.date <= todayStr;
      if (period === 'month') return a.date.startsWith(monthPrefix);
      return true;
    });
  }, [appointments, activeProBarberId, period, todayStr, sevenDaysStr, monthPrefix]);

  const getPrice = (apt: Appointment) => {
    if (typeof apt.finalPrice === 'number') return apt.finalPrice;
    return serviceMap.get(apt.serviceId)?.price ?? 0;
  };

  const totalRevenue = useMemo(
    () => completed.reduce((sum, a) => sum + getPrice(a), 0),
    [completed, serviceMap]
  );

  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

  const byPayment = useMemo(() => {
    const totals: Record<PaymentMethod | 'Não informado', number> = {
      Pix: 0,
      Dinheiro: 0,
      Cartão: 0,
      'Não informado': 0,
    };
    completed.forEach((a) => {
      const pm = a.paymentMethod || 'Não informado';
      totals[pm] += getPrice(a);
    });
    return totals;
  }, [completed, serviceMap]);

  const visibleBarbers = activeProBarberId
    ? barbers.filter((b) => b.id === activeProBarberId)
    : barbers;

  const barberStats = useMemo(() => {
    return visibleBarbers.map((barber) => {
      const list = completed.filter((a) => a.barberId === barber.id);
      const gross = list.reduce((sum, a) => sum + getPrice(a), 0);
      const commPct = barber.commissionPercent ?? 50;
      const commissionValue = (gross * commPct) / 100;
      const shopProfit = gross - commissionValue;
      return {
        barber,
        count: list.length,
        gross,
        commPct,
        commissionValue,
        shopProfit,
      };
    });
  }, [visibleBarbers, completed, serviceMap]);

  const totalCommissions = barberStats.reduce((s, x) => s + x.commissionValue, 0);
  const totalShopNet = totalRevenue - totalCommissions;

  return (
    <section>
      <div className="controls-bar">
        <div className="day-pills" role="tablist" aria-label="Período financeiro">
          <button
            type="button"
            className={`day-pill ${period === 'today' ? 'active' : ''}`}
            onClick={() => setPeriod('today')}
          >
            Hoje
          </button>
          <button
            type="button"
            className={`day-pill ${period === '7d' ? 'active' : ''}`}
            onClick={() => setPeriod('7d')}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            className={`day-pill ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            Mês atual
          </button>
          <button
            type="button"
            className={`day-pill ${period === 'all' ? 'active' : ''}`}
            onClick={() => setPeriod('all')}
          >
            Todo o período
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={14} color="var(--gold)" /> Faturamento Bruto
          </div>
          <div className="stat-value" style={{ color: 'var(--gold)' }}>
            {formatBRL(totalRevenue)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="var(--blue)" /> Cortes Concluídos
          </div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>
            {completed.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} color="var(--emerald)" /> Ticket Médio
          </div>
          <div className="stat-value" style={{ color: 'var(--emerald)' }}>
            {formatBRL(avgTicket)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Líquido Barbearia (após comissão)</div>
          <div className="stat-value">{formatBRL(totalShopNet)}</div>
        </div>
      </div>

      <div className="finance-grid">
        <div className="section-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
            Formas de Pagamento
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="finance-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={16} color="var(--emerald)" /> Pix
              </span>
              <strong>{formatBRL(byPayment.Pix)}</strong>
            </div>
            <div className="finance-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Banknote size={16} color="var(--gold)" /> Dinheiro
              </span>
              <strong>{formatBRL(byPayment.Dinheiro)}</strong>
            </div>
            <div className="finance-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={16} color="var(--blue)" /> Cartão
              </span>
              <strong>{formatBRL(byPayment['Cartão'])}</strong>
            </div>
            {byPayment['Não informado'] > 0 && (
              <div className="finance-row">
                <span style={{ color: 'var(--text-secondary)' }}>Sem forma informada</span>
                <strong>{formatBRL(byPayment['Não informado'])}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="section-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
            Repasse &amp; Comissões por Profissional
          </h3>
          <div className="service-table-wrap">
            <table className="service-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Cortes</th>
                  <th>Bruto</th>
                  <th>Comissão</th>
                  <th>A Receber</th>
                </tr>
              </thead>
              <tbody>
                {barberStats.map((st) => (
                  <tr key={st.barber.id}>
                    <td>
                      <strong>{st.barber.name}</strong>
                    </td>
                    <td>{st.count}</td>
                    <td>{formatBRL(st.gross)}</td>
                    <td>{st.commPct}%</td>
                    <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>
                      {formatBRL(st.commissionValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
