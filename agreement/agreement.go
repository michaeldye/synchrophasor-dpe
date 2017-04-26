package agreement

import (
	"fmt"
	"github.com/michaeldye/synchrophasor-dpe/api"
	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"
	"sync"
	"time"
)

func ToLatLonKey(lat float32, lon float32) string {
	return fmt.Sprintf("%v,%v", lat, lon)
}

// SaveDatumTransmitter saves the device names and agreements for later retrieval by an agbot using the HTTP API
func SaveDatumTransmitter(wrappedDatum *synchrophasor_dpe.HorizonDatumWrapper, agreementMap map[string]api.AgreementResponse, agreementMapMutex *sync.Mutex) {
	con := api.Contract{
		Type:     19,
		ID:       wrappedDatum.AgreementId,
		Ts:       uint64(time.Now().Unix()), // make our own timestamp, don't trust the client's provided one
		DeviceTs: wrappedDatum.Datum.DeviceTs,
		DeviceID: wrappedDatum.DeviceId,
	}

	key := ToLatLonKey(wrappedDatum.Lat, wrappedDatum.Lon)

	agreementMapMutex.Lock()
	if ag, exists := agreementMap[key]; exists {
		updateIx := -1

		for ix, exCon := range *ag.Contracts {

			if exCon.ID == con.ID {
				updateIx = ix
				break
			}
		}

		if updateIx > -1 {
			(*ag.Contracts)[updateIx].Ts = con.Ts
		} else {
			(*ag.Contracts) = append(*ag.Contracts, con)
		}
	} else {
		// TODO: handle these uglies

		agreementMap[key] = api.AgreementResponse{
			Lat:       wrappedDatum.Lat,
			Lon:       wrappedDatum.Lon,
			Contracts: &[]api.Contract{con},
		}
	}

	agreementMapMutex.Unlock()
}
