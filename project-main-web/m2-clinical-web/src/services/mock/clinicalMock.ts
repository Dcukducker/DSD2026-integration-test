import type { ClinicalEvent, HistoryRecord, LimbModelState, PatientSummary, TimeRangePreset, TrendSeries } from '../../types/clinical'
import { getRuntimeLocale } from '../../i18n/runtime'

const daysAgo = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString().slice(0, 10) }
const isoAt = (d: Date) => d.toISOString().slice(0, 10)
const isEn = () => getRuntimeLocale() === 'en'
const isPt = () => getRuntimeLocale() === 'pt-BR'

function t(zh: string, en: string, pt: string) { return isEn() ? en : isPt() ? pt : zh }

function buildRomSeries(): TrendSeries {
  const points: TrendSeries['points'] = []
  const start = new Date()
  start.setMonth(start.getMonth() - 6)
  for (let i = 0; i < 120; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i * 2)
    const base = 42 + i * 0.35 + Math.sin(i / 8) * 4
    const measured = i % 5 !== 0
    const v = Math.round(base + (Math.random() - 0.5) * 6)
    const isAnomaly = i === 47 || i === 91
    points.push({ t: isoAt(d), value: v, source: measured ? 'measured' : 'ai_inferred', isAnomaly, anomalyNote: isAnomaly ? t('与近期轨迹偏离较大，建议复核采集姿势与设备校准。', 'Deviation from recent trajectory; verify pose and device calibration.', 'Desvio da trajetória recente; revisar postura e calibração do dispositivo.') : undefined })
  }
  return { metricKey: 'knee_flexion_rom', points }
}

function buildStrengthSeries(): TrendSeries {
  const points: TrendSeries['points'] = []
  const start = new Date()
  start.setMonth(start.getMonth() - 6)
  for (let i = 0; i < 90; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i * 3)
    points.push({ t: isoAt(d), value: Math.round(38 + i * 0.4 + (Math.random() - 0.5) * 5), source: i % 7 === 0 ? 'ai_inferred' : 'measured' })
  }
  return { metricKey: 'quadriceps_mmt', points }
}

export function mockPatients(): PatientSummary[] {
  return [
    { id: 'p-001', displayName: t('患者 A（右膝 ACL 术后）', 'Patient A (right knee ACL postop)', 'Paciente A (ACL joelho direito pós-op)'), limbSide: 'right', diagnosisShort: t('ACL 重建术后康复', 'Post-ACL reconstruction rehab', 'Reabilitação pós reconstrução de ACL') },
    { id: 'p-002', displayName: t('患者 B（左肩袖）', 'Patient B (left rotator cuff)', 'Paciente B (manguito esquerdo)'), limbSide: 'left', diagnosisShort: t('肩袖修复术后', 'Post-rotator cuff repair', 'Pós reparo do manguito rotador') },
  ]
}

export function mockEventsForPatient(patientId: string): ClinicalEvent[] {
  const base: ClinicalEvent[] = [
    { id: 'e1', t: daysAgo(150), label: t('ACL 重建术', 'ACL reconstruction', 'Reconstrução de ACL'), type: 'surgery', description: t('关节镜下重建', 'Arthroscopic reconstruction', 'Reconstrução artroscópica') },
    { id: 'e2', t: daysAgo(120), label: t('术后 4 周评估', '4-week postop assessment', 'Avaliação de 4 semanas pós-op'), type: 'assessment' },
    { id: 'e3', t: daysAgo(60), label: t('重返跑步标准达成', 'Return-to-run criteria met', 'Critérios para retorno à corrida atingidos'), type: 'milestone' },
    { id: 'e4', t: daysAgo(14), label: t('等速肌力复测', 'Isokinetic retest', 'Reteste isocinético'), type: 'assessment' },
  ]
  return base.map((e) => ({ ...e, id: `${patientId}-${e.id}` }))
}

