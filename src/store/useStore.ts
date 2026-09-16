import { create } from 'zustand';
import type { CommentStyle, ShapeType, ToolType } from '../types';

interface AppState {
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  
  penColor: string;
  setPenColor: (color: string) => void;
  
  penWidth: number;
  setPenWidth: (width: number) => void;

  activeShape: ShapeType;
  setActiveShape: (shape: ShapeType) => void;

  activeFont: string;
  setActiveFont: (font: string) => void;

  activeCommentStyle: CommentStyle;
  setActiveCommentStyle: (style: CommentStyle) => void;

  selectedElements: string[];
  setSelectedElements: (ids: string[]) => void;
  
  zoom: number;
  setZoom: (zoom: number) => void;
  
  activeNotebookId: string | null;
  setActiveNotebookId: (id: string | null) => void;

  activePageId: string | null;
  setActivePageId: (id: string | null) => void;
  
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;

  view: 'home' | 'canvas';
  setView: (view: 'home' | 'canvas') => void;

  isPresenting: boolean;
  setIsPresenting: (value: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  currentTool: 'pen',
  setTool: (tool) => set({ currentTool: tool }),
  
  penColor: '#000000',
  setPenColor: (color) => set({ penColor: color }),
  
  penWidth: 4,
  setPenWidth: (width) => set({ penWidth: width }),

  activeShape: 'rectangle',
  setActiveShape: (shape) => set({ activeShape: shape }),

  activeFont: 'Cairo',
  setActiveFont: (font) => set({ activeFont: font }),

  activeCommentStyle: 'speech',
  setActiveCommentStyle: (style) => set({ activeCommentStyle: style }),

  selectedElements: [],
  setSelectedElements: (ids) => set({ selectedElements: ids }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom }),

  activeNotebookId: null,
  setActiveNotebookId: (id) => set({ activeNotebookId: id }),

  activePageId: null,
  setActivePageId: (id) => set({ activePageId: id }),

  editingTextId: null,
  setEditingTextId: (id) => set({ editingTextId: id }),

  view: 'home',
  setView: (view) => set({ view }),

  isPresenting: false,
  setIsPresenting: (isPresenting) => set({ isPresenting }),
}));
