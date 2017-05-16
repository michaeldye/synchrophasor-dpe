// console.log = function() {}

import React, { Component } from 'react'
import { connect } from 'react-redux'
import moment from 'moment'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import PulseDot from 'halogen/BounceLoader'
import PacmanLoader from 'halogen/PacmanLoader'

import {
  Navbar,
  Nav,
  NavItem,
  NavDropdown,
  MenuItem,
  Grid,
  Row,
  Col
} from 'react-bootstrap'

import {
  connectToWS,
} from './actions'

import logo from './logo.svg'
import './App.css'
import Waves from './components/Waves'
import Angles from './components/Angles'

import {
  wsURL,
} from './constants/config'
import {
  AMBER_COLOR,
  RED_COLOR,
  GREEN_COLOR,
  ORANGE_COLOR,
} from './constants/colorConfig'
import { COLOR_PHASE_1 } from './constants/colorConfig'
import { COLOR_PHASE_2 } from './constants/colorConfig'
import { COLOR_PHASE_3 } from './constants/colorConfig'

import { withGoogleMap, GoogleMap, Marker } from 'react-google-maps'

import QueryString from './util/querystring'

const PMUMap = withGoogleMap(props => (
  <GoogleMap
    ref={props.onMapLoad}
    defaultZoom={3}
    center={props.defaultCenter}
    onClick={props.onMapClick}
  >
    {props.markers.map(marker => (
      <Marker
        {...marker}
        onRightClick={() => props.onMarkerRightClick(marker)}
      />
    ))}
  </GoogleMap>
));

class App extends Component {

  state = {
    latestDataStream: {},
    latestPartnerStream: {},
    partnerId: null,
    ttl: 30,
    markers: [
      {
        position: {
          lat: 0,
          lng: 0,
        },
        key: `foobar`,
        defaultAnimation: 2,
      }, {
        position: {
          lat: 0,
          lng: 0,
        },
        key: `foobaz`,
        defaultAnimation: 2,
      }],
  }

  handleMapLoad = this.handleMapLoad.bind(this);
  handleMapClick = this.handleMapClick.bind(this);
  handleMarkerRightClick = this.handleMarkerRightClick.bind(this);

  handleMapLoad(map) {
    this._mapComponent = map;
    if (map) {
    }
  }

  /*
   * This is called when you click on the map.
   * Go and try click now.
   */
  handleMapClick(event) {
    // const nextMarkers = [
    //   ...this.state.markers,
    //   {
    //     position: event.latLng,
    //     defaultAnimation: 2,
    //     key: Date.now(), // Add a key property for: http://fb.me/react-warning-keys
    //   },
    // ];
    // this.setState({
    //   markers: nextMarkers,
    // });
    //
    // if (nextMarkers.length === 3) {
    //   this.props.toast(
    //     `Right click on the marker to remove it`,
    //     `Also check the code!`
    //   );
    // }
  }

  handleMarkerRightClick(targetMarker) {
    /*
     * All you modify is data, and the view is driven by data.
     * This is so called data-driven-development. (And yes, it's now in
     * web front end and even with google maps API.)
     */
    // const nextMarkers = this.state.markers.filter(marker => marker !== targetMarker);
    // this.setState({
    //   markers: nextMarkers,
    // });
  }

  componentDidMount() {
    // set ttl for whether a device is active or not
    if (QueryString.ttl) {
      this.setState({ttl: parseInt(QueryString.ttl, 10)})
    }

    let _this = this
    const ws = new WebSocket(wsURL)
    ws.onopen = function(evt) {
    }
    ws.onclose = function(evt) {
    }
    ws.onmessage = function(evt) {
      const json = Object.assign({}, JSON.parse(evt.data))
      // check if device id in url parameter matches with incoming data feed
      // TODO: make this cleaner
      if (QueryString.id === json.deviceId) {
        let newMarkers = _this.state.markers
        newMarkers[0] = {
          position: {
            lat: json.lat,
            lng: json.lon,
          },
          key: json.deviceId,
          defaultAnimation: 2,
        }
        _this.setState({
          latestDataStream: json,
          markers: newMarkers,
          partnerId: json.haPartners[0],
        })
      }

      if (json.deviceId === _this.state.partnerId) {
        let newMarkers = _this.state.markers
        newMarkers[1] = {
          position: {
            lat: json.lat,
            lng: json.lon,
          },
          key: json.deviceId,
          defaultAnimation: 2,
        }
        _this.setState({
          latestPartnerStream: json,
          markers: newMarkers,
        })
      }
    }
  }

