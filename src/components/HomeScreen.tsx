import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useStore } from '../store/useStore';
import { Sparkles, Plus, FileText, X, Trash2, PenLine, Image as ImageIcon, ChevronLeft, Smartphone, Palette, Grid3X3, ListChecks, ArrowUpLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

const BACKGROUNDS = [
  { id: 'color', label: 'أبيض', value: '#ffffff' },
  { id: 'grid', label: 'شبكة', value: '#f9fafb' },
  { id: 'lines', label: 'سطور', value: '#f9fafb' },
  { id: 'dots', label: 'نقاط', value: '#f9fafb' },
  { id: 'dark', label: 'داكن', value: '#1e1e2e' },
  { id: 'cream', label: 'كريمي', value: '#fdf6e3' },
];

const NOTE_IMAGE = 'https://images.unsplash.com/photo-1745302281184-dfdad65fe6cc?auto=format&fit=crop&fm=jpg&q=80&w=1800';

export const HomeScreen: React.FC = () => {
  const pages = useLiveQuery(() => db.pages.toArray().then(p => p.sort((a, b) => b.updatedAt - a.updatedAt)));
  const { setActivePageId, setView } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBg, setNewBg] = useState('dots');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const id = uuidv4();
    const bg = BACKGROUNDS.find(b => b.id === newBg) || BACKGROUNDS[0];
    await db.pages.add({ id, notebookId: 'default-notebook', title: newTitle.trim(), order: Date.now(), elements: [], background: { type: bg.id as any, value: bg.value }, createdAt: Date.now(), updatedAt: Date.now() });
    setActivePageId(id); setView('canvas'); setIsModalOpen(false); setNewTitle('');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => { e.stopPropagation(); await db.pages.delete(id); };

  const bgPreview = (type: string) => {
    if (type === 'grid') return { backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '16px 16px' };
    if (type === 'dots') return { backgroundImage: 'radial-gradient(#d1d5db 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' };
    if (type === 'lines') return { backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '100% 18px' };
    if (type === 'dark') return { backgroundColor: '#1e1e2e' };
    if (type === 'cream') return { backgroundColor: '#fdf6e3' };
    return { backgroundColor: '#fff' };
  };

  return (
    <div className="min-h-screen bg-[#fbfaf9] text-[#292524]" style={{ fontFamily: 'Cairo, Arial, sans-serif' }} dir="rtl">
      <div className="px-4 sm:px-6 pt-4">
        <header className="max-w-6xl mx-auto flex justify-between items-center bg-white/85 backdrop-blur-xl border border-stone-200/80 rounded-[22px] px-4 sm:px-5 py-3 shadow-[0_10px_35px_rgba(41,37,36,.05)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#e5484d] rounded-[13px] flex items-center justify-center shadow-[0_6px_18px_rgba(229,72,77,.28)]">
              <PenLine size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Smart Notebook</h1>
              <p className="text-xs text-gray-400">دفتر ملاحظات ذكي</p>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#e5484d] hover:bg-[#cf3f45] text-white px-3.5 sm:px-4 py-2 rounded-xl font-bold text-sm shadow-[0_6px_16px_rgba(229,72,77,.22)] transition-all hover:-translate-y-0.5">
            <Plus size={17} strokeWidth={2.5} /> <span className="hidden sm:inline">ملاحظة جديدة</span><span className="sm:hidden">جديد</span>
          </button>
        </header>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[28px] bg-[#292524] min-h-[230px] sm:min-h-[270px] mb-8 shadow-[0_18px_48px_rgba(41,37,36,.12)]">
          <img src={NOTE_IMAGE} alt="الكتابة بالقلم على جهاز لوحي" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#292524]/88 via-[#292524]/68 to-[#292524]/20" />
          <div className="relative z-10 h-full p-7 sm:p-10 flex flex-col items-start justify-center max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full bg-white/12 border border-white/20 text-white/90 px-3 py-1.5 mb-4"><Sparkles size={13} /> مساحة أفكارك الخاصة</span>
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold text-white">اكتب. ارسم. رتّب كل فكرة.</h2>
            <p className="mt-3 text-sm sm:text-base text-white/75 max-w-md">ملاحظات مرنة تشبه الورق، مع الرسم والصور والنصوص القابلة للتعديل.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/80">
              <span className="rounded-lg bg-white/10 px-3 py-2"><Palette size={14} className="inline ml-1.5" />رسم حر</span>
              <span className="rounded-lg bg-white/10 px-3 py-2"><ImageIcon size={14} className="inline ml-1.5" />صور وتعليقات</span>
              <span className="rounded-lg bg-white/10 px-3 py-2"><Smartphone size={14} className="inline ml-1.5" />جاهز للموبايل</span>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[1fr_270px] gap-5 items-start">
          <div>
            <div className="flex items-end justify-between mb-4">
              <div><p className="text-xs font-bold tracking-wide text-[#e5484d]">مَساحاتي</p><h2 className="text-xl font-bold mt-1">ملاحظاتك الأخيرة</h2></div>
              <button onClick={() => setIsModalOpen(true)} className="text-sm font-bold text-[#c7373c] hover:text-[#e5484d]">إنشاء ملاحظة <ChevronLeft size={16} className="inline" /></button>
            </div>
            {pages?.length === 0 && (
              <div className="bg-white rounded-[24px] border border-stone-200 p-10 sm:p-14 text-center shadow-sm">
                <div className="w-16 h-16 bg-[#fff1f1] rounded-[20px] mx-auto mb-5 flex items-center justify-center"><FileText size={28} className="text-[#e9898d]" /></div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">ابدأ دفترك الأول</h3><p className="text-gray-400 text-sm">أنشئ أول ملاحظة وارسم أو اكتب عليها فورًا.</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {pages?.map(page => (
            <div key={page.id} onClick={() => { setActivePageId(page.id); setView('canvas'); }}
              className="group bg-white rounded-[20px] border border-stone-200 hover:border-[#e9898d] overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
              {/* Preview */}
              <div className="aspect-[4/3] relative border-b border-gray-50 overflow-hidden" style={bgPreview(page.background.type)}>
                <FileText size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-200 group-hover:text-[#e9898d] transition-colors" />
                <button onClick={(e) => handleDelete(e, page.id)} className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-800 text-sm truncate">{page.title}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(page.updatedAt).toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
              ))}
            </div>
          </div>
          <aside className="bg-white border border-stone-200 rounded-[24px] p-5 shadow-sm">
            <p className="text-xs font-bold text-stone-400">نظرة سريعة</p>
            <p className="text-3xl font-bold mt-1">{pages?.length || 0}<span className="text-sm font-semibold text-stone-400 mr-1">ملاحظات</span></p>
            <div className="h-px bg-stone-100 my-5" />
            <p className="text-sm font-bold mb-3">ابدأ بطريقتك</p>
            <button onClick={() => setIsModalOpen(true)} className="w-full text-right flex items-center gap-3 rounded-xl p-3 hover:bg-[#fff5f5] transition-colors group"><span className="w-9 h-9 rounded-xl bg-red-50 text-[#e5484d] flex items-center justify-center"><Grid3X3 size={17}/></span><span className="text-xs font-bold flex-1">صفحة شبكية</span><ArrowUpLeft size={15} className="text-stone-300 group-hover:text-[#e5484d]" /></button>
            <button onClick={() => setIsModalOpen(true)} className="w-full text-right flex items-center gap-3 rounded-xl p-3 hover:bg-[#fff5f5] transition-colors group"><span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><ListChecks size={17}/></span><span className="text-xs font-bold flex-1">قائمة أو ملخص</span><ArrowUpLeft size={15} className="text-stone-300 group-hover:text-[#e5484d]" /></button>
            <p className="mt-4 text-[11px] leading-5 text-stone-400">كل ملاحظاتك محفوظة على جهازك، وتعمل حتى دون اتصال بعد التثبيت.</p>
          </aside>
        </section>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">ملف جديد</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الملف</label>
              <input autoFocus type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                placeholder="مثال: محاضرة الرياضيات" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />

              <label className="block text-sm font-semibold text-gray-700 mb-2 mt-5">خلفية الصفحة</label>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUNDS.map(bg => (
                  <button key={bg.id} onClick={() => setNewBg(bg.id)}
                    className={clsx("flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium",
                      newBg === bg.id ? "border-red-400 bg-red-50 text-red-600" : "border-gray-100 hover:border-gray-300 text-gray-500")}>
                    <div className="w-9 h-9 rounded-lg border border-gray-100 overflow-hidden" style={bgPreview(bg.id)} />
                    {bg.label}
                  </button>
                ))}
              </div>

              <button onClick={handleCreate} disabled={!newTitle.trim()}
                className="w-full mt-6 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-bold text-sm transition-all">
                إنشاء وفتح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
