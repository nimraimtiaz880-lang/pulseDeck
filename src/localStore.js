const KEY = 'pulsedeck-demo-v1';
const initial = { events: [{ id: 'welcome-event', title: 'Product Launch Workshop', description: 'A ready-to-use presentation event with a poll and Q&A.', join_code: 'WELCOME', status: 'active', created_at: new Date().toISOString() }], questions: [{ id: 'welcome-question', event_id: 'welcome-event', body: 'Will we get access to the presentation slides?', author_name: 'Alex', votes: 6, status: 'approved', pinned: true, created_at: new Date().toISOString() }], activities: [{ id: 'welcome-poll', event_id: 'welcome-event', type: 'poll', title: 'Audience pulse', prompt: 'What would you like to explore first?', options: ['Product features', 'Live demo', 'Pricing'], is_active: true, created_at: new Date().toISOString() }], responses: [] };
export function readStore() { try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : initial;
}
catch {
    return initial;
} }
export function updateStore(fn) { const next = fn(readStore()); localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('pulsedeck-change')); }
export function watchStore(fn) { window.addEventListener('storage', fn); window.addEventListener('pulsedeck-change', fn); return () => { window.removeEventListener('storage', fn); window.removeEventListener('pulsedeck-change', fn); }; }
