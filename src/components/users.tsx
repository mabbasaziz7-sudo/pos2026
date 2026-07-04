'use client';

import { useState, useEffect } from 'react';
import { db, type User } from '@/lib/local-db';
import { useAppStore } from '@/lib/store';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Search,
  Check,
  XCircle,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

const allPermissions = [
  { id: 'pos', label: 'نقطة البيع' },
  { id: 'sales', label: 'المبيعات' },
  { id: 'returns', label: 'المرتجعات' },
  { id: 'purchases', label: 'المشتريات' },
  { id: 'products', label: 'إدارة المنتجات' },
  { id: 'inventory', label: 'إدارة المخزون' },
  { id: 'shifts', label: 'إدارة الورديات' },
  { id: 'suppliers', label: 'إدارة الموردين' },
  { id: 'customers', label: 'إدارة العملاء' },
  { id: 'promotions', label: 'العروض والكوبونات' },
  { id: 'vouchers', label: 'القسائم' },
  { id: 'campaigns', label: 'واتساب' },
  { id: 'reports', label: 'التقارير' },
  { id: 'users', label: 'إدارة المستخدمين' },
  { id: 'backup', label: 'النسخ الاحتياطي' },
  { id: 'financials', label: 'السندات والرواتب' },
];

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  manager: 'مدير فرع',
  cashier: 'كاشير',
};

export default function Users() {
  const { currentUser } = useAppStore();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    permissions: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const all = await db.users.toArray();
    setUsers(all);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        username: user.username,
        password: '',
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'cashier',
        permissions: [],
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const togglePermission = (permId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const saveUser = async () => {
    if (!formData.name.trim() || !formData.username.trim()) {
      toast.error('يرجى ملء الاسم واسم المستخدم');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('يرجى إدخال كلمة المرور');
      return;
    }

    const data = {
      name: formData.name.trim(),
      username: formData.username.trim(),
      role: formData.role,
      permissions: formData.role === 'admin' ? ['all'] : formData.permissions,
      isActive: formData.isActive,
      createdAt: editingUser?.createdAt || new Date(),
    };

    try {
      if (editingUser) {
        const updateData: any = { ...data };
        if (formData.password) updateData.password = formData.password;
        await db.users.update(editingUser.id!, updateData);
        toast.success('تم تحديث المستخدم');
      } else {
        await db.users.add({ ...data, password: formData.password } as User);
        toast.success('تم إضافة المستخدم');
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const deleteUser = async (id: number) => {
    if (id === currentUser?.id) {
      toast.error('لا يمكنك حذف حسابك الحالي');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await db.users.delete(id);
    toast.success('تم حذف المستخدم');
    loadUsers();
  };

  const toggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('لا يمكنك تعطيل حسابك الحالي');
      return;
    }
    await db.users.update(user.id!, { isActive: !user.isActive });
    toast.success(user.isActive ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
    loadUsers();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في المستخدمين..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          مستخدم جديد
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المستخدم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">اسم المستخدم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الدور</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الصلاحيات</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="font-medium text-sm text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {user.permissions?.includes('all') ? 'جميع الصلاحيات' : `${user.permissions?.length || 0} صلاحية`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(user)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        user.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {user.isActive ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {user.isActive ? 'نشط' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openModal(user)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا يوجد مستخدمين</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">اسم المستخدم *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  كلمة المرور {editingUser && '(اتركها فارغة للإبقاء على الحالية)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الدور</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'manager', 'cashier'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setFormData({ ...formData, role })}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                        formData.role === role
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {roleLabels[role]}
                    </button>
                  ))}
                </div>
              </div>

              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">الصلاحيات</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allPermissions.map((perm) => (
                      <button
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                          formData.permissions.includes(perm.id)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          formData.permissions.includes(perm.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                        }`}>
                          {formData.permissions.includes(perm.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {perm.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    formData.isActive ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
                <span className="text-sm text-slate-600">{formData.isActive ? 'نشط' : 'معطل'}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveUser}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
