
import React, { useState, useRef, useEffect } from 'react';
import { PageId, PageSettings, ElementData } from '../types';
import EditableElement from './EditableElement';

interface CanvasProps {
  pageId: PageId;
  settings: PageSettings;
  onUpdate: (updates: Partial<ElementData>, commit?: boolean) => void;
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  onElementsMove: (ids: string[], dx: number, dy: number, isFinal?: boolean) => void;
  onDeleteElements: (ids: string[]) => void;
  isPreviewMode: boolean;
}

const Canvas: React.FC<CanvasProps> = ({ 
  pageId, settings, onUpdate, selectedElementIds, 
  setSelectedElementIds, onElementsMove, onDeleteElements, isPreviewMode 
}) => {
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const startPos = useRef<{ x: number, y: number } | null>(null);

  const containerStyle: React.CSSProperties = {
    backgroundColor: settings.bgType === 'color' ? settings.background : 'transparent',
    backgroundImage: settings.bgType === 'image' ? `url(${settings.background})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    minHeight: 'calc(100vh - 64px)',
    position: 'relative',
    cursor: isPreviewMode ? 'default' : 'crosshair'
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    
    // Inicia seleção por laço apenas no fundo vazio
    if (e.target === canvasRef.current) {
      if (!e.shiftKey) setSelectedElementIds([]);
      startPos.current = { x: e.clientX, y: e.clientY };
      setSelectionRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPos.current || isPreviewMode) return;
    const x = Math.min(e.clientX, startPos.current.x);
    const y = Math.min(e.clientY, startPos.current.y);
    const w = Math.abs(e.clientX - startPos.current.x);
    const h = Math.abs(e.clientY - startPos.current.y);
    setSelectionRect({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!selectionRect || isPreviewMode) {
      startPos.current = null;
      setSelectionRect(null);
      return;
    }

    // Filtra elementos que estão dentro da caixa de seleção
    const newlySelected = settings.elements.filter(el => {
      const elBox = { l: el.x, t: el.y, r: el.x + el.width, b: el.y + el.height };
      const selBox = {
        l: selectionRect.x,
        t: selectionRect.y - 64, // Compensação do Header
        r: selectionRect.x + selectionRect.w,
        b: selectionRect.y + selectionRect.h - 64
      };
      return !(elBox.l > selBox.r || elBox.r < selBox.l || elBox.t > selBox.b || elBox.b < selBox.t);
    }).map(el => el.id);

    if (newlySelected.length > 0) {
      setSelectedElementIds(Array.from(new Set([...selectedElementIds, ...newlySelected])));
    }

    startPos.current = null;
    setSelectionRect(null);
  };

  return (
    <div 
      ref={canvasRef}
      style={containerStyle} 
      className="canvas-container shadow-inner outline-none select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {settings.elements.map((element) => (
        <EditableElement
          key={element.id}
          element={element}
          isSelected={selectedElementIds.includes(element.id)}
          onSelect={(multi) => {
            if (isPreviewMode) return;
            if (multi) {
              setSelectedElementIds(selectedElementIds.includes(element.id) 
                ? selectedElementIds.filter(id => id !== element.id)
                : [...selectedElementIds, element.id]
              );
            } else {
              if (!selectedElementIds.includes(element.id)) setSelectedElementIds([element.id]);
            }
          }}
          onUpdate={onUpdate}
          onDrag={(dx, dy, isFinal) => {
            const idsToMove = selectedElementIds.includes(element.id) ? selectedElementIds : [element.id];
            onElementsMove(idsToMove, dx, dy, isFinal);
          }}
          onDelete={() => onDeleteElements([element.id])}
          isPreviewMode={isPreviewMode}
        />
      ))}

      {selectionRect && (
        <div 
          className="fixed border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-[2000] rounded-sm backdrop-blur-[2px]"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.w,
            height: selectionRect.h
          }}
        />
      )}
    </div>
  );
};

export default Canvas;
