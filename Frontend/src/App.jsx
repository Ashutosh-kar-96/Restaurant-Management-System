// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { useSelector } from "react-redux";
// import { useEffect } from "react";

// import LoginPage from "./pages/auth/LoginPage";
// import SuperAdminLayout from "./components/layout/SuperAdminLayout";
// import AdminLayout from "./components/layout/AdminLayout";
// import ManagerLayout from "./components/layout/ManagerLayout";
// import WaiterLayout from "./components/layout/WaiterLayout";
// import ChefLayout from "./components/layout/ChefLayout";
// import CashierLayout from "./components/layout/CashierLayout";

// // Super Admin Pages
// import SADashboard from "./pages/superadmin/Dashboard";
// import SARestaurants from "./pages/superadmin/Restaurants";
// import SAUsers from "./pages/superadmin/Users";
// import SARevenue from "./pages/superadmin/Revenue";
// import SAChat from "./pages/superadmin/Chat";

// // Admin Pages
// import AdminDashboard from "./pages/admin/Dashboard";
// import AdminBranches from "./pages/admin/Branches";
// import AdminStaff from "./pages/admin/Staff";
// import AdminMenu from "./pages/admin/Menu";
// import AdminChat from "./pages/admin/Chat";

// // Manager Pages
// import ManagerDashboard from "./pages/manager/Dashboard";
// import ManagerOrders from "./pages/manager/Orders";
// import ManagerTables from "./pages/manager/Tables";
// import ManagerInventory from "./pages/manager/Inventory";
// import ManagerAnalytics from "./pages/manager/Analytics";
// import ManagerMenu from "./pages/manager/Menu";
// import ManagerBilling from "./pages/manager/Billing";
// import ManagerChat from "./pages/manager/Chat";

// // Waiter Pages
// import WaiterDashboard from "./pages/waiter/Dashboard";
// import WaiterOrders from "./pages/waiter/Orders";
// import WaiterTables from "./pages/waiter/Tables";
// import WaiterNewOrder from "./pages/waiter/NewOrder";

// // Chef Pages
// import ChefDashboard from "./pages/chef/Dashboard";

// // Cashier Pages
// import CashierDashboard from "./pages/cashier/Dashboard";
// import CashierBilling from "./pages/cashier/Billing";

// import { setPinnedMessages } from "./store/slices/notificationSlice";

// import { fetchProfile } from "./store/slices/authSlice";
// import { useDispatch } from "react-redux";

// const ProtectedRoute = ({ children, allowedRoles }) => {
//   const { user, accessToken } = useSelector((s) => s.auth);
//   if (!accessToken) return <Navigate to="/login" replace />;
//   if (user && allowedRoles && !allowedRoles.includes(user.role)) {
//     return <Navigate to={getHomeByRole(user.role)} replace />;
//   }
//   return children;
// };

// const getHomeByRole = (role) => {
//   const map = {
//     SUPER_ADMIN: "/superadmin",
//     RESTAURANT_ADMIN: "/admin",
//     MANAGER: "/manager",
//     WAITER: "/waiter",
//     CHEF: "/chef",
//     CASHIER: "/cashier",
//   };
//   return map[role] || "/login";
// };

// const RoleRedirect = () => {
//   const { user } = useSelector((s) => s.auth);
//   if (!user) return <Navigate to="/login" replace />;
//   return <Navigate to={getHomeByRole(user.role)} replace />;
// };

// export default function App() {
//   const dispatch = useDispatch();
//   const { accessToken, user } = useSelector((s) => s.auth);

//   useEffect(() => {
//     if (accessToken) {
//       dispatch(fetchProfile());
//     }
//   }, [accessToken, dispatch]);

//   useEffect(() => {
//     if (
//       accessToken &&
//       user?.role &&
//       ["MANAGER", "RESTAURANT_ADMIN", "SUPER_ADMIN"].includes(user.role)
//     ) {
//       import("./api/axios").then(({ default: axios }) => {
//         axios
//           .get("/notifications/inbox")
//           .then((r) => dispatch(setPinnedMessages(r.data.messages || [])))
//           .catch(() => {});
//       });
//     }
//   }, [user?.role]); // fires when user loads, not when accessToken loads

