import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Printer, Columns2, Rows2, Image as ImageIcon, Palette, Type, Bold, Italic, Palette as ColorIcon, FolderOpen, ExternalLink, X, Clock, Lock, Cloud, Check, AlertCircle, Upload } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react';

const FONTS = [
  { label: 'Default', value: 'inherit', className: '' },
  { label: 'Inter', value: "'Inter', sans-serif", className: 'font-inter' },
  { label: 'Outfit', value: "'Outfit', sans-serif", className: 'font-outfit' },
  { label: 'Montserrat', value: "'Montserrat', sans-serif", className: 'font-montserrat' },
  { label: 'Roboto', value: "'Roboto', sans-serif", className: 'font-roboto' },
  { label: 'Libre Baskerville', value: "'Libre Baskerville', serif", className: 'font-baskerville' },
  { label: 'Playfair Display', value: "'Playfair Display', serif", className: 'font-playfair' },
  { label: 'Fira Code', value: "'Fira Code', monospace", className: 'font-fira' },
  { label: 'Monospace', value: 'monospace', className: 'font-monospace' },
  { label: 'Comic Sans', value: "'Comic Sans MS', cursive", className: 'font-cursive' }
];

const FontSelector = ({ value, onChange, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`editor-select font-select-preview ${className}`}
  >
    {FONTS.map(f => (
      <option key={f.value} value={f.value} className={f.className}>
        {f.label}
      </option>
    ))}
  </select>
);

const INITIAL_CARD = {
  id: Date.now(),
  title: 'My Presentation Card',
  text: 'Enter your content here. This card can hold an optional image, a caption, and a block of text.',
  imageUrl: '',
  caption: '',
  orientation: 'horizontal-left',
  imagePosition: 'center center',
  template: 'template-pastel',
  contentPadding: 40,
  verticalAlign: 'center',
  borderWidth: 2,
  borderRadius: 16,
  borderStyle: 'solid',
  borderColor: '#fec89a',
  cardBg: '#fffcf2',
  textColor: '#403d39',
  accentColor: '#eb5e28',
  imageRadius: 8,
  cardPadding: 0,
  titleSize: 40,
  titleFont: 'inherit',
  textSize: 19,
  textFont: 'inherit',
  cardHeight: 530,
  selectedForPrint: true
};

const STORAGE_KEY = 'tilemaker_projects_v1';

