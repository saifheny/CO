import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Ellipse, RegularPolygon, Arrow, Star, Path, Transformer, Text, Image as KonvaImage, Group } from 'react-konva';
import { useStore } from '../../store/useStore';
import type { Point, StrokeElement, CanvasElement, ShapeElement, VideoElement, AudioElement, CommentElement } from '../../types';
import { getStroke } from 'perfect-freehand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Konva from 'konva';
import { Play, Pause, RotateCcw, X, Timer, Sparkles, ChevronLeft, Settings2, PanelRightOpen } from 'lucide-react';

const getSvgPathFromStroke = (pts: number[][]) => {
  if (!pts.length) return '';
  const d = pts.reduce((a, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    a.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    return a;
  }, ['M', ...pts[0], 'Q']);
  d.push('Z');
  return d.join(' ');
};

const PEN_CFG: Record<string, any> = {
  pen:         { size: 4, thinning: 0.5, smoothing: 0.5, streamline: 0.5 },
  pencil:      { size: 4, thinning: 0.7, smoothing: 0.3, streamline: 0.3 },
  brush:       { size: 12, thinning: 0.1, smoothing: 0.8, streamline: 0.7 },
  calligraphy: { size: 6, thinning: 0.9, smoothing: 0.4, streamline: 0.3 },
  highlighter: { size: 20, thinning: 0, smoothing: 0.7, streamline: 0.5 },
};

const BgLayer = React.memo(({ bg }: { bg: { type: string; value: string } }) => {
  const fill = bg.value || (bg.type === 'dark' ? '#1e1e2e' : bg.type === 'cream' ? '#fdf6e3' : '#ffffff');
  const size = 5000;
  const offset = -2500;
  return (
    <Rect name="background" x={offset} y={offset} width={size} height={size} fill={fill}
      sceneFunc={(ctx) => {
        ctx.fillStyle = fill; ctx.fillRect(offset, offset, size, size);
        const lc = bg.type === 'dark' ? '#2a2a3e' : '#e0e0e0';
        ctx.strokeStyle = lc; ctx.lineWidth = 0.5;
        if (bg.type === 'grid') { for (let x = offset; x < size; x += 30) { ctx.beginPath(); ctx.moveTo(x, offset); ctx.lineTo(x, size); ctx.stroke(); } for (let y = offset; y < size; y += 30) { ctx.beginPath(); ctx.moveTo(offset, y); ctx.lineTo(size, y); ctx.stroke(); } }
        else if (bg.type === 'lines') { for (let y = offset; y < size; y += 32) { ctx.beginPath(); ctx.moveTo(offset, y); ctx.lineTo(size, y); ctx.stroke(); } }
        else if (bg.type === 'dots') { ctx.fillStyle = '#c0c0c0'; for (let x = offset; x < size; x += 25) for (let y = offset; y < size; y += 25) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); } }
      }}
    />
  );
});

type MediaFrameProps = {
  width: number;
  height: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: string;
  cropShape?: string;
};

const mediaRadius = (width: number, height: number) => Math.min(24, width / 4, height / 4);

const clipMedia = (ctx: any, width: number, height: number, cropShape?: string) => {
  const radius = mediaRadius(width, height);
  ctx.beginPath();
  if (cropShape === 'circle') {
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
  } else if (cropShape === 'rounded') {
    ctx.moveTo(radius, 0); ctx.lineTo(width - radius, 0); ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius); ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height); ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius); ctx.quadraticCurveTo(0, 0, radius, 0);
  } else {
    ctx.rect(0, 0, width, height);
  }
  ctx.closePath();
};

const MediaFrameBack: React.FC<MediaFrameProps> = ({ width, height, borderWidth = 0, borderStyle = 'solid', cropShape }) => {
  if (!borderWidth) return null;
  const radius = cropShape === 'rounded' ? mediaRadius(width, height) + 5 : 8;
  const edge = Math.max(8, borderWidth * 2.5);
  if (borderStyle === 'polaroid') return <Rect x={-edge} y={-edge} width={width + edge * 2} height={height + edge * 3.6} fill="#fff" cornerRadius={radius} shadowColor="#18181b" shadowBlur={14} shadowOpacity={0.2} listening={false} />;
  if (borderStyle === 'film') return <Rect x={-edge} y={-edge} width={width + edge * 2} height={height + edge * 2} fill="#111113" cornerRadius={radius} shadowColor="#000" shadowBlur={10} shadowOpacity={0.24} listening={false} />;
  if (borderStyle === 'cinema') return <Rect x={-edge * 1.4} y={-edge} width={width + edge * 2.8} height={height + edge * 2} fill="#111113" cornerRadius={radius} shadowColor="#000" shadowBlur={12} shadowOpacity={0.25} listening={false} />;
  if (borderStyle === 'shadow') return <Rect x={-borderWidth} y={-borderWidth} width={width + borderWidth * 2} height={height + borderWidth * 2} fill="#fff" cornerRadius={radius} shadowColor="#09090b" shadowBlur={18} shadowOffset={{ x: 7, y: 9 }} shadowOpacity={0.28} listening={false} />;
  return null;
};