export function mockHistoryForPatient(patientId: string): HistoryRecord[] {
  return [
    { id: `${patientId}-h1`, t: daysAgo(3) + 'T10:00:00', type: 'training', title: t('闭链进阶 · 单腿蹲', 'Closed-chain progression · single-leg squat', 'Progressão em cadeia fechada · agachamento unilateral'), summary: t('主观疲劳可接受，膝外翻控制需提示。', 'Subjective fatigue acceptable; needs cueing for knee valgus control.', 'Fadiga subjetiva aceitável; precisa de orientação para controle do valgo.'), metrics: { knee_flexion_rom: { value: 118, unit: '°', source: 'measured' }, quadriceps_mmt: { value: 4, unit: '/5', source: 'measured' } } },
    { id: `${patientId}-h2`, t: daysAgo(10) + 'T09:30:00', type: 'assessment', title: t('月度功能评估', 'Monthly functional assessment', 'Avaliação funcional mensal'), summary: t('步态对称性改善；单腿跳落地策略保守。', 'Gait symmetry improved; single-leg landing strategy remains conservative.', 'Simetria da marcha melhorou; estratégia de aterrissagem unilateral ainda conservadora.'), metrics: { knee_flexion_rom: { value: 112, unit: '°', source: 'measured' }, quadriceps_mmt: { value: 4, unit: '/5', source: 'ai_inferred' } } },
    { id: `${patientId}-h3`, t: daysAgo(24) + 'T15:00:00', type: 'training', title: t('开链终末伸膝（低负荷）', 'Open-chain terminal knee extension (low load)', 'Extensão terminal de joelho em cadeia aberta (baixa carga)'), summary: t('髌股不适 2/10，已降负荷。', 'Patellofemoral discomfort 2/10; load reduced.', 'Desconforto patelofemoral 2/10; carga reduzida.'), metrics: { knee_flexion_rom: { value: 108, unit: '°', source: 'measured' }, quadriceps_mmt: { value: 3, unit: '/5', source: 'measured' } } },
    { id: `${patientId}-h4`, t: daysAgo(45) + 'T11:00:00', type: 'assessment', title: t('等速 60°/s', 'Isokinetic 60°/s', 'Isocinético 60°/s'), summary: t('患侧/健侧 峰值力矩比 0.71。', 'Affected/unaffected peak torque ratio 0.71.', 'Razão de pico de torque lado afetado/não afetado: 0.71.'), metrics: { knee_flexion_rom: { value: 102, unit: '°', source: 'measured' }, quadriceps_mmt: { value: 3, unit: '/5', source: 'measured' } } },
  ]
}

export function mockTrendsForPatient(patientId: string, range: TimeRangePreset): TrendSeries[] {
  void patientId
  void range
  return [buildRomSeries(), buildStrengthSeries()]
}

export function mockLimbState(patientId: string): LimbModelState {
  const isShoulder = patientId === 'p-002'
  return {
    patientId,
    updatedAt: new Date().toISOString(),
    segments: isShoulder
      ? [
          { id: 'upper', label: t('冈上肌', 'Supraspinatus', 'Supraespinal'), heat: 0.62, angleDeg: 34 },
          { id: 'knee', label: t('肩峰下间隙', 'Subacromial space', 'Espaço subacromial'), heat: 0.74, angleDeg: 42 },
          { id: 'lower', label: t('冈下肌', 'Infraspinatus', 'Infraespinal'), heat: 0.55, angleDeg: 28 },
        ]
      : [
          { id: 'upper', label: t('大腿', 'Thigh', 'Coxa'), heat: 0.25, angleDeg: 12 },
          { id: 'knee', label: t('膝关节', 'Knee joint', 'Articulação do joelho'), heat: 0.85, angleDeg: 68 },
          { id: 'lower', label: t('小腿', 'Shank', 'Perna'), heat: 0.45, angleDeg: 5 },
        ],
    caption: isShoulder
      ? t('肩袖术后模型：重点关注冈上肌/冈下肌负荷与肩峰下空间变化（演示数据）。', 'Post-rotator cuff model: focus on supraspinatus/infraspinatus load and subacromial space (demo).', 'Modelo pós manguito: foco em carga supra/infraespinal e espaço subacromial (demo).')
      : t('热力图表示相对负荷/不适主观权重（演示数据）。角度为示意性关节角。', 'Heatmap indicates relative load/discomfort weight (demo). Angles are illustrative joint angles.', 'O mapa de calor indica peso relativo de carga/desconforto (demo). Ângulos são ilustrativos.'),
    dataMixNote: isShoulder
      ? t('角度：术后外展活动追踪；热力：AI 根据动作代偿与疼痛问卷推断。', 'Angles: postoperative abduction tracking; heat inferred from compensation and pain forms.', 'Ângulos: rastreio de abdução pós-op; calor inferido por compensação e dor.')
      : t('角度：实测惯性单元；热力权重：AI 根据训练日志与问卷推断。', 'Angles: measured IMU data; heat weights: AI inferred from logs and questionnaires.', 'Ângulos: dados medidos por IMU; peso térmico: inferência de IA por logs e questionários.'),
  }
}
