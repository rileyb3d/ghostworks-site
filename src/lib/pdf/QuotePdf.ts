import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Quote } from "@/lib/quotes";
import { QUOTE_TERMS } from "@/lib/quote-terms";

// Server-only PDF renderer using pdfkit. Pure Node, no JSX, no bundler
// symlink shenanigans. Layout aims for "premium minimal": Helvetica
// throughout, tight typography, single accent (black on white) so the
// PDF prints cleanly anywhere.

export type StudioInfo = {
  // Legal entity name. Appears in the From block, the signature block,
  // and the footer. The big "GHOSTWORKS" wordmark at the top of the
  // PDF is hardcoded separately — that's the brand mark, not the legal
  // name.
  name: string;
  addressLines: string[];
  email: string;
  website?: string;
};

// Studio metadata is hardcoded here — it's company facts, not config.
// Update this block to change how the studio appears on every quote PDF.
export function defaultStudio(): StudioInfo {
  return {
    name: "GHOSTWORKS MEDIA LLC",
    addressLines: [],
    email: "admin@ghostworks3d.com",
    website: process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, ""),
  };
}

// Pre-rendered signatures for the studio's authorized signers. Read once
// at module load — both files ship inside the function bundle via
// `outputFileTracingIncludes` (see next.config.ts). If a file is missing
// we silently fall back to no image, and the signature line just renders
// empty. Better a blank line than a crash mid-PDF.
const SIGNATURE_DIR = path.join(process.cwd(), "src", "lib", "pdf", "signatures");
function readSignature(file: string): Buffer | undefined {
  try {
    return fs.readFileSync(path.join(SIGNATURE_DIR, file));
  } catch {
    return undefined;
  }
}

type GhostworksSigner = {
  name: string;
  signature?: Buffer;
  // Per-signer tweaks so each scanned signature reads at a comparable
  // visual weight on the page. `heightScale` multiplies the default
  // signature height; `baselineOffset` shifts the image down (positive)
  // or up (negative) in PDF points relative to the signature line.
  heightScale?: number;
  baselineOffset?: number;
};

// People authorized to sign quotes on behalf of the studio. Both names
// get a signature line on every PDF, pre-signed and pre-dated. Mike's
// scan has more vertical whitespace inside the ink (dots, light
// descenders) so we bump its size and drop it slightly so it sits on
// the line with the same weight as Riley's.
const GHOSTWORKS_SIGNERS: readonly GhostworksSigner[] = [
  {
    name: "Michael Ridolfi",
    signature: readSignature("michael.png"),
    heightScale: 1.35,
    baselineOffset: 16,
  },
  {
    name: "Riley Brown",
    signature: readSignature("riley.png"),
  },
];

const PAGE = {
  size: "LETTER" as const,
  margin: 56,
};
const TEXT_DARK = "#1a1a1a";
const TEXT_MUTED = "#666666";
const TEXT_RULE = "#d4d4d4";
const TEXT_FAINT = "#888888";

