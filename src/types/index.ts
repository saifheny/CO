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

export type MediaFrameStyle = 'solid' | 'dashed' | 'double' | 'polaroid' | 'neon' | 'film' | 'cinema' | 'tape' | 'shadow';

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
  cropShape?: 'rectangle' | 'circle' | 'rounded';
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: MediaFrameStyle;
  caption?: string;
  /** Position is relative to the top-left of the image, so the comment can be dragged independently. */
  captionX?: number;
  captionY?: number;
  fontFamily?: string;
  backgroundRemoved?: boolean;
}

export interface VideoElement extends BaseElement {
  type: 'video';
  src: string;
  width: number;
  height: number;
  muted?: boolean;
  playing?: boolean;
  cropShape?: 'rectangle' | 'circle' | 'rounded';
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: MediaFrameStyle;
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

export type CanvasElement = StrokeElement | TextElement | ImageElement | VideoElement | ShapeElement;

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
