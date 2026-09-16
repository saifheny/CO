import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Pen, Pencil, Paintbrush, Highlighter, Eraser, MousePointer2, Type, Image as ImageIcon, Shapes,
  Undo, Redo, Home, LassoSelect, Hand, MoreHorizontal, Play, Minus, Plus, RotateCcw, Video, MessageCircle, Mic, SmilePlus
} from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import { StickerLibrary } from './StickerLibrary';

const COLORS = ['#000000','#374151','#dc2626','#ea580c','#ca8a04','#16a34a','#2563eb','#7c3aed','#db2777'];
const FONTS = [
  { name: 'Cairo', label: 'القاهرة' }, { name: 'Tajawal', label: 'تجوال' }, { name: 'Almarai', label: 'المراعي' },
  { name: 'Amiri', label: 'أميري' }, { name: 'Reem Kufi', label: 'ريم كوفي' }, { name: 'Noto Naskh Arabic', label: 'نسخ عربي' }, { name: 'Noto Kufi Arabic', label: 'كوفى عربي' },
  { name: 'Changa', label: 'تشانجا' }, { name: 'El Messiri', label: 'المسيري' }, { name: 'IBM Plex Sans Arabic', label: 'IBM عربي' }, { name: 'Marhey', label: 'مرحي' }, { name: 'Lalezar', label: 'لاله زار' },
  { name: 'Poppins', label: 'Poppins' }, { name: 'DM Sans', label: 'DM Sans' }, { name: 'Montserrat', label: 'Montserrat' }, { name: 'Nunito', label: 'Nunito' }, { name: 'Playfair Display', label: 'Playfair' }, { name: 'Arial', label: 'Arial' },
];
const SHAPES_LIST = [
  { id: 'rectangle', label: 'مستطيل', icon: '▭' },
  { id: 'circle', label: 'دائرة', icon: '○' },
  { id: 'ellipse', label: 'بيضاوي', icon: '⬭' },
  { id: 'triangle', label: 'مثلث', icon: '△' },
  { id: 'line', label: 'خط', icon: '─' },
  { id: 'arrow', label: 'سهم', icon: '→' },
  { id: 'diamond', label: 'ماسة', icon: '◇' },
  { id: 'star', label: 'نجمة', icon: '★' },
  { id: 'heart', label: 'قلب', icon: '♥' },
  { id: 'sticky', label: 'ملصق', icon: '▣' },
  { id: 'speech', label: 'فقاعة', icon: '◒' },
];

const COMMENT_STYLES = [
  { id: 'speech', label: 'فقاعة', icon: '◒' }, { id: 'note', label: 'ملصق', icon: '▣' }, { id: 'cloud', label: 'سحابة', icon: '☁' }, { id: 'label', label: 'عنوان', icon: '▰' }, { id: 'thought', label: 'فكرة', icon: '◌' },
] as const;