const MediaFrameFront: React.FC<MediaFrameProps> = ({ width, height, borderWidth = 0, borderColor = '#18181b', borderStyle = 'solid', cropShape }) => {
  if (!borderWidth) return null;
  const isCircle = cropShape === 'circle';
  const radius = cropShape === 'rounded' ? mediaRadius(width, height) : 0;
  const dash = borderStyle === 'dashed' ? [borderWidth * 2.2, borderWidth * 1.5] : [];
  const strokeProps = { stroke: borderColor, strokeWidth: borderWidth * 2, dash, listening: false };
  const perimeter = isCircle ? <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2} {...strokeProps} /> : <Rect width={width} height={height} cornerRadius={radius} {...strokeProps} />;
  const holes = Math.max(3, Math.floor(width / 28));
  return <>
    {borderStyle === 'neon' && <Rect x={-borderWidth} y={-borderWidth} width={width + borderWidth * 2} height={height + borderWidth * 2} cornerRadius={radius + borderWidth} stroke={borderColor} strokeWidth={borderWidth} shadowColor={borderColor} shadowBlur={18} shadowOpacity={0.9} listening={false} />}
    {perimeter}
    {borderStyle === 'double' && (isCircle
      ? <Circle x={width / 2} y={height / 2} radius={Math.max(2, Math.min(width, height) / 2 - borderWidth * 3)} stroke={borderColor} strokeWidth={Math.max(1, borderWidth)} listening={false} />
      : <Rect x={borderWidth * 3} y={borderWidth * 3} width={Math.max(2, width - borderWidth * 6)} height={Math.max(2, height - borderWidth * 6)} cornerRadius={Math.max(0, radius - borderWidth * 2)} stroke={borderColor} strokeWidth={Math.max(1, borderWidth)} listening={false} />)}
    {borderStyle === 'film' && Array.from({ length: holes }).map((_, index) => <React.Fragment key={index}><Rect x={7 + index * ((width - 14) / holes)} y={-borderWidth * 1.65} width={Math.max(4, borderWidth * 1.15)} height={Math.max(4, borderWidth * 1.15)} fill="#f8fafc" cornerRadius={1} listening={false} /><Rect x={7 + index * ((width - 14) / holes)} y={height + borderWidth * .5} width={Math.max(4, borderWidth * 1.15)} height={Math.max(4, borderWidth * 1.15)} fill="#f8fafc" cornerRadius={1} listening={false} /></React.Fragment>)}
    {borderStyle === 'tape' && <><Rect x={width * .14} y={-borderWidth * 3} width={Math.min(76, width * .24)} height={Math.max(11, borderWidth * 4)} fill="#f5e6bd" opacity={.92} rotation={-6} listening={false} /><Rect x={width * .64} y={-borderWidth * 3} width={Math.min(76, width * .24)} height={Math.max(11, borderWidth * 4)} fill="#f5e6bd" opacity={.92} rotation={6} listening={false} /></>}
  </>;
};

const ImgNode = React.memo(({ el, sel, onDE, onTE, onSelect, onCaptionDrag }: any) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const i = new window.Image(); i.src = el.src; i.onload = () => setImg(i); }, [el.src]);
  if (!img) return null;

  const borderW = el.borderWidth || 0;
  const borderColor = el.borderColor || '#000000';
  const borderStyle = el.borderStyle || 'solid';
  // Captions grow with the actual wording instead of leaving a fixed oversized bubble.
  const captionChars = Math.max(8, Math.floor(Math.min(220, el.width) / 8));
  const captionLines = Math.max(1, Math.ceil((el.caption || '').length / captionChars));
  const captionWidth = Math.min(Math.min(230, el.width), Math.max(88, Math.min((el.caption || '').length, captionChars) * 8 + 26));
  const captionHeight = Math.max(38, captionLines * 20 + 18);
  const captionX = typeof el.captionX === 'number' ? el.captionX : Math.max(0, el.width - captionWidth);
  const captionY = typeof el.captionY === 'number' ? el.captionY : -55;

  return (
    <Group id={el.id} x={el.x} y={el.y} rotation={el.rotation || 0} draggable={sel} onDragEnd={onDE} onTransformEnd={onTE} onClick={onSelect} onTap={onSelect}>
      <MediaFrameBack width={el.width} height={el.height} borderWidth={borderW} borderStyle={borderStyle} cropShape={el.cropShape} />
      <Group width={el.width} height={el.height} clipFunc={(ctx: any) => clipMedia(ctx, el.width, el.height, el.cropShape)}>
        <KonvaImage image={img} width={el.width} height={el.height} />
      </Group>
      <MediaFrameFront width={el.width} height={el.height} borderWidth={borderW} borderColor={borderColor} borderStyle={borderStyle} cropShape={el.cropShape} />

      {el.caption && <Group x={captionX} y={captionY} draggable={sel} onDragEnd={(event) => { event.cancelBubble = true; onCaptionDrag(el.id, event.target.x(), event.target.y()); }} onClick={onSelect} onTap={onSelect}>
        <Rect width={captionWidth} height={captionHeight} fill="#292524" opacity={0.96} cornerRadius={14} shadowColor="#000" shadowOpacity={0.15} shadowBlur={10} />
        <RegularPolygon x={captionWidth - 22} y={captionHeight} sides={3} radius={8} rotation={180} fill="#292524" listening={false} />
        <Text text={el.caption} x={5} y={8} width={Math.max(10, captionWidth - 10)} height={captionHeight - 10} fontSize={13} lineHeight={1.35} fontFamily={el.fontFamily || "Cairo, Arial"} fill="#ffffff" fontStyle="bold" align="right" padding={4} listening={false} />
      </Group>}
    </Group>
  );
});

