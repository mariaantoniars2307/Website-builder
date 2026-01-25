
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Download, Eye, EyeOff, RefreshCw, ShieldCheck, AlertTriangle, Loader2, Undo2, Redo2, Save, FileUp, FileDown, DatabaseBackup } from 'lucide-react';
import { AppState, PageId, INITIAL_PAGES, PAGE_LABELS, PageSettings, ElementData } from './types';
import Canvas from './components/Canvas';
import EditorMenu from './components/EditorMenu';
import { storage } from './storage';

const DEFAULT_PAGE: PageSettings = { background: '#ffffff', bgType: 'color', elements: [] };
const INITIAL_STATE: AppState = INITIAL_PAGES.reduce((acc, p) => ({ ...acc, [p]: { ...DEFAULT_PAGE } }), {} as AppState);

const MAX_HISTORY = 30;

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const lastSavedRef = useRef<string>("");

  const syncToDisk = useCallback(async (data: AppState) => {
    if (!isHydrated) return; // NUNCA salva antes de carregar o que já existe
    const dataStr = JSON.stringify(data);
    if (dataStr === lastSavedRef.current) return;
    
    setSaveStatus('saving');
    try {
      await storage.save(data);
      lastSavedRef.current = dataStr;
      setSaveStatus('saved');
      setLastSaveTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
      setSaveStatus('error');
    }
  }, [isHydrated]);

  const pushToHistory = useCallback((newState: AppState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newState)));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // CARREGAMENTO ÚNICO E SEGURO
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const saved = await storage.load();
        if (saved && Object.keys(saved).length > 0) {
          setState(saved);
          setHistory([JSON.parse(JSON.stringify(saved))]);
          lastSavedRef.current = JSON.stringify(saved);
        } else {
          setState(INITIAL_STATE);
          setHistory([JSON.parse(JSON.stringify(INITIAL_STATE))]);
          lastSavedRef.current = JSON.stringify(INITIAL_STATE);
        }
        setHistoryIndex(0);
        setLastSaveTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Erro no bootstrap:", e);
        setState(INITIAL_STATE);
      } finally {
        setIsHydrated(true);
      }
    };
    bootstrap();
  }, []);

  // AUTO-SALVAMENTO DEBIILITADO (SÓ DEPOIS DE CARREGAR)
  useEffect(() => {
    if (!isHydrated || !state) return;
    const timer = setTimeout(() => syncToDisk(state), 1000);
    return () => clearTimeout(timer);
  }, [state, isHydrated, syncToDisk]);

  const exportProject = () => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utopia-urbana-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as AppState;
        if (imported.home) {
          setState(imported);
          pushToHistory(imported);
          await storage.save(imported);
          alert("Projeto restaurado!");
        }
      } catch (err) {
        alert("Arquivo inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addElements = (pageId: PageId, type: 'image' | 'text' | 'video', contents: string[]) => {
    if (!state) return;
    const page = state[pageId];
    const maxZ = page.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
    const newEls = contents.map((c, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      type, x: 150 + (i * 30), y: 150 + (i * 30),
      width: type === 'text' ? 300 : 400, height: type === 'text' ? 100 : 300,
      rotation: 0, content: c, zIndex: maxZ + i + 1
    }));
    const newState = { ...state, [pageId]: { ...page, elements: [...page.elements, ...newEls] } };
    setState(newState);
    pushToHistory(newState);
  };

  const updateElement = (upd: Partial<ElementData>, commit = true) => {
    if (!state) return;
    const pageId = (window.location.hash.replace('#/', '') || 'home') as PageId;
    if (!state[pageId]) return;
    
    const newState = {
      ...state,
      [pageId]: { 
        ...state[pageId], 
        elements: state[pageId].elements.map(el => el.id === upd.id ? { ...el, ...upd } : el) 
      }
    };
    setState(newState);
    if (commit) pushToHistory(newState);
  };

  const moveElements = (pageId: PageId, ids: string[], dx: number, dy: number, isFinal = false) => {
    if (!state) return;
    setState(prev => {
      if (!prev) return null;
      const newState = {
        ...prev,
        [pageId]: {
          ...prev[pageId],
          elements: prev[pageId].elements.map(el => ids.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el)
        }
      };
      if (isFinal) pushToHistory(newState);
      return newState;
    });
  };

  const deleteElements = (ids: string[]) => {
    if (!state) return;
    const pageId = (window.location.hash.replace('#/', '') || 'home') as PageId;
    const newState = {
      ...state,
      [pageId]: { ...state[pageId], elements: state[pageId].elements.filter(el => !ids.includes(el.id)) }
    };
    setState(newState);
    pushToHistory(newState);
    setSelectedElementIds([]);
  };

  const forceReload = async () => {
    if (confirm("Deseja forçar a recarga dos dados do banco? Alterações não salvas serão perdidas.")) {
      window.location.reload();
    }
  };

  if (!isHydrated || !state) return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-blue-500 mb-6" size={56} />
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="text-emerald-400" size={24} />
        <h2 className="font-black text-2xl tracking-tighter uppercase">Proteção Ativada</h2>
      </div>
      <p className="text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase animate-pulse">Sincronizando Banco de Dados...</p>
    </div>
  );

  return (
    <HashRouter>
      <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isPreviewMode ? 'bg-white' : 'bg-slate-50'}`}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-[100] shadow-sm">
          <div className="flex items-center gap-6">
            <h1 className="font-black text-xl tracking-tighter text-blue-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] shadow-lg shadow-blue-200">UB</div>
              Builder
            </h1>
            <div className="flex flex-col">
              <div className={`flex items-center gap-2 px-3 py-0.5 rounded-full border border-current text-[9px] font-black uppercase tracking-widest bg-white transition-colors ${saveStatus === 'saving' ? 'text-blue-500' : saveStatus === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
                {saveStatus === 'saving' ? <RefreshCw size={10} className="animate-spin" /> : <ShieldCheck size={10} />}
                {saveStatus === 'saving' ? 'Sincronizando' : saveStatus === 'error' ? 'Erro Crítico' : 'Seguro'}
              </div>
              {lastSaveTime && <span className="text-[8px] font-bold text-slate-400 mt-1 ml-1 uppercase opacity-60">Backup: {lastSaveTime}</span>}
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {INITIAL_PAGES.map(p => <NavBtn key={p} id={p} label={PAGE_LABELS[p]} />)}
          </nav>

          <div className="flex items-center gap-2">
            {!isPreviewMode && (
              <div className="flex items-center gap-1 border-r pr-3 mr-1 border-slate-200">
                <button onClick={() => { if (historyIndex > 0) { setState(history[historyIndex-1]); setHistoryIndex(historyIndex-1); } }} className={`p-2 rounded-lg transition-colors ${historyIndex > 0 ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200 cursor-not-allowed'}`} title="Desfazer"><Undo2 size={18} /></button>
                <button onClick={() => { if (historyIndex < history.length - 1) { setState(history[historyIndex+1]); setHistoryIndex(historyIndex+1); } }} className={`p-2 rounded-lg transition-colors ${historyIndex < history.length - 1 ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200 cursor-not-allowed'}`} title="Refazer"><Redo2 size={18} /></button>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <button onClick={forceReload} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg" title="Recarregar do Banco"><DatabaseBackup size={18} /></button>
              <button onClick={exportProject} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Exportar JSON"><FileDown size={18} /></button>
              <label className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Importar JSON">
                <FileUp size={18} />
                <input type="file" accept=".json" className="hidden" onChange={importProject} />
              </label>
            </div>

            <button onClick={() => setIsPreviewMode(!isPreviewMode)} className={`ml-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isPreviewMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {isPreviewMode ? <EyeOff size={14} /> : <Eye size={14} />} {isPreviewMode ? 'Editor' : 'Site'}
            </button>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden">
          <Routes>
            {INITIAL_PAGES.map(p => (
              <Route key={p} path={p === 'home' ? '/' : `/${p}`} element={
                <Canvas 
                  pageId={p} 
                  settings={state[p] || DEFAULT_PAGE} 
                  selectedElementIds={selectedElementIds}
                  setSelectedElementIds={setSelectedElementIds} 
                  isPreviewMode={isPreviewMode}
                  onUpdate={updateElement}
                  onElementsMove={(ids, dx, dy, isFinal) => moveElements(p, ids, dx, dy, isFinal)}
                  onDeleteElements={deleteElements}
                />
              } />
            ))}
          </Routes>
          {!isPreviewMode && (
            <EditorMenu 
              onAddImages={imgs => addElements(getCurrentPage(), 'image', imgs)}
              onAddVideos={vids => addElements(getCurrentPage(), 'video', vids)}
              onAddText={() => addElements(getCurrentPage(), 'text', ['NOVA CAIXA DE TEXTO'])}
              onUpdateBackground={(bg, type, all) => {
                let ns = { ...state };
                if (all) INITIAL_PAGES.forEach(pg => { if(ns[pg]) ns[pg] = { ...ns[pg], background: bg, bgType: type }; });
                else { const cp = getCurrentPage(); if(ns[cp]) ns[cp] = { ...ns[cp], background: bg, bgType: type }; }
                setState(ns);
                pushToHistory(ns);
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
    <Link to={id === 'home' ? '/' : `/${id}`} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>
      {label}
    </Link>
  );
};

export default App;
