import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, RegularPolygon, Arrow, Transformer, Text, Image as KonvaImage, Group } from 'react-konva';
import { useStore } from '../../store/useStore';
import type { Point, StrokeElement, CanvasElement, ShapeElement } from '../../types';
import { getStroke } from 'perfect-freehand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Konva from 'konva';
import { Play, Pause, RotateCcw, X, Timer, Sparkles } from 'lucide-react';

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
  const fill = bg.type === 'dark' ? '#1e1e2e' : bg.type === 'cream' ? '#fdf6e3' : '#ffffff';
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

const ImgNode = React.memo(({ el, sel, onDE, onTE, onSelect }: any) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const i = new window.Image(); i.src = el.src; i.onload = () => setImg(i); }, [el.src]);
  if (!img) return null;

  const borderW = el.borderWidth || 0;
  const borderColor = el.borderColor || '#000000';
  const borderStyle = el.borderStyle || 'solid';
  const isCircle = el.cropShape === 'circle';
  const isRounded = el.cropShape === 'rounded';
  const r = Math.min(24, el.width / 4, el.height / 4);

  return (
    <Group id={el.id} x={el.x} y={el.y} rotation={el.rotation || 0} draggable={sel} onDragEnd={onDE} onTransformEnd={onTE} onClick={onSelect} onTap={onSelect}>
      {borderW > 0 && borderStyle === 'polaroid' && <Rect x={-12} y={-12} width={el.width + 24} height={el.height + 38} fill="#fff" cornerRadius={isRounded ? r + 4 : 5} shadowColor="#000" shadowBlur={12} shadowOpacity={0.18} listening={false} />}
      <Group width={el.width} height={el.height}
        clipFunc={(ctx: any) => {
          if (isCircle) { ctx.arc(el.width / 2, el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2); }
          else if (isRounded) { ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(el.width - r, 0); ctx.quadraticCurveTo(el.width, 0, el.width, r); ctx.lineTo(el.width, el.height - r); ctx.quadraticCurveTo(el.width, el.height, el.width - r, el.height); ctx.lineTo(r, el.height); ctx.quadraticCurveTo(0, el.height, 0, el.height - r); ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath(); }
          else { ctx.rect(0, 0, el.width, el.height); }
        }}
      >
        <KonvaImage image={img} width={el.width} height={el.height} />
      </Group>
      
      {borderW > 0 && (<>
        <Rect width={el.width} height={el.height} stroke={borderColor} strokeWidth={borderW * 2}
          dash={borderStyle === 'dashed' ? [borderW * 2, borderW * 1.5] : []}
          cornerRadius={isCircle ? Math.max(el.width, el.height) : isRounded ? r : 0} hitStrokeWidth={0} listening={false} />
        {borderStyle === 'double' && <Rect x={borderW * 3} y={borderW * 3} width={Math.max(1, el.width - borderW * 6)} height={Math.max(1, el.height - borderW * 6)} stroke={borderColor} strokeWidth={Math.max(1, borderW)} cornerRadius={isRounded ? Math.max(1, r - borderW * 3) : 0} listening={false} />}
      </>)}

      {el.caption && (<>
        <Rect x={-4} y={el.height + 10} width={el.width + 8} height={42} fill="#ffffff" opacity={0.96} cornerRadius={12} shadowColor="#000" shadowOpacity={0.10} shadowBlur={9} listening={false} />
        <Text text={el.caption} x={4} y={el.height + 15} width={el.width - 8} fontSize={15} fontFamily={el.fontFamily || "Cairo, Arial"} fill="#3f3f46" fontStyle="bold" align="center" padding={5} />
      </>)}
    </Group>
  );
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

type RevealEffect = 'fade' | 'pop' | 'drop' | 'left' | 'right' | 'bottom';

const AnimatedReveal: React.FC<{ show: boolean; effect: RevealEffect; children: React.ReactNode }> = ({ show, effect, children }) => {
  const ref = useRef<Konva.Group>(null);
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    if (!show) { group.visible(false); return; }
    const start = effect === 'left' ? { x: -90, y: 0 } : effect === 'right' ? { x: 90, y: 0 } : effect === 'bottom' ? { x: 0, y: 90 } : effect === 'drop' ? { x: 0, y: -100 } : { x: 0, y: 0 };
    const pop = effect === 'pop';
    group.setAttrs({ visible: true, opacity: 0, x: start.x, y: start.y, scaleX: pop ? 0.72 : 1, scaleY: pop ? 0.72 : 1 });
    group.to({ x: 0, y: 0, opacity: 1, scaleX: 1, scaleY: 1, duration: effect === 'fade' ? 0.55 : 0.48, easing: effect === 'drop' ? Konva.Easings.BounceEaseOut : Konva.Easings.EaseOut });
  }, [show, effect]);
  return <Group ref={ref}>{children}</Group>;
};

