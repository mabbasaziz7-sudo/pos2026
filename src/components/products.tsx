'use client';

import { useState, useEffect, useRef } from 'react';
import { db, type Product, type Category, generateBarcode } from '@/lib/local-db';
import { formatCurrency } from '@/lib/store';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  Package,
  X,
  Save,
  Tag,
  Upload,
  Image as ImageIcon,
  FolderPlus,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [labelCount, setLabelCount] = useState('1');
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    category: '',
    unit: 'قطعة',
    discount: '0',
    image: '',
    plu: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [prods, cats] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray(),
    ]);
    setProducts(prods);
    setCategories(cats);
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => c.name === name)) {
      toast.error('هذه الفئة موجودة مسبقاً');
      return;
    }
    await db.categories.add({ name, createdAt: new Date() });
    setNewCategoryName('');
    loadData();
  };

  const renameCategory = async (category: Category, newName: string) => {
    const name = newName.trim();
    if (!name || name === category.name) {
      setEditingCategory(null);
      return;
    }
    await db.categories.update(category.id!, { name });
    await db.products.where('category').equals(category.name).modify({ category: name });
    setEditingCategory(null);
    loadData();
  };

  const deleteCategory = async (category: Category) => {
    const inUse = products.some((p) => p.category === category.name);
    if (inUse) {
      toast.error('لا يمكن حذف فئة مستخدمة في منتجات حالياً');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    await db.categories.delete(category.id!);
    loadData();
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
  );

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: generateBarcode(),
      price: '',
      cost: '',
      stock: '',
      minStock: '5',
      category: categories[0]?.name || 'عام',
      unit: 'قطعة',
      discount: '0',
      image: '',
      plu: '',
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      category: product.category,
      unit: product.unit,
      discount: (product.discount || 0).toString(),
      image: product.image || '',
      plu: product.plu || '',
    });
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFormData((prev) => ({ ...prev, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const saveProduct = async () => {
    if (!formData.name.trim() || !formData.price || !formData.cost) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const data = {
      name: formData.name.trim(),
      barcode: formData.barcode.trim(),
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stock: parseInt(formData.stock) || 0,
      minStock: parseInt(formData.minStock) || 5,
      category: formData.category,
      unit: formData.unit,
      discount: parseFloat(formData.discount) || 0,
      image: formData.image,
      plu: formData.plu.trim() || undefined,
      updatedAt: new Date(),
    };

    try {
      if (editingProduct) {
        await db.products.update(editingProduct.id!, { ...data, createdAt: editingProduct.createdAt });
        toast.success('تم تحديث المنتج');
      } else {
        await db.products.add({ ...data, createdAt: new Date() } as Product);
        toast.success('تم إضافة المنتج');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await db.products.delete(id);
    toast.success('تم حذف المنتج');
    loadData();
  };

  const showBarcode = (product: Product) => {
    setBarcodeProduct(product);
    setLabelCount('1');
    setShowBarcodeModal(true);
    setTimeout(() => {
      if (barcodeSvgRef.current) {
        try {
          JsBarcode(barcodeSvgRef.current, product.barcode, {
            format: 'EAN13',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 14,
          });
        } catch {
          JsBarcode(barcodeSvgRef.current, product.barcode, {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 14,
          });
        }
      }
    }, 100);
  };

  const printBarcode = () => {
    if (!barcodeSvgRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const count = Math.max(parseInt(labelCount) || 1, 1);
    const label = `
      <div class="label">
        <h3>${barcodeProduct?.name}</h3>
        ${barcodeSvgRef.current.outerHTML}
        <p>${formatCurrency(barcodeProduct?.price || 0)}</p>
      </div>
    `;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>باركود</title>
          <style>
            body { text-align: center; padding: 20px; }
            .sheet { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
            .label { border: 1px dashed #ccc; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${label.repeat(count)}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
            placeholder="البحث في المنتجات..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="rtl"
          />
        </div>
        <button
          onClick={() => setShowCategoryModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          الفئات
        </button>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          منتج جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي المنتجات</p>
          <p className="text-2xl font-bold text-slate-800">{products.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">قيمة المخزون</p>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(products.reduce((sum, p) => sum + p.stock * p.cost, 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">منتجات منخفضة</p>
          <p className="text-2xl font-bold text-amber-600">
            {products.filter((p) => p.stock <= p.minStock).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">نفذ المخزون</p>
          <p className="text-2xl font-bold text-rose-600">
            {products.filter((p) => p.stock === 0).length}
          </p>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المنتج</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الباركود</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">السعر</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">التكلفة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المخزون</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفئة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                        {product.image ? (
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${product.stock <= product.minStock ? 'bg-amber-400' : product.stock === 0 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                      <span className="font-medium text-sm text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{product.barcode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatCurrency(product.cost)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${product.stock <= product.minStock ? 'text-amber-600' : product.stock === 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{product.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => showBarcode(product)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="عرض الباركود"
                      >
                        <Barcode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف"
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
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد منتجات</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingProduct ? 'تعديل منتج' : 'منتج جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-2">صورة المنتج</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {formData.image ? (
                      <img src={formData.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    رفع صورة
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {formData.image && (
                    <button
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      إزالة
                    </button>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1">اسم المنتج *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الباركود</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, barcode: generateBarcode() })}
                    className="px-3 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الفئة</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="px-3 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                    title="إدارة الفئات"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">سعر البيع *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">التكلفة *</label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">المخزون</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الحد الأدنى</label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">الوحدة</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="قطعة">قطعة</option>
                  <option value="كيلو">كيلو</option>
                  <option value="لتر">لتر</option>
                  <option value="علبة">علبة</option>
                  <option value="كرتونة">كرتونة</option>
                  <option value="متر">متر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">خصم افتراضي %</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">كود الميزان (PLU)</label>
                <input
                  type="text"
                  value={formData.plu}
                  onChange={(e) => setFormData({ ...formData, plu: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="مثال: 00123"
                  maxLength={5}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={saveProduct}
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
      )}

      {/* Barcode Modal */}
      {showBarcodeModal && barcodeProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className="font-bold text-slate-800 mb-1">{barcodeProduct.name}</h3>
            <p className="text-emerald-600 font-bold mb-4">{formatCurrency(barcodeProduct.price)}</p>
            <svg ref={barcodeSvgRef} className="mx-auto" />
            <div className="mt-4 text-right">
              <label className="block text-sm font-medium text-slate-600 mb-1">عدد الملصقات</label>
              <input
                type="number"
                value={labelCount}
                onChange={(e) => setLabelCount(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min="1"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={printBarcode}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg"
              >
                طباعة
              </button>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">إدارة الفئات</h3>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                placeholder="اسم فئة جديدة..."
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                dir="rtl"
              />
              <button onClick={addCategory} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                  {editingCategory?.id === cat.id ? (
                    <input
                      type="text"
                      autoFocus
                      defaultValue={cat.name}
                      onKeyDown={(e) => e.key === 'Enter' && renameCategory(cat, (e.target as HTMLInputElement).value)}
                      onBlur={(e) => renameCategory(cat, e.target.value)}
                      className="flex-1 px-2 py-1 border border-emerald-300 rounded text-sm focus:outline-none"
                      dir="rtl"
                    />
                  ) : (
                    <span className="flex-1 text-sm text-slate-700">{cat.name}</span>
                  )}
                  {editingCategory?.id === cat.id ? (
                    <button onClick={() => setEditingCategory(null)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => setEditingCategory(cat)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-4">لا توجد فئات</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
