// components/ui/index.js — re-exports all UI primitives

// Spinner
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return <div className={`${s} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />;
}

// Empty State
export function EmptyState({ icon = '📭', title = 'No data', subtitle = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400 mb-4">{subtitle}</p>}
      {action}
    </div>
  );
}

// Confirm Dialog
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', danger = false }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="btn-ghost btn-icon text-gray-400">✕</button>
        </div>
        <div className="modal-body">
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} className="btn-outline">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

// Page Loader
export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🍽️</div>
        <Spinner size="lg" className="text-primary-500 mx-auto" />
        <p className="text-gray-500 text-sm mt-3">Loading...</p>
      </div>
    </div>
  );
}

// Stat Card
export function StatCard({ icon, label, value, sub, color = 'bg-primary-50 text-primary-500', trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// Search Input
export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-4"
      />
    </div>
  );
}

// Select
export function Select({ value, onChange, options = [], placeholder = 'Select...', className = '' }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`input ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Toggle Switch
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

// Tabs
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-gray-200 gap-1">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${active === t.value ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          {t.label} {t.count !== undefined && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${active === t.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Pagination
export function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="btn btn-outline btn-sm">← Prev</button>
      <span className="text-sm text-gray-600">{page} / {pages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= pages} className="btn btn-outline btn-sm">Next →</button>
    </div>
  );
}
