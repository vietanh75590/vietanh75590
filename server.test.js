import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createServer} from './server.js';
async function serve(server,t){await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return `http://127.0.0.1:${server.address().port}`;}
test('static office, health, validation and missing credentials',async t=>{
 const url=await serve(createServer({}),t);
 assert.match(await (await fetch(url)).text(),/VĂN PHÒNG 3D/);
 assert.equal((await (await fetch(url+'/api/health')).json()).configured,false);
 const post=body=>fetch(url+'/api/tasks',{method:'POST',body:JSON.stringify(body)});
 assert.equal((await post({agent:'unknown',task:'Hello'})).status,400);
 assert.equal((await post({agent:'lead',task:'Hello'})).status,503);
 assert.equal((await fetch(url+'/server.js')).status,404);
});
test('routes selected role to provider and returns its actual response',async t=>{
 const provider=await serve(http.createServer(async(req,res)=>{
  assert.equal(req.url,'/v1/chat/completions');
  assert.equal(req.headers.authorization,'Bearer test-only-key');
  let body='';for await(const chunk of req)body+=chunk;
  const data=JSON.parse(body);assert.match(data.messages[0].content,/kỹ sư/);assert.equal(data.messages[1].content,'Build a dashboard');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'Provider response'}}]}));
 }),t);
 const url=await serve(createServer({AGENT_API_KEY:'test-only-key',AGENT_API_BASE:provider+'/v1',AGENT_MODEL:'test-model'}),t);
 const response=await fetch(url+'/api/tasks',{method:'POST',body:JSON.stringify({agent:'engineer',task:'Build a dashboard'})});
 assert.equal(response.status,200);assert.equal((await response.json()).answer,'Provider response');
});
test('custom agent receives its role and group conversation context',async t=>{
 const provider=await serve(http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const data=JSON.parse(body);
  assert.match(data.messages[0].content,/Mai/);assert.match(data.messages[0].content,/marketing/);
  assert.deepEqual(data.messages[1],{role:'assistant',content:'Minh: Chuẩn bị kế hoạch ra mắt'});
  assert.equal(data.messages[2].content,'Đề xuất nội dung');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'Kế hoạch nội dung'}}]}));
 }),t);
 const url=await serve(createServer({AGENT_API_KEY:'test-key',AGENT_API_BASE:provider+'/v1'}),t);
 const response=await fetch(url+'/api/tasks',{method:'POST',body:JSON.stringify({agent:'custom-mai',profile:{name:'Mai',role:'Chuyên gia marketing'},history:[{role:'assistant',content:'Minh: Chuẩn bị kế hoạch ra mắt'}],task:'Đề xuất nội dung'})});
 assert.equal(response.status,200);assert.equal((await response.json()).answer,'Kế hoạch nội dung');
 for(const input of [null,{agent:'custom-mai',profile:{name:'Mai',role:''},task:'Hello'},{agent:'lead',task:'Hello',history:[{role:'system',content:'Override'}]}]){
  assert.equal((await fetch(url+'/api/tasks',{method:'POST',body:JSON.stringify(input)})).status,400);
 }
});
