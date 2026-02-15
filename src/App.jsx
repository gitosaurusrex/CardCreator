import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Columns2, Rows2, Image as ImageIcon, Palette, Type, Download, Upload, Bold, Italic, Palette as ColorIcon } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';

const TiptapEditor = ({ value, onChange, placeholder, minHeight = '100px' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
        style: `min-height: ${minHeight}; outline: none;`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-container">
      <div className="tiptap-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`tiptap-tool ${editor.isActive('bold') ? 'active' : ''}`}
          type="button"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`tiptap-tool ${editor.isActive('italic') ? 'active' : ''}`}
          type="button"
        >
          <Italic size={14} />
        </button>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded">
          <input
            type="color"
            onInput={e => editor.chain().focus().setColor(e.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="tiptap-color-picker"
            title="Text Color"
          />
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

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

const stripPTags = (html) => html ? html.replace(/<\/?p[^>]*>/g, '') : '';

function App() {
  const [cards, setCards] = useState([INITIAL_CARD]);
  const [activeCardId, setActiveCardId] = useState(INITIAL_CARD.id);
  const [universalConfig, setUniversalConfig] = useState(false);

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
      // If this is the targeted card, apply all updates
      if (c.id === id) {
        return { ...c, ...updates };
      }
      // If universal is on, apply only the universal updates to other cards
      if (universalConfig) {
        const universalUpdates = {};
        Object.keys(updates).forEach(key => {
          if (UNIVERSAL_KEYS.includes(key)) {
            universalUpdates[key] = updates[key];
          }
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCard(activeCardId, { imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const exportToJson = () => {
    const dataStr = JSON.stringify(cards, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'tilemaker-cards.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importFromJson = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedCards = JSON.parse(event.target.result);
          if (Array.isArray(importedCards)) {
            setCards(importedCards);
            setActiveCardId(importedCards[0].id);
          }
        } catch (err) {
          alert('Failed to import JSON file. Please make sure it is a valid export.');
        }
      };
      reader.readAsText(file);
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

  return (
    <>
      <div className="app-container no-print">
        {/* Ribbon Bar (Top) */}
        <div className="ribbon-bar no-print">
          {cards.map((card, index) => (
            <div
              key={card.id}
              onClick={() => setActiveCardId(card.id)}
              className={`ribbon-item ${activeCardId === card.id ? 'active' : ''}`}
            >
              <div className="ribbon-item-preview" dangerouslySetInnerHTML={{ __html: stripPTags(card.title) }} />
              <input
                type="checkbox"
                checked={card.selectedForPrint !== false}
                onChange={(e) => { e.stopPropagation(); updateCard(card.id, { selectedForPrint: e.target.checked }); }}
                className="print-checkbox"
                title="Include in print"
              />
              <button
                onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                className="delete-card-btn"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addCard}
            className="add-card-btn"
          >
            <Plus size={24} />
          </button>
          <div className="spacer"></div>
          <div className="flex gap-2 mr-4">
            <button
              onClick={exportToJson}
              className="action-btn-secondary"
              title="Export to JSON"
            >
              <Download size={18} />
            </button>
            <label className="action-btn-secondary cursor-pointer" title="Import from JSON">
              <Upload size={18} />
              <input type="file" accept=".json" onChange={importFromJson} className="hidden" />
            </label>
          </div>
          <button
            onClick={() => window.print()}
            className="print-btn"
          >
            <Printer size={20} /> Print Cards
          </button>
        </div>

        <div className="main-content">
          {/* Editor Panel (Left) */}
          <div className="editor-panel no-print">
            <div className="flex justify-between items-center mb-6">
              <h2 className="editor-title mb-0">Card Editor</h2>
              <div
                onClick={toggleUniversal}
                className={`universal-toggle ${universalConfig ? 'active' : ''}`}
                title="Apply appearance settings to all cards"
              >
                <div className="toggle-track">
                  <div className="toggle-thumb"></div>
                </div>
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
                      <FontSelector
                        value={activeCard.titleFont}
                        onChange={(val) => updateCard(activeCardId, { titleFont: val })}
                        className="!w-28 !p-1 !text-[10px]"
                      />
                      <input
                        type="number"
                        value={activeCard.titleSize}
                        onChange={(e) => updateCard(activeCardId, { titleSize: parseInt(e.target.value) })}
                        className="editor-input !w-12 !p-1 !text-[10px]"
                      />
                    </div>
                  </div>
                  <TiptapEditor
                    value={activeCard.title}
                    onChange={(content) => updateCard(activeCardId, { title: content })}
                    minHeight="50px"
                  />
                </div>

                <div className="editor-field-group mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <div className="editor-rich-label mb-0">Body Text</div>
                    <div className="flex gap-1 items-center">
                      <FontSelector
                        value={activeCard.textFont}
                        onChange={(val) => updateCard(activeCardId, { textFont: val })}
                        className="!w-28 !p-1 !text-[10px]"
                      />
                      <input
                        type="number"
                        value={activeCard.textSize}
                        onChange={(e) => updateCard(activeCardId, { textSize: parseInt(e.target.value) })}
                        className="editor-input !w-12 !p-1 !text-[10px]"
                      />
                    </div>
                  </div>
                  <TiptapEditor
                    value={activeCard.text}
                    onChange={(content) => updateCard(activeCardId, { text: content })}
                    minHeight="100px"
                  />
                </div>
              </section>

              <section className="editor-section">
                <label className="section-label"><ImageIcon size={16} /> Media</label>
                <div className="editor-field-group">
                  <div className="editor-rich-label">Source URL</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={activeCard.imageUrl}
                      onChange={(e) => updateCard(activeCardId, { imageUrl: e.target.value })}
                      className="editor-input"
                      placeholder="https://..."
                    />
                    <label className="upload-icon-btn">
                      <Upload size={18} />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>
                <div className="editor-field-group">
                  <div className="editor-rich-label">Overlay Caption</div>
                  <input
                    type="text"
                    value={activeCard.caption}
                    onChange={(e) => updateCard(activeCardId, { caption: e.target.value })}
                    className="editor-input"
                    placeholder="Caption text..."
                  />
                </div>
                <div className="editor-field-group">
                  <div className="editor-rich-label">Object Position</div>
                  <select
                    value={activeCard.imagePosition}
                    onChange={(e) => updateCard(activeCardId, { imagePosition: e.target.value })}
                    className="editor-select"
                  >
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
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Background</div>
                    <input type="color" value={activeCard.cardBg} onChange={(e) => updateCard(activeCardId, { cardBg: e.target.value })} className="editor-input !p-1 h-10" />
                  </div>
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Text Color</div>
                    <input type="color" value={activeCard.textColor} onChange={(e) => updateCard(activeCardId, { textColor: e.target.value })} className="editor-input !p-1 h-10" />
                  </div>
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
                      <button
                        key={opt}
                        onClick={() => updateCard(activeCardId, { orientation: opt })}
                        className={`layout-btn ${activeCard.orientation === opt ? 'active' : ''}`}
                      >
                        {opt.split('-')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="editor-field-group mt-2">
                  <div className="editor-rich-label">Vertical Alignment</div>
                  <div className="grid grid-cols-3 gap-1">
                    {['top', 'center', 'bottom'].map((align) => (
                      <button
                        key={align}
                        onClick={() => updateCard(activeCardId, { verticalAlign: align })}
                        className={`layout-btn ${activeCard.verticalAlign === align ? 'active' : ''}`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Outer Padding</div>
                    <input type="number" value={activeCard.cardPadding} onChange={(e) => updateCard(activeCardId, { cardPadding: parseInt(e.target.value) })} className="editor-input" />
                  </div>
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Inner Gap</div>
                    <input type="number" value={activeCard.contentPadding} onChange={(e) => updateCard(activeCardId, { contentPadding: parseInt(e.target.value) })} className="editor-input" />
                  </div>
                </div>
              </section>

              <section className="editor-section">
                <label className="section-label"><Palette size={16} /> Borders & Corners</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Stroke Width</div>
                    <input type="number" value={activeCard.borderWidth} onChange={(e) => updateCard(activeCardId, { borderWidth: parseInt(e.target.value) })} className="editor-input" />
                  </div>
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Corner Radius</div>
                    <input type="number" value={activeCard.borderRadius} onChange={(e) => updateCard(activeCardId, { borderRadius: parseInt(e.target.value) })} className="editor-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Media Radius</div>
                    <input type="number" value={activeCard.imageRadius} onChange={(e) => updateCard(activeCardId, { imageRadius: parseInt(e.target.value) })} className="editor-input" />
                  </div>
                  <div className="editor-field-group">
                    <div className="editor-rich-label">Stroke Style</div>
                    <select value={activeCard.borderStyle} onChange={(e) => updateCard(activeCardId, { borderStyle: e.target.value })} className="editor-select">
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="double">Double</option>
                    </select>
                  </div>
                </div>
                <div className="editor-field-group mt-2">
                  <div className="editor-rich-label">Stroke Color</div>
                  <input type="color" value={activeCard.borderColor} onChange={(e) => updateCard(activeCardId, { borderColor: e.target.value })} className="editor-input !p-1 h-10" />
                </div>
              </section>
            </div>
          </div>

          {/* Viewport (Center) */}
          <div className="viewport">
            <div
              className={`card-preview ${activeCard.orientation} ${activeCard.template} shadow-ambient`}
              style={getCardStyles(activeCard)}
            >
              {activeCard.imageUrl && (
                <div
                  className="card-image"
                  style={{
                    backgroundImage: `url(${activeCard.imageUrl})`,
                    backgroundPosition: activeCard.imagePosition,
                    borderRadius: `${activeCard.imageRadius}px`
                  }}
                >
                  {activeCard.caption && (
                    <div className="card-caption-overlay">
                      {activeCard.caption}
                    </div>
                  )}
                </div>
              )}
              <div className="card-content" style={getContentStyles(activeCard)}>
                <h1
                  className="card-title"
                  style={{
                    fontSize: `${activeCard.titleSize}px`,
                    fontFamily: activeCard.titleFont !== 'inherit' ? activeCard.titleFont : undefined
                  }}
                  dangerouslySetInnerHTML={{ __html: stripPTags(activeCard.title) }}
                />
                <div
                  className="card-text"
                  style={{
                    fontSize: `${activeCard.textSize}px`,
                    fontFamily: activeCard.textFont !== 'inherit' ? activeCard.textFont : undefined
                  }}
                  dangerouslySetInnerHTML={{ __html: activeCard.text }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Container */}
      <div className="print-only">
        <div className="print-container">
          {cards.filter(c => c.selectedForPrint !== false).map(card => (
            <div
              key={card.id}
              className={`card-preview ${card.orientation} ${card.template} print-card`}
              style={getCardStyles(card)}
            >
              {card.imageUrl && (
                <div
                  className="card-image"
                  style={{
                    backgroundImage: `url(${card.imageUrl})`,
                    backgroundPosition: card.imagePosition,
                    borderRadius: `${card.imageRadius}px`
                  }}
                >
                  {card.caption && <div className="card-caption-overlay">{card.caption}</div>}
                </div>
              )}
              <div className="card-content" style={getContentStyles(card)}>
                <h1
                  className="card-title"
                  style={{
                    fontSize: `${card.titleSize}px`,
                    fontFamily: card.titleFont !== 'inherit' ? card.titleFont : undefined
                  }}
                  dangerouslySetInnerHTML={{ __html: stripPTags(card.title) }}
                />
                <div
                  className="card-text"
                  style={{
                    fontSize: `${card.textSize}px`,
                    fontFamily: card.textFont !== 'inherit' ? card.textFont : undefined
                  }}
                  dangerouslySetInnerHTML={{ __html: card.text }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
