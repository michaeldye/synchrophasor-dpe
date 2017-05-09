import { combineReducers } from 'redux'
import {
  WS_CONNECT,
  WS_DISCONNECT,
  RECEIVE_MESSAGE,
} from '../constants/actionTypes'

const initialState = {
  dataStreamHistory: [],
  latestDataStream: {},
  connected: false,
}

function stream(state = initialState, action) {
  switch (action.type) {
    case WS_CONNECT:
      return {
        ...state,
        connected: true,
      }

    case WS_DISCONNECT:
      return {
        ...state,
        connected: false,
      }

    case RECEIVE_MESSAGE:
      return {
        ...state,
        dataStreamHistory: [...state.dataStreamHistory, action.data],
      }

    default:
      return {
        ...state,
      }
  }
}

const rootReducer = combineReducers({
  stream,
})

export default rootReducer
