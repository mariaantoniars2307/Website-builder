
export type PageId = 'home' | 'sobre' | 'utopia' | 'contribua' | 'mapa';

export type ElementType = 'image' | 'text' | 'video';

export interface ElementData {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string; // URL/Base64 para imagem/vídeo, Texto para box
  link?: string;
  fontSize?: number;
  zIndex: number;
}

export interface PageSettings {
  background: string;
  bgType: 'color' | 'image';
  elements: ElementData[];
}

export type AppState = Record<PageId, PageSettings>;

export const INITIAL_PAGES: PageId[] = ['home', 'sobre', 'utopia', 'contribua', 'mapa'];

export const PAGE_LABELS: Record<PageId, string> = {
  home: 'Home',
  sobre: 'Sobre',
  utopia: 'Utopia Urbana',
  contribua: 'Contribua',
  mapa: 'Mapa'
};
