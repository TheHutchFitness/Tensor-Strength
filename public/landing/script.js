const header=document.querySelector('.nav-shell');const menu=document.querySelector('.menu');menu?.addEventListener('click',()=>{const open=header.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});document.querySelectorAll('.nav-shell nav a').forEach(a=>a.addEventListener('click',()=>header.classList.remove('open')));const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));document.querySelectorAll('.day-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.day-tabs button').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.workout-list').forEach(p=>p.classList.add('hidden'));button.classList.add('active');document.querySelector(`[data-panel="${button.dataset.day}"]`).classList.remove('hidden')}));

const coachingVideos=[
  ['Hill Sprints',1],['Weighted Dips · 45 lb',2],['Bench Press',3],['RDLs · Slow Eccentric',4],['Chest Press · Eccentric Overload',5],
  ["Barbell Farmer's Walk · 420 lb",6],['Sled Push',7],['Two-Month Squat Progress',8],['Med-Ball Rotations',9],['Posterior Chain & Conditioning',10],
  ['Bench Press · 20 lb PR',11],['Five-Minute Plank Record',12],['Squat · 555 lb',13],['Bench · 290 lb',14],['Deadlift · 560 lb',15],
  ['Rotational Power',16],['Deadlift · 300 lb (1×3)',17],['Weighted Step-Ups',18],['Sled Pulls · 240 lb',19]
];
const videoGrid=document.querySelector('#videoGrid');
if(videoGrid){coachingVideos.forEach(([label,index])=>{const card=document.createElement('article');card.className='video-card reveal';card.innerHTML=`<video controls playsinline preload="none" poster="https://tensorstrength.com/videos/coaching${index}-poster.jpg" aria-label="${label}"><source src="https://tensorstrength.com/videos/coaching${index}.mp4" type="video/mp4"></video><div class="video-card-label"><strong>${label}</strong><span>PLAY ↗</span></div>`;videoGrid.appendChild(card);observer.observe(card)});videoGrid.addEventListener('play',event=>{if(event.target.tagName==='VIDEO')videoGrid.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause()})},true)}

const toolWeight=document.querySelector('#toolWeight'),toolReps=document.querySelector('#toolReps'),toolResult=document.querySelector('#toolResult');
function updateOneRepMax(){const weight=Number(toolWeight?.value),reps=Number(toolReps?.value);if(!weight||!reps||reps<1||reps>15){toolResult.textContent='—';return}const estimate=reps===1?weight:weight*(1+reps/30);toolResult.textContent=String(Math.round(estimate/5)*5)}
[toolWeight,toolReps].forEach(input=>input?.addEventListener('input',updateOneRepMax));
