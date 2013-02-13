// Generated by CoffeeScript 1.4.0
(function() {
  var urls;

  urls = ['https://s3.amazonaws.com/archive.travis-ci.org/jobs/4693454/log.txt', 'https://api.travis-ci.org/jobs/4754461/log.txt'];

  $(function() {
    var log;
    log = new Log;
    log.listeners.push(new Log.Renderer);
    return $.get(urls[1], function(lines) {
      var ix, line, set, wait, _i, _len, _results;
      lines = lines.replace(/\r\n/gm, "\n");
      lines = lines.replace(/\r/gm, "\n");
      lines = lines.split(/^/m);
      set = function(ix, line) {
        return log.set(ix, line);
      };
      wait = 0;
      _results = [];
      for (ix = _i = 0, _len = lines.length; _i < _len; ix = ++_i) {
        line = lines[ix];
        setTimeout(set, wait, ix, line);
        _results.push(wait += 50);
      }
      return _results;
    });
  });

}).call(this);
