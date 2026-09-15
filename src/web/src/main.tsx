import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication} from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './authConfig';
import './index.css'
import App from './App.tsx'

// import 'bootstrap/dist/css/bootstrap.min.css';
// import './styles/index.css';


const msalInstance = new PublicClientApplication(msalConfig); //MSAL instance for SPA's

// if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
//     // Account selection logic is app dependent. Adjust as needed for different use cases.
//     msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
// }

// msalInstance.addEventCallback((event) => {
//     if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
//         const account = event.payload.account;
//         msalInstance.setActiveAccount(account);
//     }
// });
msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>
  )
})
