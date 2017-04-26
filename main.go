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

	"github.com/michaeldye/synchrophasor-dpe/agreement"
	"github.com/michaeldye/synchrophasor-dpe/api"
	"github.com/michaeldye/synchrophasor-dpe/buffer"

	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"
)

const (
	// defaults overridden by envvars
	defaultBindRPC  = "0.0.0.0:9009"
	defaultBindHTTP = "0.0.0.0:8080"

	clientChannelBufferMax = 2e6

	deduplicationBufferMax = 50
)

// dpeServerImpl is an implementation of the protobuf's interface for a SynchrophasorDPEServer, an interface for storing Synchrophasor data from an edge publisher.
type dpeServerImpl struct {
	// the key in this map is <lat>,<lon>
	agreementMap      map[string]api.AgreementResponse
	agreementMapMutex *sync.Mutex
	clientChannel     chan<- *synchrophasor_dpe.HorizonDatumWrapper
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

		if wrappedDatum.Lon != 0 && wrappedDatum.Lat != 0 && wrappedDatum.AgreementId != "" {
			// ensure well-formed before forming key and saving datum
			agreement.SaveDatumTransmitter(wrappedDatum, s.agreementMap, s.agreementMapMutex)

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
	ring := buffer.NewRingBuffer(deduplicationBufferMax)

	channelPubFn := func(msg *synchrophasor_dpe.HorizonDatumWrapper) error {
		glog.V(4).Infof("Sending message with id: %v", msg.Datum.Id)
		out <- msg

		return nil
	}

	go func() {
		// continually process input data, deduplicate and send single stream to output
		for {
			var pubFn *func(msg *synchrophasor_dpe.HorizonDatumWrapper) error

			select {
			case msg := <-in:

				glog.V(5).Infof("Considering sending record from partner %v w/ id: %v", msg.DeviceId, msg.Datum.Id)

				if publishedTS, partnerID := ring.PartnerPublished(msg); partnerID != "" {

					if time.Now().Unix()-publishedTS > 5 {
						glog.V(5).Infof("Publishing duplicate record b/c we haven't ever or recently published from this partner. Msg: %v", msg)
						pubFn = &channelPubFn
					} else {
						glog.V(5).Infof("Dropping duplicate record b/c we last published from partner %v at %v. Msg: %v", partnerID, publishedTS, msg)
					}
				} else {
					glog.V(6).Infof("Publishing record b/c we can't find a recent record of having published the same message by a partner")
					pubFn = &channelPubFn
				}

				if err := ring.Store(msg, pubFn); err != nil {
					glog.Errorf("Failed to publish. Err: %v", err)
				}

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
