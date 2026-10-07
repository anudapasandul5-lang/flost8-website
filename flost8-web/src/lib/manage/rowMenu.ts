import { SHEET_URLS } from './labels'
import { canSetStatus } from './rowActions'
import { STATUS_LABEL, STATUS_ORDER } from './status'
import type { Inquiry, Manager, Status } from './types'

export interface MenuItem {
  label: string
  hint?: string
  href?: string
  external?: boolean
  onClick?: () => void
  /** A heading that opens a short list of choices in place (used for "Set status"). */
  group?: { label: string; onClick: () => void }[]
}

/** What a list row can do beyond its own buttons. Each callback is optional: the menu only offers what the screen wires up. */
export interface RowActions {
  onDuplicate?: (i: Inquiry) => void
  onSetStatus?: (i: Inquiry, status: Status) => void
}

/**
 * Menu entries every row shares: set status (website and app-added rows only), Edit in sheet (sheet rows instead of a status
 * picker, since the importer would overwrite an edit), and Duplicate.
 */
export function commonRowItems(i: Inquiry, me: Manager, managers: Manager[], actions: RowActions): MenuItem[] {
  const out: MenuItem[] = []
  if (actions.onSetStatus && canSetStatus(i, me)) {
    const set = actions.onSetStatus
    out.push({ label: 'Set status', hint: STATUS_LABEL[i.status], group: STATUS_ORDER.filter((s) => s !== i.status).map((s) => ({ label: STATUS_LABEL[s], onClick: () => set(i, s) })) })
  }
  const ownerName = managers.find((m) => m.id === i.owner_id)?.name
  const sheetUrl = ownerName ? SHEET_URLS[ownerName] : undefined
  if (i.source === 'sheet_import' && sheetUrl) out.push({ label: 'Edit in sheet', hint: 'opens workbook', href: sheetUrl, external: true })
  if (actions.onDuplicate) {
    const dup = actions.onDuplicate
    out.push({ label: 'Duplicate', hint: 'new date', onClick: () => dup(i) })
  }
  return out
}