const ProjectSelector = ({ projects, onSelect, onCreate, onDelete }) => {
  return (
    <div className="project-selector-overlay">
      <div className="selector-header">
        <h1 className="selector-title">TileMaker</h1>
        <p className="selector-subtitle">Select a project to continue or create a new one</p>
      </div>

      <div className="projects-grid">
        <div className="project-card new-project" onClick={onCreate}>
          <Plus size={48} />
          <span className="font-bold mt-2">New Project</span>
        </div>

        {projects.map(project => (
          <div key={project.id} className="project-card" onClick={() => onSelect(project.id)}>
            <div className="flex justify-between items-start">
              <h3 className="project-name">{project.name}</h3>
              <FolderOpen size={20} className="text-blue-500" />
            </div>
            <div className="project-meta">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>Last modified: {new Date(project.lastModified).toLocaleDateString()}</span>
              </div>
              <div className="mt-1">{project.cards.length} cards</div>
            </div>
            <div className="project-card-actions" onClick={e => e.stopPropagation()}>
              <button className="project-action-btn btn-secondary" onClick={() => onSelect(project.id)}>
                <ExternalLink size={14} /> Open
              </button>
              <button className="project-action-btn btn-danger" onClick={() => onDelete(project.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState([INITIAL_CARD]);
  const [activeCardId, setActiveCardId] = useState(INITIAL_CARD.id);
  const [universalConfig, setUniversalConfig] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');

  const activeProject = projects.find(p => p.id === currentProjectId);
  const { getToken, userId } = useAuth();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) setProjects(JSON.parse(saved));
        }
      } catch (err) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setProjects(JSON.parse(saved));
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [userId, getToken]);

  useEffect(() => {
    if (activeProject && currentProjectId) {
      setCards(activeProject.cards);
      setActiveCardId(activeProject.cards[0]?.id || INITIAL_CARD.id);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId) return;
    setSaveStatus('unsaved');
    const timer = setTimeout(async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      const active = projects.find(p => p.id === currentProjectId);
      if (!active) return;
      setSaveStatus('saving');
      try {
        const token = await getToken();
        if (!token) {
          setSaveStatus('error');
          return;
        }
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(active),
        });
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          const text = await res.text();
          console.error(`Cloud save failed (${res.status}):`, text);
          setSaveStatus('error');
        }
      } catch (err) {
        console.warn("Cloud sync error/paused:", err);
        setSaveStatus('error');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [projects, currentProjectId, getToken]);

  useEffect(() => {
    if (currentProjectId && cards.length > 0) {
      setProjects(prev => {
        const existing = prev.find(p => p.id === currentProjectId);
        if (existing && existing.cards === cards) return prev;
        return prev.map(p =>
          p.id === currentProjectId
            ? { ...p, cards, lastModified: Date.now() }
            : p
        );
      });
    }
  }, [cards, currentProjectId]);

  const createProject = () => {
    const newProject = {
      id: Date.now().toString(),
      name: `Untitled Project ${projects.length + 1}`,
      cards: [INITIAL_CARD],
      lastModified: Date.now()
    };
    setProjects([newProject, ...projects]);
    setCurrentProjectId(newProject.id);
  };

  const deleteProject = (id) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const activeCard = cards.find(c => c.id === activeCardId) || cards[0];

  const UNIVERSAL_KEYS = [
    'titleFont', 'titleSize', 'textFont', 'textSize',
    'template', 'cardBg', 'textColor',
    'verticalAlign', 'cardPadding', 'contentPadding',
    'borderWidth', 'borderRadius', 'imageRadius', 'borderStyle', 'borderColor',
    'cardHeight'
  ];

  const toggleUniversal = () => {
    const newVal = !universalConfig;
    setUniversalConfig(newVal);
    if (newVal) {
      const activeSettings = {};
      UNIVERSAL_KEYS.forEach(key => activeSettings[key] = activeCard[key]);
      setCards(prevCards => prevCards.map(c => ({ ...c, ...activeSettings })));
    }
  };

  const addCard = () => {
    const newCard = {
      ...INITIAL_CARD,
      id: Date.now(),
      title: `New Card ${cards.length + 1}`
    };
    if (universalConfig) {
      UNIVERSAL_KEYS.forEach(key => newCard[key] = activeCard[key]);
    }
    setCards([...cards, newCard]);
    setActiveCardId(newCard.id);
  };

  const updateCard = (id, updates) => {
    setCards(prevCards => prevCards.map(c => {
      if (c.id === id) return { ...c, ...updates };
      if (universalConfig) {
        const universalUpdates = {};
        Object.keys(updates).forEach(key => {
          if (UNIVERSAL_KEYS.includes(key)) universalUpdates[key] = updates[key];
        });
        return { ...c, ...universalUpdates };
      }
      return c;
    }));
  };

  const deleteCard = (id) => {
    if (cards.length === 1) return;
    const newCards = cards.filter(c => c.id !== id);
    setCards(newCards);
    if (activeCardId === id) {
      setActiveCardId(newCards[newCards.length - 1].id);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('File is too large. Max 8MB.');
      return;
    }
    setSaveStatus('saving');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        const token = await getToken();
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            data: base64,
            contentType: file.type,
            fileName: file.name
          }),
        });
        const data = await res.json();
        if (data.url) {
          updateCard(activeCardId, { imageUrl: data.url });
          setSaveStatus('saved');
        } else {
          console.error("Upload failed:", data);
          setSaveStatus('error');
          alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload error:", err);
      setSaveStatus('error');
      alert('Upload system error');
    }
  };

  const getCardStyles = (card) => {
    return {
      backgroundColor: card.cardBg,
      color: card.textColor,
      padding: `${card.cardPadding}px`,
      borderRadius: `${card.borderRadius}px`,
      borderWidth: `${card.borderWidth}px`,
      borderStyle: card.borderStyle,
      borderColor: card.borderColor,
      height: `${card.cardHeight}px`,
    };
  };

  const getContentStyles = (card) => {
    return {
      justifyContent: card.verticalAlign === 'top' ? 'flex-start' : (card.verticalAlign === 'bottom' ? 'flex-end' : 'center')
    };
  };

  const closeProject = () => {
    if (confirm('Return to project selector? Your changes are auto-saved to the cloud.')) {
      setCurrentProjectId(null);
    }
  };

  const updateProjectName = (name) => {
    setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, name } : p));
  };

  if (isLoading) {
    return (
      <div className="project-selector-overlay">
        <div className="selector-header">
          <h1 className="selector-title">TileMaker</h1>
          <p className="selector-subtitle">Initializing your workspace...</p>
          <div className="mt-8 flex justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="project-selector-overlay">
          <div className="selector-header">
            <h1 className="selector-title">TileMaker</h1>
            <p className="selector-subtitle">Premium Card Creation for Professionals</p>
            <div className="mt-12">
              <SignInButton mode="modal">
                <button className="print-btn !px-8 !py-4 !text-lg !gap-3">
                  <Lock size={20} /> Get Started
                </button>
              </SignInButton>
              <p className="mt-4 text-sm text-gray-400">Sign in to save and sync your card projects</p>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {!currentProjectId ? (
          <ProjectSelector
            projects={projects}
            onSelect={setCurrentProjectId}
            onCreate={createProject}
            onDelete={async (id) => {
              deleteProject(id);
              try {
                const token = await getToken();
                await fetch(`/api/projects?id=${id}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` }
                });
              } catch (err) { }
            }}
          />
        ) : (
          <div className="app-container no-print">
            <div className="ribbon-bar no-print">
              {cards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setActiveCardId(card.id)}
                  className={`ribbon-item ${activeCardId === card.id ? 'active' : ''}`}
                >
                  <div className="ribbon-item-preview">{card.title}</div>
                  <input
                    type="checkbox"
                    checked={card.selectedForPrint !== false}
                    onChange={(e) => { e.stopPropagation(); updateCard(card.id, { selectedForPrint: e.target.checked }); }}
                    className="print-checkbox"
                    title="Include in print"
                  />
                  <button onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }} className="delete-card-btn">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button onClick={addCard} className="add-card-btn">
                <Plus size={24} />
              </button>
              <div className="spacer"></div>
              <div className="ribbon-actions flex gap-2 mr-4 items-center">
                <div className="flex flex-col gap-1 mr-2">
                  <input
                    type="text"
                    value={activeProject?.name || ''}
                    onChange={(e) => updateProjectName(e.target.value)}
                    placeholder="Project Name..."
                    className="bg-transparent border-none text-xs font-bold text-gray-400 focus:text-blue-500 outline-none w-32"
                    title="Rename Project"
                  />
                </div>
                <button onClick={closeProject} className="close-project-btn" title="Close Project">
                  <X size={18} /> Close
                </button>
                <div className="status-indicator flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full text-[10px] font-bold text-gray-500 whitespace-nowrap border border-gray-100">
                  {saveStatus === 'unsaved' && (
                    <><div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div><span>Pending Sync...</span></>
                  )}
                  {saveStatus === 'saving' && (
                    <><div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div><span>Syncing...</span></>
                  )}
                  {saveStatus === 'saved' && (
                    <><Check size={12} className="text-green-500" /><span>Synced to Cloud</span></>
                  )}
                  {saveStatus === 'error' && (
                    <><AlertCircle size={12} className="text-red-400" /><span>Sync Paused (Local Only)</span></>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4 border-l pl-4 border-gray-200">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
              <button onClick={() => window.print()} className="print-btn">
                <Printer size={20} /> Print Cards
              </button>
            </div>

            <div className="main-content">
              <div className="editor-panel no-print">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="editor-title mb-0">Card Editor</h2>
                  <div
                    onClick={toggleUniversal}
                    className={`universal-toggle ${universalConfig ? 'active' : ''}`}
                    title="Apply appearance settings to all cards"
                  >
                    <div className="toggle-track"><div className="toggle-thumb"></div></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Universal</span>
                  </div>
                </div>

                <div className="editor-sections">
                  <section className="editor-section">
                    <label className="section-label"><Type size={16} /> Content</label>

                    <div className="editor-field-group">
                      <div className="flex justify-between items-center mb-1">
                        <div className="editor-rich-label mb-0">Title</div>
                        <div className="flex gap-1 items-center">
                          <FontSelector value={activeCard.titleFont} onChange={(val) => updateCard(activeCardId, { titleFont: val })} className="!w-28 !p-1 !text-[10px]" />
                          <input type="number" value={activeCard.titleSize} onChange={(e) => updateCard(activeCardId, { titleSize: parseInt(e.target.value) })} className="editor-input !w-12 !p-1 !text-[10px]" />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={activeCard.title}
                        onChange={(e) => updateCard(activeCardId, { title: e.target.value })}
                        className="editor-input"
                        placeholder="Card title..."
                      />
                    </div>

                    <div className="editor-field-group mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="editor-rich-label mb-0">Body Text</div>
                        <div className="flex gap-1 items-center">
                          <FontSelector value={activeCard.textFont} onChange={(val) => updateCard(activeCardId, { textFont: val })} className="!w-28 !p-1 !text-[10px]" />
                          <input type="number" value={activeCard.textSize} onChange={(e) => updateCard(activeCardId, { textSize: parseInt(e.target.value) })} className="editor-input !w-12 !p-1 !text-[10px]" />
                        </div>
                      </div>
                      <textarea
                        value={activeCard.text}
                        onChange={(e) => updateCard(activeCardId, { text: e.target.value })}
                        className="editor-textarea"
                        placeholder="Card body text..."
                        rows={6}
                      />
                    </div>
                  </section>

                  <section className="editor-section">
                    <label className="section-label"><ImageIcon size={16} /> Media</label>
                    <div className="editor-field-group">
                      <div className="editor-rich-label">Local Upload</div>
                      <label className="upload-label">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        <div className="upload-placeholder"><Upload size={18} /><span>Upload Image</span></div>
                      </label>
                    </div>
                    <div className="editor-field-group">
                      <div className="editor-rich-label">Source URL</div>
                      <input type="text" value={activeCard.imageUrl} onChange={(e) => updateCard(activeCardId, { imageUrl: e.target.value })} className="editor-input" placeholder="https://..." />
                    </div>
                    <div className="editor-field-group">
                      <div className="editor-rich-label">Overlay Caption</div>
                      <input type="text" value={activeCard.caption} onChange={(e) => updateCard(activeCardId, { caption: e.target.value })} className="editor-input" placeholder="Caption text..." />
                    </div>
                    <div className="editor-field-group">
                      <div className="editor-rich-label">Object Position</div>
                      <select value={activeCard.imagePosition} onChange={(e) => updateCard(activeCardId, { imagePosition: e.target.value })} className="editor-select">
                        <option value="top left">Top Left</option>
                        <option value="top center">Top Center</option>
                        <option value="top right">Top Right</option>
                        <option value="center left">Center Left</option>
                        <option value="center center">Center Center</option>
                        <option value="center right">Center Right</option>
                        <option value="bottom left">Bottom Left</option>
                        <option value="bottom center">Bottom Center</option>
                        <option value="bottom right">Bottom Right</option>
                      </select>
                    </div>
                  </section>

                  <section className="editor-section">
                    <label className="section-label"><Palette size={16} /> Style & Canvas</label>
                    <div className="editor-field-group">
                      <div className="editor-rich-label">Base Template</div>
                      <select
                        value={activeCard.template}
                        onChange={(e) => {
                          const val = e.target.value;
                          let defaults = {};
                          if (val === 'template-pastel') defaults = { cardBg: '#fffcf2', textColor: '#403d39', borderColor: '#fec89a', borderRadius: 32 };
                          else if (val === 'template-corporate') defaults = { cardBg: '#ffffff', textColor: '#1a1a1a', borderColor: '#003087', borderRadius: 0 };
                          else if (val === 'template-high-contrast') defaults = { cardBg: '#000000', textColor: '#ffff00', borderColor: '#ffff00', borderRadius: 0 };
                          else if (val === 'template-sophisticated') defaults = { cardBg: '#f4f1ea', textColor: '#2c1810', borderColor: '#d4af37', borderRadius: 4 };
                          else if (val === 'template-monospace') defaults = { cardBg: '#1e1e1e', textColor: '#d4d4d4', borderColor: '#333', borderRadius: 4 };
                          updateCard(activeCardId, { template: val, ...defaults });
                        }}
                        className="editor-select"
                      >
                        <option value="template-pastel">Pastel Playful</option>
                        <option value="template-corporate">Corporate Clean</option>
                        <option value="template-school">School Board</option>
                        <option value="template-high-contrast">High Contrast</option>
                        <option value="template-sophisticated">Sophisticated (Serif)</option>
                        <option value="template-monospace">Monospace (Terminal)</option>
                        <option value="template-large-print">Large Print</option>
                        <option value="template-casual">Casual Serious</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="editor-field-group"><div className="editor-rich-label">Background</div><input type="color" value={activeCard.cardBg} onChange={(e) => updateCard(activeCardId, { cardBg: e.target.value })} className="editor-input !p-1 h-10" /></div>
                      <div className="editor-field-group"><div className="editor-rich-label">Text Color</div><input type="color" value={activeCard.textColor} onChange={(e) => updateCard(activeCardId, { textColor: e.target.value })} className="editor-input !p-1 h-10" /></div>
                    </div>
                  </section>

                  <section className="editor-section">
                    <label className="section-label"><Columns2 size={16} /> Dimensions & Layout</label>
                    <div className="editor-field-group">
                      <div className="editor-rich-label">Card Height: {activeCard.cardHeight}px</div>
                      <input type="range" min="200" max="800" value={activeCard.cardHeight} onChange={(e) => updateCard(activeCardId, { cardHeight: parseInt(e.target.value) })} className="editor-range" />
                    </div>
                    <div className="editor-field-group mt-2">
                      <div className="editor-rich-label">Flow Direction</div>
                      <div className="grid grid-cols-3 gap-1">
                        {['horizontal-left', 'horizontal-right', 'vertical'].map((opt) => (
                          <button key={opt} onClick={() => updateCard(activeCardId, { orientation: opt })} className={`layout-btn ${activeCard.orientation === opt ? 'active' : ''}`}>{opt.split('-')[0]}</button>
                        ))}
                      </div>
                    </div>
                    <div className="editor-field-group mt-2">
                      <div className="editor-rich-label">Vertical Alignment</div>
                      <div className="grid grid-cols-3 gap-1">
                        {['top', 'center', 'bottom'].map((align) => (
                          <button key={align} onClick={() => updateCard(activeCardId, { verticalAlign: align })} className={`layout-btn ${activeCard.verticalAlign === align ? 'active' : ''}`}>{align}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="editor-field-group"><div className="editor-rich-label">Outer Padding</div><input type="number" value={activeCard.cardPadding} onChange={(e) => updateCard(activeCardId, { cardPadding: parseInt(e.target.value) })} className="editor-input" /></div>
                      <div className="editor-field-group"><div className="editor-rich-label">Inner Gap</div><input type="number" value={activeCard.contentPadding} onChange={(e) => updateCard(activeCardId, { contentPadding: parseInt(e.target.value) })} className="editor-input" /></div>
                    </div>
                  </section>

                  <section className="editor-section">
                    <label className="section-label"><Palette size={16} /> Borders & Corners</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="editor-field-group"><div className="editor-rich-label">Stroke Width</div><input type="number" value={activeCard.borderWidth} onChange={(e) => updateCard(activeCardId, { borderWidth: parseInt(e.target.value) })} className="editor-input" /></div>
                      <div className="editor-field-group"><div className="editor-rich-label">Corner Radius</div><input type="number" value={activeCard.borderRadius} onChange={(e) => updateCard(activeCardId, { borderRadius: parseInt(e.target.value) })} className="editor-input" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="editor-field-group"><div className="editor-rich-label">Media Radius</div><input type="number" value={activeCard.imageRadius} onChange={(e) => updateCard(activeCardId, { imageRadius: parseInt(e.target.value) })} className="editor-input" /></div>
                      <div className="editor-field-group">
                        <div className="editor-rich-label">Stroke Style</div>
                        <select value={activeCard.borderStyle} onChange={(e) => updateCard(activeCardId, { borderStyle: e.target.value })} className="editor-select">
                          <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="double">Double</option>
                        </select>
                      </div>
                    </div>
                    <div className="editor-field-group mt-2"><div className="editor-rich-label">Stroke Color</div><input type="color" value={activeCard.borderColor} onChange={(e) => updateCard(activeCardId, { borderColor: e.target.value })} className="editor-input !p-1 h-10" /></div>
                  </section>
                </div>
              </div>

              <div className="viewport">
                <div className={`card-preview ${activeCard.orientation} ${activeCard.template} shadow-ambient`} style={getCardStyles(activeCard)}>
                  {activeCard.imageUrl && (
                    <div className="card-image">
                      <img src={activeCard.imageUrl} alt="" loading="eager" className="card-image-content" style={{ objectPosition: activeCard.imagePosition, borderRadius: `${activeCard.imageRadius}px` }} />
                      {activeCard.caption && <div className="card-caption-overlay">{activeCard.caption}</div>}
                    </div>
                  )}
                  <div className="card-content" style={getContentStyles(activeCard)}>
                    <h1 className="card-title" style={{ fontSize: `${activeCard.titleSize}px`, fontFamily: activeCard.titleFont !== 'inherit' ? activeCard.titleFont : undefined }}>{activeCard.title}</h1>
                    <div className="card-text" style={{ fontSize: `${activeCard.textSize}px`, fontFamily: activeCard.textFont !== 'inherit' ? activeCard.textFont : undefined }}>{activeCard.text}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="print-only">
          <div className="print-container">
            {cards.filter(c => c.selectedForPrint !== false).map(card => (
              <div key={card.id} className={`card-preview ${card.orientation} ${card.template} print-card`} style={getCardStyles(card)}>
                {card.imageUrl && (
                  <div className="card-image">
                    <img src={card.imageUrl} alt="" loading="eager" className="card-image-content" style={{ objectPosition: card.imagePosition, borderRadius: `${card.imageRadius}px` }} />
                    {card.caption && <div className="card-caption-overlay">{card.caption}</div>}
                  </div>
                )}
                <div className="card-content" style={getContentStyles(card)}>
                  <h1 className="card-title" style={{ fontSize: `${card.titleSize}px`, fontFamily: card.titleFont !== 'inherit' ? card.titleFont : undefined }}>{card.title}</h1>
                  <div className="card-text" style={{ fontSize: `${card.textSize}px`, fontFamily: card.textFont !== 'inherit' ? card.textFont : undefined }}>{card.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SignedIn>
    </>
  );
}

export default App;
