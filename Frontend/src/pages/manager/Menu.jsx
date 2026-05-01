import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuApi } from '../../api/menu.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState, Toggle, ConfirmDialog, SearchInput, Tabs } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:9001';

export default function ManagerMenu() {
  const qc = useQueryClient();
  const { restaurantId } = useBranch();

  const [activeCat,  setActiveCat]  = useState('');
  const [modal,      setModal]      = useState(false);
  const [catModal,   setCatModal]   = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [imageFile,  setImageFile]  = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [form,    setForm]    = useState({
    name: '', description: '', basePrice: '', taxRate: '5',
    isVeg: true, isFeatured: false, categoryId: '', preparationTime: '15',
  });

  // Queries
  const { data: catData } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn:  () => menuApi.getCategories(restaurantId),
    enabled:  !!restaurantId,
  });
  const categories = catData?.data?.data || [];
  const catTabs    = [{ value: '', label: 'All' }, ...categories.map((c) => ({ value: c.id, label: c.name, count: c._count?.items }))];

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['menu-items', restaurantId, activeCat, search],
    queryFn:  () => menuApi.getItems(restaurantId, { categoryId: activeCat || undefined, search: search || undefined }),
    enabled:  !!restaurantId,
  });
  const items = itemsData?.data?.data?.items || [];

  // Mutations
  const createCatMutation = useMutation({
    mutationFn: (d) => menuApi.createCategory(restaurantId, d),
    onSuccess:  () => {
      qc.invalidateQueries(['categories']);
      setCatModal(false);
      setCatForm({ name: '', description: '' });
      toast.success('Category created!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create category'),
  });

  const saveItemMutation = useMutation({
    mutationFn: (fd) => editItem ? menuApi.updateItem(editItem.id, fd) : menuApi.createItem(restaurantId, fd),
    onSuccess: () => {
      qc.invalidateQueries(['menu-items']);
      closeItemModal();
      toast.success(editItem ? 'Item updated!' : 'Item created!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save item'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => menuApi.toggleAvailability(id),
    onSuccess:  () => qc.invalidateQueries(['menu-items']),
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => menuApi.deleteItem(id),
    onSuccess:  () => { qc.invalidateQueries(['menu-items']); setDeleteId(null); toast.success('Item removed'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // Helpers
  const resetForm = () => {
    setForm({ name: '', description: '', basePrice: '', taxRate: '5', isVeg: true, isFeatured: false, categoryId: '', preparationTime: '15' });
    setImageFile(null);
    setImagePreview(null);
  };

  const closeItemModal = () => {
    setModal(false);
    setEditItem(null);
    resetForm();
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name:            item.name,
      description:     item.description || '',
      basePrice:       item.basePrice,
      taxRate:         item.taxRate,
      isVeg:           item.isVeg,
      isFeatured:      item.isFeatured || false,
      categoryId:      item.categoryId,
      preparationTime: item.preparationTime,
    });
    setImageFile(null);
    setImagePreview(null);
    setModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim())   return toast.error('Item name is required');
    if (!form.categoryId)    return toast.error('Please select a category');
    if (!form.basePrice)     return toast.error('Base price is required');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    if (imageFile) fd.append('image', imageFile);
    saveItemMutation.mutate(fd);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu Management</h1>
          <p className="page-subtitle">{items.length} items</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCatModal(true)} className="btn-outline">+ Category</button>
          <button onClick={() => { resetForm(); setEditItem(null); setModal(true); }} className="btn-primary">+ Menu Item</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header space-y-3">
          <div className="overflow-x-auto scrollbar-hide">
            <Tabs tabs={catTabs} active={activeCat} onChange={setActiveCat} />
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search items..." />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-500" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="🍽️" title="No menu items" subtitle="Add items to your menu" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                <div className="relative h-36 bg-gray-100">
                  {item.image ? (
                    <img src={`${API_URL}${item.image}`} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                    </span>
                    {item.isFeatured && <span className="badge badge-orange text-xs">⭐</span>}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => openEdit(item)} className="w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center text-xs hover:bg-gray-50">✏️</button>
                    <button onClick={() => setDeleteId(item.id)} className="w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center text-xs hover:bg-red-50">🗑️</button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.category?.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-bold text-primary-500">{formatCurrency(item.basePrice)}</p>
                    <Toggle checked={item.isAvailable} onChange={() => toggleMutation.mutate(item.id)} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">⏱ {item.preparationTime} min · GST {item.taxRate}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {catModal && (
        <div className="modal-overlay" onClick={() => setCatModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Add Category</h3>
              <button onClick={() => setCatModal(false)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createCatMutation.mutate(catForm); }}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">Category Name *</label>
                  <input className="input" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required placeholder="e.g. Starters, Main Course" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input" rows={2} value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder="Optional description" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setCatModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={createCatMutation.isPending} className="btn-primary">
                  {createCatMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeItemModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button onClick={closeItemModal} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Item Name *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Butter Chicken" />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Base Price (₹) *</label>
                  <input type="number" step="0.01" min="0" className="input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required placeholder="0.00" />
                </div>
                <div>
                  <label className="label">GST Rate (%)</label>
                  <input type="number" step="0.5" min="0" max="28" className="input" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Prep Time (min)</label>
                  <input type="number" min="1" className="input" value={form.preparationTime} onChange={(e) => setForm({ ...form, preparationTime: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                </div>

                {/* Image Upload */}
                <div className="sm:col-span-2">
                  <label className="label">Item Image</label>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <input
                        key={`img-${editItem?.id || 'new'}`}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="input py-1.5 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP · Max 5MB</p>
                    </div>
                    {/* Preview */}
                    {(imagePreview || (editItem?.image && !imageFile)) && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        <img
                          src={imagePreview || `${API_URL}${editItem.image}`}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Veg / Featured toggles */}
                <div className="flex items-center gap-6">
                  <Toggle checked={form.isVeg}      onChange={(v) => setForm({ ...form, isVeg: v })}      label="Vegetarian" />
                  <Toggle checked={form.isFeatured}  onChange={(v) => setForm({ ...form, isFeatured: v })} label="Featured ⭐" />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeItemModal} className="btn-outline">Cancel</button>
                <button type="submit" disabled={saveItemMutation.isPending} className="btn-primary">
                  {saveItemMutation.isPending ? 'Saving...' : editItem ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Remove Item"
        message="This will make the item unavailable in the menu."
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        confirmText="Remove"
        danger
      />
    </div>
  );
}
