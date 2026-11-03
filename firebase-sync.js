import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut as firebaseSignOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const config={apiKey:'AIzaSyATAkQsftuIZM5n5MwtCQpf2bDtf0ZPj6o',authDomain:'mein-sport.firebaseapp.com',projectId:'mein-sport',storageBucket:'mein-sport.firebasestorage.app',messagingSenderId:'227856699553',appId:'1:227856699553:web:5b6e57723db87ea6abe0e0'};
const app=initializeApp(config), auth=getAuth(app), store=getFirestore(app), provider=new GoogleAuthProvider();
const KEY='meinSportDataV1',QUEUE='meinSportSyncQueueV1';
let user=null,unsubscribe=null,busy=false,ready=false,status='Nicht verbunden',lastCloud=null;
const kinds=['activities','metrics','favorites','settings'];
const clone=x=>JSON.parse(JSON.stringify(x));
function local(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}}
function pending(){try{return JSON.parse(localStorage.getItem(QUEUE))||{}}catch{return {}}}
function setPending(q){localStorage.setItem(QUEUE,JSON.stringify(q))}
function rowMap(rows){return new Map((rows||[]).filter(x=>x&&x.id).map(x=>[x.id,x]))}
function updateStatus(s){status=s;refreshUI()}
function refreshUI(){const el=document.getElementById('syncStatus');if(el)el.textContent=`${user?user.email+' · ':''}${status}`}
function localChange(before,after){
  let q=pending();
  for(const kind of kinds){const a=rowMap(before[kind]),b=rowMap(after[kind]);q[kind]??={};
    for(const [id,item] of b)if(JSON.stringify(a.get(id))!==JSON.stringify(item))q[kind][id]={value:item,at:Date.now()};
    for(const id of a.keys())if(!b.has(id))q[kind][id]={deleted:true,at:Date.now()};
  }
  setPending(q);if(user&&ready)syncNow();
}
function merge(localData,cloud,q){
 const next={version:localData.version||2};const merged={};
 for(const kind of kinds){
  const cloudRows=cloud?.[kind]||{};
  const map=new Map(Object.entries(cloudRows));
  // First connection: retain local entries absent from cloud, without overwriting cloud IDs.
  for(const [id,item] of rowMap(localData[kind]))if(!map.has(id))map.set(id,{value:item,at:0});
  for(const [id,change] of Object.entries(q[kind]||{}))map.set(id,change);
  merged[kind]=Object.fromEntries(map);
  next[kind]=[...map.values()].filter(x=>x&&!x.deleted&&x.value).map(x=>x.value);
 }
 return {next,merged};
}
async function syncNow(){
 if(!user||busy||!navigator.onLine)return;
 busy=true;updateStatus('Synchronisiere …');
 try{
  const uid=user.uid,ref=doc(store,'users',uid,'sync','main');
  const q=pending(),oldLocal=local();
  const result=await runTransaction(store,async tx=>{
    const snap=await tx.get(ref);const cloud=snap.exists()?snap.data():{};
    const {next,merged}=merge(oldLocal,cloud,q);
    if(!snap.exists() || kinds.some(k=>JSON.stringify(cloud[k]||{})!==JSON.stringify(merged[k]))) tx.set(ref,{...merged,updatedAt:Date.now()});return next;
  });
  // Changes made while transaction was running must not be cleared.
  const latest=pending(),remaining={};
  for(const kind of kinds){remaining[kind]={};for(const [id,change] of Object.entries(latest[kind]||{}))if(JSON.stringify(change)!==JSON.stringify(q[kind]?.[id]))remaining[kind][id]=change}
  setPending(remaining);
  // Preserve newer local changes while applying merged server data.
  for(const kind of kinds){const m=rowMap(result[kind]);for(const [id,change] of Object.entries(remaining[kind])){if(change.deleted)m.delete(id);else m.set(id,change.value)}result[kind]=[...m.values()]}
  localStorage.setItem(KEY,JSON.stringify(result));window.applyCloudData?.(result);
  updateStatus('Synchronisiert');
 }catch(err){console.error('Mein Sport Synchronisierung',err);updateStatus('Synchronisierung fehlgeschlagen: '+(err.code||err.message));}
 finally{busy=false;if(Object.values(pending()).some(o=>Object.keys(o||{}).length))setTimeout(syncNow,1500)}
}
async function signIn(){try{updateStatus('Google-Anmeldung …');await signInWithPopup(auth,provider)}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/cancelled-popup-request')try{await signInWithRedirect(auth,provider)}catch(err){updateStatus('Anmeldung fehlgeschlagen: '+err.code)}else updateStatus('Anmeldung fehlgeschlagen: '+(e.code||e.message))}}
async function signOut(){if(unsubscribe){unsubscribe();unsubscribe=null}ready=false;await firebaseSignOut(auth);updateStatus('Abgemeldet · Daten bleiben lokal auf diesem Gerät')}
window.meinSportSync={signIn,signOut,syncNow,localChange,refreshUI};
getRedirectResult(auth).catch(e=>updateStatus('Anmeldung fehlgeschlagen: '+e.code));
onAuthStateChanged(auth,u=>{
 if(unsubscribe){unsubscribe();unsubscribe=null}user=u;ready=!!u;
 if(!u){updateStatus('Nicht verbunden');return}
 updateStatus('Verbunden · Abgleich startet …');
 unsubscribe=onSnapshot(doc(store,'users',u.uid,'sync','main'),()=>{if(!busy)syncNow()},e=>updateStatus('Cloud-Fehler: '+e.code));
 syncNow();
});
window.addEventListener('online',()=>syncNow());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow()});
