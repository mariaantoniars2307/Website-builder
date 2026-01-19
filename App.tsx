
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Download, Upload, Eye, EyeOff, RefreshCw, Database, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AppState, PageId, INITIAL_PAGES, PAGE_LABELS, PageSettings, ElementData } from './types';
import Canvas from './components/Canvas';
import EditorMenu from './components/EditorMenu';
import { storage } from './storage';

const DEFAULT_PAGE: PageSettings = { background: '#ffffff', bgType: 'color', elements: [] };
const INITIAL_STATE: AppState = INITIAL_PAGES.reduce((acc, p) => ({ ...acc, [p]: { ...DEFAULT_PAGE } }), {} as AppState);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const isHydrated = useRef(false);

  // Carregar dados salvos
  useEffect(() => {
    storage.load().then(data => {
      if (data) setState(data);
      isHydrated.current = true;
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));
  }, []);

  // Salvar automaticamente sempre que o estado mudar
  useEffect(() => {
    if (!isLoaded || !isHydrated.current) return;
    const save = async () => {
      setSaveStatus('saving');
      try {
        await storage.save(state);
        setSaveStatus('saved');
      } catch { setSaveStatus('error'); }
    };
    const timer = setTimeout(save, 800);
    return () => clearTimeout(timer);
  }, [state, isLoaded]);

  // Atalho DELETE
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isPreviewMode) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        const page = window.location.hash.replace('#/', '') || 'home';
        deleteElement(page as PageId, selectedElementId);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedElementId, isPreviewMode]);

  const deleteElement = (pageId: PageId, id: string) => {
    setState(prev => ({
      ...prev, [pageId]: { ...prev[pageId], elements: prev[pageId].elements.filter(el => el.id !== id) }
    }));
    setSelectedElementId(null);
  };

  const addElements = (pageId: PageId, type: 'image' | 'text' | 'video', contents: string[]) => {
    setState(prev => {
      const page = prev[pageId];
      const maxZ = page.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const newEls = contents.map((c, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        type, x: 150 + (i * 30), y: 150 + (i * 30),
        width: type === 'text' ? 280 : 400, height: type === 'text' ? 120 : 300,
        rotation: 0, content: c, zIndex: maxZ + i + 1
      }));
      return { ...prev, [pageId]: { ...page, elements: [...page.elements, ...newEls] } };
    });
  };

  if (!isLoaded) return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <h2 className="font-bold text-slate-800">Iniciando Engine do Builder...</h2>
    </div>
  );

  return (
    <HashRouter>
      <div className={`min-h-screen flex flex-col ${isPreviewMode ? 'bg-white' : 'bg-slate-50'}`}>
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-[100]">
          <div className="flex items-center gap-4">
            <div className="font-black text-xl tracking-tighter flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px]">SB</div>
              SpatialBuilder
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              {saveStatus === 'saving' ? <RefreshCw size={12} className="animate-spin text-blue-500" /> : <ShieldCheck size={12} className="text-emerald-500" />}
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{saveStatus === 'saving' ? 'Salvando' : 'Protegido'}</span>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
            {INITIAL_PAGES.map(p => <NavBtn key={p} id={p} label={PAGE_LABELS[p]} />)}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsPreviewMode(!isPreviewMode)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isPreviewMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {isPreviewMode ? <EyeOff size={14} /> : <Eye size={14} />} {isPreviewMode ? 'Sair do Preview' : 'Visualizar'}
            </button>
            {!isPreviewMode && (
              <>
                <button onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
                  const a = document.createElement('a'); a.href = dataStr; a.download = "projeto_builder.json"; a.click();
                }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={18} /></button>
                <button onClick={() => document.getElementById('import-input')?.click()} className="p-2 text-slate-400 hover:text-purple-600 transition-colors">
                  <Upload size={18} /><input id="import-input" type="file" className="hidden" accept=".json" onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = (ev) => {
                      const json = JSON.parse(ev.target?.result as string);
                      if (confirm("Substituir projeto atual?")) { setState(json); storage.save(json).then(() => window.location.reload()); }
                    };
                    r.readAsText(f);
                  }} />
                </button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden">
          <Routes>
            {INITIAL_PAGES.map(p => (
              <Route key={p} path={p === 'home' ? '/' : `/${p}`} element={
                <Canvas 
                  pageId={p} settings={state[p]} selectedElementId={selectedElementId}
                  setSelectedElementId={setSelectedElementId} isPreviewMode={isPreviewMode}
                  onUpdate={upd => setState(prev => ({ ...prev, [p]: { ...prev[p], ...upd } }))}
                  onDeleteElement={id => deleteElement(p, id)}
                />
              } />
            ))}
          </Routes>
          {!isPreviewMode && (
            <EditorMenu 
              onAddImages={imgs => addElements(getCurrentPage(), 'image', imgs)}
              onAddVideos={vids => addElements(getCurrentPage(), 'video', vids)}
              onAddText={() => addElements(getCurrentPage(), 'text', ['Texto Editável'])}
              onUpdateBackground={(bg, type, all) => {
                if (all) {
                  const newState = { ...state };
                  INITIAL_PAGES.forEach(pg => { newState[pg] = { ...newState[pg], background: bg, bgType: type }; });
                  setState(newState);
                } else {
                  setState(prev => ({ ...prev, [getCurrentPage()]: { ...prev[getCurrentPage()], background: bg, bgType: type } }));
                }
              }}
            />
          )}
        </main>
      </div>
    </HashRouter>
  );
};

const getCurrentPage = () => (window.location.hash.replace('#/', '') || 'home') as PageId;

const NavBtn: React.FC<{ id: string; label: string }> = ({ id, label }) => {
  const loc = useLocation();
  const active = (id === 'home' && loc.pathname === '/') || loc.pathname === `/${id}`;
  return (
    <Link to={id === 'home' ? '/' : `/${id}`} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
      {label}
    </Link>
  );
};

export default App;
