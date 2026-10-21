import { readStore, updateStore, watchStore } from './localStore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, Check, ChevronRight, CircleHelp, MessageCircle, Radio, Send, Vote, Zap, ClipboardList, LogIn, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabase';
const demoEvent = { id: 'demo-event', title: 'PulseDeck Student Demo', join_code: 'PULSE1', status: 'active', description: 'Explore the student experience. Demo responses stay in this browser session.' };
const demoQuestions = [
    { id: 'dq1', event_id: demoEvent.id, body: 'Will the slides be shared after the session?', author_name: 'Areeba', votes: 8, status: 'approved', pinned: true, created_at: new Date().toISOString() },
    { id: 'dq2', event_id: demoEvent.id, body: 'Can you explain the last example one more time?', author_name: 'Hassan', votes: 4, status: 'approved', pinned: false, created_at: new Date().toISOString() },
];
const demoActivities = [
    { id: 'dp1', event_id: demoEvent.id, type: 'poll', title: 'Quick check-in', prompt: 'How familiar are you with this topic?', options: ['Very familiar', 'Somewhat familiar', 'New to me'], is_active: true, created_at: new Date().toISOString() },
    { id: 'dqz1', event_id: demoEvent.id, type: 'quiz', title: 'Knowledge check', prompt: 'Which tool is used to build the PulseDeck interface?', options: ['React', 'Excel', 'PowerPoint'], is_active: true, correct_option: 'React', explanation: 'React is the JavaScript library used to build the PulseDeck user interface.', created_at: new Date().toISOString() },
    { id: 'ds1', event_id: demoEvent.id, type: 'survey', title: 'Session feedback', prompt: 'What would help you most next time?', options: ['More examples', 'More time for questions', 'A short recap'], is_active: true, created_at: new Date().toISOString() },
];
const supabase = createClient('https://xwlvwgncfabendzgntrx.supabase.co', 'sb_publishable_opK90GqSgN76f_KH_FbfvQ_gK8WYbpd');

