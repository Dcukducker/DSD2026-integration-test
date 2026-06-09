import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useParams } from 'react-router-dom'
import { usePatient } from '../context/PatientContext'
import { getDiseaseType, loadDecision, saveDecision, saveDoctorOrder } from '../services/clinicalBridge'
import { useI18n } from '../i18n/I18nContext'

type Phase = 'IA' | 'IB' | 'II'
type Cobb = 'I' | 'II' | 'III'
type Risk = 'Green' | 'Yellow' | 'Red' | 'Orange'
type WeightBearing = 'non_weight_bearing' | 'partial_weight_bearing' | 'full_weight_bearing'
type Phenotype = 'optimal_recovery' | 'delayed_recovery' | 'high_risk_compensation'

type EventRow = {
  id: string
  at: string
  type: 'retear' | 'subcutaneous_hematoma' | 'skin_infection'
  note: string
}

type DiseaseScale = 'lysholm_ikdc' | 'ases_constant'

const LYSHOLM_ITEMS = [
  { key: 'limp', max: 5 },
  { key: 'support', max: 5 },
  { key: 'locking', max: 15 },
  { key: 'instability', max: 25 },
  { key: 'pain', max: 25 },
  { key: 'swelling', max: 10 },
  { key: 'stairs', max: 10 },
  { key: 'squat', max: 5 },
] as const

const ASES_ITEMS = [
  { key: 'pain', max: 50 },
  { key: 'adl', max: 50 },
] as const

const CONSTANT_ITEMS = [
  { key: 'pain', max: 15 },
  { key: 'adl', max: 20 },
  { key: 'rom', max: 40 },
  { key: 'strength', max: 25 },
] as const

function calcPhenotype(mmt: number, rom: number): Phenotype {
  if (mmt >= 4 && rom >= 120) return 'optimal_recovery'
  if (mmt <= 2 || rom <= 90) return 'high_risk_compensation'
  return 'delayed_recovery'
}

function calcRisk(lysholm: number, ikdc: number, kt: number): Risk {
  if (lysholm >= 85 && ikdc >= 80 && kt <= 3) return 'Green'
  if (lysholm >= 70 && ikdc >= 65 && kt <= 5) return 'Yellow'
  if (lysholm >= 55 && ikdc >= 50 && kt <= 7) return 'Red'
  return 'Orange'
}

function riskText(risk: Risk, tr: (zh: string, en: string, pt: string) => string) {
  if (risk === 'Green') return tr('低风险', 'Low Risk', 'Risco Baixo')
  if (risk === 'Yellow') return tr('中风险', 'Medium Risk', 'Risco Medio')
  if (risk === 'Red') return tr('高风险', 'High Risk', 'Risco Alto')
  return tr('极高风险', 'Very High Risk', 'Risco Muito Alto')
}

function phenotypeText(x: Phenotype, tr: (zh: string, en: string, pt: string) => string) {
  if (x === 'optimal_recovery') return tr('优质恢复组', 'Optimal Recovery Group', 'Grupo de Recuperacao Otima')
  if (x === 'delayed_recovery') return tr('迟缓恢复组', 'Delayed Recovery Group', 'Grupo de Recuperacao Atrasada')
  return tr('高风险代偿组', 'High-Risk Compensation Group', 'Grupo de Compensacao de Alto Risco')
}

function weightBearingText(x: WeightBearing, tr: (zh: string, en: string, pt: string) => string) {
  if (x === 'non_weight_bearing') return tr('免负重', 'Non-weight-bearing', 'Sem apoio de peso')
  if (x === 'partial_weight_bearing') return tr('部分负重', 'Partial weight-bearing', 'Apoio parcial de peso')
  return tr('完全负重', 'Full weight-bearing', 'Apoio total de peso')
}

