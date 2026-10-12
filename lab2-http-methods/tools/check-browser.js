// Независимый браузерный клиент. API автомобилей не содержит служебных маршрутов.
const express = require('express');
const { createApp } = require('../app');
const { createExampleApp } = require('../example');
const scenarios = require('./scenarios');
const client = express();
client.use(express.json());

client.post('/request', async (req, res) => {
  const scenario = scenarios.find(entry => entry.key === req.body.key);
  if (!scenario) return res.status(400).json({ error: 'Unknown scenario' });
  const url = `http://127.0.0.1:${scenario.port}${scenario.path}`;
  try {
    const response = await fetch(url, {
      method: scenario.method,
      headers: scenario.body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: scenario.body === undefined ? undefined : JSON.stringify(scenario.body)
    });
    const text = await response.text();
    res.json({ url, method: scenario.method, status: response.status, statusText: response.statusText,
      headers: Object.fromEntries(response.headers), body: text, bytes: Buffer.byteLength(text),
      receivedAt: new Date().toISOString() });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

client.get('/', (req, res) => res.send(`<!doctype html>
<html lang="ru"><meta charset="utf-8"><title>ЛР №2 — реальные HTTP-проверки</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f2f4f7;color:#172b4d;font:16px Arial,sans-serif}
main{max-width:1050px;margin:24px auto;padding:24px;background:white;border:1px solid #d6dde6;border-radius:10px}
h1{font-size:24px;margin:0 0 10px}p{line-height:1.5}select,button{font:inherit;padding:10px;border:1px solid #bcc6d4;border-radius:5px}
select{width:74%}button{background:#165ac7;color:white;cursor:pointer}h2{font-size:18px;margin:18px 0 8px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;background:#f4f6f9;border:1px solid #e1e6ed;font:14px/1.5 Consolas,monospace;color:#182b45}
#status{font-size:22px;font-weight:bold;color:#125c36}#meta{color:#526279;font:14px/1.5 Arial}a{color:#165ac7}
</style><main>
<h1>Лабораторная работа №2 · Вариант 10 · Средний уровень</h1>
<p>Коровин Максим Александрович · ПИЖж-б-о-25-1<br>Браузерный HTTP-клиент: запрос передаётся работающему серверу, ответ показывается без подмены.</p>
<select id="scenario" aria-label="Проверка">${scenarios.map(entry => `<option value="${entry.key}">${entry.title}</option>`).join('')}</select>
<button id="send">Отправить запрос</button>
<h2>Запрос</h2><pre id="request"></pre>
<h2>Ответ сервера</h2><div id="status">Запрос ещё не отправлен</div><div id="meta"></div>
<pre id="headers"></pre><pre id="body"></pre>
</main><script>
const scenarios = ${JSON.stringify(scenarios)};
const selector = document.getElementById('scenario');
const initial = new URLSearchParams(location.search).get('case');
if (scenarios.some(s => s.key === initial)) selector.value = initial;
const current = () => scenarios.find(s => s.key === selector.value);
function showRequest(){ const s = current(); document.getElementById('request').textContent = s.method+' http://127.0.0.1:'+s.port+s.path+(s.body ? '\\nContent-Type: application/json\\n\\n'+JSON.stringify(s.body,null,2) : ''); }
selector.addEventListener('change',showRequest);showRequest();
document.getElementById('send').addEventListener('click',async()=>{
  const button = document.getElementById('send');button.disabled=true;
  document.getElementById('status').textContent='Отправка...';
  try {
    const response=await fetch('/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:current().key})});
    const result=await response.json();if(result.error)throw new Error(result.error);
    document.getElementById('status').textContent='HTTP '+result.status+' '+result.statusText;
    document.getElementById('meta').textContent=result.method+' '+result.url+' | Получено '+result.receivedAt+' | Тело: '+result.bytes+' байт';
    document.getElementById('headers').textContent=Object.entries(result.headers).map(([k,v])=>k+': '+v).join('\\n');
    let formatted=result.body;try{formatted=JSON.stringify(JSON.parse(result.body),null,2);}catch{}
    document.getElementById('body').textContent=formatted || '(пустое тело ответа)';
  }catch(error){document.getElementById('status').textContent='Ошибка: '+error.message;}finally{button.disabled=false;}
});
</script></html>`));

const servers = [
  createApp().listen(3000, '127.0.0.1', () => console.log('Cars API: http://127.0.0.1:3000/cars')),
  createExampleApp().listen(3001, '127.0.0.1', () => console.log('Example API: http://127.0.0.1:3001/items')),
  client.listen(3100, '127.0.0.1', () => console.log('Browser checks: http://127.0.0.1:3100'))
];
for (const server of servers) server.on('error', error => { console.error(error.message); process.exit(1); });
process.on('SIGINT', () => { for (const server of servers) server.close(); });
