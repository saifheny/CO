import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, FileText, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';
import { db } from '../db/db';
import { useStore } from '../store/useStore';

const PATTERNS = [{ id: 'color', label: 'سادة' }, { id: 'dots', label: 'نقط' }, { id: 'grid', label: 'مربعات' }, { id: 'lines', label: 'مسطّرة' }];
const PAGE_COLORS = ['#ffffff', '#f8fafc', '#fff7ed', '#fefce8', '#f0fdf4', '#eff6ff', '#f5f3ff', '#fdf2f8', '#1e1e2e'];
const APP_ICON = `${import.meta.env.BASE_URL}icon.svg`;

const previewStyle = (type: string, color = '#ffffff') => {
  const base = { backgroundColor: color };
  if (type === 'grid') return { ...base, backgroundImage: 'linear-gradient(#d6d3d1 1px, transparent 1px), linear-gradient(90deg, #d6d3d1 1px, transparent 1px)', backgroundSize: '18px 18px' };
  if (type === 'dots') return { ...base, backgroundImage: 'radial-gradient(#c4c0bb 1.2px, transparent 1.3px)', backgroundSize: '15px 15px' };
  if (type === 'lines') return { ...base, backgroundImage: 'linear-gradient(#ded9d2 1px, transparent 1px)', backgroundSize: '100% 22px' };
  return base;
};

