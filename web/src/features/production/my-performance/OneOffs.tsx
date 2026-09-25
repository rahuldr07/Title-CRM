import { Card } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { SectionHead } from '@/shared/ui/PageHead'
import { QC_FIX, type QcEntry } from '@/data/quality'
import { fmtDate } from '@/shared/lib/format'

export function OneOffs({ oneOffs, below }: { oneOffs: [reason: string, count: number][]; below: QcEntry[] }) {
  return (
    <>
      <SectionHead>Worth knowing — these came up once</SectionHead>
      <Card style={{ overflow: 'hidden' }}>
        <Rows bare>
          {oneOffs.map(([reason]) => {
            const x = below.find((y) => y.note === reason)
            return (
              <div className="rw" key={reason}>
                <span className="gr" style={{ fontSize: 'var(--t-lead)' }}>
                  ○
                </span>
                <span>
                  <b style={{ fontSize: 'var(--t-body)' }}>{reason}</b>
                  <div className="sd gr">
                    {x?.crit} · {x?.order} · {x ? fmtDate(x.d) : ''}
                  </div>
                  <div className="sd" style={{ marginTop: 5 }}>
                    {QC_FIX[reason] ?? ''}
                  </div>
                </span>
                <span />
              </div>
            )
          })}
        </Rows>
      </Card>
    </>
  )
}
