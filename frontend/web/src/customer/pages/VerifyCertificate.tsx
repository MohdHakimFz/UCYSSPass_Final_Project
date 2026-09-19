import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, errorText } from '@/lib/api'
import { formatWhen } from '@/customer/ui'
import { BRAND } from '@/lib/brand'

type Result = { valid: true; name: string; event: string; date: string }

/** Anyone can open the address printed on a certificate and see whether it is genuine. */
export default function VerifyCertificate() {
  const { id, code } = useParams()
  const [result, setResult] = useState<Result | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    api<Result>(`/certificates/${id}/${code}`)
      .then((r) => live && setResult(r))
      .catch((e) => live && setProblem(errorText(e)))
    return () => {
      live = false
    }
  }, [id, code])

  return (
    <>
      <div className="page-head">
        <h1>Check a certificate</h1>
      </div>
      {!result && !problem && <p className="sub">Checking…</p>}
      {result && (
        <div className="verify verify-ok" role="status">
          <h2>This certificate is genuine</h2>
          <p>
            <strong>{result.name}</strong> attended <strong>{result.event}</strong> on {formatWhen(result.date)}.
          </p>
          <p className="sub">Issued by {BRAND.name}, the {BRAND.full}.</p>
        </div>
      )}
      {problem && (
        <div className="verify verify-bad" role="alert">
          <h2>We could not confirm this certificate</h2>
          <p>{problem}</p>
          <p className="sub">Check that the address was copied whole, including the code at the end.</p>
        </div>
      )}
    </>
  )
}
