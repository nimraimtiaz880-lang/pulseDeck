/* PulseDeck PowerPoint task pane.
 * The task pane is hosted on the same HTTPS origin as PulseDeck so a draft can
 * Draft generation is local/template-based; it does not require an API key.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const status = (message, isError = false) => {
    $('status').textContent = message;
    $('status').classList.toggle('error', isError);
  };
  const sentences = (value) => value.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 20);
  const draftFor = (content, action, title) => {
    const parts = sentences(content);
    const points = (parts.length ? parts : [content.trim()]).slice(0, 6);
    const name = title || 'PowerPoint lecture';
    if (action === 'summary') {
      return `Lecture summary — ${name}\n\nKey points\n${points.slice(0, 6).map(s => `• ${s}`).join('\n')}\n\nTeacher review\nVerify these extracted points against the original slides. Diagrams, animations, and speaker notes may not be included.`;
    }
    if (action === 'quiz') {
      return `Quiz draft — ${name}\n\n${points.slice(0, 5).map((s, i) => `${i + 1}. Which statement best explains this lecture idea?\n   Context: ${s.slice(0, 260)}\n   A. This is the main idea described in the context\n   B. An unrelated idea\n   C. The opposite of the context\n   D. None of the above\n   Teacher note: review the question and set the correct answer before publishing.`).join('\n\n')}\n\nThese are editable template questions. Review accuracy and answer keys before sharing.`;
    }
    if (action === 'poll') {
      const options = [...new Set(points.slice(0, 3).map(s => s.slice(0, 100)))];
      while (options.length < 3) options.push(['I understand it', 'I need an example', 'Please explain again'][options.length]);
      return `Class poll — ${name}\n\nQuestion: Which topic from this lecture should we discuss further?\n${options.map((s, i) => `${String.fromCharCode(65 + i)}. ${s}`).join('\n')}\nD. Other / not listed\n\nTeacher review: shorten options if needed before publishing.`;
    }
    if (action === 'scenario') {
      return `Scenario activity — ${name}\n\nScenario\nA learner encounters a situation where this lecture concept applies: ${points[0] || content.slice(0, 350)}\n\nTasks\n1. Identify the relevant concept.\n2. Explain what you would do and why.\n3. Describe a likely consequence.\n4. Support your decision with evidence from the lecture.\n\nTeacher review: adapt the scenario to your subject.`;
    }
    return `Discussion prompts — ${name}\n\n${points.slice(0, 5).map((s, i) => `${i + 1}. What is the significance of this idea: “${s.slice(0, 240)}”?\n   Follow-up: Can you provide an example or counterexample?`).join('\n\n')}`;
  };
  const appendSelectedText = () => {
    if (typeof Office === 'undefined' || !Office.context?.document?.getSelectedDataAsync) {
      status('PowerPoint selection is available only inside the PowerPoint add-in. You can still paste slide text below.', true);
      return;
    }
    Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, result => {
      if (result.status === Office.AsyncResultStatus.Succeeded && result.value) {
        $('lecture').value = `${$('lecture').value}\n${result.value}`.trim();
        status('Selected text added. Repeat on other slides to collect more content.');
      } else status('Select text on a slide first, then try again.', true);
    });
  };
  const generate = () => {
    const content = $('lecture').value.trim();
    if (!content) { status('Select slide text or paste lecture content first.', true); return; }
    $('output').value = draftFor(content, $('action').value, $('title').value.trim());
    status('Draft generated locally. Review it before using it with students.');
  };
  const sendToPulseDeck = () => {
    const content = $('lecture').value.trim();
    if (!content) { status('Add slide text before sending it to PulseDeck.', true); return; }
    const output = $('output').value.trim() || draftFor(content, $('action').value, $('title').value.trim());
    const payload = {
      title: $('title').value.trim() || 'PowerPoint lecture',
      content,
      action: $('action').value,
      output,
      createdAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('pulsedeck-ppt-draft-v1', JSON.stringify(payload));
      const dashboardUrl = `${window.location.origin}/dashboard?pptDraft=1`;
      $('openDashboard').href = dashboardUrl;
      $('openDashboard').hidden = false;
      window.open(dashboardUrl, '_blank');
      status('Draft saved for PulseDeck. If it does not appear automatically, download the handoff JSON and import it on the PowerPoint Integration page.');
    } catch (error) {
      status(`Could not hand off the draft: ${error.message}. Copy the content and paste it into PulseDeck instead.`, true);
    }
  };
  const init = () => {
    $('readSelection').addEventListener('click', appendSelectedText);
    $('generate').addEventListener('click', generate);
    $('send').addEventListener('click', sendToPulseDeck);
    $('copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('output').value); status('Draft copied.'); }
      catch { $('output').focus(); $('output').select(); status('Select the draft and copy it manually.'); }
    });
    $('download').addEventListener('click', () => {
      const content = $('lecture').value.trim();
      if (!content) { status('Add slide text before downloading a handoff file.', true); return; }
      const payload = { title: $('title').value.trim() || 'PowerPoint lecture', content, action: $('action').value, output: $('output').value.trim() || draftFor(content, $('action').value, $('title').value.trim()), createdAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'pulsedeck-powerpoint-handoff.json'; link.click(); URL.revokeObjectURL(url);
      status('Handoff JSON downloaded. Import it from PowerPoint Integration in the PulseDeck dashboard.');
    });
    $('clear').addEventListener('click', () => { $('lecture').value = ''; $('output').value = ''; status('Content cleared.'); });
    if (typeof Office !== 'undefined' && Office.onReady) {
      Office.onReady(info => status(info?.host === Office.HostType.PowerPoint ? 'Connected to PowerPoint. Select text on a slide to begin.' : 'Open this task pane inside PowerPoint to read selected slide text. You can test generation by pasting text here.'));
    } else status('Paste slide text to get started.');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