//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/login" element={<LoginPage />} />
//         <Route path="/" element={<RoleRedirect />} />

//         {/* Super Admin */}
//         <Route
//           path="/superadmin"
//           element={
//             <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
//               <SuperAdminLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<SADashboard />} />
//           <Route path="revenue" element={<SARevenue />} />
//           <Route path="restaurants" element={<SARestaurants />} />
//           <Route path="users" element={<SAUsers />} />
//           <Route path="chat" element={<SAChat />} />
//         </Route>

//         {/* Restaurant Admin */}
//         <Route
//           path="/admin"
//           element={
//             <ProtectedRoute allowedRoles={["RESTAURANT_ADMIN"]}>
//               <AdminLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<AdminDashboard />} />
//           <Route path="branches" element={<AdminBranches />} />
//           <Route path="staff" element={<AdminStaff />} />
//           <Route path="menu" element={<AdminMenu />} />
//           <Route path="chat" element={<AdminChat />} />
//         </Route>

//         {/* Manager */}
//         <Route
//           path="/manager"
//           element={
//             <ProtectedRoute
//               allowedRoles={["MANAGER", "RESTAURANT_ADMIN", "SUPER_ADMIN"]}
//             >
//               <ManagerLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<ManagerDashboard />} />
//           <Route path="orders" element={<ManagerOrders />} />
//           <Route path="tables" element={<ManagerTables />} />
//           <Route path="menu" element={<ManagerMenu />} />
//           <Route path="inventory" element={<ManagerInventory />} />
//           <Route path="analytics" element={<ManagerAnalytics />} />
//           <Route path="billing" element={<ManagerBilling />} />
//           <Route path="chat" element={<ManagerChat />} />
//         </Route>

//         {/* Waiter */}
//         <Route
//           path="/waiter"
//           element={
//             <ProtectedRoute allowedRoles={["WAITER"]}>
//               <WaiterLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<WaiterDashboard />} />
//           <Route path="orders" element={<WaiterOrders />} />
//           <Route path="tables" element={<WaiterTables />} />
//           <Route path="new-order" element={<WaiterNewOrder />} />
//         </Route>

//         {/* Chef */}
//         <Route
//           path="/chef"
//           element={
//             <ProtectedRoute allowedRoles={["CHEF"]}>
//               <ChefLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<ChefDashboard />} />
//         </Route>

//         {/* Cashier */}
//         <Route
//           path="/cashier"
//           element={
//             <ProtectedRoute allowedRoles={["CASHIER"]}>
//               <CashierLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<CashierDashboard />} />
//           <Route path="billing" element={<CashierBilling />} />
//         </Route>

//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }




import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect } from "react";

import LoginPage from "./pages/auth/LoginPage";
import CustomerOrder from "./pages/public/CustomerOrder";
import SuperAdminLayout from "./components/layout/SuperAdminLayout";
import AdminLayout from "./components/layout/AdminLayout";
import ManagerLayout from "./components/layout/ManagerLayout";
import WaiterLayout from "./components/layout/WaiterLayout";
import ChefLayout from "./components/layout/ChefLayout";
import CashierLayout from "./components/layout/CashierLayout";

// Super Admin Pages
import SADashboard from "./pages/superadmin/Dashboard";
import SARestaurants from "./pages/superadmin/Restaurants";
import SAUsers from "./pages/superadmin/Users";
import SARevenue from "./pages/superadmin/Revenue";
import SAChat from "./pages/superadmin/Chat";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBranches from "./pages/admin/Branches";
import AdminStaff from "./pages/admin/Staff";
import AdminMenu from "./pages/admin/Menu";
import AdminChat from "./pages/admin/Chat";

// Manager Pages
import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerOrders from "./pages/manager/Orders";
import ManagerTables from "./pages/manager/Tables";
import ManagerInventory from "./pages/manager/Inventory";
import ManagerAnalytics from "./pages/manager/Analytics";
import ManagerMenu from "./pages/manager/Menu";
import ManagerBilling from "./pages/manager/Billing";
import ManagerChat from "./pages/manager/Chat";