export const CanvasEditor: React.FC = () => {
  const { currentTool, penColor, penWidth, activeShape, activeFont, activePageId, selectedElements, setSelectedElements, setTool, editingTextId, setEditingTextId, isPresenting, setIsPresenting } = useStore();
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const liveLayerRef = useRef<any>(null);
  
  const isDrawing = useRef(false);
  const livePoints = useRef<Point[]>([]);
  const liveShape = useRef<Konva.Shape | null>(null);

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

  useEffect(() => { if (page?.elements) setElements(page.elements); }, [page?.elements]);
  useEffect(() => { if (isPresenting) { setPresentationPlaying(false); setPresentationStep(0); setSelectedElements([]); } }, [isPresenting, setSelectedElements]);
  useEffect(() => {
    if (!isPresenting || !presentationPlaying || presentationStep >= elements.length) return;
    const timer = window.setTimeout(() => setPresentationStep(s => Math.min(elements.length, s + 1)), presentationDelay * 1000);
    return () => window.clearTimeout(timer);
  }, [isPresenting, presentationPlaying, presentationStep, presentationDelay, elements.length]);
  useEffect(() => { setUndoStack([]); setRedoStack([]); }, [page?.id]);
  useEffect(() => { const fn = () => setSz({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const nodes = selectedElements.map(id => stageRef.current.findOne(`#${id}`)).filter(Boolean);
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
      const s: ShapeElement = { id: uuidv4(), type: 'shape', shapeType: activeShape, x: pos.x - 50, y: pos.y - 50, width: 100, height: 100, fill: activeShape === 'line' || activeShape === 'arrow' ? undefined : penColor, stroke: activeShape === 'line' || activeShape === 'arrow' ? penColor : undefined, strokeWidth: activeShape === 'line' || activeShape === 'arrow' ? penWidth : undefined };
      saveState([...elements, s]); setTool('select'); setSelectedElements([s.id]); return;
    }

    if (currentTool === 'text') {
      const t: CanvasElement = { id: uuidv4(), type: 'text', text: 'اكتب هنا...', fontFamily: activeFont, fontSize: 32, color: penColor, align: 'center', x: pos.x - 100, y: pos.y, width: 200 };
      saveState([...elements, t]); setTool('select'); setSelectedElements([t.id]); setEditingTextId(t.id); return;
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

  const handleDragEnd = (e: any) => {
    const id = getElementId(e.target);
    if (id) saveState(elements.map(el => el.id === id ? { ...el, x: e.target.x(), y: e.target.y() } : el));
  };
  
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
      if (el.type === 'image' || el.type === 'shape') {
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

  return (
    <div className="flex-1 overflow-hidden relative" style={{ cursor }}>
      <Stage width={sz.w} height={sz.h} ref={stageRef}
        x={stagePos.x} y={stagePos.y} scaleX={stageScale} scaleY={stageScale}
        draggable={isPan && !isPresenting} onDragEnd={(e) => { if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() }); }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        
        <Layer listening={true}><BgLayer bg={page?.background || { type: 'dots', value: '#fff' }} /></Layer>
        
        <Layer>
          {elements.map((el, index) => {
            let node: React.ReactNode = null;
            if (el.type === 'stroke') node = <StrokeNode el={el} sel={sel} onDE={handleDragEnd} onSelect={handleElementSelect} />;
            
            if (el.type === 'shape') {
              const s = el as ShapeElement;
              const props = { id: s.id, x: s.x, y: s.y, rotation: s.rotation || 0, draggable: sel, onDragEnd: handleDragEnd, onTransformEnd: handleTransformEnd, onClick: handleElementSelect, onTap: handleElementSelect };
              if (s.shapeType === 'rectangle') node = <Rect {...props} width={s.width} height={s.height} fill={s.fill} cornerRadius={8} />;
              if (s.shapeType === 'circle') node = <Circle {...props} radius={s.width / 2} fill={s.fill} />;
              if (s.shapeType === 'triangle') node = <RegularPolygon {...props} sides={3} radius={s.width / 2} fill={s.fill} />;
              if (s.shapeType === 'line') node = <Line {...props} points={[0, 0, s.width, s.height]} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              if (s.shapeType === 'arrow') node = <Arrow {...props} points={[0, 0, s.width, s.height]} stroke={s.stroke} fill={s.stroke} strokeWidth={s.strokeWidth} pointerLength={10} pointerWidth={10} />;
            }
            
            if (el.type === 'image') node = <ImgNode el={el} sel={sel} onDE={handleDragEnd} onTE={handleTransformEnd} onSelect={handleElementSelect} />;
            if (el.type === 'text') node = <Text id={el.id} x={el.x} y={el.y} text={el.text} align={el.align || 'center'} fontSize={el.fontSize} fontFamily={el.fontFamily} fill={el.color} width={el.width} rotation={el.rotation || 0} draggable={sel} onDragEnd={handleDragEnd} onTransformEnd={handleTransformEnd} onClick={handleElementSelect} onTap={handleElementSelect} onDblClick={() => setEditingTextId(el.id)} onDblTap={() => setEditingTextId(el.id)} />;
            return isPresenting ? <AnimatedReveal key={el.id} show={index < presentationStep} effect={revealEffect}>{node}</AnimatedReveal> : <React.Fragment key={el.id}>{node}</React.Fragment>;
          })}
          {sel && <Transformer ref={transformerRef} anchorCornerRadius={4} anchorFill="#fff" anchorStroke="#ef4444" borderStroke="#ef4444" borderDash={[4, 2]} boundBoxFunc={(o, n) => (n.width < 10 || n.height < 10) ? o : n} />}
        </Layer>
        <Layer ref={liveLayerRef} />
      </Stage>

      {isPresenting && (
        <div className="absolute inset-x-0 bottom-0 z-[70] pointer-events-none flex justify-center p-3 sm:p-6" dir="rtl" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
          <div className="pointer-events-auto w-full max-w-2xl rounded-[22px] border border-white/25 bg-stone-950/88 p-3 sm:p-4 text-white shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-[#e5484d] flex items-center justify-center"><Sparkles size={15}/></span><div><p className="text-sm font-bold">وضع العرض التفاعلي</p><p className="text-[10px] text-white/60">عنصر {Math.min(presentationStep, elements.length)} من {elements.length}</p></div></div>
              <button onClick={() => { setPresentationPlaying(false); setIsPresenting(false); }} className="w-8 h-8 rounded-xl hover:bg-white/10 text-white/70 hover:text-white"><X size={18}/></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['fade', 'تلاشي'], ['pop', 'نبضة'], ['drop', 'سقوط'], ['left', 'من اليسار'], ['right', 'من اليمين'], ['bottom', 'من أسفل'],
                ] as [RevealEffect, string][]).map(([effect, label]) => <button key={effect} onClick={() => setRevealEffect(effect)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${revealEffect === effect ? 'bg-[#e5484d] text-white' : 'bg-white/10 text-white/75 hover:bg-white/20'}`}>{label}</button>)}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-1.5"><Timer size={14} className="text-white/65"/><input aria-label="مدة ظهور كل عنصر" type="range" min="1" max="8" value={presentationDelay} onChange={e => setPresentationDelay(Number(e.target.value))} className="w-20 accent-[#e5484d]"/><span className="w-7 text-center text-xs font-bold">{presentationDelay}ث</span></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setPresentationStep(1); setPresentationPlaying(true); }} disabled={!elements.length} className="flex-1 rounded-xl bg-[#e5484d] hover:bg-[#cf3f45] disabled:bg-white/15 py-2.5 text-sm font-bold transition-colors"><Play size={15} fill="currentColor" className="inline ml-1.5"/>{presentationPlaying ? 'إعادة بدء العرض' : 'بدء العرض'}</button>
              <button onClick={() => setPresentationPlaying(v => !v)} disabled={!presentationStep || presentationStep >= elements.length} className="w-11 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40">{presentationPlaying ? <Pause size={17} className="mx-auto"/> : <Play size={17} className="mx-auto"/>}</button>
              <button onClick={() => { setPresentationPlaying(false); setPresentationStep(0); }} className="w-11 rounded-xl bg-white/10 hover:bg-white/20"><RotateCcw size={17} className="mx-auto"/></button>
            </div>
          </div>
        </div>
      )}

      {editingTextId && (() => {
        const el = elements.find(e => e.id === editingTextId) as any;
        if (!el) return null;
        const screenX = el.x * stageScale + stagePos.x;
        const screenY = el.y * stageScale + stagePos.y;
        return <textarea autoFocus className="absolute border-2 border-red-400 rounded-lg outline-none resize-none z-50 p-2 bg-white shadow-xl text-right" dir="rtl"
          style={{ top: screenY, left: screenX, width: Math.max(200, el.width) * stageScale, minHeight: 60 * stageScale, fontSize: el.fontSize * stageScale, fontFamily: el.fontFamily, color: el.color, textAlign: el.align || 'center' }}
          defaultValue={el.text} onBlur={(ev) => { const id = editingTextId; setEditingTextId(null); if (id) saveState(elements.map(e => e.id === id ? { ...e, text: ev.target.value } : e)); }} />;
      })()}

      <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white rounded-xl shadow-md border border-gray-200 p-1">
        <button onClick={() => { setStageScale(s => s * 0.8); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">-</button>
        <span className="text-xs font-mono font-medium text-gray-500 w-10 text-center">{Math.round(stageScale * 100)}%</span>
        <button onClick={() => { setStageScale(s => s * 1.2); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">+</button>
        <button onClick={() => { setStageScale(1); setStagePos({x:0, y:0}); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-xs text-gray-600">Reset</button>
      </div>
    </div>
  );
};
