import { buildSeed, SCHEMA_VERSION } from '../data/seed'
import { PROJECT } from '../utils/serviceData'

function saveBackup (storage, key, version, raw) {
  const base = key + ':backup:' + (version == null ? 'unversioned' : 'v' + version)
  let backupKey = base
  for (let n = 2; ; n++) {
    const saved = storage.getItem(backupKey)
    if (saved === raw) return
    if (saved === null) break
    backupKey = base + ':' + n
  }
  storage.setItem(backupKey, raw)
}

// V1.4 已有明确主责部门与承办人、尚未申请销项的在办诉求可以原状态续办。
function migrateOpenAppeals (appeals, db) {
  const migrated = []
  for (const appeal of appeals) {
    if (!appeal || appeal.status !== '办理中' || appeal.closeRequest || typeof appeal.id !== 'string') continue
    const { id, title, desc, deptId, creatorId, personId, createdAt, progress = [], attachments = [] } = appeal
    const project = db.projects.find(p => p.id === appeal.projectId)
    if (!project || !db.departments.some(d => d.id === deptId) ||
      !db.people.some(p => p.id === creatorId) || !db.people.some(p => p.id === personId)) continue
    if (!Array.isArray(attachments) || !Array.isArray(progress) || progress.some(p => !p || typeof p !== 'object')) continue
    const history = progress.map(p => ({
      time: p.time, action: p.source, operator: p.operator, note: p.content, attachments: p.attachments
    }))
    migrated.push({
      id, title, desc, deptId, creatorId, createdAt, attachments, history, handlerId: personId, status: appeal.status,
      type: PROJECT, unitId: project.id, unitName: appeal.projectName || project.name, company: project.company,
      submittedAt: createdAt, completion: null, closedAt: ''
    })
  }
  return migrated
}

export function migrateDb (storage, key) {
  const raw = storage.getItem(key)
  let previous
  if (raw !== null) {
    try {
      previous = JSON.parse(raw)
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      // 无法解析的缓存也按无版本数据备份原文。
    }
    const version = previous?.schemaVersion
    if (version === SCHEMA_VERSION) return previous
    if (version > SCHEMA_VERSION) throw new Error('浏览器数据版本高于当前应用版本')
    saveBackup(storage, key, version, raw)
  }

  const db = buildSeed()
  if (previous?.schemaVersion === 8 && Array.isArray(previous.appeals)) {
    db.appeals = migrateOpenAppeals(previous.appeals, db)
  }
  const updated = JSON.stringify(db)
  // 生成样例期间其他标签页可能已完成升级并开始录入。
  if (storage.getItem(key) !== raw) return migrateDb(storage, key)
  storage.setItem(key, updated)
  return db
}