const VideoNode = React.memo(({ el, sel, onDE, onTE, onSelect }: { el: VideoElement; sel: boolean; onDE: any; onTE: any; onSelect: any }) => {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const videoImageRef = useRef<Konva.Image>(null);
  useEffect(() => {
    const v = document.createElement('video');
    v.src = el.src; v.preload = 'auto'; v.muted = Boolean(el.muted); v.playsInline = true; v.loop = true;
    const redraw = () => videoImageRef.current?.getLayer()?.batchDraw();
    v.addEventListener('loadeddata', redraw); v.addEventListener('canplay', redraw); v.addEventListener('seeked', redraw); setVideo(v);
    return () => { v.pause(); v.removeEventListener('loadeddata', redraw); v.removeEventListener('canplay', redraw); v.removeEventListener('seeked', redraw); };
  }, [el.src]);
  useEffect(() => { if (!video) return; video.muted = Boolean(el.muted); if (el.playing) video.play().catch(() => undefined); else video.pause(); }, [video, el.playing, el.muted]);
  // Konva does not redraw a HTML video on its own. A frame loop keeps the canvas image in sync
  // with the media clock even after the user selects or edits another element.
  useEffect(() => {
    if (!video || !el.playing) return;
    let frameId = 0;
    const draw = () => { videoImageRef.current?.getLayer()?.batchDraw(); frameId = requestAnimationFrame(draw); };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [video, el.playing]);
  if (!video) return null;
  const borderWidth = el.borderWidth || 0;
  const borderColor = el.borderColor || '#18181b';
  const borderStyle = el.borderStyle || 'cinema';
  return <Group id={el.id} x={el.x} y={el.y} rotation={el.rotation || 0} draggable={sel} onDragEnd={onDE} onTransformEnd={onTE} onClick={onSelect} onTap={onSelect}>
    <MediaFrameBack width={el.width} height={el.height} borderWidth={borderWidth} borderStyle={borderStyle} cropShape={el.cropShape} />
    <Group width={el.width} height={el.height} clipFunc={(ctx: any) => clipMedia(ctx, el.width, el.height, el.cropShape)}>
      <Rect width={el.width} height={el.height} fill="#18181b" listening={false} />
      <KonvaImage ref={videoImageRef} image={video} width={el.width} height={el.height} />
    </Group>
    <MediaFrameFront width={el.width} height={el.height} borderWidth={borderWidth} borderColor={borderColor} borderStyle={borderStyle} cropShape={el.cropShape} />
  </Group>;
});

const commentSize = (el: CommentElement) => {
  const fontSize = el.fontSize || 22;
  const charsPerLine = Math.max(8, Math.floor(250 / (fontSize * 0.62)));
  const lines = Math.max(1, Math.ceil((el.text || '').length / charsPerLine));
  return { width: Math.min(310, Math.max(130, Math.min((el.text || '').length, charsPerLine) * fontSize * .64 + 42, el.width || 0)), height: Math.max(54, lines * (fontSize * 1.38) + 30) };
};

const CommentNode = React.memo(({ el, sel, onDE, onSelect, onEdit }: { el: CommentElement; sel: boolean; onDE: any; onSelect: any; onEdit: any }) => {
  const { width, height } = commentSize(el);
  const style = el.style || 'speech';
  const fill = el.fill || '#292524';
  const common = { id: el.id, x: el.x, y: el.y, rotation: el.rotation || 0, draggable: sel, onDragEnd: onDE, onClick: onSelect, onTap: onSelect, onDblClick: onEdit, onDblTap: onEdit };
  const text = <Text text={el.text} x={18} y={13} width={width - 36} height={height - 20} fontSize={el.fontSize} lineHeight={1.32} fontFamily={el.fontFamily || 'Cairo, Arial'} fill={el.color || '#ffffff'} align="right" verticalAlign="middle" />;
  return <Group {...common}>
    {style === 'cloud' && <><Circle x={width * .26} y={height * .54} radius={height * .32} fill={fill}/><Circle x={width * .5} y={height * .38} radius={height * .4} fill={fill}/><Circle x={width * .75} y={height * .55} radius={height * .33} fill={fill}/><Rect x={width * .18} y={height * .45} width={width * .64} height={height * .38} fill={fill} cornerRadius={height * .18}/></>}
    {style === 'thought' && <><Rect width={width} height={height} fill={fill} cornerRadius={height / 2}/><Circle x={17} y={height + 10} radius={7} fill={fill}/><Circle x={6} y={height + 23} radius={4} fill={fill}/></>}
    {style === 'note' && <><Rect width={width} height={height} fill={fill} cornerRadius={7} shadowColor="#1c1917" shadowBlur={8} shadowOpacity={.18}/><Line points={[width - 27, 0, width, 0, width, 27]} stroke="#ffffff" opacity={.35} strokeWidth={2}/></>}
    {style === 'label' && <><Rect width={width} height={height} fill={fill} cornerRadius={10}/><Circle x={15} y={height / 2} radius={5} fill="#ffffff" opacity={.55}/></>}
    {style === 'speech' && <><Rect width={width} height={height} fill={fill} cornerRadius={18} shadowColor="#1c1917" shadowBlur={8} shadowOpacity={.18}/><RegularPolygon x={width - 30} y={height + 2} sides={3} radius={12} rotation={180} fill={fill}/></>}
    {text}
  </Group>;
});

const AudioNode = React.memo(({ el, sel, onDE, onTE, onSelect }: { el: AudioElement; sel: boolean; onDE: any; onTE: any; onSelect: any }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio(el.src); audio.preload = 'metadata'; audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, [el.src]);
  useEffect(() => { const audio = audioRef.current; if (!audio) return; if (el.playing) audio.play().catch(() => undefined); else audio.pause(); }, [el.playing]);
  return <Group id={el.id} x={el.x} y={el.y} rotation={el.rotation || 0} draggable={sel} onDragEnd={onDE} onTransformEnd={onTE} onClick={onSelect} onTap={onSelect}>
    <Rect width={el.width} height={el.height} fill="#1f2937" cornerRadius={18} shadowColor="#111827" shadowBlur={12} shadowOpacity={.22}/>
    <Circle x={34} y={el.height / 2} radius={20} fill="#e5484d"/><RegularPolygon x={38} y={el.height / 2} sides={3} radius={9} rotation={90} fill="#ffffff"/>
    <Text x={70} y={15} width={el.width - 94} text={el.title || 'تسجيل صوتي'} fontFamily="Cairo, Arial" fontSize={16} fontStyle="bold" fill="#ffffff" align="right"/>
    <Rect x={72} y={44} width={Math.max(30, el.width - 110)} height={5} fill="#ffffff" opacity={.2} cornerRadius={4}/><Rect x={72} y={44} width={Math.max(24, (el.width - 110) * .36)} height={5} fill="#fca5a5" cornerRadius={4}/>
  </Group>;
});

const StrokeNode = React.memo(({ el, sel, onDE, onSelect }: { el: StrokeElement; sel: boolean; onDE: any; onSelect: any }) => {
  const cfg = PEN_CFG[el.tool] || PEN_CFG.pen;
  const sd = getStroke(el.points.map(p => [p.x, p.y, p.pressure || 0.5]), { ...cfg, size: el.width });
  const path = getSvgPathFromStroke(sd);
  return (
    <Line id={el.id} fill={el.color} opacity={el.opacity || 1}
      draggable={sel} onDragEnd={onDE} onClick={onSelect} onTap={onSelect}
      sceneFunc={(ctx, shape) => { ctx.fillStyle = shape.fill(); ctx.fill(new Path2D(path)); }}
    />
  );
});

type RevealEffect = 'fade' | 'pop' | 'drop' | 'left' | 'right' | 'bottom' | 'zoom' | 'flip';

