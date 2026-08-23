import { AnesthesiaRecordModel } from './anesthesia-record.model';
import { RecordSection } from '../components/record-viewer-modal/record-viewer-modal.component';
import { formatDateBR } from '../utils/date-format.util';

function yn(value: string | boolean | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  const v = String(value).trim().toLowerCase();
  if (v === 'sim' || v === 'yes' || v === 'true') return 'Sim';
  if (v === 'nao' || v === 'não' || v === 'no' || v === 'false') return 'Não';
  return String(value);
}


export function mapAnesthesiaRecordToRecordData(record: Partial<AnesthesiaRecordModel> | any): RecordSection[] {
  const sections: RecordSection[] = [];

  const add = (title: string, fields: { label: string; value: string | number | null | undefined }[]) => {
    const validFields = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
    if (validFields.length > 0) {
      sections.push({ title, fields: validFields as { label: string; value: string | number }[] });
    }
  };

  const seg = record?.seguranca;
  if (seg) {
    add('Segurança', [
      { label: 'Paciente identificado e avaliado', value: yn(seg.identificadoAvaliado) },
      { label: 'Termo de consentimento assinado', value: yn(seg.consentimentoAssinado) },
      { label: 'Equipamentos checados', value: yn(seg.equipamentosChecados) },
      { label: 'Observações', value: seg.atencao },
    ]);
  }

  const pre = record?.preInducao;
  if (pre) {
    add('Pré-Indução', [
      { label: 'Recebeu medicação pré-anestésica', value: yn(pre.recebeuMedPrevia) },
      { label: 'Horário', value: pre.hora },
      { label: 'Fármaco', value: pre.farmaco },
      { label: 'Via', value: pre.via },
      { label: 'Outra via', value: pre.outrasVia },
    ]);
  }

  const atb = record?.antibiotico;
  const antibioticsList: any[] = Array.isArray(record?.antibioticsList) ? record.antibioticsList : [];
  if (atb || antibioticsList.length > 0) {
    const antibioticFields = [
      { label: 'Uso de antibiótico profilático', value: yn(atb?.temAntibiotico) },
    ];
    antibioticsList.forEach((a, i) => {
      const nome = a.nome || a.medicationName || `Antibiótico ${i + 1}`;
      antibioticFields.push({
        label: nome,
        value: [a.dose, a.via, a.hora].filter(Boolean).join(' · '),
      });
      if (a.temRepique === 'sim' && Array.isArray(a.repiques)) {
        a.repiques.forEach((r: any, j: number) => {
          antibioticFields.push({
            label: `${nome} — repique ${j + 1}`,
            value: [r.dose, r.via, r.hora].filter(Boolean).join(' · '),
          });
        });
      }
    });
    add('Antibiótico Profilático', antibioticFields);
  }

  const dv = record?.dadosVitais;
  if (dv) {
    add('Dados Vitais', [
      { label: 'PA', value: dv.pa },
      { label: 'FR', value: dv.fr },
      { label: 'Temperatura', value: dv.temp },
      { label: 'SpO₂', value: dv.spo2 },
      { label: 'Peso', value: dv.peso },
      { label: 'ASA', value: dv.asa },
      { label: 'Entrada na Sala', value: dv.entradaSala },
    ]);
  }

  const eq = record?.equipe;
  if (eq) {
    add('Equipe Cirúrgica', [
      { label: 'Cirurgião', value: eq.cirurgiaoNome },
      { label: 'Assistente', value: eq.assistenteNome },
      { label: 'Diagnóstico Pré', value: eq.diagnosticoPre },
      { label: 'Hora de início da anestesia', value: eq.horaInicioAnestesia },
    ]);
  }

  const pos = record?.posicao;
  if (pos) {
    add('Posição e Acesso Venoso', [
      { label: 'Posições', value: (pos.posicoes ?? []).join(', ') },
      { label: 'Outra posição', value: pos.outrasPosicao },
      { label: 'Uso de coxim', value: yn(pos.usoCoxim) },
      { label: 'Local do coxim', value: pos.localCoxim },
      { label: 'Acesso venoso', value: (pos.acessoVenoso ?? []).join(', ') },
      { label: 'Outro acesso', value: pos.outroAcesso },
      { label: 'Local do acesso', value: pos.localAcesso },
      { label: 'Dificuldade de punção', value: yn(pos.dificuldadePuncao) },
    ]);
  }

  const t = record?.tecnica;
  if (t) {
    const dispositivos: string[] = [];
    if (t.vaGuedel) dispositivos.push(`Guedel${t.guedelNo ? ` nº ${t.guedelNo}` : ''}`);
    if (t.vaMascLaringea) dispositivos.push(`Máscara Laríngea${t.mascLaringeaNo ? ` nº ${t.mascLaringeaNo}` : ''}`);
    if (t.vaMascFacial) dispositivos.push(`Máscara Facial${t.mascFacialNo ? ` nº ${t.mascFacialNo}` : ''}`);
    if (t.vaTubo) dispositivos.push(`Tubo${t.tuboNo ? ` nº ${t.tuboNo}` : ''}`);

    const tipoTubo: string[] = [];
    if (t.tipoSimples) tipoTubo.push('Simples');
    if (t.tipoEndobronquico) tipoTubo.push('Endobrônquico');
    if (t.tipoAramado) tipoTubo.push('Aramado');
    if (t.tipoOutras) tipoTubo.push(t.tipoOutrasTexto ? `Outras (${t.tipoOutrasTexto})` : 'Outras');

    const tecIntubacao: string[] = [];
    if (t.tecLaringoscopia) tecIntubacao.push('Laringoscopia');
    if (t.tecBroncofibroscopia) tecIntubacao.push('Broncofibroscopia');
    if (t.tecRetrograda) tecIntubacao.push('Retrógrada');
    if (t.tecTraqueostomia) tecIntubacao.push('Traqueostomia');
    if (t.tecVideolaringoscopia) tecIntubacao.push('Videolaringoscopia');
    if (t.tecVAOutras) tecIntubacao.push(t.tecVAOutrasTexto ? `Outras (${t.tecVAOutrasTexto})` : 'Outras');

    add('Técnica Anestésica', [
      { label: 'Anestesia geral', value: yn(t.anestesiaGeral) },
      { label: 'Respiração assistida', value: (t.respiracaoAssistida ?? []).join(', ') },
      { label: 'Respiração controlada', value: (t.respiracaoControlada ?? []).join(', ') },
      { label: 'Circuito absorvedor', value: t.circuitoAbsorvedor },
      { label: 'Dispositivos de via aérea', value: dispositivos.join(', ') },
      { label: 'Cuff', value: yn(t.cuff) },
      { label: 'IOT', value: yn(t.iot) },
      { label: 'Via', value: [t.oral ? 'Oral' : null, t.nasal ? 'Nasal' : null].filter(Boolean).join(', ') },
      { label: 'Intubação', value: [t.facil ? 'Fácil' : null, t.dificil ? 'Difícil' : null].filter(Boolean).join(', ') },
      { label: 'Tipo de tubo', value: tipoTubo.join(', ') },
      { label: 'Técnica de intubação', value: tecIntubacao.join(', ') },
      { label: 'Bloqueios espinhais', value: t.bloqueiosEspinhais },
      { label: 'Nível de punção', value: (t.nivelPuncao ?? []).join(', ') },
      { label: 'Posição da punção', value: t.posicaoPuncao },
      { label: 'Cateter', value: t.cateter },
      { label: 'Opioide', value: t.opioide },
      { label: 'Número de punções', value: t.numeroPuncoes },
      { label: 'Sedação', value: t.sedacao },
      { label: 'Suplementação de O2', value: yn(t.suplementacaoO2) },
      { label: 'Tipo de suplementação de O2', value: (t.tipoSuplementacaoO2 ?? []).join(', ') },
      { label: 'Outra suplementação de O2', value: t.suplementacaoO2Outros },
      { label: 'Bloqueio de plexo', value: yn(t.bloqueioPlexo) },
      { label: 'Neuroestimulador', value: yn(t.neuroestimulador) },
      { label: 'Nervos estimulados', value: (t.nervosEstimulados ?? []).join(', ') },
      { label: 'Outros nervos estimulados', value: t.nervosEstimuladosOutros },
      { label: 'Técnicas auxiliares', value: (t.tecnicasAuxiliares ?? []).join(', ') },
    ]);
  }

  const pp = record?.posProcedimento;
  if (pp) {
    add('Pós-Procedimento', [
      { label: 'Cirurgia realizada', value: pp.cirurgiaRealizada },
      { label: 'Hora de término da cirurgia', value: pp.horaTerminoCirurgia },
      { label: 'Diagnóstico pós', value: pp.diagnosticoPos },
      { label: 'Hora de término da anestesia', value: pp.horaTerminoAnestesia },
    ]);
  }

  const ald = record?.alderete;
  if (ald) {
    const dor: string[] = [];
    if (ald.dorUsouENV) dor.push(`ENV: ${ald.dorENV}`);
    if (ald.dorUsouPAINAD) dor.push(`PAINAD: ${ald.dorPAINAD}`);
    if (ald.dorUsouBPS) dor.push(`BPS: ${ald.dorBPS}`);

    add('Aldrete e Dor', [
      { label: 'Consciência', value: ald.consciencia },
      { label: 'Atividade', value: ald.atividade },
      { label: 'Circulação', value: ald.circulacao },
      { label: 'Respiração', value: ald.respiracao },
      { label: 'Saturação', value: ald.saturacao },
      { label: 'Hora da avaliação', value: ald.horaAvaliacao },
      { label: 'Condições clínicas de alta', value: (ald.condicoesClinicasAlta ?? []).join(', ') },
      { label: 'Outras condições de alta', value: ald.condicoesAltaOutras },
      { label: 'Destino', value: ald.destino },
      { label: 'Dor', value: ald.dor },
      { label: 'Escalas de dor', value: dor.join(' · ') },
      { label: 'Conduta', value: ald.conduta },
    ]);
  }

  const ass = record?.assinaturas;
  if (ass) {
    add('Assinaturas', [
      { label: 'Primeiro anestesista', value: ass.primeiroAnestesista },
      { label: 'Segundo anestesista', value: ass.segundoAnestesistaNome },
      { label: 'Data da assinatura', value: formatDateBR(ass.dataAssinatura) },
    ]);
  }

  return sections;
}
