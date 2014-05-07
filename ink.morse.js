Ink.createExt('Morse', 1, [], function() {

    var Morse = function() {
        this.init();
        this.setup();
        this.prepare();
    }; 

    Morse.prototype = {
        init: function() {
            this.audio_status = 0;
            this.audio = {};
            this.sample = 0;
            this.sample_rate = 44100;
            this.playing = false;
            this.dot = 1.0;
            this.code = {'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..', '0': '-----', ',': '--..--', '1': '.----', '.': '.-.-.-', '2': '..---', '?': '..--..', '3': '...--', ';': '-.-.-.', '4': '....-', ':': '---...', '5': '.....', "'": '.----.', '6': '-....', '-': '-....-', '7': '--...', '/': '-..-.', '8': '---..', '(': '-.--.-', '9': '----.', ')': '-.--.-', ' ': ' ', '_': '..--.-', '@': '.--.-.', '$': '...-..-', '&': '.-...', '!': '-.-.--', '\n': ' ' };

            /*
            Configurable options

            freq: beep frequency, in Hz. Default 800Hz
            volume: volume between 0.0 and 1.0. Default: 0.25
            wpm: speed in words per minute. Default: 20.0
                 Dot sound length will be made = 1.42 / wpm,
                 so e.g. 20 WPM translates to a dot of ~70ms,
                 and all the rest will be proportional to this.
            dash: dash sound length, in dots. Default: 3 times a dot.

            interbit: silence between Morse symbols, in dots. Default: 0.6 dots.
            intersymbol: silence between two letters, in dots. Default: 2 dots.
            interword: silence between two words (space), in dots. Default: 3 dots

            If you change any of those, you must run this.prepare() before this.play()
            */

            this.compensation = 1;
            this.dash = 3;
            this.interbit = 0.6;
            this.intersymbol = 2;
            this.interword = 2;
            this.freq = 1300;
            this.volume = 0.2;
            this.wpm = 20;
        },

        ramp: function(pos, length)
        {
            /*  Generates a fadein/fadeout ramp for sound */
            var rvolume = 1.0;
            var fadein = Math.min(this.sample_rate * 0.002, 0.1 * length);
            var fadeout = length - fadein;
            if (pos < fadein) {
                rvolume = pos / fadein;
            } else if (pos > fadeout) {
                rvolume = (length - pos) / fadein;
            }
            return rvolume;
        },

        generate_float_wave: function(freq, volume, duration)
        {
            var sduration = Math.floor(this.sample_rate * duration);
            var samples = this.audio.ctx.createBuffer(1, sduration, this.sample_rate);
            var s = samples.getChannelData(0);

            for (var i = 0; i < sduration; ++i) {
                s[i] = Math.sin(freq * (i / this.sample_rate) * Math.PI * 2) 
                    * volume * this.ramp(i, sduration);
            }

            return samples;
        },

        prepare: function()
        {
            this.dot_length = 1.42 / this.wpm / this.compensation;
            this.dot_duration = this.dot_length * this.dot;
            this.dash_duration = this.dot_length * this.dash;
            this.space_duration = this.dot_length * this.intersymbol;
            this.interword_duration = this.dot_length * this.interword;
            this.interbit_duration = this.dot_length * this.interbit;
            this.sample_dot = this.generate_float_wave(this.freq, this.volume, this.dot_duration);
            this.sample_dash = this.generate_float_wave(this.freq, this.volume, this.dash_duration);
        },

        encode_morse: function(input)
        {
            var output = "";
            for (var i = 0; i < input.length; ++i) {
                var c = input[i];
                var k = this.code[c];
                if (! k) {
                    continue;
                }
                output += k;
                if (k != ' ') {
                    output += ' ';
                }
            }
            return [input, output];
        },

        gen_timeline: function(bits)
        {
            this.audio.timeline = [];
            var timestamp = 0;
            var lastbit = false;
            var interword = false;

            for (var i = 0; i < bits.length; ++i) {
                var bit = bits[i];

                switch(lastbit) {
                    case ".":
                    case "-":
                        timestamp += this.interbit_duration;
                    break;
                }

                switch(bit) {
                    case ".":
                        timestamp += this.dot_duration;
                        this.audio.timeline.push([this.sample_dot, timestamp]);
                    break;
                    case "-":
                        this.audio.timeline.push([this.sample_dash, timestamp]);
                    break;

                }

                if (bit == ' ' && lastbit == ' ') {
                    // just add inter-word
                    if (!interword) {
                        timestamp += this.interword_duration;
                        interword = true;
                    }

                } else {

                    switch(bit) {
                        case ".":
                            timestamp += this.dot_duration;
                        break;
                        case "-":
                            timestamp += this.dash_duration;
                        break;
                        case " ":
                            timestamp += this.space_duration;
                        break;
                    }
                    interword = false;
                }

                lastbit = bit;
            }
        },

        schedule: function()
        {
            var now = this.audio.ctx.currentTime;
            // schedule up to 1 second ahead current time
            var sch_limit = now + 1;

            while (this.audio.playing==true && (this.audio.timeline_pos < this.audio.timeline.length )) {
                var sample = this.audio.timeline[this.audio.timeline_pos][0];
                var timestamp = this.audio.timeline[this.audio.timeline_pos][1] + this.audio.currentTime0;

                if (timestamp > sch_limit) {
                    // ok, we have scheduled enough
                    var nw=this;
                    setTimeout(function() { nw.schedule(); }, 250);
                    return;
                } else if (timestamp < now) {
                    // we are late! try to compensate that so at least we avoid
                    // all samples mounting together immediately
                    var delay = now - timestamp + 0.2;
                    // console.log("Corrective delay " + delay);
                    this.audio.currentTime0 += delay;
                    timestamp += delay;
                }

                var node = this.audio.ctx.createBufferSource();
                node.buffer = sample;
                node.connect(this.audio.ctx.destination);
                if (!node.noteOn) {
                    node.start(timestamp);
                }
                else
                {
                    node.noteOn(timestamp);
                }

                ++this.audio.timeline_pos;
                // console.log(timestamp, sch_limit);
            }

            // end of timeline
            this.audio.playing = false;
            this.audio.timeline = [];
        },

        start_schedule: function()
        {
            this.audio.currentTime0 = this.audio.ctx.currentTime + 0.2;
            this.audio.timeline_pos = 0;
            this.audio.playing = true;
            this.schedule();
        },

        setup: function()
        {
            if (this.audio_status) {
                return;
            }
            
            if (! window.AudioContext) {
                if (! window.webkitAudioContext) {
                    this.audio_status = 2;
                    return;
                }
                window.AudioContext = window.webkitAudioContext;
                window.AudioNode = window.webkitAudioNode;
            }

            this.audio.ctx = new AudioContext(); 
            this.audio_status = 1;
        },

        play: function(m)
        {
            if (this.audio.playing) {
                this.audio.timeline = [];
                return;
            }

            if (this.audio_status === 0) {
                this.setup();
            }
            if (this.audio_status !== 1) {
                return;
            }

            this.audio.input = m;
            this.audio.morse = this.encode_morse(this.audio.input);

            this.gen_timeline(this.audio.morse[1]);
            this.start_schedule();

            return true;
        },

        stop: function() {
            this.audio.playing = false;
            this.audio.timeline = [];
        }


    };

    return Morse; 
});
