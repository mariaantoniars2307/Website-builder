
import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Link as LinkIcon, ExternalLink, RotateCw, ChevronUp, ChevronDown, Check, Play } from 'lucide-react';
import { ElementData, PAGE_LABELS, PageId } from '../types';

interface EditableElementProps {
  element: ElementData;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ElementData>) => void;
  onDelete: () => void;
  isPreviewMode: boolean;
}

const EditableElement: React.FC<EditableElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  isPreviewMode
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [tempLink, setTempLink] = useState(element.link || '');
  
  const elementRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) {
      if (element.link) navigateToLink();
      return;
    }

    if (!isSelected) {
      onSelect();
      return;
    }
    
    if ((e.target as HTMLElement).closest('.element-handle') || 
        (e.target as HTMLElement).closest('.rotate-handle') || 
        (e.target as HTMLElement).closest('.action-btn') || 
        (e.target as HTMLElement).closest('.link-editor')) {
      return;
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - element.x,
      y: e.clientY - element.y
    });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPreviewMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onUpdate({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      } else if (isResizing) {
        const rect = elementRef.current?.getBoundingClientRect();
        if (!rect) return;
        let newWidth = element.width;
        let newHeight = element.height;
        if (isResizing.includes('e')) newWidth = Math.max(50, e.clientX - rect.left);
        if (isResizing.includes('s')) newHeight = Math.max(20, e.clientY - rect.top);
        onUpdate({ width: newWidth, height: newHeight });
      } else if (isRotating) {
        const rect = elementRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const deg = (angle * 180) / Math.PI - 90;
        onUpdate({ rotation: deg });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setIsRotating(false);
    };

    if (isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isRotating, dragOffset, element, onUpdate, isPreviewMode]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
    cursor: isPreviewMode ? (element.link ? 'pointer' : 'default') : (isDragging ? 'grabbing' : 'grab'),
    userSelect: isPreviewMode ? 'auto' : 'none',
    border: isSelected ? '2px solid #3b82f6' : 'none',
    transition: isDragging || isResizing || isRotating ? 'none' : 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const handleLinkSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onUpdate({ link: tempLink });
    setIsEditingLink(false);
  };

  const navigateToLink = () => {
    if (!element.link) return;
    if (element.link.startsWith('http')) {
      window.open(element.link, '_blank');
    } else {
      window.location.hash = element.link === 'home' ? '#/' : `#/${element.link}`;
    }
  };

  const changeZIndex = (delta: number) => {
    onUpdate({ zIndex: Math.max(1, element.zIndex + delta) });
  };

  const renderContent = () => {
    switch (element.type) {
      case 'image':
        return (
          <img 
            src={element.content} 
            alt="User content" 
            className="w-full h-full object-cover pointer-events-none select-none" 
          />
        );
      case 'video':
        return (
          <div className="w-full h-full bg-black relative">
            <video 
              src={element.content}
              className="w-full h-full object-cover pointer-events-none"
              autoPlay
              muted
              loop
              playsInline
            />
            {!isPreviewMode && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play size={24} className="text-white opacity-50" />
              </div>
            )}
          </div>
        );
      case 'text':
        return (
          <textarea
            className={`w-full h-full bg-transparent resize-none border-none outline-none text-center p-2 overflow-hidden flex items-center justify-center ${isPreviewMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{ fontSize: `${element.fontSize || 18}px` }}
            value={element.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Digite aqui..."
            readOnly={isPreviewMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={elementRef}
      style={style}
      className={`group ${isSelected ? 'selected' : ''}`}
      onMouseDown={onMouseDown}
    >
      <div className="w-full h-full overflow-hidden flex items-center justify-center relative rounded-sm transition-shadow group-hover:shadow-lg">
        {renderContent()}
        
        {isPreviewMode && element.link && (
          <div className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/10 transition-colors flex items-center justify-center group/link">
            <ExternalLink size={24} className="text-white opacity-0 group-hover/link:opacity-100 transition-opacity drop-shadow-md" />
          </div>
        )}
      </div>

      {isSelected && !isPreviewMode && (
        <>
          <div className="rotate-line"></div>
          <div 
            className="rotate-handle" 
            onMouseDown={(e) => { e.stopPropagation(); setIsRotating(true); }}
            title="Girar"
          >
            <RotateCw size={12} className="text-white" />
          </div>

          <div className="element-handle" style={{ bottom: -7, right: -7, cursor: 'nwse-resize' }} onMouseDown={(e) => { e.stopPropagation(); setIsResizing('se'); }}></div>
          <div className="element-handle" style={{ bottom: -7, left: -7, cursor: 'nesw-resize' }} onMouseDown={(e) => { e.stopPropagation(); setIsResizing('sw'); }}></div>
          <div className="element-handle" style={{ top: -7, right: -7, cursor: 'nesw-resize' }} onMouseDown={(e) => { e.stopPropagation(); setIsResizing('ne'); }}></div>
          <div className="element-handle" style={{ top: -7, left: -7, cursor: 'nwse-resize' }} onMouseDown={(e) => { e.stopPropagation(); setIsResizing('nw'); }}></div>

          <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-gray-100 min-w-max">
            <button 
              className="action-btn p-2 hover:bg-blue-50 rounded-xl text-gray-400 hover:text-blue-600 transition-all flex flex-col items-center gap-0.5"
              onClick={(e) => { e.stopPropagation(); changeZIndex(1); }}
              title="Trazer para Frente"
            >
              <ChevronUp size={16} />
              <span className="text-[7px] font-black uppercase">Frente</span>
            </button>
            <button 
              className="action-btn p-2 hover:bg-blue-50 rounded-xl text-gray-400 hover:text-blue-600 transition-all flex flex-col items-center gap-0.5"
              onClick={(e) => { e.stopPropagation(); changeZIndex(-1); }}
              title="Enviar para Trás"
            >
              <ChevronDown size={16} />
              <span className="text-[7px] font-black uppercase">Trás</span>
            </button>
            
            <div className="w-px h-6 bg-gray-100 mx-1"></div>

            <button 
              className={`action-btn p-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${isEditingLink ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
              onClick={(e) => { e.stopPropagation(); setIsEditingLink(!isEditingLink); }}
              title="Adicionar Link"
            >
              <LinkIcon size={16} />
              <span className="text-[7px] font-black uppercase">Link</span>
            </button>
            <button 
              className="action-btn p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-all flex flex-col items-center gap-0.5"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Excluir Elemento"
            >
              <Trash2 size={16} />
              <span className="text-[7px] font-black uppercase">Excluir</span>
            </button>
          </div>

          {isEditingLink && (
            <div 
              className="link-editor absolute -top-[280px] left-1/2 -translate-x-1/2 z-[150] bg-white p-6 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.25)] border border-gray-100 min-w-[320px] animate-in zoom-in-95 duration-200"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon size={16} className="text-blue-500" />
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Configurar Destino</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Páginas Internas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(PAGE_LABELS) as PageId[]).map(pid => (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => { setTempLink(pid); }}
                        className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition-all text-left flex items-center justify-between ${tempLink === pid ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'}`}
                      >
                        {PAGE_LABELS[pid]}
                        {tempLink === pid && <Check size={10} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gray-100"></div>

                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Link Externo (URL)</label>
                  <input 
                    type="text" 
                    autoFocus
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 focus:bg-white transition-all"
                    value={tempLink}
                    onChange={(e) => setTempLink(e.target.value)}
                    placeholder="https://exemplo.com"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditingLink(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600 px-4 py-2">Cancelar</button>
                  <button 
                    onClick={() => handleLinkSubmit()}
                    className="text-xs font-black uppercase tracking-wider bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2"
                  >
                    Salvar Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditableElement;
