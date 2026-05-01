// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { tableApi } from '../../api/table.api';
// import { useBranch } from '../../hooks/useAuth';
// import { Spinner, EmptyState, ConfirmDialog } from '../../components/ui';
// import { TABLE_STATUS_CONFIG } from '../../utils/formatters';
// import toast from 'react-hot-toast';

// export default function ManagerTables() {
//   const qc = useQueryClient();
//   const { branchId } = useBranch();
//   const [modal,  setModal]  = useState(false);
//   const [form,   setForm]   = useState({ number: '', capacity: 4, floor: 1, name: '' });
//   const [deleteId, setDeleteId] = useState(null);
//   const [qrView, setQrView]  = useState(null);

//   const { data, isLoading } = useQuery({
//     queryKey: ['tables', branchId],
//     queryFn:  () => tableApi.getAll(branchId),
//     enabled:  !!branchId,
//     refetchInterval: 20000,
//   });
//   const tables = data?.data?.data || [];

//   const createMutation = useMutation({
//     mutationFn: (d) => tableApi.create(branchId, d),
//     onSuccess:  () => { qc.invalidateQueries(['tables']); setModal(false); setForm({ number:'', capacity:4, floor:1, name:'' }); toast.success('Table created!'); },
//     onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
//   });

//   const statusMutation = useMutation({
//     mutationFn: ({ id, status }) => tableApi.updateStatus(id, status),
//     onSuccess:  () => { qc.invalidateQueries(['tables']); toast.success('Status updated'); },
//   });

//   const deleteMutation = useMutation({
//     mutationFn: (id) => tableApi.remove(id),
//     onSuccess:  () => { qc.invalidateQueries(['tables']); setDeleteId(null); toast.success('Table removed'); },
//   });

//   const qrMutation = useMutation({
//     mutationFn: (id) => tableApi.regenerateQR(id, branchId),
//     onSuccess:  (res) => { qc.invalidateQueries(['tables']); setQrView(res.data.data.qrCode); toast.success('QR regenerated'); },
//   });

//   const byFloor = tables.reduce((acc, t) => {
//     const f = t.floor || 1;
//     if (!acc[f]) acc[f] = [];
//     acc[f].push(t);
//     return acc;
//   }, {});

//   const summary = {
//     available:   tables.filter((t) => t.status === 'AVAILABLE').length,
//     occupied:    tables.filter((t) => t.status === 'OCCUPIED').length,
//     reserved:    tables.filter((t) => t.status === 'RESERVED').length,
//     maintenance: tables.filter((t) => t.status === 'MAINTENANCE').length,
//   };

//   return (
//     <div className="space-y-5 animate-fade-in">
//       <div className="page-header">
//         <div><h1 className="page-title">Tables</h1><p className="page-subtitle">{tables.length} tables total</p></div>
//         <button onClick={() => setModal(true)} className="btn-primary">+ Add Table</button>
//       </div>

//       {/* Summary Row */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//         {[
//           { label:'Available',   count: summary.available,   color:'bg-green-50 text-green-700 border-green-200'  },
//           { label:'Occupied',    count: summary.occupied,    color:'bg-red-50 text-red-700 border-red-200'        },
//           { label:'Reserved',    count: summary.reserved,    color:'bg-yellow-50 text-yellow-700 border-yellow-200'},
//           { label:'Maintenance', count: summary.maintenance, color:'bg-gray-50 text-gray-700 border-gray-200'     },
//         ].map((s) => (
//           <div key={s.label} className={`border rounded-xl p-4 text-center ${s.color}`}>
//             <p className="text-2xl font-bold">{s.count}</p>
//             <p className="text-xs font-medium mt-0.5">{s.label}</p>
//           </div>
//         ))}
//       </div>

//       {isLoading ? (
//         <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-500" /></div>
//       ) : tables.length === 0 ? (
//         <div className="card"><EmptyState icon="🪑" title="No tables" subtitle="Add tables to get started" action={<button onClick={() => setModal(true)} className="btn-primary mt-4">Add Table</button>} /></div>
//       ) : (
//         Object.entries(byFloor).map(([floor, floorTables]) => (
//           <div key={floor} className="card">
//             <div className="card-header"><h2 className="font-semibold text-gray-900">Floor {floor}</h2></div>
//             <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
//               {floorTables.map((t) => {
//                 const cfg = TABLE_STATUS_CONFIG[t.status] || {};
//                 return (
//                   <div key={t.id} className={`border-2 rounded-2xl p-4 text-center cursor-pointer transition-all hover:shadow-md group ${cfg.border} ${cfg.color}`}>
//                     <div className="text-2xl mb-1">🪑</div>
//                     <p className="font-bold text-lg">T{t.number}</p>
//                     {t.name && <p className="text-xs opacity-70 truncate">{t.name}</p>}
//                     <p className="text-xs opacity-70 mt-0.5">{t.capacity} seats</p>
//                     <span className={`badge mt-2 text-xs ${t.status === 'AVAILABLE' ? 'badge-green' : t.status === 'OCCUPIED' ? 'badge-red' : t.status === 'RESERVED' ? 'badge-yellow' : 'badge-gray'}`}>{cfg.label}</span>

