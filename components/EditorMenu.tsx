
import React, { useState } from 'react';
import { Plus, Image as ImageIcon, Type, Palette, Layout, Check, Globe, Loader2, Video } from 'lucide-react';

interface EditorMenuProps {
  onAddImages: (urls: string[]) => void;
  onAddText: () => void;
  onAddVideos: (urls: string[]) => void;
  onUpdateBackground: (background: string, type: 'color' | 'image', applyToAll: boolean) => void;
}

const EditorMenu: React.FC<EditorMenuProps> = ({ 
  onAddImages, 
  onAddText, 
  onAddVideos,
  onUpdateBackground 
}) => {
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Função Crítica: Comprime e redimensiona para evitar Out of Memory
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Limite de 1200px para manter performance
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Converte para JPEG com 0.7 de qualidade (Reduz ~90% do tamanho original)
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressed);
        };
      };
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true);
      try {
        const processedImages = await Promise.all(
          Array.from(files).map((file: File) => processImage(file))
        );
        onAddImages(processedImages);
      } catch (error) {
        console.error("Erro ao processar imagens:", error);
      } finally {
        setIsProcessing(false);
        e.target.value = '';
      }
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true);
      try {
        const base64s = await Promise.all(
          Array.from(files).map((file: File) => fileToBase64(file))
        );
        onAddVideos(base64s);
      } catch (error) {
        console.error("Erro ao processar vídeos:", error);
      } finally {
        setIsProcessing(false);
        e.target.value = '';
      }
    }
  };

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const compressedBg = await processImage(file);
        onUpdateBackground(compressedBg, 'image', applyToAll);
      } catch (error) {
        console.error("Erro ao processar fundo:", error);
      } finally {
        setIsProcessing(false);
        e.target.value = '';
      }
    }
  };

  const colors = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
    '#fee2e2', '#fef3c7', '#ecfdf5', '#eff6ff',
    '#fecaca', '#fde68a', '#a7f3d0', '#bfdbfe',
    '#1e293b', '#0f172a', '#000000'
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-3xl px-6 py-4 flex items-center space-x-6">
        
        {/* Imagens */}
        <label className="flex flex-col items-center group cursor-pointer relative">
          <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-all text-blue-600 group-active:scale-95">
            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-1.5">Fotos</span>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>

        {/* Vídeos */}
        <label className="flex flex-col items-center group cursor-pointer relative">
          <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-red-100 transition-all text-red-600 group-active:scale-95">
            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Video size={20} />}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 mt-1.5">Vídeos</span>
          <input 
            type="file" 
            multiple 
            accept="video/*" 
            className="hidden" 
            onChange={handleVideoFileChange}
            disabled={isProcessing}
          />
        </label>

        <div className="w-px h-10 bg-gray-200/60"></div>

        {/* Texto */}
        <button 
          onClick={onAddText}
          className="flex flex-col items-center group"
        >
          <div className="p-3 bg-purple-50 rounded-2xl group-hover:bg-purple-100 transition-all text-purple-600 group-active:scale-95">
            <Type size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mt-1.5">Texto</span>
        </button>

        <div className="w-px h-10 bg-gray-200/60"></div>

        {/* Fundo */}
        <div className="relative">
          <button 
            onClick={() => setShowBgPicker(!showBgPicker)}
            className="flex flex-col items-center group"
          >
            <div className={`p-3 rounded-2xl transition-all group-active:scale-95 ${showBgPicker ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'}`}>
              <Palette size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mt-1.5">Fundo</span>
          </button>

          {showBgPicker && (
            <>
              <div className="fixed inset-0 z-[-1]" onClick={() => setShowBgPicker(false)} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 w-72 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Personalizar</h3>
                  <label className="flex items-center cursor-pointer group">
                    <div 
                      onClick={(e) => { e.stopPropagation(); setApplyToAll(!applyToAll); }}
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center mr-2 transition-all ${applyToAll ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-100' : 'bg-white border-gray-200'}`}
                    >
                      {applyToAll && <Check size={12} className="text-white stroke-[3px]" />}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors">Global</span>
                  </label>
                </div>

                <div className="grid grid-cols-5 gap-2.5 mb-5">
                  {colors.map(color => (
                    <button
                      key={color}
                      className="w-full aspect-square rounded-xl border border-gray-100 hover:scale-110 active:scale-90 transition-all shadow-sm"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        onUpdateBackground(color, 'color', applyToAll);
                        if (!applyToAll) setShowBgPicker(false);
                      }}
                    />
                  ))}
                </div>

                <div className="w-full h-px bg-gray-50 mb-5"></div>

                <label className="flex items-center justify-center p-4 border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-orange-200 transition-all group/bg">
                  {isProcessing ? (
                    <Loader2 size={18} className="animate-spin text-orange-400" />
                  ) : (
                    <Globe size={18} className="text-gray-300 group-hover/bg:text-orange-400 transition-colors mr-3" />
                  )}
                  <span className="text-xs font-bold text-gray-400 group-hover/bg:text-gray-600">Usar Foto de Fundo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleBgFileChange} 
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorMenu;