function reportText(input: {
  patientId: string
  phase: Phase
  cobb: Cobb
  phenotype: Phenotype
  lysholm: number
  ikdc: number
  tegner: number
  kt: number
  hq: number
  risk: Risk
  wb: WeightBearing
  scarOrder: string
  events: EventRow[]
  tr: (zh: string, en: string, pt: string) => string
}) {
  return [
    '《ACL术后康复中期评估报告》',
    `患者编号：${input.patientId}`,
    `术后分期：${input.phase}期，Cobb分级：${input.cobb}`,
    `恢复分型：${phenotypeText(input.phenotype, input.tr)}`,
    `Lysholm评分：${input.lysholm}/100`,
    `IKDC评分：${input.ikdc}/100`,
    `Tegner活动等级：${input.tegner}/10`,
    `KT-1000/2000模拟前向位移：${input.kt.toFixed(1)} mm`,
    `H/Q Ratio：${input.hq.toFixed(2)}`,
    `风险分层：${riskText(input.risk, input.tr)}（${input.risk}）`,
    `保护性负重等级：${weightBearingText(input.wb, input.tr)}`,
    `瘢痕管理/粘连松解医嘱：${input.scarOrder || '无'}`,
    '临床并发症记录：',
    ...(input.events.length
      ? input.events.map((e) => `- ${e.at} ${e.type}：${e.note}`)
      : ['- 暂无']),
  ].join('\n')
}

