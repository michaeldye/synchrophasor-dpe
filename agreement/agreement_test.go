package agreement

import (
	"sync"
	"testing"

	"github.com/michaeldye/synchrophasor-dpe/api"
	"github.com/michaeldye/synchrophasor-proto/pmu_server"
	"github.com/michaeldye/synchrophasor-proto/synchrophasor_dpe"
)

func Test_SaveDatumTransmitter_ContractAdd(t *testing.T) {
	agreementMap := map[string]api.AgreementResponse{}
	agreementMapMutex := &sync.Mutex{}

	wLat := float32(-41.003)
	wLon := float32(150.02)

	wA := &synchrophasor_dpe.HorizonDatumWrapper{
		AgreementId: "1234",
		Lat:         wLat,
		Lon:         wLon,
		DeviceId:    "mydeviceA",
		Datum: &pmu_server.SynchrophasorDatum{
			Id:        "foo-dddd",
			Ts:        0,
			DeviceTs:  -1.0,
			PhaseData: nil,
		},
	}

	wA2 := &synchrophasor_dpe.HorizonDatumWrapper{
		AgreementId: "9012",
		Lat:         wLat,
		Lon:         wLon,
		DeviceId:    "mydeviceA",
		Datum: &pmu_server.SynchrophasorDatum{
			Id:        "foo-eeee",
			Ts:        0,
			DeviceTs:  -1.0,
			PhaseData: nil,
		},
	}

	wB := &synchrophasor_dpe.HorizonDatumWrapper{
		AgreementId: "5678",
		Lat:         5.14,
		Lon:         -78.53,
		DeviceId:    "mydeviceB",
		Datum: &pmu_server.SynchrophasorDatum{
			Id:        "foo-gggg",
			Ts:        0,
			DeviceTs:  -1.0,
			PhaseData: nil,
		},
	}

	SaveDatumTransmitter(wA, agreementMap, agreementMapMutex)
	SaveDatumTransmitter(wB, agreementMap, agreementMapMutex)
	SaveDatumTransmitter(wA2, agreementMap, agreementMapMutex)

	if ag, exists := agreementMap[ToLatLonKey(wLat, wLon)]; !exists || len(*ag.Contracts) != 2 {
		t.Errorf("Failed to add second contract at same lat / lon")
	}
}
