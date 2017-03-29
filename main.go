package main

import (
	"flag"
	"fmt"
	"io"
	"net"
	"os"
	"runtime"
	"sync"
	"time"

	"github.com/golang/glog"
	"google.golang.org/grpc"

	"github.com/michaeldye/synchrophasor-dpe/api"
	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"
)

const (
	// defaults overridden by envvars
	defaultBindRPC  = "0.0.0.0:9009"
	defaultBindHTTP = "0.0.0.0:8080"

	clientChannelBufferMax = 2e4
)

// dpeServerImpl is an implementation of the protobuf's interface for a SynchrophasorDPEServer, an interface for storing Synchrophasor data from an edge publisher.
type dpeServerImpl struct {
	// the key in this map is <lat>,<lon>
	agreementMap      map[string]api.AgreementResponse
	agreementMapMutex *sync.Mutex
	clientChannel     chan<- *synchrophasor_dpe.HorizonDatumWrapper
}

func toLatLonKey(lat float32, lon float32) string {
	return fmt.Sprintf("%v,%v", lat, lon)
}

func saveDatumTransmitter(wrappedDatum *synchrophasor_dpe.HorizonDatumWrapper, agreementMap map[string]api.AgreementResponse, agreementMapMutex *sync.Mutex) {
	con := api.Contract{
		Type: 19,
		ID:   wrappedDatum.AgreementID,
		Ts:   time.Now().Unix(),
	}

	key := toLatLonKey(wrappedDatum.Lat, wrappedDatum.Lon)

	agreementMapMutex.Lock()
	if ag, exists := agreementMap[key]; exists {
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
		// TODO: handle these uglies

		agreementMap[key] = api.AgreementResponse{
			Lat:       wrappedDatum.Lat,
			Lon:       wrappedDatum.Lon,
			Contracts: []api.Contract{con},
		}
	}

	agreementMapMutex.Unlock()
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

		if wrappedDatum.Lon != 0 && wrappedDatum.Lat != 0 && wrappedDatum.AgreementID != "" {
			// ensure well-formed before forming key and saving datum
			saveDatumTransmitter(wrappedDatum, s.agreementMap, s.agreementMapMutex)

			// write out the datum
			s.clientChannel <- wrappedDatum

			// todo: write to async output buffer
		} else {
			// record not well-formed
			glog.V(6).Infof("Dropping ill-formed wrappedHorizonDatum: %v", wrappedDatum)
		}
		runtime.Gosched()
	}
}

func dedup(in <-chan *synchrophasor_dpe.HorizonDatumWrapper) <-chan *synchrophasor_dpe.HorizonDatumWrapper {
	out := make(chan *synchrophasor_dpe.HorizonDatumWrapper)

	go func() {
		// continually process input data, deduplicate and send single stream to output
		for {
			select {
			case msg := <-in:
				glog.V(6).Infof("Sending message: %v", msg)
				out <- msg
			}
			runtime.Gosched()
		}
	}()

	return out
}

func main() {
	flag.Parse()

	agreementMap := make(map[string]api.AgreementResponse, 0)
	agreementMapMutex := &sync.Mutex{}

	channel := make(chan *synchrophasor_dpe.HorizonDatumWrapper, clientChannelBufferMax)
	api.StartHTTPServer(defaultBindHTTP, agreementMap, agreementMapMutex, dedup(channel))

	glog.Infof("Setting up gRPC server on %v", defaultBindRPC)

	// Create gRPC server
	lis, err := net.Listen("tcp", defaultBindRPC)
	if err != nil {
		glog.Fatalf("Failed to listen: %v", err)
		os.Exit(1)
	}

	s := grpc.NewServer()
	synchrophasor_dpe.RegisterSynchrophasorDPEServer(s, &dpeServerImpl{
		agreementMap:      agreementMap,
		agreementMapMutex: agreementMapMutex,
		clientChannel:     channel,
	})
	s.Serve(lis)
}
