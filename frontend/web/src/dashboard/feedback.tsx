import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal, ToastNotification } from '@carbon/react'

type Toast = { id: number; kind: 'success' | 'error' | 'warning' | 'info'; title: string; subtitle?: string }

type ConfirmOptions = {
  title: string
  body: ReactNode
  /** The button that goes ahead. */
  confirmLabel: string
  /** A destructive action gets a red button. */
  danger?: boolean
}

type Feedback = {
  toast: (t: Omit<Toast, 'id'>) => void
  confirm: (o: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<Feedback | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useFeedback(): Feedback {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used inside the dashboard')
  return ctx
}

/**
 * The two ways a dashboard talks back to the person using it:
 *  - toast: a short message that appears in the corner and goes away by itself
 *  - confirm: a proper dialog to approve something risky, instead of the browser's plain confirm box
 */
export default function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [asking, setAsking] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const next = useRef(1)

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = next.current++
    setToasts((list) => [...list, { ...t, id }])
  }, [])

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setAsking({ ...o, resolve })
      }),
    [],
  )

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  const answer = (ok: boolean) => {
    asking?.resolve(ok)
    setAsking(null)
  }

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <ToastNotification
            key={t.id}
            kind={t.kind}
            title={t.title}
            subtitle={t.subtitle}
            timeout={t.kind === 'error' ? 9000 : 5000}
            lowContrast
            onClose={() => {
              setToasts((list) => list.filter((x) => x.id !== t.id))
              return false
            }}
            onCloseButtonClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>

      <Modal
        open={!!asking}
        danger={asking?.danger}
        size="sm"
        modalHeading={asking?.title}
        primaryButtonText={asking?.confirmLabel}
        secondaryButtonText="Cancel"
        onRequestSubmit={() => answer(true)}
        onRequestClose={() => answer(false)}
        onSecondarySubmit={() => answer(false)}
      >
        <div className="confirm-body">{asking?.body}</div>
      </Modal>
    </FeedbackContext.Provider>
  )
}
