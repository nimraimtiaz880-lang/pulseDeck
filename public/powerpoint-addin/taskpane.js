/* Set this to your deployed PulseDeck API URL. For local development, use a local HTTPS tunnel. */
const PULSEDECK_API = 'https://YOUR-PULSEDECK-DOMAIN/api/lecture/generate';
Office.onReady(() => {
  document.getElementById('readSelection').addEventListener('click', () => {
    Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, result => {
      if (result.status === Office.AsyncResultStatus.Succeeded && result.value) {
        const field=document.getElementById('lecture'); field.value=(field.value+'\n'+result.value).trim(); document.getElementById('status').textContent='Selected text added. Note: this reads selected text, not the entire deck automatically.';
      } else document.getElementById('status').textContent='Select text on a slide first, then try again.';
    });
  });
  document.getElementById('generate').addEventListener('click', async () => {
    const content=document.getElementById('lecture').value.trim();
    if(!content){document.getElementById('status').textContent='Select slide text or paste lecture content first.';return;}
    if(PULSEDECK_API.includes('YOUR-PULSEDECK-DOMAIN')){document.getElementById('status').textContent='Setup needed: edit taskpane.js and set PULSEDECK_API to your deployed PulseDeck endpoint.';return;}
    document.getElementById('status').textContent='Generating…';
    try{const r=await fetch(PULSEDECK_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'PowerPoint lecture',action:document.getElementById('action').value,content})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');document.getElementById('output').value=d.output||'';document.getElementById('status').textContent='Draft ready. Review it before use.';}catch(e){document.getElementById('status').textContent='Could not connect: '+e.message;}
  });
  document.getElementById('copy').addEventListener('click', async()=>{try{await navigator.clipboard.writeText(document.getElementById('output').value);document.getElementById('status').textContent='Draft copied.';}catch(e){document.getElementById('status').textContent='Select and copy the draft manually.';}});
});
