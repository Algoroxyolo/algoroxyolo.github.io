const root=document.documentElement;
const control=document.querySelector('#theme-toggle');
function setTheme(t){root.dataset.theme=t;control.textContent=t==='dark'?'Light mode':'Dark mode';control.setAttribute('aria-label','Switch to '+(t==='dark'?'light':'dark')+' mode');}
let initial='light';try{initial=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}
setTheme(initial);
control.addEventListener('click',()=>{const t=root.dataset.theme==='dark'?'light':'dark';setTheme(t);try{localStorage.setItem('theme',t)}catch{}});
const sections=[...document.querySelectorAll('.article section')];
const tocLinks=[...document.querySelectorAll('.toc a[href^="#"]')];
let scheduled=false;
function updateContents(){let active=null;const readingLine=Math.min(160,innerHeight*.25);for(const section of sections){if(section.getBoundingClientRect().top<=readingLine)active=section.id;else break;}for(const a of tocLinks){if(active&&a.getAttribute('href')==='#'+active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}scheduled=false;}
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateContents);}},{passive:true});addEventListener('resize',updateContents);updateContents();
