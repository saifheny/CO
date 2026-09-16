import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Check, FileText, LibraryBig, MoreHorizontal, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';
import { db } from '../db/db';
import { useStore } from '../store/useStore';

const PATTERNS = [{ id: 'color', label: 'سادة' }, { id: 'dots', label: 'نقط' }, { id: 'grid', label: 'مربعات' }, { id: 'lines', label: 'مسطّرة' }];
const PAGE_COLORS = ['#ffffff', '#f8fafc', '#fff7ed', '#fefce8', '#f0fdf4', '#eff6ff', '#f5f3ff', '#fdf2f8', '#1e1e2e'];
const APP_ICON = `${import.meta.env.BASE_URL}icon.svg`;

const NOTEBOOK_COVERS = [
  { id: 'coral', label: 'ورد هادي', note: 'للمهام اليومية', background: 'linear-gradient(145deg, #fca5a5 0%, #e5484d 48%, #991b1b 100%)', accent: '#fde68a', pattern: '✦' },
  { id: 'midnight', label: 'ليل ومجرّة', note: 'لأفكارك الكبيرة', background: 'radial-gradient(circle at 20% 18%, #7c3aed 0 2px, transparent 3px), radial-gradient(circle at 78% 35%, #a78bfa 0 1px, transparent 2px), linear-gradient(145deg, #1e1b4b, #312e81 55%, #111827)', accent: '#c4b5fd', pattern: '☾' },
  { id: 'ocean', label: 'موج أزرق', note: 'للدراسة والترتيب', background: 'linear-gradient(145deg, #67e8f9 0%, #0891b2 45%, #164e63 100%)', accent: '#ecfeff', pattern: '〰' },
  { id: 'sage', label: 'ورق وزيتون', note: 'للهدوء والتركيز', background: 'radial-gradient(circle at 80% 18%, #d9f99d 0 18%, transparent 19%), linear-gradient(145deg, #a3b18a, #588157 52%, #344e41)', accent: '#fef3c7', pattern: '❋' },
  { id: 'sand', label: 'رمل وذهب', note: 'للخطط والمشاريع', background: 'linear-gradient(145deg, #fde68a 0%, #d4a373 45%, #7f5539 100%)', accent: '#fff7ed', pattern: '◒' },
  { id: 'lilac', label: 'ليلكي ناعم', note: 'للأفكار والذكريات', background: 'linear-gradient(145deg, #ddd6fe 0%, #a78bfa 48%, #6d28d9 100%)', accent: '#f5f3ff', pattern: '✿' },
] as const;

const getCover = (id?: string) => NOTEBOOK_COVERS.find(cover => cover.id === id) || NOTEBOOK_COVERS[0];

