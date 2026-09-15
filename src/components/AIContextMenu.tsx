import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { ai } from '../lib/ai';
import { Sparkles, X, Wand2, MessageSquare, ArrowUpToLine, ArrowDownToLine, RefreshCw, Edit3, Eraser, AlignCenter, AlignRight, AlignLeft } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from '../types';
import clsx from 'clsx';

export const AIContextMenu: React.FC = () => {
  const { selectedElements, activePageId, setSelectedElements, setEditingTextId } = useStore();
  const page = useLiveQuery(() => activePageId ? db.pages.get(activePageId) : undefined, [activePageId]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [removalProgress, setRemovalProgress] = useState<number | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [showFrameStyles, setShowFrameStyles] = useState(false);

  if (!selectedElements.length || !page) return null;
  const node = page.elements.find(el => el.id === selectedElements[0]);
  if (!node) return null;

  const updateEl = async (updates: any) => {
    const newEls = page.elements.map(el => el.id === node.id ? { ...el, ...updates } : el);
    await db.pages.update(page.id, { elements: newEls, updatedAt: Date.now() });
  };

  const moveLayer = async (dir: 'up' | 'down') => {
    const arr = [...page.elements];
    const idx = arr.findIndex(e => e.id === node.id);
    if (dir === 'up' && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    else if (dir === 'down' && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
    await db.pages.update(page.id, { elements: arr, updatedAt: Date.now() });
  };

  const removeBackground = async () => {
    if (node.type !== 'image') return;
    setLoading(true); setResult(null); setRemovalProgress(0);
    try {
      // A segmentation model, not colour guessing: keeps the subject and writes a transparent PNG.
      const { removeBackground: remove } = await import('@imgly/background-removal');
      const output = await remove(node.src, {
        model: 'isnet_fp16',
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
      setResult('تمت إزالة الخلفية وحفظ الصورة بخلفية شفافة.');
    } catch { setResult('تعذّرت المعالجة الآن. تأكد من الاتصال في أول استخدام ثم جرّب مجددًا.'); }
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
    } catch { setResult('⚠️ خطأ'); } finally { setLoading(false); }
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

  return (
    <div className="fixed left-3 right-3 bottom-3 sm:left-4 sm:right-auto sm:bottom-auto sm:top-20 z-[60]" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }} dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 w-full sm:w-[320px] max-h-[62vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <B onClick={() => moveLayer('up')}><ArrowUpToLine size={11} className="inline ml-0.5" />أمام</B>
            <B onClick={() => moveLayer('down')}><ArrowDownToLine size={11} className="inline ml-0.5" />خلف</B>
          </div>
          <span className="text-[10px] text-gray-400 font-semibold">
            {node.type === 'image' ? '🖼️ صورة' : node.type === 'text' ? '📝 نص' : node.type === 'stroke' ? '✏️ خط' : '🔷 شكل'}
          </span>
          <button onClick={() => setSelectedElements([])} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"><X size={14} /></button>
        </div>

        <div className="p-3 space-y-3">

          {/* ─── IMAGE CONTROLS ─── */}
          {node.type === 'image' && (<>
            <div className="rounded-xl bg-red-50 border border-red-100 p-2.5">
              <p className="text-[10px] leading-4 text-red-700 mb-2">إزالة خلفية حقيقية بالذكاء المحلي داخل المتصفح؛ أول مرة تُجهّز النموذج وقد تستغرق قليلًا.</p>
              <B onClick={removeBackground} cls="bg-white text-red-600 hover:bg-red-100 border border-red-100 w-full text-center">
                {loading ? <RefreshCw size={11} className="inline animate-spin ml-1" /> : <Eraser size={11} className="inline ml-1" />}إزالة الخلفية
              </B>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">شكل القص</label>
              <div className="flex gap-1.5">
                <B active={!['circle','rounded'].includes((node as any).cropShape)} onClick={() => updateEl({ cropShape: 'rectangle' })}>⬜ مربع</B>
                <B active={(node as any).cropShape === 'rounded'} onClick={() => updateEl({ cropShape: 'rounded' })}>⬜ حواف ناعمة</B>
                <B active={(node as any).cropShape === 'circle'} onClick={() => updateEl({ cropShape: 'circle' })}>⭕ دائرة</B>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">الإطار</label>
              <div className="flex gap-1.5 flex-wrap">
                {[{l:'بدون',w:0,c:''},{l:'رفيع',w:3,c:'#000'},{l:'سميك',w:6,c:'#000'},{l:'أحمر',w:4,c:'#ef4444'},{l:'ذهبي',w:5,c:'#d4a574'},{l:'أبيض',w:5,c:'#fff'}].map((b,i) => (
                  <B key={i} active={(node as any).borderWidth===b.w && (node as any).borderColor===b.c} onClick={() => updateEl({ borderWidth: b.w, borderColor: b.c })}>
                    {b.w>0 && <span className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-300 ml-0.5" style={{backgroundColor:b.c}} />}{b.l}
                  </B>
                ))}
              </div>
              <button onClick={() => setShowFrameStyles(v => !v)} className="mt-2 text-[11px] font-bold text-red-600 hover:text-red-700">{showFrameStyles ? 'إخفاء الأنماط' : '✦ أنماط إطارات أكثر'}</button>
              {showFrameStyles && <div className="grid grid-cols-2 gap-1.5 mt-2 animate-in">
                {[
                  { label: 'كلاسيكي', style: 'solid', width: 3, color: '#1f2937' },
                  { label: 'متقطّع', style: 'dashed', width: 3, color: '#e5484d' },
                  { label: 'مزدوج', style: 'double', width: 3, color: '#a16207' },
                  { label: 'بولارويد', style: 'polaroid', width: 2, color: '#ffffff' },
                ].map(frame => <button key={frame.style} onClick={() => updateEl({ borderStyle: frame.style, borderWidth: frame.width, borderColor: frame.color })}
                  className={clsx('rounded-xl border p-2 text-[11px] font-bold transition-colors', (node as any).borderStyle === frame.style ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600 hover:border-gray-400')}>
                  <span className={clsx('block h-6 rounded-md mb-1', frame.style === 'dashed' && 'border-2 border-dashed', frame.style === 'double' && 'border-double border-4', frame.style === 'polaroid' && 'bg-white shadow-md ring-1 ring-gray-200', frame.style === 'solid' && 'border-2')} style={{ borderColor: frame.color }} />{frame.label}
                </button>)}
              </div>}
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">التعليق</label>
              {!showCaption ? (
                <B onClick={() => { setShowCaption(true); setCaptionInput((node as any).caption || ''); }}>
                  <MessageSquare size={11} className="inline ml-0.5" />{(node as any).caption ? 'تعديل التعليق' : 'إضافة تعليق'}
                </B>
              ) : (
                <div className="flex gap-1">
                  <input type="text" value={captionInput} onChange={e => setCaptionInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter'){updateEl({caption:captionInput.trim()});setShowCaption(false);} }}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-red-300" placeholder="اكتب تعليق..." autoFocus />
                  <button onClick={() => { updateEl({caption:captionInput.trim()}); setShowCaption(false); }} className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">✓</button>
                </div>
              )}
            </div>
          </>)}

          {/* ─── TEXT CONTROLS ─── */}
          {node.type === 'text' && (<>
            <div className="flex gap-1.5">
              <B onClick={() => setEditingTextId(node.id)} cls="bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit3 size={11} className="inline ml-0.5" />تعديل النص</B>
              <B onClick={() => handleAI('summarize')} cls="bg-red-50 text-red-600 hover:bg-red-100"><Sparkles size={11} className="inline ml-0.5" />تلخيص</B>
              <B onClick={() => handleAI('explain')} cls="bg-orange-50 text-orange-600 hover:bg-orange-100">شرح</B>
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
            <div className="flex gap-1.5">
              <B onClick={handleStylize} cls="bg-red-50 text-red-600 hover:bg-red-100 flex-1 text-center">
                {loading ? <RefreshCw size={11} className="inline animate-spin ml-0.5" /> : <Wand2 size={11} className="inline ml-0.5" />}تحويل لنص
              </B>
            </div>
          </>)}

          {/* ─── SHAPE CONTROLS ─── */}
          {node.type === 'shape' && (
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1.5">تعديل اللون</label>
              <div className="flex gap-1">
                {['#000','#dc2626','#2563eb','#16a34a','#7c3aed','#ea580c','#f59e0b'].map(c => (
                  <button key={c} onClick={() => updateEl({ fill: c })}
                    className={clsx("w-6 h-6 rounded-full border-2 transition-transform", (node as any).fill === c ? "border-gray-400 scale-110" : "border-transparent hover:scale-110")}
                    style={{backgroundColor: c}} />
                ))}
              </div>
            </div>
          )}

          {loading && <p className="text-[11px] text-gray-400 animate-pulse text-center">⏳ جاري المعالجة... {removalProgress !== null ? `${removalProgress}%` : ''}</p>}
          {result && (
            <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-700 relative">
              <button onClick={() => setResult(null)} className="absolute top-1 left-1 text-gray-400 hover:text-red-500"><X size={11} /></button>
              <p className="pl-4 whitespace-pre-wrap">{result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
