import { Camera, RotateCcw, Save, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Barber } from '../types';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  shopLogoUrl: string;
  barbers: Barber[];
  onSave: (data: {
    shopName: string;
    shopLogoUrl: string;
    barberUpdates: Array<{ id: string; name: string; role: string; specialty: string }>;
  }) => void;
  onResetDefaults: () => void;
}

export function ShopSettingsModal({
  isOpen,
  onClose,
  shopName,
  shopLogoUrl,
  barbers,
  onSave,
  onResetDefaults,
}: ShopSettingsModalProps) {
  const [draftShopName, setDraftShopName] = useState(shopName);
  const [draftLogo, setDraftLogo] = useState(shopLogoUrl);
  const [draftBarbers, setDraftBarbers] = useState(
    barbers.map((b) => ({
      id: b.id,
      name: b.name,
      role: b.role,
      specialty: b.specialty,
    }))
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraftShopName(shopName);
    setDraftLogo(shopLogoUrl);
    setDraftBarbers(
      barbers.map((b) => ({
        id: b.id,
        name: b.name,
        role: b.role,
        specialty: b.specialty,
      }))
    );
  }, [isOpen, shopName, shopLogoUrl, barbers]);

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
    field: 'name' | 'role' | 'specialty',
    value: string
  ) => {
    setDraftBarbers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      shopName: draftShopName.trim() || 'BARBEARIA CLÁSSICA',
      shopLogoUrl: draftLogo,
      barberUpdates: draftBarbers.map((b) => ({
        ...b,
        name: b.name.trim() || 'Profissional',
        role: b.role.trim() || 'Barbeiro',
        specialty: b.specialty.trim(),
      })),
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
              Edite o nome da barbearia, a logo e os nomes dos profissionais
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
            <span className="form-label">Logo da Barbearia</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="brand-icon" style={{ width: 58, height: 58 }}>
                <img
                  src={draftLogo || '/logo-barbearia.svg'}
                  alt="Prévia da logo"
                  className="brand-logo-img"
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                  <Camera size={14} />
                  Trocar Logo
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
                    onClick={() => setDraftLogo('')}
                  >
                    Usar Logo Padrão
                  </button>
                )}
              </div>
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
              Nomes dos 3 Profissionais
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
