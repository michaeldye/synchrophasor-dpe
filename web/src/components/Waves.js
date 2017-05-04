//
// Power phasor visualization: 3D helix projection to 2D sine wave
//
// Written by Glen Darling, March, 2017.
// Copyright (c)IBM, 2017; all rights reserved.
//

import React, { Component } from 'react'

// Control the drawing resolution (so text appears crisp, not blurry)
const DRAW_SCALE = 3.0;

// Scaling and inset
const SCALE_X = 0.97;
const SCALE_Y = 0.41;
const INSET_X = 5.0 * DRAW_SCALE;
const SLIDE_X = 5.0 * DRAW_SCALE;

// Sample dot size (as a fraction of the screen height)
const SAMPLE_FRACTION = 0.020;

// Scale tick mark size (as a fraction of the screen height)
const TICK_FRACTION = 0.060;

// Screen colors
const COLOR_OUTLINE    = '#000000';
const COLOR_BACKGROUND = '#f4f4f4';
const COLOR_SCALES     = '#c0c0c0';
// const COLOR_BACKGROUND = '#f0f8d0';
// const COLOR_SCALES     = '#c0c000';

// Label appearance
const COLOR_LABELS       = '#c0c0c0';
const FONT_LABELS        = (12.0 * DRAW_SCALE) + 'px sans-serif';
const LABEL_OFFSET_LEFT  = 25.0 * DRAW_SCALE
const LABEL_OFFSET_RIGHT = 25.0 * DRAW_SCALE
const LABEL_WIDTH        = 40.0 * DRAW_SCALE
const LABEL_HEIGHT       = 20.0 * DRAW_SCALE
const LABEL_OFFSET_UP    = 15.0 * DRAW_SCALE

// Wave colors
import { COLOR_PHASE_1 } from '../constants/colorConfig'
import { COLOR_PHASE_2 } from '../constants/colorConfig'
import { COLOR_PHASE_3 } from '../constants/colorConfig'
// Sample dot colors
const COLOR_SAMPLE_1 = COLOR_PHASE_1;
const COLOR_SAMPLE_2 = COLOR_PHASE_2;
const COLOR_SAMPLE_3 = COLOR_PHASE_3;

class Waves extends Component {

  state = {
    divWidth: 0,
    divHeight: 0,
  }

  constructor(props) {
    super(props)

    this.updateCanvasDimensions = this.updateCanvasDimensions.bind(this)
  }

  // convert degrees to radians
  radians (degrees) {
    return Math.PI * degrees / 180.0;
  }