const NotebookCover: React.FC<{ coverId?: string; title: string; compact?: boolean; selected?: boolean }> = ({ coverId, title, compact = false, selected = false }) => {
  const cover = getCover(coverId);
  return <div className={clsx('relative isolate aspect-[2/3] w-full overflow-hidden rounded-[18px] text-white transition duration-300 shadow-[inset_8px_0_18px_rgba(255,255,255,.16),inset_-10px_0_15px_rgba(0,0,0,.23),0_12px_22px_rgba(28,25,23,.2)]', selected && 'ring-4 ring-red-100')} style={{ background: cover.background }}>
    <div className="absolute inset-0 opacity-35 mix-blend-overlay" style={{ backgroundImage: 'repeating-linear-gradient(108deg, transparent 0 5px, rgba(255,255,255,.16) 6px, transparent 7px 13px)' }} />
    <div className="absolute inset-y-0 left-0 z-10 w-3 bg-black/20 shadow-[3px_0_6px_rgba(0,0,0,.28)]" />
    <div className="absolute inset-y-2 left-3.5 z-10 w-px bg-white/30" />
    <div className="absolute -right-1 top-3 h-[calc(100%-24px)] w-2 rounded-r-sm bg-[#fffdf5]/85 shadow-[-2px_0_3px_rgba(0,0,0,.15)]" />
    <span className="absolute left-6 top-5 text-2xl opacity-85 drop-shadow" style={{ color: cover.accent }}>{cover.pattern}</span>
    <span className="absolute right-4 top-5 rounded-full border border-white/30 bg-black/10 px-2 py-1 text-[8px] font-black tracking-[.16em] text-white/80">NOTEBOOK</span>
    <div className={clsx('absolute inset-x-4 bottom-5 rounded-[14px] border border-white/35 bg-black/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.2)] backdrop-blur-[2px]', compact && 'bottom-4 p-2.5')}>
      <span className="mb-1.5 block text-[8px] font-black tracking-[.18em] text-white/65">SMART NOTEBOOK</span>
      <h3 dir="auto" className={clsx('overflow-hidden font-black leading-[1.25] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]', compact ? 'text-[12px]' : 'text-base')}>{title || 'Untitled note'}</h3>
      {!compact && <p className="mt-2 text-[10px] font-bold text-white/70">{cover.note}</p>}
    </div>
    <span className="absolute -bottom-1 left-8 h-9 w-7 rounded-t-sm bg-[#fde68a] shadow-[0_-2px_0_rgba(255,255,255,.25)]" />
  </div>;
};

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
  const [newCover, setNewCover] = useState<string>('coral');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const pressTimer = useRef<number | null>(null);
  const preventOpen = useRef(false);

  const createPage = async () => {
    if (!newTitle.trim()) return;
    const id = uuidv4();
    await db.pages.add({ id, notebookId: 'default-notebook', title: newTitle.trim(), order: Date.now(), elements: [], background: { type: newPattern as any, value: newColor }, cover: newCover, createdAt: Date.now(), updatedAt: Date.now() });
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
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-20 sm:px-8">
      <section><p className="text-xs font-bold tracking-[.14em] text-[#d83d43]">نوتة جديدة</p><h1 className="mt-2 text-2xl font-bold">اختار غلاف دفترك، وبعدها ابدأ على طول.</h1><p className="mt-1 text-sm text-stone-500">مفيش معاينة منفصلة؛ الغلاف اللي تختاره هو اللي هتشوفه في رفّ نوتاتك.</p><label className="mt-8 block text-sm font-bold">اسم النوتة</label><input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPage()} placeholder="مثال: مراجعة الدرس التالت" className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#e5484d] focus:ring-4 focus:ring-red-50" />
        <div className="mt-8 border-t border-stone-200 pt-6"><div className="flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">غلاف الدفتر</h2><p className="mt-1 text-xs text-stone-400">اختار من الدفاتر الجاهزة قبل ما تنشئ الملاحظة.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-stone-500 shadow-sm"><BookOpen size={12}/> {getCover(newCover).label}</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{NOTEBOOK_COVERS.map(cover => <button key={cover.id} onClick={() => setNewCover(cover.id)} aria-label={`اختيار غلاف ${cover.label}`} className={clsx('relative rounded-[20px] text-right transition duration-200 hover:-translate-y-1', newCover === cover.id ? 'ring-2 ring-[#e5484d] ring-offset-2' : 'opacity-80 hover:opacity-100')}><NotebookCover coverId={cover.id} title="نوتتي" /><span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-[#e5484d] shadow">{newCover === cover.id ? <Check size={14}/> : <Sparkles size={12}/>}</span><span className="mt-2 block px-1 text-xs font-bold text-stone-700">{cover.label}</span></button>)}</div></div>
        <div className="mt-8 border-t border-stone-200 pt-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">لون الورقة</h2><p className="mt-1 text-xs text-stone-400">اللون هيفضل زي ما اخترته لحد ما تغيّره بنفسك.</p></div><span className="h-10 w-10 rounded-full border-4 border-white shadow ring-1 ring-stone-200" style={{ backgroundColor: newColor }} /></div><div className="mt-4 flex flex-wrap gap-3">{PAGE_COLORS.map((color, i) => <button key={color} onClick={() => setNewColor(color)} aria-label={`اختيار اللون ${color}`} className={clsx('flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform hover:scale-110', newColor === color ? 'scale-110 border-[#e5484d] ring-4 ring-red-100' : 'border-white shadow-sm ring-1 ring-stone-200')} style={{ backgroundColor: color }}>{newColor === color && <Check size={16} className={i === PAGE_COLORS.length - 1 ? 'text-white' : 'text-stone-700'} />}</button>)}<label className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-sm ring-1 ring-stone-200" style={{ background: 'conic-gradient(#f43f5e,#fbbf24,#22c55e,#06b6d4,#6366f1,#d946ef,#f43f5e)' }}><span className="rounded-full bg-white px-1 text-xs font-bold">+</span><input type="color" aria-label="لون مخصص" value={newColor} onChange={e => setNewColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0"/></label></div></div>
        <div className="mt-8 border-t border-stone-200 pt-6"><h2 className="text-sm font-bold">شكل الورقة</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{PATTERNS.map(pattern => <button key={pattern.id} onClick={() => setNewPattern(pattern.id)} className={clsx('overflow-hidden rounded-2xl border p-2 text-right transition', newPattern === pattern.id ? 'border-[#e5484d] ring-2 ring-red-100' : 'border-stone-200 hover:-translate-y-0.5 hover:shadow-md')}><span className="block h-20 rounded-xl border border-stone-200" style={previewStyle(pattern.id, newColor)} /><span className="mt-2 flex items-center justify-between text-xs font-bold">{pattern.label}{newPattern === pattern.id && <Check size={14} className="text-[#e5484d]"/>}</span></button>)}</div></div>
        <button onClick={createPage} disabled={!newTitle.trim()} className="mt-8 w-full rounded-2xl bg-[#e5484d] py-3.5 text-sm font-bold text-white transition hover:bg-[#ce3d43] disabled:bg-stone-200 disabled:text-stone-400">اعمِل النوتة وافتحها</button>
      </section>
    </main>
  </div>;

  return <div className="app-scroll h-screen overflow-y-auto overscroll-contain bg-[#f6f7f9] text-stone-900" dir="rtl" style={{ fontFamily: 'Cairo, Arial, sans-serif' }}>
    <header className="sticky top-0 z-20 bg-transparent px-4 py-3 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#e5484d] px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_18px_rgba(229,72,77,.22)] transition hover:-translate-y-0.5 hover:bg-[#ce3d43]"><Plus size={17}/> New notebook</button><div className="flex items-center gap-2.5"><div className="text-left"><p className="text-base font-extrabold tracking-tight">Smart Notebook</p><p className="text-[10px] font-bold tracking-wide text-stone-400">YOUR IDEA SHELF</p></div><img src={APP_ICON} alt="Smart Notebook" className="h-10 w-10"/></div></div></header>
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-3 sm:px-8"><section className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-[#d83d43]"><LibraryBig size={15}/><p className="text-[11px] font-black tracking-[.16em]">MY LIBRARY</p></div><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">دفاتري</h1><p className="mt-1 text-sm text-stone-500">Choose a cover, open it, and let the page grow with your ideas.</p></div><span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold text-stone-500 shadow-sm ring-1 ring-stone-200/70">{pages?.length || 0} notebooks</span></section>
      {!pages?.length ? <div className="mt-9 grid min-h-[320px] place-items-center rounded-[28px] border border-dashed border-stone-300 bg-white/70 p-8 text-center"><div><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#e5484d]"><FileText size={26}/></div><h2 className="mt-4 text-lg font-bold">أول دفتر لسه مستنيك</h2><p className="mt-1 text-sm text-stone-500">Pick a cover and start your first page.</p><button onClick={() => setCreating(true)} className="mt-5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-700">Create notebook</button></div></div> : <section className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 min-[480px]:grid-cols-3 sm:grid-cols-4 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-5 xl:grid-cols-6">{pages.map(page => {
        const isMenuOpen = menuId === page.id; const isRenaming = renamingId === page.id;
        return <article key={page.id} onPointerDown={() => startPress(page.id)} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress} onClick={() => openPage(page.id)} className="group relative cursor-pointer transition duration-300 hover:-translate-y-2 hover:scale-[1.02]"><NotebookCover coverId={page.cover} title={page.title} compact/><button onClick={e => { e.stopPropagation(); setMenuId(isMenuOpen ? null : page.id); }} aria-label="خيارات الملاحظة" className="absolute left-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/88 text-stone-600 shadow-sm opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal size={15}/></button>
          {isRenaming && <div onClick={event => event.stopPropagation()} className="absolute inset-2 z-20 grid place-items-center rounded-2xl bg-stone-950/75 p-2 backdrop-blur-sm"><div className="flex w-full gap-1"><input autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} onKeyDown={event => event.key === 'Enter' && saveRename(page.id)} className="min-w-0 flex-1 rounded-lg border border-white/25 bg-white px-2 py-1.5 text-xs text-stone-800 outline-none"/><button onClick={() => saveRename(page.id)} className="rounded-lg bg-[#e5484d] px-2 text-white"><Check size={14}/></button></div></div>}
          {isMenuOpen && <div onClick={event => event.stopPropagation()} className="absolute left-2 top-10 z-30 flex overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"><button onClick={() => beginRename(page.id, page.title)} className="flex items-center gap-1 border-l border-stone-100 px-2.5 py-2 text-[10px] font-bold text-stone-700 hover:bg-stone-50"><Pencil size={13}/> Rename</button><button onClick={() => deletePage(page.id)} className="flex items-center gap-1 px-2.5 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50"><Trash2 size={13}/> Delete</button></div>}
        </article>;
      })}</section>}
    </main>
  </div>;
};
