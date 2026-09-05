// ============================================================================
// WARMUPS & CONDITIONING — client portal reference
// ----------------------------------------------------------------------------
// Shows up in the Client Portal (/clients) behind the passcode gate.
//
// To add a routine: copy one object in the array below, change the fields,
// and save. It appears in the portal after the next publish.
//
// Fields:
//   name        Routine name
//   category    "Plyometric Warm-up" or "No-Equipment Workout" (drives filter)
//   purpose     What it's for / when to use it
//   duration    Approximate time (short string)
//   steps       The routine — array of strings (one per step / round / movement)
//   coaching    Key coaching cues or notes
// ============================================================================

export type Warmup = {
  name: string;
  category:
    | "General Warm-up"
    | "Plyometric Warm-up"
    | "Plyometrics"
    | "Isometrics"
    | "No-Equipment Workout";
  purpose: string;
  duration: string;
  steps: string[];
  coaching: string;
};

export const warmups: Warmup[] = [
  // ---------------- PLYOMETRIC WARM-UPS (pre-heavy-lift primers) ----------------
  {
    name: "Squat-Day Primer",
    category: "Plyometric Warm-up",
    purpose: "Fire up the quads, glutes, and CNS before heavy squats. Explosive work before the bar teaches your nervous system to recruit fast — so your working sets feel lighter.",
    duration: "5–8 min",
    steps: [
      "30 sec jumping jacks — easy, just get warm.",
      "2 × 5 vertical jumps — reach up hard, land soft and quiet, reset each rep.",
      "2 × 3 broad jumps — explode forward, stick the landing in a quarter squat.",
      "3 × 5 bodyweight jump squats — drop into a quarter squat, jump as high as you can, land controlled.",
      "1 × 5 tuck jumps — drive knees to chest, land soft. Stop if form breaks.",
      "Rest 60–90 sec, then start your first barbell warm-up set.",
    ],
    coaching:
      "Intent over exhaustion — every rep is max effort with perfect landing. This is a primer, not a workout. If your legs feel heavy after, you did too much. Cut the volume, keep the intensity.",
  },
  {
    name: "Bench-Day Primer",
    category: "Plyometric Warm-up",
    purpose: "Prime the upper body for pressing — wake up the chest, shoulders, and triceps with explosive push patterns so the bar moves fast off your chest.",
    duration: "5 min",
    steps: [
      "20 arm circles forward + 20 back — loosen the shoulders.",
      "2 × 5 plyometric push-ups — explode up so your hands leave the floor, land soft. Drop to knees if needed.",
      "2 × 5 explosive med-ball chest passes (or clap push-ups if you have one) — drive the ball away hard.",
      "1 × 5 strict push-ups, slow eccentric (3 sec down) — finish with control.",
      "Rest 60 sec, then start your first empty-bar bench warm-up set.",
    ],
    coaching:
      "Speed is the point. Each explosive rep should feel snappy — that's the CNS firing. Keep the rep count low; you're priming, not burning out the muscles you're about to load.",
  },
  {
    name: "Deadlift-Day Primer",
    category: "Plyometric Warm-up",
    purpose: "Activate the posterior chain and hips before heavy pulls — teach your glutes and hamstrings to fire fast so the bar leaves the floor with authority.",
    duration: "5–8 min",
    steps: [
      "30 sec high knees — quick and light, wake up the hips.",
      "2 × 5 vertical jumps — reach hard, land quiet.",
      "2 × 3 broad jumps — explode forward, stick the landing hips-back.",
      "3 × 5 kettlebell or bodyweight swings — snap the hips hard, squeeze the glutes at the top.",
      "1 × 5 glute bridges — 2-sec squeeze at the top of each rep.",
      "Rest 90 sec, then start your first deadlift warm-up set.",
    ],
    coaching:
      "The hinge and snap are everything — every movement here should finish with a hard glute squeeze. If your lower back feels it instead of your glutes, slow down and reset your technique before adding the bar.",
  },
  {
    name: "Universal Dynamic Warm-up",
    category: "Plyometric Warm-up",
    purpose: "A general warm-up you can run before any heavy session — raises core temperature, takes the joints through range, and switches the nervous system on.",
    duration: "5 min",
    steps: [
      "60 sec jumping jacks — steady pace, full range.",
      "10 leg swings each side (front-to-back and side-to-side) — control the swing, don't flail.",
      "10 hip circles each direction — open the hips up.",
      "10 arm circles forward + 10 back.",
      "10 bodyweight squats — full depth, slow and controlled.",
      "10 alternating lunges — step out, drop the back knee, drive back up.",
      "5 inchworms — walk hands out to a plank, walk feet back in.",
    ],
    coaching:
      "Move with purpose — not a casual stroll, not a sprint. You should feel warm and slightly elevated, not tired. Add the specific primer (squat/bench/deadlift) on top of this for heavy days.",
  },

  // ---------------- NO-EQUIPMENT WORKOUTS ----------------
  {
    name: "Full-Body Burner",
    category: "No-Equipment Workout",
    purpose: "A complete full-body session when you can't get to a gym. Hits every major movement pattern with just your bodyweight.",
    duration: "20–25 min",
    steps: [
      "Warm-up: 2 rounds — 20 jumping jacks, 10 squats, 10 push-ups, 10 lunges (5 each leg).",
      "Circuit — 4 rounds, 45 sec work / 15 sec rest:",
      "  • Bodyweight squats",
      "  • Push-ups (knees if needed to keep moving)",
      "  • Reverse lunges — alternate legs",
      "  • Plank shoulder taps",
      "  • Glute bridges",
      "Finisher: 5 rounds — 10 burpees + 10 mountain climbers (each leg). Rest 30 sec between rounds.",
      "Cool down: 60 sec each — child's pose, couch stretch, standing forward fold.",
    ],
    coaching:
      "Keep moving through the circuit — the 15-sec rest is a transition, not a break. Quality over speed on every rep: full squat depth, full lockout on push-ups, controlled lunges. Scale push-ups to knees or incline before you let form slide.",
  },
  {
    name: "Lower-Body Crusher (No Weights)",
    category: "No-Equipment Workout",
    purpose: "Builds leg strength and endurance with zero equipment — high-volume squats, lunges, and jumps to torch the quads and glutes.",
    duration: "20 min",
    steps: [
      "Warm-up: 1 min jumping jacks + 10 bodyweight squats + 10 lunges.",
      "Circuit — 4 rounds, 40 sec work / 20 sec rest:",
      "  • Bodyweight squats (full depth)",
      "  • Jump squats",
      "  • Reverse lunges — alternate legs",
      "  • Wall sit — hold the bottom of a squat against a wall",
      "  • Single-leg glute bridges — per side",
      "Finisher: 3 rounds — 20 sec max-effort jump squats, 40 sec wall sit. No rest between, 60 sec between rounds.",
    ],
    coaching:
      "The wall sit is where it gets real — sink to a real 90° and hold. If your knees scream, come up a touch but don't bail. On jump squats, land soft every single rep; the eccentric is what builds the legs.",
  },
  {
    name: "Upper-Body Push & Pull (No Weights)",
    category: "No-Equipment Workout",
    purpose: "Hits the chest, shoulders, back, and arms with just a floor and something to hang from — build and maintain upper-body strength anywhere.",
    duration: "15–20 min",
    steps: [
      "Warm-up: 20 arm circles each way + 10 slow push-ups + 30-sec dead hang (if you have a bar).",
      "Circuit — 4 rounds, 40 sec work / 20 sec rest:",
      "  • Push-ups",
      "  • Pike push-ups (shoulders) — fold at hips, press your head toward the floor",
      "  • Plank shoulder taps",
      "  • Superman holds — lie face-down, lift chest and legs, hold",
      "  • Close-grip (diamond) push-ups — triceps",
      "Finisher: 3 rounds — max push-ups in 30 sec, then 30 sec rest.",
      "If you have a pull-up bar: add 3 × max pull-ups before the finisher.",
    ],
    coaching:
      "Pike push-ups build toward the overhead press — fold hard at the hips so most of your weight stacks over your hands. On push-ups, lock the core so your hips don't sag; a straight line from head to heels is non-negotiable.",
  },
  {
    name: "Conditioning & Core Engine",
    category: "No-Equipment Workout",
    purpose: "A high-intensity conditioning session that builds your engine and a rock-solid core — no equipment, just grit.",
    duration: "18 min",
    steps: [
      "Warm-up: 1 min jumping jacks + 10 squats + 30-sec plank.",
      "EMOM (every minute on the minute) — 8 minutes:",
      "  • Minute 1: 10 burpees",
      "  • Minute 2: 15 mountain climbers (each leg)",
      "  • Minute 3: 10 jump squats",
      "  • Minute 4: 30-sec plank",
      "Repeat for 2 total rounds (8 min). Finish each minute's reps, rest the remainder.",
      "Core finisher — 3 rounds, no rest between exercises, 30 sec between rounds:",
      "  • 20 sec hollow-body hold",
      "  • 10 dead bugs (each side)",
      "  • 10 leg raises",
      "  • 30-sec plank",
    ],
    coaching:
      "The hollow-body hold is your anchor — lower back glued to the floor the entire time. If it arches, your core has given up before the timer did. On burpees, drop your chest to the floor — no half-reps when you're tired, that's where the work actually happens.",
  },

  // ---------------- GENERAL WARM-UPS ----------------
  {
    name: "5-Minute General Warm-up",
    category: "General Warm-up",
    purpose: "A simple, do-it-anywhere warm-up that raises your heart rate, takes your joints through range, and gets you ready to train. Run this before any session.",
    duration: "5 min",
    steps: [
      "60 sec jumping jacks — steady pace, full range.",
      "10 leg swings each side — front-to-back, then side-to-side.",
      "10 hip circles each direction.",
      "10 arm circles forward + 10 back.",
      "10 bodyweight squats — full depth, controlled.",
      "10 alternating lunges — step out, drop the knee, drive back.",
      "5 inchworms — walk hands to plank, walk feet back in.",
      "30-sec easy jog or march in place to finish.",
    ],
    coaching:
      "Move with purpose — not a stroll, not a sprint. You should feel warm and slightly elevated, not tired. This is the floor; add a specific primer (squat/bench/deadlift) on top for heavy days.",
  },
  {
    name: "Mobility & Joint Prep",
    category: "General Warm-up",
    purpose: "Slower mobility-focused warm-up for stiff days or before heavier sessions — opens up the hips, shoulders, and spine so you can hit full range with control.",
    duration: "8–10 min",
    steps: [
      "1 min easy jog or jumping jacks — raise core temperature.",
      "8 world's greatest stretch each side — lunge out, drop the elbow, rotate the chest.",
      "8 90/90 hip switches each side — sit tall, rotate the knees side to side.",
      "10 cat-cow — flow through full spine flexion and extension.",
      "8 thoracic rotations each side — from all fours, reach one arm under and through, then up to the ceiling.",
      "10 glute bridges — 2-sec squeeze at the top.",
      "8 cossack squats each side — sink side to side, open the adductors.",
      "30-sec dead hang (if a bar is available) — decompress and open the shoulders.",
    ],
    coaching:
      "Mobility is controlled range, not forcing positions. Move through each rep slowly and breathe into the stretch — if a position feels stuck, hold it for a breath and relax into it rather than bouncing.",
  },

  // ---------------- PLYOMETRICS (standalone training) ----------------
  {
    name: "Lower-Body Plyo Session",
    category: "Plyometrics",
    purpose: "A standalone plyometric session to build explosive lower-body power — vertical and horizontal jumping, landing mechanics, and reactive strength.",
    duration: "15–20 min",
    steps: [
      "Warm-up: 2 min jog + 10 squats + 10 lunges + 5 inchworms.",
      "Circuit — 3 rounds, 45 sec work / 45 sec rest:",
      "  • Vertical jumps — reach max height, land soft and quiet",
      "  • Broad jumps — explode forward, stick the landing in a quarter squat",
      "  • Lateral bounds — jump side to side, stick each landing",
      "  • Single-leg bounds — hop forward on one leg, switch",
      "Power finisher — 3 rounds, 30 sec work / 60 sec rest:",
      "  • Box jumps (or jump onto a sturdy bench/step)",
      "  • Depth drops (step off a low step, land soft, hold 2 sec)",
      "Cool down: 2 min easy walk + couch stretch 60 sec each side.",
    ],
    coaching:
      "Quality over quantity — every rep is a max-effort jump with a perfect, quiet landing. If your landings get loud or your knees cave, stop the set early. Plyometrics train the nervous system, so keep reps low and rest long. Land like a cat, not a bag of hammers.",
  },
  {
    name: "Upper-Body Plyo Session",
    category: "Plyometrics",
    purpose: "Explosive upper-body power — trains the chest, shoulders, and back to produce force fast, with controlled landings to absorb it.",
    duration: "12–15 min",
    steps: [
      "Warm-up: 20 arm circles each way + 10 slow push-ups + 30-sec dead hang.",
      "Circuit — 4 rounds, 40 sec work / 40 sec rest:",
      "  • Plyometric push-ups — explode up, hands leave the floor, land soft",
      "  • Clap push-ups — same idea, clap mid-air (scale to knees if needed)",
      "  • Explosive med-ball chest pass (or push-up if no ball) — drive it away hard",
      "  • Plyo pike push-ups — explosive press in the pike position",
      "Power finisher — 3 rounds, 30 sec work / 60 sec rest:",
      "  • Max-effort explosive push-ups (scale height to what you can land safely)",
      "Cool down: 60 sec child's pose + 60 sec doorway chest stretch.",
    ],
    coaching:
      "Speed and landing control. Each rep should be snappy — that's the CNS firing. Drop to knees or reduce the air time before you let your elbows collapse on landing. Better 4 perfect reps than 8 sloppy ones.",
  },
  {
    name: "Reactive & Change-of-Direction",
    category: "Plyometrics",
    purpose: "Builds the reactive strength and agility that transfers to sport — quick ground contacts, multidirectional jumps, and rapid direction changes.",
    duration: "15 min",
    steps: [
      "Warm-up: 2 min jog + 10 squats + 10 lateral lunges.",
      "Circuit — 3 rounds, 30 sec work / 60 sec rest:",
      "  • Pogo jumps — bounce on the balls of your feet, quick and stiff, minimal knee bend",
      "  • Skater jumps — leap side to side, land on one leg, stick it",
      "  • Tuck jumps — drive knees to chest, land soft",
      "  • Cone or marker drills — sprint 5 yards, plant, sprint back (3 reps)",
      "Agility finisher — 4 rounds: 5-10-5 shuttle (sprint 5 yards, 10 back, 5 forward). Rest 60 sec between.",
      "Cool down: 2 min easy walk + standing forward fold.",
    ],
    coaching:
      "Pogo jumps are the secret weapon — short, stiff ground contacts train the Achilles and calves to act like springs. Keep the ankle stiff and the bounce quick. On direction changes, plant hard and drive — don't tiptoe through the turn.",
  },

  // ---------------- ISOMETRICS ----------------
  {
    name: "Isometric Strength Holds",
    category: "Isometrics",
    purpose: "Build max tension and positional strength by holding positions under load — no movement, just pure force production. Great for sticking points and building confidence at hard positions.",
    duration: "10–15 min",
    steps: [
      "Pick 2–3 positions from your main lifts to strengthen (e.g. bottom of squat, mid-pull, 1-inch off chest on bench).",
      "Squat pause holds — descend to your deepest squat, hold for 5 sec, stand up. 3 reps × 3 sets at moderate load.",
      "Deadlift mid-pull holds — pull to just below the knee, hold 5 sec, lower. 3 reps × 3 sets.",
      "Bench 1-inch hold — lower to 1 inch off the chest, hold 5 sec, press up. 3 reps × 3 sets.",
      "Finisher: 3 × 20-sec wall sit at 90° and 3 × 20-sec plank, max tension — squeeze everything.",
    ],
    coaching:
      "Isometrics are about max tension, not max load. Brace hard, squeeze every muscle, and own the position. The 5-second holds should feel like a fight — if they're easy, add weight or hold longer. Pause work at your weak point is the fastest way to break through a plateau.",
  },
  {
    name: "Isometric Core & Stability",
    category: "Isometrics",
    purpose: "Build the deep core stability that holds your spine together under heavy loads — planks, hollow holds, and anti-rotation work.",
    duration: "10 min",
    steps: [
      "Circuit — 3 rounds, 40 sec hold / 20 sec rest:",
      "  • Plank — forearms down, straight line head to heels, squeeze glutes and abs",
      "  • Side plank — each side, top hip stacked, don't let the hips sag",
      "  • Hollow-body hold — lower back glued to floor, arms and legs off the ground",
      "  • Dead bug hold — opposite arm and leg extended, core braced, back flat",
      "  • Wall sit — 90° at hips and knees, weight in heels",
      "Anti-rotation finisher: 3 × 20 sec pallof press hold each side (or resisted band press — push arms straight out and resist the sideways pull).",
    ],
    coaching:
      "Every hold is a max-tension brace — squeeze the glutes, pull the ribs down, and lock the core. If your lower back arches on the hollow hold or your hips sag on the plank, the set is over. Quality position beats more seconds with sloppy form.",
  },
  {
    name: "Isometric Finisher (No Equipment)",
    category: "Isometrics",
    purpose: "A quick bodyweight isometric finisher you can tack onto any session — build tension and endurance with zero equipment.",
    duration: "8 min",
    steps: [
      "Wall sit — hold at 90° for 45 sec. Rest 20 sec.",
      "Plank — 45 sec. Rest 20 sec.",
      "Hollow-body hold — 30 sec. Rest 20 sec.",
      "Side plank — 30 sec each side. Rest 20 sec.",
      "Horse stance (static hold in a deep, wide stance) — 30 sec. Rest 20 sec.",
      "Repeat the whole circuit for 2 total rounds.",
    ],
    coaching:
      "Max tension on every hold — don't just survive the time, own it. Squeeze the working muscles hard and breathe shallow through the holds. If position breaks, come out of it slightly rather than grinding in a bad position.",
  },

  // ---------------- ADDED: General warm-ups ----------------
  {
    name: "Full-Body RAMP Warm-up",
    category: "General Warm-up",
    purpose: "A go-anywhere general warm-up that Raises temperature, Activates key muscles, Mobilises joints and Primes the nervous system before any session.",
    duration: "6–8 min",
    steps: [
      "2 min easy cardio — bike, row, or brisk walk to raise your heart rate.",
      "10 leg swings each leg (front-to-back and side-to-side).",
      "10 arm circles forward + 10 back, then 10 band pull-aparts.",
      "10 bodyweight squats — slow and full depth.",
      "10 walking lunges with a torso twist.",
      "10 scapular push-ups + 10 cat-cows for the spine.",
    ],
    coaching:
      "Move through a full range and gradually build speed. You should feel warm and loose, not tired. Spend extra time on whatever you're about to train hard.",
  },
  {
    name: "Lower-Body Mobility Flow",
    category: "General Warm-up",
    purpose: "Open the hips, ankles and knees before squats, lunges or running so you hit clean positions without fighting stiffness.",
    duration: "5 min",
    steps: [
      "World's greatest stretch — 5 reps each side.",
      "Deep squat hold with pry — 45 sec, gently push knees out with elbows.",
      "Ankle rocks against a wall — 10 each side.",
      "90/90 hip switches — 10 total.",
      "Glute bridges — 15 reps, squeeze hard at the top.",
    ],
    coaching:
      "Breathe into each position and relax into the stretch. This is about reaching your positions, not forcing them.",
  },

  // ---------------- ADDED: Plyometrics ----------------
  {
    name: "Lower-Body Power Circuit",
    category: "Plyometrics",
    purpose: "Build explosive leg power and rate of force development. Best done fresh, early in a session, when you can move fast.",
    duration: "12–15 min",
    steps: [
      "Box jumps — 4 × 3, step down between reps, land soft and quiet.",
      "Broad jumps — 4 × 3, explode forward and stick the landing.",
      "Lateral bounds — 3 × 6 total, control each single-leg landing.",
      "Depth jumps (low box) — 3 × 4, minimise ground contact time.",
      "Rest 90 sec between sets — quality over quantity.",
    ],
    coaching:
      "Every rep is maximal intent with a clean landing. Stop the set the moment jumps get slow or sloppy — this trains power, not conditioning.",
  },
  {
    name: "Upper-Body & Core Power",
    category: "Plyometrics",
    purpose: "Develop upper-body and rotational power for pressing and athletic carryover.",
    duration: "10–12 min",
    steps: [
      "Plyo push-ups — 4 × 4, push hard enough that the hands leave the floor.",
      "Medicine-ball chest pass into a wall — 4 × 5, throw explosively.",
      "Med-ball overhead slams — 4 × 6, drive from the core.",
      "Rotational med-ball throws — 3 × 5 each side.",
      "Rest 90 sec between sets.",
    ],
    coaching:
      "Reset fully between reps and throw/press with maximum speed. Light implement, fast intent.",
  },

  // ---------------- ADDED: Isometrics ----------------
  {
    name: "Tendon-Strength Isometrics",
    category: "Isometrics",
    purpose: "Build joint and tendon resilience with long holds — great on deload weeks or for cranky knees, elbows and shoulders.",
    duration: "10 min",
    steps: [
      "Spanish squat hold (band behind knees) — 3 × 30 sec.",
      "Wall sit — 3 × 45 sec.",
      "Isometric push-up hold (halfway down) — 3 × 20 sec.",
      "Bar dead hang — 3 × max hold.",
      "Rest 45–60 sec between holds.",
    ],
    coaching:
      "Aim for hard, controlled tension. Isometrics build strength at the held angle and are gentle on the joints — perfect when you need to train around soreness.",
  },
  {
    name: "Anti-Movement Core Holds",
    category: "Isometrics",
    purpose: "Bulletproof the trunk with anti-extension, anti-rotation and anti-lateral-flexion holds that transfer directly to heavy lifts.",
    duration: "8–10 min",
    steps: [
      "RKC plank (max tension) — 3 × 20 sec.",
      "Side plank — 3 × 30 sec each side.",
      "Copenhagen plank (adductors) — 2 × 20 sec each side.",
      "Hollow-body hold — 3 × 30 sec.",
      "Rest 30–45 sec between holds.",
    ],
    coaching:
      "Brace like you're about to be punched and keep breathing. Own the position — shorten the hold before letting form break.",
  },
];
