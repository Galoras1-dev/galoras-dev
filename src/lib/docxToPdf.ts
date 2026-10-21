// Turn a Word (.docx) resume into a plain-text PDF in the browser, so the
// profile generator (which reads PDFs) can use it unchanged.
//
// Why here and not on the server: the generator edge function sends the file to
// the AI as a PDF document. Converting in the browser means nothing server-side
// has to change, and nothing new is installed — this uses the browser's own
// DecompressionStream to open the .docx (a zip) and writes a minimal PDF by hand.
//
// What survives: the words, paragraph by paragraph. Layout, tables and images
// don't, and the generator only needs the words. Old .doc files are not
// supported; the coach is asked to save as .docx or PDF instead.

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isDocx(file: File): boolean {
  return file.type === DOCX_MIME || /\.docx$/i.test(file.name);
}

// ── 1. Read word/document.xml out of the zip ─────────────────────────────────
async function readZipEntry(buf: ArrayBuffer, wanted: string): Promise<string> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // End of central directory record: signature 0x06054b50, within the last 64 KB.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("This doesn't look like a Word .docx file.");

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();

  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));

    if (name === wanted) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(start, start + compSize);
      if (method === 0) return dec.decode(data);
      if (method !== 8) throw new Error("Unsupported compression in this .docx.");
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error("Couldn't find the document text inside this .docx.");
}

// ── 2. Pull paragraphs of text out of the Word XML ───────────────────────────
function docxXmlToParagraphs(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paras = Array.from(doc.getElementsByTagNameNS(W, "p"));
  const out: string[] = [];
  for (const p of paras) {
    let text = "";
    const walk = (node: Node) => {
      node.childNodes.forEach(child => {
        if (child.nodeType !== 1) return;
        const el = child as Element;
        if (el.namespaceURI === W && el.localName === "t") text += el.textContent ?? "";
        else if (el.namespaceURI === W && el.localName === "tab") text += "    ";
        else if (el.namespaceURI === W && (el.localName === "br" || el.localName === "cr")) text += "\n";
        else if (!(el.namespaceURI === W && el.localName === "p")) walk(el);
      });
    };
    walk(p);
    out.push(text);
  }
  return out;
}

// ── 3. Write a minimal multi-page PDF (Helvetica, A4-ish Letter) ─────────────
function toWinAnsi(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, "?");
}

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(line: string, max: number): string[] {
  if (line.length <= max) return [line];
  const words = line.split(/(\s+)/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + w).length > max && cur.trim()) { out.push(cur.trimEnd()); cur = w.trimStart(); }
    else cur += w;
    while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
  }
  if (cur.trim()) out.push(cur.trimEnd());
  return out;
}

function buildPdf(paragraphs: string[]): Uint8Array {
  const lines: string[] = [];
  for (const para of paragraphs) {
    for (const raw of toWinAnsi(para).split("\n")) lines.push(...wrap(raw, 95));
  }
  const perPage = 60;
  const pages: string[][] = [];
  for (let i = 0; i < Math.max(lines.length, 1); i += perPage) pages.push(lines.slice(i, i + perPage));

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  const kids: string[] = [];
  pages.forEach((pageLines, i) => {
    const pageObj = 4 + i * 2;
    const contentObj = pageObj + 1;
    kids.push(`${pageObj} 0 R`);
    let stream = "BT /F1 10 Tf 12 TL 50 750 Td\n";
    for (const l of pageLines) stream += `(${escapePdf(l)}) Tj T*\n`;
    stream += "ET";
    objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`;
    objects[contentObj] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  // Every character is now in 0x00-0xFF, so one byte per character.
  const out = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) out[i] = pdf.charCodeAt(i) & 0xff;
  return out;
}

/** Convert a .docx File into a text-only PDF File with the same base name. */
export async function docxToPdf(file: File): Promise<File> {
  const xml = await readZipEntry(await file.arrayBuffer(), "word/document.xml");
  const paragraphs = docxXmlToParagraphs(xml);
  if (!paragraphs.some(p => p.trim())) throw new Error("This Word file has no readable text.");
  const bytes = buildPdf(paragraphs);
  const name = file.name.replace(/\.docx$/i, "") + ".pdf";
  return new File([bytes], name, { type: "application/pdf" });
}
