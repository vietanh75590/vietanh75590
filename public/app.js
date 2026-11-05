const team = {
  lead: ['Minh','Trưởng nhóm · Chiến lược & kế hoạch','Biến mục tiêu của bạn thành kế hoạch rõ ràng và những bước hành động cụ thể.'],
  engineer: ['An','Kỹ sư · Phát triển phần mềm','Cùng bạn giải quyết bài toán kỹ thuật, xây dựng giải pháp và kiểm thử.'],
  designer: ['Linh','Thiết kế · Trải nghiệm sản phẩm','Biến ý tưởng thành trải nghiệm dễ hiểu, hữu ích và có cá tính.'],
  analyst: ['Khoa','Phân tích · Nghiên cứu & dữ liệu','Khám phá vấn đề, đánh giá giả định và giúp bạn ra quyết định sáng suốt.']
};
const storageKey = 'orbit-office-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
const customAgents = Array.isArray(saved.agents) ? saved.agents.filter(a => a && /^custom-[a-z0-9-]+$/.test(a.id) && typeof a.name === 'string' && a.name.length <= 60 && typeof a.role === 'string' && a.role.length <= 1200).slice(0,20) : [];
for (const a of customAgents) team[a.id] = [a.name,a.role,a.role];
let groups = Array.isArray(saved.groups) ? saved.groups.filter(g => g && typeof g.id === 'string' && typeof g.name === 'string' && Array.isArray(g.members) && g.members.length > 0 && g.members.length <= 6 && g.members.every(id => Object.hasOwn(team,id)) && Array.isArray(g.messages)).slice(0,20) : [];
for (const g of groups) g.messages = g.messages.filter(m => m && typeof m.text === 'string' && typeof m.name === 'string' && ['user','assistant','error'].includes(m.role)).slice(-100);
if (!groups.length) groups = [{id:'general',name:'Nhóm chung',members:['lead','engineer','designer','analyst'],messages:[]}];
let activeGroup = groups[0].id;
let chatting = false;
function persist() {
  try { localStorage.setItem(storageKey,JSON.stringify({agents:customAgents,groups})); document.querySelector('#storage-status').textContent='Đã lưu trên trình duyệt này.'; }
  catch { document.querySelector('#storage-status').textContent='Không lưu được trên trình duyệt. Dữ liệu hiện chỉ giữ trong phiên này.'; }
}

