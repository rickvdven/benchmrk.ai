---
title: 하이록스(HYROX) 최종 기록은 어떻게 예측하나요?
seoTitle: "하이록스(HYROX) 기록 예측: 달리기, 스테이션, Roxzone"
description: 하이록스(HYROX) 최종 기록은 달리기 8번, 스테이션 8개, Roxzone의 합입니다. Benchmrk 엔진 예시와 빠른 체크로 각 부분을 계산하는 방법.
breadcrumb: 기록 예측
order: 2
updated: 2026-10-22
translationOf: hyrox-tijd-voorspellen
answer: >-
  HYROX 최종 기록은 1km 달리기 8번, 스테이션 8개, Roxzone 세 부분을 더해 예측합니다. 스테이션 후에 달리기 때문에 레이스 달리기 페이스는 역치 페이스보다 느립니다. Benchmrk 엔진 예시로, Open 남자 역치 페이스 4:45/km는 달리기 42:24, 스테이션 30:52, Roxzone 5:25로 1:18:41이 나옵니다. 예측은 추정이지 보장이 아닙니다.
summary:
  - 최종 기록 = 달리기 8번 + 스테이션 8개 + Roxzone.
  - 피로한 상태로 달리므로 레이스 페이스는 역치 페이스보다 느립니다.
  - 스테이션 기록은 직접 잰 기록으로 추정하는 것이 가장 좋습니다.
  - 숫자 하나보다 목표 기록 달성 확률이 더 많은 것을 알려 줍니다.
faq:
  - q: HYROX 기록 예측은 얼마나 정확한가요?
    a: 입력한 만큼 정확합니다. 직접 잰 스테이션 기록과 최근 시뮬레이션 스플릿이 있으면 달리기 페이스만 쓸 때보다 정확해집니다.
  - q: HYROX 레이스에서는 왜 일반 8km보다 느리게 달리나요?
    a: 매 킬로미터를 스테이션 후에, 지친 다리와 높은 심박수로 달립니다. 그래서 Benchmrk는 역치 페이스보다 느린 레이스 페이스로 계산합니다.
  - q: 어떤 달리기가 최종 기록을 가장 좌우하나요?
    a: Open 남자 14,000건 넘는 기록 분석에서 달리기 5번부터 8번까지가 최종 기록과 가장 강하게 연관되었습니다.
  - q: Roxzone이란 무엇인가요?
    a: 러닝 코스와 스테이션 사이를 오가는 구역입니다. Benchmrk는 이 시간을 따로 계산하며, 이 페이지의 엔진 예시에서는 5:25입니다.
  - q: 목표 기록 달성 확률이 낮으면 어떻게 하나요?
    a: 60% 아래면 Benchmrk가 더 알맞은 목표를 제안합니다. 받아들일지 기존 목표를 유지할지는 직접 고릅니다.
sources:
  - title: HYROX Singles Rulebook, 26/27 시즌
    url: https://maintain.hyrox.com/rulebooks/HYROX_RulebookSingles_EN.pdf
    accessed: 2026-10-22
  - title: Brandt, Ebel, Lebahn & Schmidt (2025), Frontiers in Physiology, doi:10.3389/fphys.2025.1519240
    url: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1519240/full
    accessed: 2026-10-22
  - title: HYROX – The Fitness Race (레이스 형식과 스테이션)
    url: https://hyrox.com/the-fitness-race/
    accessed: 2026-10-22
  - title: HYROX Sports Science Report 2025 (Duffuler 데이터 분석)
    url: https://hyrox.com/wp-content/uploads/2025/12/SSAC-Report.pdf
    accessed: 2026-10-22
---
## 최종 기록은 어떤 부분으로 이루어지나요?

최종 기록은 달리기, 스테이션, Roxzone 세 부분입니다. HYROX 레이스는 1km 달리기 8번이고 킬로미터마다 스테이션이 하나씩 이어집니다. 세 부분을 따로 추정하면 시간이 어디에 있는지도 보입니다.

| 부분 | 내용 | 결정하는 것 |
|---|---|---|
| 달리기 | 8 × 1 km | 역치 페이스와 피로한 상태에서 달리는 능력 |
| 스테이션 | SkiErg부터 wall balls까지 | 근력, 기술, 디비전 중량 |
| Roxzone | 러닝 코스와 스테이션 사이 전환 | 전환이 얼마나 빠르고 침착한가 |

