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
  const save = useCallback(async (managerId: string, input: string) => {
    await setManagerWhatsapp(managerId, input)
    const saved = normaliseWhatsapp(input)
    if (saved) setNumbers((prev) => new Map(prev).set(managerId, saved))
  }, [])
  return { numbers, save }
}
