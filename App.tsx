import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Search, Upload, FileText, FlaskConical, BarChart3, MessageSquareText, Library, Settings, Moon, Sun, Plus, ExternalLink, Download, Copy, Trash2, Bookmark, ChevronRight, Sparkles, CircleHelp, Check, X, ClipboardList, Microscope, Quote, Tags, PanelLeftClose, Menu } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

type Paper = {
  id: string; title: string; authors: string[]; journal: string; year: string; doi: string; url: string;
  abstract: string; text: string; keywords: string[]; status: string; savedAt: number; notes: string; source: string
}
const demo: Paper = {
  id: 'demo-paper',
  title: 'Example paper workspace — replace with your own research article',
  authors: ['Demonstration record only'],
  journal: 'ResearchPaper Insight demo',
  year: '2025',
  doi: '',
  url: '',
  abstract: 'This is a demonstration workspace, not a real publication. Upload a PDF or search a DOI/title to populate the analysis with source-derived content.',
  text: '',
  keywords: ['Research methods', 'Reproducibility', 'Critical appraisal'],
  status: 'To Read',
  savedAt: Date.now(),
  notes: '',
  source: 'Demonstration'
}
const sections = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'information', label: 'Paper information', icon: FileText },
  { id: 'keywords', label: 'Keywords & concepts', icon: Tags },
  { id: 'findings', label: 'Key findings', icon: Sparkles },
  { id: 'methods', label: 'Materials & methods', icon: FlaskConical },
  { id: 'protocols', label: 'Protocols', icon: ClipboardList },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'discussion', label: 'Discussion', icon: MessageSquareText },
  { id: 'appraisal', label: 'Critical appraisal', icon: Microscope },
  { id: 'gaps', label: 'Research gaps', icon: CircleHelp },
  { id: 'references', label: 'References', icon: Quote },
  { id: 'notes', label: 'Personal notes', icon: Bookmark }
]
const splitSentences = (text: string) => text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(s => s.trim()).filter(s => s.length > 35)
const sectionText = (text: string, heading: RegExp) => {
  const match = heading.exec(text)
  if (!match) return ''
  const start = match.index + match[0].length
  const rest = text.slice(start)
  const next = rest.search(/\n\s*(?:abstract|introduction|materials and methods|methods|results|discussion|conclusion|references|acknowledg(?:e)?ments|supplementary)\s*\n/i)
  return rest.slice(0, next > 0 ? next : 4500).trim()
}
const escapeMd = (s: string) => s || 'Not reported'
function App() {
  const [papers, setPapers] = useState<Paper[]>(() => {
    try { const saved = localStorage.getItem('rpi-papers'); return saved ? JSON.parse(saved) : [demo] } catch { return [demo] }
  })
  const [activeId, setActiveId] = useState(papers[0]?.id || demo.id)
  const [section, setSection] = useState('overview')
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [lookup, setLookup] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [question, setQuestion] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const active = papers.find(p => p.id === activeId) || papers[0] || demo
  useEffect(() => { localStorage.setItem('rpi-papers', JSON.stringify(papers)) }, [papers])
  const filtered = useMemo(() => papers.filter(p => `${p.title} ${p.authors.join(' ')} ${p.doi} ${p.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [papers, query])
  const updateActive = (patch: Partial<Paper>) => setPapers(prev => prev.map(p => p.id === activeId ? { ...p, ...patch } : p))
  const makePaper = (patch: Partial<Paper>) => {
    const p: Paper = { ...demo, ...patch, id: crypto.randomUUID(), savedAt: Date.now(), notes: patch.notes || '' }
    setPapers(prev => [p, ...prev.filter(x => x.id !== demo.id)])
    setActiveId(p.id); setSection('overview'); return p
  }
  async function uploadPdf(file?: File) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setNotice('Please select a PDF file.'); return }
    setBusy(true); setNotice('Extracting PDF text in your browser…')
    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += `\n\n[Page ${i}]\n` + content.items.map((item: any) => item.str || '').join(' ')
      }
      const title = (text.match(/(?:^|\n)\s*(.{15,220})\s*\n/)?.[1] || file.name.replace(/\.pdf$/i, '')).trim()
      const abstract = sectionText(text, /\babstract\b/i) || splitSentences(text).slice(0, 3).join(' ')
      const kw = text.match(/keywords?\s*[:\-]\s*([^\n]+)/i)?.[1]?.split(/[,;•]/).map(s => s.trim()).filter(Boolean) || []
      makePaper({ title, text, abstract, keywords: kw, source: `Uploaded PDF · ${pdf.numPages} pages`, url: '', authors: [], journal: '', year: '', doi: text.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i)?.[0] || '' })
      setNotice(text.trim() ? `Extracted text from ${pdf.numPages} pages. Review the source text and missing fields.` : 'No selectable text found. This may be a scanned PDF; OCR is not included in this deployment.')
    } catch (e) { setNotice('Could not read this PDF. It may be damaged, encrypted, or unsupported.') }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }
  async function searchPaper() {
    const q = lookup.trim()
    if (!q) { setNotice('Enter a DOI, article URL, or paper title first.'); return }
    setBusy(true); setNotice('Searching Crossref metadata…')
    try {
      const doi = q.match(/10\.\d{4,9}\/\S+/)?.[0]?.replace(/[.,;]+$/, '')
      const endpoint = doi ? `https://api.crossref.org/works/${encodeURIComponent(doi)}` : `https://api.crossref.org/works?query.title=${encodeURIComponent(q)}&rows=1`
      const response = await fetch(endpoint, { headers: { 'Accept': 'application/json' } })
      if (!response.ok) throw new Error('Metadata not found')
      const json = await response.json()
      const m = doi ? json.message : json.message?.items?.[0]
      if (!m) throw new Error('No match found')
      const title = m.title?.[0] || q
      const authors = (m.author || []).map((a: any) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean)
      const year = String(m.published?.['date-parts']?.[0]?.[0] || m.created?.['date-parts']?.[0]?.[0] || '')
      const d = m.DOI || doi || ''
      const p = makePaper({ title, authors, journal: m['container-title']?.[0] || '', year, doi: d, url: m.URL || (d ? `https://doi.org/${d}` : ''), abstract: (m.abstract || '').replace(/<[^>]+>/g, ''), text: '', keywords: m.subject || [], source: 'Crossref metadata' })
      setNotice(`Retrieved metadata for “${p.title}”. Full text is not automatically downloaded; upload the PDF to analyse its contents.`)
    } catch { setNotice('No reliable Crossref match was found. Try a DOI, exact title, or manually add the paper.') }
    finally { setBusy(false) }
  }
  function exportMarkdown() {
    const t = active.text
    const content = `# ${active.title}\n\n## Paper information\n- Authors: ${active.authors.join(', ') || 'Not reported'}\n- Journal: ${active.journal || 'Not reported'}\n- Year: ${active.year || 'Not reported'}\n- DOI: ${active.doi || 'Not reported'}\n- Source: ${active.source}\n- Journal impact factor: Not verified in this deployment\n\n## Overview\n${active.abstract || 'Not reported'}\n\n## Keywords\n${active.keywords.join(', ') || 'Author keywords not reported'}\n\n## Materials and methods (extracted text)\n${sectionText(t, /\b(?:materials and methods|methods)\b/i) || 'Not found in extracted text. Inspect the PDF manually.'}\n\n## Results (extracted text)\n${sectionText(t, /\bresults\b/i) || 'Not found in extracted text. Inspect the PDF manually.'}\n\n## Discussion (extracted text)\n${sectionText(t, /\bdiscussion\b/i) || 'Not found in extracted text. Inspect the PDF manually.'}\n\n## Critical appraisal\n- This deployment does not perform independent validated AI appraisal.\n- Verify study design, controls, sample size, statistics, conflicts, and limitations against the source.\n\n## Personal notes\n${active.notes || 'No notes added.'}\n\n## Source text\n${t ? t.slice(0, 18000) : 'No PDF text uploaded.'}\n`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${active.title.slice(0, 60).replace(/[^\w-]+/g, '-') || 'paper-analysis'}.md`; a.click(); URL.revokeObjectURL(url)
  }
  async function copyText(text: string) { try { await navigator.clipboard.writeText(text); setNotice('Copied to clipboard.') } catch { setNotice('Clipboard access is unavailable in this browser.') } }
  const sentences = splitSentences(active.text)
  const methods = sectionText(active.text, /\b(?:materials and methods|methods)\b/i)
  const results = sectionText(active.text, /\bresults\b/i)
  const discussion = sectionText(active.text, /\bdiscussion\b/i)
  const findings = sentences.filter(s => /\b(significant|increased|decreased|compared|demonstrated|showed|observed|associated|p\s*[=<]|fold|%|confidence interval)\b/i.test(s)).slice(0, 12)
  const refs = sectionText(active.text, /\breferences\b/i)
  const activeSection = sections.find(s => s.id === section) || sections[0]
  return <div className={dark ? 'app dark' : 'app'}>
    <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
      <div className="brand"><div className="brand-mark"><BookOpen size={21}/></div>{sidebarOpen && <div><b>ResearchPaper</b><span>INSIGHT</span></div>}<button className="icon-btn collapse" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar"><PanelLeftClose size={17}/></button></div>
      <button className="new-paper" onClick={() => { setSection('overview'); setNotice('Upload a PDF or search metadata to begin a new analysis.') }}><Plus size={17}/>{sidebarOpen && 'New analysis'}</button>
      <div className="nav-label">{sidebarOpen ? 'WORKSPACE' : '—'}</div>
      {sections.map(s => <button key={s.id} className={`nav-item ${section === s.id ? 'selected' : ''}`} onClick={() => setSection(s.id)} title={s.label}><s.icon size={17}/>{sidebarOpen && <span>{s.label}</span>}{sidebarOpen && section === s.id && <ChevronRight size={15} className="nav-chevron"/>}</button>)}
      <div className="sidebar-bottom"><div className="nav-label">{sidebarOpen ? 'LIBRARY' : '—'}</div><button className="nav-item" onClick={() => { setSection('overview'); document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' }) }}><Library size={17}/>{sidebarOpen && <span>My papers <em>{papers.filter(p => p.id !== demo.id).length}</em></span>}</button><button className="nav-item" onClick={() => setDark(!dark)}>{dark ? <Sun size={17}/> : <Moon size={17}/ >}{sidebarOpen && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}</button><div className="profile">{sidebarOpen && <><div className="avatar">RI</div><div><b>Research workspace</b><small>Local browser library</small></div><Settings size={16}/></>}</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={19}/></button><div className="crumb">Workspace <ChevronRight size={14}/> <span>{activeSection.label}</span></div><div className="top-actions"><div className="global-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your library…"/><kbd>⌘ K</kbd></div><button className="avatar small-avatar" title="Research workspace">RI</button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/>{active.source === 'Demonstration' ? 'YOUR SCIENTIFIC WORKSPACE' : 'PAPER ANALYSIS WORKSPACE'}</div><h1>{section === 'overview' ? 'Research, understood.' : activeSection.label}</h1><p>{section === 'overview' ? 'Turn complex papers into structured, traceable research notes.' : `Explore ${activeSection.label.toLowerCase()} for the selected research paper.`}</p></div><button className="button secondary" onClick={exportMarkdown}><Download size={16}/> Export notes</button></div>
        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}><X size={15}/></button></div>}
        {section === 'overview' && <>
          <div className="hero-grid">
            <div className="upload-card"><div className="card-icon blue"><Upload size={20}/></div><div><h3>Upload a research paper</h3><p>Extract selectable PDF text locally in your browser.</p></div><button className="button primary" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={16}/>{busy ? 'Processing…' : 'Choose PDF'}</button><input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={e => uploadPdf(e.target.files?.[0])}/><div className="upload-foot"><span><Check size={14}/> PDF text extraction</span><span><Check size={14}/> Private to this browser</span></div></div>
            <div className="lookup-card"><div className="card-icon violet"><Search size={20}/></div><h3>Find paper metadata</h3><p>Search by DOI or title with Crossref.</p><form onSubmit={e => { e.preventDefault(); searchPaper() }}><input value={lookup} onChange={e => setLookup(e.target.value)} placeholder="e.g. 10.1038/… or paper title"/><button className="button primary" disabled={busy}>{busy ? 'Searching…' : 'Search'} <ChevronRight size={16}/></button></form><small>Metadata may be incomplete. Full text requires a PDF.</small></div>
          </div>
          <div className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Saved papers</span><Library size={17}/></div><strong>{papers.filter(p => p.id !== demo.id).length}</strong><small>In this browser</small></div><div className="stat-card"><div className="stat-top"><span>Currently viewing</span><FileText size={17}/></div><strong className="stat-title">{active.title === demo.title ? 'Demo paper' : active.title.slice(0, 28) + (active.title.length > 28 ? '…' : '')}</strong><small>{active.source}</small></div><div className="stat-card"><div className="stat-top"><span>Reading progress</span><BarChart3 size={17}/></div><strong>{papers.filter(p => p.status === 'Read').length}<span className="muted-number"> / {papers.length}</span></strong><small>Marked as read</small></div></div>
          <div className="section-title" id="library"><div><h2>Your research library</h2><p>Keep papers, notes, and reading status in one place.</p></div><button className="button secondary" onClick={() => { setLookup(''); setNotice('Use the metadata search above or upload a PDF to add a paper.') }}><Plus size={15}/> Add paper</button></div>
          <div className="paper-list">{filtered.map(p => <div className={`paper-row ${activeId === p.id ? 'paper-active' : ''}`} key={p.id} onClick={() => setActiveId(p.id)}><div className="paper-file"><FileText size={20}/></div><div className="paper-details"><b>{p.title}</b><span>{p.authors.join(', ') || 'Author details not reported'} · {p.journal || 'Journal not reported'} {p.year && `· ${p.year}`}</span><div className="paper-tags">{p.keywords.slice(0, 3).map(k => <span key={k}>{k}</span>)}<span className="source-tag">{p.source}</span></div></div><select aria-label="Reading status" value={p.status} onClick={e => e.stopPropagation()} onChange={e => setPapers(prev => prev.map(x => x.id === p.id ? { ...x, status: e.target.value } : x))}><option>To Read</option><option>Reading</option><option>Read</option><option>Revisit</option></select><button className="icon-btn delete" title="Delete paper" onClick={e => { e.stopPropagation(); setPapers(prev => prev.filter(x => x.id !== p.id)); if (activeId === p.id) setActiveId(papers.find(x => x.id !== p.id)?.id || '') }}><Trash2 size={16}/></button></div>)}</div>
          <div className="trust-note"><Sparkles size={17}/><div><b>Evidence first, always.</b><p>Missing details are labelled rather than guessed. Journal impact factor and quartile are not verified by this deployment.</p></div></div>
        </>}
        {section !== 'overview' && <div className="analysis-layout"><div className="analysis-main">
          <div className="paper-banner"><div className="paper-file large"><FileText size={24}/></div><div><span className="pill">{active.source}</span><h2>{active.title}</h2><p>{active.authors.join(', ') || 'Authors not reported'}{active.year ? ` · ${active.year}` : ''}</p></div><button className="icon-btn" onClick={() => copyText(active.title)} title="Copy title"><Copy size={16}/></button></div>
          {section === 'information' && <Panel title="Complete paper information" sub="Metadata from the uploaded paper or Crossref record. Missing details are explicit."><InfoRow label="Title" value={active.title}/><InfoRow label="Authors & affiliations" value={active.authors.join(', ') || 'Not reported'}/><InfoRow label="Journal" value={active.journal || 'Not reported'}/><InfoRow label="Publication year" value={active.year || 'Not reported'}/><InfoRow label="DOI" value={active.doi || 'Not reported'} link={active.doi ? `https://doi.org/${active.doi}` : ''}/><InfoRow label="Article URL" value={active.url || 'Not reported'} link={active.url}/><InfoRow label="PMID / PMCID" value="Not reported"/><InfoRow label="Article type / study design" value="Unable to verify from available metadata"/><InfoRow label="Journal impact factor / quartile" value="Not verified — requires an authoritative source such as Journal Citation Reports"/><InfoRow label="Citation count" value="Not verified"/><InfoRow label="Open access, funding & conflicts" value="Not reported unless present in source text"/><InfoRow label="Data, code & supplements" value="Check publisher article and supplementary files"/></Panel>}
          {section === 'keywords' && <Panel title="Keywords & scientific concepts" sub="Author keywords are separated from any suggested terms."><h4>Keywords reported in metadata / article</h4><div className="keyword-cloud">{active.keywords.length ? active.keywords.map(k => <button key={k} onClick={() => setQuery(k)}>{k}<Search size={12}/></button>) : <p className="muted">Author-provided keywords: Not reported.</p>}</div><h4>Additional concepts</h4><p className="muted">AI-generated keywords are not available in this no-API deployment. Add terms from the paper and use the library search to connect related papers.</p><InfoRow label="Genes / proteins / pathways" value="Extract manually from the article; not reliably identified yet."/><InfoRow label="Experimental methods" value={active.text ? [...new Set((active.text.match(/\b(PCR|qPCR|ELISA|Western blot|flow cytometry|RNA-seq|scRNA-seq|CRISPR|immunofluorescence|mass spectrometry|chromatography)\b/gi) || []))].join(', ') || 'Not identified by basic text scan' : 'Upload the PDF to inspect text.'}/></Panel>}
          {section === 'findings' && <Panel title="Important points & five-minute review" sub="Candidate findings are extracted from selectable text and must be checked against figures and tables.">{active.abstract && <div className="highlight-box"><b>Abstract / overview</b><p>{active.abstract}</p></div>}<h4>Candidate key observations</h4>{findings.length ? <ol className="insight-list">{findings.map((s, i) => <li key={i}>{s}</li>)}</ol> : <Empty text="No candidate findings extracted. Upload a full-text PDF with selectable text."/>}<div className="callout"><b>Five-minute review</b><p>Confirm the research question, main model, strongest quantitative finding, key control, limitations, and conclusion directly in the original article. Page/figure mapping needs manual verification.</p></div></Panel>}
          {section === 'methods' && <Panel title="Materials & methods" sub="Source-derived text only. This view does not fill in missing protocol parameters."><TextExtract text={methods} label="Methods section" pageText={active.text}/><InfoRow label="Model system" value="Extract from source; not automatically verified"/><InfoRow label="Biological / technical replicates" value="Not reported unless explicitly visible in extracted text"/><InfoRow label="Controls and groups" value="Inspect the original Methods and figure legends"/><InfoRow label="Ethics / consent" value="Not reported unless identified in the paper"/><div className="callout"><b>Reproducibility reminder</b><p>Manufacturer, catalogue numbers, concentrations, volumes, temperatures, incubation times, and instrument settings must be checked against the original publication and supplementary methods.</p></div></Panel>}
          {section === 'protocols' && <Panel title="Protocol builder" sub="Organize reported steps for lab review; missing conditions remain marked."><div className="workflow">{['Sample / model preparation','Treatment and experimental groups','Assay or measurement','Data acquisition','Data processing','Statistical analysis'].map((s, i) => <div className="workflow-step" key={s}><span>{String(i + 1).padStart(2, '0')}</span><div><b>{s}</b><small>{i === 0 ? 'Source details: verify sample and model information.' : 'Extract exact conditions from Methods / supplements; do not infer missing values.'}</small></div></div>)}</div><h4>Methods text for protocol drafting</h4><TextExtract text={methods} label="Reported protocol details" pageText={active.text}/><div className="callout warning"><b>Before laboratory use</b><p>Verify all parameters against the original paper, supplementary materials, institutional SOPs, and relevant safety procedures.</p></div></Panel>}
          {section === 'results' && <Panel title="Results analysis" sub="Extracted prose, not a validated statistical or figure interpretation."><TextExtract text={results} label="Results section" pageText={active.text}/><h4>Figure and table review checklist</h4><ul className="check-list">{['What was measured and why','Model, groups, sample size, and replicates','Axes, units, symbols, and error bars','Exact p-values, effect sizes, and confidence intervals','What the result supports — and does not establish'].map(x => <li key={x}><Check size={15}/>{x}</li>)}</ul><div className="callout"><b>Quantitative values</b><p>No values are inferred from plots. Inspect original figures and tables before citing numerical findings.</p></div></Panel>}
          {section === 'discussion' && <Panel title="Discussion & interpretation" sub="The extracted section is presented separately from independent interpretation."><TextExtract text={discussion} label="Discussion section" pageText={active.text}/><h4>Interpretation safeguards</h4><ul className="check-list">{['Separate observed results from authors’ explanations','Distinguish association from causation','Separate in-vitro, animal, observational, and clinical evidence','Compare with prior studies cited by the authors','Record alternative explanations and limitations'].map(x => <li key={x}><Check size={15}/>{x}</li>)}</ul></Panel>}
          {section === 'appraisal' && <Panel title="Critical appraisal" sub="Use this as a structured review checklist, not an automated quality score."><div className="appraisal-grid">{[['Scientific rationale','Is the knowledge gap clear and supported?'],['Study design','Does it answer the research question?'],['Controls & bias','Are controls appropriate and confounders addressed?'],['Sample size & power','Is the sample size justified?'],['Methods reproducibility','Are reagents, parameters, and analysis described?'],['Statistics','Are tests appropriate and assumptions checked?'],['Evidence strength','Do conclusions match the data?'],['Transparency','Are funding, conflicts, data, and code disclosed?']].map(([a,b]) => <div key={a} className="appraisal-item"><b>{a}</b><p>{b}</p><span>Assessment: Review required</span></div>)}</div><div className="callout">No arbitrary quality score is assigned. Record evidence and uncertainty for every assessment.</div></Panel>}
          {section === 'gaps' && <Panel title="Research gaps & future directions" sub="Keep author-acknowledged limitations distinct from your own proposed follow-up work."><h4>Author-reported limitations</h4><TextExtract text={sectionText(active.text, /\b(?:limitations|study limitations)\b/i)} label="Limitations" pageText={active.text}/><h4>Questions for follow-up</h4><ul className="check-list">{['Which mechanism remains unvalidated?','Would an independent replication strengthen confidence?','Are additional controls, time points, or dose-response data needed?','Does the model represent the relevant biological or clinical context?','Are raw data and analysis code available?'].map(x => <li key={x}><CircleHelp size={15}/>{x}</li>)}</ul><label className="field-label">Your proposed research directions</label><textarea value={active.notes} onChange={e => updateActive({ notes: e.target.value })} placeholder="Record possible follow-up experiments and rationale…" rows={5}/></Panel>}
          {section === 'references' && <Panel title="References & literature connections" sub="References are taken from extracted PDF text when detected."><TextExtract text={refs} label="Reference list" pageText={active.text}/><div className="callout">For related publications, search the DOI or title in Crossref / PubMed and compare claims against original sources. Crossref metadata alone does not verify scientific conclusions.</div></Panel>}
          {section === 'notes' && <Panel title="Personal research notes" sub="Notes autosave to local browser storage on this device."><label className="field-label">Notes for this paper</label><textarea value={active.notes} onChange={e => updateActive({ notes: e.target.value })} rows={10} placeholder="Record hypotheses, questions, methods to revisit, or ideas for your own project…"/><div className="notes-actions"><span><Check size={14}/> Saved in this browser</span><button className="button secondary" onClick={() => copyText(active.notes)}><Copy size={15}/> Copy notes</button></div></Panel>}
          <div className="qa-card"><div className="qa-icon"><Sparkles size={18}/></div><div className="qa-body"><b>Ask about this paper</b><p>Quickly search the extracted source text for a phrase or question.</p><form onSubmit={e => { e.preventDefault(); const matches = active.text ? active.text.split(/\n/).filter(line => line.toLowerCase().includes(question.toLowerCase())).slice(0, 5).join('\n') : ''; setNotice(question ? (matches || 'No exact text match found. This is a keyword search, not an AI-generated answer.') : 'Enter a question or phrase first.'); setQuestion('') }}><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. What controls were used?"/><button className="button primary"><Search size={15}/> Find in paper</button></form></div></div>
        </div><aside className="right-rail"><div className="rail-card"><h3>Paper snapshot</h3><div className="rail-stat"><span>Year</span><b>{active.year || '—'}</b></div><div className="rail-stat"><span>Journal</span><b>{active.journal || 'Not reported'}</b></div><div className="rail-stat"><span>DOI</span><b>{active.doi || 'Not reported'}</b></div><div className="rail-stat"><span>Impact factor</span><b>Not verified</b></div><div className="rail-divider"/><label className="field-label">Reading status</label><select value={active.status} onChange={e => updateActive({ status: e.target.value })}><option>To Read</option><option>Reading</option><option>Read</option><option>Revisit</option></select>{active.url && <a className="external-link" href={active.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14}/></a>}</div><div className="rail-card"><h3>Source coverage</h3><div className="coverage-row"><span>PDF text</span><b>{active.text ? 'Available' : 'Not uploaded'}</b></div><div className="coverage-row"><span>Metadata</span><b>{active.source === 'Crossref metadata' ? 'Crossref' : 'Partial'}</b></div><div className="coverage-row"><span>Figures & tables</span><b>Manual review</b></div><div className="coverage-row"><span>AI analysis API</span><b>Not connected</b></div></div><div className="rail-tip"><Sparkles size={16}/><p><b>Research tip</b><br/>Keep a record of page, figure, and table numbers whenever you save a finding.</p></div></aside></div>}
        <footer><span>ResearchPaper Insight</span><span>Built for careful, reproducible reading · Always verify against the original paper</span></footer>
      </div>
    </main>
  </div>
}
function InfoRow({ label, value, link }: { label: string; value: string; link?: string }) { return <div className="info-row"><span>{label}</span><b>{value || 'Not reported'}</b>{link && <a href={link} target="_blank" rel="noreferrer"><ExternalLink size={14}/></a>}</div> }
function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) { return <section className="panel"><div className="panel-heading"><div><h3>{title}</h3><p>{sub}</p></div><button className="icon-btn" title="Copy section title" onClick={() => navigator.clipboard?.writeText(title)}><Copy size={15}/></button></div><div className="panel-content">{children}</div></section> }
function Empty({ text }: { text: string }) { return <div className="empty-state"><FileText size={25}/><p>{text}</p></div> }
function TextExtract({ text, label, pageText }: { text: string; label: string; pageText: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return <Empty text={`${label} not found in extracted text. It may be absent, scanned, or labelled differently in the source.`}/>
  return <div className="extract"><div className="extract-header"><span><FileText size={14}/>{label} · source text</span><button onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less' : 'Expand text'} <ChevronRight size={14}/></button></div><p className={expanded ? 'extract-text expanded' : 'extract-text'}>{text}</p><button className="text-action" onClick={() => navigator.clipboard?.writeText(text)}><Copy size={14}/> Copy extracted section</button><small>Source page markers may be present in the full extracted text; confirm exact page locations in the PDF.</small></div>
}
export default App
