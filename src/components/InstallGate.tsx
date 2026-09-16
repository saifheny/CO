import { useEffect, useState } from 'react';
import { Download, MonitorSmartphone, ShieldCheck, Sparkles, X } from 'lucide-react';

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const inStandaloneMode = () => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

// A wide touch-screen laptop remains a desktop experience; phones and tablets are the only gated devices.
const isPhoneOrTablet = () => {
  const ua = navigator.userAgent;
  const mobilePlatform = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const compactTouchScreen = window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024;
  return mobilePlatform || compactTouchScreen;
};

export function InstallGate({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && inStandaloneMode());
  const [requiresInstall] = useState(() => typeof window !== 'undefined' && isPhoneOrTablet());
  const [prompt, setPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');
  const [desktopNotice, setDesktopNotice] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as DeferredInstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstalling(false);
      setDesktopNotice(false);
      setMessage('التطبيق اتثبت بنجاح.');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Desktop stays usable. Its small install reminder reappears until the visitor acts on it.
  useEffect(() => {
    if (installed || requiresInstall || !prompt) return;
    setDesktopNotice(true);
    const reminder = window.setInterval(() => setDesktopNotice(true), 15_000);
    return () => window.clearInterval(reminder);
  }, [installed, prompt, requiresInstall]);

  const install = async () => {
    if (!prompt) {
      setMessage('التثبيت مش متاح من المتصفح ده دلوقتي.');
      return;
    }
    setInstalling(true);
    setMessage('استنى لحد ما التثبيت يكمّل…');
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setInstalling(false);
    if (choice.outcome === 'dismissed') setMessage('دوس تثبيت تاني لما تبقى جاهز.');
    // Chromium allows a deferred native prompt to be used once only.
    setPrompt(null);
  };

  if (installed || !requiresInstall) {
    return <>
      {children}
      {!installed && desktopNotice && <aside dir="rtl" role="status" className="fixed bottom-5 left-5 z-[100] flex w-[min(390px,calc(100vw-2.5rem))] items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 text-right shadow-[0_18px_45px_rgba(41,37,36,.16)]" style={{ fontFamily: 'Cairo, Arial, sans-serif' }}>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-stone-800">ثبّت Smart Notebook كتطبيق</p><p className="mt-0.5 text-[11px] text-stone-500">هيفتح لوحده ويحفظ نوتاتك على جهازك.</p></div>
        <button onClick={install} disabled={installing} className="shrink-0 rounded-xl bg-[#e5484d] px-3 py-2 text-xs font-bold text-white hover:bg-[#cf3f45] disabled:bg-stone-300"><Download size={14} className="ml-1 inline"/>{installing ? 'انتظر' : 'تثبيت'}</button>
        <button onClick={() => setDesktopNotice(false)} aria-label="إخفاء تنبيه التثبيت" className="self-start text-stone-400 hover:text-stone-700"><X size={16}/></button>
      </aside>}
    </>;
  }

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-[#f8f7f5] text-stone-900" dir="rtl" style={{ fontFamily: 'Cairo, Arial, sans-serif' }}>
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#fff0f0] to-transparent" />
      <section className="relative mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white ring-1 ring-stone-200 shadow-[0_20px_45px_rgba(41,37,36,.10)]"><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="Smart Notebook" className="h-20 w-20" /></div>
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#f4cdd0] bg-white px-3 py-1.5 text-xs font-bold text-[#c7373c]"><Sparkles size={13}/> تجربة التطبيق كاملة</span>
        <h1 className="text-3xl font-bold tracking-tight">Smart Notebook</h1>
        <p className="mt-3 max-w-sm text-sm leading-7 text-stone-500">ثبّت التطبيق عشان النوتات والرسم واللمس يشتغلوا بأحسن شكل على الموبايل أو التابلت.</p>
        <button onClick={install} disabled={installing} className="mt-8 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#e5484d] px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-[#cf3f45] disabled:bg-stone-300"><Download size={18}/>{installing ? 'بنجهّز التثبيت…' : 'ثبّت Smart Notebook'}</button>
        {message && <p className="mt-3 max-w-sm text-xs leading-6 text-stone-500">{message}</p>}
        <div className="mt-9 grid w-full max-w-sm grid-cols-2 gap-3 text-right">
          <div className="rounded-2xl border border-stone-200 bg-white p-4"><MonitorSmartphone size={19} className="mb-2 text-[#e5484d]"/><p className="text-xs font-bold">متظبّطة للمس</p><p className="mt-1 text-[11px] leading-5 text-stone-400">تجربة ثابتة على الموبايل والتابلت.</p></div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4"><ShieldCheck size={19} className="mb-2 text-[#e5484d]"/><p className="text-xs font-bold">نوتاتك على جهازك</p><p className="mt-1 text-[11px] leading-5 text-stone-400">كل حاجة بتتحفظ جوه التطبيق.</p></div>
        </div>
      </section>
    </main>
  );
}
