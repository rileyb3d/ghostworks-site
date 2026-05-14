import PDFDocument from "pdfkit";
import type { Quote } from "@/lib/quotes";
import { QUOTE_TERMS } from "@/lib/quote-terms";

// Server-only PDF renderer using pdfkit. Pure Node, no JSX, no bundler
// symlink shenanigans. Layout aims for "premium minimal": Helvetica
// throughout, tight typography, single accent (black on white) so the
// PDF prints cleanly anywhere.

export type StudioInfo = {
  name: string;
  tagline: string;
  addressLines: string[];
  email: string;
  website?: string;
};

// Studio metadata is hardcoded here — it's company facts, not config.
// Update this block to change how the studio appears on every quote PDF.
export function defaultStudio(): StudioInfo {
  return {
    name: "Ghostworks",
    tagline: "Creative studio",
    addressLines: [],
    email: "admin@ghostworks3d.com",
    website: process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, ""),
  };
}

// People authorized to sign quotes on behalf of the studio. Both names
// get a signature line on every PDF.
const GHOSTWORKS_SIGNERS = ["Michael Ridolfi", "Riley Brown"] as const;

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
      drawSignatures(doc, quote);

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

  // Header row: wordmark left, meta block right.
  const topY = doc.y;
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#000")
    .text("GHOSTWORKS", leftX(doc), topY, { characterSpacing: 4 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(TEXT_MUTED)
    .text(studio.tagline, leftX(doc), doc.y + 4);

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

function drawSignatures(doc: PDFKit.PDFDocument, quote: Quote) {
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
    .text("ACCEPTED AND AGREED", leftX(doc), labelY, { characterSpacing: 1.2 });

  const blockTop = labelY + 22;
  const colGap = 32;
  const colW = (pageWidth(doc) - colGap) / 2;
  const leftCol = leftX(doc);
  const rightCol = leftCol + colW + colGap;

  doc
    .fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("For Ghostworks", leftCol, blockTop, { width: colW });

  const clientLabel = quote.client.business ?? quote.client.name;
  doc
    .fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`For ${clientLabel}`, rightCol, blockTop, { width: colW });

  // Ghostworks signers stack vertically; client gets a single block
  // aligned to the top of the right column.
  const ROW_HEIGHT = 70;
  GHOSTWORKS_SIGNERS.forEach((name, idx) => {
    drawSignerBlock(
      doc,
      leftCol,
      blockTop + 22 + idx * ROW_HEIGHT,
      colW,
      { fixedName: name },
    );
  });
  drawSignerBlock(doc, rightCol, blockTop + 22, colW, {
    printNamePlaceholder: true,
  });

  // Leave the caret after the longer of the two columns so anything we
  // add later (we don't, currently) doesn't collide.
  doc.y = blockTop + 22 + GHOSTWORKS_SIGNERS.length * ROW_HEIGHT;
}

function drawSignerBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  opts: { fixedName?: string; printNamePlaceholder?: boolean },
) {
  const sigLineY = y + 24;
  doc
    .save()
    .moveTo(x, sigLineY)
    .lineTo(x + width, sigLineY)
    .lineWidth(0.5)
    .strokeColor("#000")
    .stroke()
    .restore();

  if (opts.fixedName) {
    doc
      .fillColor(TEXT_DARK)
      .font("Helvetica")
      .fontSize(9)
      .text(opts.fixedName, x, sigLineY + 4, { width });
  } else if (opts.printNamePlaceholder) {
    doc
      .fillColor(TEXT_MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text("Print name", x, sigLineY + 4, { width });
  }

  const dateLineY = sigLineY + 26;
  const dateWidth = width * 0.5;
  doc
    .save()
    .moveTo(x, dateLineY)
    .lineTo(x + dateWidth, dateLineY)
    .lineWidth(0.5)
    .strokeColor("#000")
    .stroke()
    .restore();
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text("Date", x, dateLineY + 4, { width: dateWidth });
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  quote: Quote,
  studio: StudioInfo,
  page: number,
  total: number,
) {
  const y = doc.page.height - doc.page.margins.bottom + 18;
  doc
    .save()
    .moveTo(leftX(doc), y)
    .lineTo(rightX(doc), y)
    .lineWidth(0.5)
    .strokeColor(TEXT_RULE)
    .stroke()
    .restore();
  doc
    .fillColor(TEXT_FAINT)
    .font("Helvetica")
    .fontSize(8);
  doc.text(`${studio.name} · ${studio.email}`, leftX(doc), y + 6, {
    width: pageWidth(doc) / 2,
  });
  doc.text(
    `${quote.number} · Page ${page} / ${total}`,
    leftX(doc),
    y + 6,
    {
      width: pageWidth(doc),
      align: "right",
    },
  );
}
