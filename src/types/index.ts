export type ToolType = 'select' | 'pan' | 'pen' | 'pencil' | 'brush' | 'calligraphy' | 'highlighter' | 'eraser' | 'lasso' | 'text' | 'image' | 'shape';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  isLocked?: boolean;
}

export interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'pencil' | 'brush' | 'calligraphy' | 'highlighter' | 'eraser';
  opacity?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  width: number;
  height?: number;
  fontWeight?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
  cropShape?: 'rectangle' | 'circle' | 'rounded';
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'double' | 'polaroid';
  caption?: string;
  fontFamily?: string;
  backgroundRemoved?: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'line' | 'arrow';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type CanvasElement = StrokeElement | TextElement | ImageElement | ShapeElement;

export interface Page {
  id: string;
  notebookId: string;
  title: string;
  order: number;
  elements: CanvasElement[];
  background: {
    type: 'color' | 'grid' | 'lines' | 'dots' | 'dark' | 'cream';
    value: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  workspaceId: string;
  title: string;
  coverColor: string;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
