import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tableApi } from '../../api/table.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState } from '../../components/ui';
import { TABLE_STATUS_CONFIG } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function WaiterTables() {
  const qc = useQueryClient();
  const { branchId } = useBranch();

  const { data, isLoading } = useQuery({ queryKey:['tables',branchId], queryFn:()=>tableApi.getAll(branchId), enabled:!!branchId, refetchInterval:20000 });
  const tables = data?.data?.data || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => tableApi.updateStatus(id, status),
    onSuccess:  () => { qc.invalidateQueries(['tables']); toast.success('Status updated'); },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Tables</h1><p className="page-subtitle">{tables.length} tables</p></div>
        <Link to="/waiter/new-order" className="btn-primary">+ New Order</Link>
      </div>
      {tables.length === 0 ? <div className="card"><EmptyState icon="🪑" title="No tables" /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((t) => {
            const cfg = TABLE_STATUS_CONFIG[t.status] || {};
            return (
              <div key={t.id} className={`border-2 rounded-2xl p-5 text-center transition-all hover:shadow-md ${cfg.border} ${cfg.color}`}>
                <div className="text-3xl mb-2">🪑</div>
                <p className="font-bold text-xl">T{t.number}</p>
                {t.name && <p className="text-xs opacity-70 truncate">{t.name}</p>}
                <p className="text-xs opacity-70 mt-0.5">{t.capacity} seats · Floor {t.floor}</p>
                <span className={`badge mt-2 inline-flex ${t.status==='AVAILABLE'?'badge-green':t.status==='OCCUPIED'?'badge-red':t.status==='RESERVED'?'badge-yellow':'badge-gray'}`}>{cfg.label}</span>
                <div className="mt-3">
                  <select value={t.status} onChange={(e) => statusMutation.mutate({ id:t.id, status:e.target.value })}
                    className="text-xs w-full border border-current/30 rounded-lg px-2 py-1 bg-white/80">
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
