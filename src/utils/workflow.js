export const APPROVAL_STATES = ['待提交', '处理中', '已完成', '已作废']

export function sheetProcessStatus (sheet) {
  if (['已作废', '已终止'].includes(sheet.status)) return '已作废'
  if (sheet.status === '已生效') return '已完成'
  return sheet.status === '审核中' ? '处理中' : '待提交'
}

export function closeApprovalStatus (record) {
  const request = record.closeRequest
  if (request && ['已作废', '已终止'].includes(request.status)) return '已作废'
  if (record.status === '已销项' || (request && request.status === '已通过')) return '已完成'
  return request && request.status === '审批中' ? '处理中' : '待提交'
}

export function suggestionApprovalStatus (suggestion) {
  if (['已作废', '已终止'].includes(suggestion.status)) return '已作废'
  if (suggestion.status === '已归档') return '已完成'
  return suggestion.status === '已退回' ? '待提交' : '处理中'
}

export function relationStatus (relation) {
  return !relation.archived && relation.configStatus === '启用' ? '启用' : '停用'
}

export function workDisplayCode (work) {
  return `${work.sheetId}-${String(work.seq).padStart(2, '0')}`
}
