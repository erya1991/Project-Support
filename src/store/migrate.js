import { buildSeed, SCHEMA_VERSION } from '../data/seed'

// V1.6 使用新的演示样例。仅在首次载入旧版缓存时替换本模块的数据。
export function migrateDb (existing) {
  if (existing && existing.schemaVersion > SCHEMA_VERSION) throw new Error('浏览器数据版本高于当前应用版本')
  return existing && existing.schemaVersion === SCHEMA_VERSION ? existing : buildSeed()
}
