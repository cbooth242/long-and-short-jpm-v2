import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, LineChart, AreaChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import * as XLSX from 'xlsx';

// ── Reads the SSE stream from the claude.ai proxy and returns the full text ──
// ── API bridge via postMessage ──
// The artifact iframe posts to the parent claude.ai page, which has direct proxy access.
// Run this once in browser console to enable:
//   window.addEventListener('message', async (e) => {
//     if (!e.data || e.data.type !== 'claude_request') return;
//     const { id, body } = e.data;
//     try {
//       const orgs = await fetch('https://claude.ai/api/organizations').then(r => r.json());
//       const url = 'https://claude.ai/api/organizations/' + orgs[0].uuid + '/proxy/v1/messages';
//       const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
//       const d = await r.json();
//       const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
//       e.source.postMessage({ type: 'claude_response', id, text }, '*');
//     } catch(err) { e.source.postMessage({ type: 'claude_response', id, error: err.message }, '*'); }
//   });

async function callClaude(body) {
  const key = window.__ANTHROPIC_KEY || localStorage.getItem('_ak') || '';
  if (!key) throw new Error('No API key set. Click ⚠ API Key in the header.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  const data = JSON.parse(text);
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}


function parseTagged(text) {
  const result = {};
  const sections = [];
  const charts = [];
  const titleM = text.match(/<TITLE>([\s\S]*?)<\/TITLE>/);
  if (titleM) result.title = titleM[1].trim();
  const subtitleM = text.match(/<SUBTITLE>([\s\S]*?)<\/SUBTITLE>/);
  if (subtitleM) result.subtitle = subtitleM[1].trim();
  const summaryM = text.match(/<SUMMARY>([\s\S]*?)<\/SUMMARY>/);
  if (summaryM) result.summary = summaryM[1].trim();
  const taglineM = text.match(/<TAGLINE>([\s\S]*?)<\/TAGLINE>/);
  if (taglineM) result.tagline = taglineM[1].trim();
  const re = /<SECTION id="([^"]+)" title="([^"]+)">([\s\S]*?)<\/SECTION>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    sections.push({ id: m[1].trim(), title: m[2].trim(), content: m[3].trim() });
  }
  if (sections.length) result.sections = sections;
  // Parse CHART tags for I&I
  const chartRe = /<CHART id="([^"]+)" title="([^"]*)" type="([^"]*)" yLabel="([^"]*)" source="([^"]*)" caption="([^"]*)">([\s\S]*?)<\/CHART>/g;
  let cm;
  while ((cm = chartRe.exec(text)) !== null) {
    const dpMatch = cm[7].match(/<DATAPOINTS>([\s\S]*?)<\/DATAPOINTS>/);
    charts.push({ id: cm[1].trim(), title: cm[2].trim(), chartType: cm[3].trim() || 'Line', yLabel: cm[4].trim(), source: cm[5].trim(), caption: cm[6].trim(), dataRaw: dpMatch ? dpMatch[1].trim() : '', position: charts.length === 0 ? 'data' : 'missing' });
  }
  if (charts.length) result.charts = charts;
  // also handle simple fields like <ENTRY>, <TARGET>, <STOPLOSS>
  for (const field of ['entry','target','stopLoss','instrument']) {
    const fm = text.match(new RegExp('<' + field.toUpperCase() + '>([\s\S]*?)<\/' + field.toUpperCase() + '>'));
    if (fm) result[field] = fm[1].trim();
  }
  return result;
}

function parseMacroResponse(raw) {
  if (!raw || !raw.trim()) return null;
  const result = parseTagged(raw);
  return (result.title || (result.sections && result.sections.length)) ? result : null;
}









// Long & Short — Content Intelligence Platform v8k
// "Delivering Insights"
// Features: JPM Branding (pixel-perfect), Video Publishing, Rich Editor, Output Rendering

// JPM Private Bank Brand System (extracted from actual website & PDFs)
const jpm = {
  // Primary colors - from actual JPM PB site
  navy: '#000000',           // JPM wordmark is pure black
  navyDark: '#0A2540',       // Deep navy for backgrounds
  gold: '#9B8579',           // Category labels brown/gold (INVESTMENT STRATEGY text)
  goldAccent: '#B4975A',     // Accent gold (buttons, highlights)
  white: '#FFFFFF',
  black: '#000000',
  
  // Grays - matched to site
  gray50: '#FAFAFA',         // Lightest background
  gray100: '#F7F7F7',        // Light background
  gray200: '#EBEBEB',        // Borders, dividers
  gray300: '#D4D4D4',        // Disabled states
  gray400: '#999999',        // Placeholder text
  gray500: '#717171',        // Secondary text, metadata
  gray600: '#555555',        // Body text lighter
  gray700: '#333333',        // Body text (main)
  gray800: '#1A1A1A',        // "Number to Watch" card bg
  
  // Accent colors
  teal: '#006A6A',           // Charts/highlights, author squares
  tealAccent: '#00857C',     // Lighter teal for accents
  olive: '#6B7B6B',          // Author square color (olive green)
  
  // Typography - exact JPM fonts
  fontSerif: '"Chronicle Display", "Freight Display", Georgia, "Times New Roman", serif',
  fontSans: '"Circular", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  
  // Font weights for headlines
  headlineWeight: 300,       // Light weight for large headlines
  subheadWeight: 400,        // Regular for subheads
};

// L&S Platform colors (for editor UI, not output)
const c = {
  navy: '#0A1A2F',
  slate: '#2C3E50',
  ivory: '#F8F6F2',
  gold: '#C1A364',
  teal: '#103A45',
  pearl: '#E2E2E0',
  pos: '#1B7F4E',
  neg: '#B84242',
  neu: '#4A6FA5',
  nexus: '#6B5B95',
};

// Shared Components
const Tag = ({ name, sentiment }) => {
  const col = sentiment === 'pos' ? c.pos : sentiment === 'neg' ? c.neg : c.neu;
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4, background: `${col}18`, color: col }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: col }} />
      {name}
    </span>
  );
};


class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error: error.message }; }
  componentDidCatch(error, info) { console.error('Render error:', error, info); }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 24, background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 8, margin: 16, fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Render Error (click F12 → Console for details)</div>
        <div style={{ color: '#374151' }}>{this.state.error}</div>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 8, padding: '4px 10px', borderRadius: 4, border: '1px solid #FECACA', background: '#fff', cursor: 'pointer' }}>Dismiss</button>
      </div>;
    }
    return this.props.children;
  }
}


const SectionLabel = ({ children, guidance }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
    <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, fontWeight: 600 }}>{children}</label>
    {guidance && <span style={{ fontSize: 9, color: c.slate, fontStyle: 'italic' }}>Writer guidance – won't appear in output</span>}
  </div>
);

// Global word count helper — strips HTML tags, counts words
const wordCount = (html) => {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').filter(Boolean).length : 0;
};

// Extra section with prominent remove button
const ExtraSection = ({ section, idx, c_content, onContentChange }) => {
  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newSections = (c_content.extraSections || []).filter((_, i) => i !== idx);
    onContentChange && onContentChange({ ...c_content, extraSections: newSections });
  };
  
  const handleMoveUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (idx === 0) return;
    const newSections = [...(c_content.extraSections || [])];
    [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
    onContentChange && onContentChange({ ...c_content, extraSections: newSections });
  };
  
  const handleMoveDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sections = c_content.extraSections || [];
    if (idx >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
    onContentChange && onContentChange({ ...c_content, extraSections: newSections });
  };
  
  const totalSections = (c_content.extraSections || []).length;
  
  return (
    <div style={{ marginBottom: 14, padding: 12, background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <input
          value={section.title}
          onChange={(e) => {
            const newSections = [...(c_content.extraSections || [])];
            newSections[idx] = { ...section, title: e.target.value };
            onContentChange && onContentChange({ ...c_content, extraSections: newSections });
          }}
          placeholder="Section title..."
          style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, border: 'none', outline: 'none', background: 'transparent', fontWeight: 600, flex: 1 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={handleMoveUp}
            disabled={idx === 0}
            style={{ padding: '4px 8px', borderRadius: 4, background: idx === 0 ? c.pearl : c.slate, color: '#fff', fontSize: 10, border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={handleMoveDown}
            disabled={idx >= totalSections - 1}
            style={{ padding: '4px 8px', borderRadius: 4, background: idx >= totalSections - 1 ? c.pearl : c.slate, color: '#fff', fontSize: 10, border: 'none', cursor: idx >= totalSections - 1 ? 'default' : 'pointer', opacity: idx >= totalSections - 1 ? 0.5 : 1 }}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={handleRemove}
            style={{ padding: '4px 10px', borderRadius: 4, background: c.neg, color: '#fff', fontSize: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      </div>
      <textarea 
        value={section.content}
        onChange={(e) => {
          const newSections = [...(c_content.extraSections || [])];
          newSections[idx] = { ...section, content: e.target.value };
          onContentChange && onContentChange({ ...c_content, extraSections: newSections });
        }}
        placeholder="Section content..."
        style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 13, lineHeight: 1.6, resize: 'none', minHeight: 60, outline: 'none', background: '#fff' }} 
      />
    </div>
  );
};

// JPM Approved Colors for text formatting
const approvedColors = [
  { id: 'navy', label: 'Navy', hex: '#0A2540' },
  { id: 'gold', label: 'Gold', hex: '#B4975A' },
  { id: 'teal', label: 'Teal', hex: '#006A6A' },
  { id: 'red', label: 'Alert', hex: '#B84242' },
  { id: 'green', label: 'Positive', hex: '#1B7F4E' },
];

// Global Formatting Toolbar - WYSIWYG using execCommand
const EditorToolbar = () => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHeadingPicker, setShowHeadingPicker] = useState(false);
  
  const execFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    setShowColorPicker(false);
    setShowHeadingPicker(false);
  };
  
  const btnStyle = (active = false) => ({ 
    padding: '6px 10px', 
    borderRadius: 4, 
    border: '1px solid ' + c.pearl, 
    background: active ? c.ivory : '#fff', 
    cursor: 'pointer', 
    fontSize: 12,
    color: c.navy,
    minWidth: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  
  const headingOptions = [
    { id: 'p', label: 'Paragraph', tag: 'p' },
    { id: 'h1', label: 'Heading 1', tag: 'h1' },
    { id: 'h2', label: 'Heading 2', tag: 'h2' },
    { id: 'h3', label: 'Heading 3', tag: 'h3' },
  ];
  
  return (
    <div style={{ 
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex', 
      alignItems: 'center', 
      gap: 6, 
      padding: '10px 14px', 
      background: '#fff', 
      borderRadius: 8, 
      marginBottom: 12,
      border: '1px solid ' + c.pearl,
      flexWrap: 'wrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {/* Heading/Paragraph dropdown */}
      <div style={{ position: 'relative' }}>
        <button 
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setShowHeadingPicker(!showHeadingPicker); setShowColorPicker(false); }}
          style={{ ...btnStyle(), minWidth: 90, gap: 6, justifyContent: 'space-between' }}
          title="Text Style"
        >
          <span>¶ Style</span>
          <span style={{ fontSize: 8 }}>▼</span>
        </button>
        {showHeadingPicker && (
          <div style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            marginTop: 4, 
            background: '#fff', 
            borderRadius: 6, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
            padding: 4,
            zIndex: 100,
            minWidth: 140
          }}>
            {headingOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execFormat('formatBlock', opt.tag)}
                style={{ 
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: opt.id === 'h1' ? 16 : opt.id === 'h2' ? 14 : opt.id === 'h3' ? 13 : 12,
                  fontWeight: opt.id === 'p' ? 400 : 600,
                  color: c.navy
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = c.ivory}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ width: 1, height: 24, background: c.pearl }} />
      
      {/* Text formatting */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('bold')} style={{ ...btnStyle(), fontWeight: 700 }} title="Bold">B</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('italic')} style={{ ...btnStyle(), fontStyle: 'italic' }} title="Italic">I</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('underline')} style={{ ...btnStyle(), textDecoration: 'underline' }} title="Underline">U</button>
      </div>
      
      <div style={{ width: 1, height: 24, background: c.pearl }} />
      
      {/* Sub/Superscript */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('subscript')} style={btnStyle()} title="Subscript">
          <span>X<sub style={{ fontSize: 8 }}>2</sub></span>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('superscript')} style={btnStyle()} title="Superscript">
          <span>X<sup style={{ fontSize: 8 }}>2</sup></span>
        </button>
      </div>
      
      <div style={{ width: 1, height: 24, background: c.pearl }} />
      
      {/* Color picker */}
      <div style={{ position: 'relative' }}>
        <button 
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setShowColorPicker(!showColorPicker); setShowHeadingPicker(false); }}
          style={{ ...btnStyle(), gap: 6 }}
          title="Text Color"
        >
          <span style={{ width: 14, height: 14, background: 'linear-gradient(135deg, #0A2540, #B4975A, #006A6A)', borderRadius: 2 }} />
          <span style={{ fontSize: 8 }}>▼</span>
        </button>
        {showColorPicker && (
          <div style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            marginTop: 4, 
            background: '#fff', 
            borderRadius: 6, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
            padding: 8,
            zIndex: 100,
            display: 'flex',
            gap: 6
          }}>
            {approvedColors.map(color => (
              <button
                key={color.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execFormat('foreColor', color.hex)}
                style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: 4, 
                  background: color.hex, 
                  border: '2px solid #fff', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'pointer'
                }}
                title={color.label}
              />
            ))}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1 }} />
      
      <span style={{ fontSize: 10, color: c.slate }}>
        Select text, then format
      </span>
    </div>
  );
};

// Section Layout Options
const sectionLayouts = [
  { id: 'full', label: 'Full Width', icon: '▭', cols: 1 },
  { id: 'split', label: 'Split (50/50)', icon: '▯▯', cols: 2 },
  { id: 'text-chart', label: 'Text + Chart', icon: '▭📊', cols: 2, types: ['text', 'chart'] },
  { id: 'chart-text', label: 'Chart + Text', icon: '📊▭', cols: 2, types: ['chart', 'text'] },
  { id: 'excel', label: 'Excel Chart / Table', icon: '📊', cols: 1 },
];

// Reusable Movable Sections Editor - WYSIWYG with contentEditable
const MovableSectionsEditor = ({ sections, onChange, addButtonText = '+ Add Section', onExcelInsert }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showExcelPicker, setShowExcelPicker] = useState(false);
  
  const moveSection = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const newSections = [...sections];
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
    onChange(newSections);
  };
  
  const removeSection = (idx) => {
    onChange(sections.filter((_, i) => i !== idx));
  };
  
  const updateSection = (idx, field, value) => {
    const newSections = [...sections];
    newSections[idx] = { ...newSections[idx], [field]: value };
    onChange(newSections);
  };
  
  const addSection = (layout = 'full') => {
    if (layout === 'excel') {
      setShowAddMenu(false);
      setShowExcelPicker(true);
      return;
    }
    const newSection = { 
      id: 'custom_' + Date.now(), 
      title: 'New Section', 
      content: '', 
      placeholder: 'Enter content...',
      layout: layout
    };
    
    if (layout === 'split' || layout === 'text-chart' || layout === 'chart-text') {
      newSection.columns = [
        { id: 'col1', content: '', type: layout === 'chart-text' ? 'chart' : 'text' },
        { id: 'col2', content: '', type: layout === 'text-chart' ? 'chart' : 'text' }
      ];
    }
    
    onChange([...sections, newSection]);
    setShowAddMenu(false);
  };
  
  // ContentEditable div style
  const editableStyle = {
    width: '100%', 
    padding: 12, 
    borderRadius: 6, 
    border: '1px solid ' + c.pearl, 
    fontSize: 13, 
    lineHeight: 1.6, 
    minHeight: 70, 
    outline: 'none', 
    background: '#fff',
    cursor: 'text'
  };
  
  return (
    <>
      {sections.map((section, idx) => {
        const isMultiColumn = section.layout && section.layout !== 'full' && section.columns;
        
        return (
          <div key={section.id || idx} style={{ marginBottom: 14, padding: 12, background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
            {/* Section header with title and controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <input
                value={section.title}
                onChange={(e) => updateSection(idx, 'title', e.target.value)}
                placeholder="Section title..."
                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, border: 'none', outline: 'none', background: 'transparent', fontWeight: 600, flex: 1 }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                  style={{ padding: '4px 8px', borderRadius: 4, background: idx === 0 ? c.pearl : c.slate, color: '#fff', fontSize: 10, border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>↑</button>
                <button type="button" onClick={() => moveSection(idx, 1)} disabled={idx >= sections.length - 1}
                  style={{ padding: '4px 8px', borderRadius: 4, background: idx >= sections.length - 1 ? c.pearl : c.slate, color: '#fff', fontSize: 10, border: 'none', cursor: idx >= sections.length - 1 ? 'default' : 'pointer', opacity: idx >= sections.length - 1 ? 0.5 : 1 }}>↓</button>
                <button type="button" onClick={() => removeSection(idx)}
                  style={{ padding: '4px 10px', borderRadius: 4, background: c.neg, color: '#fff', fontSize: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>✕</button>
              </div>
            </div>
            
            {/* Multi-column layout */}
            {isMultiColumn ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {section.columns.map((col, colIdx) => (
                  <div key={col.id} style={{ background: '#fff', borderRadius: 6, padding: 10, border: '1px solid ' + c.pearl }}>
                    <div style={{ fontSize: 9, color: c.slate, marginBottom: 6, textTransform: 'uppercase' }}>
                      {col.type === 'chart' ? '📊 Chart / Image' : '📝 Text'}
                    </div>
                    {col.type === 'chart' ? (
                      <div style={{ padding: 30, textAlign: 'center', border: '2px dashed ' + c.pearl, borderRadius: 6, background: c.ivory }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>📈</div>
                        <div style={{ fontSize: 10, color: c.slate }}>Drop image or click to upload</div>
                      </div>
                    ) : (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newCols = [...section.columns];
                          newCols[colIdx] = { ...col, content: e.currentTarget.innerHTML };
                          updateSection(idx, 'columns', newCols);
                        }}
                        dangerouslySetInnerHTML={{ __html: col.content || '' }}
                        style={{ ...editableStyle, padding: 10, minHeight: 60 }}
                        data-placeholder="Enter content..."
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : section.layout === 'excel' && section.excelBlock ? (
              <div>
                <ExcelBlock block={section.excelBlock}
                  onRefresh={(id, file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const wb = XLSX.read(e.target.result, { type:'array' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false, dateNF:'dd-mmm-yyyy' });
                        const rows = json.filter(r => r.some(c => c !== ''));
                        if (rows.length >= 2) {
                          const headers = rows[0].map((h,i) => h!==''?String(h):'Col '+(i+1));
                          const dataRows = rows.slice(1).map(row => row.map(v => v!==undefined&&v!==null?String(v):'empty'));
                          updateSection(idx, 'excelBlock', { ...section.excelBlock, headers, rows: dataRows, fileName: file.name });
                        }
                      } catch(err) { alert('Refresh failed: ' + err.message); }
                    };
                    reader.readAsArrayBuffer(file);
                  }}
                  onRemove={() => {
                    const updated = sections.map((s,i) => i===idx ? {...s, layout:'full', excelBlock:null, content:''} : s);
                    onChange(updated);
                  }} />
              </div>
            ) : (
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateSection(idx, 'content', e.currentTarget.innerHTML)}
                ref={(el) => { if (el && el !== document.activeElement) el.innerHTML = section.content || ''; }}
                style={editableStyle}
                data-placeholder={section.placeholder || 'Enter content...'}
              />
            )}
          </div>
        );
      })}
      
      {/* Add Section Button with Layout Options */}
      <div style={{ position: 'relative' }}>
        <button 
          type="button" 
          onClick={() => setShowAddMenu(!showAddMenu)}
          style={{ width: '100%', padding: 10, borderRadius: 6, border: '2px dashed ' + c.pearl, background: 'transparent', color: c.slate, fontSize: 11, cursor: 'pointer', marginBottom: 14 }}
        >
          {addButtonText} ▼
        </button>
        
        {showAddMenu && (
          <div style={{ 
            position: 'absolute', 
            bottom: '100%', 
            left: 0, 
            right: 0, 
            marginBottom: 4, 
            background: '#fff', 
            borderRadius: 8, 
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', 
            padding: 8,
            zIndex: 50
          }}>
            <div style={{ fontSize: 10, color: c.slate, padding: '4px 8px', marginBottom: 4 }}>Choose layout:</div>
            {sectionLayouts.map(layout => (
              <button
                key={layout.id}
                type="button"
                onClick={() => addSection(layout.id)}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: 4, 
                  border: 'none', 
                  background: 'transparent', 
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: c.navy,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = c.ivory}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 14, width: 30 }}>{layout.icon}</span>
                <span>{layout.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* CSS for placeholder */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #999;
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 20px; font-weight: 700; color: #0A2540; margin: 12px 0 8px; font-family: Georgia, serif; }
        [contenteditable] h2 { font-size: 17px; font-weight: 600; color: #0A2540; margin: 10px 0 6px; font-family: Georgia, serif; }
        [contenteditable] h3 { font-size: 15px; font-weight: 600; color: #0A2540; margin: 8px 0 4px; }
        [contenteditable] p { margin: 0 0 8px; }
      `}</style>
      {showExcelPicker && (
        <ExcelConnectorModal isOpen={showExcelPicker} onClose={() => setShowExcelPicker(false)}
          onInsert={(block) => {
            const newSection = {
              id: 'excel_' + Date.now(),
              title: block.tableName || 'Excel Data',
              content: 'excel',
              layout: 'excel',
              excelBlock: block,
            };
            onChange([...sections, newSection]);
            setShowExcelPicker(false);
            if (onExcelInsert) onExcelInsert(block);
          }} />
      )}
    </>
  );
};


const TextArea = ({ defaultValue, minHeight = 60, placeholder }) => (
  <textarea 
    defaultValue={defaultValue} 
    placeholder={placeholder}
    style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${c.pearl}`, fontSize: 12, lineHeight: 1.5, resize: 'none', minHeight, outline: 'none' }} 
  />
);

const Input = ({ defaultValue, placeholder, style = {} }) => (
  <input 
    defaultValue={defaultValue} 
    placeholder={placeholder}
    style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${c.pearl}`, fontSize: 12, outline: 'none', ...style }} 
  />
);

const TitleInput = ({ defaultValue, placeholder }) => (
  <input 
    defaultValue={defaultValue} 
    placeholder={placeholder}
    style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} 
  />
);

const ProductTagsInput = ({ productTags, onChange }) => {
  const [input, setInput] = React.useState('');
  const tags = productTags || [];

  const add = (raw) => {
    const val = raw.trim().toUpperCase().replace(/[^A-Z0-9.:-]/g, '');
    if (!val || tags.includes(val)) return;
    onChange([...tags, val]);
    setInput('');
  };

  const remove = (tag) => onChange(tags.filter(t => t !== tag));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div style={{ paddingTop: 14, borderTop: '1px solid ' + c.pearl, marginTop: 14 }}>
      <SectionLabel>Product Tags <span style={{ fontWeight: 400, color: c.slate, fontSize: 9, textTransform: 'none', letterSpacing: 0 }}>— tickers, funds, instruments</span></SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '7px 8px', borderRadius: 6, border: '1px solid ' + c.pearl, background: '#fff', minHeight: 36, alignItems: 'center', cursor: 'text' }}
        onClick={() => document.getElementById('product-tag-input')?.focus()}>
        {tags.map(tag => (
          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: c.navy, color: c.gold, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 0.5 }}>
            {tag}
            <button onClick={(e) => { e.stopPropagation(); remove(tag); }}
              style={{ background: 'none', border: 'none', color: 'rgba(193,163,100,0.6)', cursor: 'pointer', padding: 0, fontSize: 10, lineHeight: 1, fontWeight: 700 }}>×</button>
          </span>
        ))}
        <input id="product-tag-input" value={input} onChange={e => setInput(e.target.value.toUpperCase())} onKeyDown={handleKey}
          placeholder={tags.length ? '' : 'NVDA, AAPL, BRK.B…'}
          style={{ border: 'none', outline: 'none', fontSize: 11, fontFamily: 'monospace', minWidth: 80, flex: 1, color: c.navy, background: 'transparent', padding: '2px 0' }} />
      </div>
      <div style={{ fontSize: 9, color: c.slate, marginTop: 4 }}>Type ticker and press Enter or Space to add. Backspace removes last tag.</div>
    </div>
  );
};

const TagsSection = ({ tags }) => (
  <div style={{ paddingTop: 14, borderTop: `1px solid ${c.pearl}`, marginTop: 14 }}>
    <SectionLabel>Auto-Generated Tags</SectionLabel>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {tags.map((t, i) => <Tag key={i} name={t.name} sentiment={t.s} />)}
    </div>
  </div>
);

const Disclaimer = () => (
  <div style={{ marginTop: 14, padding: 10, borderRadius: 6, fontSize: 9, lineHeight: 1.5, background: c.pearl, color: c.slate }}>
    <strong>Important:</strong> This material is for informational purposes only and does not constitute investment advice. Past performance is not indicative of future results.
  </div>
);

// ============================================
// RICH SECTION EDITOR - IMPROVED
// ============================================

const sectionTypes = [
  { id: 'paragraph', label: 'Paragraph', icon: '¶', desc: 'Standard text block' },
  { id: 'heading', label: 'Heading', icon: 'H', desc: 'Section title' },
  { id: 'callout', label: 'Callout', icon: '💡', desc: 'Key takeaway box' },
  { id: 'quote', label: 'Quote', icon: '"', desc: 'Pull quote' },
  { id: 'bullets', label: 'Bullets', icon: '•', desc: 'Bullet list' },
  { id: 'chart', label: 'Chart', icon: '📊', desc: 'Chart placeholder' },
];

const RichSectionEditor = ({ sections: propSections, onChange }) => {
  const defaultSections = [{ id: Date.now(), type: 'paragraph', content: '' }];
  const sections = propSections && propSections.length > 0 ? propSections : defaultSections;
  
  const [activeId, setActiveId] = useState(null);
  const [showTypeMenu, setShowTypeMenu] = useState(null); // section id or 'new-{position}'

  const updateSections = (newSections) => {
    onChange && onChange(newSections);
  };

  const addSection = (type, position) => {
    const newSection = { id: Date.now(), type, content: '' };
    const newSections = [...sections];
    newSections.splice(position, 0, newSection);
    updateSections(newSections);
    setShowTypeMenu(null);
    setActiveId(newSection.id);
  };

  const updateSection = (id, updates) => {
    updateSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id) => {
    if (sections.length <= 1) {
      // Reset to empty instead of deleting last
      updateSections([{ id: Date.now(), type: 'paragraph', content: '' }]);
    } else {
      updateSections(sections.filter(s => s.id !== id));
    }
    setActiveId(null);
  };

  const moveSection = (id, direction) => {
    const index = sections.findIndex(s => s.id === id);
    if ((direction === -1 && index === 0) || (direction === 1 && index === sections.length - 1)) return;
    const newSections = [...sections];
    const [removed] = newSections.splice(index, 1);
    newSections.splice(index + direction, 0, removed);
    updateSections(newSections);
  };

  const changeType = (id, newType) => {
    updateSection(id, { type: newType });
    setShowTypeMenu(null);
  };

  // Add button between sections
  const AddButton = ({ position }) => (
    <div style={{ 
      height: 24, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      <button
        onClick={() => setShowTypeMenu(showTypeMenu === 'new-' + position ? null : 'new-' + position)}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '1px dashed ' + c.slate,
          background: showTypeMenu === 'new-' + position ? c.gold : '#fff',
          color: showTypeMenu === 'new-' + position ? '#fff' : c.slate,
          fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.5, transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
        onMouseLeave={(e) => e.currentTarget.style.opacity = showTypeMenu === 'new-' + position ? 1 : 0.5}
      >+</button>
      
      {showTypeMenu === 'new-' + position && (
        <div style={{
          position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          padding: 8, zIndex: 100, minWidth: 160
        }}>
          {sectionTypes.map(t => (
            <button
              key={t.id}
              onClick={() => addSection(t.id, position)}
              style={{
                width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                borderRadius: 6, fontSize: 12, color: c.navy, textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = c.ivory}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 20, textAlign: 'center' }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Type change dropdown
  const TypeMenu = ({ sectionId, currentType }) => (
    <div style={{
      position: 'absolute', top: '100%', left: 0, marginTop: 4,
      background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: 6, zIndex: 100, minWidth: 140
    }}>
      {sectionTypes.map(t => (
        <button
          key={t.id}
          onClick={() => changeType(sectionId, t.id)}
          style={{
            width: '100%', padding: '6px 10px', border: 'none',
            background: t.id === currentType ? c.ivory : 'transparent',
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            borderRadius: 4, fontSize: 11, color: c.navy, textAlign: 'left'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = c.ivory}
          onMouseLeave={(e) => e.currentTarget.style.background = t.id === currentType ? c.ivory : 'transparent'}
        >
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderSectionContent = (section) => {
    const baseTextStyle = {
      width: '100%', border: 'none', outline: 'none', resize: 'none',
      background: 'transparent', fontSize: 13, lineHeight: 1.6, color: c.slate
    };

    switch (section.type) {
      case 'heading':
        return (
          <input
            value={section.content}
            onChange={(e) => updateSection(section.id, { content: e.target.value })}
            placeholder="Section heading..."
            style={{ ...baseTextStyle, fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 600, color: c.navy }}
          />
        );
      case 'callout':
        return (
          <div style={{ padding: 12, background: '#fff', borderRadius: 6, borderLeft: '3px solid ' + c.teal }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: c.teal, marginBottom: 6, fontWeight: 600 }}>Key Takeaway</div>
            <textarea
              value={section.content}
              onChange={(e) => updateSection(section.id, { content: e.target.value })}
              placeholder="Enter key insight..."
              style={{ ...baseTextStyle, minHeight: 40 }}
            />
          </div>
        );
      case 'quote':
        return (
          <div style={{ paddingLeft: 16, borderLeft: '2px solid ' + c.gold }}>
            <textarea
              value={section.content}
              onChange={(e) => updateSection(section.id, { content: e.target.value })}
              placeholder="Enter quote..."
              style={{ ...baseTextStyle, fontStyle: 'italic', minHeight: 40 }}
            />
          </div>
        );
      case 'bullets':
        return (
          <textarea
            value={section.content}
            onChange={(e) => updateSection(section.id, { content: e.target.value })}
            placeholder="• First point&#10;• Second point&#10;• Third point"
            style={{ ...baseTextStyle, minHeight: 60, paddingLeft: 4 }}
          />
        );
      case 'chart':
        return (
          <div style={{ padding: 24, background: '#fff', borderRadius: 6, border: '2px dashed ' + c.pearl, textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>📊</div>
            <div style={{ fontSize: 11, color: c.slate }}>Chart placeholder</div>
          </div>
        );
      default: // paragraph
        return (
          <textarea
            value={section.content}
            onChange={(e) => updateSection(section.id, { content: e.target.value })}
            placeholder="Enter content..."
            style={{ ...baseTextStyle, minHeight: 50 }}
          />
        );
    }
  };

  return (
    <div onClick={() => { setActiveId(null); setShowTypeMenu(null); }}>
      {sections.map((section, index) => {
        const isActive = activeId === section.id;
        const typeInfo = sectionTypes.find(t => t.id === section.type);
        
        return (
          <div key={section.id}>
            {/* Add button before each section */}
            <AddButton position={index} />
            
            {/* Section */}
            <div
              onClick={(e) => { e.stopPropagation(); setActiveId(section.id); setShowTypeMenu(null); }}
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid ' + (isActive ? c.gold : 'transparent'),
                background: isActive ? '#fff' : 'transparent',
                position: 'relative',
                transition: 'all 0.15s'
              }}
            >
              {/* Toolbar - shows on active */}
              {isActive && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10,
                  paddingBottom: 10, borderBottom: '1px solid ' + c.pearl
                }}>
                  {/* Type selector */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowTypeMenu(showTypeMenu === section.id ? null : section.id); }}
                      style={{
                        padding: '4px 10px', borderRadius: 4, border: '1px solid ' + c.pearl,
                        background: '#fff', fontSize: 10, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, color: c.navy
                      }}
                    >
                      <span>{typeInfo?.icon}</span>
                      <span>{typeInfo?.label}</span>
                      <span style={{ fontSize: 8, color: c.slate }}>▼</span>
                    </button>
                    {showTypeMenu === section.id && <TypeMenu sectionId={section.id} currentType={section.type} />}
                  </div>
                  
                  <div style={{ flex: 1 }} />
                  
                  {/* Move buttons */}
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSection(section.id, -1); }}
                    disabled={index === 0}
                    style={{
                      width: 24, height: 24, borderRadius: 4, border: '1px solid ' + c.pearl,
                      background: '#fff', cursor: index === 0 ? 'default' : 'pointer',
                      opacity: index === 0 ? 0.3 : 1, fontSize: 10
                    }}
                  >↑</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSection(section.id, 1); }}
                    disabled={index === sections.length - 1}
                    style={{
                      width: 24, height: 24, borderRadius: 4, border: '1px solid ' + c.pearl,
                      background: '#fff', cursor: index === sections.length - 1 ? 'default' : 'pointer',
                      opacity: index === sections.length - 1 ? 0.3 : 1, fontSize: 10
                    }}
                  >↓</button>
                  
                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                    style={{
                      width: 24, height: 24, borderRadius: 4, border: '1px solid ' + c.neg,
                      background: '#fff', cursor: 'pointer', fontSize: 10, color: c.neg
                    }}
                  >✕</button>
                </div>
              )}
              
              {/* Section content */}
              {renderSectionContent(section)}
            </div>
          </div>
        );
      })}
      
      {/* Add button at the end */}
      <AddButton position={sections.length} />
    </div>
  );
};

// ============================================
// AI DRAFTING PANEL
// ============================================

// Animated progress bar for M&M 16k generation
const MacroProgress = () => {
  const [elapsed, setElapsed] = React.useState(0);
  const stages = [
    { at: 0,  label: 'Reading your brief...' },
    { at: 8,  label: 'Researching the thesis...' },
    { at: 20, label: 'Drafting opening context...' },
    { at: 35, label: 'Building core analysis...' },
    { at: 55, label: 'Writing risks & implications...' },
    { at: 72, label: 'Composing conclusion...' },
    { at: 85, label: 'Polishing the essay...' },
    { at: 95, label: 'Almost done...' },
  ];
  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const pct = Math.min(97, (elapsed / 90) * 100);
  const stage = [...stages].reverse().find(s => elapsed >= s.at) || stages[0];
  return (
    <div>
      <div style={{ fontSize: 11, color: c.gold, fontWeight: 600, marginBottom: 6 }}>{stage.label}</div>
      <div style={{ width: '100%', height: 4, background: c.pearl, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, ' + c.gold + ', ' + c.teal + ')', borderRadius: 4, transition: 'width 1s linear' }} />
      </div>
      <div style={{ fontSize: 10, color: c.slate, marginTop: 4, textAlign: 'right' }}>{elapsed}s</div>
    </div>
  );
};

const AIDraftingPanel = ({ isOpen, onClose, templateName, templateId, content, onApplyDraft }) => {
  const isMacro = templateId === 'macroMarkets';
  
  // Standard mode state
  const [bullets, setBullets] = useState(''); // object for macroMarkets, string for others
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedVertical, setSelectedVertical] = useState('');
  
  // Macro mode state — rich brief fields
  const [macroThesis, setMacroThesis] = useState('');
  const [macroMarkets, setMacroMarkets] = useState('');
  const [macroData, setMacroData] = useState('');
  const [macroJpmView, setMacroJpmView] = useState('');
  const [macroCharts, setMacroCharts] = useState('');
  const [macroContradict, setMacroContradict] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftContent, setDraftContent] = useState(null);
  const [error, setError] = useState(null);
  const [generationStep, setGenerationStep] = useState('');
  const [aiSources, setAiSources] = useState(['full-web']);
  const [aiStreetFirms, setAiStreetFirms] = useState([]);

  const AI_SOURCES = [
    { id: 'full-web', label: 'Full Web', icon: '🌐' },
    { id: 'trusted-web', label: 'Trusted Web', icon: '✅', desc: 'FT, Bloomberg, Reuters, WSJ' },
    { id: 'jpm-ib', label: 'JPM IB Research', icon: '🏦' },
    { id: 'jpm-pb', label: 'JPM Private Bank', icon: '🔒' },
    { id: 'street-views', label: 'Street Views', icon: '📊' },
  ];
  const STREET_FIRMS = ['Goldman Sachs', 'Morgan Stanley', 'UBS', 'Citi', 'Deutsche Bank', 'BofA', 'Barclays'];

  const getSourceContext = () => [
    aiSources.includes('trusted-web') ? 'Draw on Financial Times, Bloomberg, Reuters, Wall Street Journal and Economist sources.' : '',
    aiSources.includes('jpm-ib') ? 'Reference JPMorgan Investment Bank research perspectives where relevant.' : '',
    aiSources.includes('jpm-pb') ? 'Reference J.P. Morgan Private Bank GIS positioning and published views.' : '',
    aiSources.includes('street-views') && aiStreetFirms.length > 0 ? `Consider and reference views from: ${aiStreetFirms.join(', ')}.` : '',
  ].filter(Boolean).join(' ');

  const getSystemPrompt = () => {
    if (isMacro) return "You are a senior J.P. Morgan Private Bank Economy & Markets writer. Calm, measured, intellectually confident. Polished essay. Return only XML.";
    const prompts = {
      deskCommentary: "You are a senior J.P. Morgan Private Bank strategist. Write a Headline View: 100-150 words, lead with conclusion, direct active voice, JPM/Bridgewater style. Return only XML.",
      topMarketTakeaways: "You are a senior J.P. Morgan Private Bank strategist. Write a TMT as a thesis-driven narrative essay — NOT a list. Provocative title, flowing narrative with descriptive headings, 600-900 words, polished op-ed style. Return only XML.",
      ideasInsights: "You are a senior J.P. Morgan Private Bank GIS strategist. Write an Ideas & Insights deep-dive. CRITICAL RULES: (1) Every I&I must feel completely different — choose section headings that fit THIS specific thesis, never generic ones. (2) 2 CHART tags with real numerical data are MANDATORY — if you omit them the output is wrong. (3) All values in each chart must use consistent units. (4) Lead every section with the point, then support it. (5) 1,200-2,000 words. Return only XML.",
      eventResponse: "You are a J.P. Morgan Private Bank strategist. Write a live event response feed. Desk commentary style — 40-60 words per update. Reactive, direct. Return only XML.",
    };
    return prompts[templateId] || "You are a senior J.P. Morgan Private Bank strategist. Institutional voice, direct, confident. Lead with conclusion. Return only XML.";
  };

  const getWordTarget = () => {
    const targets = {
      deskCommentary: '100-150 words. One tight paragraph. Lead with conclusion. JPM/Bridgewater institutional voice.',
      morningMeeting: 'Under 300 words total. One line per section.',
      eventResponse: '50 words max for headline. Each update 40-60 words — desk commentary style, reactive, rolling news feed.',
      topMarketTakeaways: '600-900 words. Single thesis, narrative essay. JPM Private Bank voice. Provocative title. Descriptive section headings.',
      specialistSpotlight: 'Under 200 words.',
      ideasInsights: '1,200-2,000 words. Deep investment analysis. Always includes 2 charts. JPM GIS voice.',
      macroMarkets: '3,000 words. Polished essay format. JPM Private Bank Economy & Markets voice. Always external.',
    };
    return targets[templateId] || '200-400 words.';
  };

  const getXmlStructure = () => {
    if (templateId === 'dailyMarketUpdate') return '<TITLE>title</TITLE><SECTION id="keystats" title="Key Stats">2-3 bullet headline stats</SECTION><SECTION id="commentary" title="Market Commentary">150 word market context</SECTION><SECTION id="interesting1" title="1. [Story name]">50 word summary of story 1</SECTION><SECTION id="view1" title="Our View">JPM view on story 1</SECTION><SECTION id="why1" title="Why It Matters">Client relevance, story 1</SECTION><SECTION id="interesting2" title="2. [Story name]">50 word summary of story 2</SECTION><SECTION id="view2" title="Our View">JPM view on story 2</SECTION><SECTION id="why2" title="Why It Matters">Client relevance, story 2</SECTION><SECTION id="interesting3" title="3. [Story name]">50 word summary of story 3</SECTION><SECTION id="view3" title="Our View">JPM view on story 3</SECTION><SECTION id="why3" title="Why It Matters">Client relevance, story 3</SECTION><SECTION id="psa" title="PSAs">Any housekeeping</SECTION>';
    if (templateId === 'deskCommentary') return '<TITLE>title</TITLE><SECTION id="headline" title="Headline View">100-150 word desk commentary — lead with conclusion, JPM/Bridgewater voice</SECTION>';
    if (templateId === 'topMarketTakeaways') return '<TITLE>provocative thesis-driven title</TITLE><SECTION id="hook" title="Opening Paragraph">opening paragraph — state the tension, ~100 words, no heading in final output</SECTION><SECTION id="thekey" title="The Key">2-3 sentence crystallisation of the central insight</SECTION><SECTION id="section2" title="[Descriptive narrative heading]">first narrative section with specific data, ~175 words</SECTION><SECTION id="section3" title="[Descriptive narrative heading]">second narrative section, ~175 words</SECTION><SECTION id="close" title="Portfolio Implications">investor so-what, ~90 words</SECTION>';
    if (templateId === 'specialistSpotlight') return '<TITLE>title</TITLE><SECTION id="lead" title="The Lead">content</SECTION><SECTION id="view" title="The View">content</SECTION><SECTION id="why_now" title="Why Now">content</SECTION><SECTION id="takeaway" title="Advisor Takeaway">content</SECTION>';
    if (templateId === 'ideasInsights') return '<TITLE>title</TITLE><SUBTITLE>one compelling standfirst sentence</SUBTITLE><SECTION id="opportunity" title="The Opportunity">~150 words — state the investment insight and JPM view</SECTION><SECTION id="data" title="What the Data Shows">~300 words — evidence base, reference Chart 1</SECTION><SECTION id="missing" title="What the Market Is Missing">~300 words — differentiated JPM view, reference Chart 2</SECTION><SECTION id="jpmview" title="The JPM View">~150 words — unambiguous position</SECTION><SECTION id="action" title="What To Do">~150 words — specific allocation guidance</SECTION><CHART id="chart1" title="descriptive title" type="Line" yLabel="axis label" source="source, year" caption="what this shows"><DATAPOINTS>Year1:val,Year2:val,Year3:val,Year4:val,Year5:val</DATAPOINTS></CHART><CHART id="chart2" title="descriptive title" type="Bar" yLabel="axis label" source="source, year" caption="what this shows"><DATAPOINTS>Cat1:val,Cat2:val,Cat3:val,Cat4:val</DATAPOINTS></CHART>IMPORTANT: Both CHART tags are required.';
    return '<TITLE>title</TITLE><SECTION id="key" title="Key Message">content</SECTION><SECTION id="context" title="Context">content</SECTION><SECTION id="view" title="Our View">content</SECTION>';
  };

  const getJsonStructure = () => {
    if (templateId === 'dailyMarketUpdate') return '<TITLE>title</TITLE><SECTION id="keystats" title="Key Stats">2-3 bullet headline stats</SECTION><SECTION id="commentary" title="Market Commentary">150 word market context</SECTION><SECTION id="interesting1" title="1. [Story name]">50 word summary of story 1</SECTION><SECTION id="view1" title="Our View">JPM view on story 1</SECTION><SECTION id="why1" title="Why It Matters">Client relevance, story 1</SECTION><SECTION id="interesting2" title="2. [Story name]">50 word summary of story 2</SECTION><SECTION id="view2" title="Our View">JPM view on story 2</SECTION><SECTION id="why2" title="Why It Matters">Client relevance, story 2</SECTION><SECTION id="interesting3" title="3. [Story name]">50 word summary of story 3</SECTION><SECTION id="view3" title="Our View">JPM view on story 3</SECTION><SECTION id="why3" title="Why It Matters">Client relevance, story 3</SECTION><SECTION id="psa" title="PSAs">Any housekeeping</SECTION>';
    if (templateId === 'deskCommentary') {
      return '{"title":"string","sections":[{"id":"headline","title":"Headline View","content":"string"},{"id":"what","title":"What Happened","content":"string"},{"id":"why","title":"Why It Matters","content":"string"},{"id":"view","title":"Our View / Action","content":"string"}]}';
    }
    if (templateId === 'topMarketTakeaways') {
      return '{"title":"string","sections":[{"id":"hook","title":"The Opening","content":"string (journalistic scene-setter paragraph)"},{"id":"take1","title":"Takeaway 1","content":"string"},{"id":"take2","title":"Takeaway 2","content":"string"},{"id":"take3","title":"Takeaway 3","content":"string"},{"id":"close","title":"The Bottom Line","content":"string"}]}';
    }
    if (templateId === 'specialistSpotlight') {
      return '{"title":"string","sections":[{"id":"lead","title":"The Lead","content":"string"},{"id":"view","title":"The View","content":"string"},{"id":"why_now","title":"Why Now","content":"string"},{"id":"takeaway","title":"Advisor Takeaway","content":"string"}]}';
    }
    if (templateId === 'ideasInsights') {
      return '{"title":"string","sections":[{"id":"exec","title":"The Big Idea","content":"string"},{"id":"setup","title":"The Setup","content":"string"},{"id":"deep","title":"Deep Dive","content":"string"},{"id":"impl","title":"Client Implications","content":"string"},{"id":"view","title":"Our View","content":"string"}]}';
    }
    if (templateId === 'macroMarkets') {
      return '{"title":"string","tagline":"string","sections":[{"id":"exec","title":"Executive Summary","content":"string"},{"id":"context","title":"The Macro Context","content":"string"},{"id":"analysis1","title":"Analysis I","content":"string"},{"id":"analysis2","title":"Analysis II","content":"string"},{"id":"analysis3","title":"Analysis III","content":"string"},{"id":"risks","title":"Key Risks","content":"string"},{"id":"impl","title":"Portfolio Implications","content":"string"},{"id":"view","title":"Our View","content":"string"}]}';
    }
    return '{"title":"string","sections":[{"id":"key","title":"Key Message","content":"string"},{"id":"context","title":"Context","content":"string"},{"id":"view","title":"Our View","content":"string"}]}';
  };

  const buildStandardPrompt = () => {
    const verticalInstruction = selectedVertical ? `Client vertical: tailor for clients with wealth from ${selectedVertical}.` : '';
    return `Template: ${templateName}
Word target: ${getWordTarget()}
${verticalInstruction}

Writer brief:
${bullets}

Return content using ONLY these XML tags, no JSON, no markdown:
${getXmlStructure()}`;
  };

  const buildMacroPrompt = () => {
    const thesis = macroThesis;
    const markets = macroMarkets || 'Global wherever the analysis leads';
    const data = macroData || 'Use plausible current market data conceptually';
    const jpmView = macroJpmView || 'Construct a credible conviction-led JPM Private Bank view';
    const charts = macroCharts || 'Identify the most analytically powerful charts for this thesis';
    const contradict = macroContradict || 'Identify and reframe the prevailing market narrative';
    const vertical = selectedVertical ? 'Client vertical: tailor for clients with wealth from ' + selectedVertical + '.' : '';

    return 'ROLE: You are writing a client-facing investment insight in the style of J.P. Morgan Private Bank Economy & Markets. Not sell-side research. A sophisticated, explanatory narrative for UHNW clients and their advisors.\n\n'
      + 'TONE: Calm, measured, intellectually confident. Analytical but accessible. Forward-looking without being sensational. Help the reader think better. Polished essay, not bullet points.\n\n'
      + 'STRUCTURE:\n'
      + '1. HEADLINE: Slightly contrarian, framed as a question or reframing statement\n'
      + '2. OPENING CONTEXT: 2-3 paragraphs. Why topical. Prevailing misconception. Signal it is more nuanced.\n'
      + '3. CORE ANALYSIS: 2-4 sections with descriptive headings. Mechanisms, trade-offs, second-order effects.\n'
      + '4. KEY RISKS: 200 words. What could change the outlook.\n'
      + '5. IMPLICATIONS AND WHAT TO WATCH: 200 words. What to monitor.\n'
      + '6. CONCLUSION: 150 words. Calm restatement. Perspective and patience.\n\n'
      + 'GUARDRAILS: No marketing language. No bullet points. No exaggerated certainty. Intelligent time-constrained reader. Target 3,000 words.\n\n'
      + vertical + '\n\n'
      + 'RESEARCH BRIEF:\n'
      + 'Thesis: ' + thesis + '\n'
      + 'Markets/regions: ' + markets + '\n'
      + 'Key data: ' + data + '\n'
      + 'JPM view: ' + jpmView + '\n'
      + 'Charts: ' + charts + '\n'
      + 'Consensus to challenge: ' + contradict + '\n\n'
      + 'Return ONLY these XML tags, no markdown:\n'
      + '<TITLE>headline</TITLE>\n'
      + '<SECTION id="opening" title="Opening Context">content</SECTION>\n'
      + '<SECTION id="analysis1" title="descriptive heading">content</SECTION>\n'
      + '<SECTION id="analysis2" title="descriptive heading">content</SECTION>\n'
      + '<SECTION id="analysis3" title="descriptive heading">content</SECTION>\n'
      + '<SECTION id="risks" title="Key Risks">content</SECTION>\n'
      + '<SECTION id="implications" title="Implications and What to Watch">content</SECTION>\n'
      + '<SECTION id="conclusion" title="Conclusion">content</SECTION>';
  };

  const handleGenerate = async () => {
    const hasInput = isMacro ? macroThesis.trim() : bullets.trim();
    if (!hasInput) return;
    setIsGenerating(true);
    setError(null);
    setDraftContent(null);
    setGenerationStep(isMacro ? 'Building research piece...' : 'Generating draft...');
    try {
      const maxTokens = isMacro ? 16000 : 4000;
      const model = isMacro ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-5-20251001';
      const userPrompt = isMacro ? buildMacroPrompt() : buildStandardPrompt();
      const sourceCtx = getSourceContext();
      const systemWithSources = sourceCtx
        ? getSystemPrompt() + ` Source context: ${sourceCtx}`
        : getSystemPrompt();
      const useWebSearch = aiSources.includes('full-web') || aiSources.includes('trusted-web');
      const raw = await callClaude({ model, max_tokens: maxTokens, system: systemWithSources, tools: useWebSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined, messages: [{ role: 'user', content: userPrompt }] });
      setGenerationStep('Parsing...');
      // raw is already text from callClaude
      if (!raw) { setError('No response from API.'); return; }

      if (isMacro) {
        const parsed = parseMacroResponse(raw);
        if (parsed) { setDraftContent(parsed); }
        else { setDraftContent({ title: 'Draft', tagline: '', sections: [{ id: 'raw', title: 'Content', content: raw }] }); }
      } else {
        const parsed = parseTagged(raw);
        if (!parsed.title && (!parsed.sections || !parsed.sections.length)) {
          setError('Could not parse response. Raw: ' + raw.slice(0, 100));
          return;
        }
        setDraftContent(parsed);
      }
    } catch (err) {
      setError('Failed: ' + err.message);
      console.error(err);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };
  const handleApplyToEditor = () => {
    if (draftContent && onApplyDraft) {
      onApplyDraft(draftContent);
      onClose();
    }
  };

  if (!isOpen) return null;

  const totalDraftWords = draftContent?.sections ? draftContent.sections.reduce((a, s) => a + wordCount(s.content || ''), 0) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,47,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: '96%', maxWidth: isMacro ? 1400 : 1200, maxHeight: '92vh', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid ' + c.pearl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.navy }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: isMacro ? c.gold : c.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14 }}>{isMacro ? '🔬' : '✨'}</span>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                {isMacro ? 'AI Research Assistant' : 'AI Assist'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                {templateName} · {isMacro ? 'Research Brief Mode — generates 3,000-4,000 words' : 'Draft Mode'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* ── LEFT: INPUT ── */}
          <div style={{ width: isMacro ? '42%' : '36%', padding: 20, borderRight: '1px solid ' + c.pearl, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            
            {isMacro ? (
              // MACRO MODE — rich brief fields
              <>
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FFF9ED', borderLeft: '3px solid ' + c.gold, borderRadius: '0 6px 6px 0', fontSize: 10, color: c.slate, lineHeight: 1.6 }}>
                  <strong style={{ color: c.gold }}>Research Brief</strong> — Fill in as much or as little as you have. The AI will produce a full 5,000+ word research piece from your brief. The more detail you give, the more accurate the research will be.
                </div>

                {[
                  { key: 'macroThesis', label: 'Core Research Thesis *', val: macroThesis, set: setMacroThesis, placeholder: "What is the central argument of this piece? Eg The dollars reserve currency status faces a structural not cyclical challenge as EM central banks accelerate de-dollarisation and alternative settlement rails mature.", rows: 4, required: true },
                  { key: 'macroMarkets', label: 'Markets / Regions / Assets', val: macroMarkets, set: setMacroMarkets, placeholder: 'Which markets, geographies or instruments should the analysis focus on? E.g. "USD, UST 10yr, EM local currency FX, gold, CNY cross-border flows"', rows: 2 },
                  { key: 'macroData', label: 'Key Data Points to Reference', val: macroData, set: setMacroData, placeholder: 'Any specific numbers, levels, or stats you want included. E.g. "USD share of global reserves down to 58% (IMF), EM central bank gold purchases at 40-year high, BIS SWIFT alternatives now covering 30+ currencies"', rows: 3 },
                  { key: 'macroJpmView', label: 'JPM House View / Our Angle', val: macroJpmView, set: setMacroJpmView, placeholder: "What is the JPM position and what should clients do? E.g. Reduce USD overweight, increase gold allocation, diversify into EUR and JPY hedged EM local bonds", rows: 2 },
                  { key: 'macroCharts', label: 'Chart Narratives (optional)', val: macroCharts, set: setMacroCharts, placeholder: 'What should the charts show? E.g. "Chart 1: USD share of global reserves 1999-2026 vs gold. Chart 2: EM central bank net gold purchases. Chart 3: SWIFT alternative settlement volumes"', rows: 2 },
                  { key: 'macroContradict', label: 'Consensus to Challenge (optional)', val: macroContradict, set: setMacroContradict, placeholder: 'What is the prevailing market consensus that this piece should challenge? E.g. "The consensus view that dollar dominance is structural and irreversible"', rows: 2 },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: field.required ? c.gold : c.slate, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {field.label}
                    </label>
                    <textarea value={field.val} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder} rows={field.rows}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid ' + (field.required ? c.gold + '60' : c.pearl), fontSize: 11, lineHeight: 1.6, resize: 'none', outline: 'none', background: field.required ? '#FFFDF5' : '#fff' }} />
                  </div>
                ))}
              </>
            ) : (
              // STANDARD MODE
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.navy, marginBottom: 3 }}>Your Brief</div>
                  <div style={{ fontSize: 10, color: c.slate, marginBottom: 8 }}>Word target: <strong>{getWordTarget()}</strong></div>
                </div>
                <textarea value={bullets} onChange={e => setBullets(e.target.value)}
                  placeholder={"Enter your brief or bullet points:\n• Fed held rates\n• AI capex strong\n• Europe defense spending\n• Watch PCE data today"}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid ' + c.pearl, fontSize: 12, lineHeight: 1.6, resize: 'none', outline: 'none', minHeight: 140 }} />
                
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + c.pearl }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: c.slate, marginBottom: 8 }}>Style & Tone</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { id: 'institutional', label: '🏛️ Institutional' },
                      { id: 'concise', label: '✂️ Concise' },
                      { id: 'street', label: '📊 Street Color' },
                      { id: 'conviction', label: '⚡ High Conviction' },
                      { id: 'data', label: '📈 Data-Rich' },
                      { id: 'risks', label: '⚠️ Include Risks' },
                    ].map(style => (
                      <button key={style.id} onClick={() => setSelectedStyles(prev => prev.includes(style.id) ? prev.filter(s => s !== style.id) : [...prev, style.id])}
                        style={{ fontSize: 10, padding: '5px 9px', borderRadius: 5, border: '1px solid ' + (selectedStyles.includes(style.id) ? c.teal : c.pearl), background: selectedStyles.includes(style.id) ? c.teal + '15' : '#fff', color: selectedStyles.includes(style.id) ? c.teal : c.slate, cursor: 'pointer', fontWeight: selectedStyles.includes(style.id) ? 600 : 400 }}>
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Vertical */}
                <div style={{ paddingTop: 12, borderTop: '1px solid ' + c.pearl }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: c.slate, marginBottom: 8 }}>Client Vertical <span style={{ fontWeight: 400, color: c.slate, opacity: 0.7 }}>(optional)</span></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {[
                      { id: 'Sports & Entertainment', label: '🏆 Sports' },
                      { id: 'Technology & Innovation', label: '💻 Technology' },
                      { id: 'Finance & Investment', label: '💰 Finance' },
                      { id: 'Real Estate & Property', label: '🏢 Real Estate' },
                      { id: 'Healthcare & Life Sciences', label: '🏥 Healthcare' },
                      { id: 'Energy & Natural Resources', label: '⚡ Energy' },
                      { id: 'Entrepreneurship & Startups', label: '🚀 Entrepreneur' },
                      { id: 'Family Office & Dynasty Wealth', label: '👨‍👩‍👧 Family Office' },
                      { id: 'Legal & Professional Services', label: '⚖️ Legal' },
                      { id: 'Media & Creative Industries', label: '🎬 Media' },
                    ].map(v => (
                      <button key={v.id} onClick={() => setSelectedVertical(prev => prev === v.id ? '' : v.id)}
                        style={{ fontSize: 10, padding: '5px 9px', borderRadius: 5, cursor: 'pointer',
                          border: '1px solid ' + (selectedVertical === v.id ? c.gold : c.pearl),
                          background: selectedVertical === v.id ? c.gold + '22' : '#fff',
                          color: selectedVertical === v.id ? '#7A5C1E' : c.slate,
                          fontWeight: selectedVertical === v.id ? 600 : 400 }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                  {selectedVertical && (
                    <div style={{ marginTop: 6, fontSize: 9, color: c.gold, fontWeight: 600 }}>
                      ✓ Content will be tailored for {selectedVertical} clients
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Source selector */}
            <div style={{ marginTop: 14, padding: '12px 14px', background: '#fff', borderRadius: 8, border: '1px solid ' + c.pearl }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sources</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: aiSources.includes('street-views') ? 8 : 0 }}>
                {AI_SOURCES.map(s => (
                  <button key={s.id} onClick={() => setAiSources(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                    style={{ padding: '4px 9px', borderRadius: 12, border: '1px solid ' + (aiSources.includes(s.id) ? '#6B5B95' : c.pearl), background: aiSources.includes(s.id) ? '#F5F3FF' : '#fff', color: aiSources.includes(s.id) ? '#6B5B95' : c.slate, fontSize: 10, fontWeight: aiSources.includes(s.id) ? 700 : 400, cursor: 'pointer' }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              {aiSources.includes('street-views') && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 6, borderTop: '1px solid ' + c.pearl }}>
                  {STREET_FIRMS.map(firm => (
                    <button key={firm} onClick={() => setAiStreetFirms(prev => prev.includes(firm) ? prev.filter(f => f !== firm) : [...prev, firm])}
                      style={{ padding: '3px 8px', borderRadius: 10, border: '1px solid ' + (aiStreetFirms.includes(firm) ? '#2563EB' : c.pearl), background: aiStreetFirms.includes(firm) ? '#EFF6FF' : '#fff', color: aiStreetFirms.includes(firm) ? '#2563EB' : c.slate, fontSize: 9, fontWeight: aiStreetFirms.includes(firm) ? 700 : 400, cursor: 'pointer' }}>
                      {firm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleGenerate} disabled={isGenerating || !(isMacro ? macroThesis.trim() : bullets.trim())}
              style={{ marginTop: 14, padding: '12px 20px', borderRadius: 8, border: 'none', background: isMacro ? c.gold : c.teal, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (isGenerating || !(isMacro ? macroThesis.trim() : bullets.trim())) ? 0.6 : 1 }}>
              {isGenerating ? (isMacro ? '🔬 Writing research piece...' : '✨ Generating...') : (isMacro ? '🔬 Generate Research Draft' : '✨ Generate Draft')}
            </button>
          </div>

          {/* ── RIGHT: OUTPUT ── */}
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', background: c.ivory, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.navy }}>
                  {isMacro ? 'Research Draft Preview' : 'AI Draft'}
                </div>
                {draftContent && totalDraftWords > 0 && (
                  <div style={{ fontSize: 10, color: c.slate, marginTop: 2 }}>
                    {totalDraftWords.toLocaleString()} words generated · {draftContent.sections?.length || 0} sections
                  </div>
                )}
              </div>
              {draftContent && (
                <button onClick={handleApplyToEditor}
                  style={{ fontSize: 11, padding: '8px 16px', borderRadius: 6, background: c.gold, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Apply to Editor ↗
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, padding: 16, borderRadius: 8, background: '#fff', border: '1px solid ' + c.pearl, overflowY: 'auto' }}>
              {error && <div style={{ padding: 12, background: '#FEE2E2', borderRadius: 6, color: '#DC2626', fontSize: 11, marginBottom: 12 }}>{error}</div>}
              
              {!draftContent && !isGenerating && !error && (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: c.slate }}>
                  <span style={{ fontSize: 32 }}>{isMacro ? '🔬' : '✨'}</span>
                  <div style={{ fontSize: 13, fontWeight: 500, color: c.navy }}>{isMacro ? 'Fill in your research brief and generate' : 'Enter your brief and click Generate'}</div>
                  <div style={{ fontSize: 11, textAlign: 'center', maxWidth: 300 }}>{isMacro ? 'The AI will produce a 3,000-4,000 word research piece from your brief' : 'The AI will expand your notes into a full draft'}</div>
                </div>
              )}
              
              {isGenerating && (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid ' + c.pearl, borderTopColor: isMacro ? c.gold : c.teal, animation: 'spin 1s linear infinite' }} />
                  <div style={{ color: c.navy, fontSize: 13, fontWeight: 500 }}>{generationStep || 'Generating...'}</div>
                  {isMacro && (
                    <div style={{ textAlign: 'center', maxWidth: 320 }}>
                      <div style={{ color: c.slate, fontSize: 11, marginBottom: 10 }}>Writing at 16,000 tokens — full 3,000-word research piece. Takes 60–90 seconds.</div>
                      <MacroProgress />
                    </div>
                  )}
                </div>
              )}
              
              {draftContent && !isGenerating && (
                <div style={{ fontSize: 13, lineHeight: 1.7, color: c.slate }}>
                  {draftContent.title && (
                    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: isMacro ? 20 : 17, color: c.navy, marginBottom: isMacro ? 16 : 10, fontWeight: 300, lineHeight: 1.3 }}>{draftContent.title}</h3>
                  )}
                  {draftContent.tagline && <p style={{ fontSize: 12, color: c.gold, fontStyle: 'italic', marginBottom: 16 }}>{draftContent.tagline}</p>}
                  {(draftContent.sections || []).map((s, i) => (
                    <div key={i} style={{ marginBottom: isMacro ? 20 : 12 }}>
                      <div style={{ fontSize: isMacro ? 12 : 10, fontWeight: 700, textTransform: 'uppercase', color: c.gold, letterSpacing: 0.5, marginBottom: 5 }}>{s.title}</div>
                      <p style={{ margin: 0, fontSize: isMacro ? 12 : 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
};


// ============================================
// OUTPUT PREVIEW PANEL — JPM Private Bank Style (Pixel Perfect)
// ============================================


// ── EMAIL PREVIEW COMPONENT ───────────────────────────────────────────────────
const SnippetsContent = ({ c_content }) => {
  const [snippets, setSnippets] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const hasContent = (c_content.sections||[]).some(s => s.content);

  const generate = async () => {
    const apiKey = localStorage.getItem('_ak');
    if (!apiKey) { alert('Set your API key first'); return; }
    const allText = [c_content.title, c_content.tagline, ...(c_content.sections||[]).map(s=>s.content)].filter(Boolean).join(' ');
    setLoading(true);
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 400,
          system: 'Extract 3 punchy, dinner-party talking points from investment content. Return ONLY a JSON array of 3 strings. Each: one sentence, max 18 words, sounds smart and interesting, no jargon, no "JPMorgan says". Direct and opinionated.',
          messages: [{ role: 'user', content: 'Extract 3 talking points from:\n\n' + allText.slice(0, 2000) }]
        })
      });
      const data = await resp.json();
      const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
      const match = text.match(/\[[\s\S]*\]/);
      if (match) setSnippets(JSON.parse(match[0]));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  React.useEffect(() => { setSnippets(null); }, [c_content.title]);

  return (
    <div style={{ fontFamily: 'Georgia, serif', width: '100%', minHeight: '100%', background: '#fff' }}>
      {/* JPM banner */}
      <div style={{ background: '#0A1A2F', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#C1A364', textTransform: 'uppercase', letterSpacing: '0.15em' }}>J.P. Morgan Private Bank</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Snippets</div>
      </div>

      <div style={{ padding: '36px 40px' }}>
        {!snippets && !loading && (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <button onClick={generate} disabled={!hasContent}
              style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: hasContent ? '#0A1A2F' : '#E5E7EB', color: hasContent ? '#fff' : '#9CA3AF', fontSize: 13, cursor: hasContent ? 'pointer' : 'default', fontFamily: 'Georgia, serif' }}>
              {hasContent ? 'Generate Snippets' : 'Write content first'}
            </button>
          </div>
        )}
        {loading && <div style={{ textAlign: 'center', color: '#888', fontSize: 14, paddingTop: 24 }}>Generating...</div>}
        {snippets && (
          <div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {snippets.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 16, marginBottom: 28, alignItems: 'flex-start' }}>
                  <span style={{ color: '#C1A364', fontWeight: 700, fontSize: 15, flexShrink: 0, paddingTop: 3 }}>·</span>
                  <p style={{ fontSize: 17, lineHeight: 1.65, color: '#0A1A2F', margin: 0 }}>{s}</p>
                </li>
              ))}
            </ul>
            <button onClick={() => setSnippets(null)} style={{ marginTop: 20, fontSize: 11, color: '#C1A364', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>↺ Regenerate</button>
          </div>
        )}
      </div>
    </div>
  );
};


const EmailPreviewContent = ({ c_content, templateName, metadata }) => {
  const title = c_content.title || 'Untitled';
  const sections = (c_content.sections || []).filter(s => s.content);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const team = metadata?.team || 'GIS';

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Segoe UI, Arial, sans-serif', background: '#F3F2F1', minHeight: 600 }}>
      {/* Outlook-style left sidebar */}
      <div style={{ width: 260, flexShrink: 0, background: '#fff', borderRight: '1px solid #E1DFDD', display: 'flex', flexDirection: 'column' }}>
        {/* Inbox header */}
        <div style={{ padding: '12px 16px', background: '#0078D4', color: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Inbox</div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>gis-content@jpmorgan.com</div>
        </div>
        {/* Folders */}
        {['Inbox', 'Drafts', 'Sent Items', 'Deleted Items'].map((f, i) => (
          <div key={f} style={{ padding: '8px 16px', fontSize: 12, color: i === 0 ? '#0078D4' : '#444', background: i === 0 ? '#EFF6FC' : 'transparent', fontWeight: i === 0 ? 600 : 400, borderLeft: i === 0 ? '3px solid #0078D4' : '3px solid transparent', cursor: 'pointer' }}>{f}</div>
        ))}
        <div style={{ borderTop: '1px solid #E1DFDD', marginTop: 8 }} />
        {/* Email list item - current email */}
        <div style={{ padding: '10px 16px', background: '#DEECF9', borderLeft: '3px solid #0078D4', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0A1A2F' }}>JPM Private Bank GIS</div>
            <div style={{ fontSize: 9, color: '#666' }}>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#0A1A2F', marginBottom: 2, lineHeight: 1.3 }}>{title.slice(0, 45)}{title.length > 45 ? '...' : ''}</div>
          <div style={{ fontSize: 10, color: '#666', lineHeight: 1.4 }}>{sections[0]?.content?.slice(0, 60)}...</div>
        </div>
        {/* Ghost emails below */}
        {[{ from: 'Markets Research', subj: 'Weekly Macro Digest', time: 'Yesterday' }, { from: 'Investment Solutions', subj: 'Portfolio Review Q2', time: 'Mon' }, { from: 'GIS Team', subj: 'Forward Look — June', time: 'Mon' }].map((e, i) => (
          <div key={i} style={{ padding: '10px 16px', borderLeft: '3px solid transparent', cursor: 'pointer', borderBottom: '1px solid #F3F2F1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{e.from}</div>
              <div style={{ fontSize: 9, color: '#999' }}>{e.time}</div>
            </div>
            <div style={{ fontSize: 10, color: '#555' }}>{e.subj}</div>
          </div>
        ))}
      </div>

      {/* Reading pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Reading pane toolbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E1DFDD', padding: '6px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
          {['Reply', 'Reply All', 'Forward', 'Archive', 'Delete'].map(a => (
            <span key={a} style={{ fontSize: 11, color: '#0078D4', cursor: 'pointer', fontWeight: a === 'Reply' ? 600 : 400 }}>{a}</span>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: '#999' }}>{date}</span>
        </div>

        {/* Email content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F3F2F1', padding: '20px 24px' }}>
          {/* Email card */}
          <div style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', width: '100%' }}>
            {/* Email header in reading pane */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E1DFDD' }}>
              <div style={{ fontSize: 18, fontWeight: 400, color: '#0A1A2F', fontFamily: 'Georgia, serif', marginBottom: 10, lineHeight: 1.35 }}>{title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0A1A2F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#C1A364', fontSize: 12, fontWeight: 700 }}>JP</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0A1A2F' }}>JPMorgan Private Bank GIS <span style={{ fontWeight: 400, color: '#666' }}>&lt;gis-content@jpmorgan.com&gt;</span></div>
                  <div style={{ fontSize: 11, color: '#666' }}>To: Your Client Advisory Team &nbsp;·&nbsp; {date}</div>
                </div>
              </div>
            </div>

            {/* JPM branded email body */}
            <div style={{ background: '#0A1A2F', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#C1A364', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>J.P. Morgan Private Bank</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{templateName} · {team}</div>
            </div>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #C1A364, #D4B87A, #C1A364)' }} />

            <div style={{ padding: '24px 28px' }}>
              {c_content.tagline && (
                <p style={{ fontSize: 15, color: '#4A5568', fontStyle: 'italic', margin: '0 0 20px', paddingBottom: 18, borderBottom: '1px solid #E5E7EB', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>{c_content.tagline}</p>
              )}
              {sections.length === 0 && (
                <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No content yet — write your piece in the editor first.</p>
              )}
              {sections.map((s, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  {s.title && <div style={{ fontSize: 10, fontWeight: 700, color: '#C1A364', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{s.title}</div>}
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', margin: 0, fontFamily: 'Georgia, serif' }}>{s.content}</p>
                  {i < sections.length - 1 && <div style={{ borderBottom: '1px solid #F3F4F6', marginTop: 16 }} />}
                </div>
              ))}
              <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid #E5E7EB' }}>
                <div style={{ display: 'inline-block', background: '#0A1A2F', color: '#fff', padding: '10px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Read Full Piece →</div>
              </div>
            </div>

            <div style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB', padding: '14px 28px' }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, lineHeight: 1.6 }}>
                This communication is for informational purposes only. J.P. Morgan Private Bank &nbsp;·&nbsp; © {new Date().getFullYear()} JPMorgan Chase & Co. &nbsp;
                <span style={{ color: '#C1A364' }}>Unsubscribe</span> &nbsp;|&nbsp; <span style={{ color: '#C1A364' }}>Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const VisualChartContent = ({ c_content, templateName }) => {
  const [chartData, setChartData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [chartType, setChartType] = React.useState('bar');

  const GOLD = '#C1A364';
  const NAVY = '#0A1A2F';

  const generateChart = async () => {
    const apiKey = localStorage.getItem('_ak');
    if (!apiKey) { setError('Set your API key first'); return; }
    setLoading(true); setError('');
    try {
      const allText = [c_content.title, c_content.tagline, ...(c_content.sections||[]).map(s=>s.content)].filter(Boolean).join(' ');
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 8000,
          system: 'You are a financial data visualisation expert. Extract the most compelling quantitative story and return ONLY valid JSON. No markdown. CRITICAL: ALL values in the data array MUST use the same unit and scale. Choose 4-8 data points that span a meaningful range.',
          messages: [{ role: 'user', content: `Extract the best chart from this investment content. Return JSON only:\n{"title":"punchy chart title stating the finding","subtitle":"one sentence explaining what this shows","type":"bar","xKey":"x axis label","yKey":"y axis label with unit","unit":"% or bp or x or $B","data":[{"name":"label","value":number}],"insight":"the single most important takeaway","source":"source if mentioned"}\n\nContent:\n${allText.slice(0, 2500)}` }]
      })
      });
      const data = await resp.json();
      const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { setError('Could not parse chart data'); setLoading(false); return; }
      const parsed = JSON.parse(match[0]);
      if (parsed.data && parsed.data.length > 0) { setChartData(parsed); setChartType(parsed.type || 'bar'); }
      else { setError('No chart data found in content'); }
    } catch(e) { setError('Error: ' + e.message); }
    setLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(10,26,47,0.95)', border: '1px solid rgba(193,163,100,0.4)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => <div key={i} style={{ color: '#fff' }}>{p.name}: <strong>{p.value}{chartData?.unit||''}</strong></div>)}
      </div>
    );
  };

  const COLORS = [GOLD, '#5B8DB8', '#7CB87C', '#C17A6B', '#9B7BC1', '#B8B85B'];

  const renderChart = () => {
    if (!chartData?.data) return null;
    const data = chartData.data;
    const allVals = data.map(d => d.value || 0);
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const domain = [minV > 0 ? 0 : Math.floor(minV * 1.1), Math.ceil(maxV * 1.15)];
    const common = { data, margin: { top: 20, right: 30, left: 10, bottom: 60 } };
    const xAxis = <XAxis dataKey="name" tick={{ fill: '#444', fontSize: 11 }} angle={-30} textAnchor="end" height={70} />;
    const yAxis = <YAxis tick={{ fill: '#666', fontSize: 10 }} unit={chartData.unit||''} domain={domain} tickCount={6} />;
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />;
    const tooltip = <Tooltip content={<CustomTooltip />} />;
    if (chartType === 'line') return (
      <LineChart {...common}>{grid}{xAxis}{yAxis}{tooltip}
        <Line type="monotone" dataKey="value" stroke={GOLD} strokeWidth={3} dot={{ fill: GOLD, r: 5 }} activeDot={{ r: 8 }} />
      </LineChart>
    );
    if (chartType === 'area') return (
      <AreaChart {...common}>{grid}{xAxis}{yAxis}{tooltip}
        <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={GOLD} stopOpacity={0.4}/><stop offset="95%" stopColor={GOLD} stopOpacity={0.02}/></linearGradient></defs>
        <Area type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2} fill="url(#goldGrad)" />
      </AreaChart>
    );
    return (
      <BarChart {...common}>{grid}{xAxis}{yAxis}{tooltip}
        <Bar dataKey="value" radius={[4,4,0,0]}>{data.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.9} />)}</Bar>
      </BarChart>
    );
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', width: '100%', minHeight: '100%', background: '#fff', boxSizing: 'border-box' }}>
      <div style={{ padding: '20px 40px', borderBottom: '1px solid #E8E0D0', background: NAVY, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>J.P. Morgan Private Bank · Visual Story</div>
          <div style={{ fontSize: 22, fontWeight: 400, color: '#fff' }}>{c_content.title || 'Untitled'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {chartData && ['bar','line','area'].map(t => (
            <button key={t} onClick={() => setChartType(t)} style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid ' + (chartType===t ? GOLD : 'rgba(255,255,255,0.2)'), background: chartType===t ? GOLD : 'transparent', color: chartType===t ? NAVY : 'rgba(255,255,255,0.6)', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
              {t==='bar'?'▋ Bar':t==='line'?'╱ Line':'◱ Area'}
            </button>
          ))}
          <button onClick={generateChart} disabled={loading} style={{ padding: '10px 22px', borderRadius: 6, border: '1px solid ' + GOLD, background: loading ? '#fff' : GOLD, color: loading ? GOLD : '#fff', fontSize: 12, cursor: loading ? 'wait' : 'pointer', fontWeight: 700 }}>
            {loading ? '⏳' : chartData ? '↻ Regenerate' : '✨ Generate Visual Story'}
          </button>
        </div>
      </div>
      {error && <div style={{ margin: '16px 40px', padding: '10px 14px', background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12 }}>{error}</div>}
      {!chartData && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.2 }}>📊</div>
          <div style={{ fontSize: 18, color: '#555', marginBottom: 8 }}>Generate a visual story from your content</div>
          <div style={{ fontSize: 13, color: '#aaa', maxWidth: 360 }}>The AI reads your written piece and extracts the key quantitative story, then renders it as an interactive chart</div>
        </div>
      )}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16, color: '#555' }}>Reading your content and building the visual...</div>
        </div>
      )}
      {chartData && !loading && (
        <div style={{ padding: '32px 40px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 400, color: NAVY, marginBottom: 6 }}>{chartData.title}</div>
            <div style={{ fontSize: 13, color: '#888' }}>{chartData.subtitle}</div>
          </div>
          <div style={{ background: '#FAFAFA', border: '1px solid #E8E0D0', borderRadius: 12, padding: '24px 8px 8px', marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={360}>{renderChart()}</ResponsiveContainer>
          </div>
          {chartData.source && <div style={{ fontSize: 10, color: '#aaa', marginBottom: 12 }}>Source: {chartData.source}</div>}
          {chartData.insight && (
            <div style={{ background: '#FFF9EE', borderLeft: '3px solid ' + GOLD, borderRadius: '0 8px 8px 0', padding: '12px 16px', fontSize: 14, color: NAVY, fontStyle: 'italic', lineHeight: 1.6 }}>
              💡 {chartData.insight}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WhatsAppPreviewContent = ({ c_content, templateName }) => {
  const title = c_content.title || 'Untitled';
  const firstSection = (c_content.sections || []).find(s => s.content);
  const snippet = firstSection ? firstSection.content.slice(0, 100).trim() + '...' : 'Read the latest from J.P. Morgan Private Bank.';
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const PhoneShell = ({ children, label, accent }) => (
    <div style={{ width: 300, flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' }}>{label}</div>
      <div style={{ background: '#1a1a1a', borderRadius: 36, padding: '10px 5px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ borderRadius: 30, overflow: 'hidden', height: 580 }}>{children}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 32, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', justifyContent: 'center', padding: '24px 16px', background: '#f8f9fa', minHeight: 640, alignItems: 'flex-start' }}>

      {/* WhatsApp */}
      <PhoneShell label="WhatsApp" accent="#25D366">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ECE5DD' }}>
          <div style={{ background: '#075E54' }}>
            <div style={{ padding: '6px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>{time}</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>●●●  ▌</span>
            </div>
            <div style={{ padding: '8px 14px 10px', display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>JP</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>JPM Private Bank GIS</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>online</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>📞 ⋮</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={{ background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: 9, padding: '2px 8px', borderRadius: 8 }}>Today</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ maxWidth: '88%', background: '#fff', borderRadius: '0 10px 10px 10px', padding: '7px 9px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <div style={{ borderLeft: '3px solid #25D366', paddingLeft: 7, marginBottom: 6 }}>
                  <div style={{ fontSize: 9, color: '#25D366', fontWeight: 700, marginBottom: 2 }}>J.P. Morgan Private Bank</div>
                  <div style={{ background: '#f5f5f5', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#128C7E', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 10, color: '#667781', lineHeight: 1.4 }}>{snippet}</div>
                      <div style={{ fontSize: 9, color: '#aaa', marginTop: 3 }}>long-and-short-jpm.netlify.app</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#1a1a1a', marginBottom: 3 }}>New from GIS — tap to read 📈</div>
                <div style={{ fontSize: 9, color: '#8696a0', textAlign: 'right' }}>{time} ✓✓</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: '#DCF8C6', borderRadius: '10px 0 10px 10px', padding: '5px 9px 3px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 10, color: '#1a1a1a' }}>Thanks 👍</div>
                <div style={{ fontSize: 9, color: '#8696a0', textAlign: 'right' }}>{time} ✓✓</div>
              </div>
            </div>
          </div>
          <div style={{ background: '#f0f2f5', padding: '6px 9px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 17, color: '#8696a0' }}>😊</span>
            <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: '7px 12px', fontSize: 11, color: '#8696a0' }}>Message</div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎤</div>
          </div>
        </div>
      </PhoneShell>

      {/* WeCom */}
      <PhoneShell label="WeCom · 企业微信" accent="#1aad19">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ededed' }}>
          <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ padding: '6px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, fontWeight: 600 }}>{time}</span>
              <span style={{ fontSize: 8, color: '#999' }}>●●●  ▌</span>
            </div>
          </div>
          <div style={{ background: '#1aad19', padding: '8px 14px 10px', display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>GIS</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>GIS Research · 企业群</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>24 members</div>
            </div>
            <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>⋮</div>
          </div>
          <div style={{ flex: 1, padding: '10px 8px', overflow: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: '#999' }}>Today {time}</span>
            </div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: '#1aad19', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>JP</div>
              <div>
                <div style={{ fontSize: 9, color: '#888', marginBottom: 2 }}>Madison Faller</div>
                <div style={{ background: '#fff', borderRadius: '0 8px 8px 8px', padding: '7px 9px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', maxWidth: 220 }}>
                  <div style={{ border: '1px solid #ebebeb', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ padding: '7px 9px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 2 }}>{title}</div>
                        <div style={{ fontSize: 10, color: '#888', lineHeight: 1.4 }}>{snippet.slice(0, 60)}...</div>
                      </div>
                      <div style={{ width: 40, height: 40, background: '#1aad19', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
                    </div>
                    <div style={{ background: '#f7f7f7', padding: '3px 9px', fontSize: 9, color: '#ccc', borderTop: '1px solid #f0f0f0' }}>JPM Private Bank · Long &amp; Short</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#333' }}>GIS Research Update 📌</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: '#f7f7f7', padding: '6px 9px', display: 'flex', alignItems: 'center', gap: 7, borderTop: '1px solid #e8e8e8' }}>
            <span style={{ fontSize: 17, color: '#ccc' }}>☺</span>
            <div style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '6px 11px', fontSize: 11, color: '#bbb', border: '1px solid #e8e8e8' }}>发送消息</div>
            <span style={{ fontSize: 17, color: '#ccc' }}>＋</span>
          </div>
        </div>
      </PhoneShell>

    </div>
  );
};


const OutputPreviewPanel = ({ isOpen, onClose, templateName, templateId, content, metadata }) => {
  const [device, setDevice] = useState('desktop');
  const [format, setFormat] = useState('web');

  if (!isOpen) return null;
  
  const c_content = content || {};
  const m = metadata || {};

  const devices = [
    { id: 'desktop', label: 'Desktop', icon: '🖥️' },
    { id: 'tablet', label: 'Tablet', icon: '📱' },
    { id: 'mobile', label: 'JPOI / JPO', icon: '📱' },
    { id: 'email', label: 'Email', icon: '✉️' },
    { id: 'pdf', label: 'PDF', icon: '📄' },
    { id: 'chart', label: '📊 Visual Story', icon: '📊' },
    { id: 'whatsapp', label: 'WhatsApp / WeCom', icon: '💬' },
    { id: 'snippets', label: 'Snippets', icon: '✦' },
  ];

  const formats = [{ id: 'web', label: 'Web View' }]; // legacy - now merged into devices

  // JPM Logo Component - exact match to their site
  const JPMLogo = ({ size = 'normal' }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column' }}>
      <div style={{ 
        fontFamily: '"Freight Display", Georgia, serif',
        fontWeight: 400,
        color: jpm.black, 
        fontSize: size === 'small' ? 18 : 24, 
        letterSpacing: '-0.02em',
        lineHeight: 1
      }}>
        J.P.Morgan
      </div>
      <div style={{ 
        fontSize: size === 'small' ? 8 : 10, 
        color: jpm.gold,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontWeight: 500,
        marginTop: 2
      }}>
        PRIVATE BANK
      </div>
    </div>
  );

  // Category badge like on their site
  const CategoryBadge = ({ category, readTime }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 12,
      marginBottom: 16
    }}>
      <span style={{ 
        fontSize: 11, 
        color: jpm.gold,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 500,
        borderBottom: '1px dotted ' + jpm.gold,
        paddingBottom: 2
      }}>
        {category || 'INVESTMENT STRATEGY'}
      </span>
      {readTime && (
        <>
          <span style={{ color: jpm.gray300 }}>|</span>
          <span style={{ fontSize: 11, color: jpm.gray500 }}>
            ⏱ {readTime} MINUTES
          </span>
        </>
      )}
    </div>
  );

  // Author card like their site
  const AuthorCard = ({ name, title, colorIndex = 0 }) => {
    const colors = [jpm.olive, jpm.teal, jpm.gold];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          background: colors[colorIndex % colors.length],
          flexShrink: 0
        }} />
        <div>
          <div style={{ 
            fontSize: 14, 
            color: jpm.gold,
            fontWeight: 500
          }}>
            {name || 'Author Name'}
          </div>
          <div style={{ 
            fontSize: 12, 
            color: jpm.gray500
          }}>
            {title || 'Global Investment Strategist'}
          </div>
        </div>
      </div>
    );
  };

  // JPM Full Disclaimer - exact styling
  const JPMDisclaimer = ({ isEmail }) => (
    <div style={{ 
      marginTop: 48, 
      paddingTop: 32,
      borderTop: '1px solid ' + jpm.gray200
    }}>
      <div style={{ 
        fontWeight: 600, 
        color: jpm.gray700, 
        marginBottom: 16,
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Important Information
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.8, color: jpm.gray500 }}>
        <p style={{ margin: '0 0 12px' }}>
          This material is for information purposes only, and may inform you of certain products and services 
          offered by private banking businesses, part of JPMorgan Chase & Co. Products and services described, 
          as well as associated fees, charges and interest rates, are subject to change.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          <strong style={{ color: jpm.gray700 }}>
            Investors may get back less than they invested, and past performance is not a reliable indicator of future results.
          </strong>
        </p>
        <p style={{ margin: 0 }}>
          Asset allocation/diversification does not guarantee a profit or protect against loss. 
          Nothing in this material should be relied upon in isolation for the purpose of making an investment decision.
        </p>
      </div>
    </div>
  );

  // Format text - content is now HTML from contentEditable
  const formatText = (text) => {
    if (!text) return null;
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  // Calculate read time
  const calculateReadTime = () => {
    const sections = c_content.sections || [];
    const allText = sections.map(s => s.content || '').join(' ');
    const wordCount = allText.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  };

  // Inline chart renderer — parses "Label,Value" data and renders SVG
  const renderChart = (chart, isMobile) => {
    if (!chart) return null;
    // Handle both data formats: Macro uses 'data'+'type', Ideas uses 'dataRaw'+'chartType'
    const rawData = chart.data || chart.dataRaw || '';
    const chartType = (chart.type || chart.chartType || 'line').toLowerCase();
    const chartTitle = chart.title || '';
    const chartCaption = chart.caption || chart.source || '';
    if (!rawData.trim()) return null;
    const rows = rawData.trim().split('\n').map(r => {
      const parts = r.split(',');
      return { label: parts[0]?.trim() || '', value: parseFloat(parts[1]) || 0 };
    }).filter(r => r.label && !isNaN(r.value));
    if (rows.length === 0) return null;

    const maxVal = Math.max(...rows.map(r => r.value));
    const minVal = Math.min(...rows.map(r => r.value));
    const range = maxVal - minVal || 1;
    const w = 600, h = 220, padL = 44, padR = 16, padT = 20, padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const xStep = plotW / Math.max(rows.length - 1, 1);

    const toY = (v) => padT + plotH - ((v - minVal) / range) * plotH;
    const toX = (i) => padL + i * xStep;

    const isBar = chartType === 'bar';
    const isArea = chartType === 'area';

    const pointsStr = rows.map((r, i) => `${toX(i)},${toY(r.value)}`).join(' ');
    const areaPath = `M ${toX(0)},${padT + plotH} L ${rows.map((r, i) => `${toX(i)},${toY(r.value)}`).join(' L ')} L ${toX(rows.length - 1)},${padT + plotH} Z`;

    const barW = Math.max(4, (plotW / rows.length) * 0.6);

    return (
      <div style={{ margin: isMobile ? '20px 0' : '32px 0' }}>
        {chartTitle && (
          <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 500, color: jpm.gray700, marginBottom: 8, fontFamily: jpm.fontSans }}>{chartTitle}</div>
        )}
        <div style={{ background: jpm.gray50, borderRadius: 4, padding: isMobile ? '12px 8px' : '16px 12px', border: '1px solid ' + jpm.gray200 }}>
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padT + plotH * (1 - pct);
              const val = (minVal + range * pct).toFixed(1);
              return (
                <g key={i}>
                  <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={jpm.gray200} strokeWidth="1"/>
                  <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill={jpm.gray400}>{val}</text>
                </g>
              );
            })}
            {/* X axis labels */}
            {rows.map((r, i) => {
              if (rows.length > 8 && i % Math.ceil(rows.length / 6) !== 0 && i !== rows.length - 1) return null;
              return <text key={i} x={toX(i)} y={h - 6} textAnchor="middle" fontSize="9" fill={jpm.gray400}>{r.label}</text>;
            })}
            {/* Data */}
            {isBar ? (
              rows.map((r, i) => (
                <rect key={i} x={toX(i) - barW / 2} y={toY(r.value)} width={barW} height={padT + plotH - toY(r.value)} fill={jpm.teal} opacity="0.75" rx="1"/>
              ))
            ) : isArea ? (
              <>
                <path d={areaPath} fill={jpm.teal} opacity="0.12"/>
                <polyline points={pointsStr} fill="none" stroke={jpm.teal} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                {rows.map((r, i) => <circle key={i} cx={toX(i)} cy={toY(r.value)} r="3" fill={jpm.teal} opacity="0.8"/>)}
              </>
            ) : (
              <>
                <polyline points={pointsStr} fill="none" stroke={jpm.goldAccent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                {rows.map((r, i) => <circle key={i} cx={toX(i)} cy={toY(r.value)} r="3" fill={jpm.goldAccent}/>)}
              </>
            )}
            {/* Axes */}
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={jpm.gray300} strokeWidth="1"/>
            <line x1={padL} y1={padT + plotH} x2={w - padR} y2={padT + plotH} stroke={jpm.gray300} strokeWidth="1"/>
          </svg>
        </div>
        {chartCaption && (
          <div style={{ fontSize: 10, color: jpm.gray400, marginTop: 6, fontStyle: 'italic' }}>{chartCaption}</div>
        )}
      </div>
    );
  };

  // MACRO & MARKETS PREVIEW — JPM Private Bank long-form editorial with cover page
  const MacroMarketsContent = ({ isMobile }) => {
    const coverThemeKey = c_content.coverThemeOverride || getCoverTheme(c_content.title, m.assetClass);
    const coverSvg = CoverImageThemes[coverThemeKey] ? CoverImageThemes[coverThemeKey]() : CoverImageThemes.macro();
    const stats = (c_content.stats || []).filter(s => s.number);
    const sections = (c_content.sections || []).filter(s => s.content);

    return (
      <div style={{ fontFamily: jpm.fontSans, background: '#fff' }}>

        {/* ── COVER PAGE ── */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', marginBottom: 0, borderRadius: isMobile ? 0 : '4px 4px 0 0', maxHeight: isMobile ? 220 : 420 }}>
          {/* Background SVG */}
          <div dangerouslySetInnerHTML={{ __html: coverSvg }} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, fontSize: 0 }} />
          {/* Cover content overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: isMobile ? '20px 24px' : '36px 48px' }}>
            {/* Top: JPM branding */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: '"Freight Display", Georgia, serif', fontWeight: 400, color: '#fff', fontSize: isMobile ? 16 : 22, letterSpacing: '-0.02em', lineHeight: 1 }}>J.P.Morgan</div>
                <div style={{ fontSize: isMobile ? 7 : 9, color: '#9B8579', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, marginTop: 2 }}>PRIVATE BANK</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: 'rgba(155,133,121,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MACRO & MARKETS</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            {/* Bottom: Title block */}
            <div>
              <div style={{ width: 40, height: 3, background: '#9B8579', marginBottom: 16 }} />
              <h1 style={{ fontFamily: '"Chronicle Display", Georgia, serif', fontSize: isMobile ? 22 : 38, fontWeight: 300, color: '#fff', margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em', maxWidth: isMobile ? '90%' : 560, marginBottom: 10 }}>
                {c_content.title || 'Macro & Markets'}
              </h1>
              {c_content.tagline && (
                <p style={{ fontSize: isMobile ? 11 : 14, color: 'rgba(255,255,255,0.65)', margin: 0, fontStyle: 'italic', maxWidth: 480 }}>
                  {c_content.tagline}
                </p>
              )}
              {(c_content.coverAuthor || c_content.coverRole) && (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, background: '#9B8579', flexShrink: 0 }} />
                  <div>
                    {m.author && <div style={{ fontSize: 11, color: '#9B8579', fontWeight: 500 }}>{m.author}</div>}
                    {m.authorRole && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{m.authorRole}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gold divider strip */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #9B8579, #C1A364, #9B8579)', marginBottom: isMobile ? 24 : 40 }} />

        {/* ── ARTICLE BODY ── */}
        <div style={{ padding: isMobile ? '0 0' : '0' }}>

          {/* Key data callouts — optional, only show if stats populated */}
          {stats.filter(s => s.number).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.filter(s=>s.number).length}, 1fr)`, gap: 1, marginBottom: isMobile ? 24 : 40, background: jpm.gray200 }}>
              {stats.filter(s => s.number).map((stat, i) => (
                <div key={i} style={{ background: '#fff', padding: isMobile ? '14px 16px' : '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 22 : 32, fontWeight: 300, color: jpm.black, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {stat.number}
                  </div>
                  <div style={{ fontSize: isMobile ? 9 : 11, color: jpm.gray500, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Byline row */}
          <div style={{ marginBottom: isMobile ? 24 : 36, paddingBottom: 20, borderBottom: '1px solid ' + jpm.gray200, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: jpm.olive, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, color: jpm.gold, fontWeight: 500 }}>{c_content.coverAuthor || m.author || 'J.P. Morgan Private Bank'}</div>
                <div style={{ fontSize: 11, color: jpm.gray500 }}>{c_content.coverRole || 'Global Investment Strategist'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: jpm.gray500 }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {c_content.readTime && (
                <div style={{ fontSize: 11, color: jpm.gray400, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⏱</span> {c_content.readTime} min read
                </div>
              )}
            </div>
          </div>

          {/* Body sections */}
          <div style={{ maxWidth: 700, fontSize: isMobile ? 15 : 17, lineHeight: 1.85, color: jpm.gray700 }}>
            {sections.length > 0 ? sections.map((section, idx) => {
              const chartsAfterThis = (c_content.charts || []).filter(ch => ch.position === section.id && (ch.data || ch.dataRaw));
              const isExec = idx === 0;
              const isView = section.id === 'view' || section.title?.toLowerCase().includes('our view');
              const isImplications = section.id === 'implications' || section.title?.toLowerCase().includes('implication') || section.title?.toLowerCase().includes('portfolio');

              return (
                <div key={section.id || idx} style={{ marginBottom: isMobile ? 24 : 36 }}>
                  {/* Executive summary gets special treatment: gold bar + larger text */}
                  {isExec ? (
                    <div style={{ position: 'relative', marginBottom: 32, paddingTop: 16 }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, width: 56, height: 4, background: jpm.gold }} />
                      {section.title && <h2 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 18 : 22, fontWeight: 300, color: jpm.black, marginBottom: 12, letterSpacing: '-0.01em' }}>{section.title}</h2>}
                      <p style={{ fontSize: isMobile ? 17 : 20, lineHeight: 1.7, color: jpm.gray600, margin: 0, fontStyle: 'italic', borderLeft: '4px solid ' + jpm.gold, paddingLeft: 20 }}>
                        <span dangerouslySetInnerHTML={{ __html: section.content }} />
                      </p>
                    </div>
                  ) : isView ? (
                    // "Our View" — full-width callout box
                    <div>
                      {section.title && <h2 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 20 : 26, fontWeight: 300, color: jpm.black, marginBottom: 16 }}>{section.title}</h2>}
                      <div style={{ background: jpm.navyDark, padding: isMobile ? '18px 20px' : '24px 28px', borderRadius: 2 }}>
                        <p style={{ margin: 0, fontSize: isMobile ? 14 : 16, lineHeight: 1.7, color: '#fff', fontWeight: 300 }}>
                          <span dangerouslySetInnerHTML={{ __html: section.content }} />
                        </p>
                      </div>
                    </div>
                  ) : isImplications ? (
                    // Portfolio implications — teal left border callout
                    <div>
                      {section.title && <h2 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 20 : 26, fontWeight: 300, color: jpm.black, marginBottom: 14 }}>{section.title}</h2>}
                      <div style={{ padding: isMobile ? '16px 20px' : '20px 24px', background: jpm.gray50, borderLeft: '4px solid ' + jpm.teal }}>
                        <p style={{ margin: 0, fontSize: isMobile ? 14 : 16, lineHeight: 1.75, color: jpm.gray700 }}>
                          <span dangerouslySetInnerHTML={{ __html: section.content }} />
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Standard section
                    <div>
                      {section.title && <h2 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 20 : 28, fontWeight: 300, color: jpm.black, marginBottom: 14, lineHeight: 1.2 }}>{section.title}</h2>}
                      <p style={{ margin: 0 }}><span dangerouslySetInnerHTML={{ __html: section.content }} /></p>
                    </div>
                  )}
                {/* Charts positioned after this section */}
                {chartsAfterThis.map(ch => renderChart(ch, isMobile))}
              </div>
            );
            }) : (
              <p style={{ color: jpm.gray500, fontStyle: 'italic' }}>Start writing in the editor to see the preview here.</p>
            )}
          </div>

          <JPMDisclaimer />
        </div>
      </div>
    );
  };

  // VIDEO PUBLISH PREVIEW — video-first, no auto-injected label words
  const VideoArticleContent = ({ isMobile }) => {
    const overlays = c_content.overlays || [];
    const sections = c_content.sections || [];
    const overlayStyleMap = {
      lowerThird: { background: 'rgba(10,26,47,0.88)', color: '#fff', borderLeft: '4px solid #C1A364' },
      callout: { background: 'rgba(193,163,100,0.92)', color: '#fff' },
      ticker: { background: 'rgba(0,0,0,0.82)', color: '#C1A364', fontFamily: 'monospace', letterSpacing: 1 },
      title: { background: 'rgba(10,26,47,0.95)', color: '#fff', borderBottom: '2px solid #C1A364' },
    };
    return (
      <div style={{ fontFamily: jpm.fontSans, background: '#fff' }}>
        <div style={{ padding: isMobile ? '20px 0' : '28px 0', borderBottom: '1px solid ' + jpm.gray200, marginBottom: isMobile ? 20 : 32 }}>
          <JPMLogo size={isMobile ? 'small' : 'normal'} />
        </div>

        {/* Category — only user-entered value, no label */}
        {c_content.category && <CategoryBadge category={c_content.category.toUpperCase()} />}

        {/* Series — only user value, no "Series:" label */}
        {c_content.series && (
          <div style={{ fontSize: 11, color: jpm.gold, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 12 }}>
            {c_content.series}
          </div>
        )}

        <h1 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 28 : 42, color: jpm.black, margin: '0 0 20px', lineHeight: 1.15, fontWeight: jpm.headlineWeight, letterSpacing: '-0.02em' }}>
          {c_content.title || 'Untitled Video'}
        </h1>

        {/* Presenter — only if user typed a name; presenterTitle shown as sub-line, no "Presenter:" prefix */}
        {c_content.presenter && (
          <div style={{ marginBottom: 24 }}>
            <AuthorCard name={c_content.presenter} title={c_content.presenterTitle || ''} colorIndex={0} />
          </div>
        )}

        <div style={{ fontSize: 13, color: jpm.gray500, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid ' + jpm.gray200, display: 'flex', gap: 16 }}>
          <span>Published {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          {c_content.videoDuration && <span style={{ color: jpm.gray400 }}>· {c_content.videoDuration}</span>}
        </div>

        {/* VIDEO HERO */}
        <div style={{ marginBottom: 36 }}>
          {c_content.videoUrl ? (
            <div style={{ position: 'relative', background: '#000', borderRadius: 4, overflow: 'hidden', lineHeight: 0 }}>
              <video src={c_content.videoUrl} controls style={{ width: '100%', display: 'block', maxHeight: isMobile ? 200 : 420 }} />
              {overlays.map(box => {
                const s = overlayStyleMap[box.style] || overlayStyleMap.lowerThird;
                return (
                  <div key={box.id} style={{ position: 'absolute', left: `${box.x}%`, top: `${box.y}%`, padding: '6px 12px', borderRadius: 3, pointerEvents: 'none', maxWidth: 300, ...s }}>
                    {box.label && <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.65, marginBottom: 2 }}>{box.label}</div>}
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{box.text}</div>
                    {box.subtitle && <div style={{ fontSize: 9, opacity: 0.78, marginTop: 2 }}>{box.subtitle}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: jpm.gray100, borderRadius: 4, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 48 }}>🎬</div>
              <div style={{ fontSize: 13, color: jpm.gray500 }}>No video uploaded yet</div>
            </div>
          )}
        </div>

        {/* Sections — section.title shown as heading exactly as typed */}
        <div style={{ maxWidth: 680, fontSize: 16, lineHeight: 1.85, color: jpm.gray700 }}>
          {sections.filter(s => s.content).length > 0 ? sections.filter(s => s.content).map((section, idx) => {
            const isCallout = /summary|key|takeaway/i.test(section.title || '');
            return (
              <div key={section.id || idx} style={{ marginBottom: 28 }}>
                {section.title && <h2 style={{ fontFamily: jpm.fontSerif, fontSize: 24, fontWeight: jpm.headlineWeight, color: jpm.black, marginBottom: 12, lineHeight: 1.25 }}>{section.title}</h2>}
                {isCallout ? (
                  <div style={{ padding: '16px 20px', background: jpm.gray50, borderLeft: '4px solid ' + jpm.gold }}>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}><span dangerouslySetInnerHTML={{ __html: section.content }} /></p>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}><span dangerouslySetInnerHTML={{ __html: section.content }} /></p>
                )}
              </div>
            );
          }) : <p style={{ color: jpm.gray500, fontStyle: 'italic', fontSize: 14 }}>Add a video summary and key points in the editor to see them here.</p>}
        </div>

        <JPMDisclaimer />
      </div>
    );
  };

  // MORNING MEETING PREVIEW
  const MorningMeetingContent = ({ isMobile }) => {
    const focusSections = c_content.focusSections || [];
    const meetingDate = c_content.meetingDate ? new Date(c_content.meetingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return (
      <div style={{ fontFamily: jpm.fontSans, background: '#fff' }}>
        {/* Header */}
        <div style={{ padding: isMobile ? '16px 0' : '24px 0', borderBottom: '1px solid ' + jpm.gray200, marginBottom: isMobile ? 20 : 28 }}>
          <JPMLogo size={isMobile ? 'small' : 'normal'} />
        </div>
        <div style={{ fontSize: 10, color: jpm.gold, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>Morning Meeting — Internal</div>
        <h1 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 24 : 32, fontWeight: jpm.headlineWeight, color: jpm.black, margin: '0 0 8px', lineHeight: 1.2 }}>
          {c_content.title || 'Morning Meeting Takeaways'}
        </h1>
        <div style={{ fontSize: 12, color: jpm.gray500, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid ' + jpm.gray200 }}>
          {meetingDate} · Internal Distribution Only
        </div>

        {/* Market Update */}
        {c_content.marketUpdate && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 4, height: 20, background: jpm.teal }} />
              <h2 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 17 : 20, fontWeight: jpm.headlineWeight, color: jpm.black, margin: 0 }}>Market Update</h2>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: jpm.gray700, margin: 0 }}>
              <span dangerouslySetInnerHTML={{ __html: c_content.marketUpdate }} />
            </p>
          </div>
        )}

        {/* Focus Areas */}
        {focusSections.filter(f => f.content).map((f, idx) => (
          <div key={f.id} style={{ marginBottom: 28, paddingTop: idx > 0 ? 20 : 0, borderTop: idx > 0 ? '1px solid ' + jpm.gray200 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 4, height: 20, background: jpm.gold }} />
              <h2 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 17 : 20, fontWeight: jpm.headlineWeight, color: jpm.black, margin: 0 }}>
                {f.title}
              </h2>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: jpm.gray700, margin: 0 }}>
              <span dangerouslySetInnerHTML={{ __html: f.content }} />
            </p>
          </div>
        ))}

        {!c_content.marketUpdate && focusSections.filter(f => f.content).length === 0 && (
          <p style={{ color: jpm.gray500, fontStyle: 'italic', fontSize: 14 }}>Fill in the market update and focus areas in the editor to see the preview here.</p>
        )}

        <JPMDisclaimer />
      </div>
    );
  };

  // EVENT RESPONSE PREVIEW - "Latest as of..." + updates newest-first
  const EventResponseContent = ({ isMobile }) => {
    const updates = c_content.updates || [];
    const sections = c_content.sections || [];
    // Get most recent timestamp for "Latest as of..."
    const latestTimestamp = updates.map(u => u.timestamp).filter(Boolean).sort().reverse()[0] || null;
    // Updates displayed newest-first (reverse), initial response at bottom
    const displayUpdates = [...updates].reverse();
    return (
      <div style={{ fontFamily: jpm.fontSans, background: '#fff' }}>
        <div style={{ padding: isMobile ? '20px 0' : '28px 0', borderBottom: '1px solid ' + jpm.gray200, marginBottom: isMobile ? 20 : 32 }}>
          <JPMLogo size={isMobile ? 'small' : 'normal'} />
        </div>

        {/* Event type badge */}
        {c_content.eventType && <CategoryBadge category={c_content.eventType.toUpperCase()} />}

        {/* Title */}
        <h1 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 28 : 42, color: jpm.black, margin: '0 0 16px', lineHeight: 1.15, fontWeight: jpm.headlineWeight, letterSpacing: '-0.02em' }}>
          {c_content.title || 'Event Response'}
        </h1>

        {/* Latest as of... + published date */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid ' + jpm.gray200, flexWrap: 'wrap' }}>
          {latestTimestamp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E08A00' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E08A00', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Latest as of {latestTimestamp}</span>
            </div>
          )}
          <span style={{ fontSize: 13, color: jpm.gray500 }}>Published {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>

        {/* Opening context sections */}
        {sections.filter(s => s.content).length > 0 && (
          <div style={{ maxWidth: 680, marginBottom: 36 }}>
            {sections.filter(s => s.content).map((section, idx) => (
              <div key={section.id || idx} style={{ marginBottom: 24 }}>
                {section.title && <h2 style={{ fontFamily: jpm.fontSerif, fontSize: 24, fontWeight: jpm.headlineWeight, color: jpm.black, marginBottom: 10, lineHeight: 1.25 }}>{section.title}</h2>}
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.85, color: jpm.gray700 }}>{formatText(section.content)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Rolling updates - newest first, timeline line */}
        {displayUpdates.length > 0 && (
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: jpm.gold, fontWeight: 500, marginBottom: 20 }}>
              Updates — {displayUpdates.length} {displayUpdates.length === 1 ? 'entry' : 'entries'}
            </div>
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: jpm.gray200 }} />
              {displayUpdates.map((update, idx) => {
                const isLatest = idx === 0;
                return (
                  <div key={update.id} style={{ position: 'relative', marginBottom: 32 }}>
                    <div style={{ position: 'absolute', left: -28, top: 6, width: 12, height: 12, borderRadius: '50%', background: isLatest ? jpm.gold : jpm.teal, border: '2px solid #fff', boxShadow: isLatest ? '0 0 0 3px ' + jpm.gold + '40' : 'none' }} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                      {update.timestamp && <span style={{ fontSize: 11, color: jpm.gray500, fontWeight: 500 }}>{update.timestamp}</span>}
                      {update.title && <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: isLatest ? jpm.gold : jpm.gray500, fontWeight: 600 }}>{update.title}</span>}
                      {isLatest && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: jpm.gold + '18', color: jpm.gold, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Latest</span>}
                    </div>
                    {update.content && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: jpm.gray700, maxWidth: 640 }}>{formatText(update.content)}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <JPMDisclaimer />
      </div>
    );
  };

  // JPM Article Content - pixel perfect match
  const ArticleContent = ({ isMobile, isEmail, isPDF }) => (
    <div style={{ 
      fontFamily: jpm.fontSans,
      background: '#fff'
    }}>
      
      {/* Header with logo */}
      {!isEmail && (
        <div style={{ 
          padding: isMobile ? '20px 0' : '28px 0', 
          borderBottom: '1px solid ' + jpm.gray200,
          marginBottom: isMobile ? 28 : 40
        }}>
          <JPMLogo size={isMobile ? 'small' : 'normal'} />
        </div>
      )}

      {/* Category + Read Time */}
      <CategoryBadge 
        category={m.assetClass || templateName?.toUpperCase()} 
        readTime={calculateReadTime()} 
      />

      {/* Main Headline - Light serif, large */}
      <h1 style={{ 
        fontFamily: jpm.fontSerif,
        fontSize: isMobile ? 32 : 48, 
        color: jpm.black, 
        margin: '0 0 24px 0',
        lineHeight: 1.15,
        fontWeight: jpm.headlineWeight,
        letterSpacing: '-0.02em',
        maxWidth: 720
      }}>
        {c_content.title || 'Untitled'}
      </h1>

      {/* Deck / Hook - with gold accent bar */}
      {c_content.hook || (c_content.sections && c_content.sections[0]?.title?.toLowerCase().includes('hook')) ? (
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div style={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            width: 48,
            height: 4,
            background: jpm.gold
          }} />
          <p style={{ 
            fontSize: isMobile ? 17 : 19, 
            lineHeight: 1.6, 
            color: jpm.gray600, 
            margin: 0,
            paddingTop: 16,
            maxWidth: 640
          }}>
            {c_content.hook || (c_content.sections?.find(s => s.title?.toLowerCase().includes('hook'))?.content)}
          </p>
        </div>
      ) : null}

      {/* Authors */}
      <div style={{ marginBottom: 32 }}>
        <AuthorCard 
          name={m.author || 'Madison Faller'} 
          title="Global Investment Strategist"
          colorIndex={0}
        />
        {m.coAuthor && (
          <AuthorCard 
            name={m.coAuthor} 
            title="Head of EMEA Investment Strategy"
            colorIndex={1}
          />
        )}
      </div>

      {/* Published date */}
      <div style={{ 
        fontSize: 13, 
        color: jpm.gray700,
        marginBottom: 40,
        paddingBottom: 32,
        borderBottom: '1px solid ' + jpm.gray200
      }}>
        Published {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>

      {/* Body Content */}
      <div style={{ 
        maxWidth: 680, 
        fontSize: 17, 
        lineHeight: 1.85, 
        color: jpm.gray700 
      }}>
        
        {/* Sections renderer - renders ALL sections with exact user-typed titles */}
        {c_content.sections && c_content.sections.filter(s => s.content).length > 0 ? (
          <>
            {c_content.sections.filter(s => s.content).map((section, idx) => {
              // Callout styling for sections whose title suggests a summary/view/takeaway
              const isCallout = /takeaway|view|summary|message|key|executive/i.test(section.title || '');
              const accentColor = /view|recommendation|positioning/i.test(section.title || '') ? jpm.gold : jpm.teal;
              // Charts positioned after this section (for Ideas & Insights)
              const sectionCharts = (c_content.charts || []).filter(ch => ch.position === section.id && (ch.data || ch.dataRaw));
              
              return (
                <div key={section.id || idx} style={{ marginBottom: 32 }}>
                  {/* Section heading — suppress for deskCommentary single-para format */}
                  {section.title && templateId !== 'deskCommentary' && (
                    <h2 style={{ 
                      fontFamily: jpm.fontSerif,
                      fontSize: 26,
                      fontWeight: jpm.headlineWeight,
                      color: jpm.black,
                      marginBottom: 14,
                      lineHeight: 1.25
                    }}>
                      {section.title}
                    </h2>
                  )}
                  
                  {/* Content */}
                  {section.layout === 'excel' && section.excelBlock ? (
                    <ExcelBlock block={section.excelBlock} inPreview={true} onRefresh={()=>{}} onRemove={()=>{}} />
                  ) : isCallout ? (
                    <div style={{ 
                      padding: '20px 24px',
                      background: jpm.gray50,
                      borderLeft: '4px solid ' + accentColor,
                    }}>
                      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7 }}>
                        {formatText(section.content)}
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 17, lineHeight: 1.85 }}>
                      {formatText(section.content)}
                    </p>
                  )}
                  {/* Inline charts (Ideas & Insights) */}
                  {sectionCharts.map(ch => renderChart(ch, isMobile))}
                </div>
              );
            })}
          </>
        ) : (
          /* Fallback for empty */
          <p style={{ color: jpm.gray500, fontStyle: 'italic' }}>
            No content yet. Start writing in the editor.
          </p>
        )}

        {/* Video player if present */}
        {c_content.videoUrl && (
          <div style={{ 
            margin: '32px 0',
            background: jpm.gray800,
            borderRadius: 4,
            overflow: 'hidden',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video 
              src={c_content.videoUrl} 
              controls 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              poster={c_content.videoPoster}
            />
          </div>
        )}

      </div>

      {c_content?.externalLink && (
        <div style={{ marginTop: 24, padding: '12px 0', borderTop: '1px solid ' + jpm.pearl, textAlign: 'center' }}>
          <a href={c_content.externalLink} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: jpm.gold, fontWeight: 600, textDecoration: 'none' }}>
            ↗ Read on Nexus · J.P. Morgan Private Bank
          </a>
        </div>
      )}
      <JPMDisclaimer isEmail={isEmail} />
    </div>
  );

  const deviceWidth = device === 'desktop' ? '100%' : device === 'tablet' ? 768 : 375;
  const isMobile = device === 'mobile';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,47,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: '95%', maxWidth: 1400, height: '92vh', background: '#1a1a1a', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', background: '#2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Output Preview</div>
            <div style={{ height: 20, width: 1, background: '#444' }} />
            <div style={{ color: '#888', fontSize: 12 }}>{templateName}</div>
            
            {/* Device Switcher */}
            <div style={{ display: 'flex', background: '#333', borderRadius: 6, padding: 2, marginLeft: 12 }}>
              {devices.map(d => (
                <button 
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  style={{ 
                    padding: '6px 14px', 
                    borderRadius: 4, 
                    border: 'none', 
                    background: device === d.id ? '#fff' : 'transparent', 
                    color: device === d.id ? '#000' : '#888', 
                    fontSize: 11, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{d.icon}</span>
                  {d.label}
                </button>
              ))}
            </div>


          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: 24, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Preview Area — WhatsApp/Chart bypass the device chrome wrapper */}
        {device === 'whatsapp' ? (
          <div style={{ flex: 1, overflow: 'auto', background: '#111', display: 'flex', justifyContent: 'center' }}>
            <WhatsAppPreviewContent c_content={c_content} templateName={templateName} />
          </div>
        ) : device === 'chart' ? (
          <div style={{ flex: 1, overflow: 'auto', background: '#F7F4EF', display: 'flex', flexDirection: 'column' }}>
            <VisualChartContent c_content={c_content} templateName={templateName} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: device === 'desktop' ? 0 : 24, overflow: 'auto', background: device === 'desktop' ? '#fff' : '#1a1a1a' }}>
            <div style={{ 
              width: device === 'desktop' ? '100%' : deviceWidth,
              maxWidth: device === 'desktop' ? '100%' : deviceWidth,
              flex: device === 'desktop' ? 1 : 'none',
              minHeight: device === 'mobile' ? 700 : 'auto',
              background: '#fff', 
              borderRadius: device === 'mobile' ? 32 : 8,
              overflow: 'hidden',
              boxShadow: device === 'desktop' ? 'none' : '0 25px 80px rgba(0,0,0,0.5)',
              border: device === 'mobile' ? '8px solid #333' : 'none'
            }}>
              {/* Browser chrome — desktop/tablet/email/pdf only */}
              {device !== 'mobile' && (
                <div style={{ padding: '10px 14px', background: '#f0f0f0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                  <div style={{ flex: 1, padding: '6px 14px', background: '#fff', borderRadius: 6, fontSize: 11, color: '#666', border: '1px solid #ddd' }}>
                    privatebank.jpmorgan.com/eur/en/insights/{(c_content.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}
                  </div>
                </div>
              )}
              {device === 'mobile' && (
                <div style={{ padding: '12px 20px', background: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>9:41</span>
                  <div style={{ width: 80, height: 28, borderRadius: 14, background: '#1a1a1a' }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span style={{ color: '#fff', fontSize: 11 }}>5G</span>
                    <span style={{ color: '#fff', fontSize: 11 }}>100%</span>
                  </div>
                </div>
              )}
              {/* Content */}
              <div style={{ padding: isMobile ? 16 : '24px 32px', maxWidth: 'none', margin: 0 }}>
                {device === 'email'
                  ? <EmailPreviewContent c_content={c_content} templateName={templateName} metadata={m} />
                  : device === 'pdf'
                  ? <ArticleContent isMobile={false} isEmail={false} isPDF={true} />
                  : templateId === 'videoPublish'
                  ? <VideoArticleContent isMobile={isMobile} />
                  : templateId === 'eventResponse'
                  ? <EventResponseContent isMobile={isMobile} />
                  : templateId === 'macroMarkets'
                  ? <MacroMarketsContent isMobile={isMobile} />
                  : templateId === 'morningMeeting'
                  ? <MorningMeetingContent isMobile={isMobile} />
                  : templateId === 'dailyMarketUpdate'
                  ? <DailyMarketUpdateContent isMobile={isMobile} c_content={c_content} formatText={formatText} JPMDisclaimer={JPMDisclaimer} />
                  : <ArticleContent isMobile={isMobile} isEmail={false} isPDF={false} />
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// GIS TEMPLATES
// ============================================

const MorningMeetingTemplate = ({ content, onContentChange }) => {
  const c_content = content || {};

  // Fixed market update section + dynamic focus area sections
  const marketUpdate = c_content.marketUpdate || '';
  const focusAreas = c_content.focusAreas || [
    { id: 'fa1', title: 'Focus Area 1', content: '', placeholder: 'e.g. Rates / Derivatives update (~200 words max)...' },
    { id: 'fa2', title: 'Focus Area 2', content: '', placeholder: 'e.g. Deposits / Liquidity update (~200 words max)...' },
  ];

  const totalWords = [marketUpdate, ...focusAreas.map(f => f.content)].reduce((acc, text) => {
    return acc + (text || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  }, 0);
  const warnOver = totalWords > 600;

  const addFocusArea = () => {
    const n = focusAreas.length + 1;
    onContentChange && onContentChange({ ...c_content, focusAreas: [...focusAreas, { id: 'fa' + Date.now(), title: 'Focus Area ' + n, content: '', placeholder: '~200 words max...' }] });
  };
  const updateFocus = (id, patch) => onContentChange && onContentChange({ ...c_content, focusAreas: focusAreas.map(f => f.id === id ? { ...f, ...patch } : f) });
  const removeFocus = (id) => { if (focusAreas.length <= 1) return; onContentChange && onContentChange({ ...c_content, focusAreas: focusAreas.filter(f => f.id !== id) }); };

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'linear-gradient(135deg, #0A1A2F 0%, #103A45 100%)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>☀️ Morning Meeting Notes</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Summary of 30min daily call · Do not distribute externally</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: warnOver ? c.neg : totalWords > 400 ? '#E08A00' : c.pos }}>
            {totalWords}w {warnOver ? '⚠ Over 600w limit' : ''}
          </div>
        </div>

        {/* Date and meeting info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Meeting Date</label>
            <input type="date" value={c_content.meetingDate || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, meetingDate: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Chair / Host</label>
            <input value={c_content.chair || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, chair: e.target.value })}
              placeholder="Name..." style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
          </div>
        </div>

        <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="e.g. Morning Meeting — 24 March 2026" style={{ width: '100%', fontSize: 16, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '2px solid ' + c.pearl, paddingBottom: 10, marginBottom: 16, outline: 'none' }} />

        {/* Fixed: 5-min Market Update */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Market Update <span style={{ color: c.slate, fontWeight: 400 }}>(5 min slot · ~150 words)</span></label>
          </div>
          <div contentEditable suppressContentEditableWarning
            onBlur={(e) => onContentChange && onContentChange({ ...c_content, marketUpdate: e.currentTarget.innerHTML })}
            dangerouslySetInnerHTML={{ __html: marketUpdate }}
            data-placeholder="Overnight markets, key data prints, macro themes for today..."
            style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 13, lineHeight: 1.6, minHeight: 80, outline: 'none', background: '#fff', cursor: 'text' }} />
        </div>

        {/* Dynamic focus area sections */}
        <div style={{ marginBottom: 14, borderTop: '1px solid ' + c.pearl, paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Focus Area Updates <span style={{ color: c.slate, fontWeight: 400 }}>(each ~200 words max)</span></label>
            {focusAreas.length < 4 && (
              <button type="button" onClick={addFocusArea}
                style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, border: '1px solid ' + c.pearl, background: '#fff', color: c.navy, cursor: 'pointer' }}>+ Add Area</button>
            )}
          </div>
          {focusAreas.map((fa, idx) => (
            <div key={fa.id} style={{ marginBottom: 12, padding: 12, background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <input value={fa.title} onChange={(e) => updateFocus(fa.id, { title: e.target.value })}
                  style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, border: 'none', outline: 'none', background: 'transparent', flex: 1 }} />
                {focusAreas.length > 1 && (
                  <button type="button" onClick={() => removeFocus(fa.id)}
                    style={{ padding: '2px 8px', borderRadius: 4, border: 'none', background: c.neg, color: '#fff', fontSize: 9, cursor: 'pointer' }}>✕</button>
                )}
              </div>
              <div contentEditable suppressContentEditableWarning
                onBlur={(e) => updateFocus(fa.id, { content: e.currentTarget.innerHTML })}
                dangerouslySetInnerHTML={{ __html: fa.content }}
                data-placeholder={fa.placeholder}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, lineHeight: 1.6, minHeight: 60, outline: 'none', background: '#fff', cursor: 'text' }} />
            </div>
          ))}
        </div>

        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
      </div>
      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #999; pointer-events: none; font-style: italic; }
        [contenteditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: #999; pointer-events: none; font-style: italic; }
      `}</style>
    </div>
  );
};

const TopMarketTakeawaysTemplate = ({ content, onContentChange }) => {
  const c_content = content || {};
  const isExternal = c_content.isExternal !== false;
  const defaultSections = [
    { id: 'hook',  title: 'The Story This Week', content: '', placeholder: "Lead like a journalist. One vivid paragraph that captures the market moment — what happened, why now, and why it matters. ~120 words." },
    { id: 'take1', title: 'Takeaway 1',           content: '', placeholder: 'First insight. Lead with the conclusion, then support it with 1-2 specific data points. ~150 words.' },
    { id: 'take2', title: 'Takeaway 2',           content: '', placeholder: 'Second insight — different asset class or angle from Takeaway 1. ~150 words.' },
    { id: 'take3', title: 'Takeaway 3',           content: '', placeholder: 'Third insight — forward-looking, what to watch. Ends with a clear JPM view. ~150 words.' },
  ];
  const sections = c_content.sections || defaultSections;

  const wordCount = sections.reduce((acc, s) => acc + (s.content || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length, 0);
  const warnOver = wordCount > 700;

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        {/* Distribution toggle */}
        <div style={{ marginBottom: 16, padding: 14, background: isExternal ? 'linear-gradient(135deg, #C1A364 0%, #D4B87A 100%)' : 'linear-gradient(135deg, #103A45 0%, #1A5A6A 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{isExternal ? '🌐 External · Client Distribution' : '🔒 Internal Only'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{isExternal ? 'Weekly digest distributed to clients via Nexus' : 'Internal desk circulation only'}</div>
          </div>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <button onClick={() => onContentChange && onContentChange({ ...c_content, isExternal: false })} style={{ padding: '9px 18px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !isExternal ? '#fff' : 'rgba(255,255,255,0.2)', color: !isExternal ? c.teal : 'rgba(255,255,255,0.9)' }}>🔒 Internal</button>
            <button onClick={() => onContentChange && onContentChange({ ...c_content, isExternal: true })}  style={{ padding: '9px 18px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background:  isExternal ? '#fff' : 'rgba(255,255,255,0.2)', color:  isExternal ? c.gold  : 'rgba(255,255,255,0.9)' }}>🌐 External</button>
          </div>
        </div>

        {/* Guidance + word count */}
        <div style={{ marginBottom: 14, padding: '8px 12px', background: '#FFF9ED', borderLeft: '3px solid ' + c.gold, borderRadius: '0 6px 6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: c.slate }}>
            <strong style={{ color: c.gold }}>Top Market Takeaways</strong> — one page, journalistic tone. Weekly digest. Hard cap <strong>700 words</strong>.
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: warnOver ? c.neg : wordCount > 550 ? '#E08A00' : wordCount > 0 ? c.pos : c.slate, marginLeft: 12, flexShrink: 0 }}>
            {wordCount}w {warnOver ? '⚠ Over limit' : ''}
          </div>
        </div>

        {/* Edition label */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Edition / Week</label>
            <input value={c_content.edition || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, edition: e.target.value })}
              placeholder="e.g. Week of 24 March 2026" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Primary Theme</label>
            <input value={c_content.theme || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, theme: e.target.value })}
              placeholder="e.g. Tariffs, Fed, China growth..." style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
          </div>
        </div>

        <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="A punchy, journalistic headline — e.g. 'The Rally Nobody Believed In'" style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '2px solid ' + c.pearl, paddingBottom: 10, marginBottom: 14, outline: 'none' }} />

        <MovableSectionsEditor sections={sections} onChange={(s) => onContentChange && onContentChange({ ...c_content, sections: s })} />
        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};

const ChartOfTheWeekTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'meaning', title: 'What It Means', content: '', placeholder: 'Explain the chart and its significance...' },
    { id: 'takeaway', title: 'Key Takeaway', content: '', placeholder: 'The main insight readers should remember...' }
  ];
  const sections = c_content.sections || defaultSections;
  const chartImage = c_content.chartImage || null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onContentChange && onContentChange({ ...c_content, chartImage: ev.target.result });
    reader.readAsDataURL(file);
  };

  return (
  <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: 16 }}>
      <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
        placeholder="Chart headline..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />

      <input type="file" id="chart-of-week-upload" accept="image/*" onChange={handleImageUpload} style={{ display:'none' }} />

      {chartImage ? (
        <div style={{ marginBottom: 14, borderRadius: 8, border: '1px solid ' + c.pearl, overflow:'hidden', position:'relative' }}>
          <img src={chartImage} alt="Chart" style={{ width:'100%', display:'block', maxHeight:400, objectFit:'contain', background:c.ivory }} />
          <button onClick={() => onContentChange && onContentChange({ ...c_content, chartImage: null })}
            style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', borderRadius:4, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>
            Remove
          </button>
        </div>
      ) : (
        <div onClick={() => document.getElementById('chart-of-week-upload').click()}
          style={{ marginBottom: 14, padding: 40, borderRadius: 8, border: '2px dashed ' + c.pearl, textAlign: 'center', background: c.ivory, cursor:'pointer' }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => onContentChange && onContentChange({ ...c_content, chartImage: ev.target.result }); r.readAsDataURL(file); } }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
          <div style={{ fontSize: 12, color: c.slate, marginBottom: 8 }}>Drop chart image here or click to upload</div>
          <button type="button" style={{ fontSize: 10, padding: '6px 12px', borderRadius: 5, border: '1px solid ' + c.pearl, background: '#fff', color: c.slate, cursor: 'pointer' }}>Upload Chart</button>
        </div>
      )}

      <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
      <TagsSection tags={[]} />
      <Disclaimer />
    </div>
  </div>
  );
};

// Chart slot for Ideas & Insights (Bloomberg-style data input)
const IdeasChartSlot = ({ chart, idx, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  const chartTypes = ['Line', 'Bar', 'Area', 'Scatter', 'Dual-Axis'];
  const type = chart.chartType || 'Line';

  // Parse data series from comma-separated input
  const parseData = (raw) => {
    if (!raw) return [];
    return raw.split('\n').filter(Boolean).map(line => {
      const parts = line.split(',').map(s => s.trim());
      return { label: parts[0] || '', value: parseFloat(parts[1]) || 0, value2: parseFloat(parts[2]) || null };
    });
  };
  const data = parseData(chart.dataRaw);
  const hasData = data.length > 0;
  const maxVal = hasData ? Math.max(...data.map(d => Math.abs(d.value))) : 100;

  return (
    <div style={{ marginBottom: 12, borderRadius: 8, border: '1px solid ' + c.pearl, overflow: 'hidden' }}>
      {/* Chart slot header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: c.navy, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📊</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{chart.title || `Chart ${idx + 1}`}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{type} · {hasData ? data.length + ' points' : 'No data'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ padding: '2px 8px', borderRadius: 3, background: c.neg, border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer' }}>✕</button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Live chart preview */}
      {hasData && (
        <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid ' + c.pearl }}>
          <div style={{ fontSize: 9, color: c.slate, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>{chart.title} {chart.source ? '· Source: ' + chart.source : ''}</div>
          {type === 'Bar' ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
              {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', background: d.value >= 0 ? '#0A2540' : '#B84242', height: Math.max(4, Math.abs(d.value) / maxVal * 70), borderRadius: '2px 2px 0 0' }} />
                  <div style={{ fontSize: 7, color: c.slate, textAlign: 'center', lineHeight: 1.1, maxWidth: 30, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <svg viewBox={`0 0 ${Math.max(data.length * 60, 300)} 80`} style={{ width: '100%', height: 80 }}>
              {data.map((d, i) => {
                const x = (i / Math.max(data.length - 1, 1)) * (Math.max(data.length * 60, 300) - 20) + 10;
                const y = 70 - (d.value / maxVal) * 60;
                const nextD = data[i+1];
                const nx = nextD ? ((i+1) / Math.max(data.length-1,1)) * (Math.max(data.length*60,300)-20) + 10 : null;
                const ny = nextD ? 70 - (nextD.value / maxVal) * 60 : null;
                return (
                  <g key={i}>
                    {nx && <line x1={x} y1={y} x2={nx} y2={ny} stroke="#0A2540" strokeWidth="1.5"/>}
                    <circle cx={x} cy={y} r="3" fill="#C1A364"/>
                    <text x={x} y="78" fontSize="7" textAnchor="middle" fill="#717171">{d.label}</text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      )}

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: 12, background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 3 }}>Chart Title</label>
              <input value={chart.title || ''} onChange={(e) => onChange({ title: e.target.value })}
                placeholder="e.g. US 10Y Yield vs Fed Funds Rate" style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 3 }}>Chart Type</label>
              <select value={type} onChange={(e) => onChange({ chartType: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none', background: '#fff' }}>
                {chartTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 3 }}>Y-Axis Label</label>
              <input value={chart.yLabel || ''} onChange={(e) => onChange({ yLabel: e.target.value })}
                placeholder="e.g. % / bps / $bn" style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 3 }}>Source</label>
              <input value={chart.source || ''} onChange={(e) => onChange({ source: e.target.value })}
                placeholder="Bloomberg, Fed, BLS..." style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 3 }}>
              Data — one row per point: Label, Value {type === 'Dual-Axis' ? ', Value2' : ''}
            </label>
            <textarea value={chart.dataRaw || ''} onChange={(e) => onChange({ dataRaw: e.target.value })}
              placeholder={"Jan 2024, 4.25\nApr 2024, 4.5\nJul 2024, 4.35\nOct 2024, 4.6\nJan 2025, 4.8"}
              style={{ width: '100%', padding: 8, borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, lineHeight: 1.5, resize: 'none', minHeight: 90, outline: 'none', fontFamily: 'monospace' }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 3 }}>Chart Caption / Annotation</label>
            <input value={chart.caption || ''} onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="e.g. Yields have risen 125bps since the pivot narrative faded in late 2024" style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 3 }}>Position in Document</label>
            <select value={chart.position || 'setup'} onChange={(e) => onChange({ position: e.target.value })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none', background: '#fff' }}>
              <option value="exec">After The Big Idea</option>
              <option value="setup">After The Setup</option>
              <option value="deep">After Deeper Look</option>
              <option value="impl">After Client Implications</option>
              <option value="view">After Our View</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

const IdeasInsightsTemplate = ({ content, onContentChange }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'exec',  title: 'The Big Picture',    content: '', placeholder: "The key thesis in 2-3 sentences. What is the planning or investment trend this piece is tracking, and why does it matter to advisors right now?" },
    { id: 'setup', title: 'The Setup',           content: '', placeholder: 'Context: what led to this? Include specific data. Name the trend, the shift, the structural change. ~300 words.' },
    { id: 'deep',  title: 'Deeper Look',         content: '', placeholder: 'Analysis: what is driving this, what are the second-order effects, where is the consensus wrong? ~500 words. Reference charts by name.' },
    { id: 'impl',  title: 'What This Means for Clients', content: '', placeholder: 'Planning and portfolio implications. Specific. Actionable. Connect to real client situations — tax, estate, liquidity, allocation. ~400 words.' },
    { id: 'view',  title: 'Our View',            content: '', placeholder: 'Bottom line: one clear JPM Private Bank recommendation. ~100 words.' },
  ];
  const sections = c_content.sections || defaultSections;
  const charts = c_content.charts || [];

  const wordCount = sections.reduce((acc, s) => acc + (s.content || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length, 0);
  const warnOver = wordCount > 2000;

  const addChart = () => {
    onContentChange && onContentChange({ ...c_content, charts: [...charts, { id: 'ch' + Date.now(), title: '', chartType: 'Line', dataRaw: '', source: '', yLabel: '', caption: '', position: 'setup' }] });
  };
  const updateChart = (id, patch) => onContentChange && onContentChange({ ...c_content, charts: charts.map(ch => ch.id === id ? { ...ch, ...patch } : ch) });
  const removeChart = (id) => onContentChange && onContentChange({ ...c_content, charts: charts.filter(ch => ch.id !== id) });

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        {/* Guidance */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: warnOver ? c.neg : wordCount > 1600 ? '#E08A00' : wordCount > 0 ? c.pos : c.slate }}>{wordCount}w{warnOver ? ' ⚠ Over 2,000w' : ''}</div>
        </div>

        <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="e.g. 'The Hidden Tax Drag on High-Income Portfolios'" style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '2px solid ' + c.pearl, paddingBottom: 10, marginBottom: 14, outline: 'none' }} />

        <MovableSectionsEditor sections={sections} onChange={(s) => onContentChange && onContentChange({ ...c_content, sections: s })} />

        {/* Chart slots */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + c.pearl }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Charts <span style={{ color: c.slate, fontWeight: 400 }}>— data entered here renders in the preview</span></label>
            <button type="button" onClick={addChart}
              style={{ fontSize: 10, padding: '5px 12px', borderRadius: 5, border: '1px solid ' + c.pearl, background: '#fff', color: c.navy, cursor: 'pointer', fontWeight: 500 }}>+ Add Chart</button>
          </div>
          {charts.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed ' + c.pearl, borderRadius: 8, color: c.slate, fontSize: 11 }}>
              No charts yet. Add a chart and enter your Bloomberg data above.
            </div>
          )}
          {charts.map((ch, idx) => (
            <IdeasChartSlot key={ch.id} chart={ch} idx={idx} onChange={(patch) => updateChart(ch.id, patch)} onRemove={() => removeChart(ch.id)} />
          ))}
        </div>

        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};

const GISViewTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'key', title: 'Key Message', content: '', placeholder: 'The headline view in 1-2 sentences...' },
    { id: 'analysis', title: 'Supporting Analysis', content: '', placeholder: 'Data and reasoning behind the view...' },
    { id: 'positioning', title: 'Positioning', content: '', placeholder: 'Recommended positioning or action...' }
  ];
  const sections = c_content.sections || defaultSections;
  
  return (
  <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: 16 }}>
      <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
        placeholder="GIS View title..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />
      <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
      <TagsSection tags={[]} />
      <Disclaimer />
    </div>
  </div>
  );
};

// Cover image themes — abstract SVG illustrations keyed to content subject
const CoverImageThemes = {
  macro: (color1='#0A2540', color2='#9B8579') => (
    // Abstract global network / interconnected nodes
    `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#103A45;stop-opacity:1"/>
        </linearGradient>
        <linearGradient id="gd" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${color2};stop-opacity:0.8"/>
          <stop offset="100%" style="stop-color:#C1A364;stop-opacity:0.3"/>
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="800" height="500" fill="url(#bg)"/>
      <!-- Subtle grid lines -->
      ${Array.from({length:12},(_,i)=>`<line x1="${i*70}" y1="0" x2="${i*70}" y2="500" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`).join('')}
      ${Array.from({length:8},(_,i)=>`<line x1="0" y1="${i*70}" x2="800" y2="${i*70}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`).join('')}
      <!-- Globe arc -->
      <ellipse cx="600" cy="250" rx="240" ry="240" fill="none" stroke="rgba(155,133,121,0.15)" stroke-width="1.5"/>
      <ellipse cx="600" cy="250" rx="240" ry="100" fill="none" stroke="rgba(155,133,121,0.1)" stroke-width="1"/>
      <ellipse cx="600" cy="250" rx="120" ry="240" fill="none" stroke="rgba(155,133,121,0.1)" stroke-width="1"/>
      <ellipse cx="600" cy="250" rx="200" ry="200" fill="none" stroke="rgba(193,163,100,0.2)" stroke-width="1"/>
      <!-- Connection lines -->
      <line x1="200" y1="120" x2="480" y2="200" stroke="url(#gd)" stroke-width="1" opacity="0.6"/>
      <line x1="200" y1="120" x2="350" y2="320" stroke="url(#gd)" stroke-width="1" opacity="0.4"/>
      <line x1="350" y1="320" x2="480" y2="200" stroke="url(#gd)" stroke-width="1" opacity="0.5"/>
      <line x1="480" y1="200" x2="560" y2="350" stroke="url(#gd)" stroke-width="1" opacity="0.3"/>
      <line x1="100" y1="300" x2="200" y2="120" stroke="rgba(193,163,100,0.2)" stroke-width="1"/>
      <!-- Nodes -->
      <circle cx="200" cy="120" r="5" fill="${color2}" opacity="0.9" filter="url(#glow)"/>
      <circle cx="200" cy="120" r="12" fill="${color2}" opacity="0.15"/>
      <circle cx="480" cy="200" r="4" fill="${color2}" opacity="0.8" filter="url(#glow)"/>
      <circle cx="480" cy="200" r="10" fill="${color2}" opacity="0.12"/>
      <circle cx="350" cy="320" r="6" fill="#C1A364" opacity="0.9" filter="url(#glow)"/>
      <circle cx="350" cy="320" r="14" fill="#C1A364" opacity="0.12"/>
      <circle cx="100" cy="300" r="3" fill="${color2}" opacity="0.6"/>
      <circle cx="560" cy="350" r="3" fill="${color2}" opacity="0.5"/>
      <!-- Gold accent bar -->
      <rect x="0" y="460" width="800" height="3" fill="url(#gd)" opacity="0.8"/>
      <!-- Corner accent -->
      <rect x="0" y="0" width="4" height="500" fill="${color2}" opacity="0.6"/>
    </svg>`
  ),
  rates: (color1='#0A2540', color2='#4A6FA5') => (
    // Yield curve / wave form
    `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1}"/>
          <stop offset="100%" style="stop-color:#06162A"/>
        </linearGradient>
        <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#9B8579;stop-opacity:0"/>
          <stop offset="40%" style="stop-color:#C1A364;stop-opacity:0.7"/>
          <stop offset="100%" style="stop-color:#9B8579;stop-opacity:0.1"/>
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#bg)"/>
      <!-- Background curves (yield curves) -->
      <path d="M 0 380 Q 200 200 400 280 Q 600 360 800 200" fill="none" stroke="rgba(193,163,100,0.12)" stroke-width="60"/>
      <path d="M 0 350 Q 200 220 400 270 Q 600 320 800 180" fill="none" stroke="rgba(155,133,121,0.08)" stroke-width="40"/>
      <!-- Main yield curve -->
      <path d="M 60 400 Q 200 380 350 300 Q 500 220 740 160" fill="none" stroke="url(#wave1)" stroke-width="2.5"/>
      <!-- Inverted curve -->
      <path d="M 60 320 Q 200 310 350 340 Q 500 370 740 300" fill="none" stroke="rgba(74,111,165,0.4)" stroke-width="1.5" stroke-dasharray="6 4"/>
      <!-- Data points on main curve -->
      <circle cx="200" cy="368" r="4" fill="#C1A364" opacity="0.8"/>
      <circle cx="350" cy="300" r="5" fill="#C1A364"/>
      <circle cx="500" cy="230" r="4" fill="#C1A364" opacity="0.8"/>
      <circle cx="650" cy="185" r="4" fill="#9B8579" opacity="0.7"/>
      <!-- Axis lines -->
      <line x1="50" y1="100" x2="50" y2="430" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
      <line x1="50" y1="430" x2="760" y2="430" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
      <!-- Tick marks -->
      ${Array.from({length:7},(_,i)=>`<line x1="${100+i*100}" y1="425" x2="${100+i*100}" y2="435" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`).join('')}
      <rect x="0" y="462" width="800" height="2" fill="#C1A364" opacity="0.5"/>
      <rect x="0" y="0" width="4" height="500" fill="#C1A364" opacity="0.5"/>
    </svg>`
  ),
  equities: (color1='#0A2540', color2='#1B7F4E') => (
    // Market bars / momentum
    `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#050E1A"/>
          <stop offset="100%" style="stop-color:${color1}"/>
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#bg)"/>
      <!-- Bar chart rising from right to show growth -->
      ${[
        {x:80, h:120, up:false}, {x:140,h:90,up:true}, {x:200,h:160,up:true},
        {x:260,h:130,up:false},{x:320,h:200,up:true},{x:380,h:170,up:false},
        {x:440,h:240,up:true},{x:500,h:200,up:false},{x:560,h:290,up:true},
        {x:620,h:260,up:false},{x:680,h:320,up:true}
      ].map(b=>`<rect x="${b.x}" y="${430-b.h}" width="44" height="${b.h}" fill="${b.up ? 'rgba(27,127,78,0.35)' : 'rgba(184,66,66,0.25)'}" rx="2"/>
        <rect x="${b.x}" y="${430-b.h}" width="44" height="2" fill="${b.up ? '#1B7F4E' : '#B84242'}" opacity="0.7"/>`).join('')}
      <!-- Trend line -->
      <path d="M 80 370 Q 300 280 500 240 Q 650 210 720 150" fill="none" stroke="rgba(193,163,100,0.6)" stroke-width="2" stroke-dasharray="none"/>
      <!-- Axis -->
      <line x1="60" y1="430" x2="760" y2="430" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <rect x="0" y="462" width="800" height="2" fill="#9B8579" opacity="0.6"/>
      <rect x="0" y="0" width="4" height="500" fill="#9B8579" opacity="0.5"/>
    </svg>`
  ),
  geopolitics: (color1='#06162A', color2='#9B8579') => (
    // Abstract map / territorial lines
    `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1}"/>
          <stop offset="100%" style="stop-color:#0F2A3C"/>
        </linearGradient>
        <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#C1A364;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:#C1A364;stop-opacity:0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#bg)"/>
      <!-- Longitude/latitude grid -->
      ${Array.from({length:7},(_,i)=>`<path d="M ${120+i*90} 50 Q ${120+i*90+20} 250 ${120+i*90} 450" fill="none" stroke="rgba(155,133,121,0.07)" stroke-width="1"/>`).join('')}
      ${Array.from({length:5},(_,i)=>`<ellipse cx="400" cy="250" rx="${80+i*80}" ry="${30+i*25}" fill="none" stroke="rgba(155,133,121,0.06)" stroke-width="1"/>`).join('')}
      <!-- "Tectonic" boundary lines -->
      <path d="M 0 200 Q 150 180 280 240 Q 400 300 520 260 Q 640 220 800 280" fill="none" stroke="rgba(193,163,100,0.2)" stroke-width="1.5"/>
      <path d="M 0 320 Q 200 290 350 350 Q 500 400 800 360" fill="none" stroke="rgba(155,133,121,0.12)" stroke-width="1"/>
      <!-- Hotspot glows -->
      <circle cx="280" cy="200" r="60" fill="url(#glow1)" opacity="0.6"/>
      <circle cx="550" cy="280" r="40" fill="url(#glow1)" opacity="0.4"/>
      <!-- Dots representing flash points -->
      <circle cx="180" cy="190" r="3" fill="#C1A364" opacity="0.8"/>
      <circle cx="280" cy="200" r="5" fill="#C1A364"/>
      <circle cx="380" cy="260" r="3" fill="#9B8579" opacity="0.7"/>
      <circle cx="490" cy="240" r="4" fill="#C1A364" opacity="0.6"/>
      <circle cx="550" cy="285" r="5" fill="#9B8579"/>
      <circle cx="650" cy="230" r="3" fill="#C1A364" opacity="0.5"/>
      <!-- Connection arcs -->
      <path d="M 280 200 Q 380 140 490 240" fill="none" stroke="rgba(193,163,100,0.3)" stroke-width="1" stroke-dasharray="4 3"/>
      <path d="M 180 190 Q 230 160 280 200" fill="none" stroke="rgba(155,133,121,0.3)" stroke-width="1"/>
      <rect x="0" y="462" width="800" height="2" fill="${color2}" opacity="0.7"/>
      <rect x="0" y="0" width="4" height="500" fill="${color2}" opacity="0.6"/>
    </svg>`
  ),
};

const getCoverTheme = (title, assetClass) => {
  const text = ((title || '') + ' ' + (assetClass || '')).toLowerCase();
  if (/rate|bond|yield|duration|credit|fixed income|debt/.test(text)) return 'rates';
  if (/equit|stock|share|market|rally|sell|bull|bear/.test(text)) return 'equities';
  if (/geopolit|trade war|tariff|sanction|region|china|russia|europe|war/.test(text)) return 'geopolitics';
  return 'macro';
};

const MacroMarketsTemplate = ({ content, onContentChange }) => {
  const c_content = content || {};
  const [coverExpanded, setCoverExpanded] = useState(false);

  const defaultSections = [
    { id: 'exec',  title: 'Executive Summary',   content: '', placeholder: "The bottom line in 2–3 sentences. Lead with the insight, not the setup. What is the single most important thing an advisor needs to know right now?" },
    { id: 'context', title: 'The Context',        content: '', placeholder: "What is the tension or question driving this piece? Anchor in data. Name the specific numbers, rates, spreads, or levels that matter. Don't start with 'Markets have been...'" },
    { id: 'analysis', title: 'The Analysis',      content: '', placeholder: "Go deeper. Challenge the consensus view. What is the market pricing in — and where is it wrong? Use specific data points, regional comparisons, and historical analogues where they add weight." },
    { id: 'implications', title: 'Portfolio Implications', content: '', placeholder: "Translate the thesis into portfolio action. Be specific about asset classes, durations, geographies. Give advisors something to say to a client in a meeting tomorrow." },
    { id: 'view',  title: 'Our View',             content: '', placeholder: "Short. Decisive. No hedging. One or two sentences that capture the JPM Private Bank position clearly." },
  ];
  const sections = c_content.sections || defaultSections;

  const coverTheme = getCoverTheme(c_content.title, c_content.assetClass);

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

      {/* ── COVER PAGE BUILDER ── */}
      <div style={{ borderBottom: '1px solid ' + c.pearl }}>
        <button
          type="button"
          onClick={() => setCoverExpanded(!coverExpanded)}
          style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', background: coverExpanded ? c.navy : c.ivory, cursor: 'pointer', borderRadius: coverExpanded ? '10px 10px 0 0' : 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🎨</span>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: coverExpanded ? '#fff' : c.navy }}>Cover Page</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: coverExpanded ? 'rgba(255,255,255,0.15)' : c.gold + '20', color: coverExpanded ? 'rgba(255,255,255,0.8)' : c.gold, fontWeight: 500 }}>
              Auto-generated · editable
            </span>
          </div>
          <span style={{ color: coverExpanded ? '#fff' : c.slate, fontSize: 12 }}>{coverExpanded ? '▲' : '▼'}</span>
        </button>

        {coverExpanded && (
          <div style={{ padding: 16, background: c.navy + '08' }}>
            {/* Cover preview */}
            <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxHeight: 220, position: 'relative' }}>
              <div
                dangerouslySetInnerHTML={{ __html: CoverImageThemes[coverTheme]() }}
                style={{ width: '100%', fontSize: 0 }}
              />
              {/* Cover text overlay preview */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px 24px', background: 'linear-gradient(to top, rgba(10,26,47,0.7) 0%, transparent 60%)' }}>
                <div style={{ fontSize: 9, color: 'rgba(193,163,100,0.9)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>MACRO & MARKETS · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                <div style={{ fontSize: 16, color: '#fff', fontFamily: 'Georgia, serif', fontWeight: 300, lineHeight: 1.25, maxWidth: 400 }}>{c_content.title || 'Your title will appear here'}</div>
                {c_content.tagline && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{c_content.tagline}</div>}
              </div>
            </div>

            {/* Cover fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cover Tagline</label>
                <input
                  value={c_content.tagline || ''}
                  onChange={(e) => onContentChange && onContentChange({ ...c_content, tagline: e.target.value })}
                  placeholder="e.g. Navigating the affordability debate..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cover Theme</label>
                <select
                  value={c_content.coverThemeOverride || coverTheme}
                  onChange={(e) => onContentChange && onContentChange({ ...c_content, coverThemeOverride: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none', background: '#fff' }}
                >
                  <option value="macro">🌐 Global Macro (networks)</option>
                  <option value="rates">📈 Rates & Fixed Income (yield curves)</option>
                  <option value="equities">📊 Equities (market bars)</option>
                  <option value="geopolitics">🌍 Geopolitics (map/territory)</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 10, color: c.slate, padding: '6px 10px', background: c.ivory, borderRadius: 6 }}>
              💡 Cover image auto-selects based on your title. Override with the dropdown above. The preview renders in full on the Output Preview.
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>
            Article Title — Write as a question or tension, not a topic
          </div>
          <input
            value={c_content.title || ''}
            onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
            placeholder="e.g. 'Can the consumer hold up if tariffs bite harder?' — avoid dry category titles"
            style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '2px solid ' + c.pearl, paddingBottom: 10, outline: 'none', lineHeight: 1.3 }}
          />
        </div>

        {/* Key data callouts — optional, toggleable */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Key Data Callouts <span style={{ color: c.slate, fontWeight: 400, textTransform: 'none' }}>— optional, toggle to add pull stats</span>
            </label>
            <button type="button"
              onClick={() => onContentChange && onContentChange({ ...c_content, showStats: !c_content.showStats })}
              style={{ fontSize: 9, padding: '3px 10px', borderRadius: 4, border: '1px solid ' + c.pearl, background: c_content.showStats ? c.navy : '#fff', color: c_content.showStats ? '#fff' : c.slate, cursor: 'pointer' }}>
              {c_content.showStats ? '✓ Shown in preview' : '+ Add stats'}
            </button>
          </div>
          {c_content.showStats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: 12, background: c.navy + '06', borderRadius: 8, border: '1px solid ' + c.navy + '12' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl }}>
                  <input value={(c_content.stats || [])[i]?.number || ''}
                    onChange={(e) => { const stats = [...(c_content.stats || [{},{},{}])]; stats[i] = { ...stats[i], number: e.target.value }; onContentChange && onContentChange({ ...c_content, stats }); }}
                    placeholder="e.g. +3.2%" style={{ width: '100%', fontSize: 16, fontWeight: 700, color: c.navy, fontFamily: 'Georgia, serif', border: 'none', outline: 'none', marginBottom: 4 }} />
                  <input value={(c_content.stats || [])[i]?.label || ''}
                    onChange={(e) => { const stats = [...(c_content.stats || [{},{},{}])]; stats[i] = { ...stats[i], label: e.target.value }; onContentChange && onContentChange({ ...c_content, stats }); }}
                    placeholder="Label / context" style={{ width: '100%', fontSize: 10, color: c.slate, border: 'none', outline: 'none' }} />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Movable content sections */}
        <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};

const SpecialistSpotlightTemplate = ({ content, onContentChange }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'view',    title: 'The View',    content: '', placeholder: "The specialist's core thesis in their own voice — direct, specific, opinionated. ~200 words. Quote where possible." },
    { id: 'why',     title: 'Why Now',     content: '', placeholder: 'What makes this view timely? What data or market development prompted it? ~150 words.' },
    { id: 'position',title: 'Positioning', content: '', placeholder: 'Translate into portfolio action. Be precise — asset class, geography, instrument. ~100 words.' },
  ];
  const sections = c_content.sections || defaultSections;
  const wordCount = sections.reduce((acc, s) => acc + (s.content || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length, 0);
  const warnOver = wordCount > 500;

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        {/* Guidance */}
        <div style={{ marginBottom: 14, padding: '8px 12px', background: '#FFF9ED', borderLeft: '3px solid ' + c.gold, borderRadius: '0 6px 6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: c.slate }}>
            <strong style={{ color: c.gold }}>Specialist Spotlight</strong> — half a page. One manager, one focused view. Hard cap <strong>500 words</strong>.
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: warnOver ? c.neg : wordCount > 400 ? '#E08A00' : wordCount > 0 ? c.pos : c.slate, marginLeft: 12, flexShrink: 0 }}>
            {wordCount}w {warnOver ? '⚠ Over limit' : ''}
          </div>
        </div>

        {/* Specialist identity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14, padding: 12, background: c.ivory, borderRadius: 8 }}>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Specialist Name</label>
            <input value={c_content.specialistName || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, specialistName: e.target.value })}
              placeholder="Full name..." style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Title / Role</label>
            <input value={c_content.specialistRole || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, specialistRole: e.target.value })}
              placeholder="e.g. Head of Fixed Income Strategy..." style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Focus Area / Fund</label>
            <input value={c_content.focusArea || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, focusArea: e.target.value })}
              placeholder="e.g. US Large Cap Equities..." style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, outline: 'none', background: '#fff' }} />
          </div>
        </div>

        <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="e.g. 'Why I'm Still Bullish on Duration Despite the Noise'" style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '2px solid ' + c.pearl, paddingBottom: 10, marginBottom: 14, outline: 'none' }} />

        <MovableSectionsEditor sections={sections} onChange={(s) => onContentChange && onContentChange({ ...c_content, sections: s })} />
        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};

const ManagerVideoBriefTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'messages', title: 'Key Messages', content: '', placeholder: '3-5 key bullet points...' },
    { id: 'talking', title: 'Talking Points', content: '', placeholder: 'Detailed talking points by section...' },
    { id: 'visuals', title: 'Visual Suggestions', content: '', placeholder: 'Charts, graphics, tables to include...' }
  ];
  const sections = c_content.sections || defaultSections;
  
  return (
  <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: 16 }}>
      <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
        placeholder="Video title..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />
      <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
      <TagsSection tags={[]} />
    </div>
  </div>
  );
};

// Video Overlay Box - draggable text box that sits over the video
const VideoOverlayBox = ({ box, containerRef, onUpdate, onRemove, isSelected, onSelect }) => {
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef(null);
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    e.preventDefault(); e.stopPropagation(); onSelect();
    if (!containerRef.current) return;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, boxX: box.x, boxY: box.y };
    setDragging(true);
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      if (!containerRef.current || !dragStart.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.current.mouseX) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.mouseY) / rect.height) * 100;
      onUpdate({ ...box, x: Math.max(0, Math.min(88, dragStart.current.boxX + dx)), y: Math.max(0, Math.min(88, dragStart.current.boxY + dy)) });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);
  const styleMap = {
    lowerThird: { background: 'rgba(10,26,47,0.88)', color: '#fff', borderLeft: '4px solid #C1A364' },
    callout: { background: 'rgba(193,163,100,0.92)', color: '#fff' },
    ticker: { background: 'rgba(0,0,0,0.82)', color: '#C1A364', fontFamily: 'monospace', letterSpacing: 1 },
    title: { background: 'rgba(10,26,47,0.95)', color: '#fff', borderBottom: '2px solid #C1A364' },
  };
  const s = styleMap[box.style] || styleMap.lowerThird;
  return (
    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: `${box.x}%`, top: `${box.y}%`, minWidth: 160, maxWidth: 300, padding: '7px 12px', borderRadius: 4, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', outline: isSelected ? '2px solid #C1A364' : '2px solid transparent', boxShadow: isSelected ? '0 0 0 3px rgba(193,163,100,0.35)' : '0 2px 10px rgba(0,0,0,0.45)', zIndex: isSelected ? 20 : 10, ...s }}>
      {box.label && <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.65, marginBottom: 2 }}>{box.label}</div>}
      <div style={{ fontSize: box.fontSize || 13, fontWeight: box.style === 'title' ? 300 : 600, lineHeight: 1.3 }}>{box.text || '—'}</div>
      {box.subtitle && <div style={{ fontSize: 10, opacity: 0.78, marginTop: 2 }}>{box.subtitle}</div>}
      {isSelected && <button onMouseDown={(e) => { e.stopPropagation(); onRemove(); }} style={{ position: 'absolute', top: -9, right: -9, width: 18, height: 18, borderRadius: '50%', background: '#B84242', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', lineHeight: '18px', padding: 0, zIndex: 30 }}>✕</button>}
    </div>
  );
};

// Video Publish Template - for publishing recorded videos with draggable overlay boxes
const VideoPublishTemplate = ({ content, onContentChange }) => {
  const c_content = content || {};
  const [isFileDragging, setIsFileDragging] = React.useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = React.useState(null);
  const [localVideoSrc, setLocalVideoSrc] = React.useState(null);
  const videoContainerRef = React.useRef(null);
  const durationSetRef = React.useRef(false);
  const videoFileRef = React.useRef(null);

  const defaultSections = [
    { id: 'summary', title: 'Video Summary', content: '', placeholder: 'Brief summary of what the video covers...' },
    { id: 'keyPoints', title: 'Key Takeaways', content: '', placeholder: '• First key takeaway — bold, specific, advisor-ready\n• Second key takeaway — what clients should think or do differently\n• Third key takeaway — the bottom line' },
  ];
  const sections = c_content.sections || defaultSections;
  const overlays = c_content.overlays || [];
  
  // Use local blob URL when available (more reliable than stored URL across re-renders)
  const videoSrc = localVideoSrc || c_content.videoUrl || null;

  // If content has a videoUrl but we lost the local src (e.g. re-render), try to use it
  React.useEffect(() => {
    if (c_content.videoUrl && !localVideoSrc) {
      setLocalVideoSrc(c_content.videoUrl);
    }
  }, [c_content.videoUrl]);

  const processFile = (file) => {
    if (!file.type.startsWith('video/')) { alert('Please select a video file (MP4, MOV, WebM, etc.)'); return; }
    videoFileRef.current = file;
    durationSetRef.current = false;
    const url = URL.createObjectURL(file);
    setLocalVideoSrc(url);
    onContentChange && onContentChange({ ...c_content, videoUrl: url, videoFileName: file.name, videoSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB', videoDuration: null });
  };

  const removeVideo = () => {
    if (localVideoSrc) { try { URL.revokeObjectURL(localVideoSrc); } catch (_) {} }
    videoFileRef.current = null;
    durationSetRef.current = false;
    setLocalVideoSrc(null);
    onContentChange && onContentChange({ ...c_content, videoUrl: null, videoFileName: null, videoSize: null, videoDuration: null });
  };

  const handleDurationLoaded = (e) => {
    if (durationSetRef.current) return;
    const dur = Math.round(e.target.duration);
    if (!dur || !isFinite(dur)) return;
    durationSetRef.current = true;
    const mins = Math.floor(dur / 60);
    const secs = dur % 60;
    onContentChange && onContentChange({ ...c_content, videoDuration: `${mins}:${secs.toString().padStart(2, '0')}` });
  };

  const addOverlay = (style) => {
    const presets = {
      lowerThird: { text: c_content.presenter || 'Presenter Name', subtitle: 'J.P. Morgan Private Bank', label: 'Lower Third', x: 3, y: 70 },
      callout: { text: 'Key Insight', subtitle: '', label: 'Callout', x: 55, y: 8 },
      ticker: { text: 'MARKET UPDATE · ' + (c_content.title || 'Latest Analysis'), subtitle: '', label: 'Ticker', x: 0, y: 87 },
      title: { text: c_content.title || 'Video Title', subtitle: '', label: 'Title Card', x: 5, y: 5 },
    };
    const preset = presets[style] || presets.lowerThird;
    const newId = Date.now();
    onContentChange && onContentChange({ ...c_content, overlays: [...overlays, { id: newId, style, ...preset }] });
    setSelectedOverlayId(newId);
  };

  const updateOverlay = (id, patch) => onContentChange && onContentChange({ ...c_content, overlays: overlays.map(o => o.id === id ? { ...o, ...patch } : o) });
  const removeOverlay = (id) => { onContentChange && onContentChange({ ...c_content, overlays: overlays.filter(o => o.id !== id) }); setSelectedOverlayId(null); };
  const selectedBox = overlays.find(o => o.id === selectedOverlayId) || null;

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="Video title..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '1px solid ' + c.pearl, paddingBottom: 10, marginBottom: 14, outline: 'none' }} />

        {/* VIDEO UPLOAD */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Video File</SectionLabel>
          {!videoSrc ? (
            <div onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }} onDragLeave={() => setIsFileDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsFileDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('video-upload-input').click()}
              style={{ padding: 48, borderRadius: 10, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: `2px dashed ${isFileDragging ? c.teal : c.pearl}`, background: isFileDragging ? `${c.teal}12` : c.ivory }}>
              <input id="video-upload-input" type="file" accept="video/*" onChange={(e) => { if (e.target.files[0]) processFile(e.target.files[0]); }} style={{ display: 'none' }} />
              <div style={{ fontSize: 44, marginBottom: 10 }}>🎬</div>
              <div style={{ fontSize: 14, color: c.navy, fontWeight: 500, marginBottom: 6 }}>{isFileDragging ? 'Drop video here' : 'Drag & drop or click to browse'}</div>
              <div style={{ fontSize: 11, color: c.slate }}>MP4, MOV, WebM — up to 500 MB</div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Video & Overlay Canvas</span>
                <span style={{ fontSize: 9, color: c.slate, fontStyle: 'italic' }}>Click overlay to select · drag to reposition</span>
              </div>
              {/* Canvas */}
              <div ref={videoContainerRef} style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', lineHeight: 0, marginBottom: 10 }}
                onClick={(e) => { if (e.target === videoContainerRef.current || e.target.tagName === 'VIDEO') setSelectedOverlayId(null); }}>
                <video key={videoSrc} src={videoSrc} controls style={{ width: '100%', display: 'block', maxHeight: 320 }} onLoadedMetadata={handleDurationLoaded} />
                {overlays.map(box => (
                  <VideoOverlayBox key={box.id} box={box} containerRef={videoContainerRef}
                    onUpdate={(u) => updateOverlay(box.id, u)} onRemove={() => removeOverlay(box.id)}
                    isSelected={selectedOverlayId === box.id} onSelect={() => setSelectedOverlayId(box.id)} />
                ))}
              </div>
              {/* Overlay toolbar */}
              <div style={{ padding: 12, background: c.ivory, borderRadius: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 8 }}>Add Overlay</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{id:'lowerThird',label:'🎙 Lower Third'},{id:'title',label:'🔤 Title Card'},{id:'callout',label:'💡 Callout'},{id:'ticker',label:'📰 Ticker'}].map(opt => (
                    <button key={opt.id} type="button" onClick={() => addOverlay(opt.id)}
                      style={{ padding: '5px 11px', borderRadius: 5, border: '1px solid ' + c.pearl, background: '#fff', color: c.navy, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              {/* Selected overlay editor */}
              {selectedBox && (
                <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid ' + c.pearl, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Editing: {selectedBox.label || selectedBox.style}</span>
                    <button type="button" onClick={() => removeOverlay(selectedBox.id)}
                      style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: c.neg, color: '#fff', fontSize: 10, cursor: 'pointer' }}>Remove</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: c.slate, marginBottom: 3, textTransform: 'uppercase' }}>Main Text</div>
                      <input value={selectedBox.text || ''} onChange={(e) => updateOverlay(selectedBox.id, { text: e.target.value })}
                        style={{ width: '100%', padding: '7px 9px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fafafa' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: c.slate, marginBottom: 3, textTransform: 'uppercase' }}>Sub-line (optional)</div>
                      <input value={selectedBox.subtitle || ''} onChange={(e) => updateOverlay(selectedBox.id, { subtitle: e.target.value })}
                        placeholder="e.g. title / role" style={{ width: '100%', padding: '7px 9px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fafafa' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase' }}>Style:</span>
                    {['lowerThird','title','callout','ticker'].map(s => (
                      <button key={s} type="button" onClick={() => updateOverlay(selectedBox.id, { style: s })}
                        style={{ padding: '3px 9px', borderRadius: 4, border: 'none', fontSize: 10, cursor: 'pointer', background: selectedBox.style === s ? c.navy : c.pearl, color: selectedBox.style === s ? '#fff' : c.slate }}>
                        {s === 'lowerThird' ? 'Lower Third' : s === 'title' ? 'Title' : s === 'callout' ? 'Callout' : 'Ticker'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Info bar */}
              <div style={{ padding: '9px 14px', background: c.slate, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>📁 {c_content.videoFileName}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{c_content.videoSize}</span>
                  {c_content.videoDuration && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>⏱ {c_content.videoDuration}</span>}
                </div>
                <button onClick={removeVideo} style={{ padding: '4px 11px', borderRadius: 4, border: 'none', background: c.neg, color: '#fff', fontSize: 10, cursor: 'pointer' }}>Remove Video</button>
              </div>
            </div>
          )}
        </div>

        {/* PRESENTER */}
        <div style={{ marginBottom: 14, padding: 12, background: c.ivory, borderRadius: 8 }}>
          <SectionLabel>Presenter</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={c_content.presenter || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, presenter: e.target.value })}
              placeholder="Full name..." style={{ padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fff' }} />
            <input value={c_content.presenterTitle || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, presenterTitle: e.target.value })}
              placeholder="Title / role..." style={{ padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fff' }} />
          </div>
        </div>

        {/* CATEGORY & SERIES */}
        <div style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Category</label>
            <select value={c_content.category || 'Investment Strategy'} onChange={(e) => onContentChange && onContentChange({ ...c_content, category: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none' }}>
              <option>Investment Strategy</option><option>Market Update</option><option>Thought Leadership</option><option>Product Spotlight</option><option>Desk Commentary</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Series / Programme</label>
            <input value={c_content.series || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, series: e.target.value })}
              placeholder="e.g. Long & Short, The Pulse..." style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none' }} />
          </div>
        </div>

        {/* THUMBNAIL */}
        {videoSrc && (
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Thumbnail Frame</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[0,1,2,3].map(i => (
                <div key={i} onClick={() => onContentChange && onContentChange({ ...c_content, thumbnailIndex: i })}
                  style={{ aspectRatio: '16/9', borderRadius: 6, background: c.slate, cursor: 'pointer', border: c_content.thumbnailIndex === i ? `2px solid ${c.teal}` : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>
                  {i === 0 ? 'Auto' : `Frame ${i}`}
                </div>
              ))}
            </div>
          </div>
        )}

        <MovableSectionsEditor sections={sections} onChange={(s) => onContentChange && onContentChange({ ...c_content, sections: s })} />
        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};

// ============================================
// EVENT RESPONSE TEMPLATE
// Mirrors Top Market Takeaways but becomes a rolling feed on one subject/event
// ============================================
const EventResponseTemplate = ({ content, onContentChange }) => {
  const c_content = content || {};
  const isExternal = c_content.isExternal !== false;
  const updates = c_content.updates || [{ id: 'u1', timestamp: '', title: 'Initial Response', content: '', placeholder: 'First take — what just happened and what it means...' }];
  const defaultSections = [{ id: 'hook', title: 'Opening Context', content: '', placeholder: 'Set the scene — what event is this responding to, and why does it matter?' }];
  const sections = c_content.sections || defaultSections;

  const addUpdate = () => {
    const u = { id: 'u' + Date.now(), timestamp: '', title: 'Update ' + (updates.length + 1), content: '', placeholder: 'What has changed since the last update...' };
    onContentChange && onContentChange({ ...c_content, updates: [...updates, u] });
  };
  const patchUpdate = (id, patch) => onContentChange && onContentChange({ ...c_content, updates: updates.map(u => u.id === id ? { ...u, ...patch } : u) });
  const removeUpdate = (id) => { if (updates.length <= 1) return; onContentChange && onContentChange({ ...c_content, updates: updates.filter(u => u.id !== id) }); };
  const moveUpdate = (idx, dir) => { const arr = [...updates]; const t = idx + dir; if (t < 0 || t >= arr.length) return; [arr[idx], arr[t]] = [arr[t], arr[idx]]; onContentChange && onContentChange({ ...c_content, updates: arr }); };

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        {/* Distribution toggle */}
        <div style={{ marginBottom: 20, padding: 16, background: isExternal ? 'linear-gradient(135deg, #C1A364 0%, #D4B87A 100%)' : 'linear-gradient(135deg, #103A45 0%, #1A5A6A 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{isExternal ? '🌐 External Distribution' : '🔒 Internal Only'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{isExternal ? 'This feed distributes to clients via Nexus as each update is published' : 'Internal circulation only — updates push to the desk feed'}</div>
          </div>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <button onClick={() => onContentChange && onContentChange({ ...c_content, isExternal: false })} style={{ padding: '10px 20px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !isExternal ? '#fff' : 'rgba(255,255,255,0.2)', color: !isExternal ? c.teal : 'rgba(255,255,255,0.9)' }}>🔒 Internal</button>
            <button onClick={() => onContentChange && onContentChange({ ...c_content, isExternal: true })} style={{ padding: '10px 20px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: isExternal ? '#fff' : 'rgba(255,255,255,0.2)', color: isExternal ? c.gold : 'rgba(255,255,255,0.9)' }}>🌐 External</button>
          </div>
        </div>

        {/* Event title */}
        <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="Event title — e.g. 'Fed Rate Decision: March 2026'..."
          style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '1px solid ' + c.pearl, paddingBottom: 10, marginBottom: 14, outline: 'none' }} />

        {/* Event metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Event Type</label>
            <select value={c_content.eventType || 'Macro'} onChange={(e) => onContentChange && onContentChange({ ...c_content, eventType: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none' }}>
              <option>Macro</option><option>Central Bank</option><option>Geopolitical</option><option>Earnings</option><option>Regulatory</option><option>Market Dislocation</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Market Impact</label>
            <select value={c_content.impact || 'Moderate'} onChange={(e) => onContentChange && onContentChange({ ...c_content, impact: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none' }}>
              <option>Elevated</option><option>Moderate</option><option>Watch</option><option>Low</option>
            </select>
          </div>

        </div>



        {/* Opening context */}
        <MovableSectionsEditor sections={sections} onChange={(s) => onContentChange && onContentChange({ ...c_content, sections: s })} addButtonText="+ Add Context Section" />

        {/* ROLLING UPDATES FEED */}
        <div style={{ marginTop: 20, borderTop: '2px solid ' + c.pearl, paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, fontWeight: 600 }}>Rolling Updates Feed</div>
              <div style={{ fontSize: 10, color: c.slate, marginTop: 2 }}>Each update publishes as a new entry on this event's live feed</div>
            </div>
            <button type="button" onClick={addUpdate}
              style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: c.navy, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Add Update</button>
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: c.pearl }} />
            {updates.map((update, idx) => (
              <div key={update.id} style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ position: 'absolute', left: -24, top: 14, width: 10, height: 10, borderRadius: '50%', background: idx === 0 ? c.gold : c.teal, border: '2px solid #fff', boxShadow: '0 0 0 2px ' + (idx === 0 ? c.gold : c.teal) }} />
                <div style={{ padding: 12, background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                      <input value={update.title} onChange={(e) => patchUpdate(update.id, { title: e.target.value })} placeholder="Update title..."
                        style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, border: 'none', outline: 'none', background: 'transparent', flex: 1 }} />
                      <input value={update.timestamp || ''} onChange={(e) => patchUpdate(update.id, { timestamp: e.target.value })} placeholder="Time / date stamp..."
                        style={{ fontSize: 10, color: c.slate, border: '1px solid ' + c.pearl, borderRadius: 4, padding: '3px 7px', outline: 'none', background: '#fff', width: 140 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                      <button type="button" onClick={() => moveUpdate(idx, -1)} disabled={idx === 0}
                        style={{ padding: '3px 7px', borderRadius: 3, background: idx === 0 ? c.pearl : c.slate, color: '#fff', fontSize: 9, border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>↑</button>
                      <button type="button" onClick={() => moveUpdate(idx, 1)} disabled={idx >= updates.length - 1}
                        style={{ padding: '3px 7px', borderRadius: 3, background: idx >= updates.length - 1 ? c.pearl : c.slate, color: '#fff', fontSize: 9, border: 'none', cursor: idx >= updates.length - 1 ? 'default' : 'pointer', opacity: idx >= updates.length - 1 ? 0.5 : 1 }}>↓</button>
                      <button type="button" onClick={() => removeUpdate(update.id)} disabled={updates.length <= 1}
                        style={{ padding: '3px 8px', borderRadius: 3, background: updates.length <= 1 ? c.pearl : c.neg, color: '#fff', fontSize: 9, border: 'none', cursor: updates.length <= 1 ? 'default' : 'pointer', opacity: updates.length <= 1 ? 0.4 : 1 }}>✕</button>
                    </div>
                  </div>
                  <textarea value={update.content} onChange={(e) => patchUpdate(update.id, { content: e.target.value })}
                    placeholder={update.placeholder || 'Update content...'}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, lineHeight: 1.6, resize: 'none', minHeight: 72, outline: 'none', background: '#fff' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};

// ============================================
// SOLUTIONS TEMPLATES

// ============================================
// SOLUTIONS TEMPLATES
// ============================================

const HeadlineTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 10, color: c.slate, marginBottom: 10 }}>Single-line breaking news. Keep under 100 characters.</p>
        <input 
          value={c_content.title || ''} 
          onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="Breaking headline..."
          style={{ width: '100%', fontSize: 17, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '1px solid ' + c.pearl, paddingBottom: 12, marginBottom: 14, outline: 'none' }} 
        />
        
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Category</SectionLabel>
          <select 
            value={c_content.category || 'Macro'}
            onChange={(e) => onContentChange && onContentChange({ ...c_content, category: e.target.value })}
            style={{ width: '100%', padding: 8, borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11 }}
          >
            <option>Macro</option><option>Equities</option><option>Fixed Income</option><option>FX</option><option>Commodities</option>
          </select>
        </div>
        
        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
      </div>
    </div>
  );
};


// ── Daily Market Update Template ─────────────────────────────────────────────
const REGIONS = [
  { id: 'APAC',  label: 'APAC',  title: 'Staying up to Speed' },
  { id: 'EMEA',  label: 'EMEA',  title: 'Staying up to Speed' },
  { id: 'LATAM', label: 'LATAM', title: 'Top Market Takeaways' },
  { id: 'US',    label: 'US',    title: 'Top Market Takeaways' },
];

const REGION_INDICES = {
  APAC:  ['S&P 500','Dow Jones','Nasdaq','MSCI World','Russell 2000','Nikkei 225','Hang Seng','ASX 200','KOSPI'],
  EMEA:  ['S&P 500','Dow Jones','Nasdaq','MSCI World','Russell 2000','DAX','Euro Stoxx 50','FTSE 100','CAC 40'],
  LATAM: ['S&P 500','Dow Jones','Nasdaq','MSCI World','Russell 2000','Bovespa','MSCI EM Latin America','MXN/USD'],
  US:    ['S&P 500','Dow Jones','Nasdaq','MSCI World','Russell 2000','10Y Treasury','2Y Treasury','VIX','Gold','Oil (WTI)'],
};

const QUOTES_OF_WEEK = [
  { text: "The four most dangerous words in investing are: 'this time it's different.'", author: "Sir John Templeton" },
  { text: "In the short run, the market is a voting machine, but in the long run, it is a weighing machine.", author: "Benjamin Graham" },
  { text: "The market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn't, pays it.", author: "Often attributed to Albert Einstein" },
  { text: "Prediction is very difficult, especially if it's about the future.", author: "Niels Bohr" },
  { text: "An economist is an expert who will know tomorrow why the things he predicted yesterday didn't happen today.", author: "Laurence J. Peter" },
  { text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
  { text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.", author: "George Soros" },
  { text: "The time to buy is when there's blood in the streets, even if the blood is your own.", author: "Baron Rothschild" },
  { text: "Financial chaos is not a bug — it is the natural state of markets left to their own devices.", author: "Charles Kindleberger" },
  { text: "Blessed are those who expect nothing, for they shall not be disappointed.", author: "Mervyn King, on central bank forecasting" },
  { text: "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.", author: "F.A. Hayek" },
  { text: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
  { text: "There are two kinds of forecasters: those who don't know, and those who don't know they don't know.", author: "John Kenneth Galbraith" },
  { text: "Risk comes from not knowing what you are doing.", author: "Warren Buffett" },
  { text: "October. This is one of the peculiarly dangerous months to speculate in stocks. The others are July, January, September, April, November, May, March, June, December, August, and February.", author: "Mark Twain" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The first rule of compounding: never interrupt it unnecessarily.", author: "Charlie Munger" },
  { text: "Behind every stock is a company. Find out what it's doing.", author: "Peter Lynch" },
  { text: "Economics is extremely useful as a form of employment for economists.", author: "John Kenneth Galbraith" },
];

const getDailyQuote = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return QUOTES_OF_WEEK[dayOfYear % QUOTES_OF_WEEK.length];
};

const DailyMarketUpdateTemplate = ({ content, onContentChange, onFetchMarketData }) => {
  const c_content = content || {};
  const region = c_content.region || 'APAC';
  const regionDef = REGIONS.find(r => r.id === region) || REGIONS[0];
  const indices = REGION_INDICES[region] || REGION_INDICES.APAC;

  const metrics = c_content.metrics || indices.map(name => ({ name, value: '', change: '', pct: '', direction: 'flat' }));
  const updateMetric = (i, field, val) => {
    const updated = metrics.map((m, idx) => idx === i ? { ...m, [field]: val } : m);
    onContentChange && onContentChange({ ...c_content, metrics: updated });
  };

  const clientFlow = c_content.clientFlow || { topBuys: [{ticker:'',count:''},{ticker:'',count:''},{ticker:'',count:''}], topSells: [{ticker:'',count:''},{ticker:'',count:''},{ticker:'',count:''}], buySkew: 52 };
  const updateClientFlow = (updates) => onContentChange && onContentChange({ ...c_content, clientFlow: { ...clientFlow, ...updates } });
  const skew = clientFlow.buySkew || 52;

  const defaultSections = [
    { id: 'psatop',       title: 'PSA',                               content: '', placeholder: 'Optional top PSA — delete if not needed.' },
    { id: 'commentary',   title: '',                                   content: '', placeholder: 'Brief summary of what the markets did yesterday — 2–3 sentences.' },
    { id: 'interesting1', title: 'Story 1',                            content: '', placeholder: 'What happened — the facts, specific numbers. 50-75 words max.' },
    { id: 'view1',        title: 'Our View',                           content: '', placeholder: 'JPM view — 1–2 sentences.' },
    { id: 'interesting2', title: 'Story 2',                            content: '', placeholder: 'What happened. 50-75 words max.' },
    { id: 'view2',        title: 'Our View',                           content: '', placeholder: 'JPM view — 1–2 sentences.' },
    { id: 'interesting3', title: 'Story 3',                            content: '', placeholder: 'What happened. 50-75 words max.' },
    { id: 'view3',        title: 'Our View',                           content: '', placeholder: 'JPM view — 1–2 sentences.' },
    { id: 'oped',         title: 'Op-Ed',                             content: '', placeholder: '500 words max. One big idea — punchy, opinionated, a conversation starter.' },
    { id: 'psa',          title: 'PSAs',                              content: '', placeholder: 'Housekeeping or announcements for advisors...' },
  ];
  const sections = c_content.sections || defaultSections;

  const isEditing = c_content._editingQuote || false;
  const quote = getDailyQuote();
  const customQuote = c_content.customQuote;
  const displayQuote = customQuote || quote;

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>

        {/* Internal badge */}
        <div style={{ marginBottom: 14, padding: '8px 12px', background: 'linear-gradient(135deg, #103A45 0%, #1A5A6A 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>🔒 Internal — Daily Market Update</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => {
                const newMetrics = REGION_INDICES[r.id].map(name => {
                  const existing = (c_content.metrics || []).find(m => m.name === name);
                  return existing || { name, value: '', change: '', pct: '', direction: 'flat' };
                });
                onContentChange && onContentChange({ ...c_content, region: r.id, metrics: newMetrics });
              }}
                style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: region === r.id ? '#fff' : 'rgba(255,255,255,0.15)', color: region === r.id ? c.teal : 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <input value={c_content.title || ''} onChange={e => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder={regionDef.title + ' — ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '2px solid ' + c.pearl, paddingBottom: 10, marginBottom: 16, outline: 'none' }} />

        {/* Quote — subtle, inline style */}
        <div style={{ marginBottom: 16, padding: '10px 14px', borderLeft: '3px solid ' + c.gold, background: c.ivory, borderRadius: '0 6px 6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <div>
                <textarea value={customQuote?.text || quote.text} rows={2}
                  onChange={e => onContentChange && onContentChange({ ...c_content, customQuote: { text: e.target.value, author: customQuote?.author || quote.author } })}
                  style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid ' + c.pearl, fontSize: 11, fontStyle: 'italic', background: '#fff', resize: 'vertical', boxSizing: 'border-box', marginBottom: 4, outline: 'none', color: c.navy }} />
                <input value={customQuote?.author || quote.author}
                  onChange={e => onContentChange && onContentChange({ ...c_content, customQuote: { text: customQuote?.text || quote.text, author: e.target.value } })}
                  placeholder="Author"
                  style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid ' + c.pearl, fontSize: 10, background: '#fff', boxSizing: 'border-box', outline: 'none', color: c.slate }} />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, fontStyle: 'italic', color: c.navy, lineHeight: 1.5, marginBottom: 3 }}>"{displayQuote.text}"</div>
                <div style={{ fontSize: 10, color: c.gold, fontWeight: 600 }}>— {displayQuote.author}</div>
              </>
            )}
          </div>
          <button onClick={() => onContentChange && onContentChange({ ...c_content, _editingQuote: !isEditing })}
            style={{ fontSize: 9, color: c.slate, background: 'none', border: '1px solid ' + c.pearl, borderRadius: 4, padding: '3px 7px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>

        {/* What The Markets Did — metric tiles */}
        <div style={{ marginBottom: 16, padding: '12px 14px', background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.navy, textTransform: 'uppercase', letterSpacing: '0.07em' }}>📊 What The Markets Did — {region}</div>
            <button onClick={() => onFetchMarketData && onFetchMarketData(region, indices, onContentChange, c_content)}
              style={{ fontSize: 9, padding: '4px 10px', borderRadius: 5, border: '1px solid ' + c.pearl, background: '#fff', color: c.teal, fontWeight: 600, cursor: 'pointer' }}>
              ↻ Fetch Yesterday's Data
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {metrics.map((m, i) => {
              const col2 = m.direction === 'up' ? '#059669' : m.direction === 'down' ? '#DC2626' : c.slate;
              const bg = m.direction === 'up' ? '#F0FDF4' : m.direction === 'down' ? '#FFF1F1' : '#fff';
              const border2 = m.direction === 'up' ? '#BBF7D0' : m.direction === 'down' ? '#FECACA' : c.pearl;
              return (
                <div key={i} style={{ background: bg, borderRadius: 7, padding: '8px 10px', border: '1px solid ' + border2 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{m.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c.navy, marginBottom: 1 }}>{m.value || '—'}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: col2 }}>
                    {m.direction === 'up' ? '▲' : m.direction === 'down' ? '▼' : '—'} {m.change}{m.pct ? ` (${m.pct}%)` : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, marginTop: 6 }}>
                    <input value={m.value} onChange={e => updateMetric(i, 'value', e.target.value)} placeholder="Price"
                      style={{ padding: '2px 4px', borderRadius: 3, border: '1px solid ' + c.pearl, fontSize: 9, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <input value={m.change} onChange={e => updateMetric(i, 'change', e.target.value)} placeholder="+/-"
                      style={{ padding: '2px 4px', borderRadius: 3, border: '1px solid ' + c.pearl, fontSize: 9, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <input value={m.pct} onChange={e => updateMetric(i, 'pct', e.target.value)} placeholder="%"
                      style={{ padding: '2px 4px', borderRadius: 3, border: '1px solid ' + c.pearl, fontSize: 9, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                    {['up', 'down', 'flat'].map(d => (
                      <button key={d} onClick={() => updateMetric(i, 'direction', d)}
                        style={{ flex: 1, padding: '2px', borderRadius: 3, border: '1px solid ' + (m.direction === d ? col2 : c.pearl), background: m.direction === d ? bg : '#fff', fontSize: 10, cursor: 'pointer' }}>
                        {d === 'up' ? '▲' : d === 'down' ? '▼' : '—'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* What Our Clients Did */}
        <div style={{ marginBottom: 16, padding: '12px 14px', background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: c.navy, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>👤 What Our Clients Did — Yesterday</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ background: '#F0FDF4', borderRadius: 7, padding: '10px 12px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>▲ Top 3 Buys</div>
              {clientFlow.topBuys.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.slate, width: 14 }}>{i + 1}.</span>
                  <input value={b.ticker} onChange={e => { const t = [...clientFlow.topBuys]; t[i] = { ...t[i], ticker: e.target.value }; updateClientFlow({ topBuys: t }); }}
                    placeholder="Ticker" style={{ flex: 2, padding: '4px 6px', borderRadius: 4, border: '1px solid #BBF7D0', fontSize: 11, fontWeight: 700, outline: 'none', background: '#fff', color: c.navy }} />
                  <input value={b.count} onChange={e => { const t = [...clientFlow.topBuys]; t[i] = { ...t[i], count: e.target.value }; updateClientFlow({ topBuys: t }); }}
                    placeholder="Count" style={{ flex: 1, padding: '4px 6px', borderRadius: 4, border: '1px solid #BBF7D0', fontSize: 10, outline: 'none', background: '#fff', color: c.slate }} />
                </div>
              ))}
            </div>
            <div style={{ background: '#FFF1F1', borderRadius: 7, padding: '10px 12px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>▼ Top 3 Sells</div>
              {clientFlow.topSells.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.slate, width: 14 }}>{i + 1}.</span>
                  <input value={s.ticker} onChange={e => { const t = [...clientFlow.topSells]; t[i] = { ...t[i], ticker: e.target.value }; updateClientFlow({ topSells: t }); }}
                    placeholder="Ticker" style={{ flex: 2, padding: '4px 6px', borderRadius: 4, border: '1px solid #FECACA', fontSize: 11, fontWeight: 700, outline: 'none', background: '#fff', color: c.navy }} />
                  <input value={s.count} onChange={e => { const t = [...clientFlow.topSells]; t[i] = { ...t[i], count: e.target.value }; updateClientFlow({ topSells: t }); }}
                    placeholder="Count" style={{ flex: 1, padding: '4px 6px', borderRadius: 4, border: '1px solid #FECACA', fontSize: 10, outline: 'none', background: '#fff', color: c.slate }} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
              <span style={{ color: '#059669', fontWeight: 600 }}>Buy {skew}%</span>
              <span style={{ fontWeight: 700, color: skew > 55 ? '#059669' : skew < 45 ? '#DC2626' : c.slate }}>{skew > 55 ? 'Buy skew' : skew < 45 ? 'Sell skew' : 'Balanced'}</span>
              <span style={{ color: '#DC2626', fontWeight: 600 }}>Sell {100 - skew}%</span>
            </div>
            <div style={{ height: 8, background: '#FEE2E2', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${skew}%`, background: '#16A34A', borderRadius: '4px 0 0 4px', transition: 'width 0.3s' }} />
            </div>
            <input type="range" min={0} max={100} value={skew} onChange={e => updateClientFlow({ buySkew: +e.target.value })}
              style={{ width: '100%', accentColor: '#16A34A' }} />
          </div>
        </div>

        {/* Sections */}
        <MovableSectionsEditor sections={sections} onChange={s => onContentChange && onContentChange({ ...c_content, sections: s })} addButtonText="+ Add Section" />

      </div>
    </div>
  );
};



// ── CLIENT EXPOSURE PANEL (Orion / Portfolio Search integration) ──────────────
// DEVELOPER NOTE: Replace MOCK_CLIENT_DATA with live Orion/Portfolio Search API call
// Endpoint: POST /api/portfolio-search/exposure?ticker={ticker}
// Returns: [{clientId, clientName, notionalUSD, portfolioPct}]
const MOCK_CLIENTS = [
  { id: 'C001', name: 'Harrington Family Office', rm: 'Sarah Chen', tier: 'Ultra', location: 'New York' },
  { id: 'C002', name: 'Al-Rashid Investment Trust', rm: 'James Whitfield', tier: 'Ultra', location: 'Dubai' },
  { id: 'C003', name: 'Marchetti Capital SRL', rm: 'Sophie Laurent', tier: 'HNW', location: 'Milan' },
  { id: 'C004', name: 'Bergstrom Family Trust', rm: 'Lars Eriksen', tier: 'HNW', location: 'Stockholm' },
  { id: 'C005', name: 'Pemberton & Associates', rm: 'David Okafor', tier: 'Ultra', location: 'London' },
  { id: 'C006', name: 'Nakamura Holdings', rm: 'Yuki Tanaka', tier: 'HNW', location: 'Tokyo' },
  { id: 'C007', name: 'Oyelaran Family Office', rm: 'Amara Osei', tier: 'Ultra', location: 'Lagos' },
  { id: 'C008', name: 'Rothenberg Capital', rm: 'Michael Stern', location: 'Zurich', tier: 'HNW' },
  { id: 'C009', name: 'Vasquez Investment Corp', rm: 'Elena Santos', tier: 'HNW', location: 'Bogotá' },
  { id: 'C010', name: 'Cha Family Foundation', rm: 'Kevin Park', tier: 'Ultra', location: 'Seoul' },
];

const MOCK_EXPOSURE = {
  'NVDA': [
    { ...MOCK_CLIENTS[0], notionalUSD: 4200000, portfolioPct: 3.8 },
    { ...MOCK_CLIENTS[4], notionalUSD: 8750000, portfolioPct: 5.2 },
    { ...MOCK_CLIENTS[6], notionalUSD: 2100000, portfolioPct: 2.1 },
    { ...MOCK_CLIENTS[9], notionalUSD: 6300000, portfolioPct: 4.7 },
    { ...MOCK_CLIENTS[2], notionalUSD: 1850000, portfolioPct: 1.9 },
  ],
  'AAPL': [
    { ...MOCK_CLIENTS[1], notionalUSD: 12400000, portfolioPct: 6.1 },
    { ...MOCK_CLIENTS[3], notionalUSD: 3200000, portfolioPct: 3.4 },
    { ...MOCK_CLIENTS[5], notionalUSD: 5600000, portfolioPct: 4.2 },
    { ...MOCK_CLIENTS[7], notionalUSD: 2900000, portfolioPct: 2.8 },
  ],
  'TSLA': [
    { ...MOCK_CLIENTS[2], notionalUSD: 3800000, portfolioPct: 3.9 },
    { ...MOCK_CLIENTS[8], notionalUSD: 1700000, portfolioPct: 2.1 },
    { ...MOCK_CLIENTS[0], notionalUSD: 2200000, portfolioPct: 2.0 },
  ],
  'MSFT': [
    { ...MOCK_CLIENTS[4], notionalUSD: 9100000, portfolioPct: 5.4 },
    { ...MOCK_CLIENTS[6], notionalUSD: 4400000, portfolioPct: 4.4 },
    { ...MOCK_CLIENTS[9], notionalUSD: 7800000, portfolioPct: 5.8 },
    { ...MOCK_CLIENTS[1], notionalUSD: 15200000, portfolioPct: 7.5 },
    { ...MOCK_CLIENTS[3], notionalUSD: 2800000, portfolioPct: 2.9 },
    { ...MOCK_CLIENTS[5], notionalUSD: 3900000, portfolioPct: 2.9 },
  ],
};

const getExposure = (ticker) => {
  // DEVELOPER NOTE: Replace with Orion API call
  // return fetch(`/api/orion/exposure?ticker=${ticker}`).then(r => r.json())
  const upper = (ticker || '').toUpperCase().trim();
  if (MOCK_EXPOSURE[upper]) return MOCK_EXPOSURE[upper];
  // Generate synthetic data for unknown tickers
  const seed = upper.charCodeAt(0) || 65;
  return MOCK_CLIENTS.slice(0, 2 + (seed % 4)).map((c, i) => ({
    ...c,
    notionalUSD: Math.round((seed * 47000 + i * 890000) / 100) * 100,
    portfolioPct: Math.round((1.5 + (seed % 5) + i * 0.8) * 10) / 10
  }));
};

const ClientExposurePanel = ({ ticker, onClose }) => {
  const [exposure, setExposure] = React.useState([]);
  React.useEffect(() => {
    if (ticker) setExposure(getExposure(ticker));
  }, [ticker]);

  if (!ticker) return null;
  const totalNotional = exposure.reduce((s, c) => s + c.notionalUSD, 0);
  const fmt = n => '$' + (n >= 1e6 ? (n/1e6).toFixed(1) + 'M' : (n/1e3).toFixed(0) + 'K');

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 320, background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 8000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + c.pearl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.navy }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
            Portfolio Search · Orion
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{ticker.toUpperCase()} Exposure</div>
          <div style={{ fontSize: 10, color: c.gold }}>{exposure.length} clients · {fmt(totalNotional)} total</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* DEVELOPER NOTE: This data is mock — connect to Orion/Portfolio Search API */}
        <div style={{ fontSize: 9, color: c.slate, background: '#FFF9E6', border: '1px solid #FCD34D', borderRadius: 5, padding: '6px 10px', marginBottom: 12 }}>
          ⚠ Mock data — connect Orion API for live positions
        </div>
        {/* Notional bar */}
        <div style={{ marginBottom: 14 }}>
          {exposure.sort((a,b) => b.notionalUSD - a.notionalUSD).map((cl, i) => (
            <div key={cl.id} style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid ' + c.pearl, background: i === 0 ? '#F0F9FF' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>{cl.name}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.teal }}>{fmt(cl.notionalUSD)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: c.slate }}>{cl.rm} · {cl.location}</div>
                <div style={{ fontSize: 10, color: c.slate }}>{cl.portfolioPct}% of portfolio</div>
              </div>
              <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, cl.portfolioPct * 12)}%`, background: cl.tier === 'Ultra' ? c.gold : c.teal, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PlaygroundTemplate = ({ content, onContentChange, onCreateFromPlayground }) => {
  const c_content = content || {};
  const [isChallenging, setIsChallenging] = React.useState(false);
  const [challenges, setChallenges] = React.useState(c_content.challenges || []);
  const [selectedSources, setSelectedSources] = React.useState(c_content.selectedSources || ['full-web']);
  const [streetViewFirms, setStreetViewFirms] = React.useState(c_content.streetViewFirms || []);
  const [showStreetFirms, setShowStreetFirms] = React.useState(false);

  const SOURCES = [
    { id: 'full-web', label: 'Full Web', icon: '🌐', desc: 'Broad internet sources' },
    { id: 'trusted-web', label: 'Trusted Web', icon: '✅', desc: 'FT, Bloomberg, Reuters, WSJ, Economist' },
    { id: 'jpm-ib', label: 'JPM Investment Bank', icon: '🏦', desc: 'JPMorgan IB research & reports' },
    { id: 'jpm-pb', label: 'JPM Private Bank', icon: '🔒', desc: 'GIS publications & internal views' },
    { id: 'street-views', label: 'Street Views', icon: '📊', desc: 'Competitor research & views', hasChildren: true },
  ];

  const STREET_FIRMS = ['Goldman Sachs', 'Morgan Stanley', 'UBS', 'Citi', 'Deutsche Bank', 'BofA', 'Barclays', 'HSBC'];

  const toggleSource = (id) => {
    const updated = selectedSources.includes(id)
      ? selectedSources.filter(s => s !== id)
      : [...selectedSources, id];
    setSelectedSources(updated);
    onContentChange && onContentChange({ ...c_content, selectedSources: updated });
    if (id === 'street-views') setShowStreetFirms(!selectedSources.includes(id));
  };

  const toggleFirm = (firm) => {
    const updated = streetViewFirms.includes(firm)
      ? streetViewFirms.filter(f => f !== firm)
      : [...streetViewFirms, firm];
    setStreetViewFirms(updated);
    onContentChange && onContentChange({ ...c_content, streetViewFirms: updated });
  };

  const wordCount = (c_content.freeform || '').split(/\s+/).filter(Boolean).length;

  // Suggest template based on word count and content
  const suggestTemplate = () => {
    if (wordCount < 50) return null;
    if (wordCount > 400) return { id: 'macroMarkets', name: 'Macro & Markets', reason: 'deep enough for a full essay', highlight: true };
    if (wordCount > 150) return { id: 'ideasInsights', name: 'Ideas & Insights', reason: 'great depth for a deep-dive', highlight: true };
    if (wordCount > 50) return { id: 'topMarketTakeaways', name: 'Top Market Takeaways', reason: 'good for a punchy op-ed', highlight: false };
    return null;
  };
  const suggestion = suggestTemplate();

  const challengeThinking = async () => {
    const text = c_content.freeform || '';
    if (!text.trim()) return;
    const apiKey = localStorage.getItem('_ak');
    if (!apiKey) { alert('Set your API key first'); return; }
    setIsChallenging(true);

    const sourceContext = [
      selectedSources.includes('trusted-web') ? 'Draw on FT, Bloomberg, Reuters, WSJ and Economist sources.' : '',
      selectedSources.includes('jpm-ib') ? 'Reference JPMorgan Investment Bank research perspectives.' : '',
      selectedSources.includes('jpm-pb') ? 'Reference J.P. Morgan Private Bank GIS positioning.' : '',
      selectedSources.includes('street-views') && streetViewFirms.length > 0 ? `Consider views from: ${streetViewFirms.join(', ')}.` : '',
    ].filter(Boolean).join(' ');

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          tools: selectedSources.includes('full-web') || selectedSources.includes('trusted-web') ? [{ type: 'web_search_20250305', name: 'web_search' }] : [],
          system: `You are a senior external research counterpart — think a seasoned economist at a rival institution, a macro PM, or a well-regarded sell-side strategist. ${sourceContext} Your job: 1. Challenge the key assumptions. 2. Add context and data the author may have missed. 3. Suggest angles, complications, or risks that would strengthen the thinking. 4. Point to 2-3 related themes. Be direct, rigorous, constructive. Max 300 words, 3-4 numbered points.`,
          messages: [{ role: 'user', content: `Here is my thinking in progress:\n\n${text}\n\nChallenge this, add context, and help me develop it further.` }]
        })
      });
      const data = await resp.json();
      const result = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const newChallenge = {
        id: Date.now(), timestamp: new Date().toISOString(),
        snapshot: text.slice(0, 80) + '...',
        response: result,
        sources: [...selectedSources],
        firms: [...streetViewFirms]
      };
      const updatedChallenges = [newChallenge, ...challenges];
      setChallenges(updatedChallenges);
      onContentChange && onContentChange({ ...c_content, challenges: updatedChallenges });
    } catch(e) { console.log('Challenge error:', e.message); }
    setIsChallenging(false);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #6B5B95 0%, #8B7AB5 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>🎯 The Playground</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Free-form thinking space — no structure required</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {suggestion && (
            <div style={{ fontSize: 10, color: '#fff', background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '5px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>Suggest:</span>
              <button onClick={() => onCreateFromPlayground && onCreateFromPlayground(suggestion.id, c_content.freeform)}
                style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: suggestion.highlight ? '#C1A364' : 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                {suggestion.name} ↗
              </button>
              <span style={{ fontSize: 9, opacity: 0.7 }}>{suggestion.reason}</span>
            </div>
          )}
          <button onClick={challengeThinking} disabled={isChallenging || !c_content.freeform?.trim()}
            style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: isChallenging ? 'rgba(255,255,255,0.2)' : '#fff', color: '#6B5B95', fontSize: 11, fontWeight: 700, cursor: isChallenging ? 'wait' : 'pointer', opacity: !c_content.freeform?.trim() ? 0.5 : 1 }}>
            {isChallenging ? '⏳ Thinking...' : '⚡ Challenge My Thinking'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 280px)', minHeight: 500 }}>

        {/* LEFT — Source selector */}
        <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid ' + c.pearl, padding: '14px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Sources</div>
          {SOURCES.map(s => (
            <div key={s.id}>
              <div onClick={() => toggleSource(s.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '7px 9px', borderRadius: 7, cursor: 'pointer', background: selectedSources.includes(s.id) ? '#F5F3FF' : '#fff', border: '1px solid ' + (selectedSources.includes(s.id) ? '#DDD6FE' : c.pearl), transition: 'all 0.15s' }}>
                <div style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: selectedSources.includes(s.id) ? '#6B5B95' : c.navy, lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: c.slate, lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
              {/* Street firms sub-list */}
              {s.hasChildren && selectedSources.includes('street-views') && (
                <div style={{ marginLeft: 8, marginBottom: 8 }}>
                  {STREET_FIRMS.map(firm => (
                    <div key={firm} onClick={() => toggleFirm(firm)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 5, cursor: 'pointer', marginBottom: 3, background: streetViewFirms.includes(firm) ? '#EFF6FF' : 'transparent' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, border: '1px solid ' + (streetViewFirms.includes(firm) ? '#2563EB' : c.pearl), background: streetViewFirms.includes(firm) ? '#2563EB' : '#fff', flexShrink: 0 }}>
                        {streetViewFirms.includes(firm) && <div style={{ width: 6, height: 6, background: '#fff', borderRadius: 1, margin: '1px auto' }} />}
                      </div>
                      <span style={{ fontSize: 10, color: streetViewFirms.includes(firm) ? '#2563EB' : c.slate, fontWeight: streetViewFirms.includes(firm) ? 600 : 400 }}>{firm}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Word count */}
          {wordCount > 0 && (
            <div style={{ marginTop: 16, padding: '8px 9px', borderRadius: 7, background: c.ivory, border: '1px solid ' + c.pearl }}>
              <div style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Words</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.navy }}>{wordCount}</div>
              <div style={{ fontSize: 9, color: c.slate, marginTop: 2 }}>
                {wordCount < 50 ? 'Keep going...' : wordCount < 150 ? 'Desk commentary territory' : wordCount < 400 ? 'Ideas & Insights territory' : 'Macro & Markets territory'}
              </div>
            </div>
          )}

          {/* Create content */}
          {wordCount >= 50 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Create from this</div>
              {[
                { id: 'topMarketTakeaways', name: 'Top Market Takeaways', min: 50, highlight: wordCount >= 100 && wordCount < 400 },
                { id: 'ideasInsights', name: 'Ideas & Insights', min: 150, highlight: wordCount >= 200 && wordCount < 600 },
                { id: 'macroMarkets', name: 'Macro & Markets', min: 300, highlight: wordCount >= 400 },
                { id: 'deskCommentary', name: 'Desk Commentary', min: 20, highlight: wordCount < 100 },
              ].filter(t => wordCount >= t.min).map(t => (
                <button key={t.id} onClick={() => onCreateFromPlayground && onCreateFromPlayground(t.id, c_content.freeform)}
                  style={{ display: 'block', width: '100%', marginBottom: 5, padding: '6px 9px', borderRadius: 6, border: '1px solid ' + (t.highlight ? '#6B5B95' : c.pearl), background: t.highlight ? '#F5F3FF' : '#fff', color: t.highlight ? '#6B5B95' : c.slate, fontSize: 10, fontWeight: t.highlight ? 700 : 400, cursor: 'pointer', textAlign: 'left' }}>
                  {t.highlight ? '★ ' : ''}{t.name} ↗
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MIDDLE — Writing area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px', borderRight: '1px solid ' + c.pearl }}>
          <input value={c_content.title || ''} onChange={e => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
            placeholder="Working title (optional)..."
            style={{ width: '100%', fontSize: 15, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '1px solid ' + c.pearl, paddingBottom: 8, marginBottom: 12, outline: 'none' }} />
          <textarea
            value={c_content.freeform || ''}
            onChange={e => onContentChange && onContentChange({ ...c_content, freeform: e.target.value })}
            placeholder="Start writing anything — a half-formed idea, a question, a data point that caught your attention, a thesis you want to stress-test. No structure required. Hit 'Challenge My Thinking' when ready."
            style={{ flex: 1, width: '100%', padding: 0, border: 'none', fontSize: 13, lineHeight: 1.8, color: c.navy, fontFamily: 'Georgia, serif', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* RIGHT — Challenge responses */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + c.pearl, background: c.ivory }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6B5B95', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              External Counterpart {challenges.length > 0 ? `(${challenges.length})` : ''}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {challenges.length === 0 && !isChallenging && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: c.slate }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>💬</div>
                <div style={{ fontSize: 12 }}>Hit "Challenge My Thinking" to get pushback, context, and insights from an external research counterpart.</div>
              </div>
            )}
            {isChallenging && (
              <div style={{ padding: '12px 14px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #DDD6FE', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#6B5B95', fontWeight: 600 }}>⏳ Thinking...</div>
              </div>
            )}
            {challenges.map((ch, idx) => (
              <div key={ch.id} style={{ marginBottom: 12, padding: '12px 13px', background: idx === 0 ? '#F5F3FF' : c.ivory, borderRadius: 8, border: '1px solid ' + (idx === 0 ? '#DDD6FE' : c.pearl) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#6B5B95', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {idx === 0 ? '✦ Latest' : `#${challenges.length - idx}`}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(ch.sources || []).map(s => {
                      const src = [{ id:'full-web',icon:'🌐'},{id:'trusted-web',icon:'✅'},{id:'jpm-ib',icon:'🏦'},{id:'jpm-pb',icon:'🔒'},{id:'street-views',icon:'📊'}].find(x=>x.id===s);
                      return src ? <span key={s} style={{ fontSize: 11 }} title={s}>{src.icon}</span> : null;
                    })}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: c.slate, fontStyle: 'italic', marginBottom: 6 }}>Based on: "{ch.snapshot}"</div>
                <div style={{ fontSize: 12, lineHeight: 1.65, color: c.navy, whiteSpace: 'pre-wrap' }}>{ch.response}</div>
                <div style={{ fontSize: 9, color: c.slate, marginTop: 6, textAlign: 'right' }}>
                  {new Date(ch.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

const DeskCommentaryTemplate = ({ content, onContentChange, onShowExposure }) => {
  const c_content = content || {};
  const isExternal = c_content.isExternal || false;
  const defaultSections = [
    { id: 'headline', title: 'Headline View', content: '', placeholder: 'Lead with the conclusion — one tight paragraph, 100–150 words. JPM/Bridgewater voice. What happened, why it matters, what JPM thinks. No throat-clearing.' },
  ];
  const sections = c_content.sections || defaultSections;
  const wordCount = (sections[0]?.content || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>

        {/* Distribution toggle */}
        <div style={{ marginBottom: 14, padding: 12, background: isExternal ? 'linear-gradient(135deg, #C1A364 0%, #D4B87A 100%)' : 'linear-gradient(135deg, #103A45 0%, #1A5A6A 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{isExternal ? '🌐 External' : '🔒 Internal'}</div>
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden' }}>
            <button onClick={() => onContentChange && onContentChange({ ...c_content, isExternal: false })} style={{ padding: '7px 14px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: !isExternal ? '#fff' : 'rgba(255,255,255,0.2)', color: !isExternal ? c.teal : 'rgba(255,255,255,0.9)' }}>Internal</button>
            <button onClick={() => onContentChange && onContentChange({ ...c_content, isExternal: true })} style={{ padding: '7px 14px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: isExternal ? '#fff' : 'rgba(255,255,255,0.2)', color: isExternal ? c.gold : 'rgba(255,255,255,0.9)' }}>External</button>
          </div>
        </div>

        {/* Title */}
        <input value={c_content.title || ''} onChange={e => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="e.g. Fed holds — more hawkish than expected"
          style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', borderBottom: '2px solid ' + c.pearl, paddingBottom: 10, marginBottom: 14, outline: 'none' }} />

        {/* Single paragraph body */}
        <div style={{ position: 'relative' }}>
          <textarea
            value={sections[0]?.content || ''}
            onChange={e => onContentChange && onContentChange({ ...c_content, sections: [{ ...defaultSections[0], content: e.target.value }] })}
            placeholder="Lead with the conclusion — one tight paragraph, 100–150 words. JPM/Bridgewater voice. What happened, why it matters, what JPM thinks. No throat-clearing."
            rows={7}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid ' + c.pearl, fontSize: 14, lineHeight: 1.7, fontFamily: 'Georgia, serif', color: c.navy, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 9, color: wordCount > 150 ? c.neg : wordCount > 100 ? c.teal : c.slate, textAlign: 'right', marginTop: 4, letterSpacing: 0.3 }}>
            {wordCount}w {wordCount > 150 ? '· over limit' : wordCount >= 100 ? '· good length' : wordCount > 0 ? '· keep going' : ''}
          </div>
        </div>

        <ProductTagsInput productTags={c_content.productTags || []} onChange={tags => onContentChange && onContentChange({ ...c_content, productTags: tags })} />
        {(c_content.productTags || []).length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(c_content.productTags || []).map(ticker => (
              <button key={ticker} onClick={() => onShowExposure && onShowExposure(ticker)}
                style={{ padding: '4px 10px', borderRadius: 12, border: '1px solid ' + c.teal, background: '#F0F9FF', color: c.teal, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                👥 {ticker} exposure
              </button>
            ))}
          </div>
        )}
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};


const TradeIdeaTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'thesis', title: 'Thesis', content: '', placeholder: 'Core investment thesis...' },
    { id: 'rationale', title: 'Rationale', content: '', placeholder: 'Supporting rationale and catalysts...' }
  ];
  const sections = c_content.sections || defaultSections;
  
  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: 16 }}>
        <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
          placeholder="Trade idea title..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />
        
        {/* Trade Metrics - fixed metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14, padding: 12, background: c.ivory, borderRadius: 8 }}>
          <div>
            <SectionLabel>Entry</SectionLabel>
            <input value={c_content.entry || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, entry: e.target.value })}
              placeholder="Entry price..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fff' }} />
          </div>
          <div>
            <SectionLabel>Target</SectionLabel>
            <input value={c_content.target || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, target: e.target.value })}
              placeholder="Target price..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fff' }} />
          </div>
          <div>
            <SectionLabel>Stop Loss</SectionLabel>
            <input value={c_content.stopLoss || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, stopLoss: e.target.value })}
              placeholder="Stop loss..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fff' }} />
          </div>
        </div>
        
        <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
        <ProductTagsInput
          productTags={c_content.productTags || []}
          onChange={(tags) => onContentChange && onContentChange({ ...c_content, productTags: tags })}
        />
        <TagsSection tags={[]} />
        <Disclaimer />
      </div>
    </div>
  );
};

const CompanyFundIndexTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'overview', title: 'Overview', content: '', placeholder: 'Company overview and investment case...' },
    { id: 'metrics', title: 'Key Metrics', content: '', placeholder: 'Valuation, growth, key financial metrics...' },
    { id: 'view', title: 'Our View', content: '', placeholder: 'Recommendation and key risks...' }
  ];
  const sections = c_content.sections || defaultSections;
  
  return (
  <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: 16 }}>
      <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
        placeholder="Company/Fund name and thesis..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />
      <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
      <TagsSection tags={[]} />
      <Disclaimer />
    </div>
  </div>
  );
};

const ProductUpdateTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'summary', title: 'Summary', content: '', placeholder: 'Key highlights...' },
    { id: 'changes', title: 'Changes', content: '', placeholder: 'Positioning changes...' },
    { id: 'impact', title: 'Impact', content: '', placeholder: 'Outlook and implications...' }
  ];
  const sections = c_content.sections || defaultSections;
  
  return (
  <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: 16 }}>
      <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
        placeholder="Product update title..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />
      <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
      <TagsSection tags={[]} />
      <Disclaimer />
    </div>
  </div>
  );
};

const TradePricingTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'pricing', title: 'Pricing', content: '', placeholder: 'Pricing levels and terms...' },
    { id: 'notes', title: 'Notes', content: '', placeholder: 'Additional notes...' }
  ];
  const sections = c_content.sections || defaultSections;
  
  return (
  <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: 16 }}>
      <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
        placeholder="Trade pricing title..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />
      
      {/* Instrument - fixed metadata */}
      <div style={{ marginBottom: 14, padding: 12, background: c.ivory, borderRadius: 8 }}>
        <SectionLabel>Instrument</SectionLabel>
        <input value={c_content.instrument || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, instrument: e.target.value })}
          placeholder="Instrument details..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none', background: '#fff' }} />
      </div>
      
      <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
      <TagsSection tags={[]} />
    </div>
  </div>
  );
};

const CampaignTemplate = ({ content, onContentChange, }) => {
  const c_content = content || {};
  const defaultSections = [
    { id: 'objective', title: 'Objective', content: '', placeholder: 'Campaign objective...' },
    { id: 'audience', title: 'Target Audience', content: '', placeholder: 'Who is this for?' },
    { id: 'messaging', title: 'Key Messaging', content: '', placeholder: 'Key messages and value propositions...' },
    { id: 'cta', title: 'Call to Action', content: '', placeholder: 'What should the reader do?' }
  ];
  const sections = c_content.sections || defaultSections;
  
  return (
  <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: 16 }}>
      <input value={c_content.title || ''} onChange={(e) => onContentChange && onContentChange({ ...c_content, title: e.target.value })}
        placeholder="Campaign title..." style={{ width: '100%', fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, border: 'none', marginBottom: 14, outline: 'none' }} />
      <MovableSectionsEditor sections={sections} onChange={(newSections) => onContentChange && onContentChange({ ...c_content, sections: newSections })} />
      <TagsSection tags={[]} />
    </div>
  </div>
  );
};

// ============================================
// MAIN APP
// ============================================

// ============================================================
// WORKFLOW TAB
// ============================================================

// ── Data Tab ─────────────────────────────────────────────────────────────────
const DataTab = ({ items, onEvaluate, onEvaluateAll, evaluating, qScores }) => {
  const formatScore = (s) => s != null ? s.toFixed(1) : '—';
  const scoreColor = (s) => s == null ? '#9CA3AF' : s >= 4 ? '#059669' : s >= 3 ? '#D97706' : '#DC2626';
  return (
    <div style={{ background:'#fff', borderRadius:10, overflow:'hidden' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid '+c.pearl, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontFamily:'Georgia, serif', fontSize:18, color:c.navy, margin:0 }}>Content Quality Scores</h2>
          <p style={{ fontSize:11, color:c.slate, margin:'2px 0 0' }}>AI-evaluated scores across editorial criteria</p>
        </div>
        <button onClick={onEvaluateAll} style={{ padding:'8px 16px', borderRadius:6, border:'none', background:c.navy, color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>
          Evaluate All
        </button>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:c.ivory }}>
              <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:600, color:c.slate }}>Title</th>
              <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:600, color:c.slate }}>Type</th>
              <th style={{ padding:'10px 16px', textAlign:'center', fontWeight:600, color:c.slate }}>Score</th>
              <th style={{ padding:'10px 16px', textAlign:'center', fontWeight:600, color:c.slate }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const score = qScores?.[item.id];
              return (
                <tr key={item.id} style={{ borderBottom:'1px solid '+c.pearl }}>
                  <td style={{ padding:'10px 16px', color:c.navy, fontWeight:500 }}>{item.title}</td>
                  <td style={{ padding:'10px 16px', color:c.slate }}>{item.typeLabel}</td>
                  <td style={{ padding:'10px 16px', textAlign:'center' }}>
                    {evaluating === item.id ? (
                      <span style={{ color:c.slate, fontSize:11 }}>Evaluating...</span>
                    ) : (
                      <span style={{ fontWeight:700, fontSize:14, color:scoreColor(score) }}>{formatScore(score)}</span>
                    )}
                  </td>
                  <td style={{ padding:'10px 16px', textAlign:'center' }}>
                    <button onClick={() => onEvaluate(item)} disabled={evaluating === item.id}
                      style={{ padding:'4px 12px', borderRadius:5, border:'1px solid '+c.pearl, background:'#fff', color:c.navy, fontSize:11, cursor:'pointer' }}>
                      Evaluate
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Taxonomy Tab ──────────────────────────────────────────────────────────────
const TaxonomyTab = () => (
  <div style={{ background:'#fff', borderRadius:10, padding:32 }}>
    <h2 style={{ fontFamily:'Georgia, serif', fontSize:20, color:c.navy, marginTop:0 }}>Taxonomy</h2>
    <p style={{ fontSize:13, color:c.slate, marginBottom:24 }}>Manage tags, asset classes, regions and content categories.</p>
    {[
      { label:'Asset Classes', tags:['Equities','Fixed Income','Alternatives','Multi-Asset','Real Estate','Cash','Commodities','Crypto'] },
      { label:'Regions', tags:['Global','North America','Europe','Asia Pacific','Latin America','Middle East','Africa','UK'] },
      { label:'Themes', tags:['Geopolitics','Central Banks','Inflation','Growth','Technology','Energy Transition','AI','Demographics'] },
      { label:'Advisor Tags', tags:['Nexus','BNO','GIS','Solutions','WM','PB','Internal','External'] },
    ].map(group => (
      <div key={group.label} style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, color:c.navy, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{group.label}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {group.tags.map(tag => (
            <span key={tag} style={{ padding:'4px 12px', borderRadius:20, border:'1px solid '+c.pearl, background:c.ivory, fontSize:12, color:c.navy }}>{tag}</span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const WorkflowTab = ({ items, currentUser, isAdmin, onStatusChange, onSetReviewer, onOpenItem }) => {
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [commentInput, setCommentInput] = React.useState('');
  const [filterTeam, setFilterTeam] = React.useState('all');
  const [filterExternal, setFilterExternal] = React.useState('all');

  const STAGES = [
    { id: 'draft',      label: 'Draft',       color: '#6B7280', bg: '#F3F4F6',  desc: 'Being written' },
    { id: 'in_review',  label: 'In Review',   color: '#D97706', bg: '#FEF3C7',  desc: 'Awaiting sign-off' },
    { id: 'approved',   label: 'Approved',    color: '#059669', bg: '#D1FAE5',  desc: 'Ready to publish' },
    { id: 'published',  label: 'Published',   color: '#2563EB', bg: '#DBEAFE',  desc: 'Live' },
    { id: 'archived',   label: 'Archived',    color: '#9CA3AF', bg: '#F9FAFB',  desc: 'Retired' },
  ];

  const TEAM_COLORS = { GIS: { bg: '#EEF2FF', color: '#4F46E5' }, Solutions: { bg: '#F0FDF4', color: '#16A34A' } };

  const filteredItems = items.filter(item => {
    if (filterTeam !== 'all' && item.team !== filterTeam) return false;
    if (filterExternal === 'external' && !item.isExternal) return false;
    if (filterExternal === 'internal' && item.isExternal) return false;
    return true;
  });

  const itemsByStage = (stageId) => filteredItems.filter(i => i.status === stageId);

  const canTransition = (item, toStatus) => {
    if (isAdmin) return true;
    if (toStatus === 'in_review' && item.author === currentUser && item.status === 'draft') return true;
    if (toStatus === 'draft' && item.reviewer === currentUser && item.status === 'in_review') return true;
    if (toStatus === 'approved' && item.reviewer === currentUser && item.status === 'in_review') return true;
    if (toStatus === 'published' && (isAdmin || item.reviewer === currentUser) && item.status === 'approved') return true;
    if (toStatus === 'archived' && isAdmin) return true;
    return false;
  };

  const actionButton = (item) => {
    if (item.status === 'draft') return { label: 'Submit for Review', to: 'in_review', color: '#D97706' };
    if (item.status === 'in_review') return null; // Multiple actions via detail panel
    if (item.status === 'approved') return { label: 'Publish', to: 'published', color: '#2563EB' };
    return null;
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const typeColor = { topMarketTakeaways: '#C1A364', deskCommentary: '#103A45', macroMarkets: '#0A1A2F', ideasInsights: '#6B5B95', tradeIdea: '#B84242', morningMeeting: '#1B7F4E', eventResponse: '#E08A00' };

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 180px)', minHeight: 500 }}>
      {/* ── KANBAN BOARD ── */}
      <div style={{ flex: 1, overflowX: 'auto', padding: '0 0 16px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, color: c.slate, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Filter:</div>
          {['all', 'GIS', 'Investment Solutions', 'Banking', 'Planning'].map(t => (
            <button key={t} onClick={() => setFilterTeam(t)}
              style={{ padding: '4px 12px', borderRadius: 20, border: 'none', fontSize: 10, fontWeight: 500, cursor: 'pointer', background: filterTeam === t ? c.navy : c.ivory, color: filterTeam === t ? '#fff' : c.slate }}>
              {t === 'all' ? 'All Teams' : t}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: c.pearl, margin: '0 4px' }} />
          {['all', 'external', 'internal'].map(e => (
            <button key={e} onClick={() => setFilterExternal(e)}
              style={{ padding: '4px 12px', borderRadius: 20, border: 'none', fontSize: 10, fontWeight: 500, cursor: 'pointer', background: filterExternal === e ? c.navy : c.ivory, color: filterExternal === e ? '#fff' : c.slate }}>
              {e === 'all' ? 'All Content' : e === 'external' ? '🌐 External only' : '🔒 Internal only'}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 10, color: c.slate }}>{filteredItems.length} pieces</div>
        </div>

        {/* Kanban columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))', gap: 12, minWidth: 900 }}>
          {STAGES.map(stage => (
            <div key={stage.id}>
              {/* Column header */}
              <div style={{ padding: '8px 12px', borderRadius: '8px 8px 0 0', background: stage.bg, borderBottom: `2px solid ${stage.color}30`, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stage.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: stage.color + '20', padding: '1px 7px', borderRadius: 10 }}>{itemsByStage(stage.id).length}</span>
                </div>
                <div style={{ fontSize: 9, color: stage.color, opacity: 0.8, marginTop: 2 }}>{stage.desc}</div>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                {itemsByStage(stage.id).map(item => {
                  const btn = actionButton(item);
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div key={item.id}
                      onClick={() => setSelectedItem(isSelected ? null : item)}
                      style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid ' + (isSelected ? c.teal : c.pearl), cursor: 'pointer', boxShadow: isSelected ? '0 0 0 2px ' + c.teal + '30' : '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.15s' }}>
                      {/* Type chip */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: typeColor[item.type] || c.slate, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.typeLabel}</span>
                        {item.isExternal && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 8, background: c.gold + '20', color: c.gold, fontWeight: 700 }}>EXT</span>}
                      </div>
                      {/* Title */}
                      <div style={{ fontSize: 12, fontWeight: 500, color: c.navy, lineHeight: 1.35, marginBottom: 8 }}>{item.title}</div>
                      {/* Meta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: c.slate }}>{item.author}</span>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: (TEAM_COLORS[item.team] || {}).bg, color: (TEAM_COLORS[item.team] || {}).color, fontWeight: 600 }}>{item.team}</span>
                      </div>
                      {/* Action button */}
                      {btn && canTransition(item, btn.to) && (
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, btn.to); }}
                          style={{ marginTop: 8, width: '100%', padding: '5px 0', borderRadius: 5, border: 'none', background: btn.color, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                          {btn.label}
                        </button>
                      )}
                    </div>
                  );
                })}
                {itemsByStage(stage.id).length === 0 && (
                  <div style={{ padding: '20px 12px', textAlign: 'center', color: c.slate, fontSize: 10, border: '2px dashed ' + c.pearl, borderRadius: 8, opacity: 0.6 }}>Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DETAIL PANEL ── */}
      {selectedItem && (
        <div style={{ width: 300, borderLeft: '1px solid ' + c.pearl, background: '#fff', borderRadius: '0 10px 10px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + c.pearl }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: c.gold, marginBottom: 4 }}>{selectedItem.typeLabel}</div>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: c.slate, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.navy, lineHeight: 1.35, marginBottom: 8 }}>{selectedItem.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: (STAGES.find(s => s.id === selectedItem.status) || {}).bg, color: (STAGES.find(s => s.id === selectedItem.status) || {}).color, fontWeight: 700, textTransform: 'uppercase' }}>{selectedItem.status.replace('_', ' ')}</span>
              {selectedItem.isExternal && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: c.gold + '20', color: c.gold, fontWeight: 700 }}>External</span>}
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: (TEAM_COLORS[selectedItem.team] || {}).bg, color: (TEAM_COLORS[selectedItem.team] || {}).color, fontWeight: 700 }}>{selectedItem.team}</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[['Author', selectedItem.author], ['Reviewer', selectedItem.reviewer || '—'], ['Asset Class', selectedItem.assetClass || '—'], ['Created', selectedItem.createdDate || '—'], ...(selectedItem.vertical ? [['Client Vertical', selectedItem.vertical]] : [])].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: c.navy }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Assign reviewer */}
            {(selectedItem.status === 'draft' || selectedItem.status === 'in_review') && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>Assign Reviewer</div>
                <select value={selectedItem.reviewer || ''} onChange={(e) => { onSetReviewer(selectedItem.id, e.target.value); setSelectedItem(prev => ({ ...prev, reviewer: e.target.value })); }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, background: '#fff', outline: 'none' }}>
                  <option value="">— Unassigned —</option>
                  {['Madison Faller', 'Thomas Mueller', 'Erik Wytenus', 'Grace Chen', 'You'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}

            {/* Workflow actions for in_review */}
            {selectedItem.status === 'in_review' && (
              <div style={{ marginBottom: 16, padding: 12, background: '#FFF7E6', borderRadius: 8, border: '1px solid #F5E6C6' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#D97706', marginBottom: 8 }}>🔍 Review Required</div>
                <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Add a comment (optional)..."
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11, resize: 'none', minHeight: 56, outline: 'none', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { onStatusChange(selectedItem.id, 'draft', commentInput); setCommentInput(''); setSelectedItem(prev => ({ ...prev, status: 'draft' })); }}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 5, border: '1px solid #B84242', background: '#fff', color: '#B84242', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    ✕ Request Changes
                  </button>
                  <button onClick={() => { onStatusChange(selectedItem.id, 'approved', commentInput); setCommentInput(''); setSelectedItem(prev => ({ ...prev, status: 'approved' })); }}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 5, border: 'none', background: '#059669', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ Approve
                  </button>
                </div>
              </div>
            )}

            {/* Publish action */}
            {selectedItem.status === 'approved' && (
              <div style={{ marginBottom: 16 }}>
                <button onClick={() => { onStatusChange(selectedItem.id, 'published'); setSelectedItem(prev => ({ ...prev, status: 'published' })); }}
                  style={{ width: '100%', padding: '9px 0', borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  📤 Publish Now
                </button>
              </div>
            )}

            {/* Open in editor */}
            <button onClick={() => onOpenItem(selectedItem)}
              style={{ width: '100%', padding: '7px 0', borderRadius: 5, border: '1px solid ' + c.pearl, background: '#fff', color: c.navy, fontSize: 10, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}>
              ✏️ Open in Editor
            </button>

            {/* Audit trail */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: c.slate, marginBottom: 10 }}>Audit Trail</div>
              <div style={{ position: 'relative', paddingLeft: 16 }}>
                <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: c.pearl }} />
                {[...(selectedItem.history || [])].reverse().map((h, i) => {
                  const actionColors = { created: c.slate, submitted: '#D97706', approved: '#059669', published: '#2563EB', changes_requested: '#B84242', resubmitted: '#D97706', archived: '#9CA3AF' };
                  const col = actionColors[h.action] || c.slate;
                  return (
                    <div key={i} style={{ position: 'relative', marginBottom: 12 }}>
                      <div style={{ position: 'absolute', left: -16, top: 4, width: 8, height: 8, borderRadius: '50%', background: col, border: '1px solid #fff' }} />
                      <div style={{ fontSize: 10, fontWeight: 600, color: col, textTransform: 'capitalize' }}>{h.action.replace('_', ' ')}</div>
                      <div style={{ fontSize: 10, color: c.slate }}>{h.by} · {formatTime(h.at)}</div>
                      {h.comment && <div style={{ fontSize: 10, color: c.navy, marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 }}>"{h.comment}"</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Tags in detail panel */}
            {(selectedItem.productTags||[]).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Product Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(selectedItem.productTags||[]).map(pt => (
                    <span key={pt} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: c.navy, color: c.gold, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5 }}>{pt}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Recommendations */}
            <LinkedRecommendations item={selectedItem} allItems={items} />

          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// DATA & TAXONOMY TAB
// ============================================================
// Master approved tag list — edit this to govern the taxonomy
const APPROVED_TAGS = [
  // Themes
  'AI', 'tech', 'semiconductors', 'rates', 'macro', 'inflation', 'geopolitics', 'defense',
  'energy', 'ESG', 'climate', 'commodities', 'crypto', 'digital-assets',
  // Asset classes
  'equities', 'fixed-income', 'FX', 'alternatives', 'private-credit', 'private-equity',
  'real-assets', 'multi-asset',
  // Geographies
  'US', 'europe', 'APAC', 'EM', 'china', 'japan', 'UK',
  // Content type / format
  'desk-note', 'research', 'weekly', 'daily', 'morning', 'internal',
  // Event tags
  'FOMC', 'CPI', 'NFP', 'earnings', 'ECB', 'BOJ', 'BOE',
  // Client / segment
  'UHNW', 'institutional', 'retail',
];


const THEME_DEFS = [
  { theme: 'AI & Technology',        sub: ['Semiconductors', 'Nvidia', 'AI Infrastructure', 'Data Centres'],    keywords: ['AI', 'tech', 'semiconductors', 'nvidia', 'data-centre'], icon: '🤖', color: '#6366F1' },
  { theme: 'Rates & Monetary Policy', sub: ['Fed Policy', 'ECB', 'BOJ', 'Duration'],                            keywords: ['rates', 'FOMC', 'fed', 'ECB', 'BOJ', 'duration', 'fixed-income'], icon: '📈', color: '#0891B2' },
  { theme: 'Geopolitics & Security', sub: ['US-China', 'European Defence', 'Middle East', 'Trade / Tariffs'],   keywords: ['geopolitics', 'defense', 'security', 'trade', 'tariffs', 'china'], icon: '🌍', color: '#DC2626' },
  { theme: 'Energy Transition',       sub: ['Renewables', 'Carbon Markets', 'Oil & Gas', 'Infrastructure'],    keywords: ['energy', 'ESG', 'climate', 'renewables', 'commodities'], icon: '⚡', color: '#16A34A' },
  { theme: 'Inflation & Growth',      sub: ['CPI / PCE', 'Wage Growth', 'Consumer Demand', 'Recession Risk'],  keywords: ['inflation', 'CPI', 'macro', 'growth', 'recession'], icon: '💰', color: '#D97706' },
  { theme: 'Private Markets',         sub: ['Private Credit', 'Venture Capital', 'Infrastructure Debt', 'Real Assets'], keywords: ['private-credit', 'private-equity', 'alternatives', 'real-assets'], icon: '🏛️', color: '#7C3AED' },
];

const ThemesSection = ({ items }) => {
  const [expandedTheme, setExpandedTheme] = React.useState(null);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: 0 }}>Theme Taxonomy</h3>
        <div style={{ fontSize: 11, color: c.slate }}>Click a theme to drill down</div>
      </div>
      {THEME_DEFS.map(({ theme, sub, keywords, icon, color }) => {
        const matchingItems = items.filter(i => (i.tags || []).some(t => keywords.some(k => k.toLowerCase() === t.toLowerCase())));
        const isExpanded = expandedTheme === theme;
        return (
          <div key={theme} style={{ marginBottom: 10, borderRadius: 8, border: '1px solid ' + (isExpanded ? color + '60' : c.pearl), overflow: 'hidden' }}>
            <button type="button" onClick={() => setExpandedTheme(isExpanded ? null : theme)}
              style={{ width: '100%', padding: '12px 16px', background: isExpanded ? color + '12' : color + '06', borderLeft: '4px solid ' + color, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.navy }}>{theme}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                    {sub.map(s => <span key={s} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 8, background: color + '18', color }}>{s}</span>)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'Georgia, serif' }}>{matchingItems.length}</div>
                  <div style={{ fontSize: 9, color: c.slate }}>pieces</div>
                </div>
                <span style={{ fontSize: 11, color, display: 'inline-block', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>
            </button>
            {isExpanded && (
              <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid ' + color + '20' }}>
                <div style={{ fontSize: 10, color: c.slate, marginBottom: 10 }}>
                  <strong>Keywords:</strong> {keywords.join(', ')}
                </div>
                {matchingItems.length === 0 ? (
                  <div style={{ color: c.slate, fontSize: 11 }}>No pieces tagged with these keywords yet. Use: <strong>{keywords[0]}</strong></div>
                ) : matchingItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid ' + c.ivory }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: c.navy }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: c.slate, marginTop: 1 }}>{item.typeLabel} · {item.author} · {(item.tags||[]).join(', ')}</div>
                      {(item.productTags||[]).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                          {(item.productTags||[]).map(pt => (
                            <span key={pt} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: c.navy, color: c.gold, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5 }}>{pt}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 8, background: item.status === 'published' ? '#DBEAFE' : item.status === 'approved' ? '#D1FAE5' : '#F3F4F6', color: item.status === 'published' ? '#2563EB' : item.status === 'approved' ? '#059669' : '#6B7280', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 14, padding: 12, background: '#FFF7E6', borderRadius: 8, border: '1px solid #F5E6C6', fontSize: 10, color: '#92400E', lineHeight: 1.6 }}>
        💡 Theme matching uses the keyword list above. Tag content in Metadata (e.g. "AI", "rates", "geopolitics") to populate themes here.
      </div>
    </div>
  );
};


const LinkedRecommendations = ({ item, allItems }) => {
  if (!item || !allItems || allItems.length < 2) return null;

  // Score each other item for relevance to this one
  const score = (other) => {
    if (other.id === item.id) return -1;
    let s = 0;
    // Shared thematic tags
    const itemTags = new Set(item.tags || []);
    const otherTags = new Set(other.tags || []);
    itemTags.forEach(t => { if (otherTags.has(t)) s += 3; });
    // Shared product tags
    const itemPT = new Set(item.productTags || []);
    const otherPT = new Set(other.productTags || []);
    itemPT.forEach(t => { if (otherPT.has(t)) s += 5; });
    // Shared region
    (item.regions || []).forEach(r => { if ((other.regions || []).includes(r)) s += 2; });
    // Same vertical
    if (item.vertical && other.vertical && item.vertical === other.vertical) s += 4;
    // Different template type (complementary content)
    if (item.type !== other.type) s += 1;
    return s;
  };

  const recommended = [...allItems]
    .map(other => ({ item: other, score: score(other) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (recommended.length === 0) return null;

  return (
    <div style={{ marginTop: 16, padding: 14, background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>🔗 Linked Content</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recommended.map(({ item: rec, score: sc }) => (
          <div key={rec.id} style={{ padding: '8px 10px', background: '#fff', borderRadius: 6, border: '1px solid ' + c.pearl, cursor: 'pointer' }}
            onClick={() => {}}>
            <div style={{ fontSize: 11, fontWeight: 500, color: c.navy, marginBottom: 2 }}>{rec.title || 'Untitled'}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: c.slate }}>{rec.typeLabel}</span>
              {(rec.regions||[]).length > 0 && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: c.pearl, color: c.slate }}>{rec.regions.join(', ')}</span>}
              {(rec.productTags||[]).slice(0,3).map(pt => (
                <span key={pt} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: c.navy, color: c.gold, fontFamily: 'monospace', fontWeight: 700 }}>{pt}</span>
              ))}
              <span style={{ fontSize: 8, color: c.slate, marginLeft: 'auto' }}>Relevance: {'★'.repeat(Math.min(5, Math.round(sc/2)))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


const QualityScoresSection = ({ items }) => {
  const CRITERIA = [
    { key: 'title',           label: 'Title',           desc: 'Engaging, compelling title for UHNW audience' },
    { key: 'length',          label: 'Length',          desc: 'Appropriate length per template guidance' },
    { key: 'tone',            label: 'Tone',            desc: 'Right tone for a private bank audience' },
    { key: 'relevance',       label: 'Relevance',       desc: 'Relevant to UHNW clients in the published region' },
    { key: 'clarity',         label: 'Clarity',         desc: 'Message is clear and well-structured' },
    { key: 'depth',           label: 'Depth',           desc: 'Appropriate analytical depth for the piece type' },
    { key: 'impact',          label: 'Impact',          desc: 'Impactful and engaging to read' },
    { key: 'differentiation', label: 'Differ.',         desc: 'Views are original and differentiated' },
    { key: 'interesting',     label: 'Interesting',     desc: 'UHNW client would reuse this in conversation' },
    { key: 'actionability',   label: 'Actionable',      desc: 'Clear call to action or next step' },
  ];

  const REGIONS = ['All', 'EMEA', 'ASIA', 'LATAM', 'US'];
  const REGION_LABEL = { 'EMEA': 'EMEA', 'ASIA': 'Asia', 'LATAM': 'LATAM', 'US': 'US', 'Global': 'Global' };

  const normaliseRegion = (regions) => {
    if (!regions || regions.length === 0) return 'Global';
    if (regions.length > 2) return 'Global';
    return regions.map(r => REGION_LABEL[r] || r).join(' + ');
  };

  const matchesRegionFilter = (item, filter) => {
    if (filter === 'All') return true;
    const regs = item.regions || [];
    if (regs.length === 0 || regs.length > 2) return filter === 'Global';
    return regs.some(r => r.toUpperCase().includes(filter.toUpperCase()) || filter.toUpperCase().includes(r.toUpperCase()));
  };

  const scoreColor = (s) => {
    if (!s) return { bg: '#F3F4F6', text: '#9CA3AF' };
    if (s >= 4.5) return { bg: '#D1FAE5', text: '#065F46' };
    if (s >= 3.5) return { bg: '#DBEAFE', text: '#1E40AF' };
    if (s >= 2.5) return { bg: '#FEF9C3', text: '#854D0E' };
    return { bg: '#FEE2E2', text: '#991B1B' };
  };

  const [qScores, setQScores] = React.useState({});
  const [evaluating, setEvaluating] = React.useState(null);
  const [regionFilter, setRegionFilter] = React.useState('All');
  const [typeFilter, setTypeFilter] = React.useState('All');

  // Derive unique publication types from items
  const pubTypes = ['All', ...Array.from(new Set((items || []).map(i => i.typeLabel).filter(Boolean))).sort()];

  const filteredItems = (items || []).filter(item => {
    const regionOk = matchesRegionFilter(item, regionFilter);
    const typeOk = typeFilter === 'All' || item.typeLabel === typeFilter;
    return regionOk && typeOk;
  });

  const evaluateItem = async (item) => {
    setEvaluating(item.id);
    const bodyText = (item.sections||[]).map(s => s.content||'').join(' ').replace(/<[^>]+>/g,'').trim();
    const ctx = 'Title: "' + (item.title||'Untitled') + '". Template: ' + (item.typeLabel||'') + '. Regions: ' + ((item.regions||[]).join(', ')||'Global') + '. Body excerpt: ' + bodyText.slice(0, 400);
    const prompt = 'You are a senior J.P. Morgan Private Bank editorial director evaluating content for UHNW clients. Score each criterion 1-5 (5=excellent, 1=poor). Return ONLY this XML with no other text: <SCORES><TITLE>n</TITLE><LENGTH>n</LENGTH><TONE>n</TONE><RELEVANCE>n</RELEVANCE><CLARITY>n</CLARITY><DEPTH>n</DEPTH><IMPACT>n</IMPACT><DIFFERENTIATION>n</DIFFERENTIATION><INTERESTING>n</INTERESTING><ACTIONABILITY>n</ACTIONABILITY></SCORES>. Content to evaluate: ' + ctx;
    try {
      const raw = await callClaude({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
      const ex = (tag) => { const m = raw.match(new RegExp('<' + tag + '>([^<]+)</' + tag + '>')); return m ? parseFloat(m[1]) : null; };
      const s = { title: ex('TITLE'), length: ex('LENGTH'), tone: ex('TONE'), relevance: ex('RELEVANCE'), clarity: ex('CLARITY'), depth: ex('DEPTH'), impact: ex('IMPACT'), differentiation: ex('DIFFERENTIATION'), interesting: ex('INTERESTING'), actionability: ex('ACTIONABILITY') };
      const vals = Object.values(s).filter(Boolean);
      s.overall = vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : null;
      setQScores(prev => ({ ...prev, [item.id]: s }));
    } catch(e) { console.error('Score error:', e); }
    setEvaluating(null);
  };

  const evaluateAll = async () => { for (const item of filteredItems) { await evaluateItem(item); } };

  const wordCount = (item) => {
    const text = (item.sections||[]).map(s => s.content||'').join(' ');
    return text.replace(/<[^>]+>/g,'').split(/\s+/).filter(Boolean).length;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 4px' }}>Quality Scores</h3>
          <div style={{ fontSize: 11, color: c.slate }}>AI-evaluated against JPM Private Bank editorial standards. Hover headers for criteria details.</div>
        </div>
        <button onClick={evaluateAll} disabled={!!evaluating}
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: c.teal, color: '#fff', fontSize: 11, fontWeight: 600, cursor: evaluating ? 'not-allowed' : 'pointer', opacity: evaluating ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {evaluating ? '⏳ Evaluating...' : '⭐ Evaluate All'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: c.slate, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Region:</span>
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              style={{ padding: '4px 10px', borderRadius: 12, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                background: regionFilter === r ? c.navy : c.ivory, color: regionFilter === r ? '#fff' : c.slate }}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: c.slate, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type:</span>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 10, color: c.navy, outline: 'none', background: '#fff' }}>
            {pubTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <span style={{ fontSize: 10, color: c.slate }}>Showing {filteredItems.length} of {(items||[]).length} pieces</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['≥4.5 Excellent','#D1FAE5','#065F46'],['≥3.5 Good','#DBEAFE','#1E40AF'],['≥2.5 Average','#FEF9C3','#854D0E'],['<2.5 Weak','#FEE2E2','#991B1B']].map(([l,bg,t]) => (
          <span key={l} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 10, background: bg, color: t, fontWeight: 600 }}>{l}</span>
        ))}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid ' + c.pearl }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: c.navy }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontSize: 10, fontWeight: 600, minWidth: 180, position: 'sticky', left: 0, background: c.navy }}>Content</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>Region</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>Words</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>Read</th>
              {CRITERIA.map(cr => (
                <th key={cr.key} title={cr.desc} style={{ padding: '10px 6px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 9, whiteSpace: 'nowrap', cursor: 'help' }}>{cr.label}</th>
              ))}
              <th style={{ padding: '10px 8px', textAlign: 'center', color: c.gold, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>Overall</th>
              <th style={{ padding: '10px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={16} style={{ padding: 40, textAlign: 'center', color: c.slate, fontSize: 12 }}>
                {(items||[]).length === 0 ? 'No content in library yet. Create and publish pieces in the Editor to see quality scores here.' : 'No pieces match the current filters.'}
              </td></tr>
            ) : filteredItems.map((item, idx) => {
              const s = qScores[item.id];
              const words = wordCount(item);
              const readMin = Math.max(1, Math.round(words / 200)) + ' min';
              return (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid ' + c.ivory }}>
                  <td style={{ padding: '10px 12px', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: c.navy, marginBottom: 2, maxWidth: 200 }}>{item.title || 'Untitled'}</div>
                    <div style={{ fontSize: 9, color: c.slate }}>{item.typeLabel} · {item.author}</div>
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 9, color: c.slate, whiteSpace: 'nowrap' }}>{normaliseRegion(item.regions)}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: c.navy }}>{words || '—'}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, color: c.slate }}>{words ? readMin : '—'}</td>
                  {CRITERIA.map(cr => {
                    const val = s?.[cr.key];
                    const col = scoreColor(val);
                    return (
                      <td key={cr.key} style={{ padding: '6px 4px', textAlign: 'center' }}>
                        {val ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: col.bg, color: col.text, fontSize: 11, fontWeight: 700 }}>{val}</span>
                        ) : <span style={{ color: '#D1D5DB', fontSize: 14 }}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    {s?.overall ? (() => { const col = scoreColor(s.overall); return (
                      <span style={{ padding: '4px 10px', borderRadius: 12, background: col.bg, color: col.text, fontSize: 12, fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>{s.overall}</span>
                    ); })() : <span style={{ color: '#D1D5DB', fontSize: 14 }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button onClick={() => evaluateItem(item)} disabled={!!evaluating}
                      style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid ' + c.pearl, background: '#fff', color: c.teal, fontSize: 9, fontWeight: 600, cursor: evaluating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: evaluating ? 0.5 : 1 }}>
                      {evaluating === item.id ? '⏳' : '⭐ Score'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const DataTaxonomyTab = ({ items, mode, onUpdateTags }) => {
  const [activeSection, setActiveSection] = React.useState('overview');
  const [selectedTag, setSelectedTag] = React.useState(null);

  const ASSET_CLASSES = ['Multi-Asset', 'Fixed Income', 'Equities', 'Alternatives', 'FX', 'Commodities', 'Private Markets'];
  const REGIONS = ['Global', 'APAC', 'EMEA', 'LATAM', 'US'];
  const TEMPLATE_TYPES = ['Top Market Takeaways', 'Desk Commentary', 'Macro & Markets', 'Ideas & Insights', 'Morning Meeting', 'Specialist Spotlight', 'Trade Idea', 'Chart of the Week', 'Event Response', 'Video Publish'];

  // Aggregate tag usage across all items
  const allTags = {};
  items.forEach(item => (item.tags || []).forEach(tag => { allTags[tag] = (allTags[tag] || 0) + 1; }));
  const sortedTags = Object.entries(allTags).sort((a, b) => b[1] - a[1]);

  // Stats
  const stats = {
    total: items.length,
    published: items.filter(i => i.status === 'published').length,
    inReview: items.filter(i => i.status === 'in_review').length,
    draft: items.filter(i => i.status === 'draft').length,
    external: items.filter(i => i.isExternal).length,
    internal: items.filter(i => !i.isExternal).length,
    totalViews: items.reduce((a, i) => a + (i.views || 0), 0),
    byAssetClass: ASSET_CLASSES.map(ac => ({ label: ac, count: items.filter(i => i.assetClass === ac).length })).filter(x => x.count > 0),
    byTeam: [{ label: 'GIS', count: items.filter(i => i.team === 'GIS').length }, { label: 'Investment Solutions', count: items.filter(i => i.team === 'Investment Solutions').length }],
    byType: TEMPLATE_TYPES.map(t => ({ label: t, count: items.filter(i => i.typeLabel === t).length })).filter(x => x.count > 0),
  };

  const maxBar = Math.max(...stats.byAssetClass.map(x => x.count), 1);

  const taxonomySections = [
    { id: 'tags',        label: 'Tags',         icon: '🏷️' },
    { id: 'assetClasses',label: 'Asset Classes', icon: '📈' },
    { id: 'regions',     label: 'Regions',       icon: '🌍' },
    { id: 'authors',     label: 'Authors',       icon: '👤' },
    { id: 'themes',      label: 'Themes',        icon: '💡' },
    { id: 'governance',  label: 'Governance',    icon: '⚙️' },
  ];
  const dataSections = [
    { id: 'overview',    label: 'At a Glance',   icon: '📊' },
    { id: 'volume',      label: 'Volume',         icon: '📦' },
    { id: 'velocity',    label: 'Velocity',       icon: '⚡' },
    { id: 'coverage',    label: 'Coverage & Gaps',icon: '🗺️' },
    { id: 'smart',       label: 'Smart Metrics',  icon: '🧠' },
    { id: 'quality',     label: 'Quality Scores', icon: '⭐' },
  ];
  const sectionItems = mode === 'data' ? dataSections : taxonomySections;

  // Default section per mode
  React.useEffect(() => {
    setActiveSection(mode === 'data' ? 'overview' : 'tags');
  }, [mode]);

  const taggedItems = selectedTag ? items.filter(i => (i.tags || []).includes(selectedTag)) : [];

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 180px)', minHeight: 500 }}>
      {/* Sidebar */}
      <div style={{ width: 180, background: '#fff', borderRadius: '10px 0 0 10px', borderRight: '1px solid ' + c.pearl, flexShrink: 0, padding: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, marginBottom: 10, padding: '0 4px' }}>{mode === 'data' ? 'Data' : 'Taxonomy'}</div>
        {sectionItems.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: 'none', background: activeSection === s.id ? c.navy : 'transparent', color: activeSection === s.id ? '#fff' : c.slate, cursor: 'pointer', marginBottom: 2, textAlign: 'left', fontSize: 11, fontWeight: activeSection === s.id ? 600 : 400 }}>
            <span>{s.icon}</span><span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, background: '#fff', borderRadius: '0 10px 10px 0', overflowY: 'auto', padding: 24 }}>
        
        {/* OVERVIEW */}
        {activeSection === 'overview' && mode !== 'data' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Content Overview</h3>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Pieces', value: stats.total, color: c.navy, icon: '📄' },
                { label: 'Published', value: stats.published, color: '#2563EB', icon: '📤' },
                { label: 'Total Views', value: stats.totalViews.toLocaleString(), color: '#059669', icon: '👁' },
                { label: 'Awaiting Review', value: stats.inReview, color: '#D97706', icon: '⏳' },
              ].map(kpi => (
                <div key={kpi.label} style={{ padding: '16px 18px', background: kpi.color + '08', borderRadius: 8, border: '1px solid ' + kpi.color + '20' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, fontFamily: 'Georgia, serif' }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>{kpi.label}</div>
                </div>
              ))}
            </div>
            {/* Distribution vs Internal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>By Distribution</div>
                {[{ l: 'External', v: stats.external, c: c.gold }, { l: 'Internal', v: stats.internal, c: c.teal }].map(r => (
                  <div key={r.l} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: c.slate }}>{r.l}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: r.c }}>{r.v}</span>
                    </div>
                    <div style={{ height: 6, background: c.pearl, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: stats.total ? (r.v / stats.total * 100) + '%' : '0%', height: '100%', background: r.c, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>By Team</div>
                {stats.byTeam.map(r => (
                  <div key={r.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: c.slate }}>{r.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: c.navy }}>{r.count}</span>
                    </div>
                    <div style={{ height: 6, background: c.pearl, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: stats.total ? (r.count / stats.total * 100) + '%' : '0%', height: '100%', background: c.navy, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* By template type */}
            <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Content by Template Type</div>
              {stats.byType.map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: c.slate, width: 160, flexShrink: 0 }}>{t.label}</div>
                  <div style={{ flex: 1, height: 6, background: c.pearl, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: (t.count / Math.max(1, Math.max(...stats.byType.map(x => x.count))) * 100) + '%', height: '100%', background: c.teal, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.teal, width: 20, textAlign: 'right' }}>{t.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAGS */}
        {activeSection === 'tags' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: 0 }}>Tag Library</h3>
              <div style={{ fontSize: 11, color: c.slate }}>{sortedTags.length} unique tags across {stats.total} pieces</div>
            </div>
            {/* Tag cloud */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {sortedTags.map(([tag, count]) => {
                const size = Math.min(14, 10 + count * 1.5);
                const isSelected = selectedTag === tag;
                return (
                  <button key={tag} onClick={() => setSelectedTag(isSelected ? null : tag)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (isSelected ? c.teal : c.pearl), background: isSelected ? c.teal + '15' : '#fff', color: isSelected ? c.teal : c.slate, fontSize: size, cursor: 'pointer', fontWeight: isSelected ? 700 : 400, transition: 'all 0.15s' }}>
                    {tag} <span style={{ fontSize: 9, opacity: 0.7 }}>({count})</span>
                  </button>
                );
              })}
              {sortedTags.length === 0 && <div style={{ color: c.slate, fontSize: 12 }}>No tags yet — add tags to content items via the Metadata panel.</div>}
            </div>
            {/* Items using selected tag */}
            {selectedTag && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.navy, marginBottom: 12 }}>
                  {taggedItems.length} piece{taggedItems.length !== 1 ? 's' : ''} tagged <span style={{ color: c.teal }}>#{selectedTag}</span>
                </div>
                {taggedItems.map(item => (
                  <div key={item.id} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid ' + c.pearl, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: c.navy }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: c.slate, marginTop: 2 }}>{item.typeLabel} · {item.author} · {item.team}</div>
                    </div>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: item.status === 'published' ? '#DBEAFE' : item.status === 'approved' ? '#D1FAE5' : '#F3F4F6', color: item.status === 'published' ? '#2563EB' : item.status === 'approved' ? '#059669' : '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASSET CLASSES */}
        {activeSection === 'assetClasses' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Asset Class Coverage</h3>
            {stats.byAssetClass.length === 0 && <div style={{ color: c.slate, fontSize: 12 }}>No asset class data yet. Set asset class in the Metadata panel when editing content.</div>}
            {stats.byAssetClass.map(ac => {
              const acItems = items.filter(i => i.assetClass === ac.label);
              return (
                <div key={ac.label} style={{ marginBottom: 20, padding: 16, background: c.ivory, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.navy }}>{ac.label}</div>
                    <div style={{ fontSize: 11, color: c.slate }}>{ac.count} pieces</div>
                  </div>
                  <div style={{ height: 6, background: c.pearl, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ width: (ac.count / maxBar * 100) + '%', height: '100%', background: c.teal, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {acItems.map(item => (
                      <span key={item.id} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 12, background: '#fff', border: '1px solid ' + c.pearl, color: c.navy }}>
                        {item.title.length > 30 ? item.title.slice(0, 30) + '…' : item.title}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REGIONS */}
        {activeSection === 'regions' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Regional Coverage</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {REGIONS.map(region => {
                const regionItems = items.filter(i => (i.regions || []).includes(region));
                if (regionItems.length === 0) return null;
                return (
                  <div key={region} style={{ padding: 14, background: c.ivory, borderRadius: 8, border: '1px solid ' + c.pearl }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.navy, marginBottom: 6 }}>{region}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: c.teal, fontFamily: 'Georgia, serif', marginBottom: 4 }}>{regionItems.length}</div>
                    <div style={{ fontSize: 10, color: c.slate }}>{regionItems.filter(i => i.status === 'published').length} published</div>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {regionItems.slice(0, 3).map(item => (
                        <span key={item.id} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: '#fff', border: '1px solid ' + c.pearl, color: c.slate }}>
                          {item.typeLabel}
                        </span>
                      ))}
                      {regionItems.length > 3 && <span style={{ fontSize: 9, color: c.slate }}>+{regionItems.length - 3} more</span>}
                    </div>
                  </div>
                );
              })}
              {!REGIONS.some(r => items.some(i => (i.regions || []).includes(r))) && (
                <div style={{ gridColumn: '1/-1', color: c.slate, fontSize: 12 }}>No regional data yet. Set regions in the Metadata panel.</div>
              )}
            </div>
          </div>
        )}

        {/* AUTHORS */}
        {activeSection === 'authors' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Author Activity</h3>
            {[...new Set(items.map(i => i.author))].map(author => {
              const authorItems = items.filter(i => i.author === author);
              const published = authorItems.filter(i => i.status === 'published').length;
              const inReview = authorItems.filter(i => i.status === 'in_review').length;
              return (
                <div key={author} style={{ padding: 16, borderRadius: 8, border: '1px solid ' + c.pearl, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{author.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.navy }}>{author}</div>
                    <div style={{ fontSize: 10, color: c.slate, marginTop: 2 }}>{authorItems[0]?.team || '—'}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center' }}>
                    {[['Total', authorItems.length, c.navy], ['Published', published, '#2563EB']].map(([l, v, col]) => (
                      <div key={l}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: col, fontFamily: 'Georgia, serif' }}>{v}</div>
                        <div style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {inReview > 0 && (
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: '#FEF3C7', color: '#D97706', fontWeight: 700 }}>{inReview} in review</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* THEMES — rendered by ThemesSection sub-component */}
        {activeSection === 'themes' && <ThemesSection items={items} />}

        {/* GOVERNANCE */}
        {activeSection === 'governance' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Tag Governance</h3>
            {/* Tag health */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.navy, marginBottom: 12 }}>Tag Health</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Active Tags', value: sortedTags.length, color: '#1B7F4E', bg: '#E8F7F0', desc: 'In use across library' },
                  { label: 'Overused (3+)', value: sortedTags.filter(([,n]) => n >= 3).length, color: '#D97706', bg: '#FEF3C7', desc: 'May indicate over-reliance' },
                  { label: 'Single Use', value: sortedTags.filter(([,n]) => n === 1).length, color: '#6B7280', bg: '#F3F4F6', desc: 'Consider consolidating' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ padding: 14, background: kpi.bg, borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: 'Georgia, serif' }}>{kpi.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: kpi.color, marginTop: 2 }}>{kpi.label}</div>
                    <div style={{ fontSize: 10, color: c.slate, marginTop: 2 }}>{kpi.desc}</div>
                  </div>
                ))}
              </div>
              {/* Approved tag list — static master list */}
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.4 }}>Approved Tag List</div>
                  <div style={{ fontSize: 10, color: c.slate }}>{APPROVED_TAGS.length} approved tags</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {APPROVED_TAGS.map(tag => {
                    const inUse = allTags[tag] || 0;
                    return (
                      <span key={tag} style={{ padding: '4px 10px', borderRadius: 12, background: inUse > 0 ? c.teal + '12' : '#fff', border: '1px solid ' + (inUse > 0 ? c.teal + '40' : c.pearl), fontSize: 11, color: inUse > 0 ? c.teal : c.slate, fontWeight: inUse > 0 ? 600 : 400 }}>
                        {tag}{inUse > 0 && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>×{inUse}</span>}
                      </span>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: c.slate }}>
                  Teal = in use · Grey = not yet used · Tags outside this list are unapproved
                </div>
              </div>
            </div>
            <div style={{ padding: 14, background: '#EEF2FF', borderRadius: 8, border: '1px solid #C7D2FE', fontSize: 11, color: '#3730A3', lineHeight: 1.6 }}>
              ⚙️ <strong>Governance rules:</strong> Tags should be lowercase, singular where possible (e.g. "rate" not "rates"), and drawn from the approved theme taxonomy. Tag owners: GIS team owns macro/rates/equity themes. Solutions team owns product/trade/client-segment tags.
            </div>
          </div>
        )}

        {/* ── DATA MODE SECTIONS ── */}

        {/* AT A GLANCE */}
        {activeSection === 'overview' && mode === 'data' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 4px' }}>At a Glance</h3>
            <div style={{ fontSize: 11, color: c.slate, marginBottom: 20 }}>Supply-side intelligence — what are we creating, how, and by whom.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Pieces', value: stats.total, color: c.navy, icon: '📄' },
                { label: 'Published', value: stats.published, color: '#2563EB', icon: '📤' },
                { label: 'In Review', value: stats.inReview, color: '#D97706', icon: '⏳' },
                { label: 'Draft', value: stats.draft, color: '#6B7280', icon: '✏️' },
              ].map(kpi => (
                <div key={kpi.label} style={{ padding: '16px 18px', background: kpi.color + '08', borderRadius: 8, border: '1px solid ' + kpi.color + '20' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, fontFamily: 'Georgia, serif' }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>{kpi.label}</div>
                </div>
              ))}
            </div>
            {/* Top themes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Top Tags This Week</div>
                {sortedTags.slice(0, 5).map(([tag, count]) => (
                  <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: c.navy }}>#{tag}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: c.pearl, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: (count / Math.max(sortedTags[0]?.[1] || 1, 1) * 100) + '%', height: '100%', background: c.teal, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: c.teal, minWidth: 16 }}>{count}</span>
                    </div>
                  </div>
                ))}
                {sortedTags.length === 0 && <div style={{ fontSize: 11, color: c.slate }}>No tags yet</div>}
              </div>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Bottlenecks</div>
                {items.filter(i => i.status === 'in_review').length > 0 ? (
                  items.filter(i => i.status === 'in_review').map(item => (
                    <div key={item.id} style={{ marginBottom: 8, padding: '6px 10px', background: '#FEF3C7', borderRadius: 6, fontSize: 11, color: '#92400E' }}>
                      ⏳ {item.title.slice(0, 35)}{item.title.length > 35 ? '…' : ''} — {item.reviewer ? 'With ' + item.reviewer : 'Unassigned'}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 11, color: '#1B7F4E' }}>✓ No bottlenecks — nothing stuck in review</div>
                )}
              </div>
            </div>
            {/* Creation nudges */}
            <div style={{ padding: 14, background: '#F0FDF4', borderRadius: 8, border: '1px solid #86EFAC', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 6 }}>💡 Creation nudges</div>
              {stats.byAssetClass.filter(ac => ac.count === 0 || ac.count < 1).length > 0 && (
                <div style={{ fontSize: 11, color: '#166534', marginBottom: 4 }}>• Under-covered: {['Alternatives', 'FX', 'Commodities'].filter(ac => !stats.byAssetClass.find(x => x.label === ac && x.count > 0)).join(', ') || 'All asset classes covered'}</div>
              )}
              {items.filter(i => !i.isExternal).length > items.filter(i => i.isExternal).length && (
                <div style={{ fontSize: 11, color: '#166534', marginBottom: 4 }}>• Internal content ({items.filter(i => !i.isExternal).length}) outweighs external ({items.filter(i => i.isExternal).length}) — consider more client-facing pieces</div>
              )}
              <div style={{ fontSize: 11, color: '#166534' }}>• {items.filter(i => i.status === 'draft').length} piece{items.filter(i => i.status === 'draft').length !== 1 ? 's' : ''} in draft — push to review to maintain cadence</div>
            </div>
          </div>
        )}

        {/* VOLUME */}
        {activeSection === 'volume' && mode === 'data' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Volume & Output</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>By Asset Class</div>
                {ASSET_CLASSES.map(ac => {
                  const n = items.filter(i => i.assetClass === ac).length;
                  return (
                    <div key={ac} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: c.slate, width: 100, flexShrink: 0 }}>{ac}</div>
                      <div style={{ flex: 1, height: 6, background: c.pearl, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: (n / Math.max(1, items.length) * 100) + '%', height: '100%', background: n > 0 ? c.teal : c.pearl, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: n > 0 ? c.teal : c.slate, width: 20, textAlign: 'right' }}>{n}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>By Template Type</div>
                {stats.byType.map(t => (
                  <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: c.slate, width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                    <div style={{ flex: 1, height: 6, background: c.pearl, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: (t.count / Math.max(1, Math.max(...stats.byType.map(x => x.count))) * 100) + '%', height: '100%', background: c.navy, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: c.navy, width: 20, textAlign: 'right' }}>{t.count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 14, background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE', fontSize: 11, color: '#1E40AF' }}>
              📊 <strong>Mix insight:</strong> {stats.byType[0]?.label || 'No content'} is your highest-volume format at {stats.byType[0]?.count || 0} pieces. {stats.byType.length > 1 ? 'Consider whether this reflects your strategic priorities.' : ''}
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {activeSection === 'velocity' && mode === 'data' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Velocity & Timeliness</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Avg Draft→Review', value: '1.2 days', trend: '↑ 0.3d vs last week', trendUp: false },
                { label: 'Avg Review→Approved', value: '2.1 days', trend: '↓ 0.5d vs last week', trendUp: true },
                { label: 'Avg Idea→Published', value: '4.8 days', trend: 'Stable', trendUp: null },
              ].map(m => (
                <div key={m.label} style={{ padding: 16, background: c.ivory, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: c.navy, fontFamily: 'Georgia, serif', marginBottom: 4 }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: m.trendUp === true ? '#1B7F4E' : m.trendUp === false ? '#B84242' : c.slate }}>{m.trend}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 16, background: c.ivory, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Recent workflow stages</div>
              {items.flatMap(item => (item.history || []).map(h => ({ ...h, itemTitle: item.title, itemId: item.id }))).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8).map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid ' + c.pearl }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: { submitted: '#D97706', approved: '#1B7F4E', published: '#2563EB', created: c.slate, changes_requested: '#B84242' }[h.action] || c.slate, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: c.navy }}>{h.itemTitle.slice(0, 40)}{h.itemTitle.length > 40 ? '…' : ''}</span>
                    <span style={{ fontSize: 10, color: c.slate }}> — {h.action.replace(/_/g, ' ')} by {h.by}</span>
                  </div>
                  <div style={{ fontSize: 10, color: c.slate, flexShrink: 0 }}>{new Date(h.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                </div>
              ))}
            </div>

            {/* Full Audit Trail */}
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 400, color: c.navy, margin: '0 0 14px' }}>Full Activity Log</h4>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + c.pearl, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px 100px', gap: 0, background: c.ivory, padding: '8px 14px', borderBottom: '1px solid ' + c.pearl }}>
                  {['Time', 'Content', 'Action by', 'Status'].map(h => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: c.slate }}>{h}</div>
                  ))}
                </div>
                {/* Rows */}
                {items
                  .flatMap(item => (item.history || []).map(h => ({
                    ...h,
                    itemTitle: item.title,
                    itemType: item.typeLabel,
                    itemTeam: item.team,
                    itemId: item.id,
                    itemStatus: item.status,
                  })))
                  .sort((a, b) => new Date(b.at) - new Date(a.at))
                  .map((h, i) => {
                    const actionColors = {
                      created:           { bg: '#F3F4F6', color: '#6B7280',  label: 'Created'          },
                      submitted:         { bg: '#FEF3C7', color: '#D97706',  label: 'Submitted'        },
                      approved:          { bg: '#D1FAE5', color: '#059669',  label: 'Approved'         },
                      published:         { bg: '#DBEAFE', color: '#2563EB',  label: 'Published'        },
                      changes_requested: { bg: '#FEE2E2', color: '#DC2626',  label: 'Changes Requested'},
                      resubmitted:       { bg: '#FEF3C7', color: '#D97706',  label: 'Resubmitted'      },
                      archived:          { bg: '#F3F4F6', color: '#9CA3AF',  label: 'Archived'         },
                    };
                    const ac = actionColors[h.action] || actionColors.created;
                    const d = new Date(h.at);
                    const timeStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px 100px', gap: 0, padding: '9px 14px', borderBottom: '1px solid ' + c.ivory, background: i % 2 === 0 ? '#fff' : '#FAFAFA', alignItems: 'start' }}>
                        <div style={{ fontSize: 10, color: c.slate, paddingTop: 1 }}>{timeStr}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: c.navy, lineHeight: 1.3 }}>{h.itemTitle}</div>
                          <div style={{ fontSize: 9, color: c.slate, marginTop: 2 }}>{h.itemType} · {h.itemTeam}</div>
                          {h.comment && <div style={{ fontSize: 10, color: c.navy, marginTop: 3, fontStyle: 'italic', lineHeight: 1.4, padding: '3px 8px', background: '#F8F8F8', borderRadius: 4 }}>"{h.comment}"</div>}
                        </div>
                        <div style={{ fontSize: 10, color: c.slate, paddingTop: 1 }}>{h.by}</div>
                        <div>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: ac.bg, color: ac.color, fontWeight: 700 }}>{ac.label}</span>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        )}

        {/* COVERAGE & GAPS */}
        {activeSection === 'coverage' && mode === 'data' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 20px' }}>Coverage & Gaps</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Asset Class Coverage</div>
                {ASSET_CLASSES.map(ac => {
                  const n = items.filter(i => i.assetClass === ac).length;
                  const hasCoverage = n > 0;
                  return (
                    <div key={ac} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '5px 8px', borderRadius: 5, background: hasCoverage ? '#fff' : '#FEF2F2', border: '1px solid ' + (hasCoverage ? c.pearl : '#FCA5A5') }}>
                      <span style={{ fontSize: 12 }}>{hasCoverage ? '✓' : '⚠'}</span>
                      <span style={{ fontSize: 11, flex: 1, color: hasCoverage ? c.navy : '#B84242', fontWeight: hasCoverage ? 400 : 500 }}>{ac}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: hasCoverage ? c.teal : '#B84242' }}>{n} piece{n !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: 16, background: c.ivory, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.slate, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Regional Gaps</div>
                {REGIONS.map(region => {
                  const n = items.filter(i => (i.regions || []).includes(region)).length;
                  const hasCoverage = n > 0;
                  return (
                    <div key={region} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '5px 8px', borderRadius: 5, background: hasCoverage ? '#fff' : '#FFF7ED', border: '1px solid ' + (hasCoverage ? c.pearl : '#FED7AA') }}>
                      <span style={{ fontSize: 12 }}>{hasCoverage ? '✓' : '○'}</span>
                      <span style={{ fontSize: 11, flex: 1, color: hasCoverage ? c.navy : '#92400E' }}>{region}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: hasCoverage ? c.teal : '#92400E' }}>{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: 14, background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA', fontSize: 11, color: '#991B1B', lineHeight: 1.7 }}>
              🗺️ <strong>Gap summary:</strong> {ASSET_CLASSES.filter(ac => !items.some(i => i.assetClass === ac)).join(', ') || 'No asset class gaps'} {ASSET_CLASSES.filter(ac => !items.some(i => i.assetClass === ac)).length > 0 ? 'have no content yet.' : ''} {REGIONS.filter(r => !items.some(i => (i.regions||[]).includes(r))).length > 0 ? `Regional gaps: ${REGIONS.filter(r => !items.some(i => (i.regions||[]).includes(r))).join(', ')}.` : ''}
            </div>
          </div>
        )}

        {/* SMART METRICS */}
        {activeSection === 'smart' && mode === 'data' && (
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: c.navy, margin: '0 0 4px' }}>Smart Metrics</h3>
            <div style={{ fontSize: 11, color: c.slate, marginBottom: 20 }}>Derived signals — content density, originality, strategic alignment, and redundancy.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Content Density Score', value: Math.min(100, Math.round(items.length / 0.1)), desc: 'How saturated the library is relative to coverage targets', color: '#6366F1', suffix: '/100' },
                { label: 'Originality Score', value: Math.round((items.filter(i => !i.tags?.some(t => items.filter(j => j.id !== i.id).some(j => j.tags?.includes(t)))).length / Math.max(1, items.length)) * 100), desc: 'Estimated % of content that covers unique ground', color: '#059669', suffix: '%' },
                { label: 'Strategic Alignment', value: Math.round((items.filter(i => i.isExternal).length / Math.max(1, items.length)) * 100), desc: 'External-facing content as % of total output', color: c.teal, suffix: '%' },
                { label: 'Redundancy Risk', value: sortedTags.filter(([,n]) => n >= 3).length, desc: 'Tags used 3+ times — themes that may be over-covered', color: '#D97706', suffix: ' tags' },
              ].map(m => (
                <div key={m.label} style={{ padding: 20, background: m.color + '08', borderRadius: 10, border: '1px solid ' + m.color + '25' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: m.color, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{m.value}<span style={{ fontSize: 14 }}>{m.suffix}</span></div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.navy, margin: '8px 0 4px' }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: c.slate, lineHeight: 1.5 }}>{m.desc}</div>
                </div>
              ))}
            </div>
            {/* Redundancy alerts */}
            <div style={{ padding: 16, background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', marginBottom: 8 }}>⚠ Redundancy Alerts</div>
              {sortedTags.filter(([,n]) => n >= 3).length > 0 ? (
                sortedTags.filter(([,n]) => n >= 3).map(([tag, count]) => (
                  <div key={tag} style={{ fontSize: 11, color: '#92400E', marginBottom: 4 }}>
                    • <strong>#{tag}</strong> appears {count} times — you may be writing similar pieces on this theme. Review for duplication.
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: '#1B7F4E' }}>✓ No redundancy alerts — tag usage looks healthy.</div>
              )}
            </div>
          </div>
        )}


        {activeSection === 'quality' && mode === 'data' && (
          <QualityScoresSection items={items} />
        )}

      </div>
    </div>
  );
};


// ============================================================
// TRANSLATIONS SYSTEM
// ============================================================
// ============================================================
// TRANSLATIONS SYSTEM — v15
// ============================================================
const ALL_LANGUAGES = [
  { id: 'zh-CN', label: 'Chinese (Simplified)',  flag: '🇨🇳', dir: 'ltr' },
  { id: 'zh-TW', label: 'Chinese (Traditional)', flag: '🇹🇼', dir: 'ltr' },
  { id: 'es',    label: 'Spanish',               flag: '🇪🇸', dir: 'ltr' },
  { id: 'pt',    label: 'Portuguese',             flag: '🇧🇷', dir: 'ltr' },
  { id: 'de',    label: 'German',                 flag: '🇩🇪', dir: 'ltr' },
  { id: 'it',    label: 'Italian',                flag: '🇮🇹', dir: 'ltr' },
  { id: 'fr',    label: 'French',                 flag: '🇫🇷', dir: 'ltr' },
  { id: 'ar',    label: 'Arabic',                 flag: '🇦🇪', dir: 'rtl' },
];

const LANG_DISCLAIMERS = {
  'zh-CN': '本材料仅供参考，不构成投资建议。过往业绩不代表未来表现。摩根大通私人银行',
  'zh-TW': '本材料僅供參考，不構成投資建議。過往業績不代表未來表現。摩根大通私人銀行',
  'es': 'Este material es solo para fines informativos y no constituye asesoramiento en materia de inversión. El rendimiento pasado no es indicativo de resultados futuros. J.P. Morgan Private Bank',
  'pt': 'Este material é apenas para fins informativos e não constitui aconselhamento de investimento. O desempenho passado não é indicativo de resultados futuros. J.P. Morgan Private Bank',
  'de': 'Dieses Material dient ausschließlich Informationszwecken und stellt keine Anlageberatung dar. Die Wertentwicklung in der Vergangenheit ist kein Indikator für zukünftige Ergebnisse. J.P. Morgan Private Bank',
  'it': 'Questo materiale è solo a scopo informativo e non costituisce una consulenza in materia di investimenti. I rendimenti passati non sono indicativi di risultati futuri. J.P. Morgan Private Bank',
  'fr': 'Ce document est fourni à titre informatif uniquement et ne constitue pas un conseil en investissement. Les performances passées ne préjugent pas des performances futures. J.P. Morgan Private Bank',
  'ar': 'هذه المادة لأغراض إعلامية فقط ولا تُعدّ نصيحة استثمارية. الأداء السابق لا يُعدّ مؤشراً على النتائج المستقبلية. جي بي مورغان للخدمات المصرفية الخاصة',
};

const TranslationsTab = ({ templateId, content, isExternal, targetLanguages, translations, onTranslate, onApprove, onReject, libraryItems, allTranslations, allTargetLanguages, onTranslateLibraryItem }) => {
  const [selectedLang, setSelectedLang] = React.useState(targetLanguages[0] || ALL_LANGUAGES[0].id);
  const [viewMode, setViewMode] = React.useState('preview');

  const activeLang = ALL_LANGUAGES.find(l => l.id === selectedLang) || ALL_LANGUAGES[0];

  const statusConfig = {
    idle:        { label: 'Not translated', color: '#999',    bg: '#f5f5f5',    dot: '#ccc'    },
    translating: { label: 'Translating…',   color: '#E08A00', bg: '#FFF7E6',    dot: '#E08A00' },
    done:        { label: 'Translated',      color: '#1B7F4E', bg: '#E8F7F0',    dot: '#1B7F4E' },
    error:       { label: 'Error',           color: '#B84242', bg: '#FDF0F0',    dot: '#B84242' },
  };
  const approvalConfig = {
    pending:  { label: 'Awaiting review', color: '#E08A00', bg: '#FFF7E6' },
    approved: { label: 'Approved',        color: '#1B7F4E', bg: '#E8F7F0' },
    rejected: { label: 'Changes needed',  color: '#B84242', bg: '#FDF0F0' },
  };

  // sc and ac derived below after status/approvalStatus are set

  // Content picker state — lets user select any approved library piece
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerSearch, setPickerSearch] = React.useState('');
  const [localLangSelection, setLocalLangSelection] = React.useState([]);
  const toggleLocalLang = (langId) => setLocalLangSelection(prev => prev.includes(langId) ? prev.filter(l => l !== langId) : [...prev, langId]);
  const approvedItems = (libraryItems || []).filter(i => i.status === 'published' || i.status === 'approved');
  const filteredPicker = approvedItems.filter(i =>
    !pickerSearch || i.title.toLowerCase().includes(pickerSearch.toLowerCase()) || i.author.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  // Active source: either the current editor content or a selected library piece
  const [selectedLibraryItem, setSelectedLibraryItem] = React.useState(null);
  const activeContent = selectedLibraryItem ? (selectedLibraryItem._content || content) : content;
  const activeTemplateId = selectedLibraryItem ? selectedLibraryItem.type : templateId;
  const activeIsExternal = selectedLibraryItem ? selectedLibraryItem.isExternal : isExternal;
  // Translations for the active source
  const activeTranslations = selectedLibraryItem
    ? ((allTranslations || {})[selectedLibraryItem.type] || {})
    : translations;
  const activeTargetLangs = selectedLibraryItem
    ? (localLangSelection.length > 0 ? localLangSelection : ((allTargetLanguages || {})[selectedLibraryItem.type] || []))
    : targetLanguages;
  const handleTranslate = (langId) => {
    if (selectedLibraryItem) {
      onTranslateLibraryItem && onTranslateLibraryItem(selectedLibraryItem.type, langId, activeContent, activeIsExternal, activeTargetLangs);
    } else {
      onTranslate(langId);
    }
  };
  const handleApprove = (langId) => onApprove(langId);
  const handleReject = (langId) => onReject(langId);

  // Derive status from the ACTIVE source (editor or selected library item)
  const translation = activeTranslations[selectedLang];
  const status = translation?.status || 'idle';
  const approvalStatus = translation?.approvalStatus || 'pending';
  const hasContent = activeContent && (activeContent.title || (activeContent.sections || []).some(s => s.content) || activeContent.marketUpdate);
  const translatedContent = translation?.data || null;
  const sc = statusConfig[status] || statusConfig.idle;
  const ac = approvalConfig[approvalStatus] || approvalConfig.pending;

  // Derive full text from content for display
  const getOriginalSections = (src) => {
    const sections = [];
    if (!src) return sections;
    if (src.marketUpdate) sections.push({ title: 'Market Update', content: src.marketUpdate });
    if (src.focusSections) src.focusSections.filter(f => f.content).forEach(f => sections.push({ title: f.title, content: f.content }));
    if (src.sections) src.sections.filter(s => s.content).forEach(s => sections.push({ id: s.id, title: s.title, content: s.content }));
    if (src.updates) src.updates.filter(u => u.content).forEach(u => sections.push({ title: u.title, content: u.content }));
    return sections;
  };

  const originalSections = getOriginalSections(activeContent);

  return (
    <div>
      {/* ── CONTENT SOURCE PICKER ── */}
      <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid ' + c.pearl, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>Translating:</div>
        <div style={{ flex: 1 }}>
          {selectedLibraryItem ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.navy }}>{selectedLibraryItem.title}</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: c.ivory, color: c.slate }}>{selectedLibraryItem.typeLabel}</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#D1FAE5', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>{selectedLibraryItem.status}</span>
                <button onClick={() => setSelectedLibraryItem(null)}
                  style={{ fontSize: 10, color: c.slate, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>✕ Clear</button>
              </div>
              {/* Inline language selector */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + c.ivory }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: c.slate, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Select languages to translate:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {ALL_LANGUAGES.map(lang => {
                    const sel = localLangSelection.includes(lang.id);
                    const done = activeTranslations[lang.id]?.status === 'done';
                    return (
                      <button key={lang.id} onClick={() => toggleLocalLang(lang.id)}

                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 12, border: '1px solid ' + (sel ? c.teal : c.pearl), background: sel ? c.teal + '12' : '#fff', cursor: 'pointer', fontSize: 10, color: sel ? c.teal : c.slate, fontWeight: sel ? 600 : 400 }}>
                        <span>{lang.flag}</span>
                        <span>{lang.label.split(' ')[0]}</span>
                        {done && <span style={{ fontSize: 8, color: '#1B7F4E' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                {localLangSelection.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => localLangSelection.forEach(l => handleTranslate(l))}
                      style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: c.teal, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      ✨ Translate {localLangSelection.length} language{localLangSelection.length > 1 ? 's' : ''}
                    </button>
                    <button onClick={() => setLocalLangSelection([])}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, background: '#fff', color: c.slate, fontSize: 11, cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: c.slate }}>Current editor content</span>
          )}
        </div>
        <button onClick={() => setShowPicker(!showPicker)}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid ' + c.pearl, background: showPicker ? c.navy : '#fff', color: showPicker ? '#fff' : c.navy, fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
          {showPicker ? '✕ Close' : '📚 Select from Library'}
        </button>
      </div>

      {/* Library picker dropdown */}
      {showPicker && (
        <div style={{ marginBottom: 14, background: '#fff', borderRadius: 8, border: '1px solid ' + c.pearl, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + c.pearl }}>
            <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search approved content…"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none' }} />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filteredPicker.length === 0 && (
              <div style={{ padding: '20px 14px', color: c.slate, fontSize: 11, textAlign: 'center' }}>No published or approved content found</div>
            )}
            {filteredPicker.map(item => (
              <button key={item.id} onClick={() => { setSelectedLibraryItem(item); setShowPicker(false); setLocalLangSelection([]); setPickerSearch(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: 'none', borderBottom: '1px solid ' + c.ivory, background: selectedLibraryItem?.id === item.id ? c.teal + '10' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: c.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: c.slate, marginTop: 2 }}>{item.typeLabel} · {item.author} · {item.team}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {item.isExternal && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: c.gold + '20', color: c.gold, fontWeight: 700 }}>EXT</span>}
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: item.status === 'published' ? '#DBEAFE' : '#D1FAE5', color: item.status === 'published' ? '#2563EB' : '#059669', fontWeight: 700, textTransform: 'uppercase' }}>{item.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 240px)', minHeight: 460 }}>

      {/* ── LANGUAGE SIDEBAR ── */}
      <div style={{ width: 210, background: '#fff', borderRadius: '10px 0 0 10px', borderRight: '1px solid ' + c.pearl, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + c.pearl }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: c.gold, marginBottom: 3 }}>Languages</div>
          <div style={{ fontSize: 10, color: c.slate }}>Select languages in Metadata panel</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {activeTargetLangs.length === 0 ? (
            <div style={{ padding: '16px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🌍</div>
              <div style={{ fontSize: 11, color: c.slate, lineHeight: 1.5 }}>No languages selected. Open the Metadata panel and choose languages to translate to.</div>
            </div>
          ) : activeTargetLangs.map(langId => {
            const lang = ALL_LANGUAGES.find(l => l.id === langId);
            if (!lang) return null;
            const t = activeTranslations[langId];
            const st = t?.status || 'idle';
            const ap = t?.approvalStatus || 'pending';
            const scc = statusConfig[st] || statusConfig.idle;
            const isActive = selectedLang === langId;
            const needsApproval = isExternal && st === 'done' && ap !== 'approved';
            return (
              <button key={langId} onClick={() => setSelectedLang(langId)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 7, border: 'none', background: isActive ? c.navy : 'transparent', color: isActive ? '#fff' : c.navy, cursor: 'pointer', marginBottom: 2, textAlign: 'left' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{lang.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lang.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.5)' : scc.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: isActive ? 'rgba(255,255,255,0.65)' : scc.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {needsApproval ? 'Needs review' : scc.label}
                    </span>
                  </div>
                </div>
                {needsApproval && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 8, background: '#E08A00', color: '#fff', fontWeight: 700 }}>!</span>}
              </button>
            );
          })}
        </div>

        {/* Translate all idle */}
        {activeTargetLangs.length > 0 && hasContent && (
          <div style={{ padding: 12, borderTop: '1px solid ' + c.pearl }}>
            <button onClick={() => activeTargetLangs.filter(l => !activeTranslations[l] || activeTranslations[l].status === 'idle' || activeTranslations[l].status === 'error').forEach(l => handleTranslate(l))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: 'none', background: c.teal, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ✨ Translate All
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN PANEL ── */}
      <div style={{ flex: 1, background: '#fff', borderRadius: '0 10px 10px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Panel header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + c.pearl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{activeLang.flag}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.navy }}>{activeLang.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                <span style={{ fontSize: 10, color: sc.color, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 500 }}>{sc.label}</span>
                {isExternal && status === 'done' && (
                  <>
                    <span style={{ color: c.slate, fontSize: 10 }}>·</span>
                    <span style={{ fontSize: 10, color: ac.color, fontWeight: 600 }}>{ac.label}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: c.ivory, borderRadius: 6, padding: 2 }}>
              {['preview', 'compare'].map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={{ padding: '5px 12px', borderRadius: 4, border: 'none', fontSize: 10, cursor: 'pointer', fontWeight: 500, background: viewMode === m ? '#fff' : 'transparent', color: viewMode === m ? c.navy : c.slate, boxShadow: viewMode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                  {m === 'preview' ? '👁 Preview' : '⇄ Compare'}
                </button>
              ))}
            </div>
            {/* Translate button */}
            {status !== 'translating' && hasContent && (
              <button onClick={() => handleTranslate(selectedLang)}
                style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: status === 'done' ? c.slate : c.teal, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {status === 'done' ? '↻ Re-translate' : '✨ Translate'}
              </button>
            )}
            {status === 'translating' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: c.ivory, borderRadius: 6, fontSize: 11, color: c.slate }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid ' + c.gold, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                Translating…
              </div>
            )}
          </div>
        </div>

        {/* External approval bar — shows when external content is translated but not yet approved */}
        {isExternal && status === 'done' && approvalStatus !== 'approved' && (
          <div style={{ padding: '10px 20px', background: approvalStatus === 'rejected' ? '#FDF0F0' : '#FFF7E6', borderBottom: '1px solid ' + (approvalStatus === 'rejected' ? '#F5C6C6' : '#F5E6C6'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: approvalStatus === 'rejected' ? '#B84242' : '#E08A00' }}>
                {approvalStatus === 'rejected' ? '⚠ Changes requested — re-translate or edit before approving' : '🔍 External content — requires approval before distribution'}
              </div>
              <div style={{ fontSize: 10, color: c.slate, marginTop: 2 }}>Review the translation below, then approve or mark for changes.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onReject(selectedLang)}
                style={{ padding: '6px 14px', borderRadius: 5, border: '1px solid #B84242', background: '#fff', color: '#B84242', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                ✕ Needs Changes
              </button>
              <button onClick={() => onApprove(selectedLang)}
                style={{ padding: '6px 14px', borderRadius: 5, border: 'none', background: '#1B7F4E', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                ✓ Approve for Distribution
              </button>
            </div>
          </div>
        )}

        {/* Approved badge */}
        {isExternal && status === 'done' && approvalStatus === 'approved' && (
          <div style={{ padding: '8px 20px', background: '#E8F7F0', borderBottom: '1px solid #B6E0C8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1B7F4E' }}>Approved for distribution</span>
            {translation?.approvedAt && <span style={{ fontSize: 10, color: '#4A7A5E' }}>· {new Date(translation.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        )}

        {/* No content prompt */}
        {!hasContent && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 36 }}>🌍</span>
            <div style={{ fontSize: 14, fontWeight: 500, color: c.navy }}>No content to translate yet</div>
            <div style={{ fontSize: 12, color: c.slate }}>Write content in the Editor tab first, then come back here to translate.</div>
          </div>
        )}

        {/* Content area */}
        {hasContent && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {viewMode === 'compare' ? (
              // ── COMPARE VIEW ──
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                {/* Original */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: c.slate, marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid ' + c.pearl }}>🇬🇧 English (Original)</div>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 300, color: '#000', marginBottom: 14, lineHeight: 1.3 }}>{activeContent.title || 'Untitled'}</h2>
                  {originalSections.map((s, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      {s.title && <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9B8579', letterSpacing: 0.5, marginBottom: 5 }}>{s.title}</div>}
                      <div style={{ fontSize: 13, lineHeight: 1.75, color: '#333' }} dangerouslySetInnerHTML={{ __html: s.content }} />
                    </div>
                  ))}
                </div>
                {/* Translation */}
                <div style={{ direction: activeLang.dir }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: c.slate, marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid ' + c.pearl }}>
                    {activeLang.flag} {activeLang.label}
                  </div>
                  {translatedContent ? (
                    <>
                      <h2 style={{ fontFamily: activeLang.dir === 'rtl' ? 'system-ui' : 'Georgia, serif', fontSize: 17, fontWeight: 300, color: '#000', marginBottom: 14, lineHeight: 1.4 }}>{translatedContent.title}</h2>
                      {(translatedContent.sections || []).map((s, i) => (
                        <div key={i} style={{ marginBottom: 16 }}>
                          {s.title && <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9B8579', letterSpacing: 0.5, marginBottom: 5 }}>{s.title}</div>}
                          <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333', fontFamily: activeLang.dir === 'rtl' || activeLang.id.startsWith('zh') ? 'system-ui' : 'inherit' }} dangerouslySetInnerHTML={{ __html: translatedContent.sections[i]?.content || '' }} />
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: c.slate, fontSize: 12 }}>Press "Translate" to generate this translation</div>
                  )}
                </div>
              </div>
            ) : (
              // ── PREVIEW VIEW — JPM-styled output ──
              <div style={{ maxWidth: 680, margin: '0 auto', direction: activeLang.dir }}>
                {/* JPM header */}
                <div style={{ paddingBottom: 20, borderBottom: '1px solid #E8E8E8', marginBottom: 28 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, letterSpacing: '-0.02em', color: '#000', lineHeight: 1 }}>J.P.Morgan</span>
                    <span style={{ fontSize: 9, color: '#9B8579', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, marginTop: 2 }}>PRIVATE BANK</span>
                  </div>
                </div>

                {translatedContent ? (
                  <>
                    {/* Language badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 12, background: '#F0FAF4', border: '1px solid #B6E0C8', marginBottom: 16 }}>
                      <span style={{ fontSize: 13 }}>{activeLang.flag}</span>
                      <span style={{ fontSize: 10, color: '#1B7F4E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{activeLang.label}</span>
                      {isExternal && approvalStatus === 'approved' && <span style={{ fontSize: 9, color: '#1B7F4E' }}>· ✓ Approved</span>}
                      {isExternal && approvalStatus !== 'approved' && approvalStatus !== 'rejected' && <span style={{ fontSize: 9, color: '#E08A00' }}>· Pending approval</span>}
                    </div>

                    <h1 style={{ fontFamily: activeLang.dir === 'rtl' || activeLang.id.startsWith('zh') ? 'system-ui, sans-serif' : 'Georgia, serif', fontSize: 30, fontWeight: 300, color: '#000', margin: '0 0 18px', lineHeight: 1.2, letterSpacing: activeLang.dir === 'rtl' || activeLang.id.startsWith('zh') ? 0 : '-0.02em' }}>
                      {translatedContent.title}
                    </h1>

                    <div style={{ fontSize: 12, color: '#717171', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #E8E8E8' }}>
                      {new Date().toLocaleDateString(activeLang.id, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>

                    <div style={{ fontSize: 15, lineHeight: 1.85, color: '#333' }}>
                      {(translatedContent.sections || []).map((s, i) => (
                        <div key={i} style={{ marginBottom: 24 }}>
                          {s.title && (
                            <h2 style={{ fontFamily: activeLang.dir === 'rtl' || activeLang.id.startsWith('zh') ? 'system-ui' : 'Georgia, serif', fontSize: 19, fontWeight: 300, color: '#000', marginBottom: 10 }}>{s.title}</h2>
                          )}
                          <div style={{ fontFamily: activeLang.dir === 'rtl' || activeLang.id.startsWith('zh') ? 'system-ui, sans-serif' : 'inherit' }} dangerouslySetInnerHTML={{ __html: s.content }} />
                        </div>
                      ))}
                    </div>

                    {/* Localised disclaimer */}
                    <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid #E8E8E8', fontSize: 10, color: '#999', lineHeight: 1.6, fontFamily: activeLang.dir === 'rtl' || activeLang.id.startsWith('zh') ? 'system-ui' : 'inherit' }}>
                      {LANG_DISCLAIMERS[activeLang.id] || 'This material is for informational purposes only and does not constitute investment advice. J.P. Morgan Private Bank'}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '60px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 14 }}>{activeLang.flag}</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: c.navy, marginBottom: 8 }}>Ready to translate into {activeLang.label}</div>
                    <div style={{ fontSize: 12, color: c.slate, marginBottom: 20 }}>Click Translate to generate a professional financial translation of the full article.</div>
                    <button onClick={() => handleTranslate(selectedLang)}
                      style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: c.teal, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✨ Translate into {activeLang.label}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    </div>
    </div>
  );
};



// ── Excel Data Connector ──────────────────────────────────────────────────────
const ExcelConnectorModal = ({ isOpen, onClose, onInsert }) => {
  const [sheets, setSheets] = React.useState([]);
  const [workbook, setWorkbook] = React.useState(null);
  const [fileName, setFileName] = React.useState('');
  const [activeSheet, setActiveSheet] = React.useState('');
  const [tables, setTables] = React.useState([]);   // { id, name, range, headers, rows }
  const [selected, setSelected] = React.useState(null);
  const [chartType, setChartType] = React.useState('Bar');
  const [xCol, setXCol] = React.useState(0);
  const [yCols, setYCols] = React.useState([1]);
  const [step, setStep] = React.useState(1); // 1=upload, 2=select sheet, 3=select range, 4=preview

  const parseFile = (file) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        
        const wb = XLSX.read(e.target.result, { type: 'array' });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setActiveSheet(wb.SheetNames[0]);
        setStep(2);
      } catch(err) {
        alert('Could not read file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  React.useEffect(() => {
    if (!workbook || !activeSheet) return;
    
    const ws = workbook.Sheets[activeSheet];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'dd-mmm-yyyy' });
    // Detect tables: find contiguous blocks of data
    const detected = [];
    let inBlock = false, startRow = 0;
    for (let r = 0; r <= json.length; r++) {
      const hasData = r < json.length && json[r].some(c => c !== '');
      if (hasData && !inBlock) { inBlock = true; startRow = r; }
      if (!hasData && inBlock) {
        inBlock = false;
        const rows = json.slice(startRow, r).filter(row => row.some(c => c !== ''));
        if (rows.length >= 2) {
          const headers = rows[0].map((h, i) => h !== '' ? String(h) : 'Col '+(i+1));
          const dataRows = rows.slice(1).map(row => row.map(v => v !== undefined && v !== null ? String(v) : ''));
          detected.push({ id: 'table_'+startRow, name: 'Table (rows '+(startRow+1)+'-'+r+')', headers, rows: dataRows });
        }
      }
    }
    setTables(detected.length ? detected : []);
    if (detected.length) setSelected(detected[0]);
    setStep(3);
  }, [workbook, activeSheet]);

  const preview = selected && selected.rows.length > 0;

  const doInsert = () => {
    if (!selected) return;
    onInsert({
      fileName, sheetName: activeSheet,
      tableName: selected.name, headers: selected.headers,
      rows: selected.rows, chartType, xCol, yCols,
      id: 'xl_' + Date.now(),
    });
    onClose();
  };

  if (!isOpen) return null;

  const jpm = { navy:'#0A1A2F', gold:'#C1A364', pearl:'#E8E0D0', ivory:'#F7F4EF', slate:'#4A5568' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:12, width:700, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', background:jpm.navy, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'Georgia, serif', fontSize:16, color:'#fff' }}>📊 Excel Data Connector</div>
            {fileName && <div style={{ fontSize:10, color:jpm.gold, marginTop:2 }}>{fileName}{activeSheet ? ' → '+activeSheet : ''}</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:18, cursor:'pointer', opacity:0.7 }}>✕</button>
        </div>

        <div style={{ flex:1, overflow:'auto', padding:20 }}>
          {/* Step 1: Upload */}
          {step === 1 && (
            <label style={{ display:'block', border:'2px dashed '+jpm.pearl, borderRadius:10, padding:48, textAlign:'center', cursor:'pointer', background:jpm.ivory }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
              <div style={{ fontSize:15, fontWeight:600, color:jpm.navy, marginBottom:6 }}>Upload Excel File</div>
              <div style={{ fontSize:12, color:jpm.slate }}>Drag & drop or click to browse. Supports .xlsx and .xls</div>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }} />
            </label>
          )}

          {/* Step 2: Sheet selector */}
          {step >= 2 && sheets.length > 1 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:jpm.slate, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Select Sheet</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {sheets.map(s => (
                  <button key={s} onClick={() => setActiveSheet(s)}
                    style={{ padding:'6px 14px', borderRadius:6, border:'1px solid '+(activeSheet===s?jpm.navy:jpm.pearl), background:activeSheet===s?jpm.navy:'#fff', color:activeSheet===s?'#fff':jpm.slate, fontSize:12, cursor:'pointer', fontWeight:activeSheet===s?600:400 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Table selector */}
          {step >= 3 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:jpm.slate, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Detected Data Sets {tables.length === 0 && <span style={{ color:'#EF4444' }}>— No tables found</span>}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                {tables.map(t => (
                  <button key={t.id} onClick={() => setSelected(t)}
                    style={{ padding:'6px 14px', borderRadius:6, border:'1px solid '+(selected?.id===t.id?jpm.gold:jpm.pearl), background:selected?.id===t.id?jpm.gold+'20':'#fff', color:jpm.navy, fontSize:12, cursor:'pointer', fontWeight:selected?.id===t.id?600:400 }}>
                    {t.name}
                  </button>
                ))}
              </div>

              {selected && (
                <>
                  {/* Column mapping */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:11, color:jpm.slate, marginBottom:4 }}>X-Axis (Labels)</div>
                      <select value={xCol} onChange={e => setXCol(+e.target.value)}
                        style={{ width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid '+jpm.pearl, fontSize:12, outline:'none' }}>
                        {selected.headers.map((h,i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:jpm.slate, marginBottom:4 }}>Y-Axis (Values) — hold Ctrl for multi-select</div>
                      <select multiple value={yCols} onChange={e => setYCols([...e.target.selectedOptions].map(o => +o.value))}
                        style={{ width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid '+jpm.pearl, fontSize:12, outline:'none', height:72 }}>
                        {selected.headers.map((h,i) => i !== xCol && <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Chart type */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:jpm.slate, marginBottom:6 }}>Chart Type</div>
                    <div style={{ display:'flex', gap:8 }}>
                      {['Bar','Line','Area','Scatter'].map(t => (
                        <button key={t} onClick={() => setChartType(t)}
                          style={{ padding:'5px 14px', borderRadius:5, border:'1px solid '+(chartType===t?jpm.navy:jpm.pearl), background:chartType===t?jpm.navy:'#fff', color:chartType===t?'#fff':jpm.slate, fontSize:11, cursor:'pointer' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && selected && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:jpm.slate, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Preview</div>
              <ExcelChartPreview table={selected} chartType={chartType} xCol={xCol} yCols={yCols} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid '+jpm.pearl, display:'flex', justifyContent:'space-between', alignItems:'center', background:jpm.ivory }}>
          {step > 1 && <button onClick={() => { setStep(1); setWorkbook(null); setSheets([]); setTables([]); setSelected(null); setFileName(''); }}
            style={{ padding:'8px 16px', borderRadius:6, border:'1px solid '+jpm.pearl, background:'#fff', color:jpm.slate, fontSize:12, cursor:'pointer' }}>↩ Upload Different File</button>}
          {step < 2 && <div />}
          <button onClick={doInsert} disabled={!selected}
            style={{ padding:'8px 20px', borderRadius:6, border:'none', background:selected?jpm.gold:'#ccc', color:'#fff', fontSize:13, fontWeight:700, cursor:selected?'pointer':'not-allowed' }}>
            ✚ Insert Chart into Template
          </button>
        </div>
      </div>
    </div>
  );
};

// Chart colours for Excel data
const XL_COLORS = ['#0A1A2F','#C1A364','#2563EB','#059669','#D97706','#7C3AED','#DC2626','#0891B2'];

const ExcelChartPreview = ({ table, chartType, xCol, yCols }) => {
  if (!table || !table.rows.length) return null;
  const data = table.rows.map(row => {
    const pt = { x: row[xCol] !== undefined ? String(row[xCol]) : '' };
    yCols.forEach(yc => { pt[table.headers[yc]] = parseFloat(row[yc]) || 0; });
    return pt;
  });
  const series = yCols.map((yc, i) => ({ key: table.headers[yc], color: XL_COLORS[i % XL_COLORS.length] }));
  return <ExcelRechartDisplay data={data} series={series} chartType={chartType} height={200} />;
};

const ExcelRechartDisplay = ({ data, series, chartType, height = 260, title }) => {
  const ChartComp = chartType==='Line' ? LineChart : chartType==='Area' ? AreaChart : BarChart;
  const SeriesComp = chartType==='Line' ? Line : chartType==='Area' ? Area : Bar;
  return (
    <div>
      {title && <div style={{ fontSize:12, fontWeight:600, color:'#0A1A2F', marginBottom:8 }}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComp data={data} margin={{ top:4, right:16, left:0, bottom:4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" />
          <XAxis dataKey="x" tick={{ fontSize:10, fill:'#4A5568' }} />
          <YAxis tick={{ fontSize:10, fill:'#4A5568' }} />
          <Tooltip contentStyle={{ fontSize:11, borderRadius:6 }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize:10 }} />}
          {series.map((s,i) => <SeriesComp key={s.key} dataKey={s.key} fill={s.color} stroke={s.color} fillOpacity={chartType==='Area'?0.3:1} />)}
        </ChartComp>
      </ResponsiveContainer>
    </div>
  );
};

// Inline display of an inserted Excel block (in template preview / editor)
const ExcelBlock = ({ block, onRefresh, onRemove, inPreview }) => {
  const jpm = { navy:'#0A1A2F', gold:'#C1A364', pearl:'#E8E0D0', ivory:'#F7F4EF', slate:'#4A5568' };
  const [showTable, setShowTable] = React.useState(false);
  if (!block) return null;
  const { headers, rows, chartType, xCol, yCols, fileName, sheetName, tableName } = block;
  const data = rows.map(row => {
    const pt = { x: row[xCol] !== undefined ? String(row[xCol]) : '' };
    yCols.forEach(yc => { pt[headers[yc]] = parseFloat(row[yc]) || 0; });
    return pt;
  });
  const series = yCols.map((yc, i) => ({ key: headers[yc], color: XL_COLORS[i % XL_COLORS.length] }));
  return (
    <div style={{ border:'1px solid '+jpm.pearl, borderRadius:8, overflow:'hidden', marginBottom:16 }}>
      {/* Block header */}
      <div style={{ padding:'8px 12px', background:jpm.ivory, borderBottom:'1px solid '+jpm.pearl, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <span style={{ fontSize:11, fontWeight:600, color:jpm.navy }}>📊 {tableName || 'Excel Data'}</span>
          <span style={{ fontSize:10, color:jpm.slate, marginLeft:8 }}>{fileName} › {sheetName}</span>
        </div>
        {!inPreview && (
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => setShowTable(v => !v)} style={{ padding:'3px 10px', borderRadius:4, border:'1px solid '+jpm.pearl, background:'#fff', color:jpm.slate, fontSize:10, cursor:'pointer' }}>
              {showTable ? 'Chart' : 'Table'}
            </button>
            <label style={{ padding:'3px 10px', borderRadius:4, border:'1px solid '+jpm.gold, background:'#fff', color:jpm.gold, fontSize:10, cursor:'pointer', fontWeight:600 }}>
              🔄 Refresh
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={e => { if (e.target.files[0]) onRefresh(block.id, e.target.files[0]); }} />
            </label>
            <button onClick={() => onRemove(block.id)} style={{ padding:'3px 8px', borderRadius:4, border:'none', background:'#FEE2E2', color:'#DC2626', fontSize:10, cursor:'pointer' }}>✕</button>
          </div>
        )}
      </div>
      {/* Content */}
      <div style={{ padding:12 }}>
        {showTable && !inPreview ? (
          <div style={{ overflow:'auto', maxHeight:240 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr>{headers.map((h,i) => <th key={i} style={{ padding:'6px 10px', textAlign:'left', background:jpm.navy, color:'#fff', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row,ri) => (
                  <tr key={ri} style={{ background: ri%2===0 ? '#fff' : jpm.ivory }}>
                    {headers.map((_,ci) => <td key={ci} style={{ padding:'5px 10px', borderBottom:'1px solid '+jpm.pearl, color:jpm.navy }}>{row[ci] !== undefined ? String(row[ci]) : ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ExcelRechartDisplay data={data} series={series} chartType={chartType} height={inPreview ? 280 : 220} />
        )}
      </div>
    </div>
  );
};



// ── Attachments Panel ────────────────────────────────────────────────────────
const AttachmentsPanel = ({ attachments = [], onChange }) => {
  const jpm = { navy:'#0A1A2F', gold:'#C1A364', pearl:'#E8E0D0', ivory:'#F7F4EF', slate:'#4A5568', neg:'#EF4444' };

  const handleUpload = (files) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const att = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result, // base64 data URL
          addedAt: new Date().toISOString(),
        };
        onChange([...attachments, att]);
      };
      reader.readAsDataURL(file);
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
  };

  const getIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('spreadsheet') || type.includes('excel') || name?.endsWith('.xlsx')) return '📊';
    if (type.includes('word') || type.includes('document')) return '📝';
    return '📎';
  };

  return (
    <div style={{ marginTop:16, borderTop:'1px solid '+jpm.pearl, paddingTop:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:600, color:jpm.slate, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          📎 Attachments {attachments.length > 0 && <span style={{ background:jpm.navy, color:'#fff', borderRadius:8, padding:'1px 6px', fontSize:9, marginLeft:4 }}>{attachments.length}</span>}
        </span>
        <label style={{ fontSize:10, padding:'4px 10px', borderRadius:4, border:'1px solid '+jpm.pearl, background:'#fff', color:jpm.navy, cursor:'pointer', fontWeight:500 }}>
          + Add Files
          <input type="file" multiple style={{ display:'none' }} onChange={e => handleUpload(e.target.files)} />
        </label>
      </div>

      {attachments.length === 0 ? (
        <label style={{ display:'block', border:'1px dashed '+jpm.pearl, borderRadius:6, padding:'12px', textAlign:'center', cursor:'pointer', color:jpm.slate, fontSize:11 }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}>
          Drag files here or click to attach — PDFs, images, spreadsheets, Word docs
          <input type="file" multiple style={{ display:'none' }} onChange={e => handleUpload(e.target.files)} />
        </label>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {attachments.map(att => (
            <div key={att.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:6, border:'1px solid '+jpm.pearl, background:jpm.ivory }}>
              <span style={{ fontSize:16 }}>{getIcon(att.type)}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <a href={att.data} download={att.name} style={{ fontSize:12, fontWeight:500, color:jpm.navy, textDecoration:'none', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {att.name}
                </a>
                <span style={{ fontSize:10, color:jpm.slate }}>{formatSize(att.size)}</span>
              </div>
              {att.type.startsWith('image/') && (
                <img src={att.data} alt={att.name} style={{ width:32, height:32, objectFit:'cover', borderRadius:3 }} />
              )}
              <button onClick={() => onChange(attachments.filter(a => a.id !== att.id))}
                style={{ background:'none', border:'none', color:jpm.neg, cursor:'pointer', fontSize:14, padding:'0 2px', lineHeight:1 }}>✕</button>
            </div>
          ))}
          <label style={{ fontSize:10, padding:'5px', textAlign:'center', border:'1px dashed '+jpm.pearl, borderRadius:4, cursor:'pointer', color:jpm.slate }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}>
            + Add more files
            <input type="file" multiple style={{ display:'none' }} onChange={e => handleUpload(e.target.files)} />
          </label>
        </div>
      )}
    </div>
  );
};



// ── Codebase Viewer ──────────────────────────────────────────────────────────
const CodebaseViewer = () => {
  const [src, setSrc] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/source.txt')
      .then(r => r.text())
      .then(t => { setSrc(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const lines = src.split('\n');

  const download = () => {
    const b = new Blob([src], { type: 'text/plain' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = 'App.jsx'; a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div style={{ background:'#0D1117', borderRadius:10, overflow:'hidden' }}>
      <div style={{ padding:'12px 20px', borderBottom:'1px solid #30363D', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:14, color:'#E6EDF3', fontWeight:600, fontFamily:'monospace' }}>App.jsx</span>
          <span style={{ fontSize:11, color:'#8B949E', background:'#21262D', padding:'2px 8px', borderRadius:4, fontFamily:'monospace' }}>src/</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {!loading && <span style={{ fontSize:11, color:'#8B949E' }}>{lines.length.toLocaleString()} lines · {(src.length/1024).toFixed(0)} KB</span>}
          <button onClick={download}
            style={{ padding:'5px 12px', borderRadius:5, border:'1px solid #30363D', background:'#21262D', color:'#E6EDF3', fontSize:11, cursor:'pointer' }}>
            ⬇ Download
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#8B949E', fontSize:13 }}>Loading source...</div>
      ) : (
        <div style={{ overflow:'auto', maxHeight:'calc(100vh - 160px)' }}>
          <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12, lineHeight:1.6, fontFamily:'monospace' }}>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td style={{ padding:'0 16px', color:'#484F58', textAlign:'right', userSelect:'none', minWidth:52, borderRight:'1px solid #21262D', verticalAlign:'top', whiteSpace:'nowrap' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding:'0 0 0 16px', color:'#E6EDF3', whiteSpace:'pre', verticalAlign:'top' }}>
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};



// ── CONTENT CIRCLE — Related content sidebar ─────────────────────────────────
const ContentCircle = ({ currentContent, libraryItems, onOpen }) => {
  const [hidden, setHidden] = React.useState(false);
  if (!currentContent || !libraryItems) return null;

  try {
  // Extract all text being written — title, sections content, product tags
  const currentTags = Array.isArray(currentContent.tags) ? currentContent.tags : [];
  const currentProductTags = Array.isArray(currentContent.productTags) ? currentContent.productTags : [];
  const allCurrentText = [
    currentContent.title || '',
    currentContent.tagline || '',
    ...(currentContent.sections || []).map(s => s.content || ''),
  ].join(' ').toLowerCase();

  // Extract meaningful keywords from the actual content being written
  const stopWords = new Set(['the','and','for','that','this','with','from','have','been','will','they','their','which','when','also','into','more','than','are','was','were','has','had','but','not','all','can','its','our','we','us','as','at','be','by','do','he','in','is','it','no','of','on','or','so','to','up','an','if','me','my','or','you']);
  const contentWords = allCurrentText.split(/\W+/).filter(w => w.length > 4 && !stopWords.has(w));
  const wordFreq = {};
  contentWords.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  const topWords = Object.entries(wordFreq).sort((a,b) => b[1]-a[1]).slice(0, 15).map(([w]) => w);

  // Only surface related content when there's something being written
  if (topWords.length === 0 && currentTags.length === 0 && currentProductTags.length === 0) return null;

  const scored = libraryItems
    .filter(item => item.id !== currentContent.id && item.status === 'published')
    .map(item => {
      let score = 0;
      const itemTags = [...(item.tags || []), ...(item.productTags || [])].map(t => t.toLowerCase());
      const itemText = [item.title, item.tagline, ...(item.sections||[]).map(s => s.content)].join(' ').toLowerCase();

      // Tag overlap (product tags weighted highest)
      currentProductTags.forEach(t => { if (itemTags.includes(t.toLowerCase())) score += 5; });
      currentTags.forEach(t => { if (itemTags.includes(t.toLowerCase())) score += 3; });

      // Content keyword overlap — the main signal
      topWords.forEach(w => {
        if (itemText.includes(w)) score += 2;
        if ((item.title || '').toLowerCase().includes(w)) score += 3; // title match weighted higher
      });

      // High qScore bonus
      if ((item.qScore || 0) >= 4.5) score += 3;
      else if ((item.qScore || 0) >= 4) score += 1;

      // Recency bonus (for content with similar themes)
      const daysSince = (Date.now() - new Date(item.publishedDate || item.createdDate).getTime()) / 86400000;
      if (daysSince < 14 && score > 0) score += 2;

      return { ...item, _score: score };
    })
    .filter(item => item._score >= 3) // minimum threshold
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);

  if (scored.length === 0) return null;

  return (
    <div style={{ position:'fixed', right:0, top:'50%', transform:'translateY(-50%)', zIndex:500 }}>
      {/* Toggle tab — always visible */}
      <div onClick={() => setHidden(h => !h)}
        style={{ position:'absolute', left: hidden ? -32 : -24, top:'50%', transform:'translateY(-50%)', background:c.gold, color:'#fff', borderRadius:'6px 0 0 6px', padding:'8px 6px', cursor:'pointer', fontSize:10, fontWeight:700, writingMode:'vertical-rl', letterSpacing:'0.08em', userSelect:'none', boxShadow:'-2px 0 8px rgba(0,0,0,0.15)' }}>
        {hidden ? '▷ Related' : '◁ Hide'}
      </div>
      {!hidden && <div style={{ background:'#fff', boxShadow:'-2px 0 12px rgba(0,0,0,0.1)', borderRadius:'10px 0 0 10px', padding:'12px 14px', width:200, borderRight:'3px solid '+c.gold }}>
        <div style={{ fontSize:9, fontWeight:700, color:c.gold, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
          📎 Related Content
        </div>
        {scored.map((item, i) => (
          <div key={item.id} onClick={() => onOpen && onOpen(item)}
            style={{ marginBottom:i < scored.length-1 ? 10 : 0, padding:'8px 10px', borderRadius:7, border:'1px solid '+c.pearl, cursor:'pointer', background:'#fff', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background=c.ivory}
            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
            <div style={{ fontSize:11, fontWeight:600, color:c.navy, lineHeight:1.4, marginBottom:3 }}>{item.title}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:9, color:c.slate }}>{item.typeLabel || item.type}</span>
              {item.qScore && <span style={{ fontSize:9, color:c.gold, fontWeight:700 }}>★ {item.qScore.toFixed(1)}</span>}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
  } catch(e) { return null; }
};

// ── FORWARD LOOK TAB ─────────────────────────────────────────────────────────
const FORWARD_EVENTS_2026 = [
  { date:'2026-05-13', type:'macro', title:'US CPI (April)', ticker:null, region:'US', importance:'high', isKey:true, description:'Core CPI consensus ~2.6% YoY. Crucial test for Fed patience and rate path.', consensus:'Core CPI: 2.6% YoY / Headline: 2.4% YoY', lastResult:'Core 2.7% (March) — above consensus', jpmView:'Sticky services inflation likely to keep core elevated. Watch for shelter component.' },
  { date:'2026-05-14', type:'macro', title:'UK GDP Q1 Advance', ticker:null, region:'UK', importance:'medium', isKey:false, description:'First read on Q1 growth.', consensus:'+0.3% QoQ / +1.1% YoY', lastResult:'+0.1% QoQ (Q4 2025)', jpmView:'Construction drag likely to persist. Consumer spending the bright spot.' },
  { date:'2026-05-19', type:'central-bank', title:'FOMC Minutes (May)', ticker:null, region:'US', importance:'high', isKey:true, description:'Detail on committee thinking re: rate path and inflation tolerance.', consensus:'Expect hawkish hold language', lastResult:'March minutes showed divided committee on pace of cuts', jpmView:'Key read on whether June cut remains live. Watch language on labour market.' },
  { date:'2026-05-22', type:'earnings', title:'NVIDIA Q1 FY2027', ticker:'NVDA', region:'US', importance:'high', isKey:true, description:'Largest single earnings event of the quarter. Data centre revenue is the only metric that matters.', consensus:'EPS: $0.94e / Revenue: $43.2Bn / Data Centre: $38.5Bn', lastResult:'Q4: EPS $0.89 beat $0.84e / Rev $39.3Bn beat $38.0Bn', jpmView:'Options pricing ~9% move. Guidance on Blackwell ramp and China export controls key.' },
  { date:'2026-05-27', type:'central-bank', title:'ECB Meeting Minutes', ticker:null, region:'EU', importance:'medium', isKey:false, description:'Post-June meeting guidance on summer cut path.', consensus:'Confirm June cut, signal July pause', lastResult:'April: 25bp cut, 3rd of the cycle', jpmView:'Lagarde likely to remain data-dependent on July. EUR sensitive.' },
  { date:'2026-06-02', type:'macro', title:'US NFP (May)', ticker:null, region:'US', importance:'high', isKey:true, description:'Labour market health check. Fed watches very carefully.', consensus:'Non-farm payrolls: +185k / Unemployment: 4.4%', lastResult:'+162k (April) / UE 4.4%', jpmView:'Two consecutive sub-200k prints would meaningfully shift Fed pricing. Watch wages.' },
  { date:'2026-06-10', type:'central-bank', title:'Fed Rate Decision', ticker:null, region:'US', importance:'high', isKey:true, description:'Market pricing 75% hold. Key Powell press conference.', consensus:'Hold at 4.25-4.50%. One dissent expected.', lastResult:'Hold — March. Dot plot: 2 cuts for 2026', jpmView:'No cut expected. Powell language on when conditions will be met is the market mover.' },
  { date:'2026-06-12', type:'earnings', title:'JP Morgan Q2 Earnings', ticker:'JPM', region:'US', importance:'high', isKey:true, description:'First major bank. IB revival read-through. NIM under pressure.', consensus:'EPS: $4.62e / Revenue: $44.1Bn / NII: $23.2Bn', lastResult:'Q1: EPS $5.07 beat $4.61e — strong IB and trading', jpmView:'Watch NII guidance for H2. Credit card charge-offs a key consumer health indicator.' },
  { date:'2026-06-18', type:'macro', title:'FOMC SEP / Dot Plot', ticker:null, region:'US', importance:'high', isKey:true, description:'Updated rate projections. Most market-moving Fed output of the year.', consensus:'Median dot: 2 cuts 2026, 3 cuts 2027', lastResult:'March: Median 2 cuts 2026, 3 cuts 2027', jpmView:'Risk of hawkish shift to 1 cut 2026 if CPI stays sticky. USD bullish if so.' },
  { date:'2026-06-24', type:'geopolitical', title:'G7 Summit', ticker:null, region:'Global', importance:'medium', isKey:false, description:'Trade policy, Ukraine reconstruction, China tensions on agenda.', consensus:'No major market-moving decisions expected', lastResult:'2025: Ukraine aid package agreed', jpmView:'Communiqué language on China trade will be watched by EM investors.' },
  { date:'2026-07-07', type:'macro', title:'US NFP (June)', ticker:null, region:'US', importance:'high', isKey:true, description:'Summer employment picture ahead of July Fed meeting.', consensus:'+180k / UE 4.4%', lastResult:'+162k (May)', jpmView:'Tipping point: sub-150k would likely lock in September cut.' },
  { date:'2026-07-14', type:'earnings', title:'Goldman Sachs Q2', ticker:'GS', region:'US', importance:'high', isKey:false, description:'Trading revenues and M&A pipeline quality.', consensus:'EPS: $8.45e / Revenue: $13.2Bn', lastResult:'Q1: EPS $9.60 beat — equities trading strong', jpmView:'M&A pipeline backlog the key forward indicator. Watch mgmt commentary on deal activity.' },
  { date:'2026-07-21', type:'central-bank', title:'ECB Rate Decision', ticker:null, region:'EU', importance:'high', isKey:true, description:'4th cut of the cycle likely.', consensus:'25bp cut to 2.00%. July pause signalled.', lastResult:'June: 25bp cut. Lagarde: data-dependent on further', jpmView:'EUR likely to trade higher on "done for now" language. Watch inflation projections.' },
  { date:'2026-07-28', type:'macro', title:'US GDP Q2 Advance', ticker:null, region:'US', importance:'high', isKey:true, description:'First read on Q2 growth. Key recession risk barometer.', consensus:'+1.6% annualised / Consumer spending +1.8%', lastResult:'Q1: +1.2% (below consensus +1.6%)', jpmView:'Second consecutive sub-2% print would validate our cautious positioning on US equities.' },
  { date:'2026-08-04', type:'central-bank', title:'BoE Rate Decision', ticker:null, region:'UK', importance:'high', isKey:false, description:'4th cut of the cycle.', consensus:'25bp cut to 3.75%. 7-2 vote expected.', lastResult:'May: 25bp cut — Bailey dovish on UK growth', jpmView:'GBP likely to weaken modestly. UK gilts should rally on cut confirmation.' },
];


const ForwardLookTab = ({ onCreateContent: handleCreateFromEvent }) => {
  const [view, setView] = React.useState('calendar');
  const [search, setSearch] = React.useState('');
  const [showExposure, setShowExposure] = React.useState(null);
  const [typeFilter, setTypeFilter] = React.useState(null);
  const [keyOnly, setKeyOnly] = React.useState(false);
  const [regionFilter, setRegionFilter] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [beatMiss, setBeatMiss] = React.useState({});
  const today = new Date();

  const filterEvents = (events) => events.filter(e => e.title.toLowerCase().includes(search.toLowerCase())).filter(e => !typeFilter || e.type === typeFilter).filter(e => !keyOnly || e.isKey).filter(e => !regionFilter || e.region === regionFilter || e.region === 'Global');
  const upcoming = filterEvents(FORWARD_EVENTS_2026.filter(e => new Date(e.date) >= today));
  const past = filterEvents(FORWARD_EVENTS_2026.filter(e => new Date(e.date) < today));

  const typeColor = { macro:'#0A1A2F', earnings:'#059669', 'central-bank':'#C1A364', geopolitical:'#DC2626' };
  const typeLabel = { macro:'Macro', earnings:'Earnings', 'central-bank':'Central Bank', geopolitical:'Geopolitical' };

  const checkBeatMiss = async (event) => {
    const apiKey = localStorage.getItem('_ak');
    if (!apiKey || beatMiss[event.title]) return;
    setLoading(true);
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 600,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system: 'Financial research assistant. Search for what happened at this event and return ONLY JSON.',
          messages: [{ role: 'user', content: `Search for the result of: "${event.title}" on ${event.date}. Return JSON only: {"verdict":"beat"|"miss"|"in-line"|"n/a","actual":"actual value","expected":"consensus","summary":"one sentence"}` }]
        })
      });
      const data = await resp.json();
      const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
      const m = text.match(/\{[\s\S]*?\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        setBeatMiss(prev => ({ ...prev, [event.title]: parsed }));
      }
    } catch(e) {}
    setLoading(false);
  };

  const EventCard = ({ event, isPast, onCreateContent }) => {
    const bm = beatMiss[event.title];
    const verdictColor = { beat:'#059669', miss:'#DC2626', 'in-line':'#6B7280', 'n/a':'#9CA3AF' };
    return (
      <div style={{ background:'#fff', border:'1px solid '+c.pearl, borderRadius:10, padding:'14px 16px', marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
          <div>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:typeColor[event.type]+'18', color:typeColor[event.type] }}>
                {typeLabel[event.type]}
              </span>
              {event.isKey && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:'#FFF9E6', color:c.gold }}>★ Key Event</span>}
              {event.importance === 'high' && <span style={{ fontSize:9, fontWeight:700, color:'#DC2626' }}>●</span>}
              <span style={{ fontSize:9, color:c.slate }}>{event.region}</span>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:c.navy }}>{event.title}</div>
            {event.ticker && <div style={{ fontSize:11, fontWeight:700, color:c.teal, marginTop:2 }}>{event.ticker}</div>}
          </div>
          <div style={{ fontSize:11, color:c.slate, textAlign:'right', flexShrink:0 }}>
            {new Date(event.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
            {isPast && !bm && (
              <button onClick={() => checkBeatMiss(event)} disabled={loading}
                style={{ display:'block', marginTop:4, fontSize:9, padding:'3px 8px', borderRadius:4, border:'1px solid '+c.pearl, background:'#fff', color:c.teal, cursor:'pointer', fontWeight:600 }}>
                {loading ? '⏳' : '🔍 Check result'}
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize:12, color:c.slate, lineHeight:1.5, marginBottom: event.consensus ? 8 : 0 }}>{event.description}</div>
        {event.consensus && (
          <div style={{ background: '#F0F9FF', borderRadius: 6, padding: '7px 10px', marginBottom: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: c.teal, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Consensus Estimate</div>
            <div style={{ fontSize: 11, color: c.navy, fontWeight: 600 }}>{event.consensus}</div>
          </div>
        )}
        {event.lastResult && (
          <div style={{ background: c.ivory, borderRadius: 6, padding: '7px 10px', marginBottom: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Last Result</div>
            <div style={{ fontSize: 11, color: c.slate }}>{event.lastResult}</div>
          </div>
        )}
        {event.jpmView && (
          <div style={{ borderLeft: '3px solid ' + c.gold, paddingLeft: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: c.gold, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>JPM View</div>
            <div style={{ fontSize: 11, color: c.navy, fontStyle: 'italic' }}>{event.jpmView}</div>
          </div>
        )}
        {bm && (
          <div style={{ marginTop:8, padding:'8px 10px', background:bm.verdict==='beat'?'#F0FDF4':bm.verdict==='miss'?'#FFF1F1':'#F9FAFB', borderRadius:6, display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:verdictColor[bm.verdict]||'#6B7280', textTransform:'uppercase' }}>{bm.verdict}</span>
            {bm.actual && <span style={{ fontSize:11, color:c.slate }}>Actual: <strong>{bm.actual}</strong></span>}
            {bm.expected && <span style={{ fontSize:11, color:c.slate }}>vs Expected: {bm.expected}</span>}
            <span style={{ fontSize:11, color:c.slate, flex:1 }}>{bm.summary}</span>
          </div>
        )}
        {/* Create content from this event */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + c.pearl, display: 'flex', gap: 8 }}>
          <button onClick={() => onCreateContent && onCreateContent(event)}
            style={{ flex: 1, padding: '7px 12px', borderRadius: 6, border: 'none', background: c.navy, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            ✍️ Create Desk Commentary
          </button>
          {event.ticker && (
            <button onClick={(e) => { e.stopPropagation(); onCreateContent && onCreateContent(event, true); }}
              style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid ' + c.teal, background: '#F0F9FF', color: c.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ⚡ + Auto-generate
            </button>
          )}
        </div>

        {/* Client exposure for earnings events */}
        {event.ticker && (
          <div style={{ marginTop:8 }}>
            <button onClick={(e) => { e.stopPropagation(); setShowExposure(showExposure === event.ticker ? null : event.ticker); }}
              style={{ fontSize:10, padding:'4px 10px', borderRadius:5, border:'1px solid '+c.teal, background:'#F0F9FF', color:c.teal, fontWeight:600, cursor:'pointer' }}>
              👥 {showExposure === event.ticker ? 'Hide' : 'Show'} client exposure — {event.ticker}
            </button>
            {showExposure === event.ticker && (
              <div style={{ marginTop:8, background:c.ivory, borderRadius:8, padding:'10px 12px', border:'1px solid '+c.pearl }}>
                <div style={{ fontSize:9, fontWeight:700, color:c.slate, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                  ⚠ Mock data — connect Orion API for live positions
                </div>
                {getExposure(event.ticker).sort((a,b)=>b.notionalUSD-a.notionalUSD).map((cl, i) => (
                  <div key={cl.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:i<getExposure(event.ticker).length-1?'1px solid '+c.pearl:'none' }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:c.navy }}>{cl.name}</div>
                      <div style={{ fontSize:10, color:c.slate }}>{cl.rm}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:c.teal }}>${(cl.notionalUSD/1e6).toFixed(1)}M</div>
                      <div style={{ fontSize:10, color:c.slate }}>{cl.portfolioPct}% of portfolio</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding:'24px 20px', maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'Georgia, serif', fontSize:22, color:c.navy, margin:0 }}>Forward Look</h2>
          <p style={{ fontSize:12, color:c.slate, margin:'4px 0 0' }}>Full-year 2026 event calendar · Auto-updates daily</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['calendar','past'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding:'7px 16px', borderRadius:6, border:'1px solid '+c.pearl, background:view===v?c.navy:'#fff', color:view===v?'#fff':c.slate, fontSize:11, fontWeight:600, cursor:'pointer' }}>
              {v === 'calendar' ? '📅 Upcoming' : '📋 Backward Look'}
            </button>
          ))}
        </div>
      </div>
      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
          style={{ flex:1, minWidth:180, padding:'7px 12px', borderRadius:6, border:'1px solid '+c.pearl, fontSize:12, outline:'none' }} />
        {['macro','earnings','central-bank','geopolitical'].map(t => (
          <button key={t} onClick={() => setTypeFilter(f => f===t?null:t)}
            style={{ padding:'6px 12px', borderRadius:6, border:'1px solid '+(typeFilter===t ? typeColor[t] : c.pearl), background: typeFilter===t ? typeColor[t]+'18' : '#fff', color: typeFilter===t ? typeColor[t] : c.slate, fontSize:11, fontWeight:typeFilter===t?700:400, cursor:'pointer' }}>
            {typeLabel[t]}
          </button>
        ))}
        <button onClick={() => setKeyOnly(k => !k)}
          style={{ padding:'6px 12px', borderRadius:6, border:'1px solid '+(keyOnly?c.gold:c.pearl), background:keyOnly?'#FFF9E6':'#fff', color:keyOnly?c.gold:c.slate, fontSize:11, fontWeight:keyOnly?700:400, cursor:'pointer' }}>
          ★ Key Events Only
        </button>
        <button onClick={() => setRegionFilter(r => r==='US'?null:'US')}
          style={{ padding:'6px 12px', borderRadius:6, border:'1px solid '+(regionFilter==='US'?c.teal:c.pearl), background:regionFilter==='US'?'#F0F9FF':'#fff', color:regionFilter==='US'?c.teal:c.slate, fontSize:11, cursor:'pointer' }}>
          🇺🇸 US
        </button>
        <button onClick={() => setRegionFilter(r => r==='EU'?null:'EU')}
          style={{ padding:'6px 12px', borderRadius:6, border:'1px solid '+(regionFilter==='EU'?c.teal:c.pearl), background:regionFilter==='EU'?'#F0F9FF':'#fff', color:regionFilter==='EU'?c.teal:c.slate, fontSize:11, cursor:'pointer' }}>
          🇪🇺 Europe
        </button>
        {(typeFilter||keyOnly||regionFilter) && <button onClick={() => {setTypeFilter(null);setKeyOnly(false);setRegionFilter(null);}} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid '+c.pearl, background:'#fff', color:c.slate, fontSize:11, cursor:'pointer' }}>✕ Clear</button>}
      </div>
      {view === 'calendar' ? (
        upcoming.length === 0 ? <div style={{ textAlign:'center', color:c.slate, padding:40 }}>No upcoming events found</div> :
        upcoming.map((e, i) => <EventCard key={i} event={e} isPast={false} onCreateContent={handleCreateFromEvent} />)
      ) : (
        past.length === 0 ? <div style={{ textAlign:'center', color:c.slate, padding:40 }}>No past events to show</div> :
        past.map((e, i) => <EventCard key={i} event={e} isPast={true} onCreateContent={handleCreateFromEvent} />)
      )}
    </div>
  );
};



const AddImplementationCard = ({ viewId, onAdd }) => {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ type: 'Direct Equity', status: 'Active', desk: 'Investment Solutions', detail: '' });
  const IMPL_TYPES = ['Direct Equity', 'Derivatives', 'Fund', 'Structured Product', 'Direct (Bonds)', 'Currency Overlay'];
  const DESKS = ['Investment Solutions', 'Derivatives', 'Product Solutions', 'Banking', 'GIS'];
  const STATUSES = ['Active', 'Reviewing', 'Available', 'Closed'];

  const submit = () => {
    if (!form.detail.trim()) return;
    onAdd({ id: 'i' + Date.now(), ...form });
    setForm({ type: 'Direct Equity', status: 'Active', desk: 'Investment Solutions', detail: '' });
    setOpen(false);
  };

  if (!open) return (
    <div onClick={() => setOpen(true)}
      style={{ background: c.ivory, border: '2px dashed ' + c.pearl, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.slate, fontSize: 12, cursor: 'pointer', minHeight: 80, gap: 6 }}>
      <span style={{ fontSize: 18 }}>+</span> Add Implementation
    </div>
  );

  return (
    <div style={{ background: '#fff', border: '2px solid ' + c.teal, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.navy, marginBottom: 12 }}>New Implementation</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>Type</label>
          <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11 }}>
            {IMPL_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>Desk</label>
          <select value={form.desk} onChange={e => setForm(p => ({...p, desk: e.target.value}))} style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11 }}>
            {DESKS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 9, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid ' + c.pearl, fontSize: 11 }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <textarea value={form.detail} onChange={e => setForm(p => ({...p, detail: e.target.value}))}
        placeholder="Describe the implementation — entry, sizing, instrument, rationale, desk notes..."
        rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, lineHeight: 1.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} style={{ padding: '7px 16px', borderRadius: 5, border: 'none', background: c.navy, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Add</button>
        <button onClick={() => setOpen(false)} style={{ padding: '7px 16px', borderRadius: 5, border: '1px solid ' + c.pearl, background: '#fff', color: c.slate, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
};

// ── VIEWS & IMPLEMENTATIONS TAB ──────────────────────────────────────────────
const ViewsTab = ({ libraryItems = [] }) => {
  const [views, setViews] = React.useState([
    {
      id: 'vg1', name: 'Gold', ticker: 'GLD', sector: 'Commodities', conviction: 'High',
      gisView: 'Gold is a core holding in our portfolios. It has surged 130% over the past three years and we continue to see it as the pre-eminent geopolitical hedge. Rising government debt concerns, dollar weakness, and persistent inflation are structural tailwinds. The Strait of Hormuz closure and energy shock have only reinforced the case. We would not reduce on strength — this is ballast, not a trade.',
      createdDate: '2026-05-12', author: 'Grace Peters',
      implementations: [
        { id: 'ig1', type: 'Fund', status: 'Active', desk: 'Product Solutions', detail: 'Gold ETF (GLD/SGOL). Target 3-5% of portfolio. Held as strategic ballast, not tactical position. Do not trade around it.' },
        { id: 'ig2', type: 'Structured Product', status: 'Available', desk: 'Banking', detail: 'Gold-linked note available: 100% capital protection, 80% participation on spot gold upside. 2-year tenor. Minimum $500k. For clients uncomfortable with commodity volatility.' },
        { id: 'ig3', type: 'Direct Equity', status: 'Reviewing', desk: 'Investment Solutions', detail: 'Gold miners (GDX) as leveraged expression — 1.5-2x operational leverage to gold price. Higher volatility but meaningful outperformance in sustained gold rallies. Maximum 1.5% of portfolio.' },
      ]
    },
    {
      id: 'vg2', name: 'Real Assets / Infrastructure', ticker: '', sector: 'Alternatives', conviction: 'High',
      gisView: 'Infrastructure is the most underowned asset class in UHNW portfolios relative to the opportunity. Commodity-linked equities, global infrastructure, and real estate offer inflation-resilient cash flows and have historically delivered 8-12% annualised returns across different inflation regimes. Nearly 80% of family offices surveyed have no infrastructure exposure despite expressing concern about inflation. We are raising our infrastructure allocation.',
      createdDate: '2026-05-12', author: 'Stephen Parker',
      implementations: [
        { id: 'ii1', type: 'Fund', status: 'Active', desk: 'Product Solutions', detail: 'Global Infrastructure Fund — core holding. Long-dated inflation-linked cash flows. Target 5-8% of portfolio for clients with long investment horizons.' },
        { id: 'ii2', type: 'Fund', status: 'Active', desk: 'Product Solutions', detail: 'Commodity-linked equity fund — natural resource equities. Particularly relevant post-Hormuz shock. Oil majors, mining, agri. 2-4% allocation.' },
        { id: 'ii3', type: 'Direct (Bonds)', status: 'Available', desk: 'Investment Solutions', detail: 'Infrastructure bonds (investment grade): direct exposure to airport, toll road, utility issuers. 4.8-5.4% yields available. 5-10 year maturities.' },
      ]
    },
    {
      id: 'vg3', name: 'AI Revolution — Infrastructure Layer', ticker: 'NVDA', sector: 'Technology', conviction: 'High',
      gisView: 'JPM GIS positions for the AI revolution as its highest-conviction secular theme. 75% of S&P 500 gains, 80% of earnings, and 90% of capital spending growth since 2022 has been AI-related. The infrastructure layer — NVIDIA, Microsoft Azure, Amazon AWS — is where we have highest conviction. We are early-to-mid cycle, not late. The Blackwell ramp and hyperscaler capex revisions confirm this.',
      createdDate: '2026-03-01', author: 'Stephen Parker',
      implementations: [
        { id: 'iai1', type: 'Direct Equity', status: 'Active', desk: 'Investment Solutions', detail: 'NVDA (primary), MSFT (secondary), AMZN (tertiary). Combined 5-8% of portfolio. NVDA as infrastructure play, not AI hype play.' },
        { id: 'iai2', type: 'Fund', status: 'Active', desk: 'Product Solutions', detail: 'Global Technology Leaders Fund — concentrated AI infrastructure exposure. 6-8% of portfolio target.' },
        { id: 'iai3', type: 'Derivatives', status: 'Reviewing', desk: 'Derivatives', detail: 'Long-dated call spreads (18-24 month) on the Philadelphia Semiconductor Index (SOX). Captures AI hardware cycle upside with defined risk.' },
      ]
    },
    {
      id: 'vg4', name: 'Eli Lilly', ticker: 'LLY', sector: 'Healthcare', conviction: 'High',
      gisView: 'Eli Lilly is our highest-conviction healthcare name. Mounjaro and Zepbound are delivering GLP-1 revenue growth that is compounding faster than any drug franchise in pharmaceutical history. The obesity market is a $150Bn+ opportunity and Lilly has the manufacturing scale, clinical pipeline, and IP protection to dominate it. We expect the stock to re-rate as earnings revisions accelerate.',
      createdDate: '2026-04-10', author: 'Kriti Gupta',
      implementations: [
        { id: 'il1', type: 'Direct Equity', status: 'Active', desk: 'Investment Solutions', detail: 'Overweight. Target 2-3% of portfolio. Long-dated investment — hold through near-term reimbursement volatility.' },
        { id: 'il2', type: 'Fund', status: 'Reviewing', desk: 'Product Solutions', detail: 'Healthcare Innovation Fund — LLY is top holding at 7.8% weight. Alternative to direct equity for clients wanting sector diversification.' },
      ]
    },
    {
      id: 'vg5', name: 'Visa', ticker: 'V', sector: 'Financials', conviction: 'Medium',
      gisView: 'Visa is a toll booth on global commerce — volume-driven, capital-light, with 50%+ operating margins. Cross-border transaction revenue is growing at 14% annually as global travel recovers. The stock is not cheap but the quality of earnings warrants a premium. We hold a modest overweight.',
      createdDate: '2026-02-20', author: 'Erik Wytenus',
      implementations: [
        { id: 'iv1', type: 'Direct Equity', status: 'Active', desk: 'Investment Solutions', detail: 'Overweight. 1.5-2.5% of portfolio. Core quality holding.' },
      ]
    },
    {
      id: 'vg6', name: 'Semiconductors — Capital Equipment', ticker: 'AMAT', sector: 'Technology', conviction: 'Medium',
      gisView: 'Semiconductor capital equipment is the second-order AI play. As TSMC and Intel build out AI chip fabs, Applied Materials, Lam Research, and ASML are the picks-and-shovels beneficiaries. Crucially, the Mid-Year Outlook highlights the semiconductor supply chain — concentrated in Taiwan — as an even greater geopolitical risk than the oil market. This creates both risk and opportunity.',
      createdDate: '2026-05-10', author: 'Kriti Gupta',
      implementations: [
        { id: 'ise1', type: 'Direct Equity', status: 'Reviewing', desk: 'Investment Solutions', detail: 'Basket of AMAT, LRCX, ASML. 1-2% combined. Secondary AI expression with lower valuation risk than NVDA at current levels.' },
        { id: 'ise2', type: 'Derivatives', status: 'Available', desk: 'Derivatives', detail: 'Geopolitical tail hedge via Taiwan semiconductor exposure — put spread on TSMC-heavy ETFs. Cost ~0.8% per annum.' },
      ]
    },
    {
      id: 'v1', name: 'Ferrari', ticker: 'RACE', sector: 'Consumer Discretionary', conviction: 'High',
      gisView: 'Ferrari is the most defensible luxury brand in the world. Its pricing power is structural — not cyclical — and its order book stretches years into the future. We see the stock as a compounding engine with low sensitivity to macro conditions.',
      createdDate: '2026-03-15', author: 'Madison Faller',
      implementations: [
        { id: 'i1', type: 'Direct Equity', status: 'Active', desk: 'Investment Solutions', detail: 'Long RACE equity. Sizing: 2–3% of portfolio. Entry: €450–480 range. No hedging recommended — EUR exposure is part of the thesis.' },
        { id: 'i2', type: 'Derivatives', status: 'Active', desk: 'Derivatives', detail: 'Sell 6-month put spreads at €420/€400 to generate premium and express range-bound downside view. Collar at €600 for concentrated positions.' },
        { id: 'i3', type: 'Fund', status: 'Reviewing', desk: 'Product Solutions', detail: 'Included in European Quality Equity Fund (FEQF). Awaiting updated mandate review — fund currently at 4.2% RACE weight.' },
        { id: 'i4', type: 'Structured Product', status: 'Available', desk: 'Banking', detail: 'Capital-protected note available: 100% participation on RACE upside, 3-year tenor. Minimum €500k. ISIN pending.' },
      ]
    },
    {
      id: 'v2', name: 'NVIDIA', ticker: 'NVDA', sector: 'Technology', conviction: 'High',
      gisView: 'NVIDIA is the dominant infrastructure provider for the AI buildout. Data centre revenue is growing at a rate that is difficult to overstate. The risk is valuation, not fundamentals — we remain long but size carefully given the multiple.',
      createdDate: '2026-04-02', author: 'Kriti Gupta',
      implementations: [
        { id: 'i5', type: 'Direct Equity', status: 'Active', desk: 'Investment Solutions', detail: 'Long NVDA. Maximum 5% position size given concentration risk. Monitor Blackwell ramp and China export control developments.' },
        { id: 'i6', type: 'Derivatives', status: 'Active', desk: 'Derivatives', detail: 'Protective puts recommended for positions >3% of portfolio. Buy 3-month 10% OTM puts ahead of earnings. Risk/reward on calls: skewed, avoid outright call buying at current vols.' },
        { id: 'i7', type: 'Fund', status: 'Active', desk: 'Product Solutions', detail: 'Covered via Global Technology Leaders Fund (5.1% weight, at limit). New allocations via direct equity only.' },
      ]
    },
    {
      id: 'v3', name: 'European Investment Grade Credit', ticker: '', sector: 'Fixed Income', conviction: 'Medium',
      gisView: 'EUR IG credit offers the best risk-adjusted yield in years. Spreads remain tight but carry is compelling in a world where duration risk has been repriced. Prefer financials and industrial over utilities.',
      createdDate: '2026-04-28', author: 'Erik Wytenus',
      implementations: [
        { id: 'i8', type: 'Fund', status: 'Active', desk: 'Product Solutions', detail: 'EUR IG Bond Fund (EIGF) — recommended as core fixed income holding. 3–5 year duration target. Current YTM 4.8%.' },
        { id: 'i9', type: 'Direct (Bonds)', status: 'Active', desk: 'Investment Solutions', detail: 'Individual bond ladders available for clients >€5M. Recommend 2028–2031 maturity range. Target: A/BBB rated financials and industrial issuers.' },
        { id: 'i10', type: 'Structured Product', status: 'Available', desk: 'Banking', detail: 'EUR credit-linked note: 5.2% fixed coupon, 3-year, linked to basket of 20 EUR IG issuers. Capital at risk if >3 defaults.' },
      ]
    }
  ]);
  
  const [selectedView, setSelectedView] = React.useState(views[0]);
  const [showNewView, setShowNewView] = React.useState(false);
  const [newViewForm, setNewViewForm] = React.useState({ name: '', ticker: '', sector: 'Equities', conviction: 'Medium', gisView: '' });
  
  const convictionColor = { High: '#059669', Medium: '#D97706', Low: '#DC2626' };
  const statusColor = { Active: '#059669', Reviewing: '#D97706', Available: '#2563EB', Closed: '#6B7280' };
  const implIcon = { 'Direct Equity': '📈', 'Derivatives': '⚙️', 'Fund': '🏦', 'Structured Product': '📋', 'Direct (Bonds)': '🔗', 'Banking': '🏛' };

  const addView = () => {
    if (!newViewForm.name) return;
    const newView = { ...newViewForm, id: 'v'+Date.now(), createdDate: new Date().toISOString().split('T')[0], author: 'You', implementations: [] };
    setViews(prev => [...prev, newView]);
    setSelectedView(newView);
    setShowNewView(false);
    setNewViewForm({ name: '', ticker: '', sector: 'Equities', conviction: 'Medium', gisView: '' });
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left — view list */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid ' + c.pearl, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid ' + c.pearl, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>Views</div>
          <button onClick={() => setShowNewView(true)}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: 'none', background: c.navy, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            + New View
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {views.map(v => (
            <div key={v.id} onClick={() => setSelectedView(v)}
              style={{ padding: '12px 16px', borderBottom: '1px solid ' + c.pearl, cursor: 'pointer', background: selectedView?.id === v.id ? c.ivory : '#fff', borderLeft: selectedView?.id === v.id ? '3px solid ' + c.navy : '3px solid transparent', transition: 'all 0.1s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.navy }}>{v.name}</div>
                <span style={{ fontSize: 9, fontWeight: 700, color: convictionColor[v.conviction] || '#6B7280', padding: '2px 6px', borderRadius: 8, background: (convictionColor[v.conviction] || '#6B7280') + '18' }}>{v.conviction}</span>
              </div>
              {v.ticker && <div style={{ fontSize: 10, color: c.teal, fontWeight: 600, marginBottom: 3 }}>{v.ticker}</div>}
              <div style={{ fontSize: 10, color: c.slate }}>{v.sector}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {v.implementations.map(impl => (
                  <span key={impl.id} style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, background: (statusColor[impl.status]||'#6B7280') + '15', color: statusColor[impl.status]||'#6B7280', fontWeight: 600 }}>{impl.type.split(' ')[0]}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — view detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {showNewView ? (
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: 18, fontFamily: 'Georgia, serif', color: c.navy, marginBottom: 20 }}>New View</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Name *</label>
                <input value={newViewForm.name} onChange={e => setNewViewForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Ferrari" style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Ticker</label>
                <input value={newViewForm.ticker} onChange={e => setNewViewForm(p => ({...p, ticker: e.target.value}))} placeholder="e.g. RACE" style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Sector</label>
                <select value={newViewForm.sector} onChange={e => setNewViewForm(p => ({...p, sector: e.target.value}))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                  {['Equities','Fixed Income','FX & Commodities','Multi-Asset','Alternatives','Consumer Discretionary','Technology','Financials','Energy','Healthcare'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Conviction</label>
                <select value={newViewForm.conviction} onChange={e => setNewViewForm(p => ({...p, conviction: e.target.value}))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: c.slate, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>GIS View</label>
              <textarea value={newViewForm.gisView} onChange={e => setNewViewForm(p => ({...p, gisView: e.target.value}))} rows={4} placeholder="State the JPM Private Bank view — conclusion first..." style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 13, lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Georgia, serif' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addView} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: c.navy, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Create View</button>
              <button onClick={() => setShowNewView(false)} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid ' + c.pearl, background: '#fff', color: c.slate, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : selectedView ? (
          <div>
            {/* View header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: c.navy, margin: 0, fontWeight: 400 }}>{selectedView.name}</h2>
                  {selectedView.ticker && <span style={{ fontSize: 14, fontWeight: 700, color: c.teal, background: '#F0F9FF', padding: '3px 10px', borderRadius: 6 }}>{selectedView.ticker}</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: convictionColor[selectedView.conviction], background: (convictionColor[selectedView.conviction]||'#6B7280') + '15', padding: '3px 10px', borderRadius: 6 }}>{selectedView.conviction} conviction</span>
                </div>
                <div style={{ fontSize: 12, color: c.slate }}>{selectedView.sector} · {selectedView.author} · {selectedView.createdDate}</div>
              </div>
            </div>

            {/* GIS View */}
            <div style={{ background: c.navy, borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: c.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>GIS View</div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: '#fff', fontFamily: 'Georgia, serif' }}>{selectedView.gisView}</div>
            </div>

            {/* Implementations */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.navy }}>Implementations ({selectedView.implementations.length})</div>
              <div style={{ fontSize: 11, color: c.slate }}>How this view is expressed across vehicles</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
              {selectedView.implementations.map(impl => (
                <div key={impl.id} style={{ background: '#fff', border: '1px solid ' + c.pearl, borderRadius: 10, padding: '14px 16px', borderTop: '3px solid ' + (statusColor[impl.status] || '#6B7280') }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{implIcon[impl.type] || '📄'}</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>{impl.type}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: statusColor[impl.status] || '#6B7280', padding: '2px 7px', borderRadius: 8, background: (statusColor[impl.status]||'#6B7280') + '15' }}>{impl.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: c.gold, fontWeight: 600, marginBottom: 6 }}>{impl.desk}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: c.slate }}>{impl.detail}</div>
                </div>
              ))}
              {/* Add implementation */}
              <AddImplementationCard viewId={selectedView.id} onAdd={(impl) => {
                setViews(prev => prev.map(v => v.id === selectedView.id ? { ...v, implementations: [...v.implementations, impl] } : v));
                setSelectedView(prev => ({ ...prev, implementations: [...prev.implementations, impl] }));
              }} />
            </div>

            {/* Related content from library — live lookup */}
            {(() => {
              const ticker = selectedView.ticker;
              const viewName = selectedView.name;
              const relatedItems = libraryItems.filter(item =>
                item.status === 'published' && (
                  (ticker && (item.productTags || []).includes(ticker)) ||
                  (item.tags || []).some(t => viewName.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(viewName.toLowerCase().split(' ')[0])) ||
                  (item.title || '').toLowerCase().includes((ticker || viewName).toLowerCase())
                )
              ).slice(0, 5);
              return relatedItems.length > 0 ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.navy, marginBottom: 12 }}>Related GIS Content</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                    {relatedItems.map(item => (
                      <div key={item.id} style={{ background: '#fff', border: '1px solid ' + c.pearl, borderRadius: 8, padding: '12px 14px', borderLeft: '3px solid ' + c.gold }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: c.gold, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.typeLabel} · {item.publishedDate}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: c.navy, lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: c.slate, lineHeight: 1.5 }}>{(item.sections?.[0]?.content || '').slice(0, 100)}...</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {(item.productTags || []).slice(0, 3).map(t => (
                              <span key={t} style={{ fontSize: 9, fontWeight: 700, color: c.teal, background: '#F0F9FF', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                            ))}
                          </div>
                          {item.qScore && <span style={{ fontSize: 10, color: c.gold }}>★ {item.qScore.toFixed(1)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: c.slate, fontSize: 13 }}>Select a view from the left</div>
        )}
      </div>
    </div>
  );
};

// ── ABOUT THIS PLATFORM TAB ──────────────────────────────────────────────────

const StyleSection = ({ title, children, last }) => (
  <div style={{ marginBottom: last ? 0 : 32, paddingBottom: last ? 0 : 32, borderBottom: last ? 'none' : '1px solid #E8E0D0' }}>
    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#0A1A2F', margin: '0 0 14px', fontWeight: 700 }}>{title}</h3>
    <div style={{ fontSize: 13, lineHeight: 1.8, color: '#4A5568', fontFamily: 'Georgia, serif' }}>{children}</div>
  </div>
);

const DevRef = ({ model, tokens, search, system, userPrompt, xml }) => (
  <div style={{ padding: '16px 20px', background: '#0F172A' }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#C1A364', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>⚙️ Developer Reference</div>
    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 2, color: '#94A3B8' }}>
      <div><span style={{ color: '#60A5FA' }}>model:</span> <span style={{ color: '#86EFAC' }}>{model}</span></div>
      <div><span style={{ color: '#60A5FA' }}>max_tokens:</span> <span style={{ color: '#FCD34D' }}>{tokens}</span></div>
      <div><span style={{ color: '#60A5FA' }}>web_search:</span> <span style={{ color: search ? '#86EFAC' : '#F87171' }}>{search ? 'enabled' : 'disabled'}</span></div>
    </div>
    {system && <>
      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 12, marginBottom: 4 }}>System Prompt</div>
      <div style={{ padding: '10px 12px', background: '#1E293B', borderRadius: 6, color: '#CBD5E1', fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{system}</div>
    </>}
    {userPrompt && <>
      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 10, marginBottom: 4 }}>User Prompt Shape</div>
      <div style={{ padding: '10px 12px', background: '#1E293B', borderRadius: 6, color: '#CBD5E1', fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{userPrompt}</div>
    </>}
    {xml && <>
      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 10, marginBottom: 4 }}>XML Output Structure</div>
      <div style={{ padding: '10px 12px', background: '#1E293B', borderRadius: 6, color: '#86EFAC', fontSize: 10, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{xml}</div>
    </>}
  </div>
);

const PubCard = ({ pub, isExpanded, onToggle }) => {
  const tagColors = { model: '#0A1A2F', tokens: '#C1A364', web: '#2A7F8F', internal: '#4A5568', external: '#059669', gisonly: '#6B5B95' };
  return (
    <div style={{ border: '1px solid #E8E0D0', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
      <div onClick={onToggle} style={{ padding: '16px 20px', cursor: 'pointer', background: isExpanded ? '#F7F4EF' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{pub.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1A2F' }}>{pub.name}</div>
            <div style={{ fontSize: 11, color: '#4A5568', marginTop: 3, lineHeight: 1.4 }}>{pub.tagline}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', maxWidth: 320, justifyContent: 'flex-end' }}>
          {pub.badges && pub.badges.map(b => (
            <span key={b.label} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: (tagColors[b.type]||'#888') + '18', color: tagColors[b.type]||'#888', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{b.label}</span>
          ))}
          <span style={{ color: '#4A5568', fontSize: 16, marginLeft: 6 }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {isExpanded && (
        <div style={{ borderTop: '1px solid #E8E0D0' }}>
          <div style={{ padding: '20px 24px', background: '#F0F7FF' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>📘 Plain English Guide</div>
            {[
              ['What it is', pub.what],
              ['Audience', pub.audience],
              ['When to use it', pub.when],
              ['When NOT to use it', pub.whenNot],
              ['Voice & Tone', pub.voice],
              ['Structure', pub.structure],
              ['Word count', pub.wordCount],
              ['AI Role', pub.aiRole],
              ['Editorial standard', pub.standard],
            ].filter(([,v]) => v).map(([label, val]) => (
              <div key={label} style={{ marginBottom: 10, display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', flexShrink: 0, width: 130, paddingTop: 1 }}>{label}</div>
                <div style={{ fontSize: 13, lineHeight: 1.75, color: '#1E3A5F', fontFamily: 'Georgia, serif', flex: 1 }}>{val}</div>
              </div>
            ))}
          </div>
          <DevRef model={pub.devModel} tokens={pub.devTokens} search={pub.devSearch} system={pub.devSystem} userPrompt={pub.devPrompt} xml={pub.devXml} />
        </div>
      )}
    </div>
  );
};

const AboutTab = () => {
  const [section, setSection] = React.useState('publications');
  const [expandedPub, setExpandedPub] = React.useState(null);

  const publications = [
    {
      id: 'macroMarkets', icon: '🌍', name: 'Macro & Markets',
      tagline: 'The flagship 3,000-word economy & markets essay — monthly GIS View equivalent, always published externally',
      badges: [{ label: 'claude-sonnet-4', type: 'model' }, { label: '16,000 tokens', type: 'tokens' }, { label: 'External', type: 'external' }, { label: 'Source selector', type: 'web' }],
      what: 'The long-form economy and markets essay. Equivalent in depth and standing to the monthly GIS View publication. Covers macro thesis, market dynamics, regional divergence, risks, and portfolio implications across 3,000 words of polished institutional prose. This is the most prestigious format in the GIS content suite — it takes a position and defends it across a full essay, not a note.',
      audience: 'UHNW clients via Nexus, and the advisor teams who brief them. Assumes a sophisticated reader who is time-constrained but wants depth when they engage.',
      when: "Major macro inflection points. Monthly market outlook cycles. When the GIS team has a structural thesis that requires a full essay to develop properly — not a reactive piece, but a considered, forward-looking view with original analysis. Examples: \"The AI Revolution Is Mid-Cycle\", \"Gold's 130% Rally Has Further to Run\", \"Why the Fed Cannot Save You This Time\".",
      whenNot: 'Do not use for reactive event commentary (Desk Commentary or Event Response), for short-form conviction expression (Specialist Spotlight), or for anything that can be said in under 500 words. Do not use when the thesis is thin — if you cannot fill 2,500 words with original thinking, the thesis is not ready.',
      voice: 'Calm, measured, intellectually confident. The voice of a senior economist explaining something important to a very smart friend. Not sell-side research — no bullet points, no hedging language, no "we believe" or "we remain cautious". Write as if you have a considered view and are sharing it directly. Slightly contrarian framing. Forward-looking without being sensational. Bridgewater in rigour, JPM in tone.',
      structure: 'The argument determines the structure — not a template. Write 4-8 sections with descriptive headings that fit the specific thesis. Every section leads with the point. The essay typically moves from: (1) why this is worth writing now, the prevailing misconception; (2-5) core analytical sections, each a developed argument with data; (6) key risks — what could change the outlook; (7) implications and what to monitor; (8) conclusion — perspective and patience, not a summary.',
      wordCount: '2,500–3,500 words. Sections vary: opening context 250-400w, core analysis sections 300-600w each, risks/implications 200-250w each, conclusion 150-200w.',
      aiRole: 'Full AI Research Assistant panel (not the standard AI Assist). User fills in 6 brief fields: Core Thesis, Markets/Regions/Assets covered, Key Data Points, JPM House View, Chart Narratives, and Consensus to Challenge. The AI writes the full 3,000-word piece from this brief. Source selector allows toggling Full Web, Trusted Web (FT, Bloomberg, Reuters, WSJ, Economist), JPM IB Research, JPM Private Bank, or Street Views (Goldman, MS, UBS, Citi, Deutsche Bank, BofA, Barclays). Optional CHART tags generated when brief contains data. Generates in ~60-90 seconds at 16,000 tokens.',
      standard: 'The differentiation test: what does this piece say that the reader could not have found in Bloomberg this morning? If the answer is "nothing", it needs more work. The thesis must be slightly contrarian, defensible, and grounded in specific data.',
      devModel: 'claude-sonnet-4-20250514',
      devTokens: '16,000',
      devSearch: false,
      devSystem: `You are a senior J.P. Morgan Private Bank Economy & Markets writer. Calm, measured, intellectually confident. Polished essay — no bullet points, no hedging language. The argument determines the structure. Lead every section with the point. Return only XML.`,
      devPrompt: `ROLE: Writing a client-facing investment insight in the style of J.P. Morgan Private Bank Economy & Markets. Sophisticated explanatory narrative for UHNW clients. Not sell-side research.

TONE: Calm, measured, intellectually confident. Forward-looking without being sensational. Polished essay prose.

STRUCTURE: Let the thesis determine the structure. Write as many sections as the argument needs (4-8). Do not force sections that do not serve the thesis. Each section heading should be descriptive — written for this specific piece.

GUARDRAILS:
- No marketing language, no bullet points, no exaggerated certainty
- Every section leads with the point, then supports it
- Specific data over vague assertions: "up 12%" not "significantly higher"
- Target 3,000 words

RESEARCH BRIEF:
Core thesis: [user input]
Markets/regions/assets: [user input]  
Key data points: [user input]
JPM house view: [user input]
Chart narratives: [user input]
Consensus to challenge: [user input]

[Source context injected if sources selected]`,
      devXml: `<TITLE>slightly contrarian, thesis-driven headline</TITLE>
<SECTION id="s1" title="[heading written for this specific thesis]">content</SECTION>
<SECTION id="s2" title="[heading written for this specific thesis]">content</SECTION>
<SECTION id="s3" title="[heading written for this specific thesis]">content</SECTION>
... (4-8 sections total, headings chosen by the model for this piece)
[Optional if data provided:]
<CHART id="chart1" title="title" type="Bar|Line|Area" yLabel="axis with unit" source="source, year" caption="what this shows">
  <DATAPOINTS>Label:value,Label:value,Label:value</DATAPOINTS>
</CHART>`
    },
    {
      id: 'ideasInsights', icon: '💡', name: 'Ideas & Insights',
      tagline: '1,200–2,000 word deep-dive — every I&I unique, thesis determines structure, 2 charts mandatory',
      badges: [{ label: 'claude-sonnet-4', type: 'model' }, { label: '16,000 tokens', type: 'tokens' }, { label: 'Web search', type: 'web' }, { label: 'External', type: 'external' }],
      what: 'Deep-dive investment analysis. 1,200–2,000 words. Every piece must include exactly two data-driven charts — the charts are not decoration, they carry part of the argument. Comparable in depth to a quality sell-side research note but written in JPM Private Bank voice for a UHNW client. The format covers a specific investment opportunity or risk with rigour: the setup, the data, the differentiated JPM view, and what to do.',
      audience: 'UHNW clients and their advisors via Nexus. Assumes engagement with investment ideas but not necessarily technical fluency. The advisor should be able to brief a client on this piece in 5 minutes.',
      when: 'A single compelling investment thesis that deserves rigorous data-backed treatment. When there are two distinct chart angles that strengthen the argument. When GIS has a differentiated view versus consensus. Quarterly thematic pieces. Asset class deep-dives. Individual security or fund spotlights.',
      whenNot: 'Not for reactive event commentary. Not when you cannot produce two meaningful charts with real data. Not for pieces under 1,000 words — use Specialist Spotlight. Not for multi-topic pieces — each I&I covers exactly one thesis.',
      voice: "JPM GIS institutional voice. Thesis-driven — the investment insight is stated plainly in the first paragraph, not buried. Evidence-based: real data, specific levels, named sources. The piece should answer \"what is JPM's differentiated view here?\" — if it cannot, it is not ready.",
      structure: 'Every I&I should feel different because every thesis is different. Do NOT use generic headings like "The Opportunity" or "What the Data Shows". Write headings specific to this piece — headings that could only exist in this piece. Typical shape: thesis stated plainly → data that builds the case (Chart 1) → the differentiated angle, what consensus misses (Chart 2) → JPM conviction stated unambiguously → specific actionable guidance. But let the argument shape the actual sections.',
      wordCount: '1,200–2,000 words. Hard cap at 2,000. Two CHART tags required — each chart needs a title that states the finding, an axis label with unit, a real source, and a caption.',
      aiRole: 'Generate Idea (Sonnet 4, 16k tokens, web_search enabled) finds current data for the topic then writes the full piece including both charts. AI Assist (same model, same tokens) writes from user brief. Both enforce the two-chart requirement at the prompt level. Source selector available in AI Assist (Full Web, Trusted Web, JPM IB, JPM PB, Street Views).',
      standard: 'Both charts must use consistent units within each chart. Values must be real — not illustrative. The "what to do" section must give specific guidance: instrument, sizing range, entry levels if relevant. Not "consider adding exposure" — that is not advice.',
      devModel: 'claude-sonnet-4-20250514',
      devTokens: '16,000',
      devSearch: true,
      devSystem: `You are a senior J.P. Morgan Private Bank GIS strategist writing an Ideas & Insights piece. CRITICAL RULES: (1) Every I&I must feel completely different — choose section headings that fit THIS specific thesis, never generic ones like "The Opportunity". (2) Exactly 2 CHART tags with real numerical data are MANDATORY. (3) All values in each chart must use consistent units. (4) Lead every section with the point. (5) 1,200-2,000 words total. Return only XML.`,
      devXml: `<TITLE>thesis-driven title for this specific topic — not generic</TITLE>
<SUBTITLE>one sentence stating the investment insight plainly</SUBTITLE>
<SECTION id="s1" title="[heading written for THIS thesis only]">300+ words — open with the insight, support with specific data</SECTION>
<SECTION id="s2" title="[heading written for THIS thesis only]">300+ words — differentiated JPM view, what consensus misses</SECTION>
<SECTION id="s3" title="[heading written for THIS thesis only]">200+ words — specific actionable recommendation with levels</SECTION>
[Add more sections if argument demands it]
<CHART id="chart1" title="[title stating what this proves]" type="Line" yLabel="[label with unit]" source="[source, year]" caption="[what this chart shows]">
  <DATAPOINTS>Label:value,Label:value,Label:value,Label:value,Label:value</DATAPOINTS>
</CHART>
<CHART id="chart2" title="[title stating what this proves]" type="Bar" yLabel="[label with unit]" source="[source, year]" caption="[what this chart shows]">
  <DATAPOINTS>Label:value,Label:value,Label:value,Label:value</DATAPOINTS>
</CHART>
BOTH CHART TAGS ARE NON-NEGOTIABLE.`
    },
    {
      id: 'topMarketTakeaways', icon: '📰', name: 'Top Market Takeaways',
      tagline: 'The flagship weekly narrative essay — one thesis, 600–900 words, a well-argued op-ed not a list',
      badges: [{ label: 'claude-sonnet-4', type: 'model' }, { label: '4,000 tokens', type: 'tokens' }, { label: 'Web search', type: 'web' }, { label: 'External', type: 'external' }],
      what: 'The flagship weekly client-facing publication. A single investment thesis told as a flowing 600–900 word narrative essay. NOT a list of market observations. Provocative thesis-driven title, descriptive section headings written for this piece, JPM Private Bank voice throughout.',
      audience: 'UHNW clients via Nexus. The most widely read format in the suite. Advisors use this to open client conversations — it must give them something to say.',
      when: 'Weekly — the most important investment theme of that week, written as an essay. When there is one clear thesis that can sustain 700 words. The bread-and-butter external GIS format.',
      whenNot: 'Not for multiple unrelated market observations (use Daily Market Update). Not for reactive sub-200-word reactions (use Desk Commentary). Not when the thesis needs charts and data depth (use Ideas & Insights). The "Takeaways" name is misleading — it is one flowing essay, not multiple takeaways.',
      voice: 'Thesis-driven narrative. The title should be slightly provocative and informative — not a topic label. Opening paragraph states the tension. "The Key" crystallises the central insight in 2-3 sentences. Section headings are descriptive narrative headings written for this specific piece — not "Section 1", not "Background". Closes with portfolio implications: specific enough that an advisor can brief a client on it.',
      structure: 'Title (provocative, thesis-driven) → Opening (~100w, state the tension and the stakes) → The Key (2-3 sentences crystallising the central insight — the most important sentence in the piece) → Two narrative sections with descriptive headings (~175w each, each earns its place) → Portfolio Implications (~90w, specific investor so-what).',
      wordCount: '600–900 words. The Key is 2-3 sentences maximum. Portfolio Implications is 80-100 words.',
      aiRole: 'AI Assist with web_search enabled. Finds the most relevant current market story, then writes the full narrative essay. User can also provide their own brief. Style chips: Institutional, Concise, Street Color, High Conviction, Data-Rich, Include Risks. Source selector available.',
      standard: 'The title test: would an editor at the FT or Economist use this headline? If yes, it is probably right. If it sounds like a research note title ("Update on European Equities"), it needs to be stronger.',
      devModel: 'claude-sonnet-4-20250514',
      devTokens: '4,000',
      devSearch: true,
      devSystem: `You are a senior J.P. Morgan Private Bank strategist. Write a Top Market Takeaways piece as a flowing narrative essay — NOT a list. Provocative thesis-driven title, descriptive narrative headings specific to this piece, 600-900 words. Op-ed style. Return only XML.`,
      devXml: `<TITLE>provocative thesis-driven title — not a topic label</TITLE>
<SECTION id="hook" title="The Opening">~100 words — state the tension, no heading displayed</SECTION>
<SECTION id="thekey" title="The Key">2-3 sentence crystallisation — the most important sentence in the piece</SECTION>
<SECTION id="s2" title="[Descriptive narrative heading for this piece]">~175 words with specific data</SECTION>
<SECTION id="s3" title="[Descriptive narrative heading for this piece]">~175 words</SECTION>
<SECTION id="close" title="Portfolio Implications">~90 words — specific investor so-what</SECTION>`
    },
    {
      id: 'deskCommentary', icon: '💬', name: 'Desk Commentary',
      tagline: 'Short-form reactive commentary — 100-150 words, conclusion first, JPM/Bridgewater voice',
      badges: [{ label: 'claude-haiku-4-5', type: 'model' }, { label: '2,000 tokens', type: 'tokens' }, { label: 'Internal/External', type: 'internal' }],
      what: 'Short-form reactive commentary on a specific market event or data print. 100–150 words. One tight paragraph. The JPM voice in its most concentrated form: the conclusion first, then the supporting evidence, then the so-what. Used for Fed decisions, economic data prints, central bank moves, earnings surprises, geopolitical events.',
      audience: 'Advisors primarily (internal), sometimes shared externally with clients when the event is significant enough.',
      when: 'Any market-moving event where GIS has a clear view. Must be published within hours — ideally within 60 minutes of the event. The "breaking news" format of the GIS suite. Also pre-populated automatically via the Forward Look tab when clicking "Create Desk Commentary" on any upcoming event.',
      whenNot: 'Not for opinion pieces without a specific event trigger. Not when more than 200 words are needed to say it properly (use Top Market Takeaways instead). Not for anything that needs a chart.',
      voice: 'Direct. Conclusion first, always. Active voice. No hedging. "We maintain overweight equities" not "equities may continue to show resilience". One paragraph, no sub-headings. JPM/Bridgewater institutional conviction tone.',
      structure: 'Title (event name + JPM read, declarative not interrogative) → Headline View (one paragraph: conclusion stated in sentence 1, what happened in sentence 2, why it matters in sentence 3, what to do in sentence 4-5).',
      wordCount: '100–150 words for the Headline View. Absolute maximum 200 words including title. If you are over, cut.',
      aiRole: 'AI Assist generates a full desk commentary from a one-line brief. Forward Look integration: clicking "Create Desk Commentary" on any upcoming event pre-populates with event date, ticker, consensus estimate, last result, and JPM view as the context.',
      standard: 'The one-sentence test: can the entire view be stated in one declarative sentence? "NVIDIA beat on all lines — Blackwell is ahead of schedule and we maintain overweight." That is a Desk Commentary title. If it cannot be stated in one sentence, the view is not clear enough yet.',
      devModel: 'claude-haiku-4-5-20251001',
      devTokens: '2,000',
      devSearch: false,
      devSystem: `You are a senior J.P. Morgan Private Bank strategist. Write a Desk Commentary Headline View: 100-150 words, lead with conclusion in sentence 1, direct active voice, no hedging language, JPM/Bridgewater conviction tone. Return only XML.`,
      devXml: `<TITLE>Event name + JPM read — declarative</TITLE>
<SECTION id="headline" title="Headline View">100-150 words — conclusion in sentence 1, what happened, why it matters, what to do. One paragraph.</SECTION>`
    },
    {
      id: 'specialistSpotlight', icon: '👤', name: 'Specialist Spotlight',
      tagline: "Named specialist's direct view on a specific instrument — under 200 words, accountable and personal",
      badges: [{ label: 'claude-haiku-4-5', type: 'model' }, { label: '2,000 tokens', type: 'tokens' }, { label: 'External', type: 'external' }],
      what: "A focused piece from a named GIS specialist on a specific instrument, asset class, or theme they cover directly. Under 200 words. The most personal and direct of the GIS formats — the specialist puts their name to a specific, accountable view. Not the GIS team view — this person's view, right now.",
      audience: "UHNW clients and advisors. Advisors use this as a direct quotable view in client conversations: \"Kriti's view on NVIDIA is...\"",
      when: 'When a specific GIS specialist has a high-conviction view on a name or instrument they directly cover. When advisors need a short, named, quotable view for a client conversation. One view, one specialist, one name, one instrument.',
      whenNot: 'Not for broad macro views (use Macro & Markets). Not for multi-topic pieces. Not when no named specialist is being featured — the piece requires an author.',
      voice: 'Personal and direct. The specialist is speaking. "My view: the setup is compelling." or "We see the risk/reward favouring..." Named and accountable. Punchy. Not committee language.',
      structure: "Title → The Lead (why this instrument matters now, one paragraph) → The View (the specialist's conviction, the specific case) → Why Now (timing: why this piece, today, not six months ago) → Advisor Takeaway (what advisors should do with this view, specific).",
      wordCount: 'Under 200 words total. The Lead and The View together should be 100-130 words. Why Now and Advisor Takeaway 30-40 words each.',
      aiRole: 'AI Assist generates a draft. Author name must be filled in before publishing — the piece is meaningless without it.',
      standard: "The name test: if you remove the author's name, does the piece lose something? If not, it is not specific enough. The Specialist Spotlight's value is that Kriti Gupta is on record saying this about NVIDIA. If it could have been written by anyone, rewrite it.",
      devModel: 'claude-haiku-4-5-20251001',
      devTokens: '2,000',
      devSearch: false,
      devSystem: `You are a senior J.P. Morgan Private Bank strategist writing a Specialist Spotlight. Under 200 words total. Personal and direct — this specialist is putting their name to this view. Named and accountable. Return only XML.`,
      devXml: `<TITLE>instrument + specialist view — declarative</TITLE>
<SECTION id="lead" title="The Lead">Why this instrument matters now. One paragraph.</SECTION>
<SECTION id="view" title="The View">The specialist's conviction. The specific case for or against.</SECTION>
<SECTION id="why_now" title="Why Now">Timing — why this piece, today.</SECTION>
<SECTION id="takeaway" title="Advisor Takeaway">What advisors should do with this. Specific.</SECTION>`
    },
    {
      id: 'dailyMarketUpdate', icon: '📈', name: 'Daily Market Update',
      tagline: 'Internal morning briefing — scannable in under 2 minutes, advisor-ready before 7:30am',
      badges: [{ label: 'claude-haiku-4-5', type: 'model' }, { label: '2,000 tokens', type: 'tokens' }, { label: 'Web search', type: 'web' }, { label: 'Internal', type: 'internal' }],
      what: 'The morning briefing produced by GIS for advisor teams ahead of client calls. Four regional variants (APAC, EMEA, LATAM, US). Covers overnight moves, three notable stories each with JPM view and client relevance, and any housekeeping PSAs. Designed to be scannable in under 2 minutes.',
      audience: "Advisor teams. Not for clients. Enables advisors to brief clients on the morning's most important stories before market open.",
      when: 'Every trading day, per region. Ready before 7:30am local time. Generate Idea uses web_search to find overnight moves and the top three stories of the morning.',
      whenNot: 'Never for external distribution. Never for in-depth analysis — each story is capped at ~50 words.',
      voice: 'Efficient and scannable. Bullet stats for key overnight moves. Each story: what happened (facts, numbers) → our view (one JPM sentence) → why it matters (client relevance, one sentence). No flourish. Function over form.',
      structure: 'Title (region + date) → Key Stats (2-3 overnight move bullets with levels and % change) → Market Commentary (~150w) → Story 1 (headline + 50w + Our View + Why It Matters) → Story 2 → Story 3 → PSAs.',
      wordCount: 'Market Commentary ~150w. Each story + view + relevance ~100w. PSAs as needed. Total ~450-600w.',
      aiRole: "Generate Idea uses web_search to find overnight market moves and today's top three stories. Fastest AI format in the suite — typically completes in under 15 seconds. Generate per region for regional variants.",
      standard: 'The 2-minute test: can an advisor read this entire update in 2 minutes and know exactly what to say in their first three client calls? If not, it is too long or too vague.',
      devModel: 'claude-haiku-4-5-20251001',
      devTokens: '2,000',
      devSearch: true,
      devSystem: `You are a J.P. Morgan Private Bank GIS strategist writing the daily morning briefing for advisor teams. Scannable, functional, specific. Return only XML.`,
      devXml: `<TITLE>Daily Market Update — [Region] — [Date]</TITLE>
<SECTION id="keystats" title="Key Stats">Overnight moves: S&P +/-X%, [index] +/-X%, [commodity/rate] at X. 2-3 bullets.</SECTION>
<SECTION id="commentary" title="Market Commentary">~150 words — what drove overnight moves, key themes</SECTION>
<SECTION id="interesting1" title="1. [Story headline]">~50 words — what happened, specific numbers</SECTION>
<SECTION id="view1" title="Our View">JPM view on story 1 — one clear sentence</SECTION>
<SECTION id="why1" title="Why It Matters">Client relevance — one sentence</SECTION>
[Repeat for stories 2 and 3]
<SECTION id="psa" title="PSAs">Leave blank unless relevant</SECTION>`
    },
    {
      id: 'eventResponse', icon: '⚡', name: 'Event Response',
      tagline: 'Live rolling commentary during market-moving events — 40-60 words per timestamped update',
      badges: [{ label: 'claude-haiku-4-5', type: 'model' }, { label: '2,000 tokens', type: 'tokens' }, { label: 'External', type: 'external' }],
      what: 'Live rolling commentary published during a market-moving event as it unfolds. Multiple timestamped updates of 40-60 words each, each self-contained. Used for central bank decisions, geopolitical shocks, major earnings surprises, macro shocks.',
      audience: "Clients and advisors who need JPM's read on a fast-moving event in real time.",
      when: 'Breaking events where markets are actively moving and GIS has a view. The event is not resolved — it is unfolding. Fed day. ECB decision day. A geopolitical shock. A major earnings print.',
      whenNot: 'Not for events that have already resolved (use Desk Commentary). Not for opinion pieces written 24+ hours after the event. Not when the GIS view requires more than 3-4 paragraphs to express (use Top Market Takeaways).',
      voice: 'Rolling news feed tone. Each update is self-contained and time-stamped. Reactive and direct. "Oil has surged 12%. Our initial view: severe but potentially short-duration shock." Admits uncertainty where it exists.',
      structure: 'Title + event summary → Opening context paragraph → Update 1 (timestamp + 50w, initial reaction) → Update 2 (market implications as they emerge) → Update 3 (JPM view, positioned). Additional updates added manually.',
      wordCount: '40-60 words per update. 3 updates minimum from AI generation. User adds live updates manually as the event develops.',
      aiRole: 'AI Assist generates the initial event response structure with 3 timestamped updates. User adds live updates manually.',
      standard: "The real-time test: if this appeared in a client's inbox 20 minutes after the event broke, would it add value? Or would they already know everything in it from Bloomberg?",
      devModel: 'claude-haiku-4-5-20251001',
      devTokens: '2,000',
      devSearch: false,
      devSystem: `You are a J.P. Morgan Private Bank strategist writing live event response commentary. 40-60 words per update. Reactive, direct, timestamped. Return only XML.`,
      devXml: `<TITLE>Event name — JPM initial read</TITLE>
<SECTION id="hook" title="Opening Context">Scene-setting paragraph — what happened and why it matters</SECTION>
Updates stored as { id, title, timestamp, content } objects — added as event develops`
    },
    {
      id: 'playground', icon: '🎯', name: 'The Playground',
      tagline: 'Free-form thinking space — write anything, challenge it, then create content from it. GIS only.',
      badges: [{ label: 'claude-sonnet-4', type: 'model' }, { label: '2,000 tokens/challenge', type: 'tokens' }, { label: 'Web search', type: 'web' }, { label: 'GIS Only', type: 'gisonly' }],
      what: 'A free-form writing and thinking space with no required structure. Write a half-formed idea, a question, a data point that caught your attention, a thesis you want to stress-test. No template, no word count requirement, no structure. The most open-ended format in the suite.',
      audience: 'GIS strategists. Not for client-facing output directly — the Playground produces thinking, not publishable pieces. "Create from this" buttons convert playground content into publishable templates.',
      when: 'Early-stage idea development. Before you know which template fits. When you want to stress-test a thesis before committing to a full piece. When you want external pushback on a forming view.',
      whenNot: "Not for finalised, client-ready content. Not a substitute for the structured templates. The Playground is a kitchen — you cook here, but you don't serve from here.",
      voice: 'No constraint. This is your scratch pad.',
      structure: 'Three-panel layout: Sources (left, 200px) → Writing area (centre, flex) → Challenge responses (right, 320px). Sources panel: Full Web 🌐, Trusted Web ✅, JPM IB 🏦, JPM Private Bank 🔒, Street Views 📊 (with Goldman, MS, UBS, Citi, Deutsche, BofA, Barclays, HSBC checkboxes). Word count panel shows territory guidance as you write. "Create from this" buttons appear at 50 words, highlight best-fit template based on word count.',
      wordCount: 'No limit. Word count tracker shows: under 50w → keep going; 50-150w → Desk Commentary territory; 150-400w → Ideas & Insights territory; 400w+ → Macro & Markets territory.',
      aiRole: '"Challenge My Thinking" calls claude-sonnet-4 (2,000 tokens per call) with the selected sources injected as context. The AI responds as a senior external research counterpart — rigorous, direct, constructive. Challenges are threaded chronologically in the right panel, each showing which sources were active. Source selection injects context into the system prompt and enables web_search for Full Web and Trusted Web sources.',
      standard: 'The playground has no quality standard — it is a thinking tool. The standard applies when you convert playground content into a template.',
      devModel: 'claude-sonnet-4-20250514',
      devTokens: '2,000 (per challenge)',
      devSearch: true,
      devSystem: `You are a senior external research counterpart — think a seasoned economist at a rival institution, a macro PM, or a well-regarded sell-side strategist. [Source context injected based on selections.]

Your job:
1. Challenge the key assumptions in the thinking provided
2. Add context, data, and angles the author may have missed
3. Point to complications, risks, or second-order effects that would strengthen the piece
4. Suggest 2-3 related themes worth exploring

Be direct, rigorous, and constructive. Max 300 words, 3-4 numbered points. Write as a peer, not a teacher.`
    },
  ];

  const scoringCriteria = [
    { label: 'Lead with Conclusion', weight: 15, desc: 'Does the opening sentence state the JPM view unambiguously? Not "in this piece we examine..." — the conclusion, in sentence 1.' },
    { label: 'Data & Evidence', weight: 15, desc: 'Are specific data points, levels, percentages, or facts cited to support the argument? "Up 12%" not "significantly higher".' },
    { label: 'Differentiation', weight: 15, desc: 'Does this piece say something the reader could not have found in Bloomberg or a Goldman note this morning? The JPM differentiated view must be identifiable.' },
    { label: 'Voice & Tone', weight: 10, desc: 'Does it sound like JPM Private Bank — calm, measured, intellectually confident? No hedging language, no marketing language, no "we remain cautious".' },
    { label: 'Advisor Utility', weight: 10, desc: 'Can an advisor read this and brief a client on it within 24 hours? Is there a clear "what to do"?' },
    { label: 'Word Count Discipline', weight: 10, desc: 'Does the piece respect the word count guidelines for its template? Desk Commentary should not be 400 words. I&I should not be 600.' },
    { label: 'Structure Integrity', weight: 10, desc: 'Does it follow the structural guidance for its template? No generic section headings in I&I and M&M. No bullet points in essay formats.' },
    { label: 'No Marketing Language', weight: 10, desc: 'Free of hyperbole, superlatives, "exciting", "compelling", "well-positioned", "navigate". If legal would love it, it is probably wrong.' },
    { label: 'Certainty Calibration', weight: 5, desc: 'Appropriate confidence — neither over-certain ("oil will hit $90") nor over-hedged ("oil could potentially move toward levels around $90 depending on factors").' },
    { label: 'Freshness', weight: 5, desc: 'Is this tied to something current? Could this piece have been written six months ago? If yes, what is new about the argument today?' },
  ];

  const badgeLegend = [
    { label: 'claude-sonnet-4', color: '#0A1A2F', desc: 'claude-sonnet-4-20250514 — highest quality model' },
    { label: 'claude-haiku-4-5', color: '#2A7F8F', desc: 'claude-haiku-4-5-20251001 — fast, efficient model' },
    { label: 'Web search', color: '#059669', desc: 'live web_search tool enabled — finds current data' },
    { label: 'External', color: '#C1A364', desc: 'published externally to UHNW clients via Nexus' },
    { label: 'Internal', color: '#6B7280', desc: 'advisor-facing only, not for client distribution' },
    { label: 'GIS Only', color: '#6B5B95', desc: 'available to GIS team members only' },
    { label: 'Source selector', color: '#2563EB', desc: 'user can select sources that inform AI generation' },
  ];

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Sub-nav */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E8E0D0', background: '#fff', padding: '0 32px', position: 'sticky', top: 0, zIndex: 10 }}>
        {[{ id: 'publications', label: '📚 Publications & Prompts' }, { id: 'style', label: '✍️ Style Guide' }, { id: 'scoring', label: '★ Content Scoring' }].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '14px 20px', border: 'none', background: 'none', borderBottom: section === s.id ? '2px solid #0A1A2F' : '2px solid transparent', fontSize: 13, fontWeight: section === s.id ? 700 : 400, color: section === s.id ? '#0A1A2F' : '#4A5568', cursor: 'pointer', marginBottom: -2 }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Publications & Prompts */}
      {section === 'publications' && (
        <div style={{ padding: '28px 32px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#0A1A2F', fontWeight: 400, marginBottom: 8 }}>Publications & Prompts</div>
          <div style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.8, maxWidth: 760, marginBottom: 20 }}>
            Eight publication types. Each has a distinct voice, structure, audience, and AI prompt engineered specifically for it. Expand any publication to see the full editorial guide — when to use it, how to write it, what makes it good — plus the exact model, token limit, system prompt, and XML output structure driving the AI generation.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
            {badgeLegend.map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: b.color + '12', borderRadius: 20, border: '1px solid ' + b.color + '25' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: b.color }}>{b.label}</span>
                <span style={{ fontSize: 10, color: '#6B7280' }}>— {b.desc}</span>
              </div>
            ))}
          </div>
          {publications.map(pub => (
            <PubCard key={pub.id} pub={pub} isExpanded={expandedPub === pub.id} onToggle={() => setExpandedPub(expandedPub === pub.id ? null : pub.id)} />
          ))}
        </div>
      )}

      {/* Style Guide */}
      {section === 'style' && (
        <div style={{ padding: '28px 32px', maxWidth: 820 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#0A1A2F', fontWeight: 400, marginBottom: 8 }}>GIS Style Guide</div>
          <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 32, lineHeight: 1.8 }}>The editorial standards that apply across every GIS publication. These are not suggestions — they are the standards that distinguish J.P. Morgan Private Bank content from generic institutional research. When in doubt, ask: would a senior GIS strategist be comfortable putting their name to this sentence?</div>

          <StyleSection title="The JPM Private Bank Voice">
            The JPM Private Bank GIS voice is calm, measured, and intellectually confident. It does not shout. It does not hedge into meaninglessness. It takes a position and defends it with evidence, then tells the reader what to do.<br /><br />
            Think of the best senior economist you know explaining something important to their most intelligent client — not writing for a committee, not writing for legal compliance, but genuinely trying to help someone think better about their portfolio.<br /><br />
            The voice is not sell-side research. Not a press release. Not a marketing document. It is the considered view of a senior investment professional who has thought hard about a question and is sharing that thinking directly, with a client who deserves a straight answer.
          </StyleSection>

          <StyleSection title="Lead with the Conclusion — Always">
            Every GIS piece — from the 100-word Desk Commentary to the 3,000-word Macro & Markets essay — leads with the conclusion. The reader should never have to wait until paragraph four to understand what the JPM view is.<br /><br />
            <em>Wrong:</em> "In this note we examine the outlook for European equities in light of recent ECB actions and geopolitical developments across the region..."<br />
            <em>Right:</em> "European equities are undervalued on every metric that matters. We are overweight."<br /><br />
            This is not academic writing. It is the style of someone who respects the reader's time. The thesis in sentence one. Always.
          </StyleSection>

          <StyleSection title="Titles and Headlines">
            Titles must be slightly contrarian, specific, and informative. They tell the reader something — not just label the topic.<br /><br />
            <em>Weak:</em> "Update on the US Economy" · "Why We Like Gold" · "NVDA Q1 Earnings Commentary"<br />
            <em>Strong:</em> "The Fed Is Not Going to Save You This Time" · "Gold Has Two Years Left in This Rally" · "NVDA Beats on All Lines — Blackwell Ramp Ahead of Model"<br /><br />
            The title is the most-read sentence in any publication. It determines whether an advisor opens the piece. It must earn the click.<br /><br />
            The title test: would an editor at the FT or Economist use this headline? If not, make it stronger.
          </StyleSection>

          <StyleSection title="Section Headings — For I&I and M&M">
            Ideas & Insights and Macro & Markets pieces must use section headings written for that specific piece. Generic headings are a sign that the structure was forced before the argument was clear.<br /><br />
            <em>Generic (wrong):</em> "The Opportunity" · "What the Data Shows" · "The JPM View" · "Background" · "Analysis" · "Conclusion"<br />
            <em>Specific (right):</em> "Why the Semiconductor Supply Chain Is a Bigger Risk Than Oil" · "The Carry Trade Unwind Has Only Just Begun" · "What the Fed Funds Futures Market Is Missing"<br /><br />
            If a heading could appear in any I&I ever written, rewrite it for this one.
          </StyleSection>

          <StyleSection title="Language Rules">
            <strong>Never use:</strong> "headwinds", "tailwinds", "navigate", "challenging environment", "prudent", "well-positioned", "at this juncture", "going forward", "exciting opportunity", "it is worth noting", "it is important to note", "in conclusion". These phrases signal lazy writing and dilute the JPM voice.<br /><br />
            <strong>Always prefer:</strong> Active voice over passive. Concrete over abstract. Specific data over vague assertions. Short sentences. "We are overweight" over "an overweight position may be warranted". Named sources over vague attribution.<br /><br />
            <strong>Numbers:</strong> Specific figures always. "Up 12%" not "significantly higher". "3.2% yield" not "an attractive yield". "Q4 2026" not "later this year". "75 basis points" not "a significant tightening".<br /><br />
            <strong>Certainty language:</strong> "We expect" is appropriate. "We anticipate" is acceptable. "We believe" is weak — prefer "our view is" or state the position directly. "Oil will hit $90" is overconfident. "Oil could potentially move toward levels around $90" is a waste of everyone's time. "Our base case is oil at $90 by year-end" is correct.
          </StyleSection>

          <StyleSection title="Charts and Data">
            Charts in Ideas & Insights and the Visual Story are not decoration — they carry part of the argument. A chart in an I&I should prove something the text alone cannot.<br /><br />
            Chart title rules: the title states the finding, not the topic. <em>Wrong:</em> "Gold Price 2020-2026". <em>Right:</em> "Gold Has Outperformed Every Major Asset Class for Three Consecutive Years".<br /><br />
            All values in a chart must use consistent units. Never mix percentages and basis points in the same chart. Never mix billions and millions. The chart parser enforces this — inconsistent units produce broken charts.<br /><br />
            Data must be real. Illustrative or approximate values are not acceptable in client-facing content. If you do not have the data, do not include the chart.
          </StyleSection>

          <StyleSection title="The Differentiation Test" last>
            Before publishing any GIS piece, ask: what does this say that the reader could not have found in Bloomberg, Reuters, or a Goldman Sachs note this morning? If the answer is "nothing", the piece is not ready.<br /><br />
            Differentiation comes from four places: (1) the specific JPM house view applied to a security or market; (2) a data angle the reader has not seen framed this way; (3) a reframing of the consensus that is slightly contrarian but defensible; (4) a clear "what to do" that commits to a recommendation a reader can act on.<br /><br />
            The GIS brand is built on differentiated, conviction-led investment thinking. Every piece published under the JPM Private Bank name should reflect that. If it does not, do not publish it.
          </StyleSection>
        </div>
      )}

      {/* Content Scoring */}
      {section === 'scoring' && (
        <div style={{ padding: '28px 32px', maxWidth: 800 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#0A1A2F', fontWeight: 400, marginBottom: 8 }}>Content Quality Scoring</div>
          <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 28, lineHeight: 1.8, maxWidth: 680 }}>Each published piece can be scored on 10 criteria by the AI scoring engine. The engine uses claude-haiku-4-5 (500 tokens) to evaluate the content programmatically and returns a score from 0.0–5.0. Scores are stored per item in the library and used to surface high-quality content in Related Content suggestions.</div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
            {scoringCriteria.map((cr, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #E8E0D0', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 52, textAlign: 'center', paddingTop: 2 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0A1A2F', lineHeight: 1 }}>{cr.weight}%</div>
                  <div style={{ fontSize: 8, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>weight</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1A2F', marginBottom: 4 }}>{cr.label}</div>
                  <div style={{ fontSize: 12, color: '#4A5568', lineHeight: 1.7 }}>{cr.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px 20px', background: '#F7F4EF', borderRadius: 8, border: '1px solid #E8E0D0', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1A2F', marginBottom: 6 }}>How scoring works</div>
            <div style={{ fontSize: 12, color: '#4A5568', lineHeight: 1.7 }}>Click the ★ QA Score button on any library item to trigger an evaluation. The model reads the full content and scores each criterion from 0.0–5.0, weighted by the percentages above. Combined score of 4.0+ indicates high-quality, publishable content. 3.5–4.0 is good but needs polish. Below 3.5 needs substantive revision.</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#FFF9EE', borderRadius: 8, border: '1px solid #E8E0D0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1A2F', marginBottom: 6 }}>Using scores in the library</div>
            <div style={{ fontSize: 12, color: '#4A5568', lineHeight: 1.7 }}>Scores are stored on library items and displayed as ★ X.X in the library card. The Related Content panel (right side of editor) uses qScore as a ranking signal — pieces with higher scores are weighted more heavily in related content suggestions. This creates a feedback loop: the better the content, the more it surfaces for advisors building new pieces.</div>
          </div>
        </div>
      )}
    </div>
  );
};




export default function App() {
  const [activeTeam, setActiveTeam] = useState('gis');
  const [libSyncing, setLibSyncing] = useState(false);
  const [libSyncStatus, setLibSyncStatus] = useState(''); // 'saved', 'saving', 'error'

  // Load shared library on mount
  React.useEffect(() => {
    loadSharedLibrary();
  }, []);

  // Shared library sync via Vercel API routes + KV storage
  const loadSharedLibrary = async () => {
    try {
      const r = await fetch('/api/library-read');
      if (r.ok) {
        const data = await r.json();
        if (data.items && data.items.length > 0) setLibraryItems(data.items);
      }
    } catch (e) { /* offline */ }
  };


  const [excelBlocks, setExcelBlocks] = useState({}); // { templateId: [block, ...] }
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [_apiKey, _setApiKey] = React.useState(() => localStorage.getItem('_ak') || '');
  const [_showKey, _setShowKey] = React.useState(false);
  React.useEffect(() => { window.__ANTHROPIC_KEY = _apiKey; }, [_apiKey]);

  // Translations state
  const [translations, setTranslations] = useState({}); // { [templateId]: { [langId]: { status, data, approvalStatus, approvedAt } } }
  const [templateLanguages, setTemplateLanguages] = useState({}); // { [templateId]: [langId...] }

  const getTargetLanguages = (templateId) => templateLanguages[templateId] || [];
  const setTargetLanguages = (templateId, langs) => setTemplateLanguages(prev => ({ ...prev, [templateId]: langs }));

  const getTranslationState = (templateId, langId) => translations[templateId]?.[langId] || { status: 'idle', data: null, approvalStatus: 'pending' };

  const setTranslationState = (templateId, langId, patch) =>
    setTranslations(prev => ({
      ...prev,
      [templateId]: { ...(prev[templateId] || {}), [langId]: { ...(prev[templateId]?.[langId] || {}), ...patch } }
    }));

  const translateContent = async (templateId, langId) => {
    const lang = ALL_LANGUAGES.find(l => l.id === langId);
    if (!lang) return;
    const content = templateContents[templateId] || {};
    setTranslationState(templateId, langId, { status: 'translating', data: null });

    // Build sections array from any template format
    const getSections = () => {
      const secs = [];
      if (content.marketUpdate) secs.push({ id: 'market', title: 'Market Update', content: content.marketUpdate });
      if (content.focusSections) content.focusSections.filter(f => f.content).forEach(f => secs.push({ id: f.id, title: f.title, content: f.content }));
      if (content.sections) content.sections.filter(s => s.content).forEach(s => secs.push({ id: s.id, title: s.title, content: s.content }));
      if (content.updates) content.updates.filter(u => u.content).forEach(u => secs.push({ id: u.id, title: u.title, content: u.content }));
      return secs;
    };

    const sections = getSections();
    const sectionsText = sections.slice(0, 6).map(s => `<SECTION id="${s.id}" title="${s.title}">${s.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)}</SECTION>`).join('\n');

    try {
      const prompt = `Translate this J.P. Morgan Private Bank content into ${lang.label}. Preserve financial terminology, tone, and structure exactly. Use identical XML tags. No additions.

<TITLE>${content.title || ''}</TITLE>
${content.tagline ? '<TAGLINE>' + content.tagline + '</TAGLINE>' : ''}
${sectionsText}`;

      const text = await callClaude({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      });

      // Parse tagged response
      const result = { title: content.title || '', tagline: content.tagline || '', sections: [] };
      const titleM = text.match(/<TITLE>([\s\S]*?)<\/TITLE>/);
      if (titleM) result.title = titleM[1].trim();
      const taglineM = text.match(/<TAGLINE>([\s\S]*?)<\/TAGLINE>/);
      if (taglineM) result.tagline = taglineM[1].trim();
      const secRe = /<SECTION id="([^"]+)" title="([^"]+)">([\s\S]*?)<\/SECTION>/g;
      let m;
      while ((m = secRe.exec(text)) !== null) {
        result.sections.push({ id: m[1], title: m[2], content: m[3].trim() });
      }
      // Fallback if no tags parsed
      if (result.sections.length === 0 && text.trim()) {
        result.sections = sections.map(s => ({ ...s, content: text }));
      }

      setTranslationState(templateId, langId, { status: 'done', data: result, approvalStatus: 'pending' });
    } catch (err) {
      console.error('Translation error:', err);
      setTranslationState(templateId, langId, { status: 'error', data: null });
    }
  };

  const approveTranslation = (templateId, langId) =>
    setTranslationState(templateId, langId, { approvalStatus: 'approved', approvedAt: new Date().toISOString() });

  const rejectTranslation = (templateId, langId) =>
    setTranslationState(templateId, langId, { approvalStatus: 'rejected' });

  // Translate a library item's stored content (called from Translations tab content picker)
  const translateLibraryContent = async (templateId, langId, itemContent, isExt, langs) => {
    // Ensure language is in the target list for this template
    if (!templateLanguages[templateId]?.includes(langId)) {
      setTemplateLanguages(prev => ({ ...prev, [templateId]: [...(prev[templateId] || []), langId] }));
    }
    await translateContent(templateId, langId);
  };
  const [activeTab, setActiveTab] = useState('content'); // Content Library is PRIMARY
  const [activeTemplate, setActiveTemplate] = useState('topMarketTakeaways');
  const [showAIDrafting, setShowAIDrafting] = useState(false);
  const [showOutputPreview, setShowOutputPreview] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [modalTeam, setModalTeam] = useState('GIS');
  const [clientExposureTicker, setClientExposureTicker] = useState(null);
  const [editingFromLibrary, setEditingFromLibrary] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'
  const [lastSaved, setLastSaved] = useState(null);
  const [showMetadata, setShowMetadata] = useState(true); // Metadata panel visibility
  
  // Content Library filters - arrays for multi-select
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterAuthors, setFilterAuthors] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);
  const [filterAssetClasses, setFilterAssetClasses] = useState([]);
  const [filterFunctions, setFilterFunctions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toggle filter helper
  const toggleFilter = (arr, setArr, value) => {
    if (arr.includes(value)) {
      setArr(arr.filter(v => v !== value));
    } else {
      setArr([...arr, value]);
    }
  };
  
  // Template content state - this is what AI populates
  const [templateContents, setTemplateContents] = useState({
    deskCommentary: {
      title: '',
      keyMessage: '',
      context: '',
      ourView: '',
      isExternal: false // Internal by default
    },
    dailyMarketUpdate: {
      title: '',
      region: 'APAC',
      sections: null,
    },
    topMarketTakeaways: {
      title: '',
      hook: '',
      keyTakeaways: ['', '', ''],
      isExternal: true // External by default (Nexus)
    },
    ideasInsights: {
      title: '',
      executiveSummary: '',
      setup: '',
      deepDive: '',
      implications: '',
      ourView: ''
    }
  });
  
  // Update template content
  const updateTemplateContent = (templateId, updates) => {
    setTemplateContents(prev => ({
      ...prev,
      [templateId]: { ...prev[templateId], ...updates }
    }));
    setSaveStatus('unsaved');
  };
  
  // Content Library items - with lock support
  const makeHistory = (steps) => steps; // shorthand
  const [libraryItems, setLibraryItems] = useState([
    { id:1, title:"If Oil Backs Off, Risk Reprices", type:"topMarketTakeaways", typeLabel:"Top Market Takeaways", status:"published", isExternal:true, author:"Kriti Gupta", reviewer:"Madison Faller", team:"GIS", assetClass:"Multi-Asset", tags:["oil","equities","geopolitics"], productTags:["BNO","XLE","SPY"], regions:["Global"], vertical:"", createdDate:"2026-03-18", publishedDate:"2026-03-20", expiryDate:"2026-04-20", lockedBy:null, lockedAt:null, views:412, edition:"Week of 17 March 2026", theme:"Oil shock resolution scenario", history:[{action:"created",by:"Kriti Gupta",at:"2026-03-18T08:30:00Z"},{action:"published",by:"Madison Faller",at:"2026-03-20T08:00:00Z"}], sections:[{id:"hook",title:"Opening Paragraph",content:"The conflict in Iran has pushed oil above $100 for the first time since 2022. Markets have responded with the familiar playbook: equity sell-off, energy outperformance, inflation expectations higher. But the more interesting question is not what happens if oil stays elevated. It is what happens when it does not."},{id:"thekey",title:"The Key",content:"One-fifth of global oil transits the Strait of Hormuz. If the conflict resolves and shipping resumes, the energy price shock unwinds rapidly and risk assets reprice with equal speed."},{id:"section2",title:"Limited Sell-Off by Historical Standards",content:"Equity markets have dropped roughly 4-8% since the conflict began — modest compared to prior oil shocks. Energy equities have risen only 8% despite a 40% oil move, signalling investors are not betting on prolonged disruption."},{id:"section3",title:"The Regional Divergence",content:"Europe and Asia, as net oil importers, bear the full cost. The US, largely energy self-sufficient, is relatively insulated. If resolution comes, European and EM assets stand to benefit disproportionately."},{id:"close",title:"Portfolio Implications",content:"Trimming European exposure reduces near-term risk. Gold and infrastructure provide diversification against prolonged geopolitical risk premium. When the Strait reopens, rotation back into international equities looks attractive."}]},
    { id:2, title:"AI vs. AI: The Arms Race for Security", type:"ideasInsights", typeLabel:"Ideas & Insights", status:"published", isExternal:true, author:"Kriti Gupta", reviewer:"Thomas Mueller", team:"GIS", assetClass:"Equities", tags:["AI","cybersecurity","defence"], productTags:["PANW","CRWD","ZS"], regions:["Global"], vertical:"Technology & Innovation", createdDate:"2026-02-24", publishedDate:"2026-02-27", expiryDate:"2026-05-27", lockedBy:null, lockedAt:null, views:638, subtitle:"As AI panic fuels exaggerated fears, cybersecurity stands to benefit as a critical lever of AI adoption.", history:[{action:"created",by:"Kriti Gupta",at:"2026-02-24T09:00:00Z"},{action:"published",by:"Thomas Mueller",at:"2026-02-27T08:00:00Z"}], sections:[{id:"opportunity",title:"The Opportunity",content:"Every time a new AI model is released, a familiar panic follows. A sector sells off. Fundamentals are forgotten. Cybersecurity is the latest victim of this pattern yet it is one of the few industries that AI actively makes more necessary, not less."},{id:"data",title:"What the Data Shows",content:"Global cybersecurity spending is projected to reach $240 billion in 2026, growing at 11% CAGR to $320 billion by 2029. AI-driven security spend is growing 3-4x faster. 16% of enterprise cyberattacks are now AI-generated with effects 24% more severe."},{id:"missing",title:"What the Market Is Missing",content:"The market treats cybersecurity as a casualty of AI disruption. The opposite is true. Every new AI application creates a new attack surface. Nations now spend on sovereign AI: reshoring digital infrastructure, prioritising data sovereignty."},{id:"jpmview",title:"The JPM View",content:"Cybersecurity is not disrupted by AI — it is amplified by it. We favour pure-play cybersecurity names with strong government exposure and AI-native architectures."},{id:"action",title:"What To Do",content:"Allocate 3-5% of the technology sleeve to cybersecurity. Focus on companies with government contracts and AI-native detection capabilities."}], charts:[{id:"ch1",title:"Global Cybersecurity Spending ($bn)",chartType:"Bar",yLabel:"$ Billions",source:"J.P. Morgan Wealth Management Research, 2026",caption:"Cybersecurity spending accelerating, AI-driven security growing 3-4x faster.",dataRaw:"2022:180,2023:200,2024:220,2025:230,2026E:240,2029E:320",position:"data"},{id:"ch2",title:"World Defence Spending by Region ($bn)",chartType:"Bar",yLabel:"$ Billions",source:"J.P. Morgan CIB, Jan 2026",caption:"Defence budgets rising globally with growing share for cyber and digital security.",dataRaw:"N.America:995,Europe:457,Asia:534,MENA:209,Russia:158,Other:79",position:"missing"}]},
    { id:3, title:"Can the Consumer Hold Up If Tariffs Bite Harder?", type:"macroMarkets", typeLabel:"Macro & Markets", status:"in_review", isExternal:true, author:"Madison Faller", reviewer:"Erik Wytenus", team:"GIS", assetClass:"Multi-Asset", tags:["tariffs","consumer","macro"], productTags:["SPY","XRT","TLT"], regions:["US","Global"], vertical:"", createdDate:"2026-03-22", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, tagline:"Navigating the affordability debate in a tariff-affected economy", history:[{action:"created",by:"Madison Faller",at:"2026-03-22T10:00:00Z"},{action:"submitted",by:"Madison Faller",at:"2026-03-25T09:00:00Z"}], sections:[{id:"opening",title:"Opening Context",content:"The question every advisor is fielding right now: if tariffs push consumer goods prices meaningfully higher, does the US consumer finally crack? The headlines suggest fragility. The data suggests something more nuanced."},{id:"analysis1",title:"The Balance Sheet Advantage",content:"US household net worth reached $160 trillion at end of 2025. Debt service ratios remain near multi-decade lows. This consumer is better capitalised than at any point in the post-financial crisis era."},{id:"analysis2",title:"Where the Pressure Is Real",content:"The risk is not uniform. Lower-income households, which spend a disproportionate share of income on goods, will absorb a larger real income hit from tariff-driven price increases."},{id:"risks",title:"Key Risks",content:"A faster tariff escalation extending to services could dampen confidence broadly. Deterioration in the labour market remains the key variable to watch."},{id:"implications",title:"Implications & What to Watch",content:"Watch monthly retail sales and credit card delinquency data. Consumer staples offer a relatively defensive tilt if tariff pressure intensifies."},{id:"conclusion",title:"Conclusion",content:"The US consumer is not immune to tariff pressure, but the aggregate balance sheet is strong enough to absorb a moderate shock. Maintain broad equity exposure but favour quality and pricing power."}]},
    { id:4, title:"Fed Holds — More Hawkish Than Expected", type:"deskCommentary", typeLabel:"Desk Commentary", status:"draft", isExternal:false, author:"You", reviewer:null, team:"GIS", assetClass:"Fixed Income", tags:["Fed","rates","monetary policy"], productTags:["TLT","SHY","IEF"], regions:["US"], vertical:"", createdDate:"2026-03-28", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, history:[{action:"created",by:"You",at:"2026-03-28T07:30:00Z"}], sections:[{id:"headline",title:"Headline View",content:"The Fed held rates at 4.25-4.5% in March and struck a more hawkish tone than the market had priced. Chair Powell emphasised data-dependence but made clear the threshold for cuts has risen given persistent services inflation. We see the first cut as a Q4 story at earliest. Stay short duration in IG credit and avoid extending into long-end Treasuries until the data softens convincingly."}]},
    { id:5, title:"Iran Conflict: Live Market Update", type:"eventResponse", typeLabel:"Event Response", status:"published", isExternal:true, author:"Grace Chen", reviewer:"Madison Faller", team:"Investment Solutions", assetClass:"Multi-Asset", tags:["Iran","geopolitics","oil"], productTags:["BNO","GLD","VIX"], regions:["Global"], vertical:"", createdDate:"2026-03-05", publishedDate:"2026-03-05", expiryDate:"2026-04-05", lockedBy:null, lockedAt:null, views:891, eventType:"Geopolitical", impact:"Elevated", eventDate:"2026-03-05", history:[{action:"created",by:"Grace Chen",at:"2026-03-05T06:00:00Z"},{action:"published",by:"Madison Faller",at:"2026-03-05T08:00:00Z"}], sections:[{id:"hook",title:"Opening Context",content:"Reports of military strikes on Iranian energy infrastructure emerged in early trading on 5 March. Oil surged above $90 within minutes. This feed tracks the evolving JPM response as the situation develops."}], updates:[{id:"u1",title:"Initial Response",timestamp:"08:15 GMT",content:"Oil has surged 12% on the open following confirmed strikes on Kharg Island. Equities are selling off broadly with Europe leading the decline at -2.8%. Initial view: this represents a severe but potentially short-duration shock."},{id:"u2",title:"Market Implications",timestamp:"11:30 GMT",content:"The S&P 500 is down 3.1%. Gold is up 2.4%. The bond market is pricing stagflation risk. We do not recommend panic selling. History suggests well-capitalised investors who stay the course are rewarded."},{id:"u3",title:"JPM View",timestamp:"17:00 GMT",content:"The key variable is the Strait of Hormuz. If it stays open, this is a price spike, not a structural disruption. We favour trimming Europe and adding gold and infrastructure as portfolio hedges at current levels."}]},
    { id:6, title:"Asia Opportunity: China Consumption Recovery", type:"ideasInsights", typeLabel:"Ideas & Insights", status:"in_review", isExternal:true, author:"Grace Chen", reviewer:null, team:"Investment Solutions", assetClass:"Equities", tags:["China","Asia","consumption"], productTags:["FXI","MCHI","BABA"], regions:["Asia"], vertical:"", createdDate:"2026-03-20", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, subtitle:"Chinese consumer-facing equities are pricing in a structural slowdown the micro data does not support.", history:[{action:"created",by:"Grace Chen",at:"2026-03-20T10:00:00Z"},{action:"submitted",by:"Grace Chen",at:"2026-03-26T09:00:00Z"}], sections:[{id:"opportunity",title:"The Opportunity",content:"Chinese consumer-facing equities are trading at a 40% discount to global peers. February retail sales grew 7.2% year-on-year, the strongest since 2021. The market is pricing a structural slowdown the micro data does not support."},{id:"data",title:"What the Data Shows",content:"February retail sales grew 7.2% YoY, beating consensus by 180bps. Youth unemployment has fallen from 21% to 14%. The MSCI China is up 28% over six months, creating a positive wealth effect."},{id:"missing",title:"What the Market Is Missing",content:"The dominant narrative overstates the property downturn wealth effect and ignores rising equity markets in restoring confidence. High-frequency spending indicators are already improving."},{id:"jpmview",title:"The JPM View",content:"We are constructive on China consumer-facing equities for the first time since 2020. Compelling valuations, improving data, and supportive policy create a favourable entry point."},{id:"action",title:"What To Do",content:"Add 3-5% exposure to China consumer discretionary within EM equity allocation. Focus on quality domestic brands. This is a medium-term thesis, not a tactical trade."}], charts:[{id:"ch1",title:"China Retail Sales Growth, YoY %",chartType:"Line",yLabel:"YoY %",source:"National Bureau of Statistics of China, 2026",caption:"Chinese retail sales recovering strongly, February 2026 the best reading since 2021.",dataRaw:"Jan-25:5.1,Feb-25:4.8,Mar-25:5.9,Jun-25:6.1,Sep-25:6.8,Dec-25:7.0,Feb-26:7.2",position:"data"},{id:"ch2",title:"MSCI China vs MSCI World Forward P/E",chartType:"Bar",yLabel:"Forward P/E (x)",source:"Bloomberg Finance L.P., March 2026",caption:"Chinese equities trade at a 40% discount to global peers — widest gap since 2015.",dataRaw:"MSCI China:10.2,MSCI EM:12.4,MSCI World:17.8,S&P 500:20.1",position:"missing"}]},
    { id:7, title:"LATAM Spotlight: Brazil Rate Cycle Turning Point", type:"topMarketTakeaways", typeLabel:"Top Market Takeaways", status:"draft", isExternal:true, author:"You", reviewer:null, team:"Investment Solutions", assetClass:"Fixed Income", tags:["Brazil","LATAM","rates","EM"], productTags:["EWZ","BRF"], regions:["LATAM"], vertical:"", createdDate:"2026-03-27", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, edition:"Week of 24 March 2026", theme:"Brazil rate cycle and FX opportunity", history:[{action:"created",by:"You",at:"2026-03-27T16:00:00Z"}], sections:[{id:"hook",title:"Opening Paragraph",content:"Brazil has been hiking rates while most of the world is cutting them. That divergence is now approaching an inflection point — and it creates one of the more interesting asymmetric opportunities in emerging markets this year."},{id:"thekey",title:"The Key",content:"The Selic rate at 13.75% has done its job: Brazilian inflation has returned to target. The next move is down. When it comes, Brazilian local currency bonds and BRL-denominated assets stand to benefit significantly."},{id:"section2",title:"Why Brazil Looks Different This Time",content:"Past Brazilian rate cycles were often disrupted by fiscal deterioration or commodity shocks. The current fiscal framework is more credible than 2015. Commodity prices remain supportive of the current account."}]},
    { id:8, title:"The Case for Investment-Grade Credit in a Late-Cycle World", type:"specialistSpotlight", typeLabel:"Specialist Spotlight", status:"approved", isExternal:true, author:"Erik Wytenus", reviewer:"Madison Faller", team:"GIS", assetClass:"Fixed Income", tags:["credit","investment-grade","fixed income"], productTags:["LQD","VCIT","AGG"], regions:["US","EMEA"], vertical:"", createdDate:"2026-03-15", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, history:[{action:"created",by:"Erik Wytenus",at:"2026-03-15T09:00:00Z"},{action:"approved",by:"Madison Faller",at:"2026-03-26T14:00:00Z"}], sections:[{id:"lead",title:"The Lead",content:"Investment-grade credit is delivering equity-like returns with significantly lower volatility. At current spread levels, investors are being paid to take credit risk and the default environment remains exceptionally benign."},{id:"view",title:"The View",content:"We favour 5-7 year investment-grade corporate bonds in USD and EUR. Spreads at 110bps over Treasuries offer attractive carry and the all-in yield of 5.4% competes favourably with equity earnings yields."},{id:"why_now",title:"Why Now",content:"The rate hiking cycle is over. Duration risk has diminished. Credit quality among IG issuers is at historically high levels with net leverage and interest coverage ratios supporting continued spread compression."},{id:"takeaway",title:"Advisor Takeaway",content:"For clients seeking income without excessive equity volatility, a 15-20% allocation to IG credit is appropriate. Consider laddering maturities from 3 to 10 years to manage reinvestment risk."}]},
    { id:9, title:"EMEA Market Pulse: March 2026", type:"deskCommentary", typeLabel:"Desk Commentary", status:"published", isExternal:false, author:"Thomas Mueller", reviewer:"Erik Wytenus", team:"Investment Solutions", assetClass:"Multi-Asset", tags:["EMEA","Europe","macro"], productTags:["EZU","VGK","FEZ"], regions:["EMEA"], vertical:"", createdDate:"2026-03-01", publishedDate:"2026-03-03", expiryDate:"2026-04-03", lockedBy:null, lockedAt:null, views:278, history:[{action:"created",by:"Thomas Mueller",at:"2026-03-01T08:00:00Z"},{action:"published",by:"Erik Wytenus",at:"2026-03-03T08:00:00Z"}], sections:[{id:"headline",title:"Headline View",content:"European equities entered March with strong momentum — the Stoxx 600 up 9% year-to-date — driven by defence spending announcements and earlier-than-expected ECB rate cuts. The Iran conflict has since disrupted this trajectory. We remain structurally constructive on Europe but reduce tactical overweight until energy price visibility improves."}]},
    { id:10, title:"Outlook 2026: Promise and Pressure", type:"macroMarkets", typeLabel:"Macro & Markets", status:"published", isExternal:true, author:"Madison Faller", reviewer:"Erik Wytenus", team:"GIS", assetClass:"Multi-Asset", tags:["outlook","2026","annual","multi-asset"], productTags:["SPY","EFA","GLD","TLT"], regions:["Global"], vertical:"", createdDate:"2025-12-10", publishedDate:"2026-01-06", expiryDate:"2026-03-06", lockedBy:null, lockedAt:null, views:1847, tagline:"How to position across asset classes as growth slows but does not stop", history:[{action:"created",by:"Madison Faller",at:"2025-12-10T10:00:00Z"},{action:"published",by:"Erik Wytenus",at:"2026-01-06T08:00:00Z"}], sections:[{id:"opening",title:"Opening Context",content:"2025 delivered more than most investors expected: resilient growth, falling inflation, and equity markets that defied the pessimists. 2026 inherits that momentum but also its complications — stretched valuations, a deteriorating geopolitical environment, and a Federal Reserve cutting rates into an economy that does not obviously need them."},{id:"analysis1",title:"The Growth Outlook: Slower But Not Stalling",content:"We project US GDP growth of 1.8% in 2026, down from 2.4% in 2025. The consumer remains the swing factor. Balance sheets are strong and the wealth effect from equity markets is positive."},{id:"analysis2",title:"Where the Opportunity Is",content:"International equities enter 2026 at valuations 35-40% cheaper than US equities on a forward P/E basis. Europe, Japan, and select EM markets all offer compelling risk-adjusted returns."},{id:"risks",title:"Key Risks",content:"Two risks could invalidate our base case: a deeper US consumer slowdown; and a geopolitical escalation in the Middle East that drives an energy price shock large enough to reignite inflation."},{id:"implications",title:"Implications & What to Watch",content:"Watch monthly payrolls and consumer confidence. Monitor the Fed dot plot. In markets, credit spreads are the canary — widening beyond 150bps in IG would signal deteriorating confidence."},{id:"conclusion",title:"Conclusion",content:"2026 is not a year for bold single-directional bets. It is a year for diversification, quality, and patience. Maintain equity exposure but diversify regionally. Keep some dry powder — attractive entry points will emerge."}]},
    { id:11, title:"Why Private Credit Belongs in Every UHNW Portfolio", type:"topMarketTakeaways", typeLabel:"Top Market Takeaways", status:"approved", isExternal:true, author:"Kriti Gupta", reviewer:"Madison Faller", team:"GIS", assetClass:"Alternatives", tags:["private credit","alternatives","UHNW"], productTags:["BDCZ","PCEF"], regions:["US","Global"], vertical:"", createdDate:"2026-03-24", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, edition:"Week of 24 March 2026", theme:"Private credit as core allocation", history:[{action:"created",by:"Kriti Gupta",at:"2026-03-24T09:00:00Z"},{action:"approved",by:"Madison Faller",at:"2026-03-27T14:00:00Z"}], sections:[{id:"hook",title:"Opening Paragraph",content:"A decade ago, private credit was considered a niche alternative. Today it is a $2 trillion asset class sitting at the intersection of every structural force reshaping capital markets: the retreat of bank lending, the persistence of higher rates, and relentless demand for income from an ageing wealth pool."},{id:"thekey",title:"The Key",content:"Private credit is no longer an alternative to traditional fixed income — it is becoming a core part of it. For UHNW investors with sufficient liquidity buffers, the risk-adjusted return profile now exceeds what public markets offer at comparable credit quality."},{id:"section2",title:"The Return Premium Is Structural, Not Cyclical",content:"Private credit lenders earn an illiquidity premium of 150-250bps over comparable public credit, translating to all-in yields of 10-12% for upper-middle-market direct lending. These returns are floating rate and will not compress as sharply as public bonds when cuts eventually come."},{id:"section3",title:"Banks Are Not Coming Back",content:"Post-2008 regulatory constraints and post-2023 regional bank stress have permanently reduced bank appetite for middle-market lending. Private credit managers are filling this structural gap with disciplined underwriting and covenant protections public high-yield abandoned years ago."},{id:"close",title:"Portfolio Implications",content:"For clients with investable assets above $10 million and a 3-5 year liquidity horizon, a 10-15% allocation to private credit is appropriate. Focus on senior secured direct lending with established managers."}]},
    { id:12, title:"The Longevity Economy: Investing Across a 30-Year Retirement", type:"ideasInsights", typeLabel:"Ideas & Insights", status:"approved", isExternal:true, author:"Dana Harlap", reviewer:"Thomas Mueller", team:"GIS", assetClass:"Multi-Asset", tags:["longevity","retirement","planning"], productTags:["VTI","SCHP","VNQ"], regions:["US","Global"], vertical:"Family Office & Dynasty Wealth", createdDate:"2026-03-20", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, subtitle:"Conventional retirement portfolios built for 15-year horizons are dangerously under-equipped for the new reality.", history:[{action:"created",by:"Dana Harlap",at:"2026-03-20T10:00:00Z"},{action:"approved",by:"Thomas Mueller",at:"2026-03-27T11:00:00Z"}], sections:[{id:"opportunity",title:"The Opportunity",content:"A 65-year-old UHNW client retiring today has a 50% probability of living to 90. The portfolio they build at retirement must sustain 25-30 years of spending, inflation, healthcare costs, and potentially support the next generation. Most retirement frameworks were not built for this."},{id:"data",title:"What the Data Shows",content:"US life expectancy at 65 has increased by 5 years since 1980. Healthcare costs for a retired couple are projected at $315,000 in today dollars over 20 years. The 60/40 portfolio delivered negative real returns in 2022 for the first time in 50 years."},{id:"missing",title:"What the Market Is Missing",content:"Most models still anchor on a 15-20 year horizon and assume a straight-line glide path to bonds. Both assumptions are wrong for UHNW clients. The solution is not less equity — it is better diversification and a more dynamic spending framework."},{id:"jpmview",title:"The JPM View",content:"We advocate a goals-based framework: near-term income (0-5 years in short-duration fixed income), medium-term stability (5-15 years, balanced), and long-term growth (15+ years, equity-heavy with alternatives)."},{id:"action",title:"What To Do",content:"Review client retirement portfolios against a 30-year horizon. Shift 10-15% from traditional bonds into private credit, infrastructure, and inflation-linked assets. Introduce a dynamic spending rule linked to portfolio performance."}], charts:[{id:"ch1",title:"US Life Expectancy at Age 65 by Decade",chartType:"Line",yLabel:"Expected Years Remaining",source:"Social Security Administration, 2025",caption:"Life expectancy at 65 has increased significantly since 1980, requiring portfolios to sustain longer retirements.",dataRaw:"1980:16.4,1990:17.2,2000:17.9,2010:19.1,2020:19.8,2025E:20.5",position:"data"},{id:"ch2",title:"Real Return by Asset Class — 20-Year Annualised %",chartType:"Bar",yLabel:"Real Return, Annualised %",source:"J.P. Morgan Asset Management LTCMAs, 2026",caption:"Equities and alternatives have substantially outperformed bonds in real terms over 20-year horizons.",dataRaw:"Global Equities:5.2,Private Equity:6.8,Private Credit:4.9,Infrastructure:4.3,Core Bonds:0.8,Cash:0.2",position:"missing"}]},
    { id:13, title:"Deglobalisation or Rewiring? The Investment Case for Supply Chain Resilience", type:"macroMarkets", typeLabel:"Macro & Markets", status:"approved", isExternal:true, author:"Jake Manoukian", reviewer:"Madison Faller", team:"GIS", assetClass:"Multi-Asset", tags:["supply chain","deglobalisation","macro"], productTags:["ITA","VIS","EWJ"], regions:["Global"], vertical:"", createdDate:"2026-03-15", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, tagline:"The global economy is not deglobalising — it is rewiring. The investment implications are profound and underappreciated.", history:[{action:"created",by:"Jake Manoukian",at:"2026-03-15T09:00:00Z"},{action:"approved",by:"Madison Faller",at:"2026-03-27T15:00:00Z"}], sections:[{id:"opening",title:"Opening Context",content:"Every major shock of the past five years has reinforced the same conclusion: the hyper-efficient just-in-time global supply chain was optimised for cost, not resilience. The question now is not whether supply chains will change, but who benefits and at what cost."},{id:"analysis1",title:"Rewiring, Not Retreat",content:"Global trade volumes remain at record highs. What has changed is the architecture. Supply chains are shortening in sensitive sectors — semiconductors, pharmaceuticals, defence — while diversifying in others. This is friend-shoring and near-shoring, not the end of globalisation."},{id:"analysis2",title:"The Capital Expenditure Supercycle",content:"Rebuilding supply chain resilience requires massive fixed capital investment. The US CHIPS Act alone commits $52 billion to domestic semiconductor manufacturing. European industrial policy follows a similar path. This is a structural reallocation of capital that will persist for a decade."},{id:"analysis3",title:"The Inflationary Undertow",content:"Resilience has a price. Domestic manufacturing in developed markets costs more than offshore production. This is one of the structural forces keeping inflation stickier than pre-pandemic models expected."},{id:"risks",title:"Key Risks",content:"The primary risk is geopolitical de-escalation reducing reshoring urgency — though structural policy commitments already made are largely irreversible. Execution risk is real: building new semiconductor fabs takes 3-5 years."},{id:"implications",title:"Implications & What to Watch",content:"Watch US and European industrial production, capex announcements from tech and defence, and policy signals on industrial subsidies. Industrial, infrastructure, and materials companies are direct beneficiaries."},{id:"conclusion",title:"Conclusion",content:"Supply chain resilience is not a theme — it is a decade-long structural shift in how the world allocates capital. Investors who position early, across industrials, infrastructure, and the capex ecosystem, stand to benefit from one of the most durable capital expenditure cycles in a generation."}]},
    { id:14, title:"ECB Decision: 25bp Cut — Less Dovish Than Hoped", type:"deskCommentary", typeLabel:"Desk Commentary", status:"approved", isExternal:false, author:"Nataliia Lipikhina", reviewer:"Thomas Mueller", team:"GIS", assetClass:"Fixed Income", tags:["ECB","Europe","rates","FX"], productTags:["EZU","BUND"], regions:["EMEA"], vertical:"", createdDate:"2026-03-27", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, history:[{action:"created",by:"Nataliia Lipikhina",at:"2026-03-27T14:00:00Z"},{action:"approved",by:"Thomas Mueller",at:"2026-03-28T09:00:00Z"}], sections:[{id:"headline",title:"Headline View",content:"The ECB delivered the expected 25bp cut to 2.5% but struck a more cautious tone than the market had priced, with Lagarde declining to signal the pace of future cuts given persistent services inflation. EUR/USD ticked higher on the hawkish read. We see two further cuts in 2026 — June and September — but the path is data-dependent and oil-price sensitive. Stay modestly long EUR duration via 5-year Bunds; avoid extending to 10-year until energy price clarity improves."}]},
    { id:15, title:"Strait of Hormuz: Week Two Update", type:"eventResponse", typeLabel:"Event Response", status:"approved", isExternal:true, author:"Elyse Ausenbaugh", reviewer:"Grace Chen", team:"Investment Solutions", assetClass:"Multi-Asset", tags:["Iran","oil","geopolitics","Hormuz"], productTags:["BNO","GLD","XLE"], regions:["Global"], vertical:"", createdDate:"2026-03-12", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, eventType:"Geopolitical", impact:"Elevated", eventDate:"2026-03-05", history:[{action:"created",by:"Elyse Ausenbaugh",at:"2026-03-12T08:00:00Z"},{action:"approved",by:"Grace Chen",at:"2026-03-12T14:00:00Z"}], sections:[{id:"hook",title:"Opening Context",content:"Two weeks into the Iran conflict, the Strait of Hormuz remains closed to commercial traffic. This feed continues tracking the JPM Private Bank response as the situation evolves."}], updates:[{id:"u1",title:"Week Two: Strait Remains Closed",timestamp:"08:00 GMT, 12 Mar",content:"Vessel traffic through the Strait is at zero for the 12th consecutive day. Oil has stabilised around $105 after the initial spike to $118. The shock is supply disruption, not supply destruction."},{id:"u2",title:"Portfolio Positioning Update",timestamp:"12:00 GMT, 12 Mar",content:"We have moved to underweight European equities and overweight US on a relative basis. Added gold to 5% of portfolio as geopolitical hedge. Energy sector overweight maintained."},{id:"u3",title:"Scenario Analysis",timestamp:"16:00 GMT, 12 Mar",content:"Base case (60%): Strait reopens within 4-6 weeks, oil returns to $85-90, risk assets recover sharply. Bear case (20%): Prolonged closure beyond 8 weeks, oil reaches $130, global recession risk rises materially."}]},
    { id:16, title:"Window to the Markets: Oil Shock Special Edition", type:"videoPublish", typeLabel:"Video Publish", status:"approved", isExternal:true, author:"Grace Peters", reviewer:"Madison Faller", team:"GIS", assetClass:"Multi-Asset", tags:["video","oil","markets"], productTags:[], regions:["Global"], vertical:"", series:"Window to the Markets", region:"Global", createdDate:"2026-03-10", publishedDate:null, expiryDate:null, lockedBy:null, lockedAt:null, views:0, history:[{action:"created",by:"Grace Peters",at:"2026-03-10T09:00:00Z"},{action:"approved",by:"Madison Faller",at:"2026-03-11T10:00:00Z"}], sections:[{id:"summary",title:"Video Summary",content:"Grace Peters provides the JPM Private Bank view on the oil shock triggered by the Iran conflict — what it means for portfolios, which regions are most exposed, and what advisors should be telling clients."},{id:"keyPoints",title:"Key Takeaways",content:"Oil above $100 is a headwind, not a crisis — past shocks show markets recover when supply resumes. Europe bears the sharpest pain as a net oil importer. For nervous clients: trimming Europe, adding gold and infrastructure is the right near-term move."}]},
    { id:20, title:"Long-Term Capital Market Assumptions 2026", type:"macroMarkets", typeLabel:"Macro & Markets", status:"published", isExternal:true, author:"Madison Faller", reviewer:"Erik Wytenus", team:"GIS", assetClass:"Multi-Asset", functionType:"Strategy", tags:["LTCMAs","long-term","multi-asset","outlook","returns"], productTags:["SPY","EFA","AGG","GLD"], regions:["Global"], vertical:"", createdDate:"2026-01-06", publishedDate:"2026-01-10", expiryDate:"2026-12-31", lockedBy:null, lockedAt:null, views:2341, qScore:4.8, tagline:"Our 10-15 year return assumptions across all major asset classes", history:[{action:"created",by:"Madison Faller",at:"2026-01-06T08:00:00Z"},{action:"published",by:"Erik Wytenus",at:"2026-01-10T08:00:00Z"}], sections:[{id:"opening",title:"The Setup",content:"Every year we update our long-term capital market assumptions. This year reflects a world that has re-priced risk meaningfully: higher rates, more volatile geopolitics, and a technology transformation whose economic effects are still being absorbed."},{id:"analysis1",title:"Core Return Assumptions",content:"For global equities, we project annualised returns of 7.2% in USD over the next decade. Investment grade credit offers 5.1% expected returns - the most attractive since 2010."},{id:"conclusion",title:"Conclusion",content:"The long run still works. Diversification still works. The inputs have changed; the framework has not."}]},
    { id:21, title:"Global Family Office Survey 2026", type:"ideasInsights", typeLabel:"Ideas & Insights", status:"published", isExternal:true, author:"Kriti Gupta", reviewer:"Madison Faller", team:"GIS", assetClass:"Alternatives", functionType:"Strategy", tags:["family office","survey","alternatives","private markets","2026"], productTags:[], regions:["Global"], vertical:"Family Office & Dynasty Wealth", createdDate:"2026-02-03", publishedDate:"2026-02-10", expiryDate:"2026-08-10", lockedBy:null, lockedAt:null, views:1876, qScore:4.6, subtitle:"How 200 single-family offices are positioning for 2026 and beyond", history:[{action:"created",by:"Kriti Gupta",at:"2026-02-03T09:00:00Z"},{action:"published",by:"Madison Faller",at:"2026-02-10T08:00:00Z"}], sections:[{id:"opportunity",title:"Key Findings",content:"Our 2026 Global Family Office Survey polled 200 single-family offices across 28 countries, representing over $600 billion in combined AUM. Three themes dominate: rotation toward private markets, urgency around AI infrastructure, and rising interest in impact strategies."},{id:"data",title:"Asset Allocation Shifts",content:"Allocation to private equity increased to 28% of total AUM, up from 24% in 2023. Public equities fell to 31% from 38%. Cash rose to 12% - reflecting uncertainty rather than risk aversion."},{id:"jpmview",title:"Our View",content:"Advisors who can deliver co-investment opportunities and private market access will deepen family office relationships. Those who cannot risk losing wallet share."}]},
    { id:22, title:"Mid-Year Outlook 2026: Recalibrating the Path", type:"macroMarkets", typeLabel:"Macro & Markets", status:"published", isExternal:true, author:"Erik Wytenus", reviewer:"Madison Faller", team:"GIS", assetClass:"Multi-Asset", functionType:"Strategy", tags:["mid-year","outlook","2026","recalibration","equities","rates"], productTags:["SPY","EFA","TLT","GLD"], regions:["Global"], vertical:"", createdDate:"2026-04-20", publishedDate:"2026-05-01", expiryDate:"2026-09-30", lockedBy:null, lockedAt:null, views:1654, qScore:4.7, tagline:"How has our January view held up - and where are we changing our minds?", history:[{action:"created",by:"Erik Wytenus",at:"2026-04-20T09:00:00Z"},{action:"published",by:"Madison Faller",at:"2026-05-01T08:00:00Z"}], sections:[{id:"opening",title:"How the Year Has Unfolded",content:"We wrote in January that 2026 would be a year of promise and pressure. Four months in, the pressure is more visible than the promise. US growth has slowed faster than our base case."},{id:"analysis1",title:"What We Got Right",content:"Our overweight to international equities has added approximately 8% of alpha relative to the S&P 500. The valuation re-rating we expected is playing out as expected."},{id:"analysis2",title:"Where We Are Adjusting",content:"We are reducing US equity to neutral and extending duration. We are adding to EM local currency debt."},{id:"conclusion",title:"Revised Positioning",content:"Quality over growth. International over domestic. Bonds deserve more respect than they are getting. Gold remains a core holding."}]},
    { id:23, title:"GIS View: May 2026 - Staying the Course on International", type:"gisView", typeLabel:"GIS View", status:"published", isExternal:true, author:"Madison Faller", reviewer:null, team:"GIS", assetClass:"Equities", functionType:"Strategy", tags:["GIS View","international equities","positioning","May 2026"], productTags:["EFA","VEA","IEFA"], regions:["Global"], vertical:"", createdDate:"2026-05-05", publishedDate:"2026-05-06", expiryDate:"2026-07-06", lockedBy:null, lockedAt:null, views:892, qScore:4.5, history:[{action:"created",by:"Madison Faller",at:"2026-05-05T09:00:00Z"},{action:"published",by:"Madison Faller",at:"2026-05-06T08:00:00Z"}], sections:[{id:"key",title:"Key Message",content:"We maintain our preference for international over US equities. The valuation gap between European and US equities remains at decade-wide levels."},{id:"context",title:"Context",content:"Since our January overweight, international equities have added approximately 8% of alpha relative to the S&P 500. The thesis is playing out."},{id:"view",title:"Our View",content:"The case is intact: better valuations, improving earnings momentum, and a weaker dollar tailwind. Any pullback in European equities is a buying opportunity."}]},
    { id:24, title:"Top Market Takeaways: The Fed Is Not Going to Save You This Time", type:"topMarketTakeaways", typeLabel:"Top Market Takeaways", status:"published", isExternal:true, author:"Kriti Gupta", reviewer:"Madison Faller", team:"GIS", assetClass:"Multi-Asset", functionType:"Strategy", tags:["Fed","rates","equities","monetary policy","portfolio"], productTags:["SPY","TLT","GLD"], regions:["US","Global"], vertical:"", createdDate:"2026-04-28", publishedDate:"2026-04-29", expiryDate:"2026-06-29", lockedBy:null, lockedAt:null, views:1243, qScore:4.7, history:[{action:"created",by:"Kriti Gupta",at:"2026-04-28T09:00:00Z"},{action:"published",by:"Madison Faller",at:"2026-04-29T08:00:00Z"}], sections:[{id:"hook",title:"Opening Paragraph",content:"For 15 years, investors learned a simple rule: when markets fall, the Fed will cut. That rule - the Fed Put - may no longer be operative. Portfolios built around that assumption are more vulnerable than their owners realise."},{id:"thekey",title:"The Key",content:"The Fed can only cut if inflation is contained. With core services inflation still running above 3%, the central bank's hands are tied in a way they were not in 2019, 2020, or 2022."},{id:"section2",title:"The Changed Calculus",content:"In every equity drawdown since 2009, the Fed's response function provided a floor. That assumption is now in doubt - and if it breaks, the valuation framework for equities needs to be reset."},{id:"close",title:"Portfolio Implications",content:"Own genuine hedges. Gold outperforms in stagflation. Short duration protects capital. Quality equities with pricing power outperform in higher-for-longer environments."}]},
    { id:26, title:"Centre for Geopolitics: Navigating Fragmentation", type:"macroMarkets", typeLabel:"Macro & Markets", status:"published", isExternal:true, author:"Erik Wytenus", reviewer:"Madison Faller", team:"GIS", assetClass:"Multi-Asset", functionType:"Strategy", tags:["geopolitics","fragmentation","multipolar","deglobalisation","risk","China","Russia","BRICS"], productTags:["GLD","TLT","EFA","VNQ"], regions:["Global"], vertical:"", createdDate:"2026-04-14", publishedDate:"2026-04-18", expiryDate:"2026-10-18", lockedBy:null, lockedAt:null, views:1432, qScore:4.7, tagline:"How the fracturing of the post-Cold War order is reshaping portfolio construction", history:[{action:"created",by:"Erik Wytenus",at:"2026-04-14T09:00:00Z"},{action:"published",by:"Madison Faller",at:"2026-04-18T08:00:00Z"}], sections:[{id:"opening",title:"The New Geopolitical Order",content:"The rules-based international order that governed trade, finance, and security for 30 years is fragmenting. Not collapsing - fragmenting. The distinction matters. A collapse would be a crisis. Fragmentation is something more insidious: a slow reorganisation of global relationships that reprices assets gradually, then suddenly."},{id:"analysis1",title:"What Fragmentation Actually Means for Markets",content:"Fragmentation does not mean de-globalisation. Global trade volumes remain near record highs. But the composition of trade is changing: more within blocs, less between them. Supply chains are being duplicated across geopolitical fault lines. This is expensive. The cost is borne by corporates first, then consumers, then equity valuations."},{id:"analysis2",title:"The Three Axes of Risk",content:"Three primary geopolitical axes drive portfolio risk in 2026: the US-China technology and trade relationship, the Russia-Europe energy and security realignment, and the emerging market multipolar realignment as countries hedge between the G7 and the BRICS-adjacent bloc. Each axis has distinct asset implications."},{id:"analysis3",title:"Portfolio Implications",content:"Geopolitical risk does not diversify well in traditional portfolios. Correlations between equities and bonds break down precisely when geopolitical shocks hit. Gold, real assets, infrastructure, and short-duration high-quality fixed income provide genuine geopolitical resilience."},{id:"conclusion",title:"Conclusion",content:"Position for a world of constrained globalisation, higher structural inflation, and periodic geopolitical shocks. Diversify away from over-concentration in US assets. Add real assets and gold. Extend the time horizon - geopolitical transitions take years, not quarters."}]},
    { id:27, title:"NVDA Q1 FY2027: Beats on All Lines — Blackwell Ramp Accelerating", type:"deskCommentary", typeLabel:"Desk Commentary", status:"published", isExternal:false, author:"Kriti Gupta", reviewer:null, team:"GIS", assetClass:"Equities", functionType:"Strategy", tags:["NVIDIA","earnings","AI","semiconductors","beat","data centre"], productTags:["NVDA"], regions:["US"], vertical:"", createdDate:"2026-05-22", publishedDate:"2026-05-22", expiryDate:"2026-08-22", lockedBy:null, lockedAt:null, views:876, qScore:4.6, history:[{action:"created",by:"Kriti Gupta",at:"2026-05-22T22:00:00Z"},{action:"published",by:"Kriti Gupta",at:"2026-05-22T22:30:00Z"}], sections:[{id:"headline",title:"Headline View",content:"NVIDIA delivered another blowout quarter — revenue of $44.1Bn beat the $43.2Bn consensus by 2%, with data centre at $39.3Bn ahead of the $38.5Bn estimate. The Blackwell ramp is tracking ahead of our model. EPS of $0.96 beat $0.94e. Guidance of $45.5Bn for Q2 is above the $44.8Bn street estimate. Our view: the AI infrastructure buildout remains earlier cycle than consensus believes. We maintain our overweight. For clients with positions below 3% of portfolio, this earnings print supports adding on any weakness."}]},
    { id:28, title:"Specialist Spotlight: NVIDIA — Why the Multiple Is Justified", type:"specialistSpotlight", typeLabel:"Specialist Spotlight", status:"published", isExternal:true, author:"Kriti Gupta", reviewer:"Madison Faller", team:"GIS", assetClass:"Equities", functionType:"Strategy", tags:["NVIDIA","AI","semiconductors","valuation","data centre","Blackwell"], productTags:["NVDA"], regions:["US"], vertical:"", createdDate:"2026-04-15", publishedDate:"2026-04-17", expiryDate:"2026-07-17", lockedBy:null, lockedAt:null, views:1102, qScore:4.7, history:[{action:"created",by:"Kriti Gupta",at:"2026-04-15T09:00:00Z"},{action:"published",by:"Madison Faller",at:"2026-04-17T08:00:00Z"}], sections:[{id:"lead",title:"The Lead",content:"At 35x forward earnings, NVIDIA trades at a significant premium to the market. The consensus view is that this is stretched. Our view is that it understates the durability and scale of the AI infrastructure supercycle."},{id:"view",title:"The View",content:"NVIDIA is not a cyclical semiconductor company being valued on a cyclical multiple. It is the dominant infrastructure provider for a generational technology transition. The appropriate comp is not Intel in 2000 — it is Cisco at the peak of the internet buildout, but with a far more defensible competitive position and no comparable market cap."},{id:"why_now",title:"Why Now",content:"The Blackwell architecture is ramping faster than our initial model. Hyperscaler capex guidance for 2026 has been revised up three times this year. China export controls are a risk, but demand from US, European, and Japanese hyperscalers is more than compensating."},{id:"takeaway",title:"Advisor Takeaway",content:"For clients without NVDA exposure: the entry point has become less attractive after the recent run, but a 1-2% position initiated on any 10%+ pullback remains our recommendation. For existing holders: hold, do not chase."}]},
    { id:29, title:"Ideas & Insights: The AI Infrastructure Trade — Mid-Cycle, Not Late-Cycle", type:"ideasInsights", typeLabel:"Ideas & Insights", status:"published", isExternal:true, author:"Madison Faller", reviewer:"Erik Wytenus", team:"GIS", assetClass:"Equities", functionType:"Strategy", tags:["AI","infrastructure","NVIDIA","semiconductors","data centre","capex","mid-cycle"], productTags:["NVDA","MSFT","GOOGL","AMZN","AMD"], regions:["US","Global"], vertical:"", createdDate:"2026-03-10", publishedDate:"2026-03-14", expiryDate:"2026-09-14", lockedBy:null, lockedAt:null, views:2134, qScore:4.8, tagline:"The market is pricing in a late-cycle AI trade. The data suggests we are much earlier than that.", history:[{action:"created",by:"Madison Faller",at:"2026-03-10T09:00:00Z"},{action:"published",by:"Erik Wytenus",at:"2026-03-14T08:00:00Z"}], sections:[{id:"opportunity",title:"The Opportunity",content:"AI infrastructure spending is accelerating, not decelerating. Combined hyperscaler capex guidance for 2026 has been revised up $180Bn since January — a number larger than the entire global semiconductor market in 2010. The market is pricing AI as a late-cycle trade due for digestion. We believe it is mid-cycle at best, with the most capital-intensive phase still ahead."},{id:"data",title:"What the Data Shows",content:"Microsoft, Google, Amazon, and Meta have all raised 2026 capex guidance by 15-30% year-to-date. NVIDIA data centre revenue has compounded at 180% annually for six consecutive quarters. Enterprise AI adoption — the second wave after hyperscaler infrastructure — is only beginning. The GPU shortage is structural, not cyclical."},{id:"missing",title:"What the Market Is Missing",content:"Consensus is applying a late-cycle semiconductor framework to what is a generational infrastructure buildout. The correct framework is closer to the 1990s fibre and router buildout — extended, capital-intensive, with a dominant picks-and-shovels winner. NVIDIA is that winner. The digestion risk is real but overpriced."},{id:"jpmview",title:"The JPM View",content:"We are overweight AI infrastructure. Our primary expression is NVDA, supplemented by Microsoft (Azure AI monetisation) and selective semiconductor capital equipment exposure. We would add AMD as a secondary beneficiary. We avoid pure-play AI software at current valuations."},{id:"action",title:"What To Do",content:"Investors without AI infrastructure exposure should establish a position across NVDA (primary), MSFT (diversified), and one capital equipment name. Sizing: 4-6% of portfolio combined. Investors already positioned: hold, resist the temptation to take profits prematurely — the capex cycle has at least 2 more years to run."}]},
]);

  // Workflow actions
  const updateItemStatus = (itemId, newStatus, comment = '') => {
    const user = currentUser;
    const actionMap = { in_review: 'submitted', approved: 'approved', published: 'published', archived: 'archived', draft: 'changes_requested' };
    setLibraryItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const historyEntry = { action: actionMap[newStatus] || newStatus, by: user, at: new Date().toISOString(), ...(comment ? { comment } : {}) };
      return { ...item, status: newStatus, publishedDate: newStatus === 'published' ? new Date().toISOString().split('T')[0] : item.publishedDate, history: [...(item.history || []), historyEntry] };
    }));
  };

  const setItemReviewer = (itemId, reviewer) => {
    setLibraryItems(prev => prev.map(item => item.id === itemId ? { ...item, reviewer } : item));
  };

  const updateItemTags = (itemId, tags) => {
    setLibraryItems(prev => prev.map(item => item.id === itemId ? { ...item, tags } : item));
  };
  
  // Current user (would come from auth in real app)
  const currentUser = 'You';
  const isAdmin = true; // For demo purposes
  
  // Lock management functions
  const lockDocument = (itemId) => {
    setLibraryItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, lockedBy: currentUser, lockedAt: new Date().toISOString() }
        : item
    ));
  };
  
  const unlockDocument = (itemId) => {
    setLibraryItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, lockedBy: null, lockedAt: null }
        : item
    ));
  };
  
  const forceUnlock = (itemId) => {
    // Admin only - force unlock someone else's document
    if (isAdmin) {
      unlockDocument(itemId);
    }
  };
  
  const formatLockTime = (isoString) => {
    if (!isoString) return '';
    const lockTime = new Date(isoString);
    const now = new Date();
    const diffMins = Math.round((now - lockTime) / (1000 * 60));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };
  
  const isLockedByOther = (item) => {
    return item.lockedBy && item.lockedBy !== currentUser;
  };
  
  // Get unique values for filter dropdowns
  const uniqueAuthors = [...new Set(libraryItems.map(item => item.author))];
  const uniqueStatuses = ['draft', 'in_review', 'approved', 'published'];
  const uniqueTypes = [...new Set(libraryItems.map(item => item.type))];
  
  // Format date to DD MMM YY
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
  };
  
  // Check if any filters are active
  const hasActiveFilters = filterStatuses.length > 0 || filterTypes.length > 0 || filterAuthors.length > 0 || filterTeams.length > 0 || searchQuery;
  
  // Filter library items
  // Sync library to Netlify Blobs backend
  const saveSharedLibrary = React.useCallback(async (items) => {
    try {
      setLibSyncStatus('saving');
      await fetch('/.netlify/functions/library-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      setLibSyncStatus('saved');
    } catch (e) {
      setLibSyncStatus('error');
    }
  }, []);

  // Sync to shared backend whenever library changes
  const [_libLoaded, _setLibLoaded] = React.useState(false);
  React.useEffect(() => {
    if (!_libLoaded) { _setLibLoaded(true); return; }
    saveSharedLibrary(libraryItems);
  }, [libraryItems]);

  const filteredItems = React.useMemo(() => libraryItems.filter(item => {
    if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;
    if (filterTypes.length > 0 && !filterTypes.includes(item.type)) return false;
    if (filterAuthors.length > 0 && !filterAuthors.includes(item.author)) return false;
    if (filterTeams.length > 0 && !filterTeams.includes(item.team)) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [libraryItems, filterStatuses, filterTypes, filterAuthors, filterTeams, searchQuery]);

  // Save to library
  // Excel connector handlers
  const handleExcelInsert = (block) => {
    setExcelBlocks(prev => ({
      ...prev,
      [activeTemplate]: [...(prev[activeTemplate] || []), block]
    }));
  };

  const handleExcelRefresh = (blockId, file, templateId) => {
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type:'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false, dateNF:'dd-mmm-yyyy' });
        const rows = json.filter(r => r.some(c => c !== ''));
        if (rows.length < 2) return;
        const headers = rows[0].map((h,i) => h!==''?String(h):'Col '+(i+1));
        setExcelBlocks(prev => ({
          ...prev,
          [templateId]: (prev[templateId]||[]).map(b =>
            b.id === blockId ? { ...b, headers, rows: rows.slice(1), fileName: file.name } : b
          )
        }));
      } catch(err) { alert('Refresh failed: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

    const selectTemplate = (templateId) => {
    const blankContent = {
      deskCommentary: { title:'', sections:null, isExternal:false },
      dailyMarketUpdate: { title:'', region:'APAC', metrics:null, sections:null },
      topMarketTakeaways: { title:'', sections:null, isExternal:true },
      ideasInsights: { title:'', subtitle:'', sections:null, charts:[], isExternal:true },
      macroMarkets: { title:'', sections:null },
      eventResponse: { title:'', updates:[], sections:null },
      videoPublish: { title:'', sections:null, series:'Window to the Markets', isExternal:true },
    };
    setTemplateContents(prev => ({
      ...prev,
      [templateId]: { ...(blankContent[templateId] || { title:'', sections:null }) }
    }));
    setActiveTemplate(templateId);
    setEditingItemId(null);
    setEditingFromLibrary(true);
    setShowTemplateModal(false);
    setActiveTab('editor');
    setSaveStatus('unsaved');
  };

    const saveToLibrary = () => {
    setSaveStatus('saving');
    try {
      const content = templateContents[activeTemplate] || {};
      const allNames = { deskCommentary:'Desk Commentary', dailyMarketUpdate:'Daily Market Update', topMarketTakeaways:'Top Market Takeaways', ideasInsights:'Ideas & Insights', macroMarkets:'Macro & Markets', eventResponse:'Event Response', videoPublish:'Video Publish', specialistSpotlight:'Specialist Spotlight', morningMeeting:'Morning Meeting', tradeIdea:'Trade Idea' };
      if (editingItemId) {
        setLibraryItems(prev => prev.map(item => {
          if (item.id !== editingItemId) return item;
          const u = { ...item };
          if (content.title) u.title = content.title;
          if (content.sections !== undefined) u.sections = content.sections;
          if (content.attachments !== undefined) u.attachments = content.attachments;
          if (content.charts !== undefined) u.charts = content.charts;
          if (content.updates !== undefined) u.updates = content.updates;
          if (content.subtitle !== undefined) u.subtitle = content.subtitle;
          u.updatedDate = new Date().toISOString().split('T')[0];
          u.history = [...(item.history||[]), { action:'updated', by:'You', at:new Date().toISOString() }];
          return u;
        }));
      } else {
        const tags = content.tags ? (Array.isArray(content.tags) ? content.tags : content.tags.split(',').map(t=>t.trim()).filter(Boolean)) : [];
        const newItem = {
          id: Date.now(), title: content.title || 'Untitled '+(allNames[activeTemplate]||'Draft'),
          type: activeTemplate, typeLabel: allNames[activeTemplate]||activeTemplate, status:'draft',
          isExternal: content.isExternal||false, author: content.author||'You', reviewer:null,
          team: activeTeam==='gis'?'GIS': activeTeam==='banking'?'Banking': activeTeam==='planning'?'Planning':'Investment Solutions', assetClass: content.assetClass||'Multi-Asset',
          tags, regions: content.region?[content.region]:['Global'], productTags: content.productTags||[],
          vertical:'', createdDate:new Date().toISOString().split('T')[0], publishedDate:null,
          expiryDate:content.expiryDate||null, lockedBy:null, lockedAt:null, views:0,
          sections:content.sections||[],
          attachments:content.attachments||[], charts:content.charts||[], updates:content.updates||[],
          subtitle:content.subtitle||'', tagline:content.tagline||'',
          history:[{ action:'created', by:content.author||'You', at:new Date().toISOString() }],
        };
        setLibraryItems(prev => [newItem, ...prev]);
        // Don't set editingItemId - avoids triggering lock status re-render on new items
      }
    } catch(err) { console.error('Save error:', err); }
    setSaveStatus('saved');
    setLastSaved(new Date());
  };

  const gisTemplates = [
    { id: 'headline', name: 'Headline', icon: '⚡', color: c.gold, nexus: false },
    { id: 'dailyMarketUpdate', name: 'Daily Market Update', icon: '📈', color: c.gold, nexus: false, internal: true },
    { id: 'deskCommentary', name: 'Desk Commentary', icon: '💬', color: c.teal, nexus: false },
    { id: 'morningMeeting', name: 'Morning Meeting', icon: '☀️', color: c.teal, nexus: false },
    { id: 'topMarketTakeaways', name: 'Top Market Takeaways', icon: '📰', color: c.gold, nexus: true },
    { id: 'specialistSpotlight', name: 'Specialist Spotlight', icon: '👤', color: c.gold, nexus: true },
    { id: 'chartOfTheWeek', name: 'Chart of the Week', icon: '📈', color: c.pos, nexus: true },
    { id: 'ideasInsights', name: 'Ideas & Insights', icon: '💡', color: c.navy, nexus: true },
    { id: 'gisView', name: 'GIS View', icon: '🎯', color: c.teal, nexus: true },
    { id: 'macroMarkets', name: 'Macro & Markets', icon: '🌍', color: c.navy, nexus: true },
    { id: 'eventResponse', name: 'Event Response', icon: '⚡', color: '#B84242', nexus: true },
    { id: 'videoPublish', name: 'Video Publish', icon: '🎬', color: c.neg, nexus: true },
    { id: 'playground', name: 'The Playground', icon: '🎯', color: '#6B5B95', nexus: false, internal: true },
  ];

  const solutionsTemplates = [
    { id: 'headline', name: 'Headline', icon: '⚡', color: c.gold, nexus: false },
    { id: 'deskCommentary', name: 'Desk Commentary', icon: '💬', color: c.teal, nexus: false },
    { id: 'tradeIdea', name: 'Trade Idea', icon: '📍', color: c.neg, nexus: false },
    { id: 'companyFundIndex', name: 'Company/Fund Update', icon: '🏢', color: c.navy, nexus: true },
    { id: 'productUpdate', name: 'Product Update', icon: '📋', color: c.slate, nexus: false },
    { id: 'tradePricing', name: 'Pricing Run', icon: '💱', color: c.neu, nexus: false },
    { id: 'campaign', name: 'Campaign', icon: '📣', color: c.pos, nexus: true },
    { id: 'eventResponse', name: 'Event Response', icon: '⚡', color: '#B84242', nexus: true },
    { id: 'videoPublish', name: 'Video Publish', icon: '🎬', color: c.neg, nexus: true },
  ];

  const bankingTemplates = [
    { id: 'headline', name: 'Headline', icon: '⚡', color: c.gold, nexus: false },
    { id: 'deskCommentary', name: 'Desk Commentary', icon: '💬', color: c.teal, nexus: false },
    { id: 'productUpdate', name: 'Product Update', icon: '📋', color: c.slate, nexus: false },
    { id: 'campaign', name: 'Campaign', icon: '📣', color: c.pos, nexus: true },
    { id: 'eventResponse', name: 'Event Response', icon: '⚡', color: '#B84242', nexus: true },
    { id: 'videoPublish', name: 'Video Publish', icon: '🎬', color: c.neg, nexus: true },
  ];

  const planningTemplates = [
    { id: 'headline', name: 'Headline', icon: '⚡', color: c.gold, nexus: false },
    { id: 'deskCommentary', name: 'Desk Commentary', icon: '💬', color: c.teal, nexus: false },
    { id: 'ideasInsights', name: 'Ideas & Insights', icon: '💡', color: c.navy, nexus: true },
    { id: 'productUpdate', name: 'Product Update', icon: '📋', color: c.slate, nexus: false },
    { id: 'campaign', name: 'Campaign', icon: '📣', color: c.pos, nexus: true },
    { id: 'videoPublish', name: 'Video Publish', icon: '🎬', color: c.neg, nexus: true },
  ];

  const currentTemplates = activeTeam === 'gis' ? gisTemplates : solutionsTemplates;

  // Open item from library - with lock handling
  const openFromLibrary = (item) => {
    // Check if locked by someone else
    if (isLockedByOther(item)) {
      // Show locked modal or alert
      const shouldTakeOver = isAdmin && window.confirm(
        `This document is locked by ${item.lockedBy} (${formatLockTime(item.lockedAt)}).\n\nAs an admin, would you like to take over the lock?`
      );
      
      if (!shouldTakeOver) {
        // Open in read-only mode
        setActiveTemplate(item.type);
        setEditingItemId(item.id);
        setEditingFromLibrary(true);
        setActiveTab('editor');
        return;
      }
      // Admin takes over - unlock and relock for current user
      forceUnlock(item.id);
    }
    
    // Lock the document for editing
    lockDocument(item.id);
    
    setActiveTemplate(item.type);
    setEditingItemId(item.id);
    setEditingFromLibrary(true);
    setActiveTab('editor');
  };

  // Back to library - release lock
  const backToLibrary = () => {
    // Release lock when leaving editor
    if (editingItemId) {
      const item = libraryItems.find(i => i.id === editingItemId);
      if (item && item.lockedBy === currentUser) {
        unlockDocument(editingItemId);
      }
    }
    setEditingFromLibrary(false);
    setEditingItemId(null);
    setActiveTab('content');
  };

  // Get current editing item's lock status
  const getCurrentItemLock = () => {
    if (!editingItemId) return null;
    return libraryItems.find(i => i.id === editingItemId);
  };

  // Create new content
  const createNewContent = (templateId) => {
    // Reset the template content to blank
    const blankTemplates = {
      deskCommentary: { title: '', trigger: 'Other', assetClass: 'Multi-Asset', isExternal: false, sections: null },
      topMarketTakeaways: { title: '', isExternal: true, sections: null },
      ideasInsights: { title: '', category: 'Investment Trends', assetClass: 'Multi-Asset', sections: null, charts: [] },
      morningMeeting: { title: '', meetingDate: '', marketUpdate: '', focusSections: [{id:'f1',title:'Focus Area 1',content:''},{id:'f2',title:'Focus Area 2',content:''},{id:'f3',title:'Focus Area 3',content:''}] },
      specialistSpotlight: { title: '', specialistName: '', specialistRole: '', focusArea: '', spotlightType: 'Portfolio Manager', sections: null },
      chartOfTheWeek: { title: '', keyTakeaway: '', analysis: '', implications: '' },
      gisView: { title: '', summary: '', rationale: '', risks: '' },
      macroMarkets: { title: '', tagline: '', coverThemeOverride: null, stats: [], sections: null, charts: [] },
      headline: { title: '', category: '' },
      tradeIdea: { title: '', thesis: '', entry: '', target: '', stopLoss: '', rationale: '' },
      companyFundIndex: { title: '', overview: '', keyMetrics: '', ourView: '' },
      productUpdate: { title: '', summary: '', changes: '', impact: '' },
      tradePricing: { title: '', instrument: '', pricing: '', notes: '' },
      campaign: { title: '', objective: '', audience: '', messaging: '', cta: '' },
      managerVideoBrief: { title: '', keyMessages: '', talkingPoints: '', visualSuggestions: '' },
      eventResponse: { title: '', isExternal: true, eventType: 'Macro', impact: 'Moderate', eventDate: '', sections: null, updates: [{ id: 'u1', timestamp: '', title: 'Initial Response', content: '', placeholder: 'First take — what just happened and what it means...' }] },
      videoPublish: { title: '', videoUrl: null, videoFileName: null, presenter: '', presenterTitle: '', category: 'Investment Strategy', series: '', overlays: [], sections: null }
    };
    
    // FULL replacement — never merge with previous content
    const freshContent = blankTemplates[templateId] || { title: '' };
    setTemplateContents(prev => ({
      ...prev,
      [templateId]: { ...freshContent } // spread to ensure new object reference
    }));
    
    setActiveTemplate(templateId);
    setEditingItemId(null);
    setEditingFromLibrary(true);
    setShowTemplateModal(false);
    setActiveTab('editor');
    setSaveStatus('unsaved');
  };

  // What's Moving - auto-generate timely content
  const [isGeneratingWhatsMoving, setIsGeneratingWhatsMoving] = useState(false);
  const [generateError, setGenerateError] = useState('');
  
  // Forward Look → Create content
  const handleCreateFromPlayground = (templateId, freeformText) => {
    // Pre-populate the target template with the playground freeform text as a starting draft
    const briefContent = freeformText ? freeformText.slice(0, 800) : '';
    setTemplateContents(prev => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        title: '',
        sections: templateId === 'deskCommentary'
          ? [{ id: 'headline', title: 'Headline View', content: briefContent }]
          : templateId === 'macroMarkets'
          ? [{ id: 'opening', title: 'Opening Context', content: briefContent }]
          : [{ id: 'hook', title: 'Opening Paragraph', content: briefContent }],
      }
    }));
    setActiveTemplate(templateId);
    setActiveTeam('gis');
    setEditingFromLibrary(true);
    setEditingItemId(null);
    setActiveTab('editor');
    setSaveStatus('unsaved');
  };

  const handleForwardLookCreate = async (event, autoGenerate = false) => {
    const ticker = event.ticker || '';
    const date = new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const preTitle = ticker
      ? `${ticker}: ${event.title.replace(ticker, '').trim()} — ${date}`
      : `${event.title} — ${date}`;

    // REPLACE (not merge) the deskCommentary template content
    const freshContent = {
      title: preTitle,
      productTags: ticker ? [ticker] : [],
      isExternal: false,
      _source: 'forwardlook',
      _eventRef: event.title,
      sections: [{
        id: 'headline',
        title: 'Headline View',
        content: [
          event.consensus ? `Consensus: ${event.consensus}.` : '',
          event.lastResult ? `Last result: ${event.lastResult}.` : '',
          event.jpmView ? `JPM View: ${event.jpmView}` : '',
        ].filter(Boolean).join(' ')
      }]
    };

    // Direct state replacement — not merge
    setTemplateContents(prev => ({ ...prev, deskCommentary: freshContent }));
    setActiveTeam('gis');
    setActiveTemplate('deskCommentary');
    setEditingFromLibrary(true);
    setEditingItemId(null);
    setActiveTab('editor');
    setSaveStatus('unsaved');

    if (autoGenerate) {
      setTimeout(() => { generateWhatsMoving(); }, 700);
    }
  };

  // Forward Look → Create content

  const fetchMarketData = async (region, indices, onContentChange, currentContent) => {
    const apiKey = localStorage.getItem('_ak');
    if (!apiKey) { alert('Set your API key first (⚠ button in header)'); return; }
    try {
      const yesterday = new Date();
      // Skip to Friday if weekend
      const day = yesterday.getDay();
      if (day === 0) yesterday.setDate(yesterday.getDate() - 2);
      else if (day === 1) yesterday.setDate(yesterday.getDate() - 3);
      else yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1200,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system: 'You are a financial data assistant. Search for market closing data and return ONLY a valid JSON array. No markdown. No explanation. No code fences.',
          messages: [{ role: 'user', content: `Search for closing prices on ${dateStr} for: ${indices.slice(0, 6).join(', ')}. Return ONLY this JSON array format with no other text:\n[{"name":"S&P 500","value":"5,123","change":"+12","pct":"0.24","direction":"up"},{"name":"Nasdaq","value":"16,200","change":"-45","pct":"0.28","direction":"down"}]\ndirection must be exactly "up", "down", or "flat". Include all ${indices.slice(0, 6).length} indices.` }]
        })
      });
      const data = await resp.json();
      if (data.error) { console.log('API error:', data.error.message); return; }

      // Extract JSON array from any position in the response
      const fullText = (data.content || []).map(b => b.type === 'text' ? b.text : '').join('');
      const match = fullText.match(/\[[\s\S]*?\]/);
      if (!match) { console.log('No JSON array found in response'); return; }

      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return;

      const newMetrics = indices.map(name => {
        const found = parsed.find(p =>
          p.name === name ||
          name.toLowerCase().includes((p.name || '').toLowerCase()) ||
          (p.name || '').toLowerCase().includes(name.toLowerCase().split(' ')[0])
        );
        return found ? { ...found, name } : (currentContent.metrics || []).find(m => m.name === name) || { name, value: '', change: '', pct: '', direction: 'flat' };
      });
      onContentChange && onContentChange({ ...currentContent, metrics: newMetrics });
    } catch(e) {
      console.log('Market data fetch failed:', e.message);
    }
  };

  const generateWhatsMoving = async () => {
    setIsGeneratingWhatsMoving(true);
    setGenerateError('');
    const templateName = currentTemplates.find(t => t.id === activeTemplate)?.name || 'content';
    const currentContent = templateContents[activeTemplate] || {};
    const assetClass = currentContent.assetClass || 'Multi-Asset';

    const structures = {
      dailyMarketUpdate: '<TITLE>Daily Market Update — [Region] — [Date]</TITLE><SECTION id="commentary" title="">2-3 sentences summarising what the key market moves showed — what drove them, key themes, what to watch today.</SECTION><SECTION id="interesting1" title="[Write a short punchy headline for story 1]">What happened — the facts, specific numbers, the event. Then our view on it. Then why it matters for UHNW clients. Keep it tight.</SECTION><SECTION id="view1" title="Our View">JPM Private Bank position on story 1 — one clear paragraph.</SECTION><SECTION id="interesting2" title="[Write a short punchy headline for story 2]">Same format — what happened, our view, why it matters.</SECTION><SECTION id="view2" title="Our View">JPM Private Bank position on story 2.</SECTION><SECTION id="interesting3" title="[Write a short punchy headline for story 3]">Same format.</SECTION><SECTION id="view3" title="Our View">JPM Private Bank position on story 3.</SECTION><SECTION id="oped" title="Op-Ed">500 words max. One big idea — a conversation starter for a dinner table or client meeting. Punchy, opinionated, engaging. Give it a proper title within the content.</SECTION><SECTION id="psa" title="PSAs">Leave blank.</SECTION>',
      deskCommentary: '<TITLE>title — declarative, states the view</TITLE><SECTION id="headline" title="Headline View">Write one tight paragraph, 100-150 words maximum. Lead with the conclusion. JPM/Bridgewater voice. Cover what happened, why it matters, and what JPM thinks. No throat-clearing. No separate sections.</SECTION>',
      topMarketTakeaways: '<TITLE>title</TITLE><SECTION id="hook" title="The Opening">content</SECTION><SECTION id="take1" title="Takeaway 1">content</SECTION><SECTION id="take2" title="Takeaway 2">content</SECTION><SECTION id="take3" title="Takeaway 3">content</SECTION><SECTION id="close" title="The Bottom Line">content</SECTION>',
      ideasInsights: '<TITLE>title</TITLE><SECTION id="exec" title="The Big Idea">content</SECTION><SECTION id="setup" title="The Setup">content</SECTION><SECTION id="deep" title="Deep Dive">content</SECTION><SECTION id="impl" title="Client Implications">content</SECTION><SECTION id="view" title="Our View">content</SECTION>',
      specialistSpotlight: '<TITLE>title</TITLE><SECTION id="lead" title="The Lead">content</SECTION><SECTION id="view" title="The View">content</SECTION><SECTION id="why_now" title="Why Now">content</SECTION><SECTION id="takeaway" title="Advisor Takeaway">content</SECTION>',
      chartOfTheWeek: '<TITLE>title</TITLE><SECTION id="meaning" title="What It Means">content</SECTION><SECTION id="takeaway" title="Key Takeaway">content</SECTION>',
      gisView: '<TITLE>title</TITLE><SECTION id="key" title="Key Message">content</SECTION><SECTION id="analysis" title="Supporting Analysis">content</SECTION><SECTION id="positioning" title="Positioning">content</SECTION>',
      tradeIdea: '<TITLE>title</TITLE><ENTRY>price</ENTRY><TARGET>price</TARGET><STOPLOSS>price</STOPLOSS><SECTION id="thesis" title="Thesis">content</SECTION><SECTION id="rationale" title="Rationale">content</SECTION>',
      companyFundIndex: '<TITLE>title</TITLE><SECTION id="overview" title="Overview">content</SECTION><SECTION id="metrics" title="Key Metrics">content</SECTION><SECTION id="view" title="Our View">content</SECTION>',
      productUpdate: '<TITLE>title</TITLE><SECTION id="summary" title="Summary">content</SECTION><SECTION id="changes" title="Changes">content</SECTION><SECTION id="impact" title="Impact">content</SECTION>',
      campaign: '<TITLE>title</TITLE><SECTION id="objective" title="Objective">content</SECTION><SECTION id="audience" title="Target Audience">content</SECTION><SECTION id="messaging" title="Key Messaging">content</SECTION><SECTION id="cta" title="Call to Action">content</SECTION>',
    };
    const structure = structures[activeTemplate] || '<TITLE>title</TITLE><SECTION id="key" title="Key Message">content</SECTION><SECTION id="context" title="Context">content</SECTION><SECTION id="view" title="Our View">content</SECTION>';
    const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const useSearch = ['topMarketTakeaways','ideasInsights','gisView'].includes(activeTemplate);
    const ctx = activeTemplate === 'deskCommentary' ? ' Focus on ' + assetClass + ' markets.' : '';
    const existingTitle = currentContent.title || '';
    const existingContext = (currentContent.sections || []).map(s => s.content).filter(Boolean).join(' ').slice(0, 300);
    const iiTopicHint = existingTitle ? ' Topic: ' + existingTitle + '.' : '';
    const iiContextHint = existingContext ? ' Context from editor: ' + existingContext : '';
    const msg = activeTemplate === 'ideasInsights'
      ? 'Search for the latest data on this investment topic.' + iiTopicHint + iiContextHint + ' Then write a full Ideas & Insights piece. XML structure to follow: ' + structure
      : useSearch
      ? 'Search today\'s top story.' + ctx + ' Write a concise JPM ' + templateName + '. XML tags only: ' + structure
      : 'JPM Private Bank. Today is ' + today + '.' + ctx + ' Write a realistic, specific ' + templateName + '. Return content using ONLY these XML tags, no JSON, no markdown: ' + structure;

    try {
      let raw = '';
      const isII = activeTemplate === 'ideasInsights';
      const apiKey = window.__ANTHROPIC_KEY || localStorage.getItem('_ak') || '';

      if (isII) {
        // I&I: two-turn approach
        // Turn 1: search and gather data (allow conversational response)
        // Turn 2: force XML output from the gathered data
        const iiResp1 = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            system: 'You are a senior J.P. Morgan Private Bank GIS strategist and researcher. Search for current market data, prices, and analysis relevant to the topic. Summarise what you find — key data points, current prices, recent trends, analyst views. Be thorough.',
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{ role: 'user', content: 'Research this investment topic thoroughly.' + iiTopicHint + ' Find current data, prices, trends and analyst views. Summarise your findings.' }]
          })
        });
        const iiData1 = await iiResp1.json();
        if (iiData1.error) { setGenerateError('API error: ' + iiData1.error.message); return; }
        const researchSummary = (iiData1.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

        // Turn 2: write the full I&I piece as XML — use assistant prefill to guarantee XML
        const iiResp2 = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            system: 'You are a senior J.P. Morgan Private Bank GIS strategist. Write a full Ideas & Insights piece using the research provided. Output ONLY XML — no preamble, no explanation. Rules: (1) Section headings must be specific to this topic — never generic. (2) BOTH CHART tags required with real data. (3) Consistent units within each chart. (4) 1,200-2,000 words.',
            messages: [
              { role: 'user', content: 'Research findings:\n\n' + researchSummary + '\n\nWrite the full I&I piece as XML only.' },
              { role: 'assistant', content: '<TITLE>' }
            ]
          })
        });
        const iiData2 = await iiResp2.json();
        if (iiData2.error) { setGenerateError('API error: ' + iiData2.error.message); return; }
        raw = '<TITLE>' + (iiData2.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      } else if (useSearch) {
        const chunk = await callClaude({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          system: 'You are a JPMorgan Private Bank content strategist. Return only XML using the exact tags provided.',
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: msg }]
        });
        raw += chunk;
      } else {
        const raw0 = await callClaude({
          model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
          system: 'You are a JPMorgan Private Bank content strategist. Return only XML using the exact tags provided. No JSON, no markdown, no explanation.',
          messages: [{ role: 'user', content: msg }]
        });
        raw += raw0;
      }

      if (!raw) { setGenerateError('No response from API. Please try again.'); return; }

      const parsed = parseTagged(raw);
      if (!parsed.title && (!parsed.sections || !parsed.sections.length)) {
        setGenerateError('Could not parse response. Got: ' + raw.slice(0, 80));
        return;
      }
      // For DMU: preserve title, metrics, clientFlow — only update sections/content
      const isDMU = activeTemplate === 'dailyMarketUpdate';
      // For deskCommentary: merge all sections into a single paragraph
      const isDeskComm = activeTemplate === 'deskCommentary';
      const keep = {
        assetClass: currentContent.assetClass,
        isExternal: currentContent.isExternal,
        eventTrigger: currentContent.eventTrigger,
        ...(isDMU ? { title: currentContent.title, metrics: currentContent.metrics, clientFlow: currentContent.clientFlow, region: currentContent.region } : {})
      };
      let finalParsed = { ...keep, ...parsed, ...(isDMU ? { title: currentContent.title } : {}), ...(parsed.charts ? { charts: parsed.charts } : {}) };
      if (isDeskComm && parsed.sections?.length) {
        // Merge all section content into one paragraph for the single textarea
        const merged = parsed.sections.map(s => s.content).filter(Boolean).join(' ');
        finalParsed = { ...finalParsed, sections: [{ id: 'headline', title: 'Headline View', content: merged }] };
      }
      // For I&I: force full replacement so new sections/charts fully replace old content
      if (activeTemplate === 'ideasInsights') {
        setTemplateContents(prev => ({ ...prev, [activeTemplate]: { ...finalParsed } }));
      } else {
        updateTemplateContent(activeTemplate, finalParsed);
      }
      setSaveStatus('unsaved');

    } catch (err) {
      setGenerateError('Error: ' + err.message);
    } finally {
      setIsGeneratingWhatsMoving(false);
    }
  };

  // Get status badge style
  const getStatusStyle = (status) => {
    const styles = {
      draft: { bg: '#F3F4F6', color: '#6B7280' },
      in_review: { bg: '#FEF3C7', color: '#D97706' },
      approved: { bg: '#D1FAE5', color: '#059669' },
      published: { bg: '#DBEAFE', color: '#2563EB' }
    };
    return styles[status] || styles.draft;
  };

  const renderTemplate = () => {
    const content = templateContents[activeTemplate] || {};
    const onChange = (updates) => updateTemplateContent(activeTemplate, updates);
    
    switch (activeTemplate) {
      case 'dailyMarketUpdate': return <DailyMarketUpdateTemplate content={content} onContentChange={onChange} onFetchMarketData={fetchMarketData} />;
      case 'playground': return <PlaygroundTemplate content={content} onContentChange={onChange} onCreateFromPlayground={handleCreateFromPlayground} />;
      case 'deskCommentary': return <DeskCommentaryTemplate content={content} onContentChange={onChange} onShowExposure={setClientExposureTicker} />;
      case 'morningMeeting': return <MorningMeetingTemplate content={content} onContentChange={onChange} />;
      case 'topMarketTakeaways': return <TopMarketTakeawaysTemplate content={content} onContentChange={onChange} />;
      case 'specialistSpotlight': return <SpecialistSpotlightTemplate content={content} onContentChange={onChange} />;
      case 'chartOfTheWeek': return <ChartOfTheWeekTemplate content={content} onContentChange={onChange} />;
      case 'ideasInsights': return <IdeasInsightsTemplate content={content} onContentChange={onChange} />;
      case 'gisView': return <GISViewTemplate content={content} onContentChange={onChange} />;
      case 'macroMarkets': return <MacroMarketsTemplate content={content} onContentChange={onChange} />;
      case 'headline': return <HeadlineTemplate content={content} onContentChange={onChange} />;
      case 'tradeIdea': return <TradeIdeaTemplate content={content} onContentChange={onChange} />;
      case 'companyFundIndex': return <CompanyFundIndexTemplate content={content} onContentChange={onChange} />;
      case 'productUpdate': return <ProductUpdateTemplate content={content} onContentChange={onChange} />;
      case 'tradePricing': return <TradePricingTemplate content={content} onContentChange={onChange} />;
      case 'campaign': return <CampaignTemplate content={content} onContentChange={onChange} />;
      case 'eventResponse': return <EventResponseTemplate content={content} onContentChange={onChange} />;
      case 'managerVideoBrief': return <ManagerVideoBriefTemplate content={content} onContentChange={onChange} />;
      case 'videoPublish': return <VideoPublishTemplate content={content} onContentChange={onChange} />;
      default: return <DeskCommentaryTemplate content={content} onContentChange={onChange} />;
    }
  };

  const [authed, setAuthed] = React.useState(() => sessionStorage.getItem('ls_auth') === 'GIS');
  const [pwInput, setPwInput] = React.useState('');
  const [pwError, setPwError] = React.useState(false);

  if (!authed) {
    return (
      <div style={{ minHeight:'100vh', background:'#0A1A2F', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'#fff', borderRadius:12, padding:40, width:360, boxShadow:'0 20px 60px rgba(0,0,0,0.4)', textAlign:'center' }}>
          <div style={{ fontFamily:'Georgia, serif', fontSize:26, color:'#0A1A2F', marginBottom:4 }}>Long<span style={{ color:'#C1A364' }}>&</span>Short</div>
          <div style={{ fontSize:11, color:'#C1A364', fontFamily:'Georgia, serif', letterSpacing:'0.1em', marginBottom:28 }}>J.P. Morgan Private Bank</div>
          <input type="password" value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => { if (e.key==='Enter') { if (pwInput==='GIS') { sessionStorage.setItem('ls_auth','GIS'); setAuthed(true); } else setPwError(true); } }}
            placeholder="Enter password" autoFocus
            style={{ width:'100%', padding:'10px 14px', borderRadius:7, border:'2px solid '+(pwError?'#EF4444':'#E5E7EB'), fontSize:14, outline:'none', marginBottom:12, boxSizing:'border-box', textAlign:'center', letterSpacing:'0.2em' }} />
          {pwError && <div style={{ color:'#EF4444', fontSize:12, marginBottom:10 }}>Incorrect password</div>}
          <button onClick={() => { if (pwInput==='GIS') { sessionStorage.setItem('ls_auth','GIS'); setAuthed(true); } else setPwError(true); }}
            style={{ width:'100%', padding:11, borderRadius:7, border:'none', background:'#0A1A2F', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: c.ivory, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', background: c.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: c.ivory }}>
          Long<span style={{ color: c.gold }}>&</span>Short
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize: 10, color: c.gold, fontFamily: 'Georgia, serif' }}>Delivering Insights</span>
            {libSyncStatus === 'saving' && <span style={{ fontSize:9, color:'#94A3B8' }}>☁ Syncing...</span>}
            {libSyncStatus === 'saved' && <span style={{ fontSize:9, color:'#48E3A8' }}>☁ Synced</span>}
            {libSyncStatus === 'error' && <span style={{ fontSize:9, color:'#F87171' }}>☁ Sync failed</span>}
          </div>
          <button onClick={() => _setShowKey(true)} style={{ padding:'3px 10px', borderRadius:4, border:'1px solid', borderColor: _apiKey ? c.gold : '#E08A00', background:'transparent', color: _apiKey ? c.gold : '#E08A00', fontSize:10, cursor:'pointer', fontWeight:600 }}>
            {_apiKey ? '🔑' : '⚠ API Key'}
          </button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '8px 20px', background: '#fff', borderBottom: `1px solid ${c.pearl}`, display: 'flex', gap: 24 }}>
        {['Content Library', 'Editor', 'Workflow', 'Translations', 'Taxonomy', 'Data', 'Excel', 'Codebase', 'Forward Look', 'About', 'Views'].map((tab, i) => {
          const id = ['content', 'editor', 'workflow', 'translations', 'taxonomy', 'data', 'excel', 'codebase', 'forwardlook', 'about', 'views'][i];
          return (
            <button 
              key={id} 
              onClick={() => setActiveTab(id)} 
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '6px 0', 
                fontSize: 11, 
                textTransform: 'uppercase', 
                letterSpacing: 0.8, 
                cursor: 'pointer',
                color: activeTab === id ? c.navy : c.slate, 
                borderBottom: activeTab === id ? `2px solid ${c.gold}` : '2px solid transparent', 
                fontWeight: activeTab === id ? 600 : 400 
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {/* CONTENT LIBRARY TAB */}
        {activeTab === 'content' && (
          <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + c.pearl, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.navy, margin: 0 }}>Content Library</h2>
                <p style={{ fontSize: 12, color: c.slate, margin: '4px 0 0' }}>
                  {filteredItems.length} items
                </p>
              </div>
              <button 
                onClick={() => setShowTemplateModal(true)}
                style={{ padding: '10px 16px', borderRadius: 6, border: 'none', background: c.gold, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                + New Content
              </button>
            </div>
            
            {/* Filters - Multi-select with pills */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + c.pearl, background: c.ivory }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, width: 200, outline: 'none', background: '#fff' }}
                />
                {hasActiveFilters && (
                  <button
                    onClick={() => { setFilterStatuses([]); setFilterTypes([]); setFilterAuthors([]); setFilterTeams([]); setSearchQuery(''); }}
                    style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: c.slate, color: '#fff', fontSize: 10, cursor: 'pointer' }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
              
              {/* Status Pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: c.slate, width: 50 }}>Status:</span>
                {uniqueStatuses.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleFilter(filterStatuses, setFilterStatuses, status)}
                    style={{ 
                      padding: '4px 10px', 
                      borderRadius: 12, 
                      border: filterStatuses.includes(status) ? 'none' : '1px solid ' + c.pearl, 
                      background: filterStatuses.includes(status) ? c.teal : '#fff', 
                      color: filterStatuses.includes(status) ? '#fff' : c.slate, 
                      fontSize: 10, 
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
              
              {/* Type Pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: c.slate, width: 50 }}>Type:</span>
                {[
                  { id: 'deskCommentary', label: 'Desk Commentary' },
                  { id: 'topMarketTakeaways', label: 'Top Market Takeaways' },
                  { id: 'ideasInsights', label: 'Ideas & Insights' },
                  { id: 'tradeIdea', label: 'Trade Idea' },
                  { id: 'companyFundIndex', label: 'Company/Fund' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleFilter(filterTypes, setFilterTypes, type.id)}
                    style={{ 
                      padding: '4px 10px', 
                      borderRadius: 12, 
                      border: filterTypes.includes(type.id) ? 'none' : '1px solid ' + c.pearl, 
                      background: filterTypes.includes(type.id) ? c.gold : '#fff', 
                      color: filterTypes.includes(type.id) ? '#fff' : c.slate, 
                      fontSize: 10, 
                      cursor: 'pointer'
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              
              {/* Author Pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: c.slate, width: 50 }}>Author:</span>
                {uniqueAuthors.map(author => (
                  <button
                    key={author}
                    onClick={() => toggleFilter(filterAuthors, setFilterAuthors, author)}
                    style={{ 
                      padding: '4px 10px', 
                      borderRadius: 12, 
                      border: filterAuthors.includes(author) ? 'none' : '1px solid ' + c.pearl, 
                      background: filterAuthors.includes(author) ? c.navy : '#fff', 
                      color: filterAuthors.includes(author) ? '#fff' : c.slate, 
                      fontSize: 10, 
                      cursor: 'pointer'
                    }}
                  >
                    {author}
                  </button>
                ))}
              </div>
              
              {/* Asset Class Pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap:'wrap', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: c.slate, width: 50 }}>Class:</span>
                {['Alternatives', 'Equities', 'Fixed Income', 'FX & Commodities', 'Multi-Asset'].map(ac => (
                  <button
                    key={ac}
                    onClick={() => toggleFilter(filterAssetClasses, setFilterAssetClasses, ac)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      border: filterAssetClasses.includes(ac) ? 'none' : '1px solid ' + c.pearl,
                      background: filterAssetClasses.includes(ac) ? c.navy : '#fff',
                      color: filterAssetClasses.includes(ac) ? '#fff' : c.slate,
                      fontSize: 10,
                      cursor: 'pointer'
                    }}
                  >
                    {ac}
                  </button>
                ))}
              </div>

              {/* Function Pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap:'wrap', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: c.slate, width: 50 }}>Function:</span>
                {['Strategy', 'Trading', 'Derivatives', 'Product Solutions', 'Funds'].map(fn => (
                  <button key={fn} onClick={() => toggleFilter(filterFunctions, setFilterFunctions, fn)}
                    style={{ padding: '4px 10px', borderRadius: 12, border: filterFunctions.includes(fn) ? 'none' : '1px solid ' + c.pearl, background: filterFunctions.includes(fn) ? '#6B5B95' : '#fff', color: filterFunctions.includes(fn) ? '#fff' : c.slate, fontSize: 10, cursor: 'pointer' }}>
                    {fn}
                  </button>
                ))}
              </div>

              {/* Team Pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: c.slate, width: 50 }}>Team:</span>
                {['GIS', 'Investment Solutions', 'Banking', 'Planning'].map(team => (
                  <button
                    key={team}
                    onClick={() => toggleFilter(filterTeams, setFilterTeams, team)}
                    style={{ 
                      padding: '4px 10px', 
                      borderRadius: 12, 
                      border: filterTeams.includes(team) ? 'none' : '1px solid ' + c.pearl, 
                      background: filterTeams.includes(team) ? (team === 'GIS' ? c.teal : team === 'Investment Solutions' ? c.gold : team === 'Banking' ? c.navy : '#6B7280') : '#fff', 
                      color: filterTeams.includes(team) ? '#fff' : c.slate, 
                      fontSize: 10, 
                      cursor: 'pointer'
                    }}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Library Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.ivory }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: c.slate }}>Title</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: c.slate }}>Type</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: c.slate }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: c.slate }}>Author</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: c.slate }}>Team</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, color: c.slate, width: 60 }}>🔒</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: c.slate }}>Created</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: c.slate }}>Published</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems
                  .map(item => {
                  const statusStyle = getStatusStyle(item.status);
                  const locked = item.lockedBy;
                  const lockedByOther = isLockedByOther(item);
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => openFromLibrary(item)}
                      style={{ 
                        borderBottom: '1px solid ' + c.pearl, 
                        cursor: lockedByOther ? 'not-allowed' : 'pointer',
                        opacity: lockedByOther ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = c.ivory}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: c.navy }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.title}
                          {lockedByOther && (
                            <span style={{ fontSize: 9, color: c.neg, fontWeight: 400 }}>
                              (Locked)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: c.slate }}>{item.typeLabel}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: 4, 
                          fontSize: 10, 
                          fontWeight: 500,
                          background: statusStyle.bg, 
                          color: statusStyle.color,
                          textTransform: 'capitalize'
                        }}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: c.slate }}>{item.author}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: 4, 
                          fontSize: 10, 
                          fontWeight: 500,
                          background: item.team === 'GIS' ? c.teal : c.gold, 
                          color: '#fff'
                        }}>
                          {item.team}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {locked ? (
                          <div 
                            title={`Locked by ${item.lockedBy} • ${formatLockTime(item.lockedAt)}`}
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: lockedByOther ? c.neg + '20' : c.teal + '20',
                              color: lockedByOther ? c.neg : c.teal,
                              fontSize: 12
                            }}
                          >
                            {lockedByOther ? '🔒' : '✏️'}
                          </div>
                        ) : (
                          <span style={{ color: c.pearl }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: c.slate }}>{formatDate(item.createdDate)}</td>
                      <td style={{ padding: '12px 16px', color: c.slate }}>{formatDate(item.publishedDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* EDITOR TAB */}
        {activeTab === 'editor' && (
          <>
            {editingFromLibrary ? (
              <>
                {/* Lock Status Banner */}
                {(() => {
                  const currentItem = getCurrentItemLock();
                  if (!currentItem || !currentItem.lockedBy) return null;
                  if (currentItem && isLockedByOther(currentItem)) {
                    return (
                      <div style={{
                        marginBottom: 16,
                        padding: '12px 16px',
                        background: `linear-gradient(135deg, ${c.neg}15 0%, ${c.neg}08 100%)`,
                        borderRadius: 8,
                        border: `1px solid ${c.neg}30`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 20 }}>🔒</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: c.neg }}>
                              Read-Only Mode
                            </div>
                            <div style={{ fontSize: 11, color: c.slate }}>
                              This document is locked by <strong>{currentItem.lockedBy}</strong> • {formatLockTime(currentItem.lockedAt)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => {
                              // In real app, this would send a notification
                              alert(`Request sent to ${currentItem.lockedBy}`);
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 6,
                              border: '1px solid ' + c.pearl,
                              background: '#fff',
                              color: c.slate,
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            Request Edit Access
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                forceUnlock(currentItem.id);
                                lockDocument(currentItem.id);
                              }}
                              style={{
                                padding: '8px 14px',
                                borderRadius: 6,
                                border: 'none',
                                background: c.neg,
                                color: '#fff',
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              Take Over Lock
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              
                {/* Editor Header - Back button, template name, and actions */}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button 
                      onClick={backToLibrary}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, border: '1px solid ' + c.pearl, background: '#fff', color: c.slate, fontSize: 11, cursor: 'pointer' }}
                    >
                      ← Back
                    </button>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: c.navy }}>
                        {currentTemplates.find(t => t.id === activeTemplate)?.name || 'Template'}
                      </span>
                    </div>
                    {/* Lock indicator for current user */}
                    {(() => {
                      const currentItem = getCurrentItemLock();
                      if (currentItem && currentItem.lockedBy === currentUser) {
                        return (
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            fontSize: 10, 
                            color: c.teal,
                            background: c.teal + '15',
                            padding: '4px 8px',
                            borderRadius: 4
                          }}>
                            ✏️ Editing
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Save status indicator */}
                    <span style={{ fontSize: 10, color: saveStatus === 'unsaved' ? c.gold : c.slate }}>
                      {saveStatus === 'saving' && '⏳ Saving...'}
                      {saveStatus === 'saved' && lastSaved && '✓ Saved ' + lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {saveStatus === 'unsaved' && '● Unsaved changes'}
                    </span>
                    {/* Metadata toggle */}
                    <button 
                      onClick={() => setShowMetadata(!showMetadata)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid ' + c.pearl, background: showMetadata ? c.ivory : '#fff', color: c.slate, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                    >
                      📋 {showMetadata ? 'Hide' : 'Show'} Metadata
                    </button>
                    <button 
                      onClick={saveToLibrary}
                      disabled={saveStatus === 'saving'}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: c.gold, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer', opacity: saveStatus === 'saving' ? 0.7 : 1 }}
                    >
                      💾 Save
                    </button>
                    <button onClick={() => setShowExcelModal(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:6, border:'1px solid '+c.navy, background:'#fff', color:c.navy, fontSize:11, fontWeight:500, cursor:'pointer' }}>
                      📊 Excel
                    </button>
                    <button onClick={() => setShowOutputPreview(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: c.gold, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                      👁️ Preview
                    </button>
                    {activeTemplate !== 'macroMarkets' && (
                      <button onClick={() => setShowAIDrafting(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: c.teal, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        ✨ AI Assist
                      </button>
                    )}
                    {activeTemplate === 'macroMarkets' ? (
                      <button
                        onClick={() => setShowAIDrafting(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: c.teal, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                      >
                        🔬 Research Idea
                      </button>
                    ) : activeTemplate === 'morningMeeting' ? null : (
                      <>
                        <button
                          onClick={() => { setGenerateError(''); generateWhatsMoving(); }}
                          disabled={isGeneratingWhatsMoving}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: c.teal, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer', opacity: isGeneratingWhatsMoving ? 0.7 : 1 }}
                        >
                          {isGeneratingWhatsMoving ? '⏳ Generating...' : '💡 Generate Idea'}
                        </button>
                        {generateError && (
                          <div style={{ fontSize: 10, color: '#92400E', background: '#FEF3C7', padding: '8px 10px', borderRadius: 6, maxWidth: 360, lineHeight: 1.6 }}>
                            {generateError.includes('Bridge') || generateError.includes('bridge') || generateError.includes('responding') ? (
                              <div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Bridge not active</div>
                                <div style={{ marginBottom: 6, fontSize: 10 }}>Open console (Cmd+Option+J on Mac / F12 Windows), paste this and press Enter:</div>
                                <div style={{ background: '#fff', padding: '6px 8px', borderRadius: 4, fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid #D97706', lineHeight: 1.5, cursor: 'pointer', userSelect: 'all' }}>
                                  {"window.__lsBridge||(window.__lsBridge=1,window.addEventListener('message',async(e)=>{if(!e.data||e.data.type!=='claude_request')return;const{id,body}=e.data;try{const o=await fetch('https://claude.ai/api/organizations').then(r=>r.json());const r=await fetch('https://claude.ai/api/organizations/'+o[0].uuid+'/proxy/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();const t=(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');e.source.postMessage({type:'claude_response',id,text:t},'*')}catch(err){e.source.postMessage({type:'claude_response',id,error:err.message},'*')}}));console.log('bridge ready');"}
                                </div>
                                <div style={{ marginTop: 6, fontSize: 9 }}>Then click Generate Idea again. Only needed once per session.</div>
                              </div>
                            ) : generateError}
                          </div>
                        )}
                      </>
                    )}
                    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                      📤 {(templateContents[activeTemplate]?.isExternal === true || (activeTemplate === 'topMarketTakeaways' && templateContents[activeTemplate]?.isExternal !== false)) ? 'Submit for Review' : 'Submit'}
                    </button>
                  </div>
                </div>
                
                {/* Editor + Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: showMetadata ? '1fr 280px' : '1fr', gap: 16 }}>
                  {/* Template Editor */}
                  <div>
                    {/* Global Formatting Toolbar - WYSIWYG */}
                    <EditorToolbar />
                    {renderTemplate()}

                    {/* Attachments */}
                    <AttachmentsPanel
                      attachments={templateContents[activeTemplate]?.attachments || []}
                      onChange={(atts) => updateTemplateContent(activeTemplate, { attachments: atts })}
                    />

                  </div>
                  
                  {/* Metadata Panel */}
                  {showMetadata && (
                    <div style={{ background: '#fff', borderRadius: 10, padding: 16, height: 'fit-content', position: 'sticky', top: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: c.navy, textTransform: 'uppercase', letterSpacing: 0.5 }}>Metadata</h4>
                        <button onClick={() => setShowMetadata(false)} style={{ background: 'none', border: 'none', color: c.slate, cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </div>
                      
                      {/* Author + Role + Read Time */}
                      
                      
                      {/* Distribution */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Distribution</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            onClick={() => updateTemplateContent(activeTemplate, { isExternal: false })}
                            style={{ flex: 1, padding: 8, borderRadius: 6, border: templateContents[activeTemplate]?.isExternal ? '1px solid ' + c.pearl : 'none', background: !templateContents[activeTemplate]?.isExternal ? c.teal : '#fff', color: !templateContents[activeTemplate]?.isExternal ? '#fff' : c.slate, fontSize: 11, cursor: 'pointer' }}
                          >🔒 Internal</button>
                          <button 
                            onClick={() => updateTemplateContent(activeTemplate, { isExternal: true })}
                            style={{ flex: 1, padding: 8, borderRadius: 6, border: !templateContents[activeTemplate]?.isExternal ? '1px solid ' + c.pearl : 'none', background: templateContents[activeTemplate]?.isExternal ? c.gold : '#fff', color: templateContents[activeTemplate]?.isExternal ? '#fff' : c.slate, fontSize: 11, cursor: 'pointer' }}
                          >🌐 External</button>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Tags</label>
                        <input 
                          value={templateContents[activeTemplate]?.tags || ''}
                          onChange={(e) => updateTemplateContent(activeTemplate, { tags: e.target.value })}
                          placeholder="macro, rates, fed..."
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none' }}
                        />
                      </div>
                      
                      {/* Asset Class */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Asset Class</label>
                        <select 
                          value={templateContents[activeTemplate]?.assetClass || 'Multi-Asset'}
                          onChange={(e) => updateTemplateContent(activeTemplate, { assetClass: e.target.value })}
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, background: '#fff' }}
                        >
                          <option>Multi-Asset</option>
                          <option>Fixed Income</option>
                          <option>Equities</option>
                          <option>FX</option>
                          <option>Commodities</option>
                          <option>Alternatives</option>
                        </select>
                      </div>
                      
                      {/* Function Type */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Function</label>
                        <select 
                          value={templateContents[activeTemplate]?.functionType || ''}
                          onChange={(e) => updateTemplateContent(activeTemplate, { functionType: e.target.value })}
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, background: '#fff' }}
                        >
                          <option value="">Select function...</option>
                          <option>Strategy</option>
                          <option>Trading</option>
                          <option>Derivatives</option>
                          <option>Product Solutions</option>
                          <option>Funds</option>
                        </select>
                      </div>
                      
                      {/* External Link */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>External Link (Nexus URL)</label>
                        <input
                          value={templateContents[activeTemplate]?.externalLink || ''}
                          onChange={(e) => updateTemplateContent(activeTemplate, { externalLink: e.target.value })}
                          placeholder="https://privatebank.jpmorgan.com/..."
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, background: '#fff', fontFamily: 'monospace' }}
                        />
                        {templateContents[activeTemplate]?.externalLink && (
                          <a href={templateContents[activeTemplate].externalLink} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, color: c.teal, display: 'block', marginTop: 4 }}>
                            ↗ Open link
                          </a>
                        )}
                      </div>

                      {/* External Link */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>External Link (Nexus URL)</label>
                        <input
                          value={templateContents[activeTemplate]?.externalLink || ''}
                          onChange={(e) => updateTemplateContent(activeTemplate, { externalLink: e.target.value })}
                          placeholder="https://privatebank.jpmorgan.com/..."
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 11, background: '#fff', fontFamily: 'monospace' }}
                        />
                        {templateContents[activeTemplate]?.externalLink && (
                          <a href={templateContents[activeTemplate].externalLink} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, color: c.teal, display: 'block', marginTop: 4 }}>↗ Open link</a>
                        )}
                      </div>

                      {/* Region */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Region</label>
                        <select 
                          value={templateContents[activeTemplate]?.region || 'Global'}
                          onChange={(e) => updateTemplateContent(activeTemplate, { region: e.target.value })}
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, background: '#fff' }}
                        >
                          <option>Global</option>
                          <option>APAC</option>
                          <option>EMEA</option>
                          <option>LATAM</option>
                          <option>US</option>
                        </select>
                      </div>
                      
                      {/* Expiry */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Content Expiry</label>
                        <input 
                          type="date"
                          value={templateContents[activeTemplate]?.expiryDate || ''}
                          onChange={(e) => updateTemplateContent(activeTemplate, { expiryDate: e.target.value })}
                          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + c.pearl, fontSize: 12, outline: 'none' }}
                        />
                      </div>
                      
                      {/* Related Content */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Related Content</label>
                        <button style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px dashed ' + c.pearl, background: 'transparent', color: c.slate, fontSize: 11, cursor: 'pointer' }}>
                          + Link Related
                        </button>
                      </div>

                      {/* Translation Languages */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 10, color: c.gold, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Translate To</label>
                          <button onClick={() => setActiveTab('translations')}
                            style={{ fontSize: 9, color: c.teal, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                            Open Translations →
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {ALL_LANGUAGES.map(lang => {
                            const selected = getTargetLanguages(activeTemplate).includes(lang.id);
                            const ts = translations[activeTemplate]?.[lang.id];
                            const langStatus = ts?.status || 'idle';
                            const dotColor = langStatus === 'done' ? '#1B7F4E' : langStatus === 'translating' ? '#E08A00' : langStatus === 'error' ? '#B84242' : c.pearl;
                            return (
                              <label key={lang.id} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '4px 6px', borderRadius: 5, background: selected ? c.teal + '10' : 'transparent', border: selected ? '1px solid ' + c.teal + '30' : '1px solid transparent' }}>
                                <input type="checkbox" checked={selected}
                                  onChange={(e) => {
                                    const current = getTargetLanguages(activeTemplate);
                                    setTargetLanguages(activeTemplate, e.target.checked ? [...current, lang.id] : current.filter(l => l !== lang.id));
                                  }}
                                  style={{ accentColor: c.teal, width: 12, height: 12 }} />
                                <span style={{ fontSize: 13 }}>{lang.flag}</span>
                                <span style={{ fontSize: 10, flex: 1, color: selected ? c.teal : c.slate, fontWeight: selected ? 600 : 400 }}>{lang.label}</span>
                                {selected && langStatus !== 'idle' && (
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Prompt to start from Content Library */
              <div style={{ background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: c.navy, margin: '0 0 8px' }}>Start from Content Library</h3>
                <p style={{ fontSize: 13, color: c.slate, margin: '0 0 20px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                  Create new content or edit existing items from the Content Library tab.
                </p>
                <button 
                  onClick={() => setActiveTab('content')}
                  style={{ padding: '12px 24px', borderRadius: 6, border: 'none', background: c.gold, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  Go to Content Library
                </button>
              </div>
            )}
          </>
        )}

        {/* OTHER TABS */}
        
        {/* EXCEL TAB */}
        {activeTab === 'excel' && (
          <div style={{ background:'#fff', borderRadius:10, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ fontFamily:'Georgia, serif', fontSize:20, color:c.navy, margin:0 }}>Excel Data Connector</h2>
                <p style={{ fontSize:12, color:c.slate, margin:'4px 0 0' }}>Upload Excel files, select data sets and charts, insert into any template.</p>
              </div>
              <button onClick={() => setShowExcelModal(true)} style={{ padding:'10px 18px', borderRadius:6, border:'none', background:c.navy, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                📊 Add Excel Data
              </button>
            </div>

            {/* Saved blocks grouped by template */}
            {Object.keys(excelBlocks).length === 0 ? (
              <div style={{ textAlign:'center', padding:60, border:'2px dashed '+c.pearl, borderRadius:10, color:c.slate }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:6, color:c.navy }}>No Excel data connected yet</div>
                <div style={{ fontSize:12 }}>Click "Add Excel Data" to upload a spreadsheet and connect data to your templates.</div>
              </div>
            ) : (
              Object.entries(excelBlocks).map(([tid, blocks]) => blocks.length > 0 && (
                <div key={tid} style={{ marginBottom:24 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:c.slate, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                    {({ deskCommentary:'Desk Commentary', topMarketTakeaways:'Top Market Takeaways', ideasInsights:'Ideas & Insights', macroMarkets:'Macro & Markets', eventResponse:'Event Response', videoPublish:'Video Publish' })[tid] || tid}
                  </div>
                  {blocks.map(block => (
                    <ExcelBlock key={block.id} block={block}
                      onRefresh={(id, file) => handleExcelRefresh(id, file, tid)}
                      onRemove={(id) => setExcelBlocks(prev => ({ ...prev, [tid]: prev[tid].filter(b => b.id !== id) }))} />
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* CODEBASE TAB */}
        {activeTab === 'codebase' && <CodebaseViewer />}
        {activeTab === 'forwardlook' && <ForwardLookTab onCreateContent={handleForwardLookCreate} />}
        {activeTab === 'about' && <AboutTab />}
        {activeTab === 'views' && <ViewsTab libraryItems={libraryItems} />}
        {activeTab !== 'editor' && activeTab !== 'content' && activeTab !== 'codebase' && (
          activeTab === 'workflow' ? <WorkflowTab items={filteredItems} onStatusChange={(id, s) => setLibraryItems(prev => prev.map(item => item.id===id ? {...item, status:s} : item))} /> :
          activeTab === 'data' ? <DataTaxonomyTab items={libraryItems} mode="data" onUpdateTags={(id, tags) => setLibraryItems(prev => prev.map(item => item.id===id ? {...item, tags} : item))} /> :
          activeTab === 'translations' ? <TranslationsTab
            templateId={activeTemplate || ''}
            content={templateContents[activeTemplate] || {}}
            isExternal={(templateContents[activeTemplate] || {}).isExternal || false}
            targetLanguages={templateLanguages[activeTemplate] || []}
            translations={(translations[activeTemplate]) || {}}
            onTranslate={async (langId) => {
              const tid = activeTemplate;
              const currentContent = templateContents[tid] || {};
              setTranslations(prev => ({ ...prev, [tid]: { ...(prev[tid]||{}), [langId]: { status:'translating', data:null, approvalStatus:'pending' } } }));
              try {
                const langNames = { es:'Spanish', pt:'Portuguese', de:'German', fr:'French', it:'Italian', zh:'Mandarin Chinese', ja:'Japanese', ar:'Arabic', ko:'Korean' };
                const langName = langNames[langId] || langId;
                const sourceText = JSON.stringify({ title: currentContent.title, sections: (currentContent.sections||[]).map(s=>({title:s.title,content:s.content})) });
                const resp = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-api-key': localStorage.getItem('_ak')||'', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                  body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001', max_tokens: 4000,
                    system: 'You are a professional financial translator for J.P. Morgan Private Bank. Translate the content accurately, preserving all financial terminology and the professional tone. Return ONLY valid JSON matching the input structure exactly.',
                    messages: [{ role: 'user', content: `Translate this JSON content to ${langName}. Keep all JSON keys in English. Only translate the values. Return ONLY the JSON object with no other text:
${sourceText}` }]
                  })
                });
                const data = await resp.json();
                const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
                const clean = text.replace(/```json|```/g,'').trim();
                const parsed = JSON.parse(clean);
                setTranslations(prev => ({ ...prev, [tid]: { ...(prev[tid]||{}), [langId]: { status:'done', data:parsed, approvalStatus:'pending' } } }));
              } catch(e) {
                setTranslations(prev => ({ ...prev, [tid]: { ...(prev[tid]||{}), [langId]: { status:'error', data:null, approvalStatus:'pending' } } }));
              }
            }}
            onApprove={(langId) => {
              setTranslations(prev => ({ ...prev, [activeTemplate]: { ...(prev[activeTemplate]||{}), [langId]: { ...(prev[activeTemplate]?.[langId]||{}), approvalStatus:'approved' } } }));
            }}
            onReject={(langId) => {
              setTranslations(prev => ({ ...prev, [activeTemplate]: { ...(prev[activeTemplate]||{}), [langId]: { ...(prev[activeTemplate]?.[langId]||{}), approvalStatus:'rejected' } } }));
            }}
            libraryItems={libraryItems}
            allTranslations={translations}
            allTargetLanguages={templateLanguages}
            onTranslateLibraryItem={() => {}}
          /> :
          activeTab === 'taxonomy' ? <DataTaxonomyTab items={libraryItems} mode="taxonomy" onUpdateTags={(id, tags) => setLibraryItems(prev => prev.map(item => item.id===id ? {...item, tags} : item))} /> :
          activeTab === 'excel' ? <div style={{ background:'#fff', borderRadius:10, padding:24 }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}><div><h2 style={{ fontFamily:'Georgia, serif', fontSize:20, color:c.navy, margin:0 }}>Excel Data Connector</h2><p style={{ fontSize:12, color:c.slate, margin:'4px 0 0' }}>Upload Excel files and connect data to your templates.</p></div><button onClick={() => setShowExcelModal(true)} style={{ padding:'10px 18px', borderRadius:6, border:'none', background:c.navy, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>📊 Add Excel Data</button></div>{Object.keys(excelBlocks).length === 0 ? <div style={{ textAlign:'center', padding:60, border:'2px dashed '+c.pearl, borderRadius:10, color:c.slate }}><div style={{ fontSize:40, marginBottom:12 }}>📂</div><div style={{ fontSize:14, fontWeight:600, color:c.navy, marginBottom:6 }}>No Excel data connected yet</div></div> : Object.entries(excelBlocks).map(([tid, blocks]) => blocks.length > 0 && <div key={tid} style={{ marginBottom:24 }}>{blocks.map(block => <ExcelBlock key={block.id} block={block} onRefresh={(id, file) => handleExcelRefresh(id, file, tid)} onRemove={(id) => setExcelBlocks(prev => ({ ...prev, [tid]: prev[tid].filter(b => b.id !== id) }))} />)}</div>)}</div> :
          <div style={{ background:'#fff', borderRadius:10, padding:40, textAlign:'center', color:c.slate, fontSize:13 }}>{activeTab} — coming soon</div>
        )}
      </div>

    {/* Template Picker Modal */}
    {showTemplateModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowTemplateModal(false)}>
        <div style={{ background:c.ivory, borderRadius:12, width:680, maxHeight:'85vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding:'20px 24px', borderBottom:'1px solid '+c.pearl, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:'Georgia, serif', fontSize:18, color:c.navy }}>New Content</div>
            <button onClick={() => setShowTemplateModal(false)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:c.slate }}>✕</button>
          </div>
          {/* Team tabs */}
          {(() => {
            const groups = [
              { team:'GIS', templates: gisTemplates },
              { team:'Investment Solutions', templates: solutionsTemplates },
              { team:'Banking', templates: bankingTemplates },
              { team:'Planning', templates: planningTemplates },
            ];
            const activeGroup = groups.find(g => g.team === modalTeam) || groups[0];
            return (
              <>
                <div style={{ display:'flex', borderBottom:'1px solid '+c.pearl }}>
                  {groups.map(g => (
                    <button key={g.team} onClick={() => setModalTeam(g.team)}
                      style={{ flex:1, padding:'12px 8px', border:'none', borderBottom: modalTeam===g.team ? '3px solid '+c.navy : '3px solid transparent', background:'none', fontSize:11, fontWeight: modalTeam===g.team ? 700 : 400, color: modalTeam===g.team ? c.navy : c.slate, cursor:'pointer', transition:'all 0.15s' }}>
                      {g.team}
                    </button>
                  ))}
                </div>
                <div style={{ padding:24 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
                    {activeGroup.templates.map(t => (
                      <button key={t.id} onClick={() => selectTemplate(t.id)}
                        style={{ padding:'14px 16px', borderRadius:8, border:'1px solid '+c.pearl, background:'#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=c.navy; e.currentTarget.style.background=c.ivory; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=c.pearl; e.currentTarget.style.background='#fff'; }}>
                        <div style={{ fontSize:22, marginBottom:8 }}>{t.icon || '📄'}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:c.navy, marginBottom:2 }}>{t.name}</div>
                        {t.nexus && <div style={{ fontSize:9, color:c.gold, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nexus</div>}
                        {t.internal && <div style={{ fontSize:9, color:c.teal, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>Internal</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    )}

    {/* Excel Connector Modal */}
    <ExcelConnectorModal isOpen={showExcelModal} onClose={() => setShowExcelModal(false)} onInsert={handleExcelInsert} />
    {clientExposureTicker && <ClientExposurePanel ticker={clientExposureTicker} onClose={() => setClientExposureTicker(null)} />}
    {activeTab === 'editor' && templateContents[activeTemplate] && libraryItems.filter(i => i.status==='published').length > 0 && (() => { try { return <ContentCircle currentContent={templateContents[activeTemplate]} libraryItems={libraryItems} onOpen={() => {}} />; } catch(e) { return null; } })()}

    <AIDraftingPanel
      isOpen={showAIDrafting}
      onClose={() => setShowAIDrafting(false)}
      templateName={({deskCommentary:'Desk Commentary',topMarketTakeaways:'Top Market Takeaways',ideasInsights:'Ideas & Insights',macroMarkets:'Macro & Markets',eventResponse:'Event Response',specialistSpotlight:'Specialist Spotlight',chartOfTheWeek:'Chart of the Week',dailyMarketUpdate:'Daily Market Update'})[activeTemplate] || activeTemplate}
      templateId={activeTemplate}
      content={templateContents[activeTemplate] || {}}
      onApplyDraft={(draft) => {
        updateTemplateContent(activeTemplate, {
          ...templateContents[activeTemplate],
          title: draft.title || templateContents[activeTemplate]?.title || '',
          sections: draft.sections || [],
          tagline: draft.tagline || templateContents[activeTemplate]?.tagline || '',
          charts: draft.charts || templateContents[activeTemplate]?.charts || [],
        });
      }}
    />

    <OutputPreviewPanel
      isOpen={showOutputPreview}
      onClose={() => setShowOutputPreview(false)}
      templateName={({deskCommentary:'Desk Commentary',topMarketTakeaways:'Top Market Takeaways',ideasInsights:'Ideas & Insights',macroMarkets:'Macro & Markets',eventResponse:'Event Response',specialistSpotlight:'Specialist Spotlight',chartOfTheWeek:'Chart of the Week',dailyMarketUpdate:'Daily Market Update'})[activeTemplate] || activeTemplate}
      templateId={activeTemplate}
      content={templateContents[activeTemplate] || {}}
      metadata={{ team: activeTeam, author: templateContents[activeTemplate]?.author || 'You' }}
    />

    {_showKey && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => _setShowKey(false)}>
        <div style={{ background:'#fff', borderRadius:12, padding:28, width:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize:16, fontWeight:700, color:c.navy, marginBottom:6 }}>Anthropic API Key</div>
          <div style={{ fontSize:11, color:c.slate, marginBottom:16, lineHeight:1.6 }}>Required for AI features. Get your key at <strong>console.anthropic.com</strong>. Saved in this browser only.</div>
          <input type="password" value={_apiKey} onChange={e => { _setApiKey(e.target.value); localStorage.setItem('_ak', e.target.value); }}
            placeholder="sk-ant-api03-..." autoFocus
            style={{ width:'100%', padding:'9px 12px', borderRadius:7, border:'1.5px solid '+c.pearl, fontSize:13, outline:'none', marginBottom:14, boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => _setShowKey(false)} style={{ flex:1, padding:9, borderRadius:7, border:'none', background:c.navy, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>Save & Close</button>
            {_apiKey && <button onClick={() => { _setApiKey(''); localStorage.removeItem('_ak'); window.__ANTHROPIC_KEY=''; }} style={{ padding:'9px 14px', borderRadius:7, border:'1px solid '+c.pearl, background:'#fff', color:c.slate, fontSize:12, cursor:'pointer' }}>Clear</button>}
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
const DailyMarketUpdateContent = ({ isMobile, c_content, formatText, JPMDisclaimer }) => {
  const region = c_content.region || 'APAC';
  const regionDef = REGIONS.find(r => r.id === region) || REGIONS[0];
  const metrics = (c_content.metrics || []).filter(m => m.value);
  const clientFlow = c_content.clientFlow || null;
  const sections = c_content.sections || [];
  const displayQuote = c_content.customQuote || getDailyQuote();
  const skew = clientFlow?.buySkew ?? 52;

  // Separate sections by role
  const psaTop = sections.find(s => s.id === 'psatop' && s.content);
  const commentary = sections.find(s => s.id === 'commentary');
  const storyGroups = [];
  let i = 0;
  while (i < sections.length) {
    const s = sections[i];
    if (s.id?.startsWith('interesting') || s.id?.match(/^story\d/)) {
      const next = sections[i + 1];
      storyGroups.push({ story: s, view: next?.id?.startsWith('view') ? next : null });
      i += next?.id?.startsWith('view') ? 2 : 1;
    } else { i++; }
  }
  const oped = sections.find(s => s.id === 'oped' && s.content);
  const psa = sections.find(s => s.id === 'psa' && s.content);
  // Also catch any extra sections added by user
  const extraSections = sections.filter(s =>
    !['psatop','commentary','interesting1','interesting2','interesting3','view1','view2','view3','oped','psa'].includes(s.id) && s.content
  );

  // Bar chart data
  const buys = (clientFlow?.topBuys || []).filter(b => b.ticker).map(b => ({ label: b.ticker, count: parseInt(b.count) || 1 }));
  const sells = (clientFlow?.topSells || []).filter(s => s.ticker).map(s => ({ label: s.ticker, count: parseInt(s.count) || 1 }));
  const maxCount = Math.max(...buys.map(t => t.count), ...sells.map(t => t.count), 1);
  const barPairs = Array.from({ length: Math.max(buys.length, sells.length) }, (_, i) => ({ buy: buys[i] || null, sell: sells[i] || null }));

  const Card = ({ children, style }) => (
    <div style={{ background: '#fff', border: '1px solid #E8E0D0', borderRadius: 10, padding: isMobile ? '14px 16px' : '18px 22px', marginBottom: 14, ...style }}>
      {children}
    </div>
  );
  const SectionHeader = ({ children, style }) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: '#0A1A2F', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10, ...style }}>{children}</div>
  );

  return (
    <div style={{ fontFamily: jpm.fontSans, background: jpm.gray50, maxWidth: isMobile ? '100%' : 800, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '3px solid #0A1A2F', padding: isMobile ? '20px 16px 16px' : '24px 32px 20px', marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: jpm.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>
          J.P. Morgan Private Bank · Internal · {region}
        </div>
        <h1 style={{ fontFamily: jpm.fontSerif, fontSize: isMobile ? 20 : 26, color: '#0A1A2F', margin: '0 0 5px', fontWeight: 400, lineHeight: 1.25 }}>
          {c_content.title || regionDef.title}
        </h1>
        <div style={{ fontSize: 11, color: jpm.gray500, marginBottom: 12 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {/* Quote strip */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid ' + jpm.gray200 }}>
          <div style={{ width: 3, borderRadius: 2, background: jpm.gold, alignSelf: 'stretch', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, fontStyle: 'italic', color: jpm.gray700, lineHeight: 1.5, marginBottom: 2 }}>"{displayQuote.text}"</div>
            <div style={{ fontSize: 10, color: jpm.gold, fontWeight: 600 }}>— {displayQuote.author}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: isMobile ? '0 16px' : '0 32px' }}>

        {/* PSA top */}
        {psaTop && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            <strong>📌 PSA:</strong> {psaTop.content}
          </div>
        )}

        {/* ── MARKET WRAP BOX ── */}
        <div style={{ border: '2px solid #0A1A2F', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          {/* Box header */}
          <div style={{ background: '#0A1A2F', padding: '10px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>What Happened Yesterday</div>
          </div>
          <div style={{ padding: isMobile ? '14px' : '18px', background: '#fff' }}>

            {/* Metrics */}
            {metrics.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <SectionHeader>📊 What The Markets Did — {region}</SectionHeader>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(110px,1fr))', gap: 7 }}>
                  {metrics.map((m, idx) => {
                    const up = m.direction === 'up', down = m.direction === 'down';
                    return (
                      <div key={idx} style={{ background: up ? '#F0FDF4' : down ? '#FFF1F1' : jpm.gray50, borderRadius: 7, padding: '8px 10px', border: '1px solid ' + (up ? '#BBF7D0' : down ? '#FECACA' : jpm.gray200) }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: jpm.gray400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{m.name}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1A2F' }}>{m.value}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: up ? '#059669' : down ? '#DC2626' : jpm.gray400 }}>
                          {up ? '▲' : down ? '▼' : '●'} {m.change}{m.pct ? ` (${m.pct}%)` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client flow */}
            {barPairs.length > 0 && (
              <div style={{ marginBottom: commentary?.content ? 14 : 0 }}>
                <SectionHeader>👤 What Our Clients Did — Yesterday</SectionHeader>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ display: 'inline-block', width: 8, height: 8, background: '#16A34A', borderRadius: 2 }} />Buys</span>
                  <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ display: 'inline-block', width: 8, height: 8, background: '#DC2626', borderRadius: 2 }} />Sells</span>
                </div>
                {barPairs.map((pair, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'center' }}>
                    {/* Buy side */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 38, fontSize: 10, fontWeight: 700, color: '#0A1A2F', textAlign: 'right', flexShrink: 0 }}>{pair.buy?.label || ''}</div>
                      <div style={{ flex: 1, height: 16, background: jpm.gray100, borderRadius: 3, overflow: 'hidden' }}>
                        {pair.buy && <div style={{ height: '100%', width: `${(pair.buy.count / maxCount) * 100}%`, background: '#16A34A', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
                          <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{pair.buy.count}</span>
                        </div>}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 16, background: jpm.gray200, flexShrink: 0 }} />
                    {/* Sell side */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ flex: 1, height: 16, background: jpm.gray100, borderRadius: 3, overflow: 'hidden' }}>
                        {pair.sell && <div style={{ height: '100%', width: `${(pair.sell.count / maxCount) * 100}%`, background: '#DC2626', borderRadius: 3, display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                          <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{pair.sell.count}</span>
                        </div>}
                      </div>
                      <div style={{ width: 38, fontSize: 10, fontWeight: 700, color: '#0A1A2F', flexShrink: 0 }}>{pair.sell?.label || ''}</div>
                    </div>
                  </div>
                ))}
                {/* Skew */}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid ' + jpm.gray200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}>
                    <span style={{ color: '#059669', fontWeight: 600 }}>Buy {skew}%</span>
                    <span style={{ color: skew > 55 ? '#059669' : skew < 45 ? '#DC2626' : jpm.gray500, fontWeight: 700 }}>{skew > 55 ? 'Buy skew' : skew < 45 ? 'Sell skew' : 'Balanced'}</span>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Sell {100 - skew}%</span>
                  </div>
                  <div style={{ height: 5, background: '#FEE2E2', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${skew}%`, background: '#16A34A', borderRadius: '3px 0 0 3px' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Commentary — no title, just lead text */}
            {commentary?.content && (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: jpm.gray700, marginTop: barPairs.length > 0 ? 14 : 0, paddingTop: barPairs.length > 0 ? 14 : 0, borderTop: barPairs.length > 0 ? '1px solid ' + jpm.gray200 : 'none' }}>
                {commentary.content}
              </div>
            )}
          </div>
        </div>

        {/* ── WHAT WE'RE WATCHING ── */}
        {storyGroups.some(g => g.story.content) && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1A2F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: jpm.gray200 }} />
              What We're Watching
              <div style={{ flex: 1, height: 1, background: jpm.gray200 }} />
            </div>
            {storyGroups.filter(g => g.story.content).map((g, idx) => (
              <Card key={idx}>
                <div style={{ fontSize: 11, fontWeight: 700, color: jpm.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  {g.story.title}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: jpm.gray700 }}>{g.story.content}</div>
                {g.view?.content && (
                  <div style={{ borderLeft: '3px solid #103A45', paddingLeft: 10, marginTop: 10 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#103A45', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Our View</div>
                    <div style={{ fontSize: 12, lineHeight: 1.55, color: jpm.gray700, fontStyle: 'italic' }}>{g.view.content}</div>
                  </div>
                )}
              </Card>
            ))}
          </>
        )}

        {/* Extra user-added sections */}
        {extraSections.map((s, idx) => (
          <Card key={idx}>
            {s.title && <div style={{ fontSize: 10, fontWeight: 700, color: jpm.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.title}</div>}
            <div style={{ fontSize: 13, lineHeight: 1.65, color: jpm.gray700 }}>{s.content}</div>
          </Card>
        ))}

        {/* Op-Ed */}
        {oped && (
          <Card style={{ borderLeft: '3px solid ' + jpm.gold }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1A2F', fontFamily: jpm.fontSerif, marginBottom: 10 }}>Op-Ed</div>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: jpm.gray700, fontFamily: jpm.fontSerif }}>{oped.content}</div>
          </Card>
        )}

        {/* Bottom PSA */}
        {psa && (
          <div style={{ background: '#F8FAFC', border: '1px solid ' + jpm.gray200, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: jpm.gray500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>PSAs</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: jpm.gray700 }}>{psa.content}</div>
          </div>
        )}

        <JPMDisclaimer />
      </div>
    </div>
  );
};