export const HomeScreen: React.FC = () => {
  const pages = useLiveQuery(() => db.pages.toArray().then(items => items.sort((a, b) => b.updatedAt - a.updatedAt)));
  const { setActivePageId, setView } = useStore();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPattern, setNewPattern] = useState('color');
  const [newColor, setNewColor] = useState('#ffffff');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const pressTimer = useRef<number | null>(null);
  const preventOpen = useRef(false);

  const createPage = async () => {
    if (!newTitle.trim()) return;
    const id = uuidv4();
    await db.pages.add({ id, notebookId: 'default-notebook', title: newTitle.trim(), order: Date.now(), elements: [], background: { type: newPattern as any, value: newColor }, createdAt: Date.now(), updatedAt: Date.now() });
    setActivePageId(id); setView('canvas'); setCreating(false); setNewTitle('');
  };
  const openPage = (id: string) => { if (preventOpen.current) { preventOpen.current = false; return; } setActivePageId(id); setView('canvas'); };
  const startPress = (id: string) => { preventOpen.current = false; pressTimer.current = window.setTimeout(() => { preventOpen.current = true; setMenuId(id); }, 520); };
  const endPress = () => { if (pressTimer.current) window.clearTimeout(pressTimer.current); pressTimer.current = null; };
  const beginRename = (id: string, title: string) => { setMenuId(null); setRenamingId(id); setRenameValue(title); };
  const saveRename = async (id: string) => { if (renameValue.trim()) await db.pages.update(id, { title: renameValue.trim(), updatedAt: Date.now() }); setRenamingId(null); };
  const deletePage = async (id: string) => { await db.pages.delete(id); setMenuId(null); };

  if (creating) return <div className="app-scroll h-screen overflow-y-auto bg-[#f6f7f9] text-stone-900" dir="rtl" style={{ fontFamily: 'Cairo, Arial, sans-serif' }}>
    <button onClick={() => setCreating(false)} className="fixed left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-stone-600 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md sm:left-8"><X size={17}/> رجوع</button>
    <main className="mx-auto grid max-w-5xl gap-9 px-4 pb-12 pt-20 sm:px-8 lg:grid-cols-[1fr_300px]">
      <section><p className="text-xs font-bold tracking-[.14em] text-[#d83d43]">نوتة جديدة</p><h1 className="mt-2 text-2xl font-bold">ظبّط ورقتك على مزاجك.</h1><p className="mt-1 text-sm text-stone-500">اختار الاسم واللون والشكل اللي يريحك.</p><label className="mt-8 block text-sm font-bold">اسم النوتة</label><input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPage()} placeholder="مثال: مراجعة الدرس التالت" className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#e5484d] focus:ring-4 focus:ring-red-50" />
        <div className="mt-8 border-t border-stone-200 pt-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">لون الورقة</h2><p className="mt-1 text-xs text-stone-400">اللون هيفضل زي ما اخترته لحد ما تغيّره بنفسك.</p></div><span className="h-10 w-10 rounded-full border-4 border-white shadow ring-1 ring-stone-200" style={{ backgroundColor: newColor }} /></div><div className="mt-4 flex flex-wrap gap-3">{PAGE_COLORS.map((color, i) => <button key={color} onClick={() => setNewColor(color)} aria-label={`اختيار اللون ${color}`} className={clsx('flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform hover:scale-110', newColor === color ? 'scale-110 border-[#e5484d] ring-4 ring-red-100' : 'border-white shadow-sm ring-1 ring-stone-200')} style={{ backgroundColor: color }}>{newColor === color && <Check size={16} className={i === PAGE_COLORS.length - 1 ? 'text-white' : 'text-stone-700'} />}</button>)}<label className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-sm ring-1 ring-stone-200" style={{ background: 'conic-gradient(#f43f5e,#fbbf24,#22c55e,#06b6d4,#6366f1,#d946ef,#f43f5e)' }}><span className="rounded-full bg-white px-1 text-xs font-bold">+</span><input type="color" aria-label="لون مخصص" value={newColor} onChange={e => setNewColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0"/></label></div></div>
        <div className="mt-8 border-t border-stone-200 pt-6"><h2 className="text-sm font-bold">شكل الورقة</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{PATTERNS.map(pattern => <button key={pattern.id} onClick={() => setNewPattern(pattern.id)} className={clsx('overflow-hidden rounded-2xl border p-2 text-right transition', newPattern === pattern.id ? 'border-[#e5484d] ring-2 ring-red-100' : 'border-stone-200 hover:-translate-y-0.5 hover:shadow-md')}><span className="block h-20 rounded-xl border border-stone-200" style={previewStyle(pattern.id, newColor)} /><span className="mt-2 flex items-center justify-between text-xs font-bold">{pattern.label}{newPattern === pattern.id && <Check size={14} className="text-[#e5484d]"/>}</span></button>)}</div></div>
        <button onClick={createPage} disabled={!newTitle.trim()} className="mt-8 w-full rounded-2xl bg-[#e5484d] py-3.5 text-sm font-bold text-white transition hover:bg-[#ce3d43] disabled:bg-stone-200 disabled:text-stone-400">اعمِل النوتة وافتحها</button>
      </section>
      <aside><p className="text-xs font-bold text-stone-400">شكلها هيبقى كده</p><div className="mt-3 aspect-[4/3] rounded-2xl border border-stone-200 p-5 shadow-sm" style={previewStyle(newPattern, newColor)}><div className="flex h-full flex-col justify-between"><span className="w-fit rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#d83d43]">نوتة</span><h3 className="text-xl font-bold">{newTitle || 'نوتة من غير اسم'}</h3></div></div></aside>
    </main>
  </div>;

  return <div className="app-scroll h-screen overflow-y-auto overscroll-contain bg-[#f6f7f9] text-stone-900" dir="rtl" style={{ fontFamily: 'Cairo, Arial, sans-serif' }}>
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f6f7f9]/90 px-4 py-3 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#e5484d] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#ce3d43]"><Plus size={17}/> نوتة جديدة</button><div className="flex items-center gap-2.5"><div className="text-left"><p className="text-base font-extrabold tracking-tight">Smart Notebook</p><p className="text-[11px] text-stone-400">مساحة أفكارك</p></div><img src={APP_ICON} alt="Smart Notebook" className="h-10 w-10"/></div></div></header>
    <main className="mx-auto max-w-7xl px-4 py-7 pb-12 sm:px-8"><section className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5"><div><p className="text-xs font-bold tracking-[.14em] text-[#d83d43]">نوتاتك</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">كل نوتاتك</h1><p className="mt-1 text-sm text-stone-500">دوس مطوّل على أي نوتة علشان تغيّر اسمها أو تمسحها.</p></div><span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-500">{pages?.length || 0} نوتة</span></section>
      {!pages?.length ? <div className="mt-8 grid min-h-[320px] place-items-center rounded-[28px] border border-dashed border-stone-300 bg-white p-8 text-center"><div><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#e5484d]"><FileText size={26}/></div><h2 className="mt-4 text-lg font-bold">دفترك مستني أول فكرة</h2><p className="mt-1 text-sm text-stone-500">اعمِل نوتة واختار لونها وشكلها.</p><button onClick={() => setCreating(true)} className="mt-5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-700">ابدأ دلوقتي</button></div></div> : <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{pages.map(page => {
        const isMenuOpen = menuId === page.id; const isRenaming = renamingId === page.id; const paperColor = page.background?.value || '#ffffff';
        return <article key={page.id} onPointerDown={() => startPress(page.id)} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress} onClick={() => openPage(page.id)} className="group relative min-h-[230px] cursor-pointer overflow-hidden rounded-[22px] border border-stone-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-stone-300 hover:shadow-lg"><div className="absolute inset-x-0 top-0 h-[150px] border-b border-stone-200" style={previewStyle(page.background?.type || 'color', paperColor)}><FileText size={28} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-400/60"/><button onClick={e => { e.stopPropagation(); setMenuId(isMenuOpen ? null : page.id); }} aria-label="خيارات الملاحظة" className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white/90 text-stone-600 shadow-sm opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal size={17}/></button></div>
          <div className="absolute inset-x-0 bottom-0 bg-white p-4 pt-3">{isRenaming ? <div onClick={e => e.stopPropagation()} className="flex gap-1.5"><input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveRename(page.id)} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-[#e5484d]"/><button onClick={() => saveRename(page.id)} className="rounded-lg bg-[#e5484d] px-2 text-white"><Check size={15}/></button></div> : <><h2 className="truncate text-sm font-bold">{page.title}</h2><p className="mt-1 text-[11px] text-stone-400">اتعدّلت {new Date(page.updatedAt).toLocaleDateString('ar-EG')}</p></>}</div>
          {isMenuOpen && <div onClick={e => e.stopPropagation()} className="absolute left-3 top-12 z-10 flex overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"><button onClick={() => beginRename(page.id, page.title)} className="flex items-center gap-1.5 border-l border-stone-100 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"><Pencil size={14}/> غيّر الاسم</button><button onClick={() => deletePage(page.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={14}/> امسح</button></div>}
        </article>;
      })}</section>}
    </main>
  </div>;
};
