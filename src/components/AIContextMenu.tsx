import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { ai } from '../lib/ai';
import { Sparkles, X, Wand2, MessageSquare, ArrowUpToLine, ArrowDownToLine, RefreshCw, Edit3, Eraser, AlignCenter, AlignRight, AlignLeft, SlidersHorizontal, Play, Pause, Volume2, VolumeX, Copy, LockKeyhole, Trash2, Layers3 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from '../types';
import clsx from 'clsx';

const FRAME_COLORS = ['#18181b', '#e5484d', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#d4a574', '#ffffff'];
const IMAGE_FRAMES = [
  ['solid', 'كلاسيك'], ['dashed', 'متقطّع'], ['double', 'دبل'], ['polaroid', 'بولارويد'], ['neon', 'نيون'], ['film', 'فيلم'], ['cinema', 'سينما'], ['tape', 'تيب'], ['shadow', 'ظل'],
] as const;
const VIDEO_FRAMES = [
  ['cinema', 'سينما'], ['film', 'فيلم'], ['neon', 'نيون'], ['tape', 'تيب'], ['shadow', 'ظل'], ['solid', 'كلاسيك'], ['double', 'دبل'], ['dashed', 'متقطّع'], ['polaroid', 'بولارويد'],
] as const;

export const AIContextMenu: React.FC = () => {
  const { selectedElements, activePageId, setSelectedElements, setEditingTextId } = useStore();
  const page = useLiveQuery(() => activePageId ? db.pages.get(activePageId) : undefined, [activePageId]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [removalProgress, setRemovalProgress] = useState<number | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [showFrameStyles, setShowFrameStyles] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ offsetX: number; offsetY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const selected = page?.elements.find(el => el.id === selectedElements[0]);
    if (selected?.type === 'video') setPanelOpen(true);
  }, [page, selectedElements]);

  if (!selectedElements.length || !page) return null;
  const node = page.elements.find(el => el.id === selectedElements[0]);
  if (!node) return null;

  const updateEl = async (updates: any) => {
    const newEls = page.elements.map(el => el.id === node.id ? { ...el, ...updates } : el);
    await db.pages.update(page.id, { elements: newEls, updatedAt: Date.now() });
  };

  if (node.isLocked) return <div className="fixed bottom-4 left-4 z-[60]" dir="rtl" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}><button onClick={() => updateEl({ isLocked: false })} className="flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-xs font-bold text-white shadow-xl transition hover:bg-stone-700"><LockKeyhole size={16}/> العنصر مقفول — دوس لفك القفل</button></div>;

  const moveLayer = async (dir: 'up' | 'down') => {
    const arr = [...page.elements];
    const idx = arr.findIndex(e => e.id === node.id);
    if (dir === 'up' && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    else if (dir === 'down' && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
    await db.pages.update(page.id, { elements: arr, updatedAt: Date.now() });
  };

  const duplicate = async () => {
    const copy = { ...node, id: uuidv4(), x: node.x + 28, y: node.y + 28, isLocked: false } as CanvasElement;
    await db.pages.update(page.id, { elements: [...page.elements, copy], updatedAt: Date.now() });
    setSelectedElements([copy.id]);
  };

  const removeNode = async () => {
    await db.pages.update(page.id, { elements: page.elements.filter(element => element.id !== node.id), updatedAt: Date.now() });
    setSelectedElements([]);
  };

  const editNode = () => {
    if (node.type === 'text' || node.type === 'comment') setEditingTextId(node.id);
    else setPanelOpen(true);
  };

  const removeBackground = async () => {
    if (node.type !== 'image') return;
    setLoading(true); setResult(null); setRemovalProgress(0);
    try {
      // A segmentation model, not colour guessing: keeps the subject and writes a transparent PNG.
      // The package re-exports the processor as a named function from its versioned API.
      const { removeBackground: remove } = await import('@imgly/background-removal');
      const output = await remove(node.src, {
        model: 'isnet', device: 'cpu',
        output: { format: 'image/png', quality: 1 },
        progress: (_key: string, current: number, total: number) => { if (total) setRemovalProgress(Math.round((current / total) * 100)); },
      });
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(output);
      });
      await updateEl({ src, backgroundRemoved: true });
      setResult('الخلفية اتشالت والصورة اتحفظت بخلفية شفافة.');
    } catch { setResult('المعالجة مشتغلتش دلوقتي. اتأكد إنك متصل بالنت أول مرة وبعدها جرّب تاني.'); }
    finally { setLoading(false); setRemovalProgress(null); }
  };

  const handleAI = async (action: string) => {
    if (node.type !== 'text') return;
    setLoading(true); setResult(null);
    try {
      let res = '';
      if (action === 'summarize') res = await ai.summarize((node as any).text);
      if (action === 'explain') res = await ai.explain((node as any).text);
      if (action === 'enhance') { res = await ai.enhanceHandwriting((node as any).text); await updateEl({ text: res }); setResult('✨ تم!'); setLoading(false); return; }
      setResult(res);
    } catch { setResult('⚠️ حصلت مشكلة'); } finally { setLoading(false); }
  };

  const handleStylize = async () => {
    setLoading(true);
    setTimeout(async () => {
      const fonts = ['Amiri', 'Cairo', 'Tajawal'];
      const t: CanvasElement = { id: uuidv4(), type: 'text', text: 'نص محسن', fontFamily: fonts[Math.floor(Math.random() * fonts.length)], fontSize: 32, color: (node as any).color || '#000', align: 'center', x: node.x, y: node.y, width: 300 };
      const newEls = page.elements.filter(el => el.id !== node.id); newEls.push(t);
      await db.pages.update(page.id, { elements: newEls, updatedAt: Date.now() });
      setSelectedElements([t.id]); setLoading(false);
    }, 500);
  };

  const B = ({ children, active, onClick, cls = '' }: any) => (
    <button onClick={onClick} className={clsx("px-2 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap", active ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200', cls)}>{children}</button>
  );

  const renderMediaFrameControls = (kind: 'صورة' | 'فيديو') => {
    const media = node as any;
    const borderWidth = Number(media.borderWidth || 0);
    const borderColor = media.borderColor || '#18181b';
    const borderStyle = media.borderStyle || (kind === 'فيديو' ? 'cinema' : 'solid');
    const frames = kind === 'فيديو' ? VIDEO_FRAMES : IMAGE_FRAMES;
    return <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2"><label className="text-[10px] text-gray-500 font-bold">إطار الـ{kind}</label><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-stone-500">{borderWidth ? `${borderWidth}px` : 'من غير إطار'}</span></div>
      <div className="flex flex-wrap gap-1.5">
        <B active={borderWidth === 0} onClick={() => updateEl({ borderWidth: 0 })}>من غير</B>
        <B active={borderWidth === 2} onClick={() => updateEl({ borderWidth: 2 })}>رفيع</B>
        <B active={borderWidth === 5} onClick={() => updateEl({ borderWidth: 5 })}>متوسط</B>
        <B active={borderWidth === 9} onClick={() => updateEl({ borderWidth: 9 })}>تخين</B>
      </div>
      <input aria-label="سمك الإطار" type="range" min="0" max="16" value={borderWidth} onChange={event => updateEl({ borderWidth: Number(event.target.value) })} className="w-full accent-red-500" />
      <div>
        <label className="mb-1.5 block text-[10px] font-bold text-gray-400">لون الإطار</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {FRAME_COLORS.map(color => <button key={color} onClick={() => updateEl({ borderColor: color })} aria-label={`لون ${color}`} className={clsx('h-6 w-6 rounded-full border-2 shadow-sm transition-transform', borderColor === color ? 'scale-110 border-stone-500' : 'border-white hover:scale-105')} style={{ backgroundColor: color }} />)}
          <label className="relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-stone-300" title="اختار أي لون">
            <span className="h-full w-full" style={{ background: 'conic-gradient(#e5484d,#facc15,#22c55e,#3b82f6,#a855f7,#e5484d)' }} />
            <input aria-label="لون مخصص للإطار" type="color" value={borderColor} onChange={event => updateEl({ borderColor: event.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      </div>
      <div>
        <button onClick={() => setShowFrameStyles(value => !value)} className="text-[11px] font-bold text-red-600 hover:text-red-700">{showFrameStyles ? 'خبّي أشكال الإطار' : '✦ اختار شكل للإطار'}</button>
        {showFrameStyles && <div className="mt-2 grid grid-cols-3 gap-1.5 animate-in">
          {frames.map(([style, label]) => <button key={style} onClick={() => updateEl({ borderStyle: style })} className={clsx('rounded-xl border px-1.5 py-2 text-[10px] font-bold transition-colors', borderStyle === style ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400')}>
            <span className={clsx('mb-1 block h-5 rounded-md', style === 'dashed' && 'border-2 border-dashed', style === 'double' && 'border-double border-4', style === 'polaroid' && 'bg-white shadow-md ring-1 ring-gray-200', style === 'neon' && 'border-2 shadow-[0_0_7px_currentColor]', style === 'film' && 'border-y-4 border-black bg-stone-800', style === 'cinema' && 'border-y-4 border-black bg-stone-950', style === 'tape' && 'bg-amber-100 before:content-[\'\']', style === 'shadow' && 'border shadow-md', style === 'solid' && 'border-2')} style={{ borderColor: borderColor, color: borderColor }} />{label}
          </button>)}
        </div>}
      </div>
      <p className="text-[10px] leading-4 text-stone-400">اللون والسُمك وشكل الإطار مستقلين: تغيير واحد فيهم مش هيبدّل التاني.</p>
    </div>;
  };

  const startPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select')) return;
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const box = panel.getBoundingClientRect();
    drag.current = { offsetX: event.clientX - box.left, offsetY: event.clientY - box.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePanel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current.moved = true;
    const panelWidth = event.currentTarget.parentElement?.getBoundingClientRect().width || 320;
    const x = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, event.clientX - drag.current.offsetX));
    const y = Math.max(8, Math.min(window.innerHeight - 88, event.clientY - drag.current.offsetY));
    setPanelPosition({ x, y });
  };
  const endPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  return (
    <div className="fixed left-3 right-3 bottom-3 z-[60] sm:left-4 sm:right-auto sm:bottom-auto sm:top-20" style={{ fontFamily: 'Cairo, system-ui, sans-serif', ...(panelPosition ? { left: panelPosition.x, top: panelPosition.y, right: 'auto', bottom: 'auto', width: 'min(320px, calc(100vw - 16px))' } : {}) }} dir="rtl">
      <div className="mb-2 flex w-full items-stretch overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg sm:w-[320px]" aria-label="خمس أدوات للعنصر المختار">
        <button onClick={duplicate} title="انسخ العنصر" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 border-l border-stone-100 px-1 py-2 text-[10px] font-bold text-stone-600 hover:bg-stone-50"><Copy size={15}/>نسخ</button>
        <button onClick={() => updateEl({ isLocked: true })} title="اقفل العنصر" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 border-l border-stone-100 px-1 py-2 text-[10px] font-bold text-stone-600 hover:bg-stone-50"><LockKeyhole size={15}/>قفل</button>
        <button onClick={editNode} title="عدّل العنصر" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 border-l border-stone-100 px-1 py-2 text-[10px] font-bold text-stone-600 hover:bg-stone-50"><Edit3 size={15}/>تعديل</button>
        <button onClick={() => moveLayer('up')} title="حطه قدّام" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 border-l border-stone-100 px-1 py-2 text-[10px] font-bold text-stone-600 hover:bg-stone-50"><Layers3 size={15}/>ترتيب</button>
        <button onClick={removeNode} title="امسح العنصر" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50"><Trash2 size={15}/>حذف</button>
      </div>
      {!panelOpen ? <button onClick={() => setPanelOpen(true)} aria-label="افتح أدوات الحاجة اللي اخترتها" className="mr-auto flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-md hover:bg-stone-50"><SlidersHorizontal size={17}/></button> : <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 w-full sm:w-[320px] max-h-[62vh] overflow-y-auto">
        
        {/* Header */}
        <div onPointerDown={startPanelDrag} onPointerMove={movePanel} onPointerUp={endPanelDrag} onPointerCancel={endPanelDrag} className="flex cursor-grab touch-none items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2 active:cursor-grabbing" title="اسحب من هنا وحط الأدوات في أي مكان">
          <div className="flex items-center gap-1">
            <B onClick={() => moveLayer('up')}><ArrowUpToLine size={11} className="inline ml-0.5" />قدّام</B>
            <B onClick={() => moveLayer('down')}><ArrowDownToLine size={11} className="inline ml-0.5" />ورا</B>
          </div>
          <span className="text-[10px] text-gray-400 font-semibold">
            {node.type === 'image' ? '🖼️ صورة' : node.type === 'video' ? '🎬 فيديو' : node.type === 'audio' ? '🔊 صوت' : node.type === 'comment' ? '💬 تعليق' : node.type === 'text' ? '📝 نص' : node.type === 'stroke' ? '✏️ خط' : '🔷 شكل'}
          </span>
          <div className="flex gap-1"><button onClick={() => setPanelOpen(false)} title="صغّر الأدوات" className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"><SlidersHorizontal size={13} /></button><button onClick={() => { setPanelOpen(false); setSelectedElements([]); }} title="اقفل الأدوات" className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"><X size={14} /></button></div>
        </div>

        <div className="p-3 space-y-3">

          {/* ─── IMAGE CONTROLS ─── */}
          {node.type === 'image' && (<>
            <div className="rounded-xl bg-red-50 border border-red-100 p-2.5">
              <p className="text-[10px] leading-4 text-red-700 mb-2">شيل الخلفية بذكاء جوه المتصفح. أول مرة النموذج بيتحمّل وممكن ياخد شوية وقت.</p>
              <B onClick={removeBackground} cls="bg-white text-red-600 hover:bg-red-100 border border-red-100 w-full text-center">
                {loading ? <RefreshCw size={11} className="inline animate-spin ml-1" /> : <Eraser size={11} className="inline ml-1" />}شيل الخلفية
              </B>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">شكل الصورة</label>
              <div className="flex gap-1.5">
                <B active={!['circle','rounded'].includes((node as any).cropShape)} onClick={() => updateEl({ cropShape: 'rectangle' })}>⬜ مربع</B>
                <B active={(node as any).cropShape === 'rounded'} onClick={() => updateEl({ cropShape: 'rounded' })}>⬜ حواف مدوّرة</B>
                <B active={(node as any).cropShape === 'circle'} onClick={() => updateEl({ cropShape: 'circle' })}>⭕ دائرة</B>
              </div>
            </div>
            {renderMediaFrameControls('صورة')}
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">الكومنت</label>
              {!showCaption ? (
                <B onClick={() => { setShowCaption(true); setCaptionInput((node as any).caption || ''); }}>
                  <MessageSquare size={11} className="inline ml-0.5" />{(node as any).caption ? 'عدّل الكومنت' : 'حط كومنت'}
                </B>
              ) : (
                <div className="flex gap-1">
                  <input type="text" value={captionInput} onChange={e => setCaptionInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter'){updateEl({caption:captionInput.trim()});setShowCaption(false);} }}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-red-300" placeholder="اكتب كومنت..." autoFocus />
                  <button onClick={() => { updateEl({caption:captionInput.trim()}); setShowCaption(false); }} className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">✓</button>
                </div>
              )}
              {(node as any).caption && <div className="mt-2 rounded-lg bg-stone-50 px-2 py-1.5 text-[10px] leading-4 text-stone-500">
                امسك فقاعة الكومنت واسحبها في المكان اللي تحبه جوه النوتة، أو اختار مكان سريع:
                <div className="mt-1.5 flex flex-wrap gap-1"><B onClick={() => updateEl({ captionX: 0, captionY: -55 })}>فوق شمال</B><B onClick={() => updateEl({ captionX: Math.max(0, (node as any).width - Math.min(230, (node as any).width)), captionY: -55 })}>فوق يمين</B><B onClick={() => updateEl({ captionX: Math.max(0, (node as any).width - Math.min(230, (node as any).width)), captionY: (node as any).height + 14 })}>تحت يمين</B></div>
              </div>}
            </div>
          </>)}

          {node.type === 'video' && <>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-2.5"><p className="text-[10px] leading-4 text-violet-700">فيديو داخل الملاحظة: شغّل أو أوقفه، وتحكم في الصوت، ثم حرّكه أو كبّره كأي عنصر.</p>
              <div className="mt-2 flex gap-1.5"><B onClick={() => updateEl({ playing: !(node as any).playing })} cls="bg-white text-violet-700 border border-violet-100">{(node as any).playing ? <Pause size={12} className="inline ml-1"/> : <Play size={12} className="inline ml-1"/>}{(node as any).playing ? 'إيقاف' : 'تشغيل'}</B><B onClick={() => updateEl({ muted: !(node as any).muted })} cls="bg-white text-violet-700 border border-violet-100">{(node as any).muted ? <VolumeX size={12} className="inline ml-1"/> : <Volume2 size={12} className="inline ml-1"/>}{(node as any).muted ? 'كتم' : 'صوت'}</B></div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">شكل الفيديو</label>
              <div className="flex gap-1.5"><B active={!['circle', 'rounded'].includes((node as any).cropShape)} onClick={() => updateEl({ cropShape: 'rectangle' })}>⬜ مربع</B><B active={(node as any).cropShape === 'rounded'} onClick={() => updateEl({ cropShape: 'rounded' })}>⬜ مدوّر</B><B active={(node as any).cropShape === 'circle'} onClick={() => updateEl({ cropShape: 'circle' })}>⭕ دائرة</B></div>
            </div>
            {renderMediaFrameControls('فيديو')}
          </>}

          {node.type === 'audio' && <div className="rounded-xl border border-sky-100 bg-sky-50 p-2.5"><p className="text-[10px] leading-4 text-sky-700">الصوت عنصر كامل في الصفحة: حرّكه، كبّره، انسخه أو اقفله بنفس أدوات أي عنصر تاني.</p><div className="mt-2 flex gap-1.5"><B onClick={() => updateEl({ playing: !(node as any).playing })} cls="bg-white text-sky-700 border border-sky-100">{(node as any).playing ? <Pause size={12} className="inline ml-1"/> : <Play size={12} className="inline ml-1"/>}{(node as any).playing ? 'إيقاف' : 'تشغيل'}</B><B onClick={() => updateEl({ title: `${(node as any).title || 'تسجيل صوتي'} ✦` })} cls="bg-white text-sky-700 border border-sky-100"><Edit3 size={12} className="inline ml-1"/>اسم جديد</B></div></div>}

          {/* ─── TEXT CONTROLS ─── */}
          {node.type === 'text' && (<>
            <div className="flex gap-1.5">
              <B onClick={() => setEditingTextId(node.id)} cls="bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit3 size={11} className="inline ml-0.5" />تعديل النص</B>
              <B onClick={() => handleAI('summarize')} cls="bg-red-50 text-red-600 hover:bg-red-100"><Sparkles size={11} className="inline ml-0.5" />تلخيص</B>
              <B onClick={() => handleAI('explain')} cls="bg-orange-50 text-orange-600 hover:bg-orange-100">شرح</B>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">الخط والحجم</label>
              <div className="flex gap-1.5">
                <select value={(node as any).fontFamily} onChange={e => updateEl({ fontFamily: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold outline-none">
                  {['Cairo','Tajawal','Almarai','Amiri','Reem Kufi','Noto Naskh Arabic','Noto Kufi Arabic','Changa','El Messiri','IBM Plex Sans Arabic','Marhey','Lalezar','Poppins','DM Sans','Montserrat','Nunito','Playfair Display','Arial'].map(font => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
                </select>
                <input aria-label="حجم النص" type="number" min="10" max="200" value={(node as any).fontSize} onChange={e => updateEl({ fontSize: Math.max(10, Number(e.target.value)) })} className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-xs outline-none" />
              </div>
              <div className="mt-2 flex gap-1.5">
                {['#18181b','#dc2626','#2563eb','#16a34a','#7c3aed','#ea580c'].map(color => <button key={color} onClick={() => updateEl({ color })} aria-label={`لون ${color}`} className={clsx('h-6 w-6 rounded-full border-2', (node as any).color === color ? 'border-stone-400 scale-110' : 'border-transparent')} style={{ backgroundColor: color }} />)}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">محاذاة النص</label>
              <div className="flex gap-1.5">
                <B active={(node as any).align === 'right'} onClick={() => updateEl({ align: 'right' })}><AlignRight size={13} /></B>
                <B active={!((node as any).align) || (node as any).align === 'center'} onClick={() => updateEl({ align: 'center' })}><AlignCenter size={13} /></B>
                <B active={(node as any).align === 'left'} onClick={() => updateEl({ align: 'left' })}><AlignLeft size={13} /></B>
              </div>
            </div>
          </>)}

          {node.type === 'comment' && <><div className="rounded-xl border border-violet-100 bg-violet-50 p-2.5"><p className="text-[10px] leading-4 text-violet-700">الفقاعة حجمها بيتظبّط تلقائيًا على طول الكلام وحجم الخط. دوس تعديل واكتب فوق الفقاعة نفسها.</p></div><div><label className="text-[10px] text-gray-400 font-bold block mb-1.5">شكل التعليق</label><div className="flex flex-wrap gap-1.5">{([['speech','فقاعة'],['note','ملصق'],['cloud','سحابة'],['label','عنوان'],['thought','فكرة']] as const).map(([style, label]) => <B key={style} active={(node as any).style === style} onClick={() => updateEl({ style })}>{label}</B>)}</div></div><div><label className="text-[10px] text-gray-400 font-bold block mb-1.5">لون الفقاعة</label><div className="flex gap-1.5">{['#292524','#dc2626','#2563eb','#16a34a','#7c3aed','#ea580c'].map(fill => <button key={fill} onClick={() => updateEl({ fill })} className={clsx('h-6 w-6 rounded-full border-2', (node as any).fill === fill ? 'scale-110 border-stone-400' : 'border-transparent')} style={{ backgroundColor: fill }} />)}</div></div></>}

          {/* ─── STROKE CONTROLS ─── */}
          {node.type === 'stroke' && (<>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">تعديل اللون</label>
              <div className="flex gap-1">
                {['#000','#dc2626','#2563eb','#16a34a','#7c3aed','#ea580c'].map(c => (
                  <button key={c} onClick={() => updateEl({ color: c })}
                    className={clsx("w-6 h-6 rounded-full border-2 transition-transform", (node as any).color === c ? "border-gray-400 scale-110" : "border-transparent hover:scale-110")}
                    style={{backgroundColor: c}} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">أسلوب القلم والسُمك</label>
              <div className="flex flex-wrap gap-1.5">
                {([['pen','حبر'],['pencil','رصاص'],['brush','فرشاة'],['calligraphy','خطاط'],['highlighter','تظليل']] as const).map(([tool, label]) => <B key={tool} active={(node as any).tool === tool} onClick={() => updateEl({ tool })}>{label}</B>)}
              </div>
              <input aria-label="سمك الخط" type="range" min="1" max="60" value={(node as any).width} onChange={e => updateEl({ width: Number(e.target.value) })} className="mt-2 w-full accent-red-500" />
            </div>
            <div className="flex gap-1.5">
              <B onClick={handleStylize} cls="bg-red-50 text-red-600 hover:bg-red-100 flex-1 text-center">
                {loading ? <RefreshCw size={11} className="inline animate-spin ml-0.5" /> : <Wand2 size={11} className="inline ml-0.5" />}تحويل لنص
              </B>
            </div>
          </>)}

          {/* ─── SHAPE CONTROLS ─── */}
          {node.type === 'shape' && <>
            <div><label className="text-[10px] text-gray-400 font-bold block mb-1.5">نوع الشكل والتعبئة</label><div className="flex flex-wrap gap-1.5">{([['rectangle','مربع'],['circle','دائرة'],['triangle','مثلث'],['line','خط'],['arrow','سهم']] as const).map(([shapeType, label]) => <B key={shapeType} active={(node as any).shapeType === shapeType} onClick={() => updateEl({ shapeType, fill: ['line','arrow'].includes(shapeType) ? undefined : (node as any).fill || '#2563eb' })}>{label}</B>)}<B active={(node as any).fill === 'transparent'} onClick={() => updateEl({ fill: 'transparent', stroke: (node as any).stroke || '#18181b', strokeWidth: Math.max(2, (node as any).strokeWidth || 3) })}>مفرغ</B></div></div>
            <div><label className="text-[10px] text-gray-400 font-bold block mb-1.5">لون التعبئة أو الإطار</label><div className="flex gap-1">{['#18181b','#dc2626','#2563eb','#16a34a','#7c3aed','#ea580c','#f59e0b'].map(c => <button key={c} onClick={() => updateEl({ fill: ['line','arrow'].includes((node as any).shapeType) ? undefined : c, stroke: c })} className={clsx('h-6 w-6 rounded-full border-2 transition-transform', ((node as any).stroke === c || (node as any).fill === c) ? 'scale-110 border-stone-400' : 'border-transparent hover:scale-110')} style={{ backgroundColor: c }} />)}</div></div>
            <div><label className="text-[10px] text-gray-400 font-bold block mb-1.5">سمك الإطار: {(node as any).strokeWidth || 0}</label><input aria-label="سمك إطار الشكل" type="range" min="0" max="30" value={(node as any).strokeWidth || 0} onChange={e => updateEl({ strokeWidth: Number(e.target.value) })} className="w-full accent-red-500" /></div>
          </>}

          {loading && <p className="text-[11px] text-gray-400 animate-pulse text-center">⏳ جاري المعالجة... {removalProgress !== null ? `${removalProgress}%` : ''}</p>}
          {result && (
            <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-700 relative">
              <button onClick={() => setResult(null)} className="absolute top-1 left-1 text-gray-400 hover:text-red-500"><X size={11} /></button>
              <p className="pl-4 whitespace-pre-wrap">{result}</p>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
};
