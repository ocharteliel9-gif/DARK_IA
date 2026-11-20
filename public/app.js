const $ = (id) => document.getElementById(id);
const messagesEl = $("messages"), welcomeEl = $("welcome"), promptEl = $("prompt");
let chats = JSON.parse(localStorage.getItem("darkia_chats") || "[]");
let activeId = null, busy = false;

function save(){ localStorage.setItem("darkia_chats", JSON.stringify(chats)); }
function current(){ return chats.find(c => c.id === activeId); }
function newChat(){
  const chat = {id: crypto.randomUUID(), title:"Nuevo chat", messages:[]};
  chats.unshift(chat); activeId=chat.id; save(); renderAll();
  promptEl.focus();
}
function renderList(){
  $("chatList").innerHTML="";
  chats.forEach(chat=>{
    const el=document.createElement("div");
    el.className="chat-item"+(chat.id===activeId?" active":"");
    el.textContent=chat.title; el.title=chat.title;
    el.onclick=()=>{activeId=chat.id;renderAll();$("sidebar").classList.remove("open");};
    $("chatList").append(el);
  });
}
function safeText(text){
  return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function formatText(text){
  // Escape HTML first, then add basic code formatting.
  let out=safeText(text);
  out=out.replace(/```([\s\S]*?)```/g,(_,code)=>`<pre><code>${code.trim()}</code></pre>`);
  out=out.replace(/`([^`\n]+)`/g,"<code>$1</code>");
  return out;
}
function renderMessages(){
  const chat=current(); const list=chat?.messages||[];
  welcomeEl.hidden=list.length>0;
  messagesEl.innerHTML="";
  list.forEach(m=>{
    const row=document.createElement("div"); row.className="message "+m.role;
    if(m.role==="assistant"){
      const who=document.createElement("div");who.className="who";who.textContent="D";row.append(who);
    }
    const bubble=document.createElement("div");bubble.className="bubble";bubble.innerHTML=formatText(m.content);
    row.append(bubble);messagesEl.append(row);
  });
  if(busy){
    const row=document.createElement("div");row.className="message assistant";
    const who=document.createElement("div");who.className="who";who.textContent="D";
    const bubble=document.createElement("div");bubble.className="bubble typing";bubble.textContent="DARK IA está pensando…";
    row.append(who,bubble);messagesEl.append(row);
  }
  $("conversation").scrollTop=$("conversation").scrollHeight;
}
function renderAll(){renderList();renderMessages();}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}

async function send(text){
  const content=text.trim(); if(!content||busy)return;
  if(!current())newChat();
  const chat=current();
  chat.messages.push({role:"user",content});
  if(chat.title==="Nuevo chat")chat.title=content.slice(0,34)+(content.length>34?"…":"");
  promptEl.value=""; promptEl.style.height="auto"; busy=true;save();renderAll();renderList();
  $("sendBtn").disabled=true;
  try{
    const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chat.messages.slice(-30)})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Error al consultar la IA.");
    chat.messages.push({role:"assistant",content:data.answer});
  }catch(err){
    chat.messages.push({role:"assistant",content:"No pude completar la solicitud: "+err.message});
  }finally{
    busy=false;$("sendBtn").disabled=false;save();renderAll();renderList();promptEl.focus();
  }
}
$("chatForm").addEventListener("submit",e=>{e.preventDefault();send(promptEl.value);});
promptEl.addEventListener("input",()=>{promptEl.style.height="auto";promptEl.style.height=Math.min(promptEl.scrollHeight,180)+"px";});
promptEl.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("chatForm").requestSubmit();}});
$("newChat").onclick=newChat;
$("clearBtn").onclick=()=>{if(!current())return;current().messages=[];current().title="Nuevo chat";save();renderAll();renderList();toast("Conversación borrada.");};
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>send(b.dataset.prompt));
if(chats.length){activeId=chats[0].id;}else{newChat();}
renderAll();
