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
  {
    name: "Front Squat",
    category: "Squat",
    muscles: "Quads, upper back, core, glutes",
    howTo: [
      "Set the bar at upper-chest height. Approach with the bar across the front of your shoulders — resting on your delts, not held by the arms.",
      "Take a grip just outside shoulder-width. Drive your elbows up and forward so your upper arms are roughly parallel to the floor — this is the 'front rack'. Fingers can relax; the bar sits on the shelf your delts make.",
      "Unrack, step back, and set your stance around shoulder-width with toes slightly out. Brace hard.",
      "Descend by sitting straight down — keep the torso as upright as possible and the elbows high the whole way. Let the knees travel forward over the toes.",
      "Hit full depth, then drive up through the mid-foot. Keep elbows up — the moment they drop, the bar rolls forward. Lock out tall.",
    ],
    why: "The most quad-dominant barbell squat and the base of the clean. The upright torso hammers the quads and forces huge core and upper-back strength to keep the bar racked. It's easier on the lower back than the back squat and directly builds Olympic-lifting positions.",
    mistakes: [
      "Elbows dropping — the bar rolls off the shelf onto the wrists.",
      "Rounding forward out of the hole instead of staying upright.",
      "Gripping the bar in the palms (white-knuckling) instead of resting it on the delts.",
      "Cutting depth because the position feels awkward — build wrist/thoracic mobility instead.",
    ],
  },
  {
    name: "Sumo Deadlift",
    category: "Hinge",
    muscles: "Glutes, adductors, quads, back, traps",
    howTo: [
      "Take a wide stance with toes pointed out 30–45°, shins roughly vertical, bar over mid-foot and against the shins.",
      "Drop your hips, push your knees out over your toes, and grip the bar inside your legs with straight arms.",
      "Set your chest tall, pull the slack out of the bar, and wedge your hips down and forward — get tension everywhere before you pull.",
      "Push the floor apart with your feet and stand the bar up, keeping it dragging up your legs. Knees and hips extend together.",
      "Lock out tall with hips fully through. Lower under control, hinging back and letting the knees rebend.",
    ],
    why: "A powerlifting staple that shortens the range of motion and keeps the torso more upright than conventional — easier on the lower back and huge for glutes, adductors, and quads. Great for lifters with long limbs or cranky backs.",
    mistakes: [
      "Letting the knees cave in instead of shoving them out over the toes.",
      "Hips shooting up first, turning it into a stiff-leg pull.",
      "Not taking the slack out — jerking the bar and losing position.",
      "Bar drifting away from the shins instead of dragging up the legs.",
    ],
  },
  {
    name: "Close-Grip Bench Press",
    category: "Press",
    muscles: "Triceps, chest, front delts",
    howTo: [
      "Set up like a normal bench press but grip the bar about shoulder-width (hands roughly 8–10 inches apart), wrists stacked over elbows.",
      "Pinch the shoulder blades together, plant the feet, and unrack.",
      "Lower the bar to your lower chest / upper stomach, keeping the elbows tucked close to your sides — not flared.",
      "Touch lightly, then drive the bar straight up, leading with the triceps until lockout.",
      "Keep the wrists neutral and the grip no narrower than shoulder-width to protect the wrists and elbows.",
    ],
    why: "The best barbell builder for lockout strength and triceps mass — directly carries over to a bigger bench press and stronger overhead pressing. The tucked-elbow path is also friendlier on the shoulders than a wide grip.",
    mistakes: [
      "Gripping too narrow — hands touching wrecks the wrists and offers no extra benefit.",
      "Flaring the elbows out, which turns it back into a chest press.",
      "Letting the wrists bend back under the load.",
      "Bouncing the bar off the chest instead of controlling the touch.",
    ],
  },
  {
    name: "Power Clean",
    category: "Olympic",
    muscles: "Full posterior chain, traps, quads, explosive power",
    howTo: [
      "Set up like a deadlift with the bar over mid-foot, shins to the bar, chest up, and a hook grip just outside the knees.",
      "First pull: break the bar off the floor by pushing the legs down, keeping the back angle constant and the bar close to the shins.",
      "As the bar passes the knees, drive the hips forward violently and stand tall — 'jump' the bar up while keeping it brushing the thighs (the second pull / triple extension of ankles, knees, hips).",
      "Shrug and pull yourself under the bar, whipping the elbows around fast to catch it in the front rack on your shoulders.",
      "Receive in a quarter-front-squat, elbows high, then stand tall to finish. Reset each rep from the floor.",
    ],
    why: "The go-to lift for building explosive power and rate of force development — the ability to produce force fast. It trains full-body coordination and teaches you to accelerate a barbell, carrying over to sprinting, jumping, and every athletic movement.",
    mistakes: [
      "Pulling early with the arms instead of exploding with the hips first.",
      "The bar swinging out away from the body instead of staying close.",
      "Catching with low, slow elbows so the bar crashes onto the wrists.",
      "'Muscling' the bar up slowly instead of being violent and fast, then dropping under it.",
    ],
  },
  {
    name: "Clean & Jerk",
    category: "Olympic",
    muscles: "Full body — legs, back, shoulders, explosive power",
    howTo: [
      "Perform a clean: pull the bar from the floor with triple extension and receive it in a full front squat, then stand tall to the front rack.",
      "Reset your breath and brace. Dip straight down a few inches by bending the knees, keeping the torso vertical.",
      "Drive explosively out of the dip and punch the bar off the shoulders, extending the legs hard.",
      "Split or push under the bar — drop into a split stance (jerk) or quarter squat (push jerk) as you lock the arms out overhead.",
      "Stabilize the bar overhead with the shoulders active, then recover the feet to a standing position with the bar locked out.",
    ],
    why: "The ultimate expression of full-body power — it's why it's contested in the Olympics. It develops maximal explosive strength from the floor to overhead and demands total-body coordination, mobility, and stability under load.",
    mistakes: [
      "Dipping forward (bending at the hips) instead of straight down for the jerk.",
      "Pressing the bar out slowly instead of driving with the legs and dropping under.",
      "Soft, bent arms overhead instead of a locked, active-shoulder lockout.",
      "Losing the front rack on the clean so there's no solid base to jerk from.",
    ],
  },
  {
    name: "Snatch (Power Snatch)",
    category: "Olympic",
    muscles: "Full body — posterior chain, shoulders, explosive power",
    howTo: [
      "Set up over the bar with a wide (snatch) grip — hands out near the collars. Shins to the bar, chest up, hook grip.",
      "First pull: push the legs down and lift the bar off the floor, keeping the back angle and the bar close.",
      "As the bar reaches the hips, extend violently — jump and shrug, driving the bar up in one explosive motion.",
      "Pull yourself under the bar fast and punch the arms to lock the bar out directly overhead in one movement.",
      "Receive in a quarter-overhead-squat with the bar stacked over the mid-foot, then stand tall to finish.",
    ],
    why: "The fastest, most technical lift in the gym — moving a barbell from the floor to overhead in one motion. It builds elite explosive power, overhead stability, and mobility, and trains the nervous system to fire fast and coordinated.",
    mistakes: [
      "Bending the arms early instead of keeping them long until full extension.",
      "The bar looping out in front instead of staying tight to the body.",
      "Not getting fully under the bar — catching high with soft arms.",
      "Pressing the bar out overhead rather than punching up and dropping under it.",
    ],
  },
  {
    name: "Push Press",
    category: "Olympic",
    muscles: "Shoulders, triceps, legs, core",
    howTo: [
      "Start with the bar in the front rack at your shoulders, grip just outside shoulder-width, elbows slightly in front of the bar.",
      "Brace the core and glutes. Dip straight down a few inches by bending the knees — torso stays vertical.",
      "Reverse hard: drive through the legs and use that momentum to launch the bar off the shoulders.",
      "As the bar leaves the shoulders, press the rest of the way and lock it out overhead, stacked over the shoulders and mid-foot.",
      "Lower under control back to the front rack and reset the brace before the next rep.",
    ],
    why: "Bridges the strict press and the jerk — the leg drive lets you move more weight overhead than a strict press, overloading the shoulders and triceps while teaching explosive leg-to-arm power transfer. A great strength and athletic-power builder.",
    mistakes: [
      "Dipping too deep or too slow so it turns into a squat instead of a quick dip-drive.",
      "Bending forward in the dip and pressing the bar out in front.",
      "Pressing with the arms before using the leg drive.",
      "Not finishing with a full, locked-out overhead position over the mid-foot.",
    ],
  },
  {
    name: "Farmer's Carry",
    category: "Strongman",
    muscles: "Grip, traps, core, upper back, legs",
    howTo: [
      "Set two heavy implements (farmer's handles, dumbbells, or trap bar) at your sides. Deadlift them up with a flat back and tall chest.",
      "Stand fully upright — shoulders back and down, ribs stacked over hips, core braced hard.",
      "Grip as hard as you can and take short, quick, controlled steps in a straight line.",
      "Keep the weights from swinging — stay tall and tight, breathe in short braced breaths.",
      "Walk the set distance or time, then set the weights down under control with a flat back.",
    ],
    why: "One of the most carryover-heavy exercises there is. It builds a crushing grip, thick traps, and a rock-solid core while conditioning the whole body under load — the definition of usable, real-world strongman strength.",
    mistakes: [
      "Letting the shoulders round forward and the chest collapse.",
      "Long, bouncy strides that let the weights swing and throw you off balance.",
      "Losing the core brace and leaning to one side.",
      "Dropping the weights carelessly instead of setting them down with control.",
    ],
  },
  {
    name: "Log Press",
    category: "Strongman",
    muscles: "Shoulders, triceps, chest, legs, core",
    howTo: [
      "Roll the log into your lap while seated on the floor or a box, or clean it from the floor. Grip the neutral handles inside the log.",
      "Clean the log to your chest in one motion, rolling it up the body and catching it high on the chest/shoulders with elbows up.",
      "Brace hard and dip the knees slightly, then drive the log overhead using leg drive (push press style).",
      "Lock the log out overhead with the arms straight and shoulders active, head 'through the window'.",
      "Lower under control back to the chest and reset before the next rep.",
    ],
    why: "The signature strongman overhead event. The thick, neutral-grip log and awkward clean build brutal shoulder, triceps, and upper-back strength plus the whole-body coordination to move an odd object overhead — far more demanding than a barbell press.",
    mistakes: [
      "Failing to keep the log high and tight on the chest between reps.",
      "Pressing with the arms only instead of using leg drive.",
      "Not getting the head through at lockout, leaving the log in front.",
      "Losing the brace and hyperextending the lower back under the load.",
    ],
  },
  {
    name: "Atlas Stone Lift",
    category: "Strongman",
    muscles: "Full posterior chain, biceps, core, hips",
    howTo: [
      "Straddle the stone with it between your feet, close to your shins. Squat down and wrap your arms under it, hands gripping the underside.",
      "Deadlift the stone to your lap by extending the hips — get it sitting on your thighs while you drop your hips under it.",
      "Re-grip: hug the stone high and tight to your chest, then explosively extend the hips to lift it.",
      "As the stone rises, drive the hips forward into it and stand, guiding it up to the platform or over the bar.",
      "Set or drop it on the target, then reset for the next rep. Use tacky/chalk for grip on real stones.",
    ],
    why: "The iconic strongman lift. Loading an awkward round object from the floor to a platform builds enormous posterior-chain, hip, and core strength through a full range — the ultimate test of picking up something heavy and awkward, exactly what real-world strength is about.",
    mistakes: [
      "Rounding the lower back aggressively without bracing (huge injury risk if untrained).",
      "Not using the lap as a resting point to re-grip on heavy stones.",
      "Trying to curl the stone with the arms instead of driving with the hips.",
      "Standing too far from the stone so it drifts away and the back takes over.",
    ],
  },
  {
    name: "Yoke Walk",
    category: "Strongman",
    muscles: "Core, traps, legs, whole-body stability",
    howTo: [
      "Duck under the yoke and settle the crossbar across your upper traps/rear delts, like a high-bar back squat.",
      "Grip the uprights, brace your core and back extremely hard, and stand the yoke up by driving through the legs.",
      "Find your balance, then take short, fast, choppy steps — keep the yoke from swaying side to side.",
      "Stay as tall and braced as possible; look ahead, not down. Keep the steps quick to minimize sway.",
      "Walk the set distance in a straight line, then set the yoke down under control.",
    ],
    why: "The heaviest loading in strongman — the yoke teaches your entire body to stay rigid and move under enormous weight. It builds a bulletproof core and back, huge trunk stability, and the bracing skill that carries over to every heavy lift.",
    mistakes: [
      "Long, slow strides that let the yoke rock and sway out of control.",
      "Losing the brace mid-walk and letting the spine round.",
      "Looking down at the feet instead of ahead, which pulls you forward.",
      "Panicking and rushing without balance instead of staying tall and tight.",
    ],
  },
];