export function DoctorClinicalPage() {
  const { locale } = useI18n()
  const tr = (zh: string, en: string, pt: string) =>
    locale === 'en' ? en : locale === 'pt-BR' ? pt : zh
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { currentPatient } = usePatient()
  const diseaseType = getDiseaseType(currentPatient?.diagnosisShort)
  const scaleType: DiseaseScale = diseaseType === 'acl' ? 'lysholm_ikdc' : 'ases_constant'
  const diseaseTitle = diseaseType === 'acl'
    ? tr('ACL术后', 'Post-ACL surgery', 'Pos-cirurgia de LCA')
    : tr('肩袖修复术后', 'Post rotator cuff repair', 'Pos-reparo do manguito rotador')

  const initialDecision = loadDecision(patientId)
  const [phase, setPhase] = useState<Phase>((initialDecision?.phase as Phase) || 'IB')
  const [cobb, setCobb] = useState<Cobb>((initialDecision?.cobb as Cobb) || 'II')
  const [mmt, setMmt] = useState(initialDecision?.mmt ?? 3.5)
  const [rom, setRom] = useState(initialDecision?.rom ?? 112)
  const [ikdc, setIkdc] = useState(67)
  const [tegner, setTegner] = useState(4)
  const [ktShift, setKtShift] = useState(4.2)
  const [hqRatio, setHqRatio] = useState(0.61)
  const [weightBearing, setWeightBearing] = useState<WeightBearing>('partial_weight_bearing')
  const [scarOrder, setScarOrder] = useState('术后瘢痕松解训练每周 3 次，关注胫骨前外侧粘连点。')
  const [missDays, setMissDays] = useState(4)
  const [unfinishedCount, setUnfinishedCount] = useState(7)
  const [vasPoints, setVasPoints] = useState<number[]>([6, 5, 4, 4, 3, 5, 3])
  const [triggerNote, setTriggerNote] = useState('下楼梯后 30 分钟疼痛触发，VAS 峰值 6。')
  const [events, setEvents] = useState<EventRow[]>([
    { id: 'e1', at: '2026-03-28', type: 'subcutaneous_hematoma', note: '术区外侧轻度，48h 缓解。' },
  ])
  const [newEventType, setNewEventType] = useState<EventRow['type']>('retear')
  const [newEventNote, setNewEventNote] = useState('')
  const [editScale, setEditScale] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [manualLysholm, setManualLysholm] = useState<Record<string, number>>({})
  const [ases, setAses] = useState<Record<string, number>>({ pain: 35, adl: 34 })
  const [constant, setConstant] = useState<Record<string, number>>({
    pain: 10,
    adl: 14,
    rom: 29,
    strength: 18,
  })
  const lysholmLabel = (key: string) => {
    if (key === 'limp') return tr('跛行', 'Limp', 'Claudicacao')
    if (key === 'support') return tr('支撑', 'Support', 'Apoio')
    if (key === 'locking') return tr('交锁', 'Locking', 'Travamento')
    if (key === 'instability') return tr('不稳感', 'Instability', 'Instabilidade')
    if (key === 'pain') return tr('疼痛', 'Pain', 'Dor')
    if (key === 'swelling') return tr('肿胀', 'Swelling', 'Inchaco')
    if (key === 'stairs') return tr('上下楼', 'Stairs', 'Escadas')
    return tr('下蹲', 'Squat', 'Agachamento')
  }
  const asesLabel = (key: string) =>
    key === 'pain' ? tr('疼痛评分', 'Pain score', 'Pontuacao de dor') : tr('日常活动', 'Daily activity', 'Atividades diarias')
  const asesTip = (key: string) =>
    key === 'pain'
      ? tr('0=重度疼痛，50=无痛。', '0 = severe pain, 50 = no pain.', '0 = dor intensa, 50 = sem dor.')
      : tr('活动能力越完整，得分越高。', 'More complete function yields a higher score.', 'Quanto mais completa a funcao, maior a pontuacao.')
  const constantLabel = (key: string) => {
    if (key === 'pain') return tr('疼痛', 'Pain', 'Dor')
    if (key === 'adl') return tr('日常活动', 'Daily activity', 'Atividades diarias')
    if (key === 'rom') return tr('活动度', 'Range of motion', 'Amplitude de movimento')
    return tr('力量', 'Strength', 'Forca')
  }
  const constantTip = (key: string) => {
    if (key === 'pain') return tr('肩痛控制程度。', 'Degree of shoulder pain control.', 'Grau de controle da dor no ombro.')
    if (key === 'adl') return tr('穿衣、睡眠、工作活动能力。', 'Dressing, sleep, and work activity capacity.', 'Capacidade para vestir, dormir e trabalhar.')
    if (key === 'rom') return tr('屈曲、外展、旋转综合。', 'Composite of flexion, abduction, and rotation.', 'Composto de flexao, abducao e rotacao.')
    return tr('外展力量，kg 或等效分值。', 'Abduction strength, kg or equivalent score.', 'Forca de abducao, kg ou pontuacao equivalente.')
  }

  const lysholmItems = useMemo(
    () => ({
      limp: mmt >= 4 ? 5 : 3,
      support: mmt >= 4 ? 5 : 3,
      locking: rom >= 110 ? 12 : 8,
      instability: mmt >= 3.5 ? 18 : 12,
      pain: vasPoints[vasPoints.length - 1] <= 3 ? 20 : 14,
      swelling: rom >= 110 ? 8 : 5,
      stairs: rom >= 105 ? 8 : 4,
      squat: rom >= 120 ? 4 : 2,
    }),
    [mmt, rom, vasPoints],
  )
  const lysholmTotal = useMemo(() => {
    const merged = LYSHOLM_ITEMS.map((item) => manualLysholm[item.key] ?? lysholmItems[item.key])
    return merged.reduce((a, b) => a + b, 0)
  }, [lysholmItems, manualLysholm])
  const asesTotal = useMemo(() => (ases.pain || 0) + (ases.adl || 0), [ases])
  const constantTotal = useMemo(
    () => (constant.pain || 0) + (constant.adl || 0) + (constant.rom || 0) + (constant.strength || 0),
    [constant],
  )
  const phenotype = useMemo(() => calcPhenotype(mmt, rom), [mmt, rom])
  const risk = useMemo(() => calcRisk(lysholmTotal, ikdc, ktShift), [lysholmTotal, ikdc, ktShift])

  const vasOption = useMemo(
    () => ({
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] },
      yAxis: { type: 'value', min: 0, max: 10 },
      series: [
        {
          type: 'line',
          data: vasPoints,
          smooth: true,
          lineStyle: { color: '#f59e0b', width: 2 },
          markPoint: {
            data: [{ coord: [0, vasPoints[0]], value: tr('触发点', 'Trigger', 'Gatilho') }],
          },
        },
      ],
    }),
    [vasPoints],
  )

  const adherenceOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['45%', '72%'],
          data: [
            { name: tr('漏练天数', 'Missed days', 'Dias sem treino'), value: missDays },
            { name: tr('未完成次数', 'Incomplete count', 'Quantidade incompleta'), value: unfinishedCount },
            { name: tr('有效完成', 'Effective completion', 'Conclusao efetiva'), value: Math.max(1, 30 - missDays - unfinishedCount) },
          ],
        },
      ],
    }),
    [missDays, unfinishedCount],
  )

  const exportReport = () => {
    const content = reportText({
      patientId,
      phase,
      cobb,
      phenotype,
      lysholm: lysholmTotal,
      ikdc,
      tegner,
      kt: ktShift,
      hq: hqRatio,
      risk,
      wb: weightBearing,
      scarOrder,
      events,
      tr,
    })
    const header = `${tr('病种', 'Condition', 'Condicao')}: ${diseaseTitle}\n${tr('评估体系', 'Assessment framework', 'Estrutura de avaliacao')}: ${scaleType === 'lysholm_ikdc' ? 'Lysholm/IKDC/Tegner' : 'ASES/Constant-Murley'}\n`
    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `acl-clinical-report-${patientId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page doctor-clinical-page">
      <header className="page-header">
        <div>
          <h1>{diseaseTitle} {tr('临床工作站', 'Clinical Workstation', 'Estacao Clinica')}</h1>
          <p className="muted">{tr('临床分期、医疗质控与科研指标统一视图（医生专属）。患者：', 'Unified view of clinical staging, quality control, and research metrics (doctor only). Patient: ', 'Visao unificada de estadiamento clinico, controle de qualidade e metricas de pesquisa (somente medico). Paciente: ')}{patientId}</p>
        </div>
        <button type="button" className="btn primary" onClick={exportReport}>
          {tr('导出《术后康复中期评估报告》', 'Export Mid-term Rehab Report', 'Exportar Relatorio de Reabilitacao de Medio Prazo')}
        </button>
      </header>

      <section className="card doc-grid-2">
        <article>
          <h2 className="card-title">{tr('临床路径与分期管理', 'Clinical pathway and staging', 'Caminho clinico e estadiamento')}</h2>
          <div className="doc-field-row">
            <label>{tr('术后分期', 'Post-op phase', 'Fase pos-operatoria')}</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
              <option value="IA">{tr('IA期（炎症期）', 'Phase IA (inflammatory)', 'Fase IA (inflamatoria)')}</option>
              <option value="IB">{tr('IB期（纤维化期）', 'Phase IB (fibrotic)', 'Fase IB (fibrotica)')}</option>
              <option value="II">{tr('II期（成熟期）', 'Phase II (maturation)', 'Fase II (maturacao)')}</option>
            </select>
          </div>
          <div className="doc-field-row">
            <label>{tr('Cobb 分级', 'Cobb grade', 'Classificacao de Cobb')}</label>
            <select value={cobb} onChange={(e) => setCobb(e.target.value as Cobb)}>
              <option value="I">{tr('I级', 'Grade I', 'Grau I')}</option>
              <option value="II">{tr('II级', 'Grade II', 'Grau II')}</option>
              <option value="III">{tr('III级', 'Grade III', 'Grau III')}</option>
            </select>
          </div>
          <div className="doc-field-row">
            <label>MMT</label>
            <input type="number" step="0.1" value={mmt} onChange={(e) => setMmt(Number(e.target.value))} />
          </div>
          <div className="doc-field-row">
            <label>ROM(°)</label>
            <input type="number" value={rom} onChange={(e) => setRom(Number(e.target.value))} />
          </div>
          <p className="doc-highlight">{tr('智能分型', 'Intelligent phenotype', 'Fenotipo inteligente')}: {phenotypeText(phenotype, tr)}</p>
          <div className="role-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                saveDecision(patientId, {
                  phase,
                  cobb,
                  mmt,
                  rom,
                  updatedAt: new Date().toISOString(),
                })
                setSaveMsg(tr('分期与指标已保存', 'Phase and indicators saved', 'Fase e indicadores salvos'))
                setTimeout(() => setSaveMsg(''), 1800)
              }}
            >
              {tr('保存分期与指标', 'Save phase and indicators', 'Salvar fase e indicadores')}
            </button>
            {saveMsg ? <span className="small muted">{saveMsg}</span> : null}
          </div>
        </article>
        <article>
          <h2 className="card-title">{tr('风险分层与干预', 'Risk stratification and intervention', 'Estratificacao de risco e intervencao')}</h2>
          <p className={`risk-chip risk-${risk.toLowerCase()}`}>{riskText(risk, tr)}（{risk}）</p>
          <div className="doc-field-row">
            <label>{tr('保护性负重等级', 'Protected weight-bearing level', 'Nivel de carga protegida')}</label>
            <select value={weightBearing} onChange={(e) => setWeightBearing(e.target.value as WeightBearing)}>
              <option value="non_weight_bearing">{weightBearingText('non_weight_bearing', tr)}</option>
              <option value="partial_weight_bearing">{weightBearingText('partial_weight_bearing', tr)}</option>
              <option value="full_weight_bearing">{weightBearingText('full_weight_bearing', tr)}</option>
            </select>
          </div>
          <div className="doc-field-row">
            <label>{tr('瘢痕管理/粘连松解', 'Scar management / adhesion release', 'Manejo de cicatriz / liberacao de aderencia')}</label>
            <textarea value={scarOrder} onChange={(e) => setScarOrder(e.target.value)} rows={3} />
          </div>
          <p className="muted small">{tr('临床建议：', 'Clinical suggestion: ', 'Sugestao clinica: ')}{risk === 'Orange' ? tr('暂停进阶负重并复查影像，优先控制炎症反应。', 'Pause advanced weight-bearing and recheck imaging, prioritizing inflammation control.', 'Pausar apoio de carga avancado e repetir imagem, priorizando controle inflamatorio.') : tr('维持当前康复节律，按周复评功能量表。', 'Maintain current rehab cadence and reassess scales weekly.', 'Manter o ritmo atual de reabilitacao e reavaliar escalas semanalmente.')}</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              saveDoctorOrder(patientId, {
                riskLevel: risk,
                weightBearing,
                scarOrder,
                advice:
                  risk === 'Orange'
                    ? tr('近期高风险，请严格控制负重并在72小时内复诊。', 'High risk recently; strictly control weight-bearing and revisit within 72 hours.', 'Risco alto recente; controle rigoroso da carga e retorne em ate 72 horas.')
                    : tr('继续按当前节律训练，每周复评功能量表。', 'Continue training at current cadence and reassess functional scales weekly.', 'Continue treinando no ritmo atual e reavalie as escalas funcionais semanalmente.'),
                updatedAt: new Date().toISOString(),
              })
              setSaveMsg(tr('医嘱已下发到患者端风险提醒', 'Medical order sent to patient risk alerts', 'Prescricao enviada para alertas de risco do paciente'))
              setTimeout(() => setSaveMsg(''), 1800)
            }}
          >
            {tr('下发医嘱', 'Send medical order', 'Enviar prescricao')}
          </button>
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <h2 className="card-title">{tr('专业评估体系', 'Professional assessment system', 'Sistema profissional de avaliacao')}（{scaleType === 'lysholm_ikdc' ? 'Lysholm / IKDC / Tegner' : 'ASES / Constant-Murley'}）</h2>
          <button type="button" className="btn ghost" onClick={() => setEditScale((x) => !x)}>
            {editScale ? tr('完成编辑', 'Finish editing', 'Concluir edicao') : tr('编辑量表', 'Edit scale', 'Editar escala')}
          </button>
        </div>
        <div className="doc-grid-3">
          {scaleType === 'lysholm_ikdc' ? (
            <article className="doc-panel">
              <h3>{tr('Lysholm 评分', 'Lysholm Score', 'Escala Lysholm')}: {lysholmTotal}/100</h3>
              <ul className="simple-list">
                {LYSHOLM_ITEMS.map((item) => (
                  <li key={item.key} title={`${lysholmLabel(item.key)}${tr('评分标准：见临床量表说明', ' scoring standard: see clinical scale notes', ' padrao de pontuacao: ver notas da escala clinica')}`}>
                    {lysholmLabel(item.key)}：
                    {editScale ? (
                      <input
                        type="number"
                        min={0}
                        max={item.max}
                        value={manualLysholm[item.key] ?? lysholmItems[item.key]}
                        onChange={(e) =>
                          setManualLysholm((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))
                        }
                      />
                    ) : (
                      `${manualLysholm[item.key] ?? lysholmItems[item.key]} / ${item.max}`
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ) : (
            <article className="doc-panel">
              <h3>ASES {tr('总分', 'Total', 'Total')}: {asesTotal}/100</h3>
              <ul className="simple-list">
                {ASES_ITEMS.map((item) => (
                  <li key={item.key} title={asesTip(item.key)}>
                    {asesLabel(item.key)}：
                    {editScale ? (
                      <input
                        type="number"
                        min={0}
                        max={item.max}
                        value={ases[item.key]}
                        onChange={(e) => setAses((p) => ({ ...p, [item.key]: Number(e.target.value) }))}
                      />
                    ) : (
                      `${ases[item.key]} / ${item.max}`
                    )}
                  </li>
                ))}
              </ul>
              <h3>Constant-Murley {tr('总分', 'Total', 'Total')}: {constantTotal}/100</h3>
              <ul className="simple-list">
                {CONSTANT_ITEMS.map((item) => (
                  <li key={item.key} title={constantTip(item.key)}>
                    {constantLabel(item.key)}：
                    {editScale ? (
                      <input
                        type="number"
                        min={0}
                        max={item.max}
                        value={constant[item.key]}
                        onChange={(e) => setConstant((p) => ({ ...p, [item.key]: Number(e.target.value) }))}
                      />
                    ) : (
                      `${constant[item.key]} / ${item.max}`
                    )}
                  </li>
                ))}
              </ul>
            </article>
          )}
          <article className="doc-panel">
            <h3>IKDC & Tegner</h3>
            <div className="doc-field-row">
              <label>IKDC</label>
              <input type="number" value={ikdc} onChange={(e) => setIkdc(Number(e.target.value))} />
            </div>
            <div className="doc-field-row">
              <label>Tegner</label>
              <input type="number" min={1} max={10} value={tegner} onChange={(e) => setTegner(Number(e.target.value))} />
            </div>
          </article>
          <article className="doc-panel">
            <h3>{tr('生物力学指标', 'Biomechanics metrics', 'Metricas biomecanicas')}</h3>
            <div className="doc-field-row">
              <label>{tr('KT 前向位移(mm)', 'KT anterior translation (mm)', 'Deslocamento anterior KT (mm)')}</label>
              <input type="number" step="0.1" value={ktShift} onChange={(e) => setKtShift(Number(e.target.value))} />
            </div>
            <div className="doc-field-row">
              <label>H/Q Ratio</label>
              <input type="number" step="0.01" value={hqRatio} onChange={(e) => setHqRatio(Number(e.target.value))} />
            </div>
            <p className="small muted">{tr('参考阈值：H/Q Ratio 正常范围 0.6 - 0.8，当前', 'Reference: normal H/Q Ratio range is 0.6 - 0.8; current', 'Referencia: faixa normal de H/Q Ratio e 0.6 - 0.8; atual')} {hqRatio.toFixed(2)}（{hqRatio >= 0.6 && hqRatio <= 0.8 ? tr('达标', 'Within range', 'Dentro da faixa') : tr('偏离', 'Out of range', 'Fora da faixa')}）</p>
          </article>
        </div>
      </section>

      <section className="card doc-grid-2">
        <article>
          <h2 className="card-title">{tr('VAS 疼痛评分曲线（医生标注触发点）', 'VAS pain score curve (doctor-labeled trigger points)', 'Curva de dor VAS (pontos de gatilho marcados pelo medico)')}</h2>
          <ReactECharts option={vasOption} style={{ height: 280 }} />
          <div className="doc-field-row">
            <label>{tr('触发点标注', 'Trigger annotation', 'Marcacao de gatilho')}</label>
            <input value={triggerNote} onChange={(e) => setTriggerNote(e.target.value)} />
          </div>
          <div className="role-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setVasPoints((prev) => [...prev.slice(1), Math.max(0, Math.min(10, prev[prev.length - 1] - 1))])}
            >
              {tr('记录改善趋势', 'Record improvement trend', 'Registrar tendencia de melhora')}
            </button>
          </div>
        </article>
        <article>
          <h2 className="card-title">{tr('医疗质控与合规', 'Clinical quality control and compliance', 'Controle de qualidade clinica e conformidade')}</h2>
          <ReactECharts option={adherenceOption} style={{ height: 280 }} />
          <div className="doc-field-row">
            <label>{tr('漏练天数', 'Missed training days', 'Dias sem treino')}</label>
            <input type="number" value={missDays} onChange={(e) => setMissDays(Number(e.target.value))} />
          </div>
          <div className="doc-field-row">
            <label>{tr('未完成训练次数', 'Incomplete training count', 'Quantidade de treinos incompletos')}</label>
            <input type="number" value={unfinishedCount} onChange={(e) => setUnfinishedCount(Number(e.target.value))} />
          </div>
        </article>
      </section>

      <section className="card">
        <h2 className="card-title">{tr('临床事件记录（并发症）', 'Clinical event log (complications)', 'Registro de eventos clinicos (complicacoes)')}</h2>
        <div className="doc-grid-3">
          <select value={newEventType} onChange={(e) => setNewEventType(e.target.value as EventRow['type'])}>
            <option value="retear">{tr('再次撕裂', 'Re-tear', 'Nova ruptura')}</option>
            <option value="subcutaneous_hematoma">{tr('皮下血肿', 'Subcutaneous hematoma', 'Hematoma subcutaneo')}</option>
            <option value="skin_infection">{tr('皮肤感染', 'Skin infection', 'Infeccao cutanea')}</option>
          </select>
          <input
            placeholder={tr('记录并发症详情', 'Record complication details', 'Registrar detalhes da complicacao')}
            value={newEventNote}
            onChange={(e) => setNewEventNote(e.target.value)}
          />
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (!newEventNote.trim()) return
              setEvents((prev) => [
                {
                  id: `e-${Date.now()}`,
                  at: new Date().toISOString().slice(0, 10),
                  type: newEventType,
                  note: newEventNote.trim(),
                },
                ...prev,
              ])
              setNewEventNote('')
            }}
          >
            {tr('新增事件', 'Add event', 'Adicionar evento')}
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>{tr('日期', 'Date', 'Data')}</th><th>{tr('事件', 'Event', 'Evento')}</th><th>{tr('医学备注', 'Clinical note', 'Observacao clinica')}</th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.at}</td>
                  <td>{e.type === 'retear' ? tr('再次撕裂', 'Re-tear', 'Nova ruptura') : e.type === 'subcutaneous_hematoma' ? tr('皮下血肿', 'Subcutaneous hematoma', 'Hematoma subcutaneo') : tr('皮肤感染', 'Skin infection', 'Infeccao cutanea')}</td>
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
