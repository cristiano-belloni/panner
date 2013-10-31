define(['require'], function(require) {
  
    var pluginConf = {
        name: "Panner",
        osc: false,
        audioOut: 1,
        audioIn: 1,
        version: '0.0.1-alpha1',
        ui: {
            type: 'canvas',
            width: 300,
            height: 300
        }

    };

    var imgResources = null;
  
    var pluginFunction = function(args, resources) {

        var getEventPosition = function (e, obj) {

            var stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(obj, null).paddingLeft, 10) || 0;
            var stylePaddingTop = parseInt(document.defaultView.getComputedStyle(obj, null).paddingTop, 10) || 0;
            var styleBorderLeft = parseInt(document.defaultView.getComputedStyle(obj, null).borderLeftWidth, 10) || 0;
            var styleBorderTop = parseInt(document.defaultView.getComputedStyle(obj, null).borderTopWidth, 10) || 0;
            var html = document.body.parentNode;
            var htmlTop = html.offsetTop;
            var htmlLeft = html.offsetLeft;


            var element = obj,
                offsetX = 0,
                offsetY = 0,
                mx, my;

            // Compute the total offset
            if (typeof element.offsetParent !== 'undefined') {
                do {
                    offsetX += element.offsetLeft;
                    offsetY += element.offsetTop;
                } while ((element = element.offsetParent));
            }

            // Add padding and border style widths to offset
            // Also add the <html> offsets in case there's a position:fixed bar
            offsetX += stylePaddingLeft + styleBorderLeft + htmlLeft;
            offsetY += stylePaddingTop + styleBorderTop + htmlTop;

            mx = e.pageX - offsetX;
            my = e.pageY - offsetY;

            // this returns in element's css value, without borders
            var cssWidth = parseInt(document.defaultView.getComputedStyle(obj, null).getPropertyValue("width"), 10) || 0;
            var cssHeight = parseInt(document.defaultView.getComputedStyle(obj, null).getPropertyValue("height"), 10) || 0;

            //var cssWidth  = obj.offsetWidth;
            //var cssHeight = obj.offsetHeight;

            var attrWidth = obj.getAttribute("width");
            var attrHeight = obj.getAttribute("height");
            var widthScale = attrWidth / cssWidth;
            var heightScale = attrHeight / cssHeight;
            //console.log ('*** SCALE', widthScale, heightScale);

            mx *= widthScale;
            my *= heightScale;

            // We return a simple javascript object (a hash) with x and y defined
            return {
                x: mx,
                y: my
            };
        };


        // Draws a canvas and tracks mouse click/drags on the canvas.
        function Field(canvas, state) {
            this.ANGLE_STEP = 0.2;
            this.canvas = canvas;
            this.isMouseInside = false;
            this.center = {x: canvas.width/2, y: canvas.height/2};
                        
            this.point = null;
            this.angle = state.angle;

            this.state = state;

            if (state.position !== null) {
                this.point = {x :state.position.x, y: state.position.y};
            }

            var obj = this;
            // Setup mouse listeners.
            canvas.addEventListener('mouseover', function() {
                obj.handleMouseOver.apply(obj, arguments);
            });
            canvas.addEventListener('mouseout', function() {
                obj.handleMouseOut.apply(obj, arguments);
            });
            canvas.addEventListener('mousedown', function() {
                obj.handleMouseDown.apply(obj, arguments);
            });
            canvas.addEventListener('mouseup', function() {
                obj.handleMouseUp.apply(obj, arguments);
            });
            canvas.addEventListener('mousemove', function() {
                obj.handleMouseMove.apply(obj, arguments);
            });
            canvas.addEventListener('mousewheel', function() {
                obj.handleMouseWheel.apply(obj, arguments);
            });
            // Setup keyboard listener
            canvas.addEventListener('keydown', function() {
                obj.handleKeyDown.apply(obj, arguments);
            });

            this.manIcon = resources[0];
            this.speakerIcon = resources[1];
            this.render();
            
        }

        Field.prototype.render = function() {
            // Draw points onto the canvas element.
            var ctx = this.canvas.getContext('2d');

            ctx.fillStyle = "rgb(255, 255, 255)";
            ctx.fillRect (0, 0, this.canvas.width, this.canvas.height);
            //ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.drawImage(this.manIcon, this.center.x - this.manIcon.width/2,
                this.center.y - this.manIcon.height/2);
            ctx.fill();

            if (this.point) {
                // Draw it rotated.
                ctx.save();
                ctx.translate(this.point.x, this.point.y);
                ctx.rotate(this.angle);
                ctx.translate(-this.speakerIcon.width/2, -this.speakerIcon.height/2);
                ctx.drawImage(this.speakerIcon, 0, 0);
                ctx.restore();
            }
            ctx.fill();
        };

        Field.prototype.handleMouseOver = function(e) {
            this.isMouseInside = true;
            this.isMouseDown = false;
        };

        Field.prototype.handleMouseDown = function(e) {
            console.log ("mouse down");
            this.isMouseDown = true;
            this.handleMouseMove(e);
        };

        Field.prototype.handleMouseUp = function(e) {
            this.isMouseDown = false;
        };

        Field.prototype.handleMouseOut = function(e) {
            this.isMouseInside = false;
        };

        Field.prototype.handleMouseMove = function(e) {
            if (this.isMouseInside && this.isMouseDown) {
                // Update the position.
                var p = getEventPosition (e, this.canvas);
                this.point = {x: p.x, y: p.y};
                // Update the state
                this.state.position = {x: p.x, y: p.y};
                // Re-render the canvas.
                this.render();
                // Callback.
                if (this.callback) {
                    // Callback with -0.5 < x, y < 0.5
                    this.callback({x: this.point.x - this.center.x,
                        y: this.point.y - this.center.y});
                }
            }
        };

        Field.prototype.setPosAngle = function(p, a) {

            if (p && p.x !== null && p.y !== null) {
                this.point = {x: p.x, y: p.y};
                // Update the state
                this.state.position = {x: p.x, y: p.y};
                // Re-render the canvas.
                this.render();
                // Callback.
                if (this.callback) {
                    // Callback with -0.5 < x, y < 0.5
                    this.callback({x: this.point.x - this.center.x,
                        y: this.point.y - this.center.y});
                }
            }

            this.angle = a;
            if (this.angleCallback) {
                this.angleCallback(this.angle);
                this.state.angle = this.angle;
            }

        };

        Field.prototype.handleMouseWheel = function(e) {
            e.preventDefault();
            this.changeAngleHelper(e.wheelDelta/500);
        };

        Field.prototype.changeAngleHelper = function(delta) {
            this.angle += delta;
            if (this.angleCallback) {
                this.angleCallback(this.angle);
                this.state.angle = this.angle;
            }
            this.render();
        };

        Field.prototype.registerPointChanged = function(callback) {
            this.callback = callback;
        };

        Field.prototype.registerAngleChanged = function(callback) {
            this.angleCallback = callback;
        };

// Super version: http://chromium.googlecode.com/svn/trunk/samples/audio/simple.html

        function PositionSample(canvas, context, source, dest, state) {
            this.context = context;
            this.source = source;
            this.dest = dest;
            
            var sample = this;
            this.isPlaying = false;
            this.size = {width: pluginConf.ui.width, height: pluginConf.ui.height};

            var panner = this.context.createPanner();
            panner.coneOuterGain = 0.1;
            panner.coneOuterAngle = 180;
            panner.coneInnerAngle = 0;
            // Set the panner node to be at the origin looking in the +x
            // direction.
            panner.connect(this.dest);
            this.source.connect(panner);

            // Position the listener at the origin.
            this.context.listener.setPosition(0, 0, 0);

            // Expose parts of the audio graph to other functions.
            this.panner = panner;

            // Create a new Area.
            field = new Field(canvas, state);
            field.registerPointChanged(function() {
                sample.changePosition.apply(sample, arguments);
            });
            field.registerAngleChanged(function() {
                sample.changeAngle.apply(sample, arguments);
            });

            field.setPosAngle.apply (field, [state.position, state.angle]);
        }

        PositionSample.prototype.changePosition = function(position) {
            // Position coordinates are in normalized canvas coordinates
            // with -0.5 < x, y < 0.5
            if (position && position.x && position.y) {
                console.log ("changing position to", position.x, position.y);
                var mul = 2;
                var x = position.x / this.size.width;
                var y = -position.y / this.size.height;
                console.log ("changing position 2 to", x * mul, y * mul);
                this.panner.setPosition(x * mul, y * mul, -0.5);
            }
        };

        PositionSample.prototype.changeAngle = function(angle) {
            //  console.log(angle);
            // Compute the vector for this angle.
            if (angle !== null) {
                this.panner.setOrientation(Math.cos(angle), -Math.sin(angle), 1);
            }
        };

        this.id = args.id;

        if (args.initialState && args.initialState.data) {
            /* Load data */
            this.pluginState = args.initialState.data;
        }
        else {
            /* Use default data */
            this.pluginState = {
                position: null,
                angle: 0
            };
        }

        var position = new PositionSample(args.canvas, args.audioContext, args.audioSources[0], args.audioDestinations[0], this.pluginState);

        var saveState = function () {
            return { data: this.pluginState };
        };
        args.hostInterface.setSaveState (saveState);

        // Initialization made it so far: plugin is ready.
        args.hostInterface.setInstanceStatus ('ready');
    };
    
    
    var initPlugin = function(initArgs) {
        var args = initArgs;

        console.log ("initArgs", initArgs);

        var requireErr = function (err) {
            args.hostInterface.setInstanceStatus ('fatal', {description: 'Error loading resources'});
        }.bind(this);

        console.log ("imgResources", imgResources);

        if (imgResources === null) {
            var resList = [ './assets/images/man.svg!image',
                            './assets/images/speaker.svg!image',
                            ];

            console.log ("requiring...");

            require (resList,
                        function () {
                            console.log ("required...");
                            imgResources = arguments;
                            pluginFunction.call (this, args, arguments);
                        }.bind(this),
                        function (err) {
                            console.log ("require error");
                            requireErr (err);
                        }
                    );
        }

        else {
            pluginFunction.call (this, args, imgResources);
        }
    
    };
        
    return {
        initPlugin: initPlugin,
        pluginConf: pluginConf
    };
});