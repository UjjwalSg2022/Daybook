const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Task = require('../models/Task');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

function isAdmin(user) {
  return user.role === 'admin' || user.isSuperAdmin === true;
}

function isOverdue(task) {
  return task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
}

function getPeriodRange(period) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (period === 'month' ? 30 : 7));
  return { start, end };
}

function friendlyDate(date, includeTime = false) {
  const d = new Date(date);
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);

  const timeStr = includeTime
    ? ' at ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  if (diffDays === 0) return 'Today' + timeStr;
  if (diffDays === -1) return 'Yesterday' + timeStr;
  if (diffDays === 1) return 'Tomorrow' + timeStr;

  return (
    d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) +
    timeStr
  );
}

router.get('/', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user) && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can export reports' });
    }

    const format = req.query.format === 'excel' ? 'excel' : 'pdf';
    const period = req.query.period === 'month' ? 'month' : 'week';
    const { start, end } = getPeriodRange(period);

    const employees = isAdmin(req.user)
      ? await User.find({ role: 'employee' }).select('name email')
      : await User.find({ managerId: req.user._id }).select('name email');

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No employees to report on' });
    }

    const employeeIds = employees.map((e) => e._id);
    const tasks = await Task.find({
      assignedTo: { $in: employeeIds },
      createdAt: { $gte: start, $lte: end },
    }).sort({ assignedTo: 1, createdAt: 1 });

    const tasksByEmployee = {};
    for (const emp of employees) tasksByEmployee[String(emp._id)] = [];
    for (const task of tasks) {
      const key = String(task.assignedTo);
      if (tasksByEmployee[key]) tasksByEmployee[key].push(task);
    }

    const periodLabel = period === 'month' ? 'Past 30 days' : 'Past 7 days';
    const filenameBase = `daybook-report-${period}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      await sendExcelReport(res, employees, tasksByEmployee, periodLabel, filenameBase);
    } else {
      sendPdfReport(res, employees, tasksByEmployee, periodLabel, filenameBase);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate report' });
  }
});

const COLORS = {
  ink: '#1E2A38',
  inkSoft: '#4B5A6B',
  paper: '#F2EFE4',
  rule: '#C9C2AC',
  ledger: '#2F5D50',
  ledgerDark: '#22453C',
  stamp: '#9B3B3B',
  stampBg: '#F3E1E1',
  gold: '#B08D57',
  rowAlt: '#F7F5EE',
};

const MARGIN = 40;
const COLS = [
  { key: 'title', label: 'Title', width: 125 },
  { key: 'description', label: 'Description', width: 140 },
  { key: 'status', label: 'Status', width: 65 },
  { key: 'due', label: 'Due', width: 95 },
  { key: 'created', label: 'Created', width: 90 },
];

function drawPageHeader(doc, periodLabel) {
  const pageWidth = doc.page.width;

  doc.rect(0, 0, pageWidth, 88).fill(COLORS.ink);
  doc
    .fillColor(COLORS.paper)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('Daybook', MARGIN, 26);
  doc
    .fillColor(COLORS.rule)
    .font('Helvetica')
    .fontSize(10)
    .text('MAC International — Team Report', MARGIN, 54);

  doc
    .fillColor(COLORS.rule)
    .fontSize(9)
    .text(periodLabel, pageWidth - MARGIN - 200, 30, { width: 200, align: 'right' })
    .text(`Generated ${friendlyDate(new Date(), true)}`, pageWidth - MARGIN - 200, 44, {
      width: 200,
      align: 'right',
    });

  doc.fillColor(COLORS.ink);
}

function drawFooter(doc, pageNum) {
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  const y = doc.page.height - 30;
  doc
    .fontSize(8)
    .fillColor(COLORS.inkSoft)
    .text('Daybook — MAC International', MARGIN, y, { continued: true })
    .text(`Page ${pageNum}`, { align: 'right' });

  doc.page.margins.bottom = originalBottomMargin;
}

function drawTableHeaderRow(doc, y) {
  const rowHeight = 20;
  doc.rect(MARGIN, y, sumColWidths(), rowHeight).fill(COLORS.ledgerDark);

  let x = MARGIN;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.paper);
  COLS.forEach((col) => {
    doc.text(col.label.toUpperCase(), x + 6, y + 6, { width: col.width - 10 });
    x += col.width;
  });
  doc.fillColor(COLORS.ink);
  return y + rowHeight;
}

function sumColWidths() {
  return COLS.reduce((sum, c) => sum + c.width, 0);
}

function sendPdfReport(res, employees, tasksByEmployee, periodLabel, filenameBase) {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
  doc.pipe(res);

  const bottomLimit = doc.page.height - 60;
  drawPageHeader(doc, periodLabel);
  let y = 110;

  function ensureSpace(needed, redrawTableHeader) {
    if (y + needed > bottomLimit) {
      doc.addPage();
      drawPageHeader(doc, periodLabel);
      y = 110;
      if (redrawTableHeader) y = drawTableHeaderRow(doc, y);
    }
  }

  employees.forEach((emp, idx) => {
    const tasks = tasksByEmployee[String(emp._id)] || [];
    const counts = {
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter(isOverdue).length,
    };

    ensureSpace(70, false);
    if (idx > 0) y += 10;

    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.ink).text(emp.name, MARGIN, y);
    y += 16;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.inkSoft).text(emp.email, MARGIN, y);
    y += 16;

    let sx = MARGIN;
    const summaryParts = [
      { label: `Pending ${counts.pending}`, color: COLORS.inkSoft },
      { label: `In progress ${counts.in_progress}`, color: COLORS.gold },
      { label: `Done ${counts.done}`, color: COLORS.ledger },
      { label: `Overdue ${counts.overdue}`, color: counts.overdue > 0 ? COLORS.stamp : COLORS.inkSoft },
    ];
    doc.font('Helvetica-Bold').fontSize(9);
    summaryParts.forEach((part) => {
      doc.fillColor(part.color).text(part.label, sx, y, { continued: false });
      sx += doc.widthOfString(part.label) + 18;
    });
    y += 20;

    if (tasks.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.inkSoft).text('No tasks in this period.', MARGIN, y);
      y += 20;
      return;
    }

    ensureSpace(20, false);
    y = drawTableHeaderRow(doc, y);

    const titleColWidth = COLS.find((c) => c.key === 'title').width - 10;
    const descColWidth = COLS.find((c) => c.key === 'description').width - 10;

    tasks.forEach((t, rowIdx) => {
      const cells = {
        title: t.title,
        description: t.description ? t.description : '—',
        status: t.status.replace('_', ' '),
        due: t.dueDate ? friendlyDate(t.dueDate) : '—',
        created: friendlyDate(t.createdAt),
      };

      doc.font('Helvetica').fontSize(8.5);
      const titleHeight = doc.heightOfString(cells.title, { width: titleColWidth });
      const descHeight = doc.heightOfString(cells.description, { width: descColWidth });
      const rowHeight = Math.max(20, titleHeight + 10, descHeight + 10);

      ensureSpace(rowHeight, true);

      const overdue = isOverdue(t);
      const rowBg = overdue ? COLORS.stampBg : rowIdx % 2 === 1 ? COLORS.rowAlt : COLORS.paper;
      doc.rect(MARGIN, y, sumColWidths(), rowHeight).fill(rowBg);

      let x = MARGIN;
      doc.font('Helvetica').fontSize(8.5);
      COLS.forEach((col) => {
        const isDueCol = col.key === 'due';
        const wraps = col.key === 'title' || col.key === 'description';
        doc.fillColor(overdue && isDueCol ? COLORS.stamp : COLORS.ink);
        if (overdue && isDueCol) doc.font('Helvetica-Bold');
        doc.text(
          String(cells[col.key]),
          x + 6,
          y + 6,
          wraps ? { width: col.width - 10 } : { width: col.width - 10, height: 11, ellipsis: true }
        );
        doc.font('Helvetica');
        x += col.width;
      });

      y += rowHeight;
    });

    y += 12;
  });

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    drawFooter(doc, i + 1);
  }

  doc.end();
}

async function sendExcelReport(res, employees, tasksByEmployee, periodLabel, filenameBase) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Daybook';

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Employee', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Pending', key: 'pending', width: 10 },
    { header: 'In Progress', key: 'in_progress', width: 12 },
    { header: 'Done', key: 'done', width: 10 },
    { header: 'Overdue', key: 'overdue', width: 10 },
  ];
  summarySheet.getRow(1).font = { bold: true };

  employees.forEach((emp) => {
    const tasks = tasksByEmployee[String(emp._id)] || [];
    summarySheet.addRow({
      name: emp.name,
      email: emp.email,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter(isOverdue).length,
    });
  });

  const tasksSheet = workbook.addWorksheet('Tasks');
  tasksSheet.columns = [
    { header: 'Employee', key: 'employee', width: 20 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Due Date', key: 'dueDate', width: 14 },
    { header: 'Overdue', key: 'overdue', width: 10 },
    { header: 'Created', key: 'createdAt', width: 14 },
  ];
  tasksSheet.getRow(1).font = { bold: true };

  employees.forEach((emp) => {
    const tasks = tasksByEmployee[String(emp._id)] || [];
    tasks.forEach((t) => {
      tasksSheet.addRow({
        employee: emp.name,
        title: t.title,
        type: t.type,
        status: t.status.replace('_', ' '),
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
        overdue: isOverdue(t) ? 'Yes' : 'No',
        createdAt: new Date(t.createdAt).toLocaleDateString(),
      });
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = router;