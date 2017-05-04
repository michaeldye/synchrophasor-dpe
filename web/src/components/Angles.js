//
// Power phasor visualization: Simple vector gauge (angle and magnitude)
//
// Written by Glen Darling, March, 2017.
// Copyright (c)IBM, 2017; all rights reserved.
//

import React, { Component } from 'react'

// Control the drawing resolution (so text appears crisp, not blurry)
const DRAW_SCALE = 3.0;

// Aribitrary overall scaling factor to tweak the size of the component
const SCALE = 0.28;

// Vector arrow head (length is relative to magnitude, angle is in degrees)
const ARROW_HEAD_REL_LENGTH = 0.88;
const ARROW_HEAD_ANGLE_DEG  = 2.0;

// Separation of the gauge from the vector maximum (multiplier)
const GAUGE_SEPARATION = 1.07;

// Gauge colors
const COLOR_RING       = '#202020';
const COLOR_BACKGROUND = '#f4f4f4';
const COLOR_TICKS      = '#c0c0c0';

// Label appearance
const COLOR_LABELS     = '#c0c0c0';
const FONT_LABELS      = (12.0 * DRAW_SCALE) + 'px sans-serif';

// Phase vector colors
import { COLOR_PHASE_1 } from '../constants/colorConfig'
import { COLOR_PHASE_2 } from '../constants/colorConfig'
import { COLOR_PHASE_3 } from '../constants/colorConfig'

class Angles extends Component {

  // convert degrees to radians
  radians (degrees) {
    return Math.PI * degrees / 180.0;
  };