export function Toolbar() {
  const { currentTool, setTool, penColor, setPenColor, penWidth, setPenWidth, setView, activePageId, activeFont, setActiveFont, activeCommentStyle, setActiveCommentStyle, activeShape, setActiveShape, setIsPresenting } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [shapeWheelOpen, setShapeWheelOpen] = useState(false);
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);

  const handleUndo = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
  const handleRedo = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }));
  const zoom = (amount: number) => window.dispatchEvent(new CustomEvent('canvas-zoom', { detail: amount }));
  const resetZoom = () => window.dispatchEvent(new CustomEvent('canvas-reset'));

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePageId) return;
    // Keep a portable data URL: object URLs break after reload and make inserted images appear missing.
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const img = new Image();
    img.onload = async () => {
      const page = await db.pages.get(activePageId);
      if (!page) return;
      const w = Math.min(img.width, 500);
      const h = (w / img.width) * img.height;
      await db.pages.update(activePageId, { elements: [...page.elements, { id: uuidv4(), type: 'image', x: 200, y: 200, width: w, height: h, src, cropShape: 'rectangle' }] });
    };
    img.src = src;
    setTool('select');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePageId) return;
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file);
    });
    const video = document.createElement('video');
    video.preload = 'metadata'; video.src = src;
    video.onloadedmetadata = async () => {
      const page = await db.pages.get(activePageId); if (!page) return;
      const width = Math.min(video.videoWidth || 480, 560);
      const height = Math.max(120, width / (video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9));
      await db.pages.update(activePageId, { elements: [...page.elements, { id: uuidv4(), type: 'video', x: 180, y: 180, width, height, src, muted: false, playing: false }] as any, updatedAt: Date.now() });
      setTool('select');
    };
    if (videoRef.current) videoRef.current.value = '';
  };

  const handleAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePageId) return;
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file);
    });
    const page = await db.pages.get(activePageId);
    if (!page) return;
    await db.pages.update(activePageId, { elements: [...page.elements, { id: uuidv4(), type: 'audio', x: 190, y: 210, width: 310, height: 74, src, title: file.name.replace(/\.[^/.]+$/, ''), playing: false }] as any, updatedAt: Date.now() });
    setTool('select');
    if (audioRef.current) audioRef.current.value = '';
  };

  const isPenLike = ['pen','pencil','brush','calligraphy','highlighter'].includes(currentTool);
  const hasOptions = isPenLike || currentTool === 'text' || currentTool === 'shape' || currentTool === 'comment';

  const Tool = ({ id, icon: Icon, tip }: { id: string; icon: any; tip: string }) => {
    const active = currentTool === id;
    return (
      <div className="relative group/tool">
        <button onClick={() => setTool(id as any)} aria-label={tip}
          className={clsx(
          "toolbar-action w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150",
          active ? "bg-[#e5484d] text-white" : "text-gray-500 hover:text-gray-800 hover:bg-stone-100"
        )}>
        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </button>
        <span className="pointer-events-none absolute top-[calc(100%+9px)] right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover/tool:opacity-100 group-focus-within/tool:opacity-100">{tip}</span>
      </div>
    );
  };

  return (
    <>
      {/* ── Main Floating Toolbar ── */}
      <div className="toolbar-shell fixed top-3 left-1/2 -translate-x-1/2 z-50 flex max-w-[calc(100vw-12px)] flex-col items-center gap-2" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
        {collapsed ? <button onClick={() => setCollapsed(false)} aria-label="ورّي الأدوات" className="toolbar-action flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 shadow-lg hover:bg-stone-50"><MoreHorizontal size={20} /></button> : <>
        {/* Desktop hugs the tools; mobile/tablet keeps one row and scrolls sideways without a visible rail. */}
        <div className="app-horizontal-scroll flex w-max max-w-[calc(100vw-12px)] flex-nowrap items-center gap-0.5 overflow-x-auto rounded-[18px] border border-stone-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur-xl">
          
          {/* Home */}
          <button onClick={() => setView('home')} title="نوتاتك"
            className="w-9 h-9 flex shrink-0 items-center justify-center rounded-xl text-gray-400 hover:text-[#e5484d] hover:bg-red-50 transition-all">
            <Home size={18} />
          </button>
          <button onClick={() => setIsPresenting(true)} title="شغّل العرض" aria-label="شغّل العرض"
            className="w-9 h-9 flex shrink-0 items-center justify-center rounded-xl text-[#e5484d] bg-red-50 hover:bg-red-100 transition-all">
            <Play size={17} fill="currentColor" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Selection Group */}
          <Tool id="pan" icon={Hand} tip="حرّك الورقة" />
          <Tool id="select" icon={MousePointer2} tip="اختار" />

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Drawing Group */}
          <Tool id="pen" icon={Pen} tip="قلم حبر" />
          <Tool id="pencil" icon={Pencil} tip="قلم رصاص" />
          <Tool id="brush" icon={Paintbrush} tip="فرشة" />
          <Tool id="highlighter" icon={Highlighter} tip="قلم تظليل" />
          <Tool id="eraser" icon={Eraser} tip="استيكة" />
          <Tool id="lasso" icon={LassoSelect} tip="اختار بحرية" />

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Insert Group */}
          <Tool id="text" icon={Type} tip="اكتب" />
          <Tool id="comment" icon={MessageCircle} tip="تعليق منفصل" />

          <div className="relative">
            <button onClick={() => setImageLibraryOpen(true)} title="صور وملصقات من الإنترنت" aria-label="صور وملصقات من الإنترنت" className={clsx('w-9 h-9 flex items-center justify-center rounded-xl transition-all', imageLibraryOpen ? 'bg-[#e5484d] text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-stone-100')}><SmilePlus size={18}/></button>
          </div>
          
          {/* Shapes live in a compact circular picker so the main bar stays uncluttered. */}
          <div className="relative">
            <button onClick={() => { setTool('shape'); setShapeWheelOpen(open => !open); }} title="اختار شكل"
              className={clsx("w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 gap-0",
                currentTool === 'shape' ? "bg-[#e5484d] text-white" : "text-gray-500 hover:text-gray-800 hover:bg-stone-100")}>
              <Shapes size={16} />
              <MoreHorizontal size={10} className="ml-[-2px]" />
            </button>
          </div>

          <div className="relative group/tool">
            <button onClick={() => fileRef.current?.click()} aria-label="حط صورة" className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-[#e5484d] hover:bg-red-50 transition-all">
              <ImageIcon size={18} />
            </button>
            <span className="pointer-events-none absolute top-[calc(100%+9px)] right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover/tool:opacity-100">حط صورة</span>
          </div>
          <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleImg} />
          <button onClick={() => videoRef.current?.click()} title="حط فيديو" aria-label="حط فيديو" className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-gray-500 hover:text-[#e5484d] hover:bg-red-50 transition-all"><Video size={18}/></button>
          <input type="file" accept="video/*" className="hidden" ref={videoRef} onChange={handleVideo} />
          <button onClick={() => audioRef.current?.click()} title="أضف تسجيل صوتي" aria-label="أضف تسجيل صوتي" className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-gray-500 hover:text-[#e5484d] hover:bg-red-50 transition-all"><Mic size={18}/></button>
          <input type="file" accept="audio/*" className="hidden" ref={audioRef} onChange={handleAudio} />

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Undo/Redo */}
          <button onClick={handleUndo} title="ارجع خطوة" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Undo size={16} /></button>
          <button onClick={handleRedo} title="قدّم خطوة" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Redo size={16} /></button>
          <div className="w-px h-6 bg-gray-200 mx-0.5" />
          <button onClick={() => zoom(-0.15)} title="صغّر" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-stone-100"><Minus size={16}/></button>
          <button onClick={resetZoom} title="رجّع الحجم" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-stone-100"><RotateCcw size={15}/></button>
          <button onClick={() => zoom(0.15)} title="كبّر" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-stone-100"><Plus size={16}/></button>
          <button onClick={() => setCollapsed(true)} title="صغّر الأدوات" className="toolbar-action w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-stone-100"><MoreHorizontal size={17}/></button>
        </div>
        <div className="sm:hidden -mt-1 flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[9px] font-bold text-stone-400 shadow-sm"><span className="text-xs text-[#e5484d]">←</span> اسحب لرؤية أدوات أكثر</div>

        {/* ── Sub Options Bar ── */}
        {hasOptions && (
          <div className="app-horizontal-scroll flex w-max max-w-[calc(100vw-12px)] flex-nowrap items-center gap-3 overflow-x-auto rounded-2xl border border-stone-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-xl">
            
            {/* Font picker (text only) */}
             {currentTool === 'text' && (
              <>
                <select value={activeFont} onChange={e => setActiveFont(e.target.value)}
                  className="bg-transparent border-none text-sm font-semibold text-gray-700 outline-none cursor-pointer pr-1" style={{ fontFamily: activeFont }}>
                  {FONTS.map(f => <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label}</option>)}
                </select>
                <div className="w-px h-5 bg-gray-200" />
              </>
             )}

             {currentTool === 'comment' && <div className="flex items-center gap-1.5"><span className="shrink-0 text-[11px] font-bold text-stone-400">شكل التعليق</span>{COMMENT_STYLES.map(style => <button key={style.id} onClick={() => setActiveCommentStyle(style.id)} className={clsx('flex shrink-0 items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold transition-colors', activeCommentStyle === style.id ? 'border-[#e5484d] bg-[#fff2f2] text-[#c7373c]' : 'border-stone-200 text-stone-600 hover:bg-stone-50')}><span>{style.icon}</span>{style.label}</button>)}</div>}

             {/* Colors */}
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setPenColor(c)}
                  className={clsx("w-6 h-6 rounded-full transition-transform duration-150 border-2",
                    penColor === c ? "scale-125 border-gray-300 shadow-sm" : "border-transparent hover:scale-110")}
                  style={{ backgroundColor: c }} />
              ))}
              <button onClick={() => colorRef.current?.click()}
                className="w-6 h-6 rounded-full border border-gray-200 hover:border-gray-400 transition-colors ml-1"
                style={{ background: 'conic-gradient(red,#ff0,lime,cyan,blue,#f0f,red)' }} />
              <input ref={colorRef} type="color" value={penColor} onChange={e => setPenColor(e.target.value)} className="sr-only" />
            </div>

            {/* Thickness */}
            {(isPenLike || currentTool === 'shape') && (
              <>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 w-[120px]">
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                  <input type="range" min="1" max="60" value={penWidth} onChange={e => setPenWidth(+e.target.value)}
                    className="flex-1 h-1 appearance-none bg-gray-200 rounded-full cursor-pointer accent-red-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
                  <div className="w-4 h-4 rounded-full bg-gray-800" />
                </div>
              </>
            )}
          </div>
        )}
        {currentTool === 'shape' && shapeWheelOpen && <div className="relative mt-1 rounded-[30px] border border-stone-200 bg-white/95 p-3 shadow-xl backdrop-blur-xl" aria-label="اختار نوع الشكل"><div className="mb-2 flex items-center justify-between gap-4 px-1"><span className="text-[11px] font-bold text-stone-400">دائرة الأشكال</span><span className="text-[10px] text-stone-400">اختار الشكل ثم حطه في الصفحة</span></div><div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">{SHAPES_LIST.map(s => <button key={s.id} onClick={() => { setActiveShape(s.id as any); setTool('shape'); setShapeWheelOpen(false); }} className={clsx('grid aspect-square min-w-10 place-items-center rounded-full border text-lg transition-all', activeShape === s.id ? 'border-[#e5484d] bg-[#fff2f2] text-[#c7373c] shadow-sm' : 'border-stone-200 text-stone-600 hover:-translate-y-0.5 hover:bg-stone-50')} title={s.label} aria-label={s.label}>{s.icon}</button>)}</div></div>}
        </>}
      </div>
      {imageLibraryOpen && <StickerLibrary onClose={() => setImageLibraryOpen(false)} />}
    </>
  );
}
