package buffer

import (
	"sync"
	"time"

	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"
)

// PublishedDatumEnvelope ...
type PublishedDatumEnvelope struct {
	Wrapped     *synchrophasor_dpe.HorizonDatumWrapper
	PublishedTS int64
}

// RingBuffer ...
type RingBuffer struct {
	data  []*PublishedDatumEnvelope
	End   int
	Mutex *sync.Mutex // this is very not awesome, but ok for now
}

// NewRingBuffer ... size is expected to be small
func NewRingBuffer(size int) *RingBuffer {
	return &RingBuffer{
		data:  make([]*PublishedDatumEnvelope, size),
		End:   -1,
		Mutex: &sync.Mutex{},
	}
}

// Store ... There is no guarantee that publishFn will be called before writing to the ring, just that a call to this method and successful publishing (or no publishing) entails writing to the ring
func (r *RingBuffer) Store(wrapped *synchrophasor_dpe.HorizonDatumWrapper, publishFn *func(saved *synchrophasor_dpe.HorizonDatumWrapper) error) error {

	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	var pubTime int64

	if publishFn != nil {
		if err := (*publishFn)(wrapped); err != nil {
			return err
		}

		pubTime = time.Now().Unix()
	} else {
		// not published
		pubTime = -1
	}

	if r.End == cap(r.data)-1 {
		r.End = 0
	} else {
		r.End++
	}

	r.data[r.End] = &PublishedDatumEnvelope{
		Wrapped:     wrapped,
		PublishedTS: pubTime,
	}

	return nil
}

// PartnerPublished ... TODO: really only sufficient for picking out a partner in a 2-device HA pair, fix that
func (r *RingBuffer) PartnerPublished(wrapped *synchrophasor_dpe.HorizonDatumWrapper) (int64, string) {
	// nested iteration, the lists are expected to be *very short*

	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	// r.End is the most recently written record in the ring
	ix := r.End
	for {
		if ix < 0 {
			// wrap
			ix = len(r.data) - 1
		}

		d := r.data[ix]
		if d == nil {
			// these are not sparse
			break
		}

		if d.Wrapped.Datum.Id == wrapped.Datum.Id && d.Wrapped.DeviceId != wrapped.DeviceId {
			for _, p := range d.Wrapped.HaPartners {
				if p == wrapped.DeviceId {
					// this message was published by an HA partner
					return d.PublishedTS, p
				}
			}
		}

		if ix == r.End {
			// the common base case
			break
		}

		ix--
	}

	return -1, ""
}