## 달리기 시간은 어떻게 계산하나요?

달리기 시간은 킬로미터당 레이스 페이스의 8배입니다. 스테이션 후 지친 다리로 달리기 때문에 레이스 페이스는 역치 페이스보다 느립니다. 그 차이는 사람마다 다르며, Benchmrk는 전체 시뮬레이션이 있는 벤치마크로 이를 잽니다. 목표 기록에 필요한 페이스는 [HYROX 달리기 페이스 전략](/ko/guide/hyrox-run-pacing)에, 역치 페이스를 정하는 방법은 [이 가이드](/ko/guide/find-your-threshold-pace)에 있습니다.

연구에서도 달리기가 레이스의 가장 큰 부분이었습니다. Brandt 등(2025)의 연구에서 최종 기록 중앙값은 86.5분, 그중 달리기는 중앙값 51.2분이었습니다. 2024년과 2025년 15개 레이스, Open 남자 14,000건 넘는 기록 분석에서는 달리기 5번부터 8번까지가 최종 기록과 가장 강하게 연관되었습니다.

## 스테이션 기록은 어떻게 추정하나요?

레이스 중량으로, 1km를 달린 뒤에 직접 잰 기록이 가장 좋습니다. 없으면 Benchmrk는 디비전의 중간 수준 기록을 스테이션별로 쓰고, 그 스테이션에 대한 본인 평가에 맞춰 조정합니다. 같은 데이터 분석에서 편차가 가장 큰 곳은 wall balls로 표준편차 2.02분이었습니다. 많은 사람이 여기서 시간을 줄일 수 있습니다. [wall balls 멈추지 않고 하기](/ko/guide/wall-balls-without-stopping)를 보세요.

## Roxzone은 어떻게 반영되나요?

Roxzone은 러닝 코스와 스테이션 사이 구역입니다. 룰북은 코스를 이 세 부분으로 나누며, IN 아치와 OUT 아치로 Roxzone에 들어가고 나옵니다. 달리기와 스테이션 사이를 오갈 때마다 지나갑니다. Benchmrk는 역치 페이스를 바탕으로 Roxzone을 추정해 따로 두어, 더 빠른 전환이 얼마나 이득인지 보여 줍니다. 요령은 [Roxzone에서 시간 줄이기](/ko/guide/save-time-in-the-roxzone)에 있습니다.

## 예측은 어떤 모습인가요? 예시

Benchmrk 엔진의 예시이며 실제 선수가 아닙니다. 기준: Open 남자, 역치 페이스 4:45/km, 레이스까지 16주, 목표 1:20:00.

| 항목 | 예시 |
|---|---|
| 달리기 | 42:24 |
| 스테이션 | 30:52 |
| Roxzone | 5:25 |
| 예상 최종 기록 | 1:18:41 |
| 1:20:00 달성 확률 | 96% |
| 필요한 달리기 페이스 | 5:28/km |
| 현재 달리기 페이스 | 5:18/km |

예상 달리기 페이스 5:18/km는 역치 페이스 4:45/km보다 33초 느립니다. 이 차이가 스테이션 후에 달리는 효과입니다. 현재 페이스가 필요한 페이스보다 빠르므로 확률이 높습니다.

## 왜 기록 하나가 아니라 확률인가요?

아직 몇 주를 더 훈련하고, 매주 계획대로 달리지는 못하기 때문입니다. Benchmrk는 얼마나 향상해야 하는지와 남은 시간에 기대할 수 있는 향상을 계산하고, 거기서 확률이 나옵니다. 60% 아래면 앱이 더 알맞은 목표를 제안합니다. 전체 계획은 [HYROX 훈련 계획](/ko/hyrox-training-plan)에 있습니다.

## Benchmrk는 이렇게 합니다

Benchmrk는 달리기별, 스테이션별, Roxzone 기록을 예측하고 목표 기록 달성 확률을 계산합니다. 역치 페이스, 목표 기록, 강한 스테이션과 약한 스테이션을 입력합니다. 벤치마크마다 앱이 페이스와 스테이션 기록을 조정합니다. 계정 없이 [빠른 체크](/?utm_source=gids&utm_medium=organic&utm_content=hyrox-tijd-voorspellen#check)로 시험해 보세요.
