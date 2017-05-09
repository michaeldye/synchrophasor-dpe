import React from 'react'
import ReactDOM from 'react-dom'

import { Provider } from 'react-redux'

import App from './App';
import './index.css';

import configureStore from './configure-store'

const reduxStore = configureStore()

ReactDOM.render(
  <div>
    <Provider store={reduxStore}>
      <App />
    </Provider>
    {/* <DebugPanel top right bottom>
      <DevTools store={reduxStore}
        monitor={LogMonitor}
        select={selectState}
      />
    </DebugPanel> */}
  </div>,
  document.getElementById('root')
);
