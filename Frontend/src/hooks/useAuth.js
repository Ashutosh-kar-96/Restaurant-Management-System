import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user, accessToken, isLoading, error } = useSelector((s) => s.auth);

  const logout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const hasRole = (...roles) => roles.includes(user?.role);
  const isAdmin = () => ['SUPER_ADMIN','RESTAURANT_ADMIN'].includes(user?.role);

  return { user, accessToken, isLoading, error, logout, hasRole, isAdmin, isAuthenticated: !!accessToken };
};

/**
 * useBranch — returns branchId and restaurantId.
 * Priority:
 *   1. localStorage (set at login or branch switch)
 *   2. Redux user.restaurantStaff[0] as fallback (self-heals if localStorage was cleared)
 */
export const useBranch = () => {
  const { user } = useSelector((s) => s.auth);

  let branchId     = localStorage.getItem('branchId')     || null;
  let restaurantId = localStorage.getItem('restaurantId') || null;

  // Self-heal from Redux user profile if localStorage is empty
  if (!restaurantId) {
    const rId = user?.restaurantStaff?.[0]?.restaurant?.id
             || user?.restaurantStaff?.[0]?.restaurantId
             || null;
    if (rId) {
      restaurantId = rId;
      localStorage.setItem('restaurantId', rId);
    }
  }
  if (!branchId) {
    const bId = user?.restaurantStaff?.[0]?.branch?.id
             || user?.restaurantStaff?.[0]?.branchId
             || null;
    if (bId) {
      branchId = bId;
      localStorage.setItem('branchId', bId);
    }
  }

  return { branchId, restaurantId };
};

export const useDebounce = (value, delay = 500) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};
