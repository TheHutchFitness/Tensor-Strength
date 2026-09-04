// ============================================================================
// EXERCISE LIBRARY — client portal reference
// ----------------------------------------------------------------------------
// Shows up in the Client Portal (/clients) behind the passcode gate.
//
// To add an exercise: copy one object in the array below, change the fields,
// and save. It appears in the portal after the next publish.
//
// Fields:
//   name         Exercise name
//   category     Grouping shown in the filter chips (e.g. "Squat", "Hinge",
//                 "Press", "Pull", "Accessory")
//   muscles      Primary target muscles (short string)
//   howTo        Step-by-step technique (array of strings — one per step)
//   why          Why it matters / what it builds
//   mistakes     Common mistakes to avoid (array of strings)
// ============================================================================

export type Exercise = {
  name: string;
  category: string;
  muscles: string;
  howTo: string[];
  why: string;
  mistakes: string[];
};

export const exercises: Exercise[] = [
  {
    name: "Back Squat",
    category: "Squat",
    muscles: "Quads, glutes, adductors, core",
    howTo: [
      "Set the bar at upper-chest height on the rack. Grip slightly wider than shoulders, pull shoulder blades together, and rest the bar across your rear delts — not on your neck.",
      "Brace your core, take a breath, and unrack with both feet under you. Step back into your stance: feet around shoulder-width, toes slightly out.",
      "Initiate by breaking at the hips and knees together — sit down and back, keeping your chest up and torso upright.",
      "Descend until your hip crease passes below the top of your knee (full depth), keeping knees tracking over your toes.",
      "Drive through your mid-foot, push the floor away, and stand up hard, locking out hips and knees at the top. Exhale after you pass the hardest point.",
    ],
    why: "The king of lower-body strength. It builds raw quad and glute power, reinforces core stability and bracing, and carries over to almost every athletic movement — jumping, sprinting, changing direction, and getting off the ground.",
    mistakes: [
      "Letting the chest collapse forward (good morning out of the hole).",
      "Knees caving inward instead of tracking over the toes.",
      "Coming up on the toes / shifting weight to the front of the foot.",
      "Half-repping — cutting depth short sells the strength and mobility gains.",
    ],
  },
  {
    name: "Bench Press",
    category: "Press",
    muscles: "Chest, front delts, triceps",
    howTo: [
      "Lie flat with eyes under the bar. Plant feet firmly on the floor. Grip slightly wider than shoulder-width.",
      "Pinch shoulder blades together and down — create a stable shelf and tuck the elbows at roughly 45° to your torso.",
      "Unrack with a spotter if possible. Lower the bar under control to your lower chest / sternum, touching lightly.",
      "Keep wrists stacked directly over elbows. Drive the bar back up in a slight arc toward the rack, locking out over the shoulders.",
      "Stay tight throughout — no bouncing the bar off the chest, no flaring elbows wide.",
    ],
    why: "The benchmark upper-body press. It builds chest, shoulder, and triceps strength and is the single best test of raw horizontal pushing power — that's why it's one of the three powerlifts.",
    mistakes: [
      "Bouncing the bar off the chest to fake a rep.",
      "Flaring elbows to 90° — wrecks shoulders and shortens the press.",
      "Losing upper-back tightness and letting the chest collapse.",
      "Feet dancing or hips bridging off the bench to cheat the weight up.",
    ],
  },
  {
    name: "Deadlift (Conventional)",
    category: "Hinge",
    muscles: "Posterior chain — hamstrings, glutes, back, traps",
    howTo: [
      "Set up with the bar over your mid-foot. Stance around hip-width, toes slightly out.",
      "Hinge down and grip the bar just outside your knees (double-overhand or hook grip; mixed grip for heavy pulls).",
      "Bring your shins to the bar without moving it. Chest up, lats tight, shoulders slightly in front of the bar.",
      "Take the slack out of the bar, brace hard, and push the floor away — stand up by extending hips and knees together.",
      "Lock out tall — hips and knees straight, shoulders back (not shrugged). Lower under control by hinging first, then bending the knees.",
    ],
    why: "The truest test of full-body strength. It builds the entire posterior chain — the muscles that drive sprinting, jumping, pulling, and picking anything heavy up off the floor. Nothing develops raw, usable strength quite like it.",
    mistakes: [
      "Rounding the lower back — the #1 injury risk in lifting.",
      "Shooting the hips up first so the lift turns into a stiff-leg pull.",
      "Jerking the bar off the floor instead of pulling the slack out first.",
      "Hyperextending the lockout by leaning way back or shrugging.",
    ],
  },
  {
    name: "Overhead Press",
    category: "Press",
    muscles: "Shoulders, upper chest, triceps, core",
    howTo: [
      "Set the bar at upper-chest height. Grip just outside shoulder-width. Unrack and hold at your front delts.",
      "Stand tall, brace your core and glutes hard — squeeze everything so you have a solid base to press from.",
      "Press the bar straight up. As it passes your face, shift your head/chest slightly back so the bar travels in a straight line.",
      "Lock out overhead with the bar stacked over your shoulders, hips, and mid-foot.",
      "Lower under control back to the front delts. Reset your brace before the next rep.",
    ],
    why: "Builds real, functional shoulder strength and a thick upper back. Pressing weight overhead is one of the most honest tests of upper-body strength — there's no cheating it, and it trains the core hard to stabilize the weight overhead.",
    mistakes: [
      "Leaning back into a standing incline press to push the weight up.",
      "Letting the bar arc out in front instead of straight up.",
      "Not bracing — a soft midsection leaks power and stresses the lower back.",
      "Bouncing out of the bottom instead of pressing each rep clean.",
    ],
  },
  {
    name: "Barbell Row",
    category: "Pull",
    muscles: "Lats, rhomboids, mid-back, rear delts, biceps",
    howTo: [
      "Hinge to roughly a 30–45° torso angle with a flat back. Grip the bar just outside your knees.",
      "Let the arms hang straight. Pull the bar toward your lower ribs / belly button.",
      "Drive with the elbows — think about pulling your elbows back, not your hands up.",
      "Squeeze the shoulder blades together at the top, then lower under control to full arm extension.",
      "Keep your torso angle consistent — don't stand up to row the weight.",
    ],
    why: "The best counterbalance to pressing. It builds the back thickness and pulling strength that bench and overhead press don't — critical for shoulder health, posture, and upper-body balance. A strong back is the foundation of a strong press.",
    mistakes: [
      "Standing up / raising the torso to get the weight up (turns it into a shrug).",
      "Rounding the lower back under load.",
      "Yanking with the arms instead of driving the elbows back.",
      "Cutting the rep short — not getting full extension at the bottom or squeeze at the top.",
    ],
  },
  {
    name: "Romanian Deadlift",
    category: "Hinge",
    muscles: "Hamstrings, glutes, back",
    howTo: [
      "Start standing with the bar at your hips (deadlift the bar up or unrack from blocks).",
      "Soft knees, locked-in position. Hinge back by pushing your hips toward the wall behind you.",
      "Lower the bar along your thighs — keep it in contact with your legs the whole way down.",
      "Stop when you feel a strong hamstring stretch (usually mid-shin, depending on your mobility). Don't round your back to go lower.",
      "Drive your hips forward to stand back up tall. Squeeze the glutes at the top.",
    ],
    why: "Builds the hamstrings and glutes through a deep stretch — exactly what the conventional deadlift misses. It's the best lift for hamstring health, posterior chain durability, and protecting your knees and lower back in everything else you do.",
    mistakes: [
      "Squatting the bar down instead of hinging (knees shoot forward).",
      "Letting the bar drift away from your legs — lever arm goes up, back stress spikes.",
      "Rounding the back to chase depth you don't have.",
      "Bouncing or rushing the reps instead of controlling the eccentric.",
    ],
  },
  {
    name: "Pull-Up",
    category: "Pull",
    muscles: "Lats, biceps, upper back, core",
    howTo: [
      "Grip the bar slightly wider than shoulder-width, palms facing away (chin-up = palms facing you).",
      "Start from a dead hang with straight arms and active shoulders — don't relax into the joint.",
      "Pull your elbows down and back. Think about driving your chest toward the bar, not just your chin.",
      "Get your chin over the bar at the top. Lower under control all the way back to a full hang.",
      "No kipping or swinging — every rep strict and controlled.",
    ],
    why: "The gold-standard test of relative upper-body strength — you moving your own bodyweight. It builds the lats, grip, and upper back like nothing else and is one of the clearest indicators of real, functional pulling strength.",
    mistakes: [
      "Kipping or swinging to get over the bar.",
      "Not locking out the arms at the bottom (half-repping).",
      "Pulling with the arms instead of driving the elbows down.",
      "Shrugging the shoulders into the ears instead of keeping them active and down.",
    ],
  },
  {
    name: "Hip Thrust",
    category: "Hinge",
    muscles: "Glutes, hamstrings",
    howTo: [
      "Set up with your upper back against a bench, knees bent, feet flat on the floor.",
      "Roll the bar into the crease of your hips. Use a pad if the pressure bothers you.",
      "Brace, tuck your chin to your chest, and drive through your feet — push the floor away and extend your hips up.",
      "Lock out hard at the top — full hip extension, knees in line with toes, ribs down.",
      "Squeeze the glutes at the top, then lower under control. Don't let the bench slide.",
    ],
    why: "The best direct glute builder there is. Strong glutes drive every explosive movement — sprinting, jumping, deadlifting, changing direction — and protect your lower back and knees. If your glutes are weak, everything downstream suffers.",
    mistakes: [
      "Hyperextending the lower back instead of finishing with the glutes.",
      "Flaring the ribs and arching instead of keeping the core locked.",
      "Stopping short of full hip extension (no lockout = no glute squeeze).",
      "Driving through the toes instead of the whole foot.",
    ],
  },
];
