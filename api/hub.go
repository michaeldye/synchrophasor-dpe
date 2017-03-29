package api

import (
	"encoding/json"
	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"

	"github.com/golang/glog"
)

// from Gorllia docs

// hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	stream <-chan *synchrophasor_dpe.HorizonDatumWrapper
}

func newHub(stream <-chan *synchrophasor_dpe.HorizonDatumWrapper) *Hub {
	return &Hub{
		stream:     stream,
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func messageToBytes(datum *synchrophasor_dpe.HorizonDatumWrapper) ([]byte, error) {
	serial, err := json.Marshal(datum)
	if err != nil {
		return nil, err
	}

	return serial, nil
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.stream:
			serial, err := messageToBytes(message)
			if err != nil {
				glog.Errorf("Unable to serialize message for output: %v", message)
			}

			for client := range h.clients {
				select {
				case client.send <- serial:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}
