const LEGACY_PREFIXES = { SL: 'ZDGZ', SQ: 'XMSQ', JY: 'ZDJY', ZHJY: 'ZDJY' }

function normalizeCode (code) {
  if (typeof code !== 'string') return code
  const match = code.match(/^(SL|SQ|JY|ZHJY)(\d{4})(\d+)$/)
  return match ? `${LEGACY_PREFIXES[match[1]]}${match[2]}${match[3].padStart(4, '0')}` : code
}

// 只更新业务编号及实际引用，执行记录、日报内部 ID 和历史原文保持原值。
export function normalizeBusinessCodes (db) {
  ;(db.sheets || []).forEach(sheet => { sheet.id = normalizeCode(sheet.id) })
  ;(db.works || []).forEach(work => { work.sheetId = normalizeCode(work.sheetId) })
  ;(db.appeals || []).forEach(appeal => { appeal.id = normalizeCode(appeal.id) })
  ;(db.suggestions || []).forEach(suggestion => { suggestion.id = normalizeCode(suggestion.id) })
  ;(db.dailyReports || []).forEach(report => {
    if (report.appealId) report.appealId = normalizeCode(report.appealId)
    if (Array.isArray(report.appealIds)) report.appealIds = report.appealIds.map(normalizeCode)
    ;(report.feedbacks || []).forEach(feedback => { feedback.appealId = normalizeCode(feedback.appealId) })
  })
  return db
}
