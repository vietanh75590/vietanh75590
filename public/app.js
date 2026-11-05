const team = {
  lead: ['Minh','Trưởng nhóm · Chiến lược & kế hoạch','Biến mục tiêu của bạn thành kế hoạch rõ ràng và những bước hành động cụ thể.'],
  engineer: ['An','Kỹ sư · Phát triển phần mềm','Cùng bạn giải quyết bài toán kỹ thuật, xây dựng giải pháp và kiểm thử.'],
  designer: ['Linh','Thiết kế · Trải nghiệm sản phẩm','Biến ý tưởng thành trải nghiệm dễ hiểu, hữu ích và có cá tính.'],
  analyst: ['Khoa','Phân tích · Nghiên cứu & dữ liệu','Khám phá vấn đề, đánh giá giả định và giúp bạn ra quyết định sáng suốt.']
};
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
    const response=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent,task})});
    const data=await response.json();if(!response.ok)throw new Error(data.error || 'Không thể giao việc.');
    title.textContent=`${team[agent][0]} · Hoàn tất`;output.textContent=data.answer;
  } catch(error){card.classList.add('error');title.textContent=`${team[agent][0]} · Chưa hoàn tất`;output.textContent=error.message;}
  finally{submit.disabled=false;}
});
