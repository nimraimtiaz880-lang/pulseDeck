import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentSessionId = null;

Office.onReady((info) => {
  if (info.host === Office.HostType.PowerPoint) {
    document.getElementById('app-body').style.display = 'flex';
    document.getElementById('start-session-btn').onclick = startSyncSession;
  }
});

async function startSyncSession() {
  const sessionCode = document.getElementById('session-code-input').value.trim();
  if (!sessionCode) {
    alert('Please enter a session code');
    return;
  }

  // Find the presentation session in Supabase
  const { data, error } = await supabase
    .from('event_presentations')
    .select('id')
    .eq('session_code', sessionCode)
    .single();

  if (error || !data) {
    alert('Session not found. Check your session code.');
    return;
  }

  currentSessionId = data.id;
  document.getElementById('status-badge').innerText = 'Connected & Live';

  // Listen for slide changes in PowerPoint
  Office.context.document.addHandlerAsync(
    Office.EventType.DocumentSelectionChanged,
    onSlideSelectionChanged
  );

  broadcastCurrentSlide();
}

function onSlideSelectionChanged() {
  PowerPoint.run(async (context) => {
    const selectedSlides = context.presentation.getSelectedSlides();
    selectedSlides.load('items');
    await context.sync();

    if (selectedSlides.items.length > 0) {
      const activeSlide = selectedSlides.items[0];
      activeSlide.load('id');
      await context.sync();

      const slides = context.presentation.slides;
      slides.load('items');
      await context.sync();

      const slideIndex = slides.items.findIndex(s => s.id === activeSlide.id) + 1;
      
      if (slideIndex > 0) {
        await updateSlideInSupabase(slideIndex);
      }
    }
  });
}

async function updateSlideInSupabase(slideNumber) {
  if (!currentSessionId) return;

  await supabase
    .from('event_presentations')
    .update({ 
      current_slide: slideNumber,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentSessionId);

  document.getElementById('active-slide-label').innerText = `Slide ${slideNumber}`;
}
