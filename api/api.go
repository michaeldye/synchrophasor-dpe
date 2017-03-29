package api

import (
	"sync"

	"encoding/json"
	"github.com/golang/glog"
	"github.com/gorilla/mux"
	"net/http"

	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"
)

// Contract represents a Horizon contract agreement.
type Contract struct {
	Type int    `json:"type"`
	ID   string `json:"id"`
	Ts   int64  `json:"ts"`
}

// AgreementResponse is a type for serialized API output.
type AgreementResponse struct {
	Lat       float32    `json:"lat"`
	Lon       float32    `json:"lon"`
	Contracts []Contract `json:"contracts"`
}

// dpeServerImpl is an implementation of the protobuf's interface for a SynchrophasorDPEServer, an interface for storing Synchrophasor data from an edge publisher.
type dpeServerImpl struct {
	// the key in this map is <lat>,<lon>
	agreementMap      map[string]AgreementResponse
	agreementMapMutex *sync.Mutex
	clientChannel     chan<- *synchrophasor_dpe.HorizonDatumWrapper
}

func agreementHandler(agreementMap map[string]AgreementResponse, agreementMapMutex *sync.Mutex) func(http.ResponseWriter, *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
		agreementMapMutex.Lock()
		defer agreementMapMutex.Unlock()

		collection := []AgreementResponse{}
		for _, ag := range agreementMap {
			collection = append(collection, ag)
		}

		switch r.Method {
		case "GET":
			serial, err := json.Marshal(collection)
			if err != nil {
				glog.Infof("Error serializing agreement output: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			if _, err := w.Write(serial); err != nil {
				glog.Infof("Error writing response: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func status(w http.ResponseWriter, r *http.Request) {
	type status struct {
		Service string `json:"service"`
	}

	switch r.Method {
	case "GET":
		stat := &status{
			Service: "RUNNING",
		}

		serial, err := json.Marshal(stat)
		if err != nil {
			glog.Infof("Error serializing agreement output: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if _, err := w.Write(serial); err != nil {
			glog.Infof("Error writing response: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// StartHTTPServer blocks and serves both HTTP API and WS clients.
func StartHTTPServer(bindHTTP string, agreementMap map[string]AgreementResponse, agreementMapMutex *sync.Mutex, dataChannel <-chan *synchrophasor_dpe.HorizonDatumWrapper) {
	glog.Infof("Starting HTTP API and WS server on %v", bindHTTP)

	go func() {
		router := mux.NewRouter()

		router.HandleFunc("/agreements", agreementHandler(agreementMap, agreementMapMutex)).Methods("GET")
		router.HandleFunc("/status", status).Methods("GET")
		router.HandleFunc("/subscribe", clientSubscribe)
		router.HandleFunc("/subscribe/stream", serveStream)

		http.ListenAndServe(bindHTTP, router)
	}()
}

func dedup(in <-chan *synchrophasor_dpe.HorizonDatumWrapper) <-chan *synchrophasor_dpe.HorizonDatumWrapper {
	out := make(chan *synchrophasor_dpe.HorizonDatumWrapper)

	go func() {
		// continually process input data, deduplicate and send single stream to output
	}()

	return out
}
