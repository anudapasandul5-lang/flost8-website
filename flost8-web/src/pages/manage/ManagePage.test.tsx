import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

let session: { user: { id: string } } | null = null
const listeners = new Set<() => void>()
let mounts = 0

vi.mock('../../lib/manage/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../lib/manage/hooks')>('../../lib/manage/hooks')
  const { useEffect, useState } = await import('react')
  return {
    ...actual,
    useSession: () => {
      const [, tick] = useState(0)
      useEffect(() => { const f = () => tick((n) => n + 1); listeners.add(f); return () => void listeners.delete(f) }, [])
      return { loading: false, session }
    },
  }
})
vi.mock('../../lib/manage/api', () => ({ fetchManager: async (id: string) => ({ id, name: id, role: 'manager' }) }))
vi.mock('./Workspace', async () => {
  const { useEffect } = await import('react')
  return { default: ({ me }: { me: { id: string } }) => { useEffect(() => { mounts += 1 }, []); return <p>workspace for {me.id}</p> } }
})

import ManagePage from './ManagePage'

beforeEach(() => { mounts = 0; listeners.clear() })

it('starts a fresh workspace when the signed-in account changes in place, so one manager never sees the previous manager\'s loaded data', async () => {
  session = { user: { id: 'kasuni' } }
  render(<ManagePage />)
  await screen.findByText('workspace for kasuni')
  expect(mounts).toBe(1)
  session = { user: { id: 'nirbheeth' } }
  act(() => listeners.forEach((f) => f()))
  await waitFor(() => expect(screen.getByText('workspace for nirbheeth')).toBeTruthy())
  expect(mounts).toBe(2)
})
