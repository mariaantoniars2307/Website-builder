
import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Link as LinkIcon, RotateCw } from 'lucide-react';
import { ElementData, PAGE_LABELS, PageId } from '../types';

interface EditableElementProps {
  element: ElementData;
  isSelected: boolean;
  onSelect: (multi: boolean) => void;
  onUpdate: (updates: Partial<ElementData>, commit?: boolean) => void;
  onDrag: (dx: number, dy: number, isFinal?: boolean) => void;
  onDelete: () => void;
  isPreviewMode: boolean;
}

const EditableElement: React.FC<EditableElementProps> = ({
  element, isSelected, onSelect, onUpdate, onDrag, onDelete, isPreviewMode
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [tempLink, setTempLink] = useState(element.link || '');
  
  const lastMousePos = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) {
      if (element.link) navigateToLink();
      return;
    }

    onSelect(e.shiftKey);
    
    if ((e.target as HTMLElement).closest('.element-handle') || 
        (e.target as HTMLElement).closest('.rotate-handle') || 
        (e.target as HTMLElement).closest('.action-btn') || 
        (e.target as HTMLElement).closest('.link-editor')) {
      return;
    }

    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPreviewMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      if (isDragging) {
        onDrag(dx, dy, false);
      } else if (isResizing) {
        const rect = elementRef.current?.getBoundingClientRect();
        if (!rect) return;
        let newWidth = element.width;
        let newHeight = element.height;
        if (isResizing.includes('e')) newWidth = Math.max(50, e.clientX - rect.left);
        if (isResizing.includes('s')) newHeight = Math.max(20, e.clientY - rect.top);
        onUpdate({ id: element.id, width: newWidth, height: newHeight }, false);
      } else if (isRotating) {
        const rect = elementRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const deg = (angle * 180) / Math.PI - 90;
        onUpdate({ id: element.id, rotation: deg }, false);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) onDrag(0, 0, true);
      if (isResizing || isRotating) onUpdate({ id: element.id }, true);
      
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
  }, [isDragging, isResizing, isRotating, element, onUpdate, onDrag, isPreviewMode]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
    cursor: isPreviewMode ? (element.link ? 'pointer' : 'default') : (isDragging ? 'grabbing' : 'grab'),
    userSelect: 'none',
    border: isSelected ? '2px solid #3b82f6' : 'none',
    transition: isDragging || isResizing || isRotating ? 'none' : 'all 0.1s ease-out',
  };

  const navigateToLink = () => {
    if (!element.link) return;
    if (element.link.startsWith('http')) window.open(element.link, '_blank');
    else window.location.hash = element.link === 'home' ? '#/' : `#/${element.link}`;
  };

  const renderContent = () => {
    switch (element.type) {
      case 'image': return <img src={element.content} className="w-full h-full object-cover pointer-events-none" />;
      case 'video': return <video src={element.content} className="w-full h-full object-cover pointer-events-none" autoPlay muted loop playsInline />;
      case 'text': return <textarea className="w-full h-full bg-transparent resize-none border-none outline-none text-center p-2 overflow-hidden flex items-center justify-center font-medium" style={{ fontSize: `${element.fontSize || 18}px` }} value={element.content} onChange={(e) => onUpdate({ id: element.id, content: e.target.value }, false)} onBlur={() => onUpdate({ id: element.id }, true)} readOnly={isPreviewMode} />;
      default: return null;
    }
  };

  return (
    <div ref={elementRef} style={style} className={`group ${isSelected ? 'selected' : ''}`} onMouseDown={onMouseDown}>
      <div className="w-full h-full overflow-hidden flex items-center justify-center relative rounded-sm group-hover:shadow-md transition-shadow">
        {renderContent()}
      </div>

      {isSelected && !isPreviewMode && (
        <>
          <div className="rotate-line"></div>
          <div className="rotate-handle" onMouseDown={(e) => { e.stopPropagation(); setIsRotating(true); }}><RotateCw size={12} className="text-white" /></div>
          <div className="element-handle" style={{ bottom: -7, right: -7, cursor: 'nwse-resize' }} onMouseDown={(e) => { e.stopPropagation(); setIsResizing('se'); }}></div>
          
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white shadow-xl p-1 rounded-xl border border-gray-100 z-[1001]">
            <button className="action-btn p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={14} /></button>
            <button className={`action-btn p-1.5 rounded-lg transition-colors ${isEditingLink ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-600'}`} onClick={(e) => { e.stopPropagation(); setIsEditingLink(!isEditingLink); }}><LinkIcon size={14} /></button>
          </div>

          {isEditingLink && (
            <div className="link-editor absolute -top-[230px] left-1/2 -translate-x-1/2 z-[1500] bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[260px]" onMouseDown={e => e.stopPropagation()}>
              <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">Destino do Link</h3>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {(Object.keys(PAGE_LABELS) as PageId[]).map(pid => (
                  <button key={pid} onClick={() => { onUpdate({ id: element.id, link: pid }, true); setIsEditingLink(false); }} className={`px-2 py-1.5 text-[9px] font-bold rounded-lg border text-left transition-colors ${element.link === pid ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>{PAGE_LABELS[pid]}</button>
                ))}
              </div>
              <input type="text" className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-blue-400 transition-all" value={tempLink} onChange={e => setTempLink(e.target.value)} onBlur={() => onUpdate({ id: element.id, link: tempLink }, true)} placeholder="https://exemplo.com" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditableElement;