  round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }

  radians (degrees) {
    return Math.PI * degrees / 180.0;
  }

  // waveFormula(magnitude, phase_angle)
  // Computes amplitude for the 2D sine wave projection of the passed phasor
  // - phase_angle is in degrees (which is converted to radians for Math.sin)
  // - always returns a positive amplitude value, with hard-coded precision
  waveFormula(magnitude, phase_angle) {
    return Math.abs(this.round(magnitude * Math.sin(this.radians(phase_angle)), 1))
  }

  getPrimaryStatus() {
    let pulseDot = ``
    if (typeof this.state.latestDataStream.datum !== `undefined`
      && moment().valueOf() - this.state.latestDataStream.datum.ts * 0.000001 < this.state.ttl * 1000) {
      pulseDot = <PulseDot color={GREEN_COLOR} size="16px" margin="4px" />
    } else {
      pulseDot = <PulseDot color={RED_COLOR} size="16px" margin="4px" />
    }
    return pulseDot
  }

  getPartnerStatus() {
    let pulseDot = ``
    if (typeof this.state.latestPartnerStream.datum !== `undefined`
      && moment().valueOf() - this.state.latestPartnerStream.datum.ts * 0.000001 < this.state.ttl * 1000) {
      pulseDot = <PulseDot color={GREEN_COLOR} size="16px" margin="4px" />
    } else {
      pulseDot = <PulseDot color={RED_COLOR} size="16px" margin="4px" />
    }
    return pulseDot
  }

  render() {
    let lastUpdated = moment().toString()

    let haPair = ['Not available']
    if (typeof this.state.latestDataStream.haPartners !== 'undefined') {
      haPair = this.state.latestDataStream.haPartners
    }

    // When data source is online its data will be used
    if (typeof this.state.latestDataStream.datum !== 'undefined') {
      var cPhase1Angle = this.state.latestDataStream.datum.phaseData.Phase1CurrentAngle;
      var cPhase1Magnitude = this.state.latestDataStream.datum.phaseData.Phase1CurrentMagnitude;
      var cPhase2Angle = this.state.latestDataStream.datum.phaseData.Phase2CurrentAngle;
      var cPhase2Magnitude = this.state.latestDataStream.datum.phaseData.Phase2CurrentMagnitude;
      var cPhase3Angle = this.state.latestDataStream.datum.phaseData.Phase3CurrentAngle;
      var cPhase3Magnitude = this.state.latestDataStream.datum.phaseData.Phase3CurrentMagnitude;
      var vPhase1Angle = this.state.latestDataStream.datum.phaseData.Phase1VoltageAngle;
      var vPhase1Magnitude = this.state.latestDataStream.datum.phaseData.Phase1VoltageMagnitude;
      var vPhase2Angle = this.state.latestDataStream.datum.phaseData.Phase2VoltageAngle;
      var vPhase2Magnitude = this.state.latestDataStream.datum.phaseData.Phase2VoltageMagnitude;
      var vPhase3Angle = this.state.latestDataStream.datum.phaseData.Phase3VoltageAngle;
      var vPhase3Magnitude = this.state.latestDataStream.datum.phaseData.Phase3VoltageMagnitude;
    }

    if (typeof this.state.latestPartnerStream.datum !== 'undefined') {
      var p2cPhase1Angle = this.state.latestPartnerStream.datum.phaseData.Phase1CurrentAngle;
      var p2cPhase1Magnitude = this.state.latestPartnerStream.datum.phaseData.Phase1CurrentMagnitude;
      var p2cPhase2Angle = this.state.latestPartnerStream.datum.phaseData.Phase2CurrentAngle;
      var p2cPhase2Magnitude = this.state.latestPartnerStream.datum.phaseData.Phase2CurrentMagnitude;
      var p2cPhase3Angle = this.state.latestPartnerStream.datum.phaseData.Phase3CurrentAngle;
      var p2cPhase3Magnitude = this.state.latestPartnerStream.datum.phaseData.Phase3CurrentMagnitude;
      var p2vPhase1Angle = this.state.latestPartnerStream.datum.phaseData.Phase1VoltageAngle;
      var p2vPhase1Magnitude = this.state.latestPartnerStream.datum.phaseData.Phase1VoltageMagnitude;
      var p2vPhase2Angle = this.state.latestPartnerStream.datum.phaseData.Phase2VoltageAngle;
      var p2vPhase2Magnitude = this.state.latestPartnerStream.datum.phaseData.Phase2VoltageMagnitude;
      var p2vPhase3Angle = this.state.latestPartnerStream.datum.phaseData.Phase3VoltageAngle;
      var p2vPhase3Magnitude = this.state.latestPartnerStream.datum.phaseData.Phase3VoltageMagnitude;
    }

    // @@@ HACK: Enable for fake data (for development purposes)
    if (false) {
      cPhase1Angle     = 0.0;
      cPhase1Magnitude = 20.0;
      cPhase2Angle     = 120.0;
      cPhase2Magnitude = 18.0;
      cPhase3Angle     = 240.0;
      cPhase3Magnitude = 21.0;
      vPhase1Angle     = 0.0;
      vPhase1Magnitude = 7500.0;
      vPhase2Angle     = 120.0;
      vPhase2Magnitude = 7200.0;
      vPhase3Angle     = 240.0;
      vPhase3Magnitude = 7350.0;
    }

    if (false) {
      p2cPhase1Angle     = 0.0;
      p2cPhase1Magnitude = 20.0;
      p2cPhase2Angle     = 120.0;
      p2cPhase2Magnitude = 18.0;
      p2cPhase3Angle     = 240.0;
      p2cPhase3Magnitude = 21.0;
      p2vPhase1Angle     = 0.0;
      p2vPhase1Magnitude = 7500.0;
      p2vPhase2Angle     = 120.0;
      p2vPhase2Magnitude = 7200.0;
      p2vPhase3Angle     = 240.0;
      p2vPhase3Magnitude = 7350.0;
    }

    const style = {
      margin: '0 auto',
      color: 'black'
    }

    let pacmanLoader = <div>Gathering data...<PacmanLoader margin={4} color={AMBER_COLOR} style={style} /></div>

    return (
      <div className="App">
        <Navbar fluid staticTop collapseOnSelect>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="#">Horizon PMU</a>
            </Navbar.Brand>
            <Navbar.Toggle />
          </Navbar.Header>
        </Navbar>
        {/* <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>AFG PMU</h2>
        </div> */}
        <Grid>
          <Row>
            <Col xs={12} md={5}>
              <h2>PMU Device Information</h2>
              <Row>
                <Col>
                  <h4>Last updated: </h4> {lastUpdated}
                </Col>
              </Row>
              <Row>
                <Col>
                  <h4>Device ID: </h4> {this.state.latestDataStream.deviceId}
                </Col>
              </Row>
              <Row>
                <Col>
                  <h4>HA-Pair: </h4> {haPair.join(', ')}
                </Col>
              </Row>
              <br />
              <div className="left-side" style={{height: `400px`, width: `100%`}}>
                <PMUMap
                  containerElement={
                    <div style={{ height: `100%` }} />
                  }
                  mapElement={
                    <div style={{ height: `100%` }} />
                  }
                  defaultCenter={this.state.markers.length > 0 ? this.state.markers[0].position : { lat: 0, lng: 0 }}
                  onMapLoad={this.handleMapLoad}
                  onMapClick={this.handleMapClick}
                  markers={this.state.markers}
                  onMarkerRightClick={this.handleMarkerRightClick}
                />
              </div>
            </Col>
            <Col xs={12} md={7}>
              <h2>PMU Data</h2>
              <div className="right-side">
                {

                  <div>
                    <Tabs>
                      <TabList>
                        <Tab>{this.state.latestDataStream && this.state.latestDataStream.deviceId} {this.getPrimaryStatus()}</Tab>
                        <Tab>{this.state.latestDataStream && this.state.latestDataStream.haPartners && this.state.latestDataStream.haPartners.length > 0 && this.state.latestDataStream.haPartners[0]} {this.getPartnerStatus()}</Tab>
                      </TabList>

                      <TabPanel>
                        { cPhase1Angle &&
                          <div>
                        <Row>
                          <Col>
                            <h3>Device Stats</h3>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <h4>Workload Version: </h4> {this.state.latestDataStream.workloadVersion}
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <h4>Last Updated: </h4> {moment(this.state.latestDataStream.datum.ts * 0.000001).toString()}
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <h3>Current</h3>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={7}>
                            <Angles
                              type="current"
                              data={{
                                "Phase1Angle": cPhase1Angle,
                                "Phase1Magnitude": cPhase1Magnitude,
                                "Phase2Angle": cPhase2Angle,
                                "Phase2Magnitude": cPhase2Magnitude,
                                "Phase3Angle": cPhase3Angle,
                                "Phase3Magnitude": cPhase3Magnitude
                              }}
                            />
                          </Col>
                          <Col md={5
                          } className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {cPhase1Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {cPhase2Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {cPhase3Angle.toFixed(1)}&deg;</span>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={7}>
                            <Waves
                              type="current"
                              data={{
                                "Phase1Angle": cPhase1Angle,
                                "Phase1Magnitude": cPhase1Magnitude,
                                "Phase2Angle": cPhase2Angle,
                                "Phase2Magnitude": cPhase2Magnitude,
                                "Phase3Angle": cPhase3Angle,
                                "Phase3Magnitude": cPhase3Magnitude
                              }}
                            />
                          </Col>
                          <Col md={5}  className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {this.waveFormula(cPhase1Magnitude, 90.0).toFixed(1)}A</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {this.waveFormula(cPhase2Magnitude, 90.0).toFixed(1)}A</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {this.waveFormula(cPhase3Magnitude, 90.0).toFixed(1)}A</span>
                          </Col>
                        </Row>

                        <Row>
                          <Col>
                            <h3>Voltage</h3>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={7}>
                            <Angles
                              type="voltage"
                              data={{
                                "Phase1Angle": vPhase1Angle,
                                "Phase1Magnitude": vPhase1Magnitude,
                                "Phase2Angle": vPhase2Angle,
                                "Phase2Magnitude": vPhase2Magnitude,
                                "Phase3Angle": vPhase3Angle,
                                "Phase3Magnitude": vPhase3Magnitude
                              }}
                              />
                          </Col>
                          <Col md={5}  className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {vPhase1Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {vPhase2Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {vPhase3Angle.toFixed(1)}&deg;</span>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={7}>
                            <Waves
                              type="voltage"
                              data={{
                                "Phase1Angle": vPhase1Angle,
                                "Phase1Magnitude": vPhase1Magnitude,
                                "Phase2Angle": vPhase2Angle,
                                "Phase2Magnitude": vPhase2Magnitude,
                                "Phase3Angle": vPhase3Angle,
                                "Phase3Magnitude": vPhase3Magnitude
                              }}
                            />
                          </Col>
                          <Col md={5}  className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {this.waveFormula(vPhase1Magnitude, 90.0).toFixed(1)}V</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {this.waveFormula(vPhase2Magnitude, 90.0).toFixed(1)}V</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {this.waveFormula(vPhase3Magnitude, 90.0).toFixed(1)}V</span>
                          </Col>
                        </Row>
                        </div>
                      }
                      {!cPhase1Angle && pacmanLoader}
                      </TabPanel>

                      <TabPanel>
                        { p2cPhase1Angle &&
                          <div>
                        <Row>
                          <Col>
                            <h3>Device Stats</h3>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <h4>Workload Version: </h4> {this.state.latestDataStream.workloadVersion}
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <h4>Last Updated: </h4> {moment(this.state.latestDataStream.datum.ts * 0.000001).toString()}
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <h3>Current</h3>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={7}>
                            <Angles
                              type="current"
                              data={{
                                "Phase1Angle": p2cPhase1Angle,
                                "Phase1Magnitude": p2cPhase1Magnitude,
                                "Phase2Angle": p2cPhase2Angle,
                                "Phase2Magnitude": p2cPhase2Magnitude,
                                "Phase3Angle": p2cPhase3Angle,
                                "Phase3Magnitude": p2cPhase3Magnitude
                              }}
                            />
                          </Col>
                          <Col md={5} className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {p2cPhase1Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {p2cPhase2Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {p2cPhase3Angle.toFixed(1)}&deg;</span>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={7}>
                            <Waves
                              type="current"
                              data={{
                                "Phase1Angle": p2cPhase1Angle,
                                "Phase1Magnitude": p2cPhase1Magnitude,
                                "Phase2Angle": p2cPhase2Angle,
                                "Phase2Magnitude": p2cPhase2Magnitude,
                                "Phase3Angle": p2cPhase3Angle,
                                "Phase3Magnitude": p2cPhase3Magnitude
                              }}
                            />
                          </Col>
                          <Col md={5}  className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {this.waveFormula(p2cPhase1Magnitude, 90.0).toFixed(1)}A</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {this.waveFormula(p2cPhase2Magnitude, 90.0).toFixed(1)}A</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {this.waveFormula(p2cPhase3Magnitude, 90.0).toFixed(1)}A</span>
                          </Col>
                        </Row>

                        <Row>
                          <Col>
                            <h3>Voltage</h3>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={7}>
                            <Angles
                              type="voltage"
                              data={{
                                "Phase1Angle": p2vPhase1Angle,
                                "Phase1Magnitude": p2vPhase1Magnitude,
                                "Phase2Angle": p2vPhase2Angle,
                                "Phase2Magnitude": p2vPhase2Magnitude,
                                "Phase3Angle": p2vPhase3Angle,
                                "Phase3Magnitude": p2vPhase3Magnitude
                              }}
                              />
                          </Col>
                          <Col md={5}  className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {p2vPhase1Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {p2vPhase2Angle.toFixed(1)}&deg;</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {p2vPhase3Angle.toFixed(1)}&deg;</span>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={7}>
                            <Waves
                              type="voltage"
                              data={{
                                "Phase1Angle": p2vPhase1Angle,
                                "Phase1Magnitude": p2vPhase1Magnitude,
                                "Phase2Angle": p2vPhase2Angle,
                                "Phase2Magnitude": p2vPhase2Magnitude,
                                "Phase3Angle": p2vPhase3Angle,
                                "Phase3Magnitude": p2vPhase3Magnitude
                              }}
                            />
                          </Col>
                          <Col md={5}  className="left-justified">
                            <br /><br />
                            <span style={{color: COLOR_PHASE_1}}>Phase 1: {this.waveFormula(p2vPhase1Magnitude, 90.0).toFixed(1)}V</span>
                            <br />
                            <span style={{color: COLOR_PHASE_2}}>Phase 2: {this.waveFormula(p2vPhase2Magnitude, 90.0).toFixed(1)}V</span>
                            <br />
                            <span style={{color: COLOR_PHASE_3}}>Phase 3: {this.waveFormula(p2vPhase3Magnitude, 90.0).toFixed(1)}V</span>
                          </Col>
                        </Row>
                      </div>
                    }
                    {!p2cPhase1Angle && pacmanLoader}
                      </TabPanel>
                    </Tabs>

                    </div>
                  }
              </div>
            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state
}

export default connect(mapStateToProps)(App)
