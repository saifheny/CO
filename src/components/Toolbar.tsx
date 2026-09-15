import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Pen, Highlighter, Eraser, MousePointer2, Type, Image as ImageIcon, Shapes,
  Undo, Redo, Home, LassoSelect, Hand, ChevronDown, Play
} from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';

const COLORS = ['#000000','#374151','#dc2626','#ea580c','#ca8a04','#16a34a','#2563eb','#7c3aed','#db2777'];
const FONTS = ['Cairo','Tajawal','Almarai','Amiri','Poppins','Arial','Times New Roman'];
const SHAPES_LIST = [
  { id: 'rectangle', label: 'مستطيل', icon: '▭' },
  { id: 'circle', label: 'دائرة', icon: '○' },
  { id: 'triangle', label: 'مثلث', icon: '△' },
  { id: 'line', label: 'خط', icon: '─' },
  { id: 'arrow', label: 'سهم', icon: '→' },
];

export function Toolbar() {
  const { currentTool, setTool, penColor, setPenColor, penWidth, setPenWidth, setView, activePageId, activeFont, setActiveFont, activeShape, setActiveShape, setIsPresenting } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const [showShapes, setShowShapes] = useState(false);

  const handleUndo = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
  const handleRedo = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }));

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

  const isPenLike = ['pen','pencil','brush','calligraphy','highlighter'].includes(currentTool);

  const Tool = ({ id, icon: Icon, tip }: { id: string; icon: any; tip: string }) => {
    const active = currentTool === id;
    return (
      <div className="relative group/tool">
        <button onClick={() => setTool(id as any)} aria-label={tip}
          className={clsx(
          "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150",
          active ? "bg-red-500 text-white shadow-lg shadow-red-500/25 scale-105" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-2xl border border-gray-200/80 rounded-[18px] px-2 py-1.5 shadow-lg shadow-black/[0.06]">
          
          {/* Home */}
          <button onClick={() => setView('home')} title="الرئيسية"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <Home size={18} />
          </button>
          <button onClick={() => setIsPresenting(true)} title="تشغيل العرض" aria-label="تشغيل العرض"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#e5484d] bg-red-50 hover:bg-red-100 transition-all">
            <Play size={17} fill="currentColor" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Selection Group */}
          <Tool id="pan" icon={Hand} tip="تحريك الصفحة" />
          <Tool id="select" icon={MousePointer2} tip="تحديد" />

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Drawing Group */}
          <Tool id="pen" icon={Pen} tip="قلم حبر" />
          <Tool id="highlighter" icon={Highlighter} tip="هايلايتر" />
          <Tool id="eraser" icon={Eraser} tip="ممحاة" />
          <Tool id="lasso" icon={LassoSelect} tip="تحديد حر" />

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Insert Group */}
          <Tool id="text" icon={Type} tip="نص" />
          
          {/* Shapes */}
          <div className="relative">
            <button onClick={() => { setTool('shape'); setShowShapes(p => !p); }} title="أشكال"
              className={clsx("w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 gap-0",
                currentTool === 'shape' ? "bg-red-500 text-white shadow-lg shadow-red-500/25" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100")}>
              <Shapes size={16} />
              <ChevronDown size={10} className="ml-[-2px]" />
            </button>
            {showShapes && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowShapes(false)} />
                <div className="absolute top-full mt-2 right-0 bg-white rounded-xl border border-gray-200 shadow-xl p-1.5 min-w-[120px] z-50">
                  {SHAPES_LIST.map(s => (
                    <button key={s.id} onClick={() => { setActiveShape(s.id as any); setTool('shape'); setShowShapes(false); }}
                      className={clsx("w-full text-right px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                        activeShape === s.id ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-600 hover:bg-gray-50')}>
                      <span className="text-base">{s.icon}</span> {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative group/tool">
            <button onClick={() => fileRef.current?.click()} aria-label="إدراج صورة" className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-[#e5484d] hover:bg-red-50 transition-all">
              <ImageIcon size={18} />
            </button>
            <span className="pointer-events-none absolute top-[calc(100%+9px)] right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover/tool:opacity-100">إدراج صورة</span>
          </div>
          <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleImg} />

          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Undo/Redo */}
          <button onClick={handleUndo} title="تراجع" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Undo size={16} /></button>
          <button onClick={handleRedo} title="إعادة" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Redo size={16} /></button>
        </div>

        {/* ── Sub Options Bar ── */}
        {(isPenLike || currentTool === 'text' || currentTool === 'shape') && (
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-2xl border border-gray-200/80 rounded-2xl px-4 py-2 shadow-lg shadow-black/[0.04]">
            
            {/* Font picker (text only) */}
            {currentTool === 'text' && (
              <>
                <select value={activeFont} onChange={e => setActiveFont(e.target.value)}
                  className="bg-transparent border-none text-sm font-semibold text-gray-700 outline-none cursor-pointer pr-1" style={{ fontFamily: activeFont }}>
                  {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                <div className="w-px h-5 bg-gray-200" />
              </>
            )}

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
            {(isPenLike || (currentTool === 'shape' && ['line','arrow'].includes(activeShape))) && (
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
      </div>
    </>
  );
}
