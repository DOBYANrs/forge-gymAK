import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { WorkoutProvider } from './context/WorkoutContext';
import { TimerProvider } from './context/TimerContext';
import { BodyProvider } from './context/BodyContext';
import { ScheduleProvider } from './context/ScheduleContext';
import App from './App';
import './index.css';

// Restore original URL after redirect (for GitHub Pages / Firebase)
const redirect = sessionStorage.getItem("redirect");
if (redirect) {
  sessionStorage.removeItem("redirect");
  const url = new URL(redirect);
  if (url.pathname !== "/" && url.pathname !== "") {
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/kasaint-gym">
      <UserProvider>
        <ScheduleProvider>
          <WorkoutProvider>
            <TimerProvider>
              <BodyProvider>
                <App />
              </BodyProvider>
            </TimerProvider>
          </WorkoutProvider>
        </ScheduleProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>,
);
