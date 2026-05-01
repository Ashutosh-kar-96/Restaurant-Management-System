import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header  from './Header';
import Footer  from './Footer';
import { useSocket } from '../../hooks/useSocket';
import { useSelector } from 'react-redux';

export default function CashierLayout() {
  useSocket();
  const { sidebarOpen } = useSelector((s) => s.ui);
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <div className={`fixed lg:static inset-y-0 left-0 z-30 lg:z-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Cashier Station" />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}
