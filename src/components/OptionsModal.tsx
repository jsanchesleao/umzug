import Modal from "./Modal";
import { useSettings } from "../settings/useSettings";
import {
  CURRENCY_CODES,
  CURRENCY_LABELS,
  DATE_FORMAT_LABELS,
  DATE_FORMAT_OPTIONS,
  THEME_MODES,
  THEME_MODE_LABELS,
} from "../types";
import type { CurrencyCode, DateFormatOption, ThemeMode } from "../types";

interface OptionsModalProps {
  onClose: () => void;
}

function OptionsModal({ onClose }: OptionsModalProps) {
  const { settings, updateSettings } = useSettings();

  return (
    <Modal title="Options" onClose={onClose}>
      <div className="form-field">
        <label htmlFor="option-theme">Theme</label>
        <select
          id="option-theme"
          value={settings.theme}
          onChange={(e) => updateSettings({ theme: e.target.value as ThemeMode })}
        >
          {THEME_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {THEME_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="option-currency">Currency</label>
        <select
          id="option-currency"
          value={settings.currency}
          onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="option-date-format">Date format</label>
        <select
          id="option-date-format"
          value={settings.dateFormat}
          onChange={(e) => updateSettings({ dateFormat: e.target.value as DateFormatOption })}
        >
          {DATE_FORMAT_OPTIONS.map((format) => (
            <option key={format} value={format}>
              {DATE_FORMAT_LABELS[format]}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}

export default OptionsModal;