// Waiter Pages
import WaiterDashboard from "./pages/waiter/Dashboard";
import WaiterOrders from "./pages/waiter/Orders";
import WaiterTables from "./pages/waiter/Tables";
import WaiterNewOrder from "./pages/waiter/NewOrder";

// Chef Pages
import ChefDashboard from "./pages/chef/Dashboard";

// Cashier Pages
import CashierDashboard from "./pages/cashier/Dashboard";
import CashierBilling from "./pages/cashier/Billing";

import { setPinnedMessages } from "./store/slices/notificationSlice";

import { fetchProfile } from "./store/slices/authSlice";
import { useDispatch } from "react-redux";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, accessToken } = useSelector((s) => s.auth);
  if (!accessToken) return <Navigate to="/login" replace />;
  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeByRole(user.role)} replace />;
  }
  return children;
};

const getHomeByRole = (role) => {
  const map = {
    SUPER_ADMIN: "/superadmin",
    RESTAURANT_ADMIN: "/admin",
    MANAGER: "/manager",
    WAITER: "/waiter",
    CHEF: "/chef",
    CASHIER: "/cashier",
  };
  return map[role] || "/login";
};

const RoleRedirect = () => {
  const { user } = useSelector((s) => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeByRole(user.role)} replace />;
};

export default function App() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchProfile());
    }
  }, [accessToken, dispatch]);

  useEffect(() => {
    if (
      accessToken &&
      user?.role &&
      ["MANAGER", "RESTAURANT_ADMIN", "SUPER_ADMIN"].includes(user.role)
    ) {
      import("./api/axios").then(({ default: axios }) => {
        axios
          .get("/notifications/inbox")
          .then((r) => dispatch(setPinnedMessages(r.data.messages || [])))
          .catch(() => {});
      });
    }
  }, [user?.role]); // fires when user loads, not when accessToken loads

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* Super Admin */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SADashboard />} />
          <Route path="revenue" element={<SARevenue />} />
          <Route path="restaurants" element={<SARestaurants />} />
          <Route path="users" element={<SAUsers />} />
          <Route path="chat" element={<SAChat />} />
        </Route>

        {/* Restaurant Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["RESTAURANT_ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="branches" element={<AdminBranches />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="chat" element={<AdminChat />} />
        </Route>

        {/* Manager */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute
              allowedRoles={["MANAGER", "RESTAURANT_ADMIN", "SUPER_ADMIN"]}
            >
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ManagerDashboard />} />
          <Route path="orders" element={<ManagerOrders />} />
          <Route path="tables" element={<ManagerTables />} />
          <Route path="menu" element={<ManagerMenu />} />
          <Route path="inventory" element={<ManagerInventory />} />
          <Route path="analytics" element={<ManagerAnalytics />} />
          <Route path="billing" element={<ManagerBilling />} />
          <Route path="chat" element={<ManagerChat />} />
        </Route>

        {/* Waiter */}
        <Route
          path="/waiter"
          element={
            <ProtectedRoute allowedRoles={["WAITER"]}>
              <WaiterLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<WaiterDashboard />} />
          <Route path="orders" element={<WaiterOrders />} />
          <Route path="tables" element={<WaiterTables />} />
          <Route path="new-order" element={<WaiterNewOrder />} />
        </Route>

        {/* Chef */}
        <Route
          path="/chef"
          element={
            <ProtectedRoute allowedRoles={["CHEF"]}>
              <ChefLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ChefDashboard />} />
        </Route>

        {/* Cashier */}
        <Route
          path="/cashier"
          element={
            <ProtectedRoute allowedRoles={["CASHIER"]}>
              <CashierLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CashierDashboard />} />
          <Route path="billing" element={<CashierBilling />} />
        </Route>

        {/* Public: Customer self-ordering via QR scan — no auth required */}
        <Route path="/order/:tableId" element={<CustomerOrder />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}