//                     {/* Actions on hover */}
//                     <div className="mt-3 hidden group-hover:flex flex-col gap-1.5">
//                       <select value={t.status} onChange={(e) => statusMutation.mutate({ id: t.id, status: e.target.value })}
//                         className="text-xs border border-current/30 rounded-lg px-2 py-1 bg-white/80 w-full">
//                         {['AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE'].map((s) => <option key={s} value={s}>{s}</option>)}
//                       </select>
//                       <div className="flex gap-1">
//                         <button onClick={() => qrMutation.mutate(t.id)} className="flex-1 text-xs bg-white/60 hover:bg-white rounded-lg py-1">QR</button>
//                         <button onClick={() => setDeleteId(t.id)} className="flex-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg py-1">Del</button>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         ))
//       )}

//       {/* Create Modal */}
//       {modal && (
//         <div className="modal-overlay" onClick={() => setModal(false)}>
//           <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h3 className="text-lg font-semibold">Add New Table</h3>
//               <button onClick={() => setModal(false)} className="btn-ghost btn-icon text-gray-400">✕</button>
//             </div>
//             <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, capacity: parseInt(form.capacity), floor: parseInt(form.floor) }); }}>
//               <div className="modal-body space-y-4">
//                 <div><label className="label">Table Number *</label><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required placeholder="e.g. T1, T2" /></div>
//                 <div><label className="label">Display Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Window Table" /></div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div><label className="label">Capacity *</label><input type="number" min="1" max="20" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></div>
//                   <div><label className="label">Floor</label><input type="number" min="1" className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
//                 </div>
//               </div>
//               <div className="modal-footer">
//                 <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
//                 <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Creating...' : 'Create Table'}</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* QR Code View Modal */}
//       {qrView && (
//         <div className="modal-overlay" onClick={() => setQrView(null)}>
//           <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header"><h3 className="text-lg font-semibold">Table QR Code</h3><button onClick={() => setQrView(null)} className="btn-ghost btn-icon text-gray-400">✕</button></div>
//             <div className="modal-body text-center">
//               <img src={qrView} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl border" />
//               <p className="text-sm text-gray-500 mt-3">Scan to order from this table</p>
//               <a href={qrView} download="table-qr.png" className="btn-primary mt-4 inline-flex">Download QR</a>
//             </div>
//           </div>
//         </div>
//       )}

//       <ConfirmDialog open={!!deleteId} title="Remove Table" message="This will deactivate the table. Are you sure?"
//         onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} confirmText="Remove" danger />
//     </div>
//   );
// }





