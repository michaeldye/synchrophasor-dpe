package main

import (
	"flag"
	"fmt"
	"io"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"encoding/json"
	"github.com/golang/glog"
	"github.com/gorilla/mux"
	"google.golang.org/grpc"
	"net/http"

	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"
)

const (
	// defaults overridden by envvars
	defaultBindRPC  = "0.0.0.0:9009"
	defaultBindHTTP = "0.0.0.0:8080"
)

type contract struct {
	Type int    `json:"type"`
	ID   string `json:"id"`
	Ts   int64  `json:"ts"`
}

type agreementResponse struct {
	Lat       string     `json:"lat"`
	Lon       string     `json:"lon"`
	Contracts []contract `json:"contracts"`
}

// dpeServerImpl is an implementation of the protobuf's interface for a SynchrophasorDPEServer, an interface for storing Synchrophasor data from an edge publisher.
type dpeServerImpl struct {
	// the key in this map is <lat>,<lon>
	agreementMap      map[string]agreementResponse
	agreementMapMutex *sync.Mutex
}

func toLatLonKey(lat string, lon string) string {
	return fmt.Sprintf("%s,%s", lat, lon)
}

func (s *dpeServerImpl) Store(stream synchrophasor_dpe.SynchrophasorDPE_StoreServer) error {
	for {
		wrappedDatum, err := stream.Recv()
		if err == io.EOF {
			return fmt.Errorf("Server sent EOF")
		}

		if err != nil {
			return fmt.Errorf("%v.Store(_) = _, %v", stream, err)
		}

		skipPrefix := os.Getenv("AGREEMENTID_SKIP_PREFIX")

		if skipPrefix != "" && strings.HasPrefix(wrappedDatum.AgreementID, skipPrefix) {
			glog.Infof("Skipping recording synchrophasor wrappedDatum b/c its agreement id prefix is matched by the skip prefix (%v). Ignored record: %v", skipPrefix, wrappedDatum)
			continue
		} else {
			glog.Infof("Received synchrophasor wrappedDatum: %v", wrappedDatum)

			// ensure well-formed before forming key and saving datum
			if wrappedDatum.Lat != "" && wrappedDatum.Lon != "" && wrappedDatum.AgreementID != "" {

				con := contract{
					Type: 19,
					ID:   wrappedDatum.AgreementID,
					Ts:   time.Now().Unix(),
				}

				key := toLatLonKey(wrappedDatum.Lat, wrappedDatum.Lon)

				s.agreementMapMutex.Lock()
				if ag, exists := s.agreementMap[key]; exists {
					updateIx := -1

					for ix, exCon := range ag.Contracts {

						if exCon.ID == con.ID {
							updateIx = ix
							break
						}
					}

					if updateIx > -1 {
						ag.Contracts[updateIx].Ts = con.Ts
					} else {
						ag.Contracts = append(ag.Contracts, con)
					}
				} else {
					s.agreementMap[key] = agreementResponse{
						Lat:       wrappedDatum.Lat,
						Lon:       wrappedDatum.Lon,
						Contracts: []contract{con},
					}
				}

				s.agreementMapMutex.Unlock()
			}
		}
	}
}

func agreementHandler(agreementMap map[string]agreementResponse, agreementMapMutex *sync.Mutex) func(http.ResponseWriter, *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
		agreementMapMutex.Lock()
		defer agreementMapMutex.Unlock()

		collection := []agreementResponse{}
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

func startHTTPServer(agreementMap map[string]agreementResponse, agreementMapMutex *sync.Mutex) {
	glog.Infof("Starting HTTP server on %v", defaultBindHTTP)

	go func() {
		router := mux.NewRouter()

		router.HandleFunc("/agreements", agreementHandler(agreementMap, agreementMapMutex)).Methods("GET")
		router.HandleFunc("/status", status).Methods("GET")

		http.ListenAndServe(defaultBindHTTP, router)
	}()
}

func main() {
	flag.Parse()

	// instantiate a new broadcast writer
	lis, err := net.Listen("tcp", defaultBindRPC)
	if err != nil {
		glog.Fatalf("Failed to listen: %v", err)
		os.Exit(1)
	}

	agreementMap := make(map[string]agreementResponse, 0)
	agreementMapMutex := &sync.Mutex{}

	startHTTPServer(agreementMap, agreementMapMutex)

	glog.Infof("Setting up gRPC server on %v", defaultBindRPC)

	// Creates a new gRPC server
	s := grpc.NewServer()
	synchrophasor_dpe.RegisterSynchrophasorDPEServer(s, &dpeServerImpl{
		agreementMap:      agreementMap,
		agreementMapMutex: agreementMapMutex,
	})
	s.Serve(lis)
}
