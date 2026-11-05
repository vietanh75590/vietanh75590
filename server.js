import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const agents = {
  lead: ['Minh', 'Bạn là trưởng nhóm AI. Phân tích mục tiêu, chia công việc thành các bước cụ thể và nêu rủi ro. Trả lời bằng tiếng Việt.'],
  engineer: ['An', 'Bạn là kỹ sư phần mềm AI. Đề xuất giải pháp kỹ thuật và mã nguồn rõ ràng, nêu giả định và cách kiểm thử. Trả lời bằng tiếng Việt.'],
  designer: ['Linh', 'Bạn là chuyên gia thiết kế sản phẩm AI. Đề xuất trải nghiệm, bố cục và nội dung dễ sử dụng. Trả lời bằng tiếng Việt.'],
  analyst: ['Khoa', 'Bạn là chuyên gia phân tích AI. Phân biệt dữ kiện và giả định, không bịa nguồn hoặc số liệu. Trả lời bằng tiếng Việt.']
};
const assets = {'/':['index.html','text/html; charset=utf-8'], '/app.js':['app.js','text/javascript; charset=utf-8'], '/style.css':['style.css','text/css; charset=utf-8']};
export function createServer(config = process.env, {fetcher = fetch} = {}) {
  const provider = config.AGENT_PROVIDER || (config.GEMINI_API_KEY ? 'gemini' : 'openai');
  const supported = ['openai','gemini'].includes(provider);
  const key = provider === 'gemini' ? config.GEMINI_API_KEY : config.AGENT_API_KEY;
  const model = provider === 'gemini' ? (config.GEMINI_MODEL || 'gemini-2.5-flash') : (config.AGENT_MODEL || 'gpt-4.1-mini');
  return http.createServer(async (req, res) => {
    const json = (status, data) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
    try {
      if (req.method === 'GET' && req.url === '/api/health') return json(200, {ok:true, configured:supported && !!key, provider, model});
      if (req.method === 'POST' && req.url === '/api/tasks') {
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(403,{error:'Nguồn yêu cầu không hợp lệ.'});
        let body = '';
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 180000) return json(413,{error:'Yêu cầu quá dài.'}); }
        let input; try { input = JSON.parse(body); } catch { return json(400,{error:'JSON không hợp lệ.'}); }
        if (!input || typeof input !== 'object') return json(400,{error:'Yêu cầu không hợp lệ.'});
        const custom = input.profile;
        const validProfile = custom && typeof custom.name === 'string' && custom.name.trim() && custom.name.length <= 60 && typeof custom.role === 'string' && custom.role.trim() && custom.role.length <= 1200;
        if ((!Object.hasOwn(agents,input.agent) && !validProfile) || typeof input.task !== 'string' || !input.task.trim() || input.task.length > 8000) return json(400,{error:'Chọn agent hợp lệ và nhập công việc từ 1–8000 ký tự.'});
        const history = input.history ?? [];
        if (!Array.isArray(history) || history.length > 12 || history.some(m => !m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 8000)) return json(400,{error:'Lịch sử trò chuyện không hợp lệ.'});
        const persona = Object.hasOwn(agents,input.agent) ? agents[input.agent][1] : `Bạn là ${custom.name}. Vai trò và hướng dẫn: ${custom.role}. Trả lời bằng tiếng Việt. Không tự nhận đã thực thi hành động bên ngoài khi không có công cụ.`;
        if (!supported) return json(503,{error:'AGENT_PROVIDER phải là gemini hoặc openai.'});
        if (!key) return json(503,{error:`Chưa cấu hình ${provider === 'gemini' ? 'GEMINI_API_KEY' : 'AGENT_API_KEY'} trên máy chủ. Thêm key trong Environment rồi triển khai lại.`});
        const base = config.AGENT_API_BASE || 'https://api.openai.com/v1';
        const url = provider === 'gemini' ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` : `${base.replace(/\/$/,'')}/chat/completions`;
        const headers = provider === 'gemini' ? {'Content-Type':'application/json','x-goog-api-key':key} : {'Content-Type':'application/json','Authorization':`Bearer ${key}`};
        const payload = provider === 'gemini' ? {
          systemInstruction:{parts:[{text:persona}]},
          contents:[...history,{role:'user',content:input.task.trim()}].map(m=>({role:m.role === 'assistant' ? 'model' : 'user',parts:[{text:m.content}]})),
          generationConfig:{maxOutputTokens:4096}
        } : {model,messages:[{role:'system',content:persona},...history,{role:'user',content:input.task.trim()}],max_tokens:1800};
        const upstream = await fetcher(url, {method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
        if (!upstream.ok) return json(502,{error:`${provider === 'gemini' ? 'Gemini' : 'Dịch vụ AI'} trả lỗi ${upstream.status}. Kiểm tra API key, model, quyền truy cập và hạn mức API.`});
        const data = await upstream.json();
        const answer = provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.filter(p=>!p.thought && typeof p.text === 'string').map(p=>p.text).join('\n') : data.choices?.[0]?.message?.content;
        if (typeof answer !== 'string' || !answer.trim()) return json(502,{error:'Dịch vụ AI không trả nội dung văn bản.'});
        return json(200,{answer,agent:input.agent});
      }
      const asset = assets[req.url];
      if (req.method !== 'GET' || !asset) return json(404,{error:'Không tìm thấy.'});
      const data = await readFile(new URL(`./public/${asset[0]}`,import.meta.url));
      res.writeHead(200,{'Content-Type':asset[1],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"}); res.end(data);
    } catch (error) { json(502,{error:error.name === 'TimeoutError' ? 'AI phản hồi quá lâu. Vui lòng thử lại.' : 'Không thể hoàn tất yêu cầu. Kiểm tra kết nối máy chủ.'}); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port,process.env.HOST || '127.0.0.1',()=>console.log(`Agent Office listening on port ${port}`));
}
