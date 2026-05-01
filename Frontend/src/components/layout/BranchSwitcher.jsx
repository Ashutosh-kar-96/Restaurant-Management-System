import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { restaurantApi } from '../../api/restaurant.api';

/**
 * BranchSwitcher
 * Shows a branch selector in the header for staff assigned to "All branches"
 * (branchId = null in RestaurantStaff). Persists selected branch in localStorage.
 */
export default function BranchSwitcher() {
  const { user } = useSelector((s) => s.auth);

  // Only show for branch-level roles
  const branchRoles = ['WAITER', 'CHEF', 'CASHIER', 'MANAGER'];
  if (!user || !branchRoles.includes(user.role)) return null;

  // If staff has a fixed branch assigned, no switcher needed
  const staffRecord    = user.restaurantStaff?.[0];
  const fixedBranchId  = staffRecord?.branch?.id || null;
  if (fixedBranchId) return null;  // they have a fixed branch, header shows nothing

  const restaurantId = localStorage.getItem('restaurantId');
  if (!restaurantId) return null;

  return <BranchSelector restaurantId={restaurantId} />;
}

function BranchSelector({ restaurantId }) {
  const [selected, setSelected] = useState(localStorage.getItem('branchId') || '');
  const [open, setOpen]         = useState(false);

  const { data } = useQuery({
    queryKey: ['branches', restaurantId],
    queryFn:  () => restaurantApi.getBranches(restaurantId),
    enabled:  !!restaurantId,
  });

  const branches = data?.data?.data || [];

  // Auto-select first branch if none chosen yet
  useEffect(() => {
    if (!selected && branches.length > 0) {
      const first = branches[0].id;
      setSelected(first);
      localStorage.setItem('branchId', first);
      window.dispatchEvent(new Event('branchChanged'));
    }
  }, [branches, selected]);

  const selectedBranch = branches.find((b) => b.id === selected);

  const handleSelect = (branchId) => {
    setSelected(branchId);
    localStorage.setItem('branchId', branchId);
    setOpen(false);
    // Trigger a page reload so all queries refresh with the new branchId
    window.location.reload();
  };

  if (branches.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="text-base">🏪</span>
        <span className="hidden sm:block max-w-[140px] truncate">
          {selectedBranch?.name || 'Select Branch'}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-56 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden animate-slide-down">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Switch Branch</p>
            </div>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelect(b.id)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors flex items-center justify-between ${
                  selected === b.id ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                }`}
              >
                <span>{b.name}</span>
                {selected === b.id && <span className="text-primary-500 text-xs">✓ Active</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
