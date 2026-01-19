
import React from 'react';
import { PageId, PageSettings, ElementData } from '../types';
import EditableElement from './EditableElement';

interface CanvasProps {
  pageId: PageId;
  settings: PageSettings;
  onUpdate: (updates: Partial<PageSettings>) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  onDeleteElement: (id: string) => void;
  isPreviewMode: boolean;
}

const Canvas: React.FC<CanvasProps> = ({ 
  pageId, 
  settings, 
  onUpdate, 
  selectedElementId, 
  setSelectedElementId,
  onDeleteElement,
  isPreviewMode
}) => {
  const containerStyle: React.CSSProperties = {
    backgroundColor: settings.bgType === 'color' ? settings.background : 'transparent',
    backgroundImage: settings.bgType === 'image' ? `url(${settings.background})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    minHeight: 'calc(100vh - 64px)',
    position: 'relative'
  };

  const handleElementUpdate = (elementId: string, updates: Partial<ElementData>) => {
    const newElements = settings.elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    );
    onUpdate({ elements: newElements });
  };

  const handleClickCanvas = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPreviewMode) {
      setSelectedElementId(null);
    }
  };

  return (
    <div 
      style={containerStyle} 
      className={`canvas-container shadow-inner transition-colors duration-500 ${isPreviewMode ? 'cursor-default' : ''}`}
      onClick={handleClickCanvas}
    >
      {settings.elements.map((element) => (
        <EditableElement
          key={element.id}
          element={element}
          isSelected={!isPreviewMode && selectedElementId === element.id}
          onSelect={() => !isPreviewMode && setSelectedElementId(element.id)}
          onUpdate={(updates) => handleElementUpdate(element.id, updates)}
          onDelete={() => onDeleteElement(element.id)}
          isPreviewMode={isPreviewMode}
        />
      ))}

      {settings.elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 select-none">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-400">Página Vazia</h2>
            <p className="text-xl text-gray-400">Use o menu abaixo para começar a criar.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