const AnimatedReveal: React.FC<{ show: boolean; effect: RevealEffect; children: React.ReactNode }> = ({ show, effect, children }) => {
  const ref = useRef<Konva.Group>(null);
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    if (!show) { group.visible(false); return; }
    const start = effect === 'left' ? { x: -90, y: 0 } : effect === 'right' ? { x: 90, y: 0 } : effect === 'bottom' ? { x: 0, y: 90 } : effect === 'drop' ? { x: 0, y: -100 } : { x: 0, y: 0 };
    const pop = effect === 'pop' || effect === 'zoom' || effect === 'flip';
    group.setAttrs({ visible: true, opacity: 0, x: start.x, y: start.y, scaleX: effect === 'flip' ? 0.05 : pop ? 0.72 : 1, scaleY: pop ? 0.72 : 1 });
    group.to({ x: 0, y: 0, opacity: 1, scaleX: 1, scaleY: 1, duration: effect === 'fade' ? 0.55 : 0.42, easing: effect === 'drop' ? Konva.Easings.BounceEaseOut : effect === 'pop' ? Konva.Easings.ElasticEaseOut : Konva.Easings.EaseOut });
  }, [show, effect]);
  return <Group ref={ref}>{children}</Group>;
};

export const CanvasEditor: React.FC = () => {
  const { currentTool, penColor, penWidth, activeShape, activeFont, activeCommentStyle, activePageId, selectedElements, setSelectedElements, setTool, editingTextId, setEditingTextId, isPresenting, setIsPresenting } = useStore();
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const liveLayerRef = useRef<any>(null);
  const presentationPressTimer = useRef<number | null>(null);
  const ignorePresentationClick = useRef(false);
  
  const isDrawing = useRef(false);
  const livePoints = useRef<Point[]>([]);
  const liveShape = useRef<Konva.Shape | null>(null);
  const touchGesture = useRef<{ background: boolean; x: number; y: number; distance?: number; center?: { x: number; y: number } } | null>(null);

  const page = useLiveQuery(() => activePageId ? db.pages.get(activePageId) : undefined, [activePageId]);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);
  const [sz, setSz] = useState({ w: window.innerWidth, h: window.innerHeight });

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [presentationPlaying, setPresentationPlaying] = useState(false);
  const [presentationStep, setPresentationStep] = useState(0);
  const [presentationDelay, setPresentationDelay] = useState(2);
  const [revealEffect, setRevealEffect] = useState<RevealEffect>('fade');
  const [presentationMode, setPresentationMode] = useState<'auto' | 'manual'>('auto');
  const [presentationPanelOpen, setPresentationPanelOpen] = useState(true);

  useEffect(() => { if (page?.elements) setElements(page.elements); }, [page?.elements]);
  useEffect(() => { if (isPresenting) { setPresentationPlaying(false); setPresentationStep(0); setPresentationPanelOpen(true); setSelectedElements([]); } }, [isPresenting, setSelectedElements]);
  useEffect(() => {
    if (!isPresenting || presentationMode !== 'auto' || !presentationPlaying || presentationStep >= elements.length) return;
    const timer = window.setTimeout(() => setPresentationStep(s => Math.min(elements.length, s + 1)), presentationDelay * 1000);
    return () => window.clearTimeout(timer);
  }, [isPresenting, presentationMode, presentationPlaying, presentationStep, presentationDelay, elements.length]);
  useEffect(() => {
    const onZoom = (event: Event) => setStageScale(scale => Math.min(4, Math.max(0.2, scale + Number((event as CustomEvent<number>).detail))));
    const onReset = () => { setStageScale(1); setStagePos({ x: 0, y: 0 }); };
    window.addEventListener('canvas-zoom', onZoom); window.addEventListener('canvas-reset', onReset);
    return () => { window.removeEventListener('canvas-zoom', onZoom); window.removeEventListener('canvas-reset', onReset); };
  }, []);
  useEffect(() => { setUndoStack([]); setRedoStack([]); }, [page?.id]);
  useEffect(() => { const fn = () => setSz({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const nodes = selectedElements.filter(id => !elements.find(element => element.id === id)?.isLocked).map(id => stageRef.current.findOne(`#${id}`)).filter(Boolean);
    transformerRef.current.nodes(nodes);
    
    // Customize transformer bounds for text to allow scaling properly
    transformerRef.current.boundBoxFunc((oldBox: any, newBox: any) => {
      if (newBox.width < 20 || newBox.height < 20) return oldBox;
      return newBox;
    });
    
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedElements, elements]);

  const sel = currentTool === 'select' && !isPresenting;
  const isPan = currentTool === 'pan';
  const isDraw = ['pen', 'pencil', 'brush', 'calligraphy', 'highlighter'].includes(currentTool);
  const isEraser = currentTool === 'eraser';
  const isLasso = currentTool === 'lasso';

  const saveState = useCallback((newEls: CanvasElement[]) => {
    setUndoStack(p => [...p, elements]); setRedoStack([]);
    setElements(newEls);
    if (activePageId) db.pages.update(activePageId, { elements: newEls, updatedAt: Date.now() });
  }, [elements, activePageId]);

  useEffect(() => {
    const addInternetImage = (event: Event) => {
      const detail = (event as CustomEvent<{ src?: string; title?: string }>).detail;
      if (!detail?.src) return;
      const width = 280;
      const x = (sz.w / 2 - stagePos.x) / stageScale - width / 2;
      const y = (sz.h / 2 - stagePos.y) / stageScale - 120;
      const image: CanvasElement = { id: uuidv4(), type: 'image', x, y, width, height: 220, src: detail.src, cropShape: 'rounded', borderWidth: 3, borderColor: '#ffffff', borderStyle: 'shadow' };
      saveState([...elements, image]);
      setTool('select'); setSelectedElements([image.id]);
    };
    window.addEventListener('canvas-add-image', addInternetImage);
    return () => window.removeEventListener('canvas-add-image', addInternetImage);
  }, [elements, saveState, setSelectedElements, setTool, stagePos, stageScale, sz]);

  const undo = useCallback(() => {
    if (!undoStack.length) return;
    const prev = undoStack.at(-1)!;
    setRedoStack(r => [...r, elements]); setUndoStack(u => u.slice(0, -1)); setElements(prev);
    if (activePageId) db.pages.update(activePageId, { elements: prev, updatedAt: Date.now() });
  }, [undoStack, elements, activePageId]);

  const redo = useCallback(() => {
    if (!redoStack.length) return;
    const next = redoStack.at(-1)!;
    setUndoStack(u => [...u, elements]); setRedoStack(r => r.slice(0, -1)); setElements(next);
    if (activePageId) db.pages.update(activePageId, { elements: next, updatedAt: Date.now() });
  }, [redoStack, elements, activePageId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.length && !isInput && !editingTextId) {
        saveState(elements.filter(el => !selectedElements.includes(el.id))); setSelectedElements([]);
      }
    };
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
  }, [undo, redo, selectedElements, elements, saveState, editingTextId, setSelectedElements]);

  const getPointerRelativePos = (e: any) => {
    const stage = e.target.getStage();
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(stage.getPointerPosition());
  };

  // Konva sends the inner image/text node on touch. Walk up to its owning group
  // so every item is selectable with a finger as well as a mouse.
  const getElementId = (target: any): string | undefined => {
    let node = target;
    while (node) {
      const id = typeof node.id === 'function' ? node.id() : undefined;
      if (id) return id;
      node = typeof node.getParent === 'function' ? node.getParent() : null;
    }
    return undefined;
  };

  const handlePointerDown = (e: any) => {
    if (isPresenting) return;
    if (isPan) return;
    const pos = getPointerRelativePos(e);
    if (!pos) return;

    if (sel) {
      if (e.target === e.target.getStage() || e.target.name() === 'background') { setSelectedElements([]); return; }
      const id = getElementId(e.target);
      if (id) setSelectedElements([id]);
      return;
    }

    if (isEraser) {
      isDrawing.current = true;
      const hr = penWidth / 2 + 15;
      const rm = elements.filter(el => el.type === 'stroke' && el.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < hr));
      if (rm.length) saveState(elements.filter(el => !rm.some(r => r.id === el.id)));
      return;
    }

    if (isLasso) {
      isDrawing.current = true;
      livePoints.current = [{ x: pos.x, y: pos.y }];
      const shape = new Konva.Shape({
        sceneFunc: (ctx) => {
          const pts = livePoints.current;
          if(pts.length < 2) return;
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.setLineDash([6, 4]); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke();
        }
      });
      liveLayerRef.current?.add(shape);
      liveShape.current = shape;
      return;
    }

    if (currentTool === 'shape') {
      const isLine = activeShape === 'line' || activeShape === 'arrow';
      const s: ShapeElement = { id: uuidv4(), type: 'shape', shapeType: activeShape, x: pos.x - 50, y: pos.y - 50, width: 100, height: 100, fill: isLine ? undefined : penColor, stroke: penColor, strokeWidth: penWidth };
      saveState([...elements, s]); setTool('select'); setSelectedElements([s.id]); return;
    }

    if (currentTool === 'text') {
      const t: CanvasElement = { id: uuidv4(), type: 'text', text: 'اكتب هنا...', fontFamily: activeFont, fontSize: 32, color: penColor, align: 'center', x: pos.x - 100, y: pos.y, width: 200 };
      saveState([...elements, t]); setTool('select'); setSelectedElements([t.id]); setEditingTextId(t.id); return;
    }

    if (currentTool === 'comment') {
      const comment: CanvasElement = { id: uuidv4(), type: 'comment', text: 'اكتب تعليقك...', fontFamily: activeFont, fontSize: 21, color: '#ffffff', fill: penColor, style: activeCommentStyle, x: pos.x - 105, y: pos.y - 26, width: 210 };
      saveState([...elements, comment]); setTool('select'); setSelectedElements([comment.id]); setEditingTextId(comment.id); return;
    }

    if (isDraw) {
      isDrawing.current = true;
      const pr = e.evt?.pressure > 0 ? e.evt.pressure : 0.5;
      livePoints.current = [{ x: pos.x, y: pos.y, pressure: pr }];
      
      const cfg = PEN_CFG[currentTool] || PEN_CFG.pen;
      const cW = penWidth;
      const cC = penColor;
      const isHl = currentTool === 'highlighter';

      const shape = new Konva.Shape({
        fill: cC,
        opacity: isHl ? 0.35 : 1,
        sceneFunc: (ctx, shape) => {
          const pts = livePoints.current;
          if(pts.length < 2) return;
          const sd = getStroke(pts.map(p => [p.x, p.y, p.pressure || 0.5]), { ...cfg, size: cW });
          const path = getSvgPathFromStroke(sd);
          ctx.fillStyle = shape.fill();
          ctx.fill(new Path2D(path));
        }
      });
      liveLayerRef.current?.add(shape);
      liveShape.current = shape;
    }
  };

  const handlePointerMove = (e: any) => {
    if (isPresenting) return;
    if (!isDrawing.current || isPan) return;
    const pos = getPointerRelativePos(e);
    if (!pos) return;

    if (isEraser) {
      const hr = penWidth / 2 + 15;
      const rm = elements.filter(el => el.type === 'stroke' && el.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < hr));
      if (rm.length) {
        const newEls = elements.filter(el => !rm.some(r => r.id === el.id));
        setElements(newEls);
        if (activePageId) db.pages.update(activePageId, { elements: newEls, updatedAt: Date.now() });
      }
      return;
    }

    if (isLasso && liveShape.current) {
      livePoints.current.push({ x: pos.x, y: pos.y });
      liveLayerRef.current?.batchDraw();
      return;
    }

    if (isDraw && liveShape.current) {
      const pr = e.evt?.pressure > 0 ? e.evt.pressure : 0.5;
      livePoints.current.push({ x: pos.x, y: pos.y, pressure: pr });
      liveLayerRef.current?.batchDraw();
    }
  };

  const handlePointerUp = () => {
    if (isPresenting) return;
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (liveShape.current) { liveShape.current.destroy(); liveShape.current = null; }
    liveLayerRef.current?.batchDraw();

    if (isEraser) { setUndoStack(p => [...p, elements]); return; }

    if (isLasso && livePoints.current.length > 4) {
      const xs = livePoints.current.map(p=>p.x), ys = livePoints.current.map(p=>p.y);
      const mnX = Math.min(...xs), mxX = Math.max(...xs), mnY = Math.min(...ys), mxY = Math.max(...ys);
      const kept = elements.filter(el => {
        if (el.type === 'stroke') return !el.points.some(p => p.x >= mnX && p.x <= mxX && p.y >= mnY && p.y <= mxY);
        const cx = el.x + ((el as any).width || 0) / 2, cy = el.y + ((el as any).height || 0) / 2;
        return !(cx >= mnX && cx <= mxX && cy >= mnY && cy <= mxY);
      });
      if (kept.length !== elements.length) saveState(kept);
      livePoints.current = []; return;
    }

    if (isDraw && livePoints.current.length > 2) {
      const newEl: StrokeElement = {
        id: uuidv4(), type: 'stroke', x: 0, y: 0, points: [...livePoints.current], color: penColor, width: penWidth, tool: currentTool as any, opacity: currentTool === 'highlighter' ? 0.35 : 1,
      };
      saveState([...elements, newEl]);
    }
    livePoints.current = [];
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    
    if (!e.evt.ctrlKey) {
      setStagePos({ x: stage.x() - e.evt.deltaX, y: stage.y() - e.evt.deltaY });
      return;
    }
    
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setStageScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  const handleTouchStart = (e: any) => {
    if (isPresenting) return;
    const touches = e.evt?.touches as TouchList | undefined;
    if (!touches?.length) return;
    const isBackground = e.target === e.target.getStage() || e.target.name() === 'background';
    if (touches.length >= 2) {
      const [a, b] = [touches[0], touches[1]];
      touchGesture.current = { background: true, x: 0, y: 0, distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), center: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 } };
    } else if (isBackground && !isDraw && !isEraser && !isLasso && currentTool !== 'shape' && currentTool !== 'text' && currentTool !== 'comment') {
      touchGesture.current = { background: true, x: touches[0].clientX, y: touches[0].clientY };
    }
  };

  const handleTouchMove = (e: any) => {
    const gesture = touchGesture.current;
    const touches = e.evt?.touches as TouchList | undefined;
    const stage = stageRef.current;
    if (!gesture || !touches?.length || !stage) return;
    if (touches.length >= 2 && gesture.distance) {
      e.evt.preventDefault();
      const [a, b] = [touches[0], touches[1]];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const center = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
      const oldScale = stage.scaleX();
      const newScale = Math.min(4, Math.max(.25, oldScale * (distance / gesture.distance)));
      const previous = gesture.center || center;
      const point = { x: (previous.x - stage.x()) / oldScale, y: (previous.y - stage.y()) / oldScale };
      setStageScale(newScale);
      setStagePos({ x: center.x - point.x * newScale, y: center.y - point.y * newScale });
      gesture.distance = distance; gesture.center = center;
      return;
    }
    if (gesture.background && touches.length === 1) {
      e.evt.preventDefault();
      const touch = touches[0];
      setStagePos(position => ({ x: position.x + touch.clientX - gesture.x, y: position.y + touch.clientY - gesture.y }));
      gesture.x = touch.clientX; gesture.y = touch.clientY;
    }
  };

  const handleTouchEnd = (e: any) => {
    if (!e.evt?.touches?.length) touchGesture.current = null;
  };

  const handleDragEnd = (e: any) => {
    const id = getElementId(e.target);
    if (id) saveState(elements.map(el => el.id === id ? { ...el, x: e.target.x(), y: e.target.y() } : el));
  };

  const handleCaptionDrag = (id: string, captionX: number, captionY: number) => {
    saveState(elements.map(el => el.id === id && el.type === 'image' ? { ...el, captionX, captionY } : el));
  };

  const toggleLock = (id: string) => saveState(elements.map(element => element.id === id ? { ...element, isLocked: !element.isLocked } : element));
  
  const handleTransformEnd = (e: any) => {
    const n = e.target; const id = getElementId(n);
    const sx = n.scaleX(), sy = n.scaleY();
    n.scaleX(1); n.scaleY(1);
    
    saveState(elements.map(el => {
      if (el.id !== id) return el;
      if (el.type === 'text') {
        // FOR TEXT: Scale font size instead of width/height
        const newFontSize = Math.max(10, (el.fontSize || 32) * Math.max(sx, sy));
        const newWidth = Math.max(50, ((el as any).width || 200) * sx);
        return { ...el, x: n.x(), y: n.y(), rotation: n.rotation(), fontSize: newFontSize, width: newWidth };
      }
      if (el.type === 'image' || el.type === 'shape' || el.type === 'video' || el.type === 'audio') {
        return { ...el, x: n.x(), y: n.y(), rotation: n.rotation(), width: Math.max(10, el.width * sx), height: Math.max(10, el.height * sy) };
      }
      return { ...el, x: n.x(), y: n.y(), rotation: n.rotation() };
    }));
  };

  // Smart Selection Handler
  const handleElementSelect = (e: any) => {
    const id = getElementId(e.target);
    if (id) {
      setTool('select');
      setSelectedElements([id]);
    }
  };

  const cursor = isPan ? 'grab' : sel ? 'default' : isEraser ? 'cell' : 'crosshair';
  const startPresentationPress = () => {
    ignorePresentationClick.current = false;
    presentationPressTimer.current = window.setTimeout(() => { ignorePresentationClick.current = true; setPresentationPanelOpen(true); }, 500);
  };
  const endPresentationPress = () => { if (presentationPressTimer.current) window.clearTimeout(presentationPressTimer.current); presentationPressTimer.current = null; };
  const nextPresentation = () => { if (!ignorePresentationClick.current) setPresentationStep(step => Math.min(elements.length, step + 1)); ignorePresentationClick.current = false; };

  return (
    <div className="flex-1 overflow-hidden relative" style={{ cursor }}>
      <Stage width={sz.w} height={sz.h} ref={stageRef}
        x={stagePos.x} y={stagePos.y} scaleX={stageScale} scaleY={stageScale}
        draggable={isPan && !isPresenting} onDragEnd={(e) => { if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() }); }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        
        <Layer listening={true}><BgLayer bg={page?.background || { type: 'dots', value: '#fff' }} /></Layer>
        
        <Layer>
          {elements.map((el, index) => {
            let node: React.ReactNode = null;
            const selectable = sel && !el.isLocked;
            if (el.type === 'stroke') node = <StrokeNode el={el} sel={selectable} onDE={handleDragEnd} onSelect={handleElementSelect} />;
            
            if (el.type === 'shape') {
              const s = el as ShapeElement;
              const props = { id: s.id, x: s.x, y: s.y, rotation: s.rotation || 0, draggable: selectable, onDragEnd: handleDragEnd, onTransformEnd: handleTransformEnd, onClick: handleElementSelect, onTap: handleElementSelect };
              const style = { fill: s.fill === 'transparent' ? undefined : s.fill, stroke: s.stroke || s.fill, strokeWidth: s.strokeWidth || 0 };
              if (s.shapeType === 'rectangle') node = <Rect {...props} width={s.width} height={s.height} {...style} cornerRadius={8} />;
              if (s.shapeType === 'circle') node = <Circle {...props} radius={s.width / 2} {...style} />;
              if (s.shapeType === 'ellipse') node = <Ellipse {...props} x={s.x + s.width / 2} y={s.y + s.height / 2} radiusX={s.width / 2} radiusY={s.height / 2} {...style} />;
              if (s.shapeType === 'triangle') node = <RegularPolygon {...props} sides={3} radius={s.width / 2} {...style} />;
              if (s.shapeType === 'line') node = <Line {...props} points={[0, 0, s.width, s.height]} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              if (s.shapeType === 'arrow') node = <Arrow {...props} points={[0, 0, s.width, s.height]} stroke={s.stroke} fill={s.stroke} strokeWidth={s.strokeWidth} pointerLength={10} pointerWidth={10} />;
              if (s.shapeType === 'diamond') node = <RegularPolygon {...props} x={s.x + s.width / 2} y={s.y + s.height / 2} sides={4} radius={s.width / 2} rotation={45} {...style} />;
              if (s.shapeType === 'star') node = <Star {...props} x={s.x + s.width / 2} y={s.y + s.height / 2} numPoints={5} innerRadius={s.width * .2} outerRadius={s.width / 2} {...style} />;
              if (s.shapeType === 'heart') node = <Path {...props} data="M 50 91 C 12 62 4 42 10 25 C 17 7 40 8 50 25 C 60 8 83 7 90 25 C 96 42 88 62 50 91 Z" scaleX={s.width / 100} scaleY={s.height / 100} {...style} />;
              if (s.shapeType === 'sticky') node = <Group {...props}><Rect width={s.width} height={s.height} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} cornerRadius={7}/><Line points={[s.width - 28, 0, s.width, 0, s.width, 28]} stroke="#ffffff" opacity={.42} strokeWidth={2}/></Group>;
              if (s.shapeType === 'speech') node = <Group {...props}><Rect width={s.width} height={s.height} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} cornerRadius={18}/><RegularPolygon x={s.width - 25} y={s.height + 1} sides={3} radius={12} rotation={180} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth}/></Group>;
            }
            
            if (el.type === 'image') node = <ImgNode el={el} sel={selectable} onDE={handleDragEnd} onTE={handleTransformEnd} onSelect={handleElementSelect} onCaptionDrag={handleCaptionDrag} />;
            if (el.type === 'video') node = <VideoNode el={el as VideoElement} sel={selectable} onDE={handleDragEnd} onTE={handleTransformEnd} onSelect={handleElementSelect} />;
            if (el.type === 'audio') node = <AudioNode el={el as AudioElement} sel={selectable} onDE={handleDragEnd} onTE={handleTransformEnd} onSelect={handleElementSelect} />;
            if (el.type === 'comment') node = <CommentNode el={el as CommentElement} sel={selectable} onDE={handleDragEnd} onSelect={handleElementSelect} onEdit={() => setEditingTextId(el.id)} />;
            if (el.type === 'text') node = <Text id={el.id} x={el.x} y={el.y} text={el.text} align={el.align || 'center'} fontSize={el.fontSize} fontFamily={el.fontFamily} fill={el.color} width={el.width} rotation={el.rotation || 0} draggable={selectable} onDragEnd={handleDragEnd} onTransformEnd={handleTransformEnd} onClick={handleElementSelect} onTap={handleElementSelect} onDblClick={() => setEditingTextId(el.id)} onDblTap={() => setEditingTextId(el.id)} />;
            return isPresenting ? <AnimatedReveal key={el.id} show={index < presentationStep} effect={revealEffect}>{node}</AnimatedReveal> : <React.Fragment key={el.id}>{node}</React.Fragment>;
          })}
          {elements.filter(element => element.isLocked && selectedElements.includes(element.id)).map(element => <Group key={`lock-${element.id}`} x={element.x} y={element.y - 38} onClick={(event) => { event.cancelBubble = true; toggleLock(element.id); }} onTap={(event) => { event.cancelBubble = true; toggleLock(element.id); }}><Rect width={36} height={30} fill="#292524" cornerRadius={10} shadowColor="#000" shadowBlur={8} shadowOpacity={.22}/><Text text="🔒" width={36} height={30} align="center" verticalAlign="middle" fontSize={16}/></Group>)}
          {sel && <Transformer ref={transformerRef} anchorCornerRadius={4} anchorFill="#fff" anchorStroke="#ef4444" borderStroke="#ef4444" borderDash={[4, 2]} boundBoxFunc={(o, n) => (n.width < 10 || n.height < 10) ? o : n} />}
        </Layer>
        <Layer ref={liveLayerRef} />
      </Stage>

      {isPresenting && (
        <div className="absolute inset-x-0 bottom-0 z-[70] pointer-events-none flex justify-center p-3 sm:p-6" dir="rtl" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
          {presentationPanelOpen ? <div className="pointer-events-auto w-full max-w-2xl rounded-[22px] border border-white/25 bg-stone-950/92 p-3 sm:p-4 text-white shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-[#e5484d] flex items-center justify-center"><Sparkles size={15}/></span><div><p className="text-sm font-bold">العرض</p><p className="text-[10px] text-white/60">حاجة {Math.min(presentationStep, elements.length)} من {elements.length}</p></div></div>
              <div className="flex gap-1"><button onClick={() => setPresentationPanelOpen(false)} title="صغّر أدوات العرض" className="w-8 h-8 rounded-xl hover:bg-white/10 text-white/70"><PanelRightOpen size={17}/></button><button onClick={() => { setPresentationPlaying(false); setIsPresenting(false); }} className="w-8 h-8 rounded-xl hover:bg-white/10 text-white/70 hover:text-white"><X size={18}/></button></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['fade', 'تلاشي'], ['pop', 'نبضة'], ['drop', 'من فوق'], ['left', 'من الشمال'], ['right', 'من اليمين'], ['bottom', 'من تحت'], ['zoom', 'تكبير'], ['flip', 'قلب'],
                ] as [RevealEffect, string][]).map(([effect, label]) => <button key={effect} onClick={() => setRevealEffect(effect)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${revealEffect === effect ? 'bg-[#e5484d] text-white' : 'bg-white/10 text-white/75 hover:bg-white/20'}`}>{label}</button>)}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-1.5"><Timer size={14} className="text-white/65"/><input aria-label="وقت ظهور كل حاجة" type="range" min="0.15" max="8" step="0.05" value={presentationDelay} onChange={e => setPresentationDelay(Number(e.target.value))} className="w-20 accent-[#e5484d]"/><span className="w-9 text-center text-xs font-bold">{presentationDelay < 1 ? `${presentationDelay * 1000}ms` : `${presentationDelay}ث`}</span></div>
            </div>
            <div className="mt-3 flex rounded-xl bg-white/10 p-1"><button onClick={() => { setPresentationMode('auto'); setPresentationPlaying(false); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${presentationMode === 'auto' ? 'bg-white text-stone-900' : 'text-white/70'}`}>لوحده</button><button onClick={() => { setPresentationMode('manual'); setPresentationPlaying(false); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${presentationMode === 'manual' ? 'bg-white text-stone-900' : 'text-white/70'}`}>بإيدك</button></div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setPresentationStep(presentationMode === 'manual' ? 0 : 1); setPresentationPlaying(presentationMode === 'auto'); setPresentationPanelOpen(false); }} disabled={!elements.length} className="flex-1 rounded-xl bg-[#e5484d] hover:bg-[#cf3f45] disabled:bg-white/15 py-2.5 text-sm font-bold transition-colors"><Play size={15} fill="currentColor" className="inline ml-1.5"/>{presentationMode === 'manual' ? 'ابدأ بإيدك' : 'ابدأ العرض لوحده'}</button>
              <button onClick={() => setPresentationPlaying(v => !v)} disabled={presentationMode === 'manual' || !presentationStep || presentationStep >= elements.length} className="w-11 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40">{presentationPlaying ? <Pause size={17} className="mx-auto"/> : <Play size={17} className="mx-auto"/>}</button>
              <button onClick={() => { setPresentationPlaying(false); setPresentationStep(0); }} className="w-11 rounded-xl bg-white/10 hover:bg-white/20"><RotateCcw size={17} className="mx-auto"/></button>
            </div>
          </div> : <div className="pointer-events-auto fixed bottom-5 left-5 flex gap-2"><button onPointerDown={presentationMode === 'manual' ? startPresentationPress : undefined} onPointerUp={presentationMode === 'manual' ? endPresentationPress : undefined} onPointerLeave={presentationMode === 'manual' ? endPresentationPress : undefined} onClick={() => presentationMode === 'manual' ? nextPresentation() : setPresentationPanelOpen(true)} className="flex h-14 min-w-14 items-center justify-center rounded-2xl bg-[#e5484d] px-4 text-white shadow-lg"><ChevronLeft size={24}/>{presentationMode === 'manual' && <span className="mr-1 text-xs font-bold">اللي بعده</span>}</button><button onClick={() => setPresentationPanelOpen(true)} className="h-14 w-14 rounded-2xl bg-stone-900 text-white shadow-lg"><Settings2 size={19} className="mx-auto"/></button></div>}
        </div>
      )}

      {editingTextId && (() => {
        const el = elements.find(e => e.id === editingTextId) as any;
        if (!el) return null;
        const screenX = el.x * stageScale + stagePos.x;
        const screenY = el.y * stageScale + stagePos.y;
        const dimensions = el.type === 'comment' ? commentSize(el as CommentElement) : { width: Math.max(200, el.width), height: Math.max(60, el.height || 60) };
        return <div contentEditable suppressContentEditableWarning role="textbox" aria-label="اكتب مباشرة على الصفحة" dir="auto"
          ref={(node) => { if (!node || node.dataset.focused) return; node.dataset.focused = 'true'; requestAnimationFrame(() => { node.focus(); const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(node); selection?.removeAllRanges(); selection?.addRange(range); }); }}
          className="absolute z-50 whitespace-pre-wrap break-words outline-none"
          style={{ top: screenY, left: screenX, width: dimensions.width * stageScale, minHeight: dimensions.height * stageScale, padding: `${Math.max(0, 8 * stageScale)}px`, background: 'transparent', border: 'none', boxShadow: 'none', fontSize: el.fontSize * stageScale, lineHeight: 1.32, fontFamily: el.fontFamily, color: el.type === 'comment' ? el.color : el.color, textAlign: el.align || 'center', caretColor: el.type === 'comment' ? el.color : el.color }}
          onInput={(event) => { const text = event.currentTarget.innerText.replace(/\n$/, ''); setElements(current => current.map(item => item.id === el.id ? { ...item, text } as CanvasElement : item)); }}
          onKeyDown={(event) => { if (event.key === 'Escape' || ((event.ctrlKey || event.metaKey) && event.key === 'Enter')) (event.currentTarget as HTMLDivElement).blur(); }}
          onBlur={(event) => { const id = editingTextId; const text = event.currentTarget.innerText.replace(/\n$/, ''); setEditingTextId(null); if (id) { const next = elements.map(item => item.id === id ? { ...item, text } as CanvasElement : item); setElements(next); if (activePageId) db.pages.update(activePageId, { elements: next, updatedAt: Date.now() }); } }}
        >{el.text}</div>;
      })()}

    </div>
  );
};
