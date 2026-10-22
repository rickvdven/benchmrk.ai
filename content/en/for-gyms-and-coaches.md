---
title: How do you use Benchmrk as a gym or personal trainer?
seoTitle: "Benchmrk for gyms and coaches: gym code, sim templates"
description: With a gym code your members follow your sim build and your equipment, while everyone keeps their own plan at their own threshold. How it works.
breadcrumb: For gyms
order: 5
updated: 2026-10-22
translationOf: voor-gyms
answer: >-
  As a gym you get a gym code. Members who enter that code follow your sim template and your gym's
  equipment. Everyone keeps their own plan at their own threshold pace and threshold heart rate. A template
  sets per block of weeks how much of the race kilometre and of the station volume your members do, for
  example 3 weeks at 50% and later 2 weeks at 100%. Change the template and your members' plans follow.
summary:
  - One gym code links members to your gym.
  - Members follow your sim template and your gym's equipment.
  - Each member keeps their own plan at their own threshold and race date.
  - A WOD from your group class counts as a training day.
faq:
  - q: How do members link to my gym?
    a: They enter the gym code in their settings. After that they follow the sim template and the gym's equipment.
  - q: Do all my members get the same plan?
    a: No. The sim build is the same, but paces, heart rate limits, race date and division are per member. Every plan uses the member's own threshold.
  - q: What is in a sim template?
    a: The number of rounds and, per block of weeks, the percentage of the race kilometre and of the station volume. The last block ends in the week before race week.
  - q: Can members also train without a gym code?
    a: Yes. Without a gym they follow Benchmrk's standard build per phase, or their own build.
  - q: Can I work with a fixed group as a personal trainer?
    a: A group can share one code in the same way. In the beta, Benchmrk sets up the gym with code, equipment and template for you.
sources:
  - title: HYROX – The Fitness Race (stations and race volume)
    url: https://hyrox.com/the-fitness-race/
    accessed: 2026-10-22
  - title: HYROX – Best HYROX Preparation
    url: https://hyrox.com/best-hyrox-preparation/
    accessed: 2026-10-22
---
## What does a gym code do?

A gym code links a member to your gym. When a member enters the code, their plan takes over two things: your sim template and the equipment in your gym. The member keeps their own plan, with their own paces and their own race date. Members can also leave the gym again.

| What the gym decides | What stays per member |
|---|---|
| Sim build per block of weeks | Threshold pace and threshold heart rate |
| Equipment: HYROX gym, regular gym or home | Race date, division and goal time |
| | Number of training days per week |

## What is a sim template?

A sim template sets how the weekly simulation in your gym grows towards the race. You choose the number of rounds and, per block of weeks, two percentages: how much of the race kilometre is run and how much of the station volume is done. The last block ends in the week before race week. That way the build fits each member's race date. For how a sim is built in general, read [build a HYROX simulation](/en/guide/build-a-hyrox-simulation).

## What does an example template look like?

This is an example template for 8 rounds, with the weeks counted back from race week.

| Block | Weeks | Running (of 1 km) | Station volume |
|---|---|---|---|
| Off-season | – | 50% | 50% |
| 1 | 3 | 50% | 50% |
| 2 | 2 | 75% | 50% |
| 3 | 2 | 75% | 75% |
| 4 | 1 | 100% | 75% |
| 5 | 2 | 100% | 100% |
| 6 | 1 | 125% | 100% |
| 7 | 1 | 50% | 50% |

If a member runs more than 100% of the race kilometre, they get a note about the Roxzone. In hard sim weeks the rest of the week gets lighter: strength and long run go down.

## What if members do a group class or WOD?

Then the member picks a WOD day in the plan. They log what was on the whiteboard, or take a photo that the app reads out. The effort is logged too. A WOD with RPE 8 or higher counts as a hard day. That way your group class doesn't clash with the rest of the plan.

## What do you get out of it as a gym?

Between classes, your members train at their own level, with your build as the backbone. The app replaces stations your gym doesn't have, see [train for HYROX without a HYROX gym](/en/train-for-hyrox-without-a-hyrox-gym). A member sees their prediction per run, station and Roxzone, and so knows where the time is. For station technique there are guides such as [faster sled push](/en/guide/faster-sled-push) and [wall balls without stopping](/en/guide/wall-balls-without-stopping).

## How Benchmrk does it

In the beta, a gym gets a gym code, with its equipment and its own sim template. Members who enter the code follow your build. Update the template and their plans adapt. On top of that, each plan adapts to what the member logs: pace, heart rate and RPE. Members start free in the beta; after that Benchmrk costs €30 per year.
