import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { describe, it } from 'node:test'
import { docxXmlToLines, extractResumeFileText, pdfItemsToLines, sniffResumeFile, type PdfTextItem } from './resumeFileText'
import { readResumeUpload } from './resumeUpload'

const encoder = new TextEncoder()
const loadPdfJs = () => import('pdfjs-dist/legacy/build/pdf.mjs')

/** A text run at 10pt where each character is 5pt wide, positioned like pdf.js reports it. */
const run = (str: string, x: number, y: number): PdfTextItem => ({ str, x, y, width: str.length * 5, height: 10 })

function zip(files: Record<string, string>): Uint8Array {
  const local: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const [name, contents] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(contents))
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(8, 8)
    header.writeUInt32LE(data.length, 18)
    header.writeUInt32LE(Buffer.byteLength(contents), 22)
    header.writeUInt16LE(Buffer.byteLength(name), 26)
    const record = Buffer.alloc(46)
    record.writeUInt32LE(0x02014b50, 0)
    record.writeUInt16LE(8, 10)
    record.writeUInt32LE(data.length, 20)
    record.writeUInt32LE(Buffer.byteLength(contents), 24)
    record.writeUInt16LE(Buffer.byteLength(name), 28)
    record.writeUInt32LE(offset, 42)
    local.push(header, Buffer.from(name), data)
    central.push(record, Buffer.from(name))
    offset += 30 + Buffer.byteLength(name) + data.length
  }
  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return new Uint8Array(Buffer.concat([...local, directory, end]))
}

