import { WS_CONNECT, WS_DISCONNECT, RECEIVE_MESSAGE } from '../constants/actionTypes'
import { wsURL } from '../constants/config'

export const wsConnect = () => {
  return {
    type: WS_CONNECT,
  }
}

export const wsDisconnect = () => {
  return {
    type: WS_DISCONNECT,
  }
}

export const receiveMessage = (data) => {
  return {
    type: RECEIVE_MESSAGE,
    data,
    receivedAt: Date.now(),
  }
}

export const connectToWS = () => {
  // console.log('wsURL', wsURL);
  const ws = new WebSocket(wsURL)
  ws.onopen = function(evt) {
    // console.log('opened ws')
    return dispatch => {
      dispatch(wsConnect(evt))
    }
  }
  ws.onclose = function(evt) {
    // console.log('closed ws')
    return dispatch => {
      dispatch(wsDisconnect(evt))
    }
  }
  ws.onmessage = function(evt) {
    console.log('received message')
    return dispatch => {
      dispatch(receiveMessage(evt))
    }
  }
}
