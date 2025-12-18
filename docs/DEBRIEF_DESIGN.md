# Debrief System Design Philosophy

This document captures the design philosophy for PediSim's evaluation and debrief system.

## Core Principle: Learning Through Insight, Not Scores

Traditional rubric-based assessment reduces complex performance to checkboxes. A resident who follows PALS perfectly but traumatizes the family scores well. That's wrong.

## Problems With Rubric-Based Evaluation

| Problem | Description |
|---------|-------------|
| **Checklist mentality** | Reduces nuanced performance to boxes |
| **No temporal intelligence** | *When* you said something matters as much as *what* |
| **One-size-fits-all** | An intern needs different feedback than a PGY-3 |
| **Missing decision points** | The interesting moments are branch points |
| **No counterfactuals** | "If you had warned dad..." is the insight that changes behavior |
| **Evaluation ≠ Learning** | Scoring someone doesn't teach them |

## Better Framework: Decision-Point Analysis

Instead of scoring categories, analyze **each critical moment**:

```
TIMELINE RECONSTRUCTION

0:00  ─────────────────────────────────────────────────
      Scenario starts. SVT 220. Dad anxious (3/5).

0:08  YOU: "Let's give adenosine 1.85mg"
      ├── DECISION: Skipped vagal maneuvers
      ├── CLINICAL: Acceptable (vagal often fails, adenosine faster)
      ├── ALTERNATIVE: Vagal first is PALS-preferred for stable SVT
      └── TEACHING: "Vagal is low-risk and occasionally works.
          Worth 30 seconds before adenosine."

0:15  NURSE: "1.85mg adenosine IV push... flush going."
      ├── YOU SAID: [nothing to family]
      ├── MISSED OPPORTUNITY: Dad doesn't know what's coming
      └── EXPERT WOULD SAY: "Mr. Henderson, this medicine
          resets the heart. You'll see the monitor pause
          briefly - that's normal and expected."

0:21  ───── ASYSTOLE ─────
      Monitor flatlines. Dad at 5/5 anxiety.

0:22  DAD: "OH MY GOD! THE LINE IS FLAT!!"
      ├── DAD ANXIETY: 3 → 5 (SPIKE)
      ├── LILY FEAR: 4 → 5 (heard dad scream)
      ├── CAUSE: No anticipatory guidance
      └── COUNTERFACTUAL: With warning, dad stays at 3-4,
          Lily stays at 4, neither is traumatized
```

## Causal Chain Analysis

The key insight is tracing cascades:

**What actually happened:**
```
No warning → Dad blindsided → Dad screams → Lily hears → Lily terrified
```

**What should have happened:**
```
Warning given → Dad prepared → Dad tense but silent → Lily calmer → Trust preserved
```

## Multi-Perspective Debrief

Show what each person experienced:

### Dad's Experience
```
"I was already terrified when we arrived. The doctor seemed competent
but didn't really talk to me. Then suddenly the monitor went flat and
I thought my daughter died. The nurse said it was normal but why
didn't anyone WARN me? I still have nightmares about that moment."

TRUST TRAJECTORY: Started 6/10 → Ended 4/10
KEY MOMENT: 0:21 (flatline without warning)
```

### Lily's Experience
```
"My chest hurt and everyone was worried. The doctor talked to daddy
and the nurse but not to me. Then daddy screamed really loud and I
was really scared. Then I felt better but I'm scared to go to the
doctor now."

FEAR TRAJECTORY: Started 4/5 → Peaked 5/5 → Ended 3/5
KEY MOMENT: 0:22 (heard dad scream)
```

### Nurse's Internal Monologue
```
"Competent resident, knew the protocol. Wish they'd warned dad - I
could see that flatline coming and knew he'd lose it. I had to do
the reassurance myself. Would work with this resident again but
they need to work on family communication."
```

## The Debrief as Dialogue

Instead of dumping a report, guide a conversation:

```
┌─────────────────────────────────────────────────────────┐
│ DEBRIEF                                                 │
│                                                         │
│ Good work - Lily converted in 2:34 with correct dosing. │
│                                                         │
│ I want to focus on one moment. At 0:21, when the        │
│ flatline appeared, dad screamed. What do you think      │
│ caused that reaction?                                   │
│                                                         │
│ [He didn't know it was coming]                          │
│ [He's just an anxious person]                           │
│ [The flatline is scary regardless]                      │
│ [I'm not sure]                                          │
└─────────────────────────────────────────────────────────┘
```

## Entrustment as Trajectory

Instead of "Level 3 of 5," show growth over time:

```
YOUR ENTRUSTMENT TRAJECTORY

        Case 1    Case 2    Case 3    TODAY

Clinical  ████░     ████░     █████     █████
          3.2       3.5       4.1       4.2

Communication
          ██░░░     ██░░░     ███░░     ███░░
          1.8       2.1       2.8       2.9

RATE LIMITER: Family communication. Clinical skills are
already at Level 4. If communication matched clinical,
you'd be at Level 4 now.
```

## What Makes This Good

| Old Approach | New Approach |
|--------------|--------------|
| Score 17 items | Find the ONE pivotal moment |
| "Communication: 58/100" | "Dad screamed because you didn't warn him" |
| Generic rubric | Causal chain analysis |
| God's-eye evaluation | Multi-perspective narrative |
| Report card | Guided dialogue |
| "Work on communication" | "Say this exact phrase at this exact moment" |
| Static score | Trajectory over time |
