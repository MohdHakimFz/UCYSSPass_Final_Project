import { useMemo } from 'react'
import type { Paginated, User } from '@/lib/api'
import { useFetch } from '@/lib/useFetch'

/**
 * Who created each event, for the admin pages only. Events carry just an `organiser_id`, so this loads the
 * people list (GET /users, which the API serves to admins only) and looks each id up in it. Admins can create
 * events too, so every role is loaded, not only organisers.
 */
export function useOrganisers() {
  const { data } = useFetch<Paginated<User>>('/users?per_page=200', { every: 60_000 })
  return useMemo(() => new Map((data?.data ?? []).map((u) => [u.id, u])), [data])
}
