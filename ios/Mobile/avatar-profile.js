export const AVATARS=[
 {id:'traveler',name:'Traveler',emoji:'🧭',color:'#fff0e3'},
 {id:'boy',name:'Boy',emoji:'👦',color:'#dfefff'},
 {id:'girl',name:'Girl',emoji:'👧',color:'#f6e6ff'},
 {id:'robot',name:'Robot',emoji:'🤖',color:'#e4edf7'},
 {id:'alien',name:'Alien',emoji:'👽',color:'#e5f8eb'},
 {id:'cat',name:'Cool cat',emoji:'😼',color:'#fff2cc'},
 {id:'dinosaur',name:'Dino',emoji:'🦖',color:'#e8f5d9'},
 {id:'unicorn',name:'Unicorn',emoji:'🦄',color:'#fce4f1'},
 {id:'ghost',name:'Ghost',emoji:'👻',color:'#ece9ff'}
];
const KEY='safr-avatar-profile-v1';
export function normalizeProfile(value){return {name:typeof value?.name==='string'?value.name.trim().slice(0,32):'',avatar:AVATARS.some(a=>a.id===value?.avatar)?value.avatar:'traveler'}};
export function readProfile(){try{return normalizeProfile(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return normalizeProfile({})}}
export function saveProfile(value){const profile=normalizeProfile(value);localStorage.setItem(KEY,JSON.stringify(profile));return profile}
export function profileMarker(mode){
 const a=AVATARS.find(a=>a.id===readProfile().avatar);
 if(a.id==='traveler')return null;
 const type=mode==='bicycle'?'bike':'walk';
 return `<div class="avatar-map-marker" role="img" aria-label="${a.name}, ${type==='bike'?'cycling':'walking'}"><div class="avatar-map-face" style="--avatar-color:${a.color}"><span aria-hidden="true">${a.emoji}</span></div><span class="avatar-mode"><svg aria-hidden="true"><use href="#i-${type}"/></svg></span><i class="avatar-point"></i></div>`;
}
export function installAvatarProfile({onChange,toast}){
 const settings=document.getElementById('preferences-dialog');
 const entry=document.createElement('button');entry.className='profile-entry';entry.type='button';entry.setAttribute('aria-label','Edit your profile and map avatar');
 settings.querySelector('.dialog-head').after(entry);
 const dialog=document.createElement('dialog');dialog.id='avatar-dialog';dialog.setAttribute('aria-labelledby','avatar-title');
 dialog.innerHTML=`<div class="dialog-head"><h2 id="avatar-title">Profile</h2><button class="icon-button" aria-label="Cancel profile changes">×</button></div><div class="avatar-preview"><div id="avatar-preview-face" aria-hidden="true"></div><strong id="avatar-preview-name"></strong></div><label class="profile-name-label" for="profile-display-name">Name <span>Optional</span></label><input id="profile-display-name" maxlength="32" placeholder="Your name" autocomplete="nickname"><h3 class="avatar-heading">Avatar</h3><div class="avatar-grid" role="group" aria-label="Map avatar">${AVATARS.map(a=>`<button type="button" data-avatar="${a.id}" aria-label="${a.name}" aria-pressed="false"><span class="avatar-choice-face" style="background:${a.color}" aria-hidden="true">${a.emoji}</span><span>${a.name}</span><i aria-hidden="true">✓</i></button>`).join('')}</div><button id="save-avatar-profile" class="primary full">Save</button>`;
 document.body.append(dialog);
 let draft=readProfile();const input=dialog.querySelector('input');
 function refreshEntry(){const p=readProfile(),a=AVATARS.find(a=>a.id===p.avatar);entry.replaceChildren();const face=document.createElement('span');face.className='profile-entry-face';face.style.background=a.color;face.textContent=a.emoji;const copy=document.createElement('span'),name=document.createElement('strong'),hint=document.createElement('small');name.textContent=p.name||'Your profile';hint.textContent='Name & map avatar';copy.append(name,hint);const chevron=document.createElement('span');chevron.className='profile-entry-chevron';chevron.textContent='›';entry.append(face,copy,chevron)}
 function render(){const a=AVATARS.find(a=>a.id===draft.avatar);const face=document.getElementById('avatar-preview-face');face.textContent=a.emoji;face.style.background=a.color;document.getElementById('avatar-preview-name').textContent=input.value.trim()||a.name;dialog.querySelectorAll('[data-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===draft.avatar)))}
 entry.onclick=()=>{draft=readProfile();input.value=draft.name;render();settings.close();dialog.showModal()};
 dialog.querySelector('.icon-button').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{draft.avatar=b.dataset.avatar;render()});input.addEventListener('input',render);
 dialog.querySelector('#save-avatar-profile').onclick=()=>{try{saveProfile({...draft,name:input.value});refreshEntry();onChange();dialog.close();toast('Profile saved. Your map avatar is updated.')}catch{toast('Could not save your profile. Please try again.')}};
 dialog.addEventListener('close',()=>{settings.showModal();entry.focus()});refreshEntry();
}
