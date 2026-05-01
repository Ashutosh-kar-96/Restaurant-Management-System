import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../store/slices/authSlice';
import { restaurantApi } from '../../api/restaurant.api';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../../components/ui';

const ROLE_HOME = {
  SUPER_ADMIN:      '/superadmin',
  RESTAURANT_ADMIN: '/admin',
  MANAGER:          '/manager',
  WAITER:           '/waiter',
  CHEF:             '/chef',
  CASHIER:          '/cashier',
};

// Roles that need a branch selected to function
const BRANCH_ROLES = ['WAITER', 'CHEF', 'CASHIER', 'MANAGER'];

export default function LoginPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { isLoading, error } = useSelector((s) => s.auth);

  const [form,            setForm]            = useState({ email: '', password: '' });
  // After login: if multi-branch, show picker
  const [branchStep,      setBranchStep]      = useState(false);
  const [loggedInUser,    setLoggedInUser]     = useState(null);
  const [restaurantId,    setRestaurantId]     = useState(null);
  const [selectedBranch,  setSelectedBranch]   = useState('');

  const { data: branchData, isLoading: branchLoading } = useQuery({
    queryKey: ['login-branches', restaurantId],
    queryFn:  () => restaurantApi.getBranches(restaurantId),
    enabled:  !!restaurantId && branchStep,
  });
  const branches = branchData?.data?.data || [];

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (!loginUser.fulfilled.match(result)) return;

    const { user } = result.payload;
    const staffRecord = user.restaurantStaff?.[0];
    const role        = user.role;

    // Super Admin & Restaurant Admin: go straight to their home
    if (!BRANCH_ROLES.includes(role)) {
      navigate(ROLE_HOME[role] || '/');
      return;
    }

    // If staff has a fixed branch already assigned — go straight in
    if (staffRecord?.branch?.id) {
      navigate(ROLE_HOME[role] || '/');
      return;
    }

    // Staff is assigned to "All branches" (branchId = null) — show branch picker
    if (staffRecord?.restaurantId) {
      setLoggedInUser(user);
      setRestaurantId(staffRecord.restaurantId);
      setBranchStep(true);
      return;
    }

    // Fallback — just navigate
    navigate(ROLE_HOME[role] || '/');
  };

  const handleBranchSelect = () => {
    if (!selectedBranch) return;
    localStorage.setItem('branchId', selectedBranch);
    navigate(ROLE_HOME[loggedInUser.role] || '/');
  };

  // ── Branch Picker Step ──
  if (branchStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-modal overflow-hidden">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 px-8 py-6 text-white text-center">
            <div className="text-4xl mb-2">🏪</div>
            <h2 className="text-xl font-bold">Select Your Branch</h2>
            <p className="text-white/70 text-sm mt-1">
              Welcome, {loggedInUser?.firstName}! Which branch are you working at today?
            </p>
          </div>

          <div className="p-8">
            {branchLoading ? (
              <div className="flex justify-center py-8"><Spinner className="text-primary-500" /></div>
            ) : branches.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No branches found. Contact your administrator.</p>
            ) : (
              <div className="space-y-3">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranch(b.id)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                      selectedBranch === b.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${selectedBranch === b.id ? 'text-primary-700' : 'text-gray-900'}`}>
                          {b.name}
                        </p>
                        {b.address && (
                          <p className="text-xs text-gray-400 mt-0.5">{b.address}</p>
                        )}
                      </div>
                      {selectedBranch === b.id && (
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleBranchSelect}
              disabled={!selectedBranch}
              className="btn-primary w-full mt-6 py-3 text-base"
            >
              Start My Shift →
            </button>

            <button
              onClick={() => { setBranchStep(false); setLoggedInUser(null); setRestaurantId(null); setSelectedBranch(''); }}
              className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Login Step ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-500 via-secondary-600 to-secondary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-3xl shadow-modal overflow-hidden">

        {/* Left Panel */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-8 lg:p-12 flex flex-col justify-between text-white">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🍽️</div>
              <div>
                <h1 className="text-xl font-bold">RMS</h1>
                <p className="text-white/70 text-sm">Restaurant Management</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3 leading-tight">Enterprise Restaurant<br />Management System</h2>
            <p className="text-white/80 text-sm leading-relaxed">A complete solution for managing restaurants, orders, kitchen operations, billing and analytics — all in one platform.</p>
          </div>

          <div className="space-y-3 mt-8">
            {['Real-time Order Management', 'Kitchen Display System', 'GST Billing & Invoicing', 'Inventory Tracking', 'Multi-Branch Support'].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-white/90">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</div>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="p-8 lg:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                className="input" placeholder="your@email.com" autoFocus />
            </div>

            <div>
              <label className="label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required
                className="input" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2 text-base">
              {isLoading ? <><Spinner size="sm" /> Signing in...</> : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
