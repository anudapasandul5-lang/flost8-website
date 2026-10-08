import { useCallback, useEffect, useState } from 'react'
import { normaliseWhatsapp } from '../../lib/manage/nudge'
import { fetchManagerWhatsapps, setManagerWhatsapp } from '../../lib/manage/nudgeApi'

/** Owner-only numbers. Any failure to load just means "no numbers yet": the Nudge button stays hidden and Add shows instead. */
export function useManagerWhatsapps(enabled: boolean) {
  const [numbers, setNumbers] = useState<ReadonlyMap<string, string>>(new Map())
  useEffect(() => {
    if (!enabled) return
    let live = true
    fetchManagerWhatsapps().then(
      (m) => live && setNumbers(m),
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [enabled])
  /** A typed number, or null to remove the saved one. */
  const save = useCallback(async (managerId: string, input: string | null) => {
    await setManagerWhatsapp(managerId, input)
    const saved = input === null ? null : normaliseWhatsapp(input)
    setNumbers((prev) => {
      const next = new Map(prev)
      if (saved) next.set(managerId, saved)
      else next.delete(managerId)
      return next
    })
  }, [])
  return { numbers, save }
}