import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tableApi } from '../../api/table.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState, ConfirmDialog } from '../../components/ui';
import { TABLE_STATUS_CONFIG } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ManagerTables() {
  const qc = useQueryClient();
  const { branchId } = useBranch();
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({ number: '', capacity: 4, floor: 1, name: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [qrView, setQrView]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tables', branchId],
    queryFn:  () => tableApi.getAll(branchId),
    enabled:  !!branchId,
    refetchInterval: 20000,
  });
  const tables = data?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d) => tableApi.create(branchId, d),
    onSuccess:  () => { qc.invalidateQueries(['tables']); setModal(false); setForm({ number:'', capacity:4, floor:1, name:'' }); toast.success('Table created!'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => tableApi.updateStatus(id, status),
    onSuccess:  () => { qc.invalidateQueries(['tables']); toast.success('Status updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tableApi.remove(id),
    onSuccess:  () => { qc.invalidateQueries(['tables']); setDeleteId(null); toast.success('Table removed'); },
  });

  const qrMutation = useMutation({
    mutationFn: (id) => tableApi.regenerateQR(id, branchId),
    onSuccess:  (res) => {
      qc.invalidateQueries(['tables']);
      // Support both legacy (qrCode string) and new (qrCode + orderUrl) responses
      const d = res.data.data;
      setQrView(typeof d === 'string' ? d : { qrCode: d.qrCode, orderUrl: d.orderUrl });
      toast.success('QR regenerated');
    },
  });

  const byFloor = tables.reduce((acc, t) => {
    const f = t.floor || 1;
    if (!acc[f]) acc[f] = [];
    acc[f].push(t);
    return acc;
  }, {});

  const summary = {
    available:   tables.filter((t) => t.status === 'AVAILABLE').length,
    occupied:    tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved:    tables.filter((t) => t.status === 'RESERVED').length,
    maintenance: tables.filter((t) => t.status === 'MAINTENANCE').length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Tables</h1><p className="page-subtitle">{tables.length} tables total</p></div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Add Table</button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Available',   count: summary.available,   color:'bg-green-50 text-green-700 border-green-200'  },
          { label:'Occupied',    count: summary.occupied,    color:'bg-red-50 text-red-700 border-red-200'        },
          { label:'Reserved',    count: summary.reserved,    color:'bg-yellow-50 text-yellow-700 border-yellow-200'},
          { label:'Maintenance', count: summary.maintenance, color:'bg-gray-50 text-gray-700 border-gray-200'     },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-500" /></div>
      ) : tables.length === 0 ? (
        <div className="card"><EmptyState icon="🪑" title="No tables" subtitle="Add tables to get started" action={<button onClick={() => setModal(true)} className="btn-primary mt-4">Add Table</button>} /></div>
      ) : (
        Object.entries(byFloor).map(([floor, floorTables]) => (
          <div key={floor} className="card">
            <div className="card-header"><h2 className="font-semibold text-gray-900">Floor {floor}</h2></div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {floorTables.map((t) => {
                const cfg = TABLE_STATUS_CONFIG[t.status] || {};
                return (
                  <div key={t.id} className={`border-2 rounded-2xl p-4 text-center cursor-pointer transition-all hover:shadow-md group ${cfg.border} ${cfg.color}`}>
                    <div className="text-2xl mb-1">🪑</div>
                    <p className="font-bold text-lg">T{t.number}</p>
                    {t.name && <p className="text-xs opacity-70 truncate">{t.name}</p>}
                    <p className="text-xs opacity-70 mt-0.5">{t.capacity} seats</p>
                    <span className={`badge mt-2 text-xs ${t.status === 'AVAILABLE' ? 'badge-green' : t.status === 'OCCUPIED' ? 'badge-red' : t.status === 'RESERVED' ? 'badge-yellow' : 'badge-gray'}`}>{cfg.label}</span>

                    {/* Actions on hover */}
                    <div className="mt-3 hidden group-hover:flex flex-col gap-1.5">
                      <select value={t.status} onChange={(e) => statusMutation.mutate({ id: t.id, status: e.target.value })}
                        className="text-xs border border-current/30 rounded-lg px-2 py-1 bg-white/80 w-full">
                        {['AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="flex gap-1">
                        <button onClick={() => qrMutation.mutate(t.id)} className="flex-1 text-xs bg-white/60 hover:bg-white rounded-lg py-1">QR</button>
                        <button onClick={() => setDeleteId(t.id)} className="flex-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg py-1">Del</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Create Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Add New Table</h3>
              <button onClick={() => setModal(false)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, capacity: parseInt(form.capacity), floor: parseInt(form.floor) }); }}>
              <div className="modal-body space-y-4">
                <div><label className="label">Table Number *</label><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required placeholder="e.g. T1, T2" /></div>
                <div><label className="label">Display Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Window Table" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Capacity *</label><input type="number" min="1" max="20" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></div>
                  <div><label className="label">Floor</label><input type="number" min="1" className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Creating...' : 'Create Table'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code View Modal */}
      {qrView && (
        <div className="modal-overlay" onClick={() => setQrView(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Table QR Code</h3>
              <button onClick={() => setQrView(null)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <div className="modal-body text-center">
              <img src={qrView.qrCode || qrView} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl border" />
              <p className="text-sm text-gray-500 mt-3">Customers scan this to self-order from the table</p>
              {qrView.orderUrl && (
                <a
                  href={qrView.orderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-500 underline mt-2 inline-block break-all"
                >
                  {qrView.orderUrl}
                </a>
              )}
              <div className="flex gap-2 mt-4">
                <a
                  href={qrView.qrCode || qrView}
                  download="table-qr.png"
                  className="btn-primary flex-1 inline-flex justify-center"
                >
                  Download QR
                </a>
                {qrView.orderUrl && (
                  <a
                    href={qrView.orderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline flex-1 inline-flex justify-center"
                  >
                    Preview
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="Remove Table" message="This will deactivate the table. Are you sure?"
        onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} confirmText="Remove" danger />
    </div>
  );
}