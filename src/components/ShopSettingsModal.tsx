import { Camera, RotateCcw, Save, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Barber } from '../types';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  shopLogoUrl: string;
  loyaltyGoal: number;
  barbers: Barber[];
  onSave: (data: {
    shopName: string;
    shopLogoUrl: string;
    loyaltyGoal: number;
    barberUpdates: Array<{
      id: string;
      name: string;
      role: string;
      specialty: string;
      commissionPercent: number;
    }>;
    pinUpdates: Record<string, string>;
  }) => void;
  onResetDefaults: () => void;
}

export function ShopSettingsModal({
  isOpen,
  onClose,
  shopName,
  shopLogoUrl,
  loyaltyGoal,
  barbers,
  onSave,
  onResetDefaults,
}: ShopSettingsModalProps) {
  const [draftShopName, setDraftShopName] = useState(shopName);
  const [draftLogo, setDraftLogo] = useState(shopLogoUrl);
  const [draftLoyaltyGoal, setDraftLoyaltyGoal] = useState(loyaltyGoal);
  const [draftReceptionPin, setDraftReceptionPin] = useState('');
  const [draftBarbers, setDraftBarbers] = useState(
    barbers.map((b) => ({
      id: b.id,
      name: b.name,
      role: b.role,
      specialty: b.specialty,
      commissionPercent: b.commissionPercent ?? 50,
      newPin: '',
    }))
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraftShopName(shopName);
    setDraftLogo(shopLogoUrl);
    setDraftLoyaltyGoal(loyaltyGoal);
    setDraftReceptionPin('');
    setDraftBarbers(
      barbers.map((b) => ({
        id: b.id,
        name: b.name,
        role: b.role,
        specialty: b.specialty,
        commissionPercent: b.commissionPercent ?? 50,
        newPin: '',
      }))
    );
  }, [isOpen, shopName, shopLogoUrl, loyaltyGoal, barbers]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 256;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setDraftLogo(canvas.toDataURL('image/png'));
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBarberChange = (
    id: string,
    field: 'name' | 'role' | 'specialty' | 'commissionPercent' | 'newPin',
    value: string | number
  ) => {
    setDraftBarbers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const pinUpdates: Record<string, string> = {};
    if (draftReceptionPin.trim()) pinUpdates.all = draftReceptionPin.trim();
    draftBarbers.forEach((b) => {
      if (b.newPin.trim()) pinUpdates[b.id] = b.newPin.trim();
    });

    onSave({
      shopName: draftShopName.trim() || 'BARBEARIA CLÁSSICA',
      shopLogoUrl: draftLogo,
      loyaltyGoal: Math.max(3, Math.min(30, Number(draftLoyaltyGoal) || 10)),
      barberUpdates: draftBarbers.map((b) => ({
        id: b.id,
        name: b.name.trim() || 'Profissional',
        role: b.role.trim() || 'Barbeiro',
        specialty: b.specialty.trim(),
        commissionPercent: Math.max(0, Math.min(100, Number(b.commissionPercent) || 50)),
      })),
      pinUpdates,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <form className="modal-panel" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h3 id="settings-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Personalizar Barbearia
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Nome, logo, profissionais, comissões, fidelidade e PINs
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
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label" htmlFor="shop-name-input">
                Nome da Barbearia
              </label>
              <input
                id="shop-name-input"
                type="text"
                className="form-input"
                value={draftShopName}
                onChange={(e) => setDraftShopName(e.target.value)}
                placeholder="Ex: Barbearia Clássica"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="loyalty-goal-input">
                Meta Cartão Fidelidade (cortes)
              </label>
              <input
                id="loyalty-goal-input"
                type="number"
                min={3}
                max={30}
                className="form-input"
                value={draftLoyaltyGoal}
                onChange={(e) => setDraftLoyaltyGoal(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <span className="form-label">Logo da Barbearia</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="brand-icon" style={{ width: 48, height: 48 }}>
                  <img
                    src={draftLogo || '/logo-barbearia.svg'}
                    alt="Prévia da logo"
                    className="brand-logo-img"
                  />
                </div>
                <label className="btn-secondary" style={{ cursor: 'pointer', padding: '7px 11px' }}>
                  <Camera size={14} />
                  Trocar
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                </label>
                {draftLogo && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '7px 10px' }}
                    onClick={() => setDraftLogo('')}
                  >
                    Padrão
                  </button>
                )}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pin-all-input">
                Novo PIN Recepção (opcional)
              </label>
              <input
                id="pin-all-input"
                type="password"
                inputMode="numeric"
                className="form-input"
                placeholder="Manter atual (padrão 1234)"
                value={draftReceptionPin}
                onChange={(e) => setDraftReceptionPin(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <span className="form-label" style={{ color: 'var(--gold)' }}>
              Profissionais, Comissões e PIN Individual
            </span>

            {draftBarbers.map((barber, idx) => (
              <div key={barber.id} className="apt-detail-card" style={{ padding: 12 }}>
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="form-label" htmlFor={`barber-name-${barber.id}`}>
                      Profissional {idx + 1}
                    </label>
                    <input
                      id={`barber-name-${barber.id}`}
                      type="text"
                      className="form-input"
                      value={barber.name}
                      onChange={(e) =>
                        handleBarberChange(barber.id, 'name', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor={`barber-role-${barber.id}`}>
                      Cargo / Título
                    </label>
                    <input
                      id={`barber-role-${barber.id}`}
                      type="text"
                      className="form-input"
                      value={barber.role}
                      onChange={(e) =>
                        handleBarberChange(barber.id, 'role', e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label className="form-label" htmlFor={`barber-comm-${barber.id}`}>
                      Comissão (%)
                    </label>
                    <input
                      id={`barber-comm-${barber.id}`}
                      type="number"
                      min={0}
                      max={100}
                      className="form-input"
                      value={barber.commissionPercent}
                      onChange={(e) =>
                        handleBarberChange(
                          barber.id,
                          'commissionPercent',
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor={`barber-pin-${barber.id}`}>
                      Novo PIN (opcional)
                    </label>
                    <input
                      id={`barber-pin-${barber.id}`}
                      type="password"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="Manter atual"
                      value={barber.newPin}
                      onChange={(e) =>
                        handleBarberChange(barber.id, 'newPin', e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onResetDefaults();
              onClose();
            }}
          >
            <RotateCcw size={14} />
            Restaurar Padrão
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <Save size={15} />
              Salvar Alterações
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
