# ResearchPaper Insight

A responsive React + TypeScript research-paper workspace designed for Vercel static deployment.

## Included in this ZIP
- PDF upload and browser-side text extraction (PDF.js)
- DOI / paper URL / title lookup using Crossref metadata API
- Structured paper information and analysis workspace
- Methods/protocol, results, discussion, critical appraisal, research gaps, references, and notes sections
- Searchable local research library with reading status, tags, and deletion
- Export analysis as Markdown and copy text
- Light/dark theme toggle
- Responsive desktop/mobile UI

## Important functionality notes
This deployable version performs **local PDF text extraction** and retrieves scholarly metadata from Crossref when available. It does **not** include a hosted LLM, account authentication, cloud database, secure file storage, OCR for scanned PDFs, or a verified journal impact-factor provider. Analysis sections are generated as structured notes from extracted text with clear limitations; no API keys are exposed in the browser. Browser-local library data is stored in localStorage on the current device/browser only.

For genuine AI analysis, cloud sync, user accounts, OCR, and secure persistence, connect a server-side API and database before using it for confidential or unpublished research.

## Run locally
1. Install Node.js 20 or newer.
2. Extract the ZIP.
3. Open a terminal in this folder.
4. Run `npm install`
5. Run `npm run dev`

## Deploy to Vercel
1. Extract this ZIP on your computer.
2. Open Vercel and choose **Add New → Project**.
3. Import the project from a Git repository, or use Vercel's supported deployment flow after uploading the extracted project to a Git provider.
4. Set Framework Preset to **Vite**.
5. Build command: `npm run build`
6. Output directory: `dist`
7. No environment variables are required for the included features.
8. Deploy.

Vercel does not deploy a ZIP by simply hosting it as a downloadable file; upload the extracted project through a Git repository or the Vercel CLI.

## Scientific reliability
- Crossref metadata may be incomplete; check it against the publisher/PubMed.
- Journal impact factor and quartile are labelled as not verified unless sourced from an authoritative database.
- PDF text extraction cannot recover text from image-only/scanned pages without OCR.
- Always verify extracted protocols against the original paper and laboratory SOPs.
