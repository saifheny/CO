import React, { useEffect, useState } from 'react';
import { ImagePlus, LoaderCircle, Search, Sparkles, X } from 'lucide-react';

type ImageResult = { id: string; title: string; thumbnail: string; source: string };

const QUICK_SEARCHES = [
  { label: 'Study', query: 'study illustration' },
  { label: 'Nature', query: 'botanical illustration' },
  { label: 'Cute', query: 'cute sticker' },
  { label: 'Icons', query: 'minimal icon illustration' },
  { label: 'Arabic', query: 'Arabic calligraphy illustration' },
  { label: 'Frames', query: 'decorative frame illustration' },
];

const cleanTitle = (title: string) => title.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();

export const StickerLibrary: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('notebook sticker');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: trimmed, gsrnamespace: '6', gsrlimit: '30', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '520', origin: '*', format: 'json' });
      const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
      if (!response.ok) throw new Error('network');
      const data = await response.json();
      const found = Object.values(data?.query?.pages || {}).map((page: any) => {
        const image = page.imageinfo?.[0];
        return image?.thumburl ? { id: String(page.pageid), title: cleanTitle(page.title), thumbnail: image.thumburl, source: image.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}` } : null;
      }).filter(Boolean) as ImageResult[];
      setResults(found);
      if (!found.length) setError('No pictures found. Try a simpler word or another language.');
    } catch {
      setResults([]); setError('The internet gallery needs a connection. You can still add a picture from your device.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load('notebook sticker'); }, []);

  const pick = (image: ImageResult) => {
    window.dispatchEvent(new CustomEvent('canvas-add-image', { detail: { src: image.thumbnail, title: image.title } }));
    onClose();
  };

  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f8fafc]/96 px-3 py-4 backdrop-blur-xl sm:px-8 sm:py-8" dir="rtl" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
    <div className="mx-auto max-w-6xl pb-8">
      <header className="flex items-start justify-between gap-4"><button onClick={onClose} aria-label="اقفل معرض الصور" className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-stone-500 shadow-sm ring-1 ring-stone-200 transition hover:rotate-90 hover:text-stone-900"><X size={20}/></button><div className="text-right"><div className="flex items-center justify-end gap-2 text-[#e5484d]"><Sparkles size={15}/><span className="text-[11px] font-black tracking-[.17em]">IMAGE LIBRARY</span></div><h2 className="mt-1 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">صور وملصقات للدفتر</h2><p className="mt-1 max-w-xl text-sm text-stone-500">ابحث من مكتبة صور مفتوحة على الإنترنت، واضغط على أي صورة لإضافتها مباشرة في الصفحة.</p></div></header>
      <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="mt-7 flex rounded-[22px] border border-stone-200 bg-white p-1.5 shadow-sm"><button aria-label="ابحث" className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#e5484d] text-white shadow-sm transition hover:bg-[#ce3d43]"><Search size={19}/></button><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search images, stickers, flowers, study…" className="min-w-0 flex-1 bg-transparent px-3 text-right text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400" autoFocus /></form>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2" dir="ltr">{QUICK_SEARCHES.map(item => <button key={item.query} onClick={() => { setQuery(item.query); void load(item.query); }} className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-[#d83d43]">{item.label}</button>)}</div>
      {loading ? <div className="grid min-h-[380px] place-items-center"><div className="text-center text-stone-400"><LoaderCircle size={30} className="mx-auto animate-spin text-[#e5484d]"/><p className="mt-3 text-sm font-bold">Finding beautiful things…</p></div></div> : error ? <div className="mt-8 grid min-h-[300px] place-items-center rounded-[28px] border border-dashed border-stone-300 bg-white/70 p-8 text-center"><div><ImagePlus size={30} className="mx-auto text-[#e5484d]"/><p className="mt-3 max-w-sm text-sm font-bold text-stone-600">{error}</p></div></div> : <section className="mt-5 columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">{results.map(image => <button key={image.id} onClick={() => pick(image)} className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-stone-200 text-right shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl" title={`أضف ${image.title}`}><img src={image.thumbnail} alt={image.title} loading="lazy" className="block max-h-72 w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent px-3 pb-2 pt-8 text-[10px] font-bold text-white transition duration-300 group-hover:translate-y-0">{image.title}</span></button>)}</section>}
      <p className="mt-6 text-center text-[10px] font-semibold text-stone-400">Images from Wikimedia Commons. Choose images suitable for your use.</p>
    </div>
  </div>;
};
