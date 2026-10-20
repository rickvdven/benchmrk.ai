import { Link } from 'react-router-dom';
import type { Lang } from '../engine';
import { useI18n } from '../lib/i18n';

export const DISCLAIMER: Record<Lang, { short: string; long: string; ack: string; sources: string }> = {
  en: {
    short: 'Benchmrk gives general training information based on public sports science. It is not medical advice and does not replace a certified coach, physiotherapist or doctor.',
    long: 'Benchmrk gives general training information based on public sports-science literature. It is not medical advice and does not replace a certified coach, physiotherapist or doctor. For pain, injuries, medical conditions, pregnancy or specific questions, talk to one of them first. Stop training and seek medical help if you get chest pain, dizziness, fainting or unusual shortness of breath.',
    ack: 'I understand that Benchmrk is general training information, not medical advice, and that I will consult a certified coach, physiotherapist or doctor for pain, injuries or medical questions.',
    sources: 'Science & sources',
  },
  nl: {
    short: 'Benchmrk geeft algemene trainingsinformatie op basis van publieke sportwetenschap. Het is geen medisch advies en vervangt geen gecertificeerde trainer, fysiotherapeut of arts.',
    long: 'Benchmrk geeft algemene trainingsinformatie op basis van publieke sportwetenschappelijke literatuur. Het is geen medisch advies en vervangt geen gecertificeerde trainer, fysiotherapeut of arts. Bij pijn, blessures, medische aandoeningen, zwangerschap of specifieke vragen: overleg eerst met een van hen. Stop met trainen en zoek medische hulp bij pijn op de borst, duizeligheid, flauwvallen of ongewone kortademigheid.',
    ack: 'Ik begrijp dat Benchmrk algemene trainingsinformatie geeft, geen medisch advies, en dat ik bij pijn, blessures of medische vragen een gecertificeerde trainer, fysiotherapeut of arts raadpleeg.',
    sources: 'Wetenschap & bronnen',
  },
  de: {
    short: 'Benchmrk bietet allgemeine Trainingsinformationen auf Basis öffentlicher Sportwissenschaft. Es ist keine medizinische Beratung und ersetzt keinen zertifizierten Trainer, Physiotherapeuten oder Arzt.',
    long: 'Benchmrk bietet allgemeine Trainingsinformationen auf Basis öffentlicher sportwissenschaftlicher Literatur. Es ist keine medizinische Beratung und ersetzt keinen zertifizierten Trainer, Physiotherapeuten oder Arzt. Bei Schmerzen, Verletzungen, Erkrankungen, Schwangerschaft oder speziellen Fragen sprich zuerst mit einem von ihnen. Brich das Training ab und suche ärztliche Hilfe bei Brustschmerzen, Schwindel, Ohnmacht oder ungewöhnlicher Atemnot.',
    ack: 'Ich verstehe, dass Benchmrk allgemeine Trainingsinformationen bietet, keine medizinische Beratung, und dass ich bei Schmerzen, Verletzungen oder medizinischen Fragen einen zertifizierten Trainer, Physiotherapeuten oder Arzt konsultiere.',
    sources: 'Wissenschaft & Quellen',
  },
  es: {
    short: 'Benchmrk ofrece información general de entrenamiento basada en ciencia del deporte pública. No es consejo médico ni sustituye a un entrenador certificado, fisioterapeuta o médico.',
    long: 'Benchmrk ofrece información general de entrenamiento basada en literatura pública de ciencias del deporte. No es consejo médico ni sustituye a un entrenador certificado, fisioterapeuta o médico. Ante dolor, lesiones, enfermedades, embarazo o dudas específicas, consulta primero con uno de ellos. Deja de entrenar y busca ayuda médica si tienes dolor en el pecho, mareo, desmayo o falta de aire inusual.',
    ack: 'Entiendo que Benchmrk ofrece información general de entrenamiento, no consejo médico, y que consultaré a un entrenador certificado, fisioterapeuta o médico ante dolor, lesiones o dudas médicas.',
    sources: 'Ciencia y fuentes',
  },
  ko: {
    short: 'Benchmrk는 공개된 스포츠 과학을 바탕으로 일반적인 훈련 정보를 제공합니다. 의학적 조언이 아니며 공인 코치, 물리치료사 또는 의사를 대신하지 않습니다.',
    long: 'Benchmrk는 공개된 스포츠 과학 문헌을 바탕으로 일반적인 훈련 정보를 제공합니다. 의학적 조언이 아니며 공인 코치, 물리치료사 또는 의사를 대신하지 않습니다. 통증, 부상, 질환, 임신 또는 구체적인 질문이 있다면 먼저 전문가와 상담하세요. 가슴 통증, 어지러움, 실신 또는 비정상적인 호흡곤란이 있으면 훈련을 중단하고 의료 도움을 받으세요.',
    ack: 'Benchmrk는 의학적 조언이 아닌 일반 훈련 정보이며, 통증, 부상 또는 의학적 질문이 있을 때 공인 코치, 물리치료사 또는 의사와 상담할 것임을 이해합니다.',
    sources: '과학 & 출처',
  },
};

export function DisclaimerFooter() {
  const { lang } = useI18n();
  const d = DISCLAIMER[lang] ?? DISCLAIMER.en;
  return (
    <footer className="mx-auto max-w-6xl border-t border-line px-4 pb-28 pt-6 text-xs text-muted md:pb-8">
      <p className="max-w-3xl">{d.short}</p>
      <Link to="/science" className="mt-2 inline-block text-volt underline">
        {d.sources}
      </Link>
    </footer>
  );
}
