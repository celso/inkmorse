Ink Morse Component
===================

This is an [Ink][1] based javascript module that plays [Morse Code][2] using WebAudio.

Usage:

```
Ink.requireModules(['Ink.Ext.Morse_1'],function( MorseObject ){
    var Morse=new MorseObject;

    // optional configuration
    Morse.wpm = 20;
    Morse.freq = 1300;
    Morse.volume = 1;
    Morse.sample_rate = 44100;

    // use .prepare() before .play() if you change the config
    Morse.prepare();
    Morse.play("HELLO WORLD");
}
```

Here's a [demo][3]

Here's a very good decoder for [iOS][4] too, if you need one.

Want to create your own Ink module? [Try this][5]

This is module is known to work with modern browsers with WebAudio support, tested with Safari, Firefox and Chrome.

[1]: http://ink.sapo.pt
[2]: http://en.wikipedia.org/wiki/Morse_code
[3]: http://arrifana.org/inkmorse/
[4]: https://itunes.apple.com/en/app/morsedecoder/id313071325?mt=8
[5]: http://ink.sapo.pt/javascript/Ink/#Ink_1-Ink_1-createExt
