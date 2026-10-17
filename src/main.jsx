import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import StudentApp from './StudentApp';
import LandingPage from './landing_page';
import './app.css';
import './landing_Page.css';
const path = window.location.pathname.toLowerCase();
createRoot(document.getElementById('root')).render(<React.StrictMode>{path.startsWith('/student') ? <StudentApp /> : path.startsWith('/dashboard') ? <App /> : <LandingPage onGetStarted={() => window.location.assign('/dashboard')} onSignIn={() => window.location.assign('/dashboard')} onJoinEvent={() => window.location.assign('/student')}/>}</React.StrictMode>);