function formatMoney(minor: number, currency: string): string {
  const divisor = currency === "jpy" ? 1 : 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(minor / divisor);
  } catch {
    return `${(minor / divisor).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

export async function renderQuotePdf(quote: Quote): Promise<Buffer> {
  const studio = defaultStudio();
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: PAGE.size,
        margin: PAGE.margin,
        info: {
          Title: `${quote.number} — ${quote.client.name}`,
          Author: studio.name,
          Subject: quote.project.name,
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("error", reject);
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      drawQuotePage(doc, quote, studio);
      doc.addPage({ size: PAGE.size, margin: PAGE.margin });
      drawTermsPage(doc, quote);
      drawSignatures(doc, quote, studio);

      // pdfkit doesn't natively repeat headers/footers, so we walk every
      // page after rendering and add the footer band.
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, quote, studio, i - range.start + 1, range.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function pageWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function leftX(doc: PDFKit.PDFDocument): number {
  return doc.page.margins.left;
}

function rightX(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.right;
}

function rule(doc: PDFKit.PDFDocument, y: number) {
  doc
    .save()
    .moveTo(leftX(doc), y)
    .lineTo(rightX(doc), y)
    .lineWidth(0.5)
    .strokeColor(TEXT_RULE)
    .stroke()
    .restore();
}

function metaLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number) {
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(label.toUpperCase(), x, y, {
      characterSpacing: 1.2,
      width: rightX(doc) - x,
      align: "right",
    });
}

function metaValue(doc: PDFKit.PDFDocument, value: string, x: number, y: number) {
  doc
    .fillColor(TEXT_DARK)
    .font("Helvetica")
    .fontSize(10)
    .text(value, x, y, {
      width: rightX(doc) - x,
      align: "right",
    });
}

function sectionLabel(doc: PDFKit.PDFDocument, label: string) {
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(label.toUpperCase(), { characterSpacing: 1.2 });
  doc.moveDown(0.3);
}

function drawQuotePage(
  doc: PDFKit.PDFDocument,
  quote: Quote,
  studio: StudioInfo,
) {
  doc.fillColor(TEXT_DARK);

  // Header row: wordmark left, meta block right. Wordmark is the brand,
  // not the legal name — keep it as "GHOSTWORKS" no matter what
  // studio.name is.
  const topY = doc.y;
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#000")
    .text("GHOSTWORKS", leftX(doc), topY, { characterSpacing: 4 });

  // Right-aligned meta block, positioned by absolute y.
  const metaStartY = topY;
  const colW = 200;
  const colX = rightX(doc) - colW;
  let mY = metaStartY;
  metaLabel(doc, "Quote", colX, mY);
  mY += 10;
  metaValue(doc, quote.number, colX, mY);
  mY += 18;
  metaLabel(doc, "Issued", colX, mY);
  mY += 10;
  metaValue(doc, formatDate(quote.createdAt), colX, mY);
  mY += 18;
  metaLabel(doc, "Valid until", colX, mY);
  mY += 10;
  metaValue(doc, formatDate(quote.validUntil), colX, mY);
  mY += 18;

  // Advance below whichever column ended lower.
  doc.y = Math.max(doc.y, mY) + 24;

  // Two-column parties block.
  const partiesY = doc.y;
  const colWidth = (pageWidth(doc) - 24) / 2;
  const leftColX = leftX(doc);
  const rightColX = leftColX + colWidth + 24;

  doc.x = leftColX;
  doc.y = partiesY;
  sectionLabel(doc, "From");
  doc.fillColor(TEXT_DARK).font("Helvetica-Bold").fontSize(10).text(studio.name);
  doc.font("Helvetica");
  for (const line of studio.addressLines) {
    doc.text(line);
  }
  doc.text(studio.email);
  if (studio.website) doc.text(studio.website);
  const fromBottom = doc.y;

  doc.x = rightColX;
  doc.y = partiesY;
  sectionLabel(doc, "To");
  doc
    .fillColor(TEXT_DARK)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(quote.client.name, { width: colWidth });
  doc.font("Helvetica");
  if (quote.client.business) {
    doc.text(quote.client.business, { width: colWidth });
  }
  doc.text(quote.client.email, { width: colWidth });
  const toBottom = doc.y;

  doc.x = leftX(doc);
  doc.y = Math.max(fromBottom, toBottom) + 16;
  rule(doc, doc.y);
  doc.moveDown(1);

  // Project.
  sectionLabel(doc, "Project");
  doc
    .fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(quote.project.name);
  doc.moveDown(0.4);
  doc
    .fillColor("#333333")
    .font("Helvetica")
    .fontSize(10)
    .text(quote.project.summary, { width: pageWidth(doc), lineGap: 2 });

  doc.moveDown(1.2);

  // Line items table.
  drawLineItems(doc, quote);

  // Totals (right-aligned block).
  doc.moveDown(1);
  drawTotals(doc, quote);

  // Notes (optional).
  if (quote.notes) {
    doc.moveDown(1.5);
    sectionLabel(doc, "Notes");
    doc
      .fillColor("#333")
      .font("Helvetica")
      .fontSize(10)
      .text(quote.notes, { width: pageWidth(doc), lineGap: 2 });
  }
}

function drawLineItems(doc: PDFKit.PDFDocument, quote: Quote) {
  const cols = computeColumns(doc);
  const headerY = doc.y;

  doc
    .fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("DESCRIPTION", cols.desc.x, headerY, {
      width: cols.desc.w,
      characterSpacing: 1,
    });
  doc.text("QTY", cols.qty.x, headerY, {
    width: cols.qty.w,
    align: "right",
    characterSpacing: 1,
  });
  doc.text("UNIT", cols.unit.x, headerY, {
    width: cols.unit.w,
    align: "right",
    characterSpacing: 1,
  });
  doc.text("AMOUNT", cols.amount.x, headerY, {
    width: cols.amount.w,
    align: "right",
    characterSpacing: 1,
  });

  doc.y = headerY + 16;
  doc
    .save()
    .moveTo(leftX(doc), doc.y)
    .lineTo(rightX(doc), doc.y)
    .lineWidth(0.75)
    .strokeColor("#000")
    .stroke()
    .restore();
  doc.y += 6;

  doc.font("Helvetica").fillColor(TEXT_DARK).fontSize(10);

  for (const li of quote.lineItems) {
    const rowY = doc.y;
    const descHeight = doc.heightOfString(li.description, {
      width: cols.desc.w,
    });
    doc.text(li.description, cols.desc.x, rowY, { width: cols.desc.w });
    doc.text(`${li.quantity}`, cols.qty.x, rowY, {
      width: cols.qty.w,
      align: "right",
    });
    doc.text(
      formatMoney(li.unitAmount, quote.currency),
      cols.unit.x,
      rowY,
      { width: cols.unit.w, align: "right" },
    );
    doc.text(
      formatMoney(
        Math.round(li.quantity * li.unitAmount),
        quote.currency,
      ),
      cols.amount.x,
      rowY,
      { width: cols.amount.w, align: "right" },
    );
    doc.y = rowY + Math.max(descHeight, 12) + 6;
    doc
      .save()
      .moveTo(leftX(doc), doc.y)
      .lineTo(rightX(doc), doc.y)
      .lineWidth(0.5)
      .strokeColor("#e4e4e4")
      .stroke()
      .restore();
    doc.y += 6;
  }
}

function computeColumns(doc: PDFKit.PDFDocument) {
  const total = pageWidth(doc);
  // Same ratio as the on-screen form: 4 / 1 / 1.4 / 1.4 = 7.8
  const u = total / 7.8;
  const descW = u * 4;
  const qtyW = u * 1;
  const unitW = u * 1.4;
  const amountW = u * 1.4;
  const x0 = leftX(doc);
  return {
    desc: { x: x0, w: descW - 8 },
    qty: { x: x0 + descW, w: qtyW - 8 },
    unit: { x: x0 + descW + qtyW, w: unitW - 8 },
    amount: { x: x0 + descW + qtyW + unitW, w: amountW },
  };
}

function drawTotals(doc: PDFKit.PDFDocument, quote: Quote) {
  const blockW = pageWidth(doc) * 0.45;
  const x = rightX(doc) - blockW;

  function row(label: string, value: string, opts?: { grand?: boolean }) {
    const y = doc.y;
    const grand = !!opts?.grand;
    doc
      .fillColor(grand ? "#000" : TEXT_MUTED)
      .font(grand ? "Helvetica-Bold" : "Helvetica")
      .fontSize(grand ? 11 : 10)
      .text(label, x, y, { width: blockW / 2 });
    doc
      .fillColor(grand ? "#000" : TEXT_DARK)
      .font(grand ? "Helvetica-Bold" : "Helvetica")
      .fontSize(grand ? 12 : 10)
      .text(value, x + blockW / 2, y, {
        width: blockW / 2,
        align: "right",
      });
    doc.y = y + (grand ? 18 : 16);
  }

  row("Subtotal", formatMoney(quote.subtotal, quote.currency));
  if (quote.discount && quote.discount > 0) {
    row("Discount", `−${formatMoney(quote.discount, quote.currency)}`);
  }
  if (quote.tax && quote.tax > 0) {
    row("Tax", formatMoney(quote.tax, quote.currency));
  }
  doc
    .save()
    .moveTo(x, doc.y)
    .lineTo(x + blockW, doc.y)
    .lineWidth(0.75)
    .strokeColor("#000")
    .stroke()
    .restore();
  doc.y += 6;
  row("Total", formatMoney(quote.total, quote.currency), { grand: true });
}

function drawTermsPage(doc: PDFKit.PDFDocument, quote: Quote) {
  const topY = doc.y;
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#000")
    .text("GHOSTWORKS", leftX(doc), topY, { characterSpacing: 4 });

  const colW = 200;
  const colX = rightX(doc) - colW;
  metaLabel(doc, "Standard terms", colX, topY);
  metaValue(doc, quote.termsVersion, colX, topY + 10);

  doc.x = leftX(doc);
  doc.y = topY + 60;
  sectionLabel(doc, "Project terms");
  doc.moveDown(0.4);

  for (const t of QUOTE_TERMS) {
    doc
      .fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(t.heading);
    doc.moveDown(0.15);
    doc
      .fillColor("#333")
      .font("Helvetica")
      .fontSize(9)
      .text(t.body, { width: pageWidth(doc), lineGap: 2 });
    doc.moveDown(0.8);
  }
}

function drawSignatures(
  doc: PDFKit.PDFDocument,
  quote: Quote,
  studio: StudioInfo,
) {
  // Reserve enough room for the heading + two stacked signature lines on
  // the Ghostworks side. If we don't have it, push to a fresh page so the
  // block never splits across page boundaries.
  const NEEDED = 220;
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 36;
  if (bottomLimit - doc.y < NEEDED) {
    doc.addPage({ size: PAGE.size, margin: PAGE.margin });
  } else {
    doc.moveDown(1.5);
  }

  const labelY = doc.y;
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("ACCEPTED AND AGREED", leftX(doc), labelY, {
      characterSpacing: 1.2,
      lineBreak: false,
    });

  const blockTop = labelY + 22;
  const colGap = 32;
  const colW = (pageWidth(doc) - colGap) / 2;
  const leftCol = leftX(doc);
  const rightCol = leftCol + colW + colGap;

  doc
    .fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`For ${studio.name}`, leftCol, blockTop, {
      width: colW,
      lineBreak: false,
    });

  const clientLabel = quote.client.business ?? quote.client.name;
  doc
    .fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`For ${clientLabel}`, rightCol, blockTop, {
      width: colW,
      lineBreak: false,
    });

  // Each signer occupies a fixed "block" — Ghostworks signers are 2 rows
  // (signature + date) and the client signer is 3 rows (signature + print
  // name + date). Using the same ROW_HEIGHT lets the date lines line up
  // across columns even though the client block is taller.
  const ROW_HEIGHT = 38;
  const blockHeight2Row = ROW_HEIGHT * 2;
  const issuedDate = formatDate(quote.createdAt);
  GHOSTWORKS_SIGNERS.forEach((signer, idx) => {
    drawSignerBlock(
      doc,
      leftCol,
      blockTop + 24 + idx * blockHeight2Row,
      colW,
      {
        fixedName: signer.name,
        signatureImage: signer.signature,
        signatureHeightScale: signer.heightScale,
        signatureBaselineOffset: signer.baselineOffset,
        fixedDate: issuedDate,
        rowHeight: ROW_HEIGHT,
      },
    );
  });
  drawSignerBlock(doc, rightCol, blockTop + 24, colW, {
    rowHeight: ROW_HEIGHT,
  });

  const ghostworksHeight = GHOSTWORKS_SIGNERS.length * blockHeight2Row;
  const clientHeight = ROW_HEIGHT * 3;
  doc.y = blockTop + 24 + Math.max(ghostworksHeight, clientHeight);
}

// Render one signer's lines. Layout (top to bottom):
//   [signature line]   "Michael Ridolfi" (fixed) or "Signature" (label)
//   [print-name line]  "Print name"               (CLIENT ONLY)
//   [date line]        "Date" / pre-filled date
//
// For Ghostworks signers we additionally:
//   - overlay a pre-rendered signature image on the signature line
//   - write the issue date above the date line (instead of the label)
function drawSignerBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  opts: {
    fixedName?: string;
    signatureImage?: Buffer;
    signatureHeightScale?: number;
    signatureBaselineOffset?: number;
    fixedDate?: string;
    rowHeight: number;
  },
) {
  const r = opts.rowHeight;
  const labelGap = 4;

  // Row 1: signature line.
  const sigLineY = y + 20;
  drawHRule(doc, x, sigLineY, x + width);
  if (opts.fixedName) {
    // Pre-rendered signature scan resting on the line. Source PNGs are
    // trimmed to ink with transparent backgrounds, so they composite
    // cleanly over the line. Per-signer scale and baseline tweaks let
    // each scribble sit at the same visual weight even when the
    // underlying bounding boxes differ.
    const baseHeight = 36;
    const sigHeight = baseHeight * (opts.signatureHeightScale ?? 1);
    const baselineOffset = opts.signatureBaselineOffset ?? 0;
    if (opts.signatureImage) {
      const sigY = sigLineY - sigHeight + 4 + baselineOffset;
      try {
        doc.image(opts.signatureImage, x + 6, sigY, { height: sigHeight });
      } catch {
        // Bad image data — fall through, the printed name label below
        // still identifies who signed.
      }
    }
    // Printed name sits at the same Y for both signers so the two
    // labels line up across the column. Light overlap with the bottom
    // of a scaled-down signature is OK — they're thin descender strokes.
    doc
      .fillColor(TEXT_DARK)
      .font("Helvetica")
      .fontSize(9)
      .text(opts.fixedName, x, sigLineY + labelGap, {
        width,
        lineBreak: false,
      });
  } else {
    doc
      .fillColor(TEXT_MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text("Signature", x, sigLineY + labelGap, {
        width,
        lineBreak: false,
      });
  }

  // Row 2 (client only): print-name line.
  let rowsUsed = 1;
  if (!opts.fixedName) {
    const printLineY = y + r + 20;
    drawHRule(doc, x, printLineY, x + width);
    doc
      .fillColor(TEXT_MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text("Print name", x, printLineY + labelGap, {
        width,
        lineBreak: false,
      });
    rowsUsed = 2;
  }

  // Final row: date (half width).
  const dateLineY = y + r * rowsUsed + 20;
  const dateWidth = width * 0.5;
  drawHRule(doc, x, dateLineY, x + dateWidth);
  if (opts.fixedName && opts.fixedDate) {
    doc
      .fillColor(TEXT_DARK)
      .font("Helvetica")
      .fontSize(10)
      .text(opts.fixedDate, x + 2, dateLineY - 13, {
        width: dateWidth - 2,
        lineBreak: false,
      });
  } else {
    doc
      .fillColor(TEXT_MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text("Date", x, dateLineY + labelGap, {
        width: dateWidth,
        lineBreak: false,
      });
  }
}

function drawHRule(
  doc: PDFKit.PDFDocument,
  x1: number,
  y: number,
  x2: number,
) {
  doc
    .save()
    .moveTo(x1, y)
    .lineTo(x2, y)
    .lineWidth(0.5)
    .strokeColor("#000")
    .stroke()
    .restore();
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  quote: Quote,
  studio: StudioInfo,
  page: number,
  total: number,
) {
  // The footer text is drawn BELOW the page's bottom margin (in the
  // header/footer "zone"). Pdfkit's text() flushes the page when the
  // draw target is past the bottom margin — even with lineBreak:false —
  // which produced 2-3 phantom blank pages at the end. The canonical
  // workaround is to temporarily zero out the bottom margin so the
  // text() flow check stays satisfied, then restore it.
  const y = doc.page.height - doc.page.margins.bottom + 18;
  doc
    .save()
    .moveTo(leftX(doc), y)
    .lineTo(rightX(doc), y)
    .lineWidth(0.5)
    .strokeColor(TEXT_RULE)
    .stroke()
    .restore();

  const restoreMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  try {
    doc
      .fillColor(TEXT_FAINT)
      .font("Helvetica")
      .fontSize(8);
    doc.text(`${studio.name} · ${studio.email}`, leftX(doc), y + 6, {
      width: pageWidth(doc) / 2,
      lineBreak: false,
    });
    doc.text(
      `${quote.number} · Page ${page} / ${total}`,
      leftX(doc),
      y + 6,
      {
        width: pageWidth(doc),
        align: "right",
        lineBreak: false,
      },
    );
  } finally {
    doc.page.margins.bottom = restoreMargin;
  }
}
