"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { fetchApi, formatDate, formatDateTime, attendanceStatusLabels, attendanceStatusColors } from "@/lib/api";

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", date: new Date().toISOString().split("T")[0], checkIn: "", checkOut: "", status: "present", notes: "" });

  const load = () => {
    setLoading(true);
    Promise.all([fetchApi(`/api/attendance?date=${date}`), fetchApi("/api/users")])
      .then(([recs, us]) => { setRecords(recs); setUsers(us); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date]);

  const save = async () => {
    if (!form.userId) { alert("اختر الموظف"); return; }
    await fetchApi("/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        userId: parseInt(form.userId),
        checkIn: form.checkIn ? new Date(`${form.date}T${form.checkIn}`).toISOString() : null,
        checkOut: form.checkOut ? new Date(`${form.date}T${form.checkOut}`).toISOString() : null,
      }),
    });
    setModalOpen(false);
    load();
  };

  // Quick check-in/out
  const quickCheck = async (userId: number, type: "in" | "out") => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);

    // Check if record exists
    const existing = records.find(r => r.userId === userId && r.date === today);
    if (type === "in" && existing) {
      alert("تم تسجيل الدخول مسبقاً");
      return;
    }

    if (existing && type === "out") {
      // Update check-out
      await fetchApi(`/api/attendance`, {
        method: "POST",
        body: JSON.stringify({
          userId, date: today, checkIn: existing.checkIn,
          checkOut: new Date(`${today}T${timeStr}`).toISOString(),
          status: "present", notes: existing.notes,
        }),
      });
    } else {
      await fetchApi("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          userId, date: today,
          checkIn: type === "in" ? new Date(`${today}T${timeStr}`).toISOString() : null,
          checkOut: type === "out" ? new Date(`${today}T${timeStr}`).toISOString() : null,
          status: "present",
        }),
      });
    }
    load();
  };

  const presentCount = records.filter(r => r.status === "present").length;
  const lateCount = records.filter(r => r.status === "late").length;
  const absentCount = records.filter(r => r.status === "absent").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <PageHeader
          title="إدارة الحضور"
          description="بصمة الحضور والانصراف وتسجيل أوقات العمل"
          actions={
            <button onClick={() => { setForm({ userId: "", date: new Date().toISOString().split("T")[0], checkIn: "", checkOut: "", status: "present", notes: "" }); setModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md">
              + تسجيل يدوي
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
          <label className="text-sm font-semibold">التاريخ:</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg outline-none" />
          <div className="flex-1" />
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">حاضر: {presentCount}</span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">متأخر: {lateCount}</span>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">غائب: {absentCount}</span>
          </div>
        </div>

        {/* Quick check-in/out */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <h3 className="font-bold mb-3">بصمة سريعة</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {users.map((u) => {
              const today = new Date().toISOString().split("T")[0];
              const rec = records.find(r => r.userId === u.id && r.date === today);
              return (
                <div key={u.id} className="border border-slate-200 rounded-lg p-2 text-sm">
                  <p className="font-semibold text-xs">{u.name}</p>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => quickCheck(u.id, "in")}
                      disabled={!!rec?.checkIn}
                      className="flex-1 text-xs px-2 py-1 bg-green-500 text-white rounded disabled:opacity-50"
                    >
                      دخول {rec?.checkIn && "✓"}
                    </button>
                    <button
                      onClick={() => quickCheck(u.id, "out")}
                      disabled={!rec?.checkIn || !!rec?.checkOut}
                      className="flex-1 text-xs px-2 py-1 bg-red-500 text-white rounded disabled:opacity-50"
                    >
                      خروج {rec?.checkOut && "✓"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-5xl mb-3">🕐</div>
              <p>لا توجد سجلات لهذا اليوم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الموظف</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">دخول</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">خروج</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">ساعات العمل</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold">{r.userName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${attendanceStatusColors[r.status]}`}>
                          {attendanceStatusLabels[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                      <td className="px-4 py-3 text-sm font-mono">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{r.workingHours} ساعة</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{r.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تسجيل حضور يدوي">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">الموظف *</label>
              <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="">-- اختر --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">التاريخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                {Object.entries(attendanceStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">وقت الدخول</label>
              <input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">وقت الخروج</label>
              <input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-6 justify-end">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">إلغاء</button>
            <button onClick={save} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">حفظ</button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