let selected = 'lead';
const $ = s => document.querySelector(s);
const submit = $('.submit');
function select(id) {
  selected = id;
  document.querySelectorAll('.station').forEach(el => {el.classList.toggle('selected',el.dataset.agent === id);el.setAttribute('aria-pressed',String(el.dataset.agent === id));});
  $('#agent-name').textContent = team[id][0]; $('#agent-avatar').textContent = team[id][0][0];
  $('#agent-role').textContent = team[id][1]; $('#agent-description').textContent = team[id][2];
  submit.firstChild.textContent = `Giao việc cho ${team[id][0]} `;
}
document.querySelectorAll('.station').forEach(el => el.addEventListener('click',()=>select(el.dataset.agent)));
select(selected);
$('#rotate').addEventListener('click',()=>$('.scene').classList.toggle('alternate'));
$('#clear').addEventListener('click',()=>{$('#results').replaceChildren();$('#empty').hidden=false;});
fetch('/api/health').then(r=>r.json()).then(data=>{$('#connection').textContent=data.configured?'Đã cấu hình kết nối AI':'Chưa cấu hình API key';$('#model').textContent=`Model: ${data.model}`;}).catch(()=>{$('#connection').textContent='Không kết nối được máy chủ';});
$('#task-form').addEventListener('submit',async event=>{
  event.preventDefault(); const task = $('#task').value.trim(); if(!task)return;
  const agent = selected;
  const card = document.createElement('article'); card.className='result';
  const title=document.createElement('h3');title.textContent=`${team[agent][0]} · Đang xử lý`;
  const prompt=document.createElement('p');prompt.className='prompt';prompt.textContent=task;
  const output=document.createElement('pre');output.textContent='Đang chờ phản hồi từ AI…';
  card.append(title,prompt,output);$('#results').prepend(card);$('#empty').hidden=true;submit.disabled=true;
  try {
    const response=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent,task,profile:profileFor(agent)})});
    const data=await response.json();if(!response.ok)throw new Error(data.error || 'Không thể giao việc.');
    title.textContent=`${team[agent][0]} · Hoàn tất`;output.textContent=data.answer;
  } catch(error){card.classList.add('error');title.textContent=`${team[agent][0]} · Chưa hoàn tất`;output.textContent=error.message;}
  finally{submit.disabled=false;}
});
function profileFor(id) { return customAgents.find(a=>a.id===id); }
function renderTeam() {
  $('#team-list').replaceChildren(); $('#member-options').replaceChildren();
  for (const [id,a] of Object.entries(team)) {
    const button=document.createElement('button');button.type='button';button.textContent=`${a[0]} · ${a[1].slice(0,50)}`;button.addEventListener('click',()=>{select(id);$('#task-form').scrollIntoView({behavior:'smooth',block:'center'});});$('#team-list').append(button);
    const label=document.createElement('label');const box=document.createElement('input');box.type='checkbox';box.value=id;box.name='member';label.append(box,document.createTextNode(a[0]));$('#member-options').append(label);
  }
  $('.tag').textContent=`${Object.keys(team).length} CỘNG SỰ`;
}
function renderGroups() {
  $('#group-select').replaceChildren();
  for(const g of groups){const opt=document.createElement('option');opt.value=g.id;opt.textContent=`${g.name} · ${g.members.map(id=>team[id][0]).join(', ')}`;$('#group-select').append(opt);}
  $('#group-select').value=activeGroup;renderMessages();
}
function renderMessages() {
  const group=groups.find(g=>g.id===activeGroup);$('#chat-messages').replaceChildren();
  if(!group.messages.length){const p=document.createElement('p');p.textContent='Nhóm đã sẵn sàng. Hãy giao mục tiêu đầu tiên.';$('#chat-messages').append(p);}
  for(const m of group.messages){const article=document.createElement('article');article.className=`message ${m.role}`;const h=document.createElement('h3');h.textContent=m.name;const p=document.createElement('p');p.textContent=m.text;article.append(h,p);$('#chat-messages').append(article);}
  $('#chat-messages').scrollTop=$('#chat-messages').scrollHeight;
}
$('#add-agent').addEventListener('submit',e=>{
  e.preventDefault();const name=$('#new-name').value.trim(),role=$('#new-role').value.trim();if(!name||!role)return;
  if(customAgents.length>=20){$('#storage-status').textContent='Tối đa 20 agent tùy chỉnh.';return;}
  const id=`custom-${crypto.randomUUID()}`;customAgents.push({id,name,role});team[id]=[name,role,role];persist();renderTeam();select(id);e.target.reset();e.target.closest('details').open=false;
});
$('#add-group').addEventListener('submit',e=>{
  e.preventDefault();const name=$('#group-name').value.trim();const members=[...document.querySelectorAll('input[name="member"]:checked')].map(el=>el.value);
  if(!name||!members.length||members.length>6){$('#storage-status').textContent='Nhập tên nhóm và chọn từ 1 đến 6 thành viên.';return;}
  if(groups.length>=20){$('#storage-status').textContent='Tối đa 20 nhóm.';return;}
  const group={id:crypto.randomUUID(),name,members,messages:[]};groups.push(group);activeGroup=group.id;persist();renderGroups();e.target.reset();e.target.closest('details').open=false;
});
$('#group-select').addEventListener('change',e=>{activeGroup=e.target.value;renderMessages();});
$('#chat-form').addEventListener('submit',async e=>{
  e.preventDefault();if(chatting)return;const task=$('#chat-task').value.trim();if(!task)return;
  const group=groups.find(g=>g.id===activeGroup);chatting=true;$('#chat-send').disabled=true;$('#group-select').disabled=true;
  const history=group.messages.filter(m=>m.role!=='error').slice(-12).map(m=>({role:m.role,content:`${m.name}: ${m.text}`.slice(0,8000)}));
  group.messages.push({role:'user',name:'Bạn',text:task});$('#chat-task').value='';persist();renderMessages();
  try {
    for(const id of group.members){
      $('#chat-status').textContent=`${team[id][0]} đang phản hồi…`;
      try {
        const response=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent:id,profile:profileFor(id),task,history:history.slice(-12)})});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'Không gửi được yêu cầu.');
        group.messages.push({role:'assistant',name:team[id][0],text:data.answer});
        history.push({role:'assistant',content:`${team[id][0]}: ${data.answer}`.slice(0,8000)});
      } catch(error){group.messages.push({role:'error',name:team[id][0],text:error.message});$('#chat-status').textContent='Lượt trao đổi bị dừng. Kiểm tra lỗi rồi gửi lại công việc.';return;}
      finally{group.messages=group.messages.slice(-100);persist();renderMessages();}
    }
    $('#chat-status').textContent='Các thành viên đã phản hồi. Bạn có thể giao việc tiếp trong nhóm.';
  } finally{chatting=false;$('#chat-send').disabled=false;$('#group-select').disabled=false;}
});
renderTeam();renderGroups();
