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
test('Gemini sends key in header and maps role, history and response',async t=>{
 const url=await serve(createServer({GEMINI_API_KEY:'gemini-test-key',AGENT_API_KEY:'unused'}, {fetcher:async(url,options)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(options.headers['x-goog-api-key'],'gemini-test-key');assert.equal(options.headers.Authorization,undefined);
  const data=JSON.parse(options.body);assert.match(data.systemInstruction.parts[0].text,/Mai/);
  assert.deepEqual(data.contents,[{role:'user',parts:[{text:'Mục tiêu trước'}]},{role:'model',parts:[{text:'Minh: Kế hoạch'}]},{role:'user',parts:[{text:'Bổ sung ý kiến'}]}]);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Hidden',thought:true},{text:'Gemini trả lời'},{text:'Bước tiếp theo'}]}}]}));
 }}),t);
 const health=await (await fetch(url+'/api/health')).json();assert.equal(health.provider,'gemini');assert.equal(health.configured,true);assert.ok(!JSON.stringify(health).includes('gemini-test-key'));
 const result=await fetch(url+'/api/tasks',{method:'POST',body:JSON.stringify({agent:'custom-mai',profile:{name:'Mai',role:'Marketing'},task:'Bổ sung ý kiến',history:[{role:'user',content:'Mục tiêu trước'},{role:'assistant',content:'Minh: Kế hoạch'}]})});
 assert.equal(result.status,200);assert.equal((await result.json()).answer,'Gemini trả lời\nBước tiếp theo');
});
test('Gemini reports missing key, upstream errors and blocked content',async t=>{
 const missing=await serve(createServer({AGENT_PROVIDER:'gemini',AGENT_API_KEY:'not-gemini'}),t);
 const post=url=>fetch(url+'/api/tasks',{method:'POST',body:JSON.stringify({agent:'lead',task:'Hello'})});
 const absent=await post(missing);assert.equal(absent.status,503);assert.match((await absent.json()).error,/GEMINI_API_KEY/);
 for(const response of [new Response('{}',{status:429}),new Response(JSON.stringify({promptFeedback:{blockReason:'SAFETY'}}))]){
  const url=await serve(createServer({GEMINI_API_KEY:'test'},{fetcher:async()=>response}),t);
  const result=await post(url);assert.equal(result.status,502);assert.ok((await result.json()).error);
 }
});