  // draw a text label with specified location, contents, font and color
  label (ctx, x, y, text, font, color) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  // draw a centered rectangle outline with the specified color
  rect (ctx, cx, cy, w, h, color) {
    let hw = w / 2.0
    let hh = h / 2.0
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh);
    ctx.lineTo(cx + hw, cy - hh);
    ctx.lineTo(cx + hw, cy + hh);
    ctx.lineTo(cx - hw, cy + hh);
    ctx.closePath();
    ctx.lineWidth = DRAW_SCALE;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // draw a centered and filled rectangle with the specified color
  box (ctx, cx, cy, w, h, color) {
    let hw = w / 2.0
    let hh = h / 2.0
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh);
    ctx.lineTo(cx + hw, cy - hh);
    ctx.lineTo(cx + hw, cy + hh);
    ctx.lineTo(cx - hw, cy + hh);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // draw a line with the specified color
  line (ctx, x0, y0, x1, y1, color) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineWidth = DRAW_SCALE;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // draw a filled circle, with specified fill and line
  dot(ctx, cx, cy, r, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // compute and return drawing coordinates from "pure" coordinates (-1.0-1.0)
  xy_from_pure_xy(x, y, x_range, y_range, width, height) {
    let x_origin = 0.0;
    let y_origin = height / 2.0;
    // Range checks
    if (Math.abs(x) > x_range) {
      // console.log('WARNING(Range X): |', x, '| is not in 0.0 .. ', x_range);
    }
    if (Math.abs(y) > y_range) {
      // console.log('WARNING(Range Y): |', y, '| is not in 0.0 .. ', y_range);
    }
    // Flip the y coordinate so positive values will be above the origin
    y = -y;
    let screen_x = SLIDE_X + INSET_X / 2.0 + x_origin + SCALE_X * width * x / x_range;
    let screen_y = y_origin + SCALE_Y * height * y / y_range;
    return [screen_x, screen_y];
  }

  // draw one sin wave (derived from one phasor sample)
  wave(ctx, offset, p_angle, magnitude, x_range, y_range, width, height, color) {
    // console.log('wave: offset=', offset, ', pa=', p_angle, ', mag=', magnitude, ', x_r=', x_range, ', y_r=', y_range, ', c=', color);
    // Construct the sine wave path
    ctx.beginPath();
    let pure_x = 0.0;
    let pure_y = magnitude * Math.sin(offset);
    let coords = this.xy_from_pure_xy(pure_x, pure_y, x_range, y_range, width, height);
    ctx.moveTo(coords[0], coords[1]);
    for (var x = 0.0; x < width; x ++) {
      let fraction = x / width;
      let angle = x_range * fraction;
      pure_x = angle;
      pure_y = magnitude * Math.sin(offset + angle);
      // console.log('<-- (', pure_x, ', ', pure_y, ')')
      if (pure_x < 0.0) { pure_x += 2.0 * Math.PI; }
      if (pure_x > x_range) { pure_x -= 2.0 * Math.PI; }
      coords = this.xy_from_pure_xy(pure_x, pure_y, x_range, y_range, width, height);
      ctx.lineTo(coords[0], coords[1]);
      // console.log('--> (', coords[0], ', ', coords[1], ')')
    }
    // Draw the sine wave
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // draw one sample dot (at the appropriate time on the sin wave)
  sample_dot(ctx, offset, p_angle, magnitude, x_range, y_range, range_label, width, height, color) {
    // console.log('sample_dot: offset=', offset, ', pa=', p_angle, ', mag=', magnitude, ', x_r=', x_range, ', y_r=', y_range, ', c=', color);

    // Derive sample location (2D projection of helix onto sine wave)
    let sample_pure_x = p_angle
    let sample_pure_y = magnitude * Math.sin(offset + p_angle)
    // console.log('--> pure: (', sample_pure_x, ', ', sample_pure_y, ')');

    // Fix sample X range issues that might take it off screen due to offset
    if (sample_pure_x < 0.0) { sample_pure_x += 2.0 * Math.PI; }
    if (sample_pure_x > x_range) { sample_pure_x -= 2.0 * Math.PI; }
    let coords = this.xy_from_pure_xy(sample_pure_x, sample_pure_y, x_range, y_range, width, height)
    // console.log('--> (', coords[0], ', ', coords[1], ')')

    // Draw the sample dot at a size relative to the height
    let sample_dot_size = 0.5 + SAMPLE_FRACTION * height
    this.dot(ctx, coords[0], coords[1], sample_dot_size, color)
  }

  screen(ctx, cx, cy, x_range, y_range, range_label, width, height, color_background, color_outline, color_scales) {

    // Background fill
    this.box (ctx, cx, cy, width, height, color_background);

    // Top range trace with label
    let inset_width = width - INSET_X;
    let coords = this.xy_from_pure_xy(0.0, y_range, x_range, y_range, inset_width, height);
    this.line (ctx, coords[0], coords[1], coords[0] + SCALE_X * inset_width, coords[1], color_scales);
    this.box (ctx, coords[0] + LABEL_OFFSET_LEFT, coords[1], LABEL_WIDTH, LABEL_HEIGHT, color_background);
    this.label(ctx, coords[0] + LABEL_OFFSET_LEFT, coords[1], range_label, FONT_LABELS, COLOR_LABELS);

    // Bottom range trace with label
    coords = this.xy_from_pure_xy(0.0, -y_range, x_range, y_range, inset_width, height);
    this.line (ctx, coords[0], coords[1], coords[0] + SCALE_X * inset_width, coords[1], color_scales);
    this.box (ctx, coords[0] + SCALE_X * inset_width - LABEL_OFFSET_RIGHT, coords[1], LABEL_WIDTH, LABEL_HEIGHT, color_background);
    this.label(ctx, coords[0] + SCALE_X * inset_width - LABEL_OFFSET_RIGHT, coords[1], range_label, FONT_LABELS, COLOR_LABELS);

    // Center trace
    this.line (ctx, 0.0, cy, width, cy, color_scales);
    // Minor tick marks along the horizontal scale (center trace)
    let tick_size = height * TICK_FRACTION / 2.0;
    for (var x = 0.0; x <= inset_width; x += (inset_width / 36.0)) {
      let fraction = x / inset_width;
      let angle = x_range * fraction;
      let pure_x = angle;
      if (pure_x < 0.0) { pure_x += 2.0 * Math.PI; }
      if (pure_x > x_range) { pure_x -= 2.0 * Math.PI; }
      coords = this.xy_from_pure_xy(pure_x, 0.0, x_range, y_range, inset_width, height);
      this.line(ctx, coords[0], coords[1] - tick_size, coords[0], coords[1] + tick_size, color_scales);
    }
    // Minor tick marks along the horizontal scale (center trace)
    tick_size *= 2.0;
    for (x = 0.0; x <= inset_width; x += (inset_width / 4.0)) {
      let fraction = x / inset_width;
      let angle = x_range * fraction;
      let pure_x = angle;
      if (pure_x < 0.0) { pure_x += 2.0 * Math.PI; }
      if (pure_x > x_range) { pure_x -= 2.0 * Math.PI; }
      coords = this.xy_from_pure_xy(pure_x, 0.0, x_range, y_range, inset_width, height);
      this.line(ctx, coords[0], coords[1] - tick_size, coords[0], coords[1] + tick_size, color_scales);
    }

    // X-axis labels
    let left = SLIDE_X + INSET_X / 2.0;
    let level = cy - LABEL_OFFSET_UP;
    this.label(ctx, left + SCALE_X * inset_width * 0.25, level, "90", FONT_LABELS, COLOR_LABELS);
    this.label(ctx, left + SCALE_X * inset_width * 0.50, level, "180", FONT_LABELS, COLOR_LABELS);
    this.label(ctx, left + SCALE_X * inset_width * 0.75, level, "270", FONT_LABELS, COLOR_LABELS);

    // Frame outlines
    let separation = 4.5;
    this.rect (ctx, cx, cy, width - separation * DRAW_SCALE, height - separation * DRAW_SCALE, color_outline);
    this.rect (ctx, cx, cy, width, height, color_outline);

  }

  componentWillUnmount() {
    // window.removeEventListener("resize", this.updateCanvasDimensions);
  }

  componentDidMount() {
    // window.addEventListener("resize", this.updateCanvasDimensions);
    this.configurecanvas();
    this.updatecanvas();
  }

  componentDidUpdate() {
    this.updatecanvas();
  }

  updateCanvasDimensions() {
    let canvas = this.canvas
    canvas.style.width = canvas.parentNode.offsetWidth + 'px'
    canvas.style.height = canvas.parentNode.offsetHeight + 'px'
    canvas.width *= DRAW_SCALE
    canvas.height *= DRAW_SCALE
    console.log('canvas', canvas);
    this.setState({ divWidth: canvas.parentNode.offsetWidth, divHeight: canvas.parentNode.offsetHeight })
  }

  configurecanvas() {

    // prepare for drawing
    let canvas = this.canvas;
    // lock down the external DOM size of the component in 'px'
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    // scale up the resolution for drawing (effectively making smaller pixels)
    canvas.width *= DRAW_SCALE;
    canvas.height *= DRAW_SCALE;
  }

  updatecanvas() {

    //console.log('Waves.updatecanvas()');

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
    let range_label = "?";
    if ("voltage" === this.props.type) {
      y_range = 7500.0;
      range_label = "7.5KV";
    } else if ("current" === this.props.type) {
      y_range = 23.0;
      range_label = "23.0A";
    }
    let x_range = 2.0 * Math.PI

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

    // draw the static background box for the wave display
    this.screen(ctx, cx, cy, x_range, y_range, range_label, w, h, COLOR_BACKGROUND, COLOR_OUTLINE, COLOR_SCALES);

    // Inset everything else
    w -= INSET_X;

    // draw the 3 sine waves represented by the 3 phasor measurements
    this.wave(ctx, this.radians(  0.0),
      phase1_angle,
      phase1_magnitude,
      x_range, y_range, w, h, COLOR_PHASE_1);
    this.wave(ctx, this.radians(120.0),
      phase2_angle,
      phase2_magnitude,
      x_range, y_range, w, h, COLOR_PHASE_2);
    this.wave(ctx, this.radians(240.0),
      phase3_angle,
      phase3_magnitude,
      x_range, y_range, w, h, COLOR_PHASE_3);

    // plot the 3 phasors onto the sine waves at the appropriate time locations
    this.sample_dot(ctx, this.radians(  0.0),
      phase1_angle,
      phase1_magnitude,
      x_range, y_range, w, h, COLOR_SAMPLE_1);
    this.sample_dot(ctx, this.radians(120.0),
      phase2_angle,
      phase2_magnitude,
      x_range, y_range, w, h, COLOR_SAMPLE_2);
    this.sample_dot(ctx, this.radians(240.0),
      phase3_angle,
      phase3_magnitude,
      x_range, y_range, w, h, COLOR_SAMPLE_3);
  }

  render() {
    return (
      <div>
        <canvas
          ref={(canvas) => { this.canvas = canvas }}
          resize="true"
        >
        </canvas>
      </div>
    )
  }
}

export default Waves