export default function StudentApp({ sessionId }) {
  const [currentSlide, setCurrentSlide] = useState(1);

  useEffect(() => {
    // 1. Fetch initial slide state
    async function fetchInitialSlide() {
      const { data } = await supabase
        .from('event_presentations')
        .select('current_slide')
        .eq('id', sessionId)
        .single();
      
      if (data) setCurrentSlide(data.current_slide);
    }

    fetchInitialSlide();

    // 2. Subscribe to real-time changes from the presenter
    const channel = supabase
      .channel('presentation_sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_presentations',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new && payload.new.current_slide) {
            setCurrentSlide(payload.new.current_slide);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <div className="student-container">
      <h2>Live Presentation</h2>
      <div className="slide-view">
        {/* Render content based on the live slide number */}
        <p>Currently viewing: <strong>Slide {currentSlide}</strong></p>
      </div>
    </div>
  );
}

function getParticipantToken(eventId) {
  const key = `pulsedeck-participant-token:${eventId}`;
  try {
    let token = localStorage.getItem(key);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(key, token);
    }
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

export default function StudentApp() {
    const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('code')?.toUpperCase() || '');
    const [nickname, setNickname] = useState('Student');
    const [event, setEvent] = useState(null);
  const [participantToken, setParticipantToken] = useState('');
    const [tab, setTab] = useState('Q&A');
    const [questions, setQuestions] = useState([]);
    const [activities, setActivities] = useState([]);
    const [responses, setResponses] = useState([]);
    const [questionText, setQuestionText] = useState('');
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState([]);
    const [quizFeedback, setQuizFeedback] = useState({});
    const [toast, setToast] = useState('');
    const [busy, setBusy] = useState(false);
    const [demo, setDemo] = useState(!isSupabaseConfigured);
    const [error, setError] = useState('');
    const notify = useCallback((message) => { setToast(message); window.setTimeout(() => setToast(''), 2600); }, []);
    const refresh = useCallback(async (eventId) => {
        if (!supabase || eventId === demoEvent.id)
            return;
        const [q, a] = await Promise.all([
            supabase.from('questions').select('*').eq('event_id', eventId).eq('status', 'approved').order('created_at', { ascending: false }),
            supabase.from('activities').select('*').eq('event_id', eventId).eq('is_active', true).order('created_at', { ascending: false }),
        ]);
        if (q.error)
            setError(`Questions could not load: ${q.error.message}`);
        else
            setQuestions((q.data || []));
        if (!a.error) {
            const activityRows = (a.data || []);
            setActivities(activityRows);
            if (activityRows.length) {
                const r = await supabase.rpc('event_response_counts', { target_event: eventId });
                if (!r.error)
                    setResponses((r.data || []).flatMap(row => Array.from({ length: row.total }, (_, i) => ({ id: `count-${row.activity_id}-${i}`, activity_id: row.activity_id, option_text: row.option_text, voter_name: '', created_at: '' }))));
            }
            else
                setResponses([]);
        }
    }, []);
    useEffect(() => {
        if (!event || demo || !supabase)
            return;
        void refresh(event.id);
        const channel = supabase.channel(`student-${event.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `event_id=eq.${event.id}` }, () => void refresh(event.id))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `event_id=eq.${event.id}` }, () => void refresh(event.id))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, () => void refresh(event.id))
            .subscribe();
        const touchPresence = () => supabase.rpc('touch_event_participant', {
            target_event: event.id,
            participant_token: participantToken,
            participant_name: nickname.trim() || 'Student'
        });
        void touchPresence();
        const timer = window.setInterval(() => {
            void refresh(event.id);
            void touchPresence();
        }, 20000);
        return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
    }, [event, demo, refresh, participantToken, nickname]);
    useEffect(() => { if (!event || supabase)
        return; const reload = () => { const st = readStore(); setQuestions(st.questions.filter(q => q.event_id === event.id && q.status === 'approved')); setActivities(st.activities.filter(a => a.event_id === event.id && a.is_active)); setResponses(st.responses.filter(r => st.activities.some(a => a.event_id === event.id && a.id === r.activity_id))); }; reload(); return watchStore(reload); }, [event]);
    const joinEvent = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        const entered = code.trim().toUpperCase();
        if (!isSupabaseConfigured || !supabase) {
            const found = readStore().events.find(x => x.join_code.toUpperCase() === entered);
            if (found && found.status !== 'closed') {
                setSubmitted([]);
                setAnswers({});
                setQuizFeedback({});
                setParticipantToken(getParticipantToken(found.id));
                setDemo(true);
                setEvent(found);
                setTab('Q&A');
                setBusy(false);
                notify('Joined event');
                return;
            }
            if (entered === 'PULSE1' || entered === 'DEMO') {
                setDemo(true);
                setQuizFeedback({});
                setParticipantToken(getParticipantToken(demoEvent.id));
                setEvent(demoEvent);
                setQuestions(demoQuestions);
                setActivities(demoActivities);
                setResponses([]);
                setTab('Q&A');
                setBusy(false);
                notify('Joined the local demo');
                return;
            }
            setBusy(false);
            setError('Code not found. Use PULSE1 for the sample, or enter a code created in the presenter dashboard on this browser.');
            return;
        }
        const { data, error: joinError } = await supabase.rpc('join_event_by_code', { input_code: entered });
        const joined = Array.isArray(data) ? data[0] : data;
        if (joinError || !joined) {
            setBusy(false);
            setError(joinError ? `Could not join event: ${joinError.message}. Check the Supabase setup instructions.` : 'That code was not found or the event is closed.');
            return;
        }
        setSubmitted([]);
        setAnswers({});
        setQuizFeedback({});
        setParticipantToken(getParticipantToken(joined.id));
        setEvent(joined);
        setDemo(false);
        setTab('Q&A');
        setBusy(false);
        await refresh(joined.id);
        notify('You joined the event');
    };
    const sendQuestion = async (e) => {
        e.preventDefault();
        if (!event || !questionText.trim())
            return;
        if (demo || !supabase) {
            const item = { id: crypto.randomUUID(), event_id: event.id, body: questionText.trim(), author_name: nickname.trim() || 'Student', votes: 0, status: 'pending', pinned: false, created_at: new Date().toISOString() };
            if (event.id === 'demo-event') {
                setQuestions(old => [{ ...item, status: 'approved' }, ...old]);
            }
            else {
                updateStore(st => ({ ...st, questions: [item, ...st.questions] }));
            }
            setQuestionText('');
            notify('Question sent for host approval');
            return;
        }
        const { error: insertError } = await supabase.from('questions').insert({ event_id: event.id, body: questionText.trim(), author_name: nickname.trim() || 'Student', votes: 0, status: 'pending', pinned: false, user_id: null });
        if (insertError) {
            setError(`Question not sent: ${insertError.message}`);
            return;
        }
        setQuestionText('');
        notify('Question sent to the host for review');
    };
    const upvote = async (q) => {
        if (demo || !supabase) {
            if (event?.id === 'demo-event')
                setQuestions(old => old.map(item => item.id === q.id ? { ...item, votes: item.votes + 1 } : item));
            else
                updateStore(st => ({ ...st, questions: st.questions.map(item => item.id === q.id ? { ...item, votes: item.votes + 1 } : item) }));
            return;
        }
        const { error: voteError } = await supabase.rpc('upvote_question', { question_uuid: q.id });
        if (voteError)
            setError(`Vote not recorded: ${voteError.message}`);
    };
    const sendAnswer = async (activity) => {
        const answer = answers[activity.id];
        if (!answer || !event) {
            notify('Choose an answer first');
            return;
        }
        if (submitted.includes(activity.id)) {
            notify('You have already answered this activity on this device');
            return;
        }
        if (demo || !supabase) {
            const item = { id: crypto.randomUUID(), activity_id: activity.id, option_text: answer, voter_name: nickname || 'Student', created_at: new Date().toISOString() };
            if (event.id === 'demo-event')
                setResponses(old => [...old, item]);
            else
                updateStore(st => ({ ...st, responses: [...st.responses, item] }));
            if (activity.type === 'quiz')
                setQuizFeedback(old => ({ ...old, [activity.id]: { correct: answer === activity.correct_option, explanation: activity.explanation || '' } }));
            setSubmitted(old => [...old, activity.id]);
            notify('Your response has been recorded locally');
            return;
        }
        if (activity.type === 'quiz') {
            const { data, error: quizError } = await supabase.rpc('submit_quiz_answer', { activity_uuid: activity.id, selected_option: answer, participant_name: nickname.trim() || 'Student', participant_token: participantToken });
            if (quizError) {
                if (quizError.code === '23505') { setSubmitted(old => [...old, activity.id]); notify('You have already responded to this quiz on this device.'); return; }
                setError(`Quiz response not saved: ${quizError.message}`);
                return;
            }
            const result = Array.isArray(data) ? data[0] : data;
            if (result)
                setQuizFeedback(old => ({ ...old, [activity.id]: { correct: Boolean(result.is_correct), explanation: result.explanation || '' } }));
        }
        else {
            const { error: responseError } = await supabase.from('responses').insert({ activity_id: activity.id, option_text: answer, voter_name: nickname.trim() || 'Student', user_id: null, participant_token: participantToken });
            if (responseError) {
                if (responseError.code === '23505') { setSubmitted(old => [...old, activity.id]); notify('You have already responded to this activity on this device.'); return; }
                setError(`Response not saved: ${responseError.message}`);
                return;
            }
        }
        setSubmitted(old => [...old, activity.id]);
        notify(activity.type === 'quiz' ? 'Quiz answer submitted' : 'Response submitted');
    };
    const visibleActivities = useMemo(() => activities.filter(a => a.type.toLowerCase() === (tab === 'Polls' ? 'poll' : tab === 'Surveys' ? 'survey' : tab.toLowerCase())), [activities, tab]);
    const responseCount = (activityId, option) => responses.filter(r => r.activity_id === activityId && r.option_text === option).length;
    if (!event)
        return <div className="student-page"><header className="student-header"><a className="student-brand" href="/"><span className="student-brand-mark"><Activity size={20}/></span>PulseDeck</a><a className="student-host-link" href="/">Organizer sign in <ChevronRight size={15}/></a></header><main className="student-join-wrap"><div className="student-join-art"><span className="student-kicker"><Radio size={15}/> YOUR VOICE, LIVE</span><h1>Join the conversation.</h1><p>Ask questions, share your opinion and take part in live classroom activities from any device.</p><div className="student-feature-row"><span><MessageCircle size={16}/> Q&A</span><span><Vote size={16}/> Polls</span><span><Zap size={16}/> Quizzes</span></div><div className="student-orb student-orb-one"/><div className="student-orb student-orb-two"/></div><form className="student-join-card" onSubmit={joinEvent}><span className="student-small-label">JOIN AN EVENT</span><h2>Ready to participate?</h2><p>Enter the event code shared by your teacher or host.</p><label>Event code<input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. A8KD3Q" maxLength={12} required autoCapitalize="characters"/></label><label>Your display name<input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Your name" maxLength={40}/></label><button className="student-primary" type="submit" disabled={busy}>{busy ? 'Joining…' : <><LogIn size={17}/> Join event</>}</button>{error && <div className="student-error">{error}</div>}<div className="student-demo-note"><CircleHelp size={15}/><span>{isSupabaseConfigured ? 'Connect using your teacher’s active event code.' : 'Demo mode: enter <b>PULSE1</b> to try the student interface. Demo responses are not shared with the organizer.'}</span></div></form><footer className="student-footer">PulseDeck · Student experience</footer></main>{toast && <div className="student-toast"><Check size={16}/>{toast}</div>}</div>;
    return <div className="student-page"><header className="student-header"><a className="student-brand" href="/student"><span className="student-brand-mark"><Activity size={20}/></span>PulseDeck</a><div className="student-event-badge"><span className="student-live-dot"/> {demo ? 'LOCAL DEMO' : 'LIVE EVENT'}</div><button className="student-leave" onClick={() => { setEvent(null); setParticipantToken(''); setCode(''); setSubmitted([]); setAnswers({}); setQuizFeedback({}); setQuestions([]); setActivities([]); setResponses([]); setError(''); }}><ArrowLeft size={15}/> Leave event</button></header><main className="student-main"><div className="student-event-heading"><div><span className="student-small-label">YOU’RE PARTICIPATING IN</span><h1>{event.title}</h1><p>{event.description || 'Take part in the live session below.'}</p></div><div className="student-code-box"><small>EVENT CODE</small><b>{event.join_code}</b></div></div>{error && <div className="student-error student-error-wide">{error}<button onClick={() => setError('')}>Dismiss</button></div>}<div className="student-tabs">{['Q&A', 'Polls', 'Quiz', 'Surveys'].map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'Q&A' ? <MessageCircle size={17}/> : t === 'Polls' ? <Vote size={17}/> : t === 'Quiz' ? <Zap size={17}/> : <ClipboardList size={17}/>}<span>{t}</span>{t === 'Q&A' && <em>{questions.length}</em>}</button>)}</div>{tab === 'Q&A' ? <div className="student-columns"><section className="student-panel"><div className="student-panel-heading"><div><h2>Ask a question</h2><p>Questions may be reviewed by your teacher before appearing.</p></div><MessageCircle size={21}/></div><form className="student-ask-form" onSubmit={sendQuestion}><label>Your question<textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3} placeholder="What would you like to ask?" maxLength={500} required/></label><button className="student-primary" type="submit"><Send size={16}/> Submit question</button></form><div className="student-list-heading"><h2>Questions from the audience</h2><span>{questions.length} visible</span></div>{questions.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.votes - a.votes).map(q => <article className="student-question" key={q.id}><div className="student-question-body">{q.pinned && <span className="student-pinned">FEATURED BY HOST</span>}<p>{q.body}</p><small>{q.author_name} · {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div><button className="student-vote" onClick={() => void upvote(q)} aria-label="Upvote question"><span>↑</span><b>{q.votes}</b><small>Vote</small></button></article>)}{!questions.length && <div className="student-empty"><MessageCircle size={25}/><b>No questions yet</b><p>Be the first to ask something.</p></div>}</section><aside className="student-side-panel"><span className="student-side-icon"><Activity size={20}/></span><h3>Make your voice count</h3><p>Ask clearly, vote for questions you’d like the host to answer, and keep the discussion respectful.</p><div className="student-side-stat"><span>Visible questions</span><b>{questions.length}</b></div><div className="student-side-stat"><span>Activities available</span><b>{activities.length}</b></div><button className="student-secondary" onClick={() => setTab('Polls')}>Explore activities <ChevronRight size={16}/></button></aside></div> : <section className="student-activity-grid">{visibleActivities.map(activity => <article className="student-panel student-activity-card" key={activity.id}><div className="student-activity-top"><span className="student-activity-type">{activity.type.toUpperCase()}</span><span className="student-activity-live">ACTIVE</span></div><h2>{activity.title}</h2><p>{activity.prompt}</p><div className="student-options">{(activity.options || []).map(option => <label key={option} className={`student-option ${answers[activity.id] === option ? 'selected' : ''} ${submitted.includes(activity.id) ? 'locked' : ''}`}><input type="radio" name={activity.id} value={option} checked={answers[activity.id] === option} disabled={submitted.includes(activity.id)} onChange={() => setAnswers(old => ({ ...old, [activity.id]: option }))}/><span>{option}</span>{submitted.includes(activity.id) && <b>{responseCount(activity.id, option)}</b>}</label>)}</div>{submitted.includes(activity.id) ? <div className="student-submitted"><Check size={16}/> Response recorded</div> : <button className="student-primary" onClick={() => void sendAnswer(activity)}>Submit response <ChevronRight size={16}/></button>}{submitted.includes(activity.id) && activity.type === 'quiz' && quizFeedback[activity.id] && <div className={`student-submitted student-quiz-feedback ${quizFeedback[activity.id].correct ? 'is-correct' : 'is-incorrect'}`}><b>{quizFeedback[activity.id].correct ? 'Correct answer!' : 'Not quite — review the explanation below.'}</b>{quizFeedback[activity.id].explanation && <p>{quizFeedback[activity.id].explanation}</p>}</div>}{submitted.includes(activity.id) && <div className="student-results"><b>Current responses</b>{activity.options.map(option => <div className="student-result-row" key={option}><span>{option}</span><b>{responseCount(activity.id, option)}</b><i style={{ width: `${responses.filter(r => r.activity_id === activity.id).length ? responseCount(activity.id, option) / responses.filter(r => r.activity_id === activity.id).length * 100 : 0}%` }}/></div>)}</div>}</article>)}{!visibleActivities.length && <div className="student-panel student-empty"><ClipboardList size={25}/><b>No active {tab.toLowerCase()} right now</b><p>Your teacher has not launched one yet. Check again in a moment.</p><button className="student-secondary" onClick={() => event && void refresh(event.id)}><RefreshCw size={15}/> Refresh activities</button></div>}</section>}<footer className="student-main-footer">PulseDeck student view <span>•</span> {demo ? 'Local demo data' : 'Connected to the event backend'}</footer></main>{toast && <div className="student-toast"><Check size={16}/>{toast}</div>}</div>;
}

