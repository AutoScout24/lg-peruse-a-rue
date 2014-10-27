/*
** Copyright 2013 Google Inc.
**
** Licensed under the Apache License, Version 2.0 (the "License");
** you may not use this file except in compliance with the License.
** You may obtain a copy of the License at
**
**    http://www.apache.org/licenses/LICENSE-2.0
**
** Unless required by applicable law or agreed to in writing, software
** distributed under the License is distributed on an "AS IS" BASIS,
** WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
** See the License for the specific language governing permissions and
** limitations under the License.
*/

define(
['config', 'bigl', 'stapes', 'socketio'],
function(config, L, Stapes, io) {

  var NAV_SENSITIVITY = 0.0032;
  var NAV_GUTTER_VALUE = 8;
  var MOVEMENT_THRESHOLD = 1.0;
  var MOVEMENT_COUNT = 10;

  var MultiAxisModule = Stapes.subclass({
    constructor: function() {
      this.push_count = 0;
      this.moving = false;
    },

    init: function() {
      console.debug('MultiAxis: initializing');

      this.socket = io.connect('/multiaxis');

      this.socket.once('connect',function() {
        console.debug('MultiAxis: connected');
        this.emit( 'ready' );
      }.bind(this));

      this.socket.on('button',function(state) {
        // console.log("multiaxis button state:"+ state); // Alf
        if (Number(state) == 0x101) this.moveForward(); // right btn
        if (Number(state) == 0x100) this.moveBackward(); // left btn
      }.bind(this));

      this.socket.on('state',function(data) {
        //console.log('multiaxis abs:', data.abs);
        var yaw = 0;
        var zoom = 0;
        var pitch = 0; // Alf
        var value;
        var dirty = false;
        for( var axis in data.abs ) {
          switch(axis) {
            case '3': // Pitch
              value = data.abs[axis]; // Alf
              if( Math.abs( value ) > NAV_GUTTER_VALUE ) {
                pitch = value * NAV_SENSITIVITY;
                dirty = true;
              }
              break;
            case '5': // Yaw
              value = data.abs[axis];
              if( Math.abs( value ) > NAV_GUTTER_VALUE ) {
                yaw = value * NAV_SENSITIVITY;
                dirty = true;
              }
              break;
            case '1': // Forwards/Backwards
              value = data.abs[axis];
              if( Math.abs( value ) > NAV_GUTTER_VALUE && value < 0 ) {
                zoom += value * NAV_SENSITIVITY;
                dirty = true;
              }
              break;
          }
        }
        if (dirty) {
          this.emit('abs', {yaw: yaw, pitch: pitch }); // Alf
          if (-zoom >= MOVEMENT_THRESHOLD) {
            this.addPush()
          } else {
            this.subtractPush();
            this.moving = false;
          }
        }
      }.bind(this));

      this.socket.on('connect_failed',function() {
        L.error('MultiAxis: connect failed!');
      });
      this.socket.on('disconnect',function() {
        L.error('MultiAxis: disconnected');
      });
      this.socket.on('reconnect',function() {
        console.debug('MultiAxis: reconnected');
      });
    },

    clearPush: function() {
      this.push_count = 0;
    },

    addPush: function() {
      if (!this.moving) {
        this.push_count++;
        if (this.push_count > MOVEMENT_COUNT) {
          this.moveForward();
          this.clearPush();
        }
      }
    },

    subtractPush: function() {
      this.push_count--;
      if (this.push_count < 0) {
        this.clearPush();
      }
    },

    moveForward: function() {
      this.moving = true;
      this.emit('move_forward');
      /*
      this.moving = true;
      var numLinks = panosync.meta.Links.length;
      var panoYaw = Number(panosync.meta.Projection.pano_yaw_deg);
      var hdg = ( Number(kr.pano.get('view.hlookat')) + panoYaw ) % 360;
      if( hdg < 0 ) hdg += 360;
      if( numLinks > 0 ) {
        var nearest = {};
        nearest.delta = 1024;
        for( var i=0; i<numLinks; i++ ) {
          var link = panosync.meta.Links[i];
          var delta = 180 - Math.abs( Math.abs(hdg - link.yawDeg) - 180 );
          if( delta < nearest.delta ) {
            nearest = link;
            nearest.delta = delta;
          }
        }
        panosync.request( nearest.panoId );
      }
      */
    },  //  start Alf
    moveBackward: function() {
      this.moving = true;
      this.emit('move_backward');
    } // end Alf

  });

  return MultiAxisModule;
});