function pdf(lines: ReadonlyArray<[x: number, y: number, text: string]>): Uint8Array {
  const content = lines.map(([x, y, text]) => `BT /F1 10 Tf ${x} ${y} Td (${text.replace(/[\\()]/g, '\\$&')}) Tj ET`).join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = objects.map((object, index) => {
    const offset = body.length
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
    return offset
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return encoder.encode(body)
}

const paragraph = (text: string, properties = '') => `<w:p><w:pPr>${properties}</w:pPr><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const documentXml = (body: string) => `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`

describe('resume file text', () => {
  it('routes files by content and explains formats it cannot read', () => {
    assert.equal(sniffResumeFile('resume.bin', encoder.encode('%PDF-1.7 ...')), 'pdf')
    assert.equal(sniffResumeFile('resume.txt', encoder.encode('  {"schemaVersion": 2}')), 'json')
    assert.equal(sniffResumeFile('resume.md', encoder.encode('# Jane Doe')), 'text')
    assert.throws(() => sniffResumeFile('old.doc', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1])), /\.doc files are not supported/)
    assert.throws(() => sniffResumeFile('resume.rtf', encoder.encode('{\\rtf1 hello}')), /Rich Text/)
    assert.throws(() => sniffResumeFile('photo.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0])), /not supported/)
  })

  it('keeps right-aligned dates on their line and rejoins a wrapped bullet', () => {
    assert.deepEqual(pdfItemsToLines([
      run('Senior Engineer', 40, 700), run('Jan 2020 – Present', 460, 700),
      run('•', 40, 686), run('Cut latency from 480 ms to', 54, 686),
      run('120 ms across the fleet', 54, 674),
      run('•', 40, 662), run('Mentored six engineers', 54, 662),
      run('Engineer', 40, 630),
    ]), ['Senior Engineer\tJan 2020 – Present', '• Cut latency from 480 ms to 120 ms across the fleet', '• Mentored six engineers', '', 'Engineer'])
  })

  it('marks an indented block as a list when the PDF has no bullet glyphs', () => {
    assert.deepEqual(pdfItemsToLines([
      run('Lumen Pay', 40, 700), run('Seattle, WA', 485, 700),
      run('Staff Engineer', 40, 688),
      run('Led the migration of the ledger service to a sharded cluster, which raised peak throughput', 70, 676),
      run('from 4,000 to 31,000 transactions per second.', 70, 664),
      run('Mentored 6 engineers.', 70, 652),
      run('Harbor Identity', 40, 640),
    ]), ['Lumen Pay\tSeattle, WA', 'Staff Engineer', '• Led the migration of the ledger service to a sharded cluster, which raised peak throughput from 4,000 to 31,000 transactions per second.', '• Mentored 6 engineers.', 'Harbor Identity'])
  })

  it('reads a sidebar layout one column at a time under its full-width header', () => {
    const sidebar = ['CONTACT', 'marcus@example.com', 'Oakland, CA', 'SKILLS', 'Triage', 'IV therapy', 'Trauma care', 'Epic EHR', 'LANGUAGES', 'English', 'Yoruba', 'Spanish']
    const main = ['PROFILE', 'Emergency nurse with eight years in trauma centers.', 'EXPERIENCE', 'Charge Nurse', 'Bayview Medical Center', 'Directed a 38-bed department.', 'Staff Nurse', 'St. Agnes Hospital', 'Precepted 9 new graduate nurses.', 'EDUCATION', 'Bachelor of Science in Nursing', 'San Francisco State University']
    const lines = pdfItemsToLines([
      run('MARCUS OYELARAN, Registered Nurse in the Emergency Department', 40, 740),
      ...sidebar.map((text, index) => run(text, 40, 700 - index * 12)),
      ...main.map((text, index) => run(text, 220, 700 - index * 12)),
    ])
    assert.deepEqual(lines, ['MARCUS OYELARAN, Registered Nurse in the Emergency Department', '', ...main, '', ...sidebar])
  })

  it('reads Word paragraphs, list items, tabs, table rows and escaped text', () => {
    const lines = docxXmlToLines(documentXml([
      paragraph('Ana Ortiz &amp; Co'),
      '<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="9360"/></w:tabs></w:pPr><w:r><w:t>Engineer</w:t><w:tab/><w:t>2019 – 2021</w:t></w:r></w:p>',
      paragraph('Built the token service', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'),
      '<w:p/>',
      `<w:tbl><w:tr><w:tc>${paragraph('B.S. Biology')}</w:tc><w:tc>${paragraph('2012')}</w:tc></w:tr></w:tbl>`,
      '<mc:AlternateContent><mc:Choice><w:p><w:r><w:t>Once</w:t></w:r></w:p></mc:Choice><mc:Fallback><w:p><w:r><w:t>Once</w:t></w:r></w:p></mc:Fallback></mc:AlternateContent>',
    ].join('')))
    assert.deepEqual(lines, ['Ana Ortiz & Co', 'Engineer\t2019 – 2021', '• Built the token service', '', 'B.S. Biology\t2012', 'Once'])
  })

  it('converts a Word file, including its page header and stored links, into a valid document', async () => {
    const bytes = zip({
      'word/document.xml': documentXml([paragraph('Experience'), paragraph('Staff Engineer\tMarch 2020 – Present'), paragraph('Lumen Pay, Seattle, WA'), paragraph('Raised throughput to 31,000 transactions per second', '<w:pStyle w:val="ListBullet"/>'), paragraph('Education'), paragraph('B.S. Computer Science, University of Washington, 2013')].join('')),
      'word/header1.xml': `<w:hdr xmlns:w="x">${paragraph('Priya Natarajan')}${paragraph('priya@example.com | 206-555-0188')}</w:hdr>`,
      'word/_rels/document.xml.rels': '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.linkedin.com/in/priyan" TargetMode="External"/></Relationships>',
    })
    const result = await readResumeUpload('resume.docx', bytes)
    assert.equal(result.format, 'docx')
    assert.equal(result.document.title, 'Priya Natarajan — from Word')
    assert.deepEqual([result.document.profile.email, result.document.profile.phone, result.document.profile.links[0]?.url], ['priya@example.com', '206-555-0188', 'https://www.linkedin.com/in/priyan'])
    const [role] = result.document.sections[0]!.entries
    assert.deepEqual([role!.title, role!.organization, role!.location, role!.startDate, role!.current, role!.highlights], ['Staff Engineer', 'Lumen Pay', 'Seattle, WA', 'March 2020', true, ['Raised throughput to 31,000 transactions per second']])
    assert.equal(result.document.sections[1]!.entries[0]!.organization, 'University of Washington')
  })

  it('refuses a zip that is not a Word document and a damaged archive', async () => {
    await assert.rejects(extractResumeFileText('sheet.xlsx', zip({ 'xl/workbook.xml': '<workbook/>' })), /not a Word \.docx document/)
    await assert.rejects(extractResumeFileText('resume.docx', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4])), /could not be opened as a Word document/)
  })

  it('converts a real PDF through pdf.js into a valid document', async () => {
    const bytes = pdf([
      [72, 740, 'Dana Whitfield'],
      [72, 726, 'dana@example.com | 415-555-0101 | Oakland, CA'],
      [72, 700, 'EXPERIENCE'],
      [72, 686, 'Line Cook'], [440, 686, 'May 2019 - Aug 2023'],
      [72, 674, 'The Copper Pot'],
      [72, 662, '- Ran the grill station for 180 covers a night'],
      [72, 636, 'SKILLS'],
      [72, 622, 'Knife work, Inventory, Food safety'],
    ])
    const result = await readResumeUpload('resume.pdf', bytes, loadPdfJs)
    assert.equal(result.format, 'pdf')
    assert.deepEqual([result.document.profile.name, result.document.profile.email, result.document.profile.phone, result.document.profile.location], ['Dana Whitfield', 'dana@example.com', '415-555-0101', 'Oakland, CA'])
    const [role] = result.document.sections[0]!.entries
    assert.deepEqual([role!.title, role!.organization, role!.startDate, role!.endDate, role!.highlights], ['Line Cook', 'The Copper Pot', 'May 2019', 'Aug 2023', ['Ran the grill station for 180 covers a night']])
    assert.deepEqual(result.document.sections[1]!.entries[0]!.keywords, ['Knife work', 'Inventory', 'Food safety'])
  })

  it('explains a PDF with no selectable text', async () => {
    await assert.rejects(readResumeUpload('scan.pdf', pdf([]), loadPdfJs), /no selectable text/)
  })

  it('reads Markdown text and still sends JSON to the JSON importer', async () => {
    const markdown = await readResumeUpload('resume.md', encoder.encode('# Jane Doe\n[jane@example.com](mailto:jane@example.com)\n\n## Experience\n**Nurse**, St. Agnes Hospital, 2016 – 2019\n- Precepted 9 new graduate nurses'))
    assert.equal(markdown.format, 'text')
    assert.equal(markdown.document.profile.name, 'Jane Doe')
    assert.equal(markdown.document.sections[0]!.entries[0]!.highlights[0], 'Precepted 9 new graduate nurses')
    const json = await readResumeUpload('resume.json', encoder.encode(JSON.stringify({ basics: { name: 'Taylor Kim' }, work: [{ name: 'Lab', position: 'Lead' }] })))
    assert.equal(json.format, 'json-resume')
    await assert.rejects(readResumeUpload('resume.json', encoder.encode('{"schemaVersion": 9}')), /Unsupported resume schema/)
  })
})