  // draw a text label with specified location, contents, font and color
  label (ctx, x, y, text, font, color) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  // draw a line with the specified color
  line (ctx, x0, y0, x1, y1, color) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineWidth = DRAW_SCALE;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  // draw a circle outline with the specified color
  circle (ctx, cx, cy, r, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  // draw a filled circle, with specified fill color
  dot(ctx, cx, cy, r, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // draw a tick mark on the guage
  tickmark (ctx, cx, cy, a, inner, outer, color) {
    // console.log('tickmark: a=', a, ', inner=', inner, ', outer=', outer, ', color=', color);
    this.line(ctx,
      cx + inner * Math.sin(a),
      cy + inner * Math.cos(a),
      cx + outer * Math.sin(a),
      cy + outer * Math.cos(a),
      color);
  };

  // draw gauge (tick marks and ring) to surround the vectors
  gauge (ctx, cx, cy, size, color_background, color_ring, color_ticks) {
    // console.log('gauge: cx=', cx, ', cy=', cy, ', size=', size, ', color_ring=', color_ring, ', color_ticks=', color_ticks);
    // Place inner rings beyond the max vector magnitude
    // Two inner rings for two lengths of tick marks
    let inner0 = size * GAUGE_SEPARATION;
    let inner1 = inner0 * GAUGE_SEPARATION;
    // Place outer ring beyond inner
    let outer = inner1 * GAUGE_SEPARATION;
    let r = 0.5 + outer;
    // Draw gauge background
    this.dot(ctx, cx, cy, r, color_background);
    // Draw ticks
    for (var a = 0.0; a < 360.0; a += 15.0) {
      if (0 === a % 45) {
        this.tickmark(ctx, cx, cy, this.radians(a), inner0, outer, color_ticks);
      } else {
        this.tickmark(ctx, cx, cy, this.radians(a), inner1, outer, color_ticks);
      }
    }

    // Draw labels
    let offset = 1.25;
    this.label(ctx, cx + outer * offset, cy, "0", FONT_LABELS, COLOR_LABELS);
    this.label(ctx, cx, cy - outer * offset, "90", FONT_LABELS, COLOR_LABELS);
    this.label(ctx, cx - outer * offset, cy, "180  ", FONT_LABELS, COLOR_LABELS);
    this.label(ctx, cx, cy + outer * offset, "270", FONT_LABELS, COLOR_LABELS);

    // Draw rings
    let separation = 2.0;
    this.circle(ctx, cx, cy, r - separation * DRAW_SCALE, color_ring);
    this.circle(ctx, cx, cy, r, color_ring);
  };

  // draw vector with given angle (a), unit magnitude (m), and color (color)
  vector (ctx, cx, cy, a, m, scale, color) {
    // console.log('vector: a=', a, ', m=', m, ', color=', color);
    // Make zero align with the positive X axis
    a += Math.PI / 2.0
    // Scale the vectors appropriately for the canvas size
    m *= scale
    // main line of the vector
    this.line(ctx,
      cx,
      cy,
      cx + m * Math.sin(a),
      cy + m * Math.cos(a),
      color);
    // arrow head (2 lines from tip backward, at specified angle)
    let am = m * ARROW_HEAD_REL_LENGTH;
    let d = this.radians(ARROW_HEAD_ANGLE_DEG);
    this.line(ctx,
      cx + m * Math.sin(a),
      cy + m * Math.cos(a),
      cx + am * Math.sin(a + d),
      cy + am * Math.cos(a + d),
      color);
    this.line(ctx,
      cx + m * Math.sin(a),
      cy + m * Math.cos(a),
      cx + am * Math.sin(a - d),
      cy + am * Math.cos(a - d),
      color);
  };

  componentDidMount() {
    this.configurecanvas();
    this.updatecanvas();
  };

  componentDidUpdate() {
    this.updatecanvas();
  };

  configurecanvas() {

    // prepare for drawing
    let canvas = this.canvas;

    // lock down the external DOM size of the component in 'px'
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    // scale up the resolution for drawing (effectively making smaller pixels)
    canvas.width *= DRAW_SCALE;
    canvas.height *= DRAW_SCALE;
  };

  updatecanvas() {

    //console.log('Angles.updatecanvas()');

    // extract the data
    let phase1_angle     = this.radians(this.props.data.Phase1Angle);
    let phase1_magnitude = this.props.data.Phase1Magnitude;
    let phase2_angle     = this.radians(this.props.data.Phase2Angle);
    let phase2_magnitude = this.props.data.Phase2Magnitude;
    let phase3_angle     = this.radians(this.props.data.Phase3Angle);
    let phase3_magnitude = this.props.data.Phase3Magnitude;

    // set up the magnitude range appropriately for current or voltage data
    // @@@ HACK: this range should be passed as a separate property.
    let y_range = 1.0;
    if ("voltage" === this.props.type) {
      y_range = 7500.0;
    } else if ("current" === this.props.type) {
      y_range = 23.0;
    }

    // @@@ debug the incoming sample phasor values
    //console.log('--> Type:', this.props.type, ',  Range=', y_range);
    //console.log('--> Phase 1:  a=', phase1_angle, ', m=', phase1_magnitude);
    //console.log('--> Phase 2:  a=', phase2_angle, ', m=', phase2_magnitude);
    //console.log('--> Phase 3:  a=', phase3_angle, ', m=', phase3_magnitude);

    // prepare for drawing
    let canvas = this.canvas;
    let ctx = canvas.getContext("2d");

    // get canvas dimensions and center
    let w = canvas.width;
    let h = canvas.height;
    let cx = w / 2.0;
    let cy = h / 2.0;

    // create an arbitrary scaling factor based on the component height
    let scale = (h * SCALE)

    // draw the static gauge background
    this.gauge(ctx, cx, cy, scale, COLOR_BACKGROUND, COLOR_RING, COLOR_TICKS);

    // draw the 3 phase vectors (phasors) onto the background gauge
    this.vector(ctx, cx, cy,
      phase1_angle,
      phase1_magnitude / y_range,
      scale,
      COLOR_PHASE_1);
    this.vector(ctx, cx, cy,
      phase2_angle,
      phase2_magnitude / y_range,
      scale,
      COLOR_PHASE_2);
    this.vector(ctx, cx, cy,
      phase3_angle,
      phase3_magnitude / y_range,
      scale,
      COLOR_PHASE_3);
  }

  render() {
    return (
      <div>
        <canvas
          ref={(canvas) => { this.canvas = canvas }}
        >
        </canvas>
      </div>
    )
  }
}

export default Angles
