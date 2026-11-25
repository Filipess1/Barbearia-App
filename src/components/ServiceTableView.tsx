import { Clock, Scissors } from 'lucide-react';
import { useState } from 'react';
import { Barber, ServiceCategory, ServiceItem } from '../types';
import { formatBRL } from '../data/barbershopData';

interface ServiceTableViewProps {
  services: ServiceItem[];
  barbers: Barber[];
  onBookService: (serviceId: string, barberId?: string) => void;
}

const CATEGORIES: Array<'Todos' | ServiceCategory> = [
  'Todos',
  'Cortes',
  'Barba & Acabamento',
  'Combos & Especiais',
];

export function ServiceTableView({
  services,
  barbers,
  onBookService,
}: ServiceTableViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | ServiceCategory>('Todos');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');

  const barberMap = new Map(barbers.map((b) => [b.id, b]));

  const filteredServices = services.filter((srv) => {
    const matchCategory =
      selectedCategory === 'Todos' || srv.category === selectedCategory;
    const matchBarber =
      selectedBarberId === 'all' || srv.barberIds.includes(selectedBarberId);
    return matchCategory && matchBarber;
  });

  return (
    <section className="section-card">
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
          Tabela de Cortes &amp; Serviços
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Valores atualizados, duração estimada e profissionais habilitados para cada serviço.
        </p>
      </div>

      <div className="filter-toolbar">
        <div className="filter-group" role="tablist" aria-label="Filtrar por categoria">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label
            htmlFor="barber-filter"
            style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}
          >
            Profissional:
          </label>
          <select
            id="barber-filter"
            className="select-input"
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
          >
            <option value="all">Todos os 3 barbeiros</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="service-table-wrap">
        <table className="service-table">
          <thead>
            <tr>
              <th>Corte / Serviço</th>
              <th>Categoria</th>
              <th>Duração</th>
              <th>Profissionais</th>
              <th>Valor</th>
              <th style={{ textAlign: 'right' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((srv) => (
              <tr key={srv.id}>
                <td>
                  <div className="service-name-cell">
                    <div className="service-title-row">
                      <span>{srv.name}</span>
                      {srv.popular && <span className="popular-tag">Mais pedido</span>}
                    </div>
                    <span className="service-desc">{srv.description}</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {srv.category}
                  </span>
                </td>
                <td>
                  <span className="duration-badge">
                    <Clock size={14} />
                    {srv.durationMinutes} min
                  </span>
                </td>
                <td>
                  <div className="barber-tag-list">
                    {srv.barberIds.map((bId) => {
                      const b = barberMap.get(bId);
                      if (!b) return null;
                      return (
                        <span
                          key={bId}
                          className="barber-tag"
                          style={{ borderColor: `${b.accentColor}44` }}
                        >
                          {b.nickname}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <span className="price-text">{formatBRL(srv.price)}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      onBookService(
                        srv.id,
                        selectedBarberId !== 'all' ? selectedBarberId : undefined
                      )
                    }
                  >
                    <Scissors size={14} />
                    Agendar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
