import { readStore, updateStore, watchStore } from './localStore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import QRCode from 'qrcode';
import { Activity, BarChart3, Bell, Check, ChevronDown, CircleHelp, ClipboardList, Download, ExternalLink, Filter, Gauge, Home, Link2, LogOut, Menu, MessageCircle, MoreHorizontal, Plus, Presentation, Radio, Search, Send, Settings, ShieldCheck, Sparkles, Users, Vote, X, Zap, FileUp, BookOpen, Brain, WandSparkles } from 'lucide-react';
const navGroups = [
    { label: 'WORKSPACE', items: [{ name: 'Overview', icon: Home, desc: 'Home' }, { name: 'My events', icon: Presentation, desc: 'Your sessions' }, { name: 'Lecture Studio', icon: BookOpen, desc: 'Create from lectures' }] },
    { label: 'LIVE TOOLS', items: [{ name: 'Q&A', icon: MessageCircle, desc: 'Audience questions' }, { name: 'Polls', icon: Vote, desc: 'Quick polls' }, { name: 'Quiz', icon: Zap, desc: 'Knowledge checks' }] },
    { label: 'REVIEW', items: [{ name: 'Analytics', icon: BarChart3, desc: 'Results and reports' }] }
];
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function downloadFile(name, content, type = 'text/plain;charset=utf-8') { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function IconButton({ children, onClick, title }) { return <button className="icon-button" title={title} onClick={onClick}>{children}</button>; }
function App() {
    const [sortQuestions, setSortQuestions] = useState('votes');
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(Boolean(supabase));
    const [authMode, setAuthMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authMessage, setAuthMessage] = useState('');
    const [page, setPage] = useState('Overview');
    const [events, setEvents] = useState([]);
    const [eventId, setEventId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [activities, setActivities] = useState([]);
    const [responses, setResponses] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [query, setQuery] = useState('');
    const [lectureFile, setLectureFile] = useState(null);
    const [lectureText, setLectureText] = useState('');
    const [lectureTitle, setLectureTitle] = useState('');
    const [lectureAction, setLectureAction] = useState('quiz');
    const [lectureOutput, setLectureOutput] = useState('');
    const [lectureBusy, setLectureBusy] = useState(false);
    const [lectureError, setLectureError] = useState('');
    const [lectureSource, setLectureSource] = useState('upload');
    const [showCreate, setShowCreate] = useState(false);
    const [showJoinScreen, setShowJoinScreen] = useState(false);
    const [joinQrData, setJoinQrData] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPresentationUrl, setNewPresentationUrl] = useState('');
    const [expectedParticipants, setExpectedParticipants] = useState('');
    const [attendance, setAttendance] = useState({ expected_count: null, joined_count: 0, present_count: 0, participant_names: [] });
    const [joinCode, setJoinCode] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [nickname, setNickname] = useState('Guest');
    const [activityType, setActivityType] = useState('poll');
    const [activityTitle, setActivityTitle] = useState('');
    const [activityPrompt, setActivityPrompt] = useState('');
    const [optionsText, setOptionsText] = useState('Option A\nOption B\nOption C');
    const [correctOption, setCorrectOption] = useState('');
    const [quizExplanation, setQuizExplanation] = useState('');
    const [selectedActivity, setSelectedActivity] = useState('');
    const [answer, setAnswer] = useState('');
    const [broadcast, setBroadcast] = useState('');
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [mobileMenu, setMobileMenu] = useState(false);
    useEffect(() => { if (supabase)
        return; const reload = () => { const st = readStore(); setEvents(st.events); setEventId(old => st.events.some(e => e.id === old) ? old : st.events[0]?.id || ''); setQuestions(st.questions.filter(q => q.event_id === eventId)); setActivities(st.activities.filter(a => a.event_id === eventId)); setResponses(st.responses.filter(r => st.activities.some(a => a.id === r.activity_id && a.event_id === eventId))); setBroadcasts((st.broadcasts || []).filter(b => b.event_id === eventId).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))); }; reload(); return watchStore(reload); }, [eventId]);
    const activeEvent = events.find(e => e.id === eventId) || events[0];
    const joinUrl = activeEvent ? `${window.location.origin}/student?code=${encodeURIComponent(activeEvent.join_code)}` : '';
    useEffect(() => {
        let cancelled = false;
        if (!joinUrl) { setJoinQrData(''); return; }
        QRCode.toDataURL(joinUrl, { width: 1200, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#111111', light: '#FFFFFF' } })
            .then(data => { if (!cancelled) setJoinQrData(data); })
            .catch(() => { if (!cancelled) setJoinQrData(''); });
        return () => { cancelled = true; };
    }, [joinUrl]);
    const notify = useCallback((s) => { setToast(s); window.setTimeout(() => setToast(''), 2800); }, []);
    useEffect(() => { if (!supabase) {
        setAuthLoading(false);
        return;
    } supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); }); const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => subscription.unsubscribe(); }, []);
    const loadAll = useCallback(async () => { if (!supabase || !session?.user)
        return; setLoading(true); const { data: e, error } = await supabase.from('events').select('*').order('created_at', { ascending: false }); if (error)
        notify(`Events failed to load: ${error.message}`); const list = (e || []); setEvents(list); setEventId(old => list.some(x => x.id === old) ? old : (list[0]?.id || '')); setLoading(false); }, [session, notify]);
    useEffect(() => { void loadAll(); }, [loadAll]);
    useEffect(() => { if (!supabase || !session?.user)
        return; const ch = supabase.channel('organizer-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => void loadAll()).subscribe(); return () => { void supabase.removeChannel(ch); }; }, [session, loadAll]);
    useEffect(() => { if (!supabase || !session?.user || !eventId)
        return; let live = true; const fetchEventData = async () => { const [q, a] = await Promise.all([supabase.from('questions').select('*').eq('event_id', eventId).order('created_at', { ascending: false }), supabase.from('activities').select('*').eq('event_id', eventId).order('created_at', { ascending: false })]); if (!live)
        return; setQuestions((q.data || [])); setActivities((a.data || [])); }; void fetchEventData(); const channel = supabase.channel(`event-${eventId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `event_id=eq.${eventId}` }, () => void fetchEventData()).on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `event_id=eq.${eventId}` }, () => void fetchEventData()).subscribe(); return () => { live = false; void supabase.removeChannel(channel); }; }, [session, eventId]);
    useEffect(() => {
        if (!supabase || !session?.user || !eventId)
            return;
        let live = true;
        const fetchResponses = async () => { const { data, error } = await supabase.from('responses').select('*,activities!inner(event_id)').eq('activities.event_id', eventId); if (!live)
            return; if (error) {
            notify(`Responses failed to load: ${error.message}`);
            return;
        } setResponses((data || [])); };
        void fetchResponses();
        const channel = supabase.channel(`all-responses-${eventId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, () => void fetchResponses()).subscribe();
        return () => { live = false; void supabase.removeChannel(channel); };
    }, [session, eventId, notify]);
    useEffect(() => {
        if (!supabase || !session?.user || !eventId) {
            setBroadcasts((readStore().broadcasts || []).filter(b => b.event_id === eventId));
            return;
        }
        let live = true;
        const fetchBroadcasts = async () => {
            const { data, error } = await supabase.from('broadcasts').select('id,event_id,message,created_at').eq('event_id', eventId).order('created_at', { ascending: false }).limit(20);
            if (!live) return;
            if (error) { notify(`Announcements failed to load: ${error.message}`); return; }
            setBroadcasts(data || []);
        };
        void fetchBroadcasts();
        const channel = supabase.channel(`broadcasts-${eventId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts', filter: `event_id=eq.${eventId}` }, () => void fetchBroadcasts()).subscribe();
        const timer = window.setInterval(() => void fetchBroadcasts(), 20000);
        return () => { live = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
    }, [session, eventId, notify]);
    useEffect(() => {
        if (!supabase || !session?.user || !eventId) {
            setAttendance({ expected_count: activeEvent?.expected_participants ?? null, joined_count: 0, present_count: 0, participant_names: [] });
            return;
        }
        let live = true;
        const fetchAttendance = async () => {
            const { data, error } = await supabase.rpc('event_attendance_summary', { target_event: eventId });
            if (!live) return;
            if (error) {
                // The migration must be applied before cloud attendance insights are available.
                return;
            }
            const row = Array.isArray(data) ? data[0] : data;
            if (row) setAttendance({ expected_count: row.expected_count, joined_count: Number(row.joined_count || 0), present_count: Number(row.present_count || 0), participant_names: row.participant_names || [] });
        };
        void fetchAttendance();
        const timer = window.setInterval(() => void fetchAttendance(), 10000);
        return () => { live = false; window.clearInterval(timer); };
    }, [session, eventId, activeEvent?.expected_participants]);
    function downloadJoinQr() {
        if (!joinQrData || !activeEvent) { notify('QR code is still being prepared. Try again in a moment.'); return; }
        const a = document.createElement('a');
        a.href = joinQrData;
        a.download = `${activeEvent.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'pulsedeck'}-join-qr.png`;
        document.body.appendChild(a); a.click(); a.remove();
        notify('QR code downloaded as a high-resolution PNG');
    }
    async function authSubmit(e) { e.preventDefault(); if (!supabase) {
        notify('Configure Supabase first, or use Demo mode.');
        return;
    } setAuthMessage(''); const result = authMode === 'signup' ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password }); if (result.error)
        setAuthMessage(result.error.message);
    else if (authMode === 'signup')
        setAuthMessage('Check your email for the confirmation link if email confirmation is enabled.');
    else
        setAuthMessage('Signed in successfully.'); }
    async function signOut() { await supabase?.auth.signOut(); setSession(null); setEvents([]); setEventId(''); }
    async function createEvent(e) { e.preventDefault(); if (!newTitle.trim())
        return; if (!supabase) {
        const item = { id: crypto.randomUUID(), title: newTitle.trim(), description: newDesc, presentation_url: newPresentationUrl.trim(), expected_participants: expectedParticipants ? Number(expectedParticipants) : null, join_code: code(), status: 'active', created_at: new Date().toISOString() };
        updateStore(st => ({ ...st, events: [item, ...st.events] }));
        setEventId(item.id);
        setNewTitle('');
        setNewDesc('');
        setNewPresentationUrl('');
        setExpectedParticipants('');
        setShowCreate(false);
        setPage('Q&A');
        notify('Event created');
        return;
    } if (!session?.user)
        return; const { data, error } = await supabase.from('events').insert({ title: newTitle.trim(), description: newDesc, presentation_url: newPresentationUrl.trim() || null, expected_participants: expectedParticipants ? Number(expectedParticipants) : null, join_code: code(), status: 'active', owner_id: session.user.id }).select().single(); if (error) {
        notify(error.message);
        return;
    } setEvents(old => [data, ...old]); setEventId(data.id); setNewTitle(''); setNewDesc(''); setNewPresentationUrl(''); setExpectedParticipants(''); setShowCreate(false); setPage('Q&A'); notify('Session created'); }
    async function createQuestion(e) { e.preventDefault(); if (!questionText.trim())
        return; if (!eventId) {
        notify('Select an event first.');
        return;
    } if (!supabase) {
        const item = { id: crypto.randomUUID(), event_id: eventId, body: questionText.trim(), author_name: nickname.trim() || 'Guest', votes: 0, status: 'pending', pinned: false, created_at: new Date().toISOString() };
        updateStore(st => ({ ...st, questions: [item, ...st.questions] }));
        setQuestionText('');
        notify('Question submitted for moderation');
        return;
    } const { error } = await supabase.from('questions').insert({ event_id: eventId, body: questionText.trim(), author_name: nickname.trim() || 'Guest', votes: 0, status: 'pending', pinned: false, user_id: session?.user?.id || null }); if (error) {
        notify(error.message);
        return;
    } setQuestionText(''); notify('Question submitted'); }
    async function questionAction(q, patch) { if (!supabase) {
        updateStore(st => ({ ...st, questions: st.questions.map(item => item.id === q.id ? { ...item, ...patch } : item) }));
        notify('Question updated');
        return;
    } const { error } = await supabase.from('questions').update(patch).eq('id', q.id); if (error)
        notify(error.message);
    else
        notify('Question updated'); }
    async function voteQuestion(q) { if (!supabase) {
        updateStore(st => ({ ...st, questions: st.questions.map(item => item.id === q.id ? { ...item, votes: item.votes + 1 } : item) }));
        return;
    } const { error } = await supabase.rpc('upvote_question', { question_uuid: q.id }); if (error)
        notify(error.message); }
    async function createActivity(e) { e.preventDefault(); if (!activityTitle.trim() || !activityPrompt.trim())
        return; if (!eventId) {
        notify('Select an event first.');
        return;
    } const opts = optionsText.split('\n').map(x => x.trim()).filter(Boolean); if (opts.length < 2) {
        notify('Add at least two options.');
        return;
    } if (new Set(opts).size !== opts.length) {
        notify('Answer options must be unique.');
        return;
    } if (activityType === 'quiz' && (!correctOption || !opts.includes(correctOption))) {
        notify('Choose the correct answer from your options.');
        return;
    } const localItem = { id: crypto.randomUUID(), event_id: eventId, type: activityType, title: activityTitle.trim(), prompt: activityPrompt.trim(), options: opts, is_active: true, created_at: new Date().toISOString(), ...(activityType === 'quiz' ? { correct_option: correctOption, explanation: quizExplanation.trim() } : {}) }; if (!supabase) {
        updateStore(st => ({ ...st, activities: [localItem, ...st.activities] }));
        setSelectedActivity(localItem.id);
        setActivityTitle('');
        setActivityPrompt('');
        setCorrectOption('');
        setQuizExplanation('');
        setShowActivityForm(false);
        notify('Activity created');
        return;
    } const { data, error } = await supabase.from('activities').insert({ event_id: eventId, type: activityType, title: activityTitle.trim(), prompt: activityPrompt.trim(), options: opts, is_active: true, created_by: session?.user?.id }).select().single(); if (error) {
        notify(error.message);
        return;
    } if (activityType === 'quiz') {
        const { error: keyError } = await supabase.from('quiz_answer_keys').insert({ activity_id: data.id, correct_option: correctOption, explanation: quizExplanation.trim() });
        if (keyError) {
            await supabase.from('activities').update({ is_active: false }).eq('id', data.id);
            notify(`Quiz setup failed and was paused because its answer key could not be saved: ${keyError.message}`);
            return;
        }
    } setActivities(old => [data, ...old]); setSelectedActivity(data.id); setActivityTitle(''); setActivityPrompt(''); setCorrectOption(''); setQuizExplanation(''); setShowActivityForm(false); notify(`${activityType} created`); }
    async function submitResponse(e) { e.preventDefault(); if (!activeActivity || !answer) {
        notify('Choose an answer first.');
        return;
    } if (!supabase) {
        updateStore(st => ({ ...st, responses: [...st.responses, { id: crypto.randomUUID(), activity_id: activeActivity.id, option_text: answer, voter_name: nickname.trim() || 'Guest', created_at: new Date().toISOString() }] }));
        setAnswer('');
        notify('Response submitted');
        return;
    } const { error } = await supabase.from('responses').insert({ activity_id: activeActivity.id, option_text: answer, voter_name: nickname.trim() || 'Guest', user_id: session?.user?.id || null, participant_token: crypto.randomUUID() }); if (error) {
        notify(error.message.includes('duplicate') ? 'You may already have submitted a response.' : error.message);
        return;
    } setAnswer(''); notify('Response submitted'); }
    async function joinEvent(e) { e.preventDefault(); const found = events.find(x => x.join_code.toLowerCase() === joinCode.trim().toLowerCase()); if (found && found.status !== 'closed') {
        setEventId(found.id);
        setPage('Audience view');
        notify('Joined event');
        return;
    } if (!supabase) {
        notify('Event code not found. Create an event first.');
        return;
    } const { data, error } = await supabase.rpc('join_event_by_code', { input_code: joinCode.trim().toUpperCase() }); const joined = Array.isArray(data) ? data[0] : data; if (error || !joined) {
        notify('Event code not found or event is closed.');
        return;
    } setEvents(old => old.some(x => x.id === joined.id) ? old : [joined, ...old]); setEventId(joined.id); setPage('Audience view'); }
    async function sendBroadcast(e) {
        e.preventDefault();
        const message = broadcast.trim();
        if (!eventId || !message) {
            notify('Select an event and enter an announcement.');
            return;
        }
        if (message.length > 1000) {
            notify('Announcements must be 1000 characters or fewer.');
            return;
        }
        if (!supabase) {
            const item = { id: crypto.randomUUID(), event_id: eventId, message, sender_id: null, created_at: new Date().toISOString() };
            updateStore(st => ({ ...st, broadcasts: [item, ...(st.broadcasts || [])] }));
            setBroadcast('');
            notify('Announcement sent');
            return;
        }
        if (!session?.user?.id) {
            notify('Sign in before sending an announcement.');
            return;
        }
        const { error } = await supabase.from('broadcasts').insert({ event_id: eventId, message, sender_id: session.user.id });
        if (error) {
            notify(`Announcement failed: ${error.message}`);
            return;
        }
        setBroadcast('');
        notify('Announcement sent to participants');
    }
    const filteredEvents = events.filter(e => e.title.toLowerCase().includes(query.toLowerCase()));
    const activeActivity = activities.find(a => a.id === selectedActivity && a.type === (page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : page === 'Surveys' ? 'survey' : a.type)) || activities.find(a => a.type === (page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : page === 'Surveys' ? 'survey' : a.type));
    const allResponses = responses.filter(r => activities.some(a => a.id === r.activity_id && a.event_id === eventId));
    const totalResponses = allResponses.filter(r => r.activity_id === activeActivity?.id).length;
    const counts = useMemo(() => Object.fromEntries((activeActivity?.options || []).map(o => [o, allResponses.filter(r => r.activity_id === activeActivity?.id && r.option_text === o).length])), [activeActivity, allResponses]);
    const readLectureFile = async (file) => {
        setLectureError(''); setLectureOutput(''); setLectureFile(file || null);
        if (!file) return;
        setLectureTitle(file.name.replace(/\.(pptx|pdf)$/i, ''));
        try {
            let text = '';
            if (/\.pptx$/i.test(file.name)) {
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(file);
                const slideFiles = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n)).sort((a,b) => {
                    const an = Number(a.match(/slide(\d+)/i)?.[1] || 0), bn = Number(b.match(/slide(\d+)/i)?.[1] || 0); return an-bn;
                });
                const chunks = [];
                for (let i=0;i<slideFiles.length;i++) {
                    const xml = await zip.files[slideFiles[i]].async('text');
                    const doc = new DOMParser().parseFromString(xml, 'application/xml');
                    const words = [...doc.getElementsByTagName('a:t')].map(n => n.textContent || '').filter(Boolean);
                    if (words.length) chunks.push(`Slide ${i+1}: ${words.join(' ')}`);
                }
                text = chunks.join('\n\n');
            } else if (/\.pdf$/i.test(file.name)) {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
                const pdf = await pdfjs.getDocument({data: await file.arrayBuffer()}).promise;
                const chunks=[];
                for (let p=1;p<=pdf.numPages;p++) { const page=await pdf.getPage(p); const content=await page.getTextContent(); const line=content.items.map(i=>i.str || '').join(' ').trim(); if(line) chunks.push(`Page ${p}: ${line}`); }
                text=chunks.join('\n\n');
            } else { setLectureError('Please choose a PowerPoint (.pptx) or PDF file.'); setLectureFile(null); return; }
            if (!text.trim()) { setLectureError('No selectable text was found. If the slides are scanned images, use an OCR-enabled PDF or paste the lecture text below.'); return; }
            setLectureText(text.slice(0,100000));
        } catch (e) { setLectureError(`Could not read this file: ${e.message || 'unknown error'}. You can still paste the lecture text below.`); }
    };
    const generateLectureContent = async () => {
        const source = lectureText.trim();
        if (!source) { setLectureError('Upload a PowerPoint/PDF or paste some lecture text first.'); return; }
        setLectureBusy(true); setLectureError(''); setLectureOutput('');
        const actionLabels = { summary:'Lecture summary', quiz:'Quiz questions', scenario:'Scenario-based activity', discussion:'Discussion questions', poll:'Class poll' };
        try {
            const response = await fetch('/api/lecture/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:lectureTitle || 'Lecture', action:lectureAction, content:source }) });
            if (response.ok) { const data=await response.json(); setLectureOutput(data.output || data.content || JSON.stringify(data,null,2)); setLectureBusy(false); return; }
        } catch (_) { /* The local draft mode below keeps the prototype usable without an AI endpoint. */ }
        const sentences = source.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).filter(s=>s.length>35);
        let draft='';
        if (lectureAction==='summary') {
            draft=`${actionLabels[lectureAction]} — ${lectureTitle || 'Lecture'}\n\nKey points\n${(sentences.slice(0,8).length ? sentences.slice(0,8) : [source.slice(0,1200)]).map(s=>'• '+s.trim()).join('\n')}\n\nTeacher review\nCheck the key points against the original slides and add any diagrams or examples that were not extracted as text.`;
        } else if (lectureAction==='quiz') {
            draft=`${actionLabels[lectureAction]} — ${lectureTitle || 'Lecture'}\n\nDraft questions to complete\n${(sentences.slice(0,5).length ? sentences.slice(0,5) : [source.slice(0,300)]).map((s,i)=>`${i+1}. Explain the main idea in this lecture point: “${s.trim().slice(0,260)}”\n   A. Explain in your own words\n   B. Give an unrelated example\n   C. Ignore the key concept\n   D. State the opposite\n   Teacher note: verify the answer and improve distractors before publishing.`).join('\n\n')}\n\nPrototype note: this is a text-based starter draft, not verified AI-generated assessment content.`;
        } else if (lectureAction==='scenario') {
            draft=`${actionLabels[lectureAction]} — ${lectureTitle || 'Lecture'}\n\nScenario\nA learner is working in a real-world situation where the following lecture concept matters: ${sentences[0] || source.slice(0,350)}\n\nTask for students\n1. Identify the relevant concept from the lecture.\n2. Explain what you would do and why.\n3. Describe one likely consequence of your decision.\n4. Support your response with evidence from the lecture.\n\nTeacher note: customize the people, setting, constraints, and expected response for your subject.`;
        } else if (lectureAction==='discussion') {
            draft=`${actionLabels[lectureAction]} — ${lectureTitle || 'Lecture'}\n\n${(sentences.slice(0,5).length ? sentences.slice(0,5) : [source.slice(0,300)]).map((s,i)=>`${i+1}. What is the significance of this idea: “${s.trim().slice(0,240)}”?\n   Follow-up: Can you provide an example or counterexample?`).join('\n\n')}`;
        } else {
            draft=`${actionLabels[lectureAction]} — ${lectureTitle || 'Lecture'}\n\nQuestion: Which idea from today's lecture should we review together?\n${(sentences.slice(0,3).length ? sentences.slice(0,3) : [source.slice(0,240)]).map((s,i)=>`${String.fromCharCode(65+i)}. ${s.trim().slice(0,180)}`).join('\n')}\nD. I need a different explanation\n\nTeacher note: review options and set the intended correct answer before publishing.`;
        }
        setLectureOutput(draft+'\n\n[Demo mode: configure POST /api/lecture/generate to connect your chosen AI provider. The source lecture text was extracted locally in your browser.]');
        setLectureBusy(false);
    };
    const exportEvent = async (format) => { if (!activeEvent)
        return; const payload = { event: activeEvent, questions, activities, responses }; if (format === 'json')
        downloadFile(`${activeEvent.title.replace(/[^a-z0-9]/gi, '-')}-report.json`, JSON.stringify(payload, null, 2), 'application/json');
    else {
        const rows = [['section', 'title', 'content', 'author_or_option', 'votes_or_count', 'status'], ...questions.map(q => ['Q&A', activeEvent.title, q.body, q.author_name, q.votes, q.status]), ...activities.map(a => ['activity', a.title, a.prompt, a.type, '', a.is_active ? 'active' : 'closed']), ...responses.map(r => ['response', activities.find(a => a.id === r.activity_id)?.title || '', r.option_text, r.voter_name, 1, 'submitted'])];
        downloadFile(`${activeEvent.title.replace(/[^a-z0-9]/gi, '-')}-report.csv`, rows.map(r => r.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
    } };
    const totalVotes = questions.reduce((n, q) => n + q.votes, 0);
    const approved = questions.filter(q => q.status === 'approved').length;
    const pending = questions.filter(q => q.status === 'pending').length;
    if (authLoading)
        return <div className="center-screen"><div className="loader"/><p>Loading PulseDeck…</p></div>;
    if (supabase && !session)
        return <div className="auth-page"><div className="auth-art"><div className="brand large"><span className="brand-mark"><Activity size={23}/></span>PulseDeck</div><div className="art-copy"><span className="eyebrow">YOUR EVENT, IN SYNC</span><h1>Make every voice<br />part of the room.</h1><p>Live Q&A, polls, quizzes and audience insights in one focused workspace.</p><div className="art-chips"><span><MessageCircle size={15}/> Live Q&A</span><span><Vote size={15}/> Instant polls</span><span><BarChart3 size={15}/> Clear insights</span></div></div><div className="art-foot">A free-first live engagement workspace</div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={authSubmit}><span className="eyebrow">WELCOME TO PULSEDECK</span><h2>{authMode === 'signin' ? 'Sign in to your workspace' : 'Create your free account'}</h2><p className="muted">Manage events and engage your audience from one place.</p><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/></label><label>Password<input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required/></label><button className="primary full" type="submit">{authMode === 'signin' ? 'Sign in' : 'Create account'}</button>{authMessage && <p className="form-message">{authMessage}</p>}<p className="switch-auth">{authMode === 'signin' ? "Don't have an account?" : "Already have an account?"} <button type="button" className="text-button" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>{authMode === 'signin' ? 'Create one' : 'Sign in'}</button></p><p className="tiny muted">Email authentication is handled by your Supabase project. Your password is never stored by this app.</p></form></div></div>;
    return <div className="app-shell"><aside className={`sidebar ${mobileMenu ? 'open' : ''}`}><div className="brand"><span className="brand-mark"><Activity size={21}/></span><span>PulseDeck</span><span className="brand-beta">BETA</span></div><button className="workspace-switch"><span className="workspace-avatar">{(email || session?.user?.email || 'P')[0].toUpperCase()}</span><span className="workspace-label"><b>My workspace</b><small>{session?.user?.email || 'Demo workspace'}</small></span><ChevronDown size={15}/></button><div className="sidebar-scroll">{navGroups.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(item => <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => { setPage(item.name); setMobileMenu(false); }}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Moderation' && pending > 0 && <span className="nav-count">{pending}</span>}</button>)}</div>)}</div><div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={17}/></div><div><b>Make it interactive</b><p>Keep every voice in the conversation.</p></div></div><button className="profile-row" onClick={() => session ? void signOut() : notify('Demo mode: configure Supabase to enable sign-in.')}><span className="profile-avatar">{(session?.user?.email || 'Guest')[0].toUpperCase()}</span><span className="profile-meta"><b>{session?.user?.email?.split('@')[0] || 'Demo user'}</b><small>{session ? 'Signed in' : 'Local demo'}</small></span><LogOut size={16}/></button></div></aside>

 <main className="main-area"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><b>{page}</b></div><div className="topbar-actions"><div className={`connection-pill ${isSupabaseConfigured ? 'connected' : 'demo'}`}><span className="status-dot"/>{isSupabaseConfigured ? 'Cloud connected' : 'Demo mode'}</div><IconButton title="Help" onClick={() => notify('Tip: create an event, then use the join code in Audience view.')}><CircleHelp size={18}/></IconButton><IconButton title="Notifications" onClick={() => setPage('Moderation')}><Bell size={18}/></IconButton><span className="top-avatar">{(session?.user?.email || 'P')[0].toUpperCase()}</span></div></header>

 <div className="content-area"><div className="page-heading"><div><div className="eyebrow">{page === 'Overview' ? 'WORKSPACE SNAPSHOT' : page === 'Audience view' ? 'PARTICIPANT EXPERIENCE' : 'PULSEDECK WORKSPACE'}</div><h1>{page === 'Overview' ? 'Welcome to PulseDeck' : page}</h1><p>{page === 'Overview' ? 'Your teaching tools, sessions and results in one simple place.' : page === 'My events' ? 'Create, organize and run your live sessions.' : page === 'Audience view' ? 'Join the conversation and share your point of view.' : `Everything you need to manage ${page.toLowerCase()} in your workspace.`}</p></div><div className="heading-actions">{page !== 'Audience view' && page !== 'Overview' && <button className="secondary" onClick={() => { setPage('Audience view'); }}><ExternalLink size={16}/> Preview audience</button>}{page !== 'Overview' && <button className="primary" onClick={() => setShowCreate(true)}><Plus size={17}/> Create session</button>}</div></div>

 {!isSupabaseConfigured && <div className="notice"><div className="notice-icon"><CircleHelp size={19}/></div><div><b>Demo mode — connect your free Supabase project for real multi-device sync.</b><p>Data is saved in this browser and works across tabs on the same device. For real multi-device participation, configure Supabase as described in <code>README.md</code>.</p></div><button className="notice-close" onClick={e => e.currentTarget.parentElement.remove()}><X size={16}/></button></div>}

 {page === 'Overview' && <div className="simple-home">
  <section className="home-welcome"><div><span className="eyebrow">YOUR CLASSROOM</span><h2>What are we doing today?</h2><p>Create a session, open one you already planned, or review your results.</p></div><button className="primary home-create" onClick={() => setShowCreate(true)}><Plus size={17}/> Create session</button></section>
  <div className="home-action-grid">
    <button className="home-action-card" onClick={() => setShowCreate(true)}><span className="home-action-icon purple"><Plus size={21}/></span><b>Create a session</b><span>Start a new class and get a join code.</span><strong>Start here <span>→</span></strong></button>
    <button className="home-action-card" onClick={() => { if (!activeEvent) { setShowCreate(true); return; } setPage('Q&A'); }}><span className="home-action-icon green"><Radio size={21}/></span><b>Open live session</b><span>{activeEvent ? `Continue ${activeEvent.title}` : 'Create a session first.'}</span><strong>{activeEvent ? 'Open session' : 'Create session'} <span>→</span></strong></button>
    <button className="home-action-card" onClick={() => setPage('Lecture Studio')}><span className="home-action-icon blue"><BookOpen size={21}/></span><b>Create from a lecture</b><span>Upload slides and make summaries, quizzes or scenarios.</span><strong>Open Lecture Studio <span>→</span></strong></button>
     <button className="home-action-card" onClick={() => setPage('Analytics')}><span className="home-action-icon blue"><BarChart3 size={21}/></span><b>View results</b><span>Review questions, responses and participation.</span><strong>See reports <span>→</span></strong></button>
  </div>
  <section className="panel home-sessions"><div className="panel-heading"><div><h3>Your sessions</h3><p>Everything you create stays here.</p></div><button className="secondary small" onClick={() => setPage('My events')}>View all sessions</button></div>
    {events.length ? events.slice(0,5).map(ev => <div className="home-session-row" key={ev.id}><span className="home-session-icon"><Presentation size={18}/></span><div className="home-session-info"><b>{ev.title}</b><span>{ev.presentation_url ? 'Presentation linked' : 'No presentation linked'} · Join code {ev.join_code}</span></div><span className={`event-status ${ev.status === 'active' ? 'is-active' : 'is-closed'}`}>{ev.status || 'active'}</span><button className="secondary small" onClick={() => { setEventId(ev.id); setPage('Q&A'); }}>Open</button></div>) : <div className="home-empty"><p>No sessions yet. Create your first one to get started.</p><button className="primary" onClick={() => setShowCreate(true)}><Plus size={16}/> Create session</button></div>}
  </section>
  <p className="home-footnote"><CircleHelp size={15}/> You can create a session with or without a presentation. Add a Google Slides or PowerPoint web link during setup.</p>
</div>}

{page === 'My events' && <section className="panel page-panel"><div className="toolbar"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your events"/></div><div className="toolbar-right"><button className="secondary" onClick={() => setQuery('')}><Filter size={15}/> Clear filters</button><button className="primary" onClick={() => setShowCreate(true)}><Plus size={16}/> New event</button></div></div>{filteredEvents.length ? <div className="event-cards">{filteredEvents.map(ev => <article className="event-card" key={ev.id}><div className="event-card-cover"><span className="cover-icon"><Presentation size={22}/></span><span className={`event-status ${ev.status === 'active' ? 'is-active' : 'is-closed'}`}>{ev.status || 'active'}</span><button className="cover-menu" onClick={() => { setEventId(ev.id); setPage('Settings'); }}><MoreHorizontal size={18}/></button></div><div className="event-card-body"><span className="event-code">JOIN CODE · {ev.join_code}</span><h3>{ev.title}</h3><p>{ev.description || 'Your interactive live session.'}</p>{ev.presentation_url && <a className="presentation-link" href={ev.presentation_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}><ExternalLink size={13}/> Open presentation</a>}<div className="event-card-foot"><span><MessageCircle size={14}/> {ev.id === eventId ? questions.length : 0} questions</span><button className="subtle-link" onClick={() => { setEventId(ev.id); setPage('Q&A'); }}>Open event →</button></div></div></article>)}</div> : <div className="empty-state"><span className="empty-icon"><Presentation size={25}/></span><h3>{query ? 'No matching events' : 'Your next great session starts here'}</h3><p>{query ? 'Try a different search term.' : 'Create an event, share its join code, and bring your audience in.'}</p><button className="primary" onClick={() => setShowCreate(true)}><Plus size={16}/> Create session</button></div>}</section>}

 {['Q&A', 'Moderation', 'Audience view'].includes(page) && <><div className="event-context"><div className="event-context-left"><span className="context-icon"><Radio size={18}/></span><div><b>{activeEvent?.title || 'No event selected'}</b><small>{activeEvent ? `Join at your site using code ${activeEvent.join_code}` : 'Create an event to unlock live engagement'}</small></div></div><div className="event-context-actions">{activeEvent && <><span className="join-code"><span>JOIN CODE</span><b>{activeEvent.join_code}</b><IconButton title="Copy join code" onClick={() => { void navigator.clipboard?.writeText(activeEvent.join_code); notify('Join code copied'); }}><Download size={14}/></IconButton></span><button type="button" className="qr-share" onClick={() => setShowJoinScreen(true)} aria-label="Open large classroom join QR code"><img alt="QR code to join this session" src={joinQrData || `https://api.qrserver.com/v1/create-qr-code/?size=112x112&margin=4&data=${encodeURIComponent(joinUrl)}`}/><span>Show join screen</span></button><select value={eventId} onChange={e => setEventId(e.target.value)} aria-label="Select event">{events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></>}</div></div><div className="tabs">{['Q&A', 'Polls', 'Quiz', 'Surveys', 'Moderation', 'Analytics'].map(t => <button key={t} className={page === t ? 'selected' : ''} onClick={() => setPage(t)}>{t}{t === 'Moderation' && pending > 0 && <span className="tab-count">{pending}</span>}</button>)}</div>{page === 'Q&A' || page === 'Audience view' || page === 'Moderation' ? <>{page === 'Audience view' && !activeEvent && <section className="panel join-panel"><h3>Join an event</h3><p className="muted">Enter the code shared by your organizer.</p><form onSubmit={joinEvent}><input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. A8KD3Q" maxLength={12} required/><button className="primary" type="submit">Join event</button></form></section>}<div className="qa-layout"><section className="panel qa-main"><div className="panel-heading"><div><h3>{page === 'Moderation' ? 'Review questions' : page === 'Audience view' ? 'Join the conversation' : 'Audience Q&A'}</h3><p>{page === 'Moderation' ? 'Approve, dismiss or feature incoming questions.' : page === 'Audience view' ? 'Ask a question and support the questions you want answered.' : 'Questions from your audience, ranked by votes.'}</p></div><span className="live-badge"><span className="live-dot"/> LIVE</span></div>{page === 'Audience view' && <form className="ask-form" onSubmit={createQuestion}><div className="ask-form-top"><label>Your display name<input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Guest" maxLength={40}/></label></div><div className="ask-input-row"><input value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Ask the speaker a question…" maxLength={500}/><button className="primary" type="submit"><Send size={15}/> Send</button></div><small className="muted">Be respectful. Questions may be reviewed by a moderator before appearing publicly.</small></form>}{page !== 'Audience view' && <div className="qa-toolbar"><div className="segmented"><button className={sortQuestions === 'votes' ? 'chosen' : ''} onClick={() => setSortQuestions('votes')}>Top voted</button><button className={sortQuestions === 'recent' ? 'chosen' : ''} onClick={() => setSortQuestions('recent')}>Recent</button></div><span className="muted small-text">{questions.length} questions</span></div>}{questions.filter(q => page === 'Moderation' ? q.status === 'pending' : page === 'Audience view' ? q.status === 'approved' : true).sort((a, b) => sortQuestions === 'recent' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : Number(b.pinned) - Number(a.pinned) || b.votes - a.votes).map(q => <article className={`question-card ${q.pinned ? 'pinned' : ''}`} key={q.id}><div className="vote-column"><button className="vote-button" onClick={() => voteQuestion(q)} aria-label="Upvote question">↑</button><b>{q.votes}</b><small>votes</small></div><div className="question-content">{q.pinned && <span className="pinned-label"><Zap size={12}/> Pinned by host</span>}<p>{q.body}</p><div className="question-meta"><span className="mini-avatar">{q.author_name?.[0]?.toUpperCase() || 'G'}</span><b>{q.author_name || 'Guest'}</b><span>·</span><span>{new Date(q.created_at).toLocaleString()}</span><span className={`question-status ${q.status}`}>{q.status}</span></div></div><div className="question-actions">{q.status === 'pending' && <IconButton title="Approve question" onClick={() => questionAction(q, { status: 'approved' })}><Check size={16}/></IconButton>}<IconButton title={q.pinned ? 'Unpin question' : 'Pin question'} onClick={() => questionAction(q, { pinned: !q.pinned })}><Zap size={16}/></IconButton>{q.status !== 'dismissed' && <IconButton title="Dismiss question" onClick={() => questionAction(q, { status: 'dismissed' })}><X size={16}/></IconButton>}{q.status === 'dismissed' && <IconButton title="Restore question" onClick={() => questionAction(q, { status: 'pending' })}><Activity size={16}/></IconButton>}</div></article>)}{!questions.filter(q => page === 'Moderation' ? q.status === 'pending' : page === 'Audience view' ? q.status === 'approved' : true).length && <div className="empty-state compact"><span className="empty-icon"><MessageCircle size={22}/></span><b>No questions yet</b><p>{page === 'Moderation' ? 'New questions awaiting review will appear here.' : 'Be the first to start the conversation.'}</p></div>}</section><aside className="right-rail"><section className="panel attendance-panel"><div className="panel-heading"><div><h3>Class attendance</h3><p>Students connected to this session</p></div><Users size={18} className="muted"/></div><div className="attendance-counts"><div><strong>{attendance.present_count}</strong><span>Present now</span></div><div><strong>{attendance.joined_count}</strong><span>Joined total</span></div><div><strong>{attendance.expected_count == null ? '—' : Math.max(0, Number(attendance.expected_count) - attendance.present_count)}</strong><span>{attendance.expected_count == null ? 'Set class size' : 'Not connected'}</span></div></div>{attendance.expected_count != null && <div className="attendance-progress"><div><span>Connected now</span><b>{attendance.present_count} / {attendance.expected_count}</b></div><div className="attendance-track"><i style={{ width: `${Math.min(100, attendance.present_count / Math.max(1, Number(attendance.expected_count)) * 100)}%` }}/></div></div>}<p className="tiny muted">“Present now” means the student’s browser has checked in during the last 60 seconds. This is a connection estimate, not verified physical attendance.</p>{attendance.participant_names?.length > 0 && <details className="attendance-list"><summary>View joined students ({attendance.participant_names.length})</summary>{attendance.participant_names.map((person, i) => <div className="attendance-person" key={`${person.name}-${i}`}><span>{person.name}</span><b className={person.is_present ? 'is-present' : 'is-away'}>{person.is_present ? 'Present' : 'Away'}</b></div>)}</details>}</section><section className="panel"><div className="panel-heading"><div><h3>Session pulse</h3><p>Selected event activity</p></div><Gauge size={18} className="muted"/></div><div className="pulse-stat"><span>Questions received</span><b>{questions.length}</b></div><div className="pulse-stat"><span>Awaiting review</span><b>{pending}</b></div><div className="pulse-stat"><span>Approved</span><b>{approved}</b></div><div className="pulse-stat"><span>Total upvotes</span><b>{totalVotes}</b></div><button className="secondary full" onClick={() => setPage('Analytics')}>View analytics <span>→</span></button></section><section className="panel"><div className="panel-heading"><div><h3>Host announcement</h3><p>Send a message to participants</p></div><Bell size={17} className="muted"/></div><form onSubmit={sendBroadcast}><textarea value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="Share an update with your audience…" rows={3}/><button className="primary full" type="submit"><Send size={15}/> Send announcement</button></form><div className="announcement-feed"><b className="announcement-feed-title">Recent announcements</b>{broadcasts.length ? broadcasts.slice(0, 5).map(item => <article className="announcement-item" key={item.id}><p>{item.message}</p><small>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}</small></article>) : <p className="tiny muted">No announcements sent for this event yet.</p>}</div></section></aside></div></> : null}</>}

 {['Polls', 'Quiz', 'Surveys'].includes(page) && <section className="panel page-panel"><div className="toolbar"><div><h3>{page === 'Polls' ? 'Live polls' : page === 'Quiz' ? 'Knowledge checks' : 'Audience surveys'}</h3><p className="muted">Create and publish an activity for the selected event.</p></div><button className="primary" onClick={() => { setActivityType(page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : 'survey'); setShowActivityForm(true); }}><Plus size={16}/> Create {page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : 'survey'}</button></div><div className="activity-layout"><div className="activity-list">{activities.filter(a => a.type === (page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : 'survey')).map(a => <button key={a.id} className={`activity-list-item ${selectedActivity === a.id ? 'active' : ''}`} onClick={() => setSelectedActivity(a.id)}><span className="activity-icon">{a.type === 'poll' ? <Vote size={18}/> : a.type === 'quiz' ? <Zap size={18}/> : <ClipboardList size={18}/>}</span><span><b>{a.title}</b><small>{a.options?.length || 0} options · {a.is_active ? 'Active' : 'Closed'}</small></span><span className={`tiny-status ${a.is_active ? 'on' : ''}`}>{a.is_active ? 'LIVE' : 'PAUSED'}</span></button>)}{!activities.some(a => a.type === (page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : 'survey')) && <div className="empty-state compact"><span className="empty-icon"><Vote size={22}/></span><b>No {page.toLowerCase()} yet</b><p>Create one to collect audience responses.</p></div>}</div><div className="activity-detail">{activeActivity && activeActivity.type === (page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : 'survey') ? <><div className="activity-detail-head"><span className="activity-type-label">{activeActivity.type.toUpperCase()}</span><span className="live-badge"><span className="live-dot"/> {activeActivity.is_active ? 'LIVE' : 'PAUSED'}</span></div><h2>{activeActivity.title}</h2><p className="muted">{activeActivity.prompt}</p><div className="response-total"><b>{totalResponses}</b><span>responses submitted</span></div><form onSubmit={submitResponse} className="response-options">{(activeActivity.options || []).map((opt, i) => <label className={`response-option ${answer === opt ? 'selected' : ''}`} key={opt}><input type="radio" name="activity-answer" value={opt} checked={answer === opt} onChange={e => setAnswer(e.target.value)}/><span>{opt}</span><b>{counts[opt] || 0}</b></label>)}<button className="primary full" type="submit">Submit response</button></form><div className="result-bars"><h4>Live results</h4>{(activeActivity.options || []).map(opt => <div className="result-row" key={opt}><div><span>{opt}</span><b>{counts[opt] || 0}</b></div><div className="result-track"><i style={{ width: (totalResponses ? ((counts[opt] || 0) / totalResponses) * 100 : 0) + '%' }}/></div></div>)}</div><div className="detail-actions"><button className="secondary" onClick={async () => { if (!supabase) {
        updateStore(st => ({ ...st, activities: st.activities.map(a => a.id === activeActivity.id ? { ...a, is_active: !a.is_active } : a) }));
        notify(activeActivity.is_active ? 'Activity paused' : 'Activity published');
        return;
    } const { error } = await supabase.from('activities').update({ is_active: !activeActivity.is_active }).eq('id', activeActivity.id); if (error)
        notify(error.message);
    else {
        setActivities(old => old.map(a => a.id === activeActivity.id ? { ...a, is_active: !a.is_active } : a));
        notify(activeActivity.is_active ? 'Activity paused' : 'Activity published');
    } }}>{activeActivity.is_active ? 'Pause activity' : 'Publish activity'}</button><button className="secondary" onClick={() => void exportEvent('csv')}><Download size={15}/> Export results</button></div></> : <div className="empty-state"><span className="empty-icon"><Vote size={24}/></span><h3>Select an activity</h3><p>Choose an activity from the list or create a new one.</p><button className="primary" onClick={() => { setActivityType(page === 'Polls' ? 'poll' : page === 'Quiz' ? 'quiz' : 'survey'); setShowActivityForm(true); }}><Plus size={16}/> Create activity</button></div>}</div></div></section>}

 {page === 'Lecture Studio' && <section className="lecture-studio">
  <div className="lecture-intro panel"><div className="lecture-intro-icon"><WandSparkles size={24}/></div><div><span className="eyebrow">TEACHER WORKFLOW</span><h2>Turn your lecture into a learning activity</h2><p>Upload a PowerPoint or PDF, or paste lecture text. Choose what you need, review it, then use it in your class.</p></div></div>
  <div className="lecture-layout">
    <section className="panel lecture-input-panel"><div className="panel-heading"><div><h3>1. Add lecture content</h3><p>PowerPoint text and selectable PDF text are extracted in your browser.</p></div></div>
      <label className="lecture-drop" htmlFor="lecture-file"><FileUp size={27}/><b>{lectureFile ? lectureFile.name : 'Choose a PowerPoint or PDF'}</b><span>Accepted: .pptx and .pdf</span><input id="lecture-file" type="file" accept=".pptx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={e=>void readLectureFile(e.target.files?.[0])}/></label>
      <div className="lecture-or"><span>OR PASTE TEXT</span></div>
      <label className="field-label" htmlFor="lecture-title">Lecture title</label><input id="lecture-title" className="field-input" value={lectureTitle} onChange={e=>setLectureTitle(e.target.value)} placeholder="e.g. Introduction to Databases"/>
      <label className="field-label" htmlFor="lecture-text">Lecture content</label><textarea id="lecture-text" className="lecture-textarea" value={lectureText} onChange={e=>setLectureText(e.target.value)} placeholder="Paste slide notes or lecture text here…" rows={9}/>
      <div className="lecture-meta"><span>{lectureText.length.toLocaleString()} characters extracted</span><span>Text stays in this browser until you generate content.</span></div>
      {lectureError && <p className="lecture-error" role="alert">{lectureError}</p>}
    </section>
    <section className="panel lecture-action-panel"><div className="panel-heading"><div><h3>2. What do you need?</h3><p>Choose an activity for this lecture.</p></div></div>
      <div className="lecture-action-grid">{[{id:'summary',icon:BookOpen,title:'Summarize lecture',desc:'Key ideas and takeaways'},{id:'quiz',icon:Brain,title:'Create a quiz',desc:'Questions to check understanding'},{id:'scenario',icon:Sparkles,title:'Scenario activity',desc:'Apply concepts to a situation'},{id:'discussion',icon:MessageCircle,title:'Discussion prompts',desc:'Questions for classroom talk'},{id:'poll',icon:Vote,title:'Quick poll',desc:'Check the room in seconds'}].map(item=><button key={item.id} className={`lecture-action ${lectureAction===item.id?'selected':''}`} onClick={()=>setLectureAction(item.id)}><item.icon size={20}/><b>{item.title}</b><span>{item.desc}</span></button>)}</div>
      <button className="primary lecture-generate" disabled={lectureBusy||!lectureText.trim()} onClick={()=>void generateLectureContent()}>{lectureBusy?'Preparing…':<><WandSparkles size={17}/> Generate draft</>}</button>
      <p className="lecture-smallprint">Review all generated content before sharing. Slide images, charts, and speaker notes may not be included in extracted text.</p>
    </section>
  </div>
  {lectureOutput && <section className="panel lecture-output"><div className="panel-heading"><div><h3>3. Review your draft</h3><p>Edit the content before using it with students.</p></div><button className="secondary small" onClick={()=>downloadFile(`${(lectureTitle||'lecture').replace(/[^a-z0-9]/gi,'-')}-${lectureAction}.txt`,lectureOutput)}> <Download size={15}/> Download draft</button></div><textarea aria-label="Editable generated lecture activity" className="lecture-textarea output-textarea" rows={15} value={lectureOutput} onChange={e=>setLectureOutput(e.target.value)}/><div className="lecture-output-actions"><button className="secondary" onClick={()=>{navigator.clipboard?.writeText(lectureOutput);notify('Draft copied');}}><ClipboardList size={16}/> Copy draft</button><button className="primary" onClick={()=>{downloadFile(`${(lectureTitle||'lecture').replace(/[^a-z0-9]/gi,'-')}-${lectureAction}.txt`,lectureOutput);notify('Draft downloaded');}}><Download size={16}/> Save draft</button></div></section>}
  <section className="lecture-addin-note"><Presentation size={19}/><div><b>Also want to work directly inside PowerPoint?</b><p>The companion add-in starter is included in this project under <code>powerpoint-addin/</code>. It provides the task-pane foundation; follow its README to configure and sideload it for development.</p></div></section>
</section>}

{page === 'Analytics' && <><div className="stat-grid"><div className="stat-card"><div className="stat-top"><span className="stat-icon purple"><Presentation size={18}/></span><span className="stat-label">Events</span></div><strong>{events.length}</strong><small>Total in workspace</small></div><div className="stat-card"><div className="stat-top"><span className="stat-icon green"><MessageCircle size={18}/></span><span className="stat-label">Questions</span></div><strong>{questions.length}</strong><small>In selected event</small></div><div className="stat-card"><div className="stat-top"><span className="stat-icon orange"><Vote size={18}/></span><span className="stat-label">Upvotes</span></div><strong>{totalVotes}</strong><small>Audience signals</small></div><div className="stat-card"><div className="stat-top"><span className="stat-icon blue"><Activity size={18}/></span><span className="stat-label">Activities</span></div><strong>{activities.length}</strong><small>Polls, quizzes, surveys</small></div></div><section className="panel page-panel"><div className="panel-heading"><div><h3>Engagement report</h3><p>Based on the currently selected event.</p></div><div className="export-actions"><button className="secondary" onClick={() => void exportEvent('csv')}><Download size={15}/> Export CSV</button><button className="secondary" onClick={() => void exportEvent('json')}><Download size={15}/> Export JSON</button></div></div><div className="analytics-grid"><div className="analytics-box"><h4>Question status</h4>{[{ label: 'Approved', n: approved, c: 'green' }, { label: 'Pending review', n: pending, c: 'orange' }, { label: 'Dismissed', n: questions.filter(q => q.status === 'dismissed').length, c: 'gray' }].map(x => <div className="analytics-bar-row" key={x.label}><div><span>{x.label}</span><b>{x.n}</b></div><div className="analytics-track"><i className={x.c} style={{ width: (questions.length ? x.n / questions.length * 100 : 0) + '%' }}/></div></div>)}</div><div className="analytics-box"><h4>Activity response counts</h4>{activities.map(a => <div className="analytics-activity-row" key={a.id}><span className="activity-icon"><Activity size={16}/></span><span><b>{a.title}</b><small>{a.type}</small></span><strong>{allResponses.filter(r => r.activity_id === a.id).length}</strong></div>)}{!activities.length && <p className="muted">Create a poll, quiz or survey to start collecting results.</p>}</div></div><div className="report-note"><BarChart3 size={18}/><p><b>Reporting note</b><br />Live totals update from stored questions and responses. Unique participants, attendance duration and per-user completion rates are not currently tracked.</p></div></section></>}

 {page === 'Team' && <section className="panel page-panel"><div className="panel-heading"><div><h3>Workspace members</h3><p>Roles are controlled through Supabase authentication and database policies.</p></div><span className="role-pill">Owner / signed-in user</span></div><div className="team-row"><span className="profile-avatar">{(session?.user?.email || 'D')[0].toUpperCase()}</span><span className="team-member"><b>{session?.user?.email || 'Demo user'}</b><small>Current account</small></span><span className="role-pill">Organizer</span></div><div className="report-note"><ShieldCheck size={18}/><p><b>Role management status</b><br />The schema supports event ownership and owner-scoped policies. A full invitation flow, role editor and co-host permissions UI are not implemented in this starter version; do not treat client-side role labels as authorization.</p></div></section>}

 {page === 'Integrations' && <section className="panel page-panel"><div className="panel-heading"><div><h3>Everything in one workspace</h3><p>Native tools built into PulseDeck — no extension required.</p></div><span className="free-pill">FREE CORE</span></div><div className="integration-grid">{[{ name: 'Live Q&A', desc: 'Collect, upvote, pin and moderate audience questions.', icon: MessageCircle, state: 'Built in' }, { name: 'Polls & results', desc: 'Create option-based polls and view response counts.', icon: Vote, state: 'Built in' }, { name: 'Quizzes', desc: 'Run knowledge checks with options and response totals.', icon: Zap, state: 'Built in' }, { name: 'Surveys', desc: 'Collect structured feedback with multiple-choice options.', icon: ClipboardList, state: 'Built in' }, { name: 'Presentation mode', desc: 'Use the responsive workspace and audience view on a projector.', icon: Presentation, state: 'Basic view' }, { name: 'Reports & exports', desc: 'Download event questions, activities and responses as CSV or JSON.', icon: Download, state: 'Built in' }, { name: 'Announcements', desc: 'Store host messages for the event.', icon: Bell, state: 'Storage only' }, { name: 'Team collaboration', desc: 'Workspace account and event ownership groundwork.', icon: Users, state: 'Partial' }].map(item => <article className="integration-card" key={item.name}><span className="integration-icon"><item.icon size={20}/></span><span className="integration-state">{item.state}</span><h3>{item.name}</h3><p>{item.desc}</p></article>)}</div><div className="report-note"><Link2 size={18}/><p><b>No external integrations are required.</b><br />This version replaces common engagement features with native functionality. Zoom, Teams, PowerPoint, Google Slides, calendar sync, SSO and external app embeds are not implemented. Adding those requires provider-specific APIs, OAuth permissions and potentially separate approval.</p></div></section>}

 {page === 'Settings' && <section className="panel page-panel"><div className="panel-heading"><div><h3>Event & workspace settings</h3><p>Review your selected event and share details.</p></div></div>{activeEvent ? <><div className="settings-row"><div><b>Event name</b><p>{activeEvent.title}</p></div><span className="role-pill">{activeEvent.status}</span></div><div className="settings-row"><div><b>Presentation</b><p>{activeEvent.presentation_url || 'No presentation linked to this session. Add the link when creating a session.'}</p></div>{activeEvent.presentation_url && <a className="secondary link-button" href={activeEvent.presentation_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open slides</a>}</div><div className="settings-row"><div><b>Audience join code</b><p>Share this code with participants to locate your event.</p></div><button className="secondary" onClick={() => { void navigator.clipboard?.writeText(activeEvent.join_code); notify('Join code copied'); }}>{activeEvent.join_code} · Copy</button></div><div className="settings-row"><div><b>Export event data</b><p>Download a copy of your current event's questions and activities.</p></div><div className="export-actions"><button className="secondary" onClick={() => void exportEvent('csv')}>CSV</button><button className="secondary" onClick={() => void exportEvent('json')}>JSON</button></div></div><div className="settings-row"><div><b>Close event</b><p>Change the event status to closed.</p></div><button className="danger-button" onClick={async () => { if (!supabase) {
        updateStore(st => ({ ...st, events: st.events.map(ev => ev.id === activeEvent.id ? { ...ev, status: ev.status === 'closed' ? 'active' : 'closed' } : ev) }));
        notify('Event status updated');
        return;
    } const { error } = await supabase.from('events').update({ status: activeEvent.status === 'closed' ? 'active' : 'closed' }).eq('id', activeEvent.id); if (error)
        notify(error.message);
    else {
        setEvents(old => old.map(e => e.id === activeEvent.id ? { ...e, status: e.status === 'closed' ? 'active' : 'closed' } : e));
        notify('Event status updated');
    } }}>{activeEvent.status === 'closed' ? 'Reopen event' : 'Close event'}</button></div></> : <div className="empty-state"><h3>No event selected</h3><button className="primary" onClick={() => setShowCreate(true)}>Create event</button></div>}<div className="report-note"><Settings size={18}/><p><b>Environment setup</b><br />Authentication, database and realtime depend on the Supabase URL/key and SQL schema in this project. See README.md for setup and security notes.</p></div></section>}

 </div></main>

 {showJoinScreen && activeEvent && <div className="join-screen-backdrop" role="dialog" aria-modal="true" aria-label="Classroom join screen" onMouseDown={e => { if (e.target === e.currentTarget) setShowJoinScreen(false); }}><section className="join-screen-card"><button className="join-screen-close" onClick={() => setShowJoinScreen(false)} aria-label="Close join screen"><X size={22}/></button><span className="join-screen-eyebrow">PULSEDECK · JOIN CLASS</span><h1>{activeEvent.title}</h1><p className="join-screen-instruction">Open your phone camera and scan this code</p><div className="join-screen-qr">{joinQrData ? <img src={joinQrData} alt={`Large QR code to join ${activeEvent.title}`} /> : <p>Preparing QR code…</p>}</div><div className="join-screen-code"><span>OR ENTER THIS CODE</span><strong>{activeEvent.join_code}</strong></div><a className="join-screen-url" href={joinUrl} target="_blank" rel="noreferrer">{joinUrl}</a><div className="join-screen-actions"><button className="primary" onClick={downloadJoinQr} disabled={!joinQrData}><Download size={17}/> Download QR (PNG)</button><button className="secondary" onClick={() => { void navigator.clipboard?.writeText(joinUrl); notify('Join link copied'); }}><Link2 size={17}/> Copy join link</button></div><p className="join-screen-tip">Tip: keep this screen open while presenting, or download the QR image and add it to your existing slides.</p></section></div>}

 {showCreate && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        setShowCreate(false); }}><form className="modal" onSubmit={createEvent}><div className="modal-heading"><div><span className="eyebrow">NEW SESSION</span><h2>Create a session</h2><p>Set up your class and optionally link your slides.</p></div><IconButton title="Close" onClick={() => setShowCreate(false)}><X size={18}/></IconButton></div><label>Event name<input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Product kickoff 2026" required maxLength={120}/></label><label>Description <span className="muted">(optional)</span><textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What is this session about?" rows={2} maxLength={500}/></label><label>Expected class size <span className="muted">(optional)</span><input type="number" min="1" max="10000" step="1" value={expectedParticipants} onChange={e => setExpectedParticipants(e.target.value)} placeholder="e.g. 50 students" /></label><label>Presentation link <span className="muted">(optional)</span><input type="url" value={newPresentationUrl} onChange={e => setNewPresentationUrl(e.target.value)} placeholder="Paste a Google Slides or PowerPoint web link" /></label><p className="tiny muted">Set your slides to “Anyone with the link can view” if students need to open them. PulseDeck saves the link with this session.</p><div className="modal-note"><Sparkles size={16}/><span>We'll create a join code. You can add polls and quizzes after creating the session.</span></div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="primary"><Plus size={16}/> Create session</button></div></form></div>}

 {showActivityForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        setShowActivityForm(false); }}><form className="modal" onSubmit={createActivity}><div className="modal-heading"><div><span className="eyebrow">AUDIENCE INTERACTION</span><h2>Create {activityType}</h2><p>Build an activity for {activeEvent?.title || 'your event'}.</p></div><IconButton title="Close" onClick={() => setShowActivityForm(false)}><X size={18}/></IconButton></div><label>Activity type<select value={activityType} onChange={e => setActivityType(e.target.value)}><option value="poll">Poll</option><option value="quiz">Quiz</option><option value="survey">Survey</option></select></label><label>Title<input value={activityTitle} onChange={e => setActivityTitle(e.target.value)} placeholder="e.g. Quick confidence check" required maxLength={120}/></label><label>Question / prompt<input value={activityPrompt} onChange={e => setActivityPrompt(e.target.value)} placeholder="What would you like to ask?" required maxLength={500}/></label><label>Answer options <span className="muted">(one per line)</span><textarea value={optionsText} onChange={e => { setOptionsText(e.target.value); const next = e.target.value.split("\n").map(x => x.trim()).filter(Boolean); if (!next.includes(correctOption))
        setCorrectOption(""); }} rows={4} required/></label>{activityType === 'quiz' && <><label>Correct answer<select value={correctOption} onChange={e => setCorrectOption(e.target.value)} required><option value="">Choose the correct option</option>{optionsText.split("\n").map(x => x.trim()).filter(Boolean).map(option => <option key={option} value={option}>{option}</option>)}</select></label><label>Explanation <span className="muted">(optional)</span><textarea value={quizExplanation} onChange={e => setQuizExplanation(e.target.value)} rows={2} maxLength={1000} placeholder="Explain why this answer is correct."/></label></>}<div className="modal-note"><CircleHelp size={16}/><span>{activityType === 'quiz' ? 'Students receive immediate correctness feedback after submitting. The answer key is stored separately from public quiz options.' : 'Participants can submit a response while the activity is active.'}</span></div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowActivityForm(false)}>Cancel</button><button type="submit" className="primary"><Plus size={16}/> Create activity</button></div></form></div>}

 {toast && <div className="toast"><Check size={16}/>{toast}</div>}

 </div>;
}
export default App;
