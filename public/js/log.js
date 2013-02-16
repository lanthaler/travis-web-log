minispade.register('log', "(function() {(function() {\n\n  this.Log = function() {\n    this.listeners = [];\n    return this;\n  };\n\n  $.extend(Log.prototype, {\n    trigger: function() {\n      var args, event, listener, _i, _len, _ref;\n      args = Array.prototype.slice.apply(arguments);\n      event = args[0];\n      if (!(event === 'start' || event === 'stop')) {\n        this.trigger('start', event);\n      }\n      _ref = this.listeners;\n      for (_i = 0, _len = _ref.length; _i < _len; _i++) {\n        listener = _ref[_i];\n        listener.notify.apply(listener, [this].concat(args));\n      }\n      if (!(event === 'start' || event === 'stop')) {\n        return this.trigger('stop', event);\n      }\n    },\n    set: function(num, string) {\n      this.trigger('receive', num, string);\n      this.engine || (this.engine = new Log.Live(this));\n      return this.engine.set(num, string);\n    }\n  });\n\n  Log.Listener = function() {};\n\n  $.extend(Log.Listener.prototype, {\n    notify: function(log, event, num) {\n      if (this[event]) {\n        return this[event].apply(this, [log].concat(Array.prototype.slice.call(arguments, 2)));\n      }\n    }\n  });\nminispade.require('log/buffer');\nminispade.require('log/deansi');\nminispade.require('log/engine/live');\nminispade.require('log/folds');\nminispade.require('log/instrument');\nminispade.require('log/renderer/fragment');\nminispade.require('log/renderer/jquery');\n\n}).call(this);\n\n})();\n//@ sourceURL=log");minispade.register('log/buffer', "(function() {(function() {\n\n  Log.Buffer = function(log, options) {\n    this.start = 0;\n    this.log = log;\n    this.parts = [];\n    this.options = $.extend({\n      interval: 100,\n      timeout: 500\n    }, options || {});\n    this.schedule();\n    return this;\n  };\n\n  $.extend(Log.Buffer.prototype, {\n    set: function(num, string) {\n      return this.parts[num] = {\n        string: string,\n        time: (new Date).getTime()\n      };\n    },\n    flush: function() {\n      var num, part, _i, _len, _ref;\n      _ref = this.parts;\n      for (num = _i = 0, _len = _ref.length; _i < _len; num = ++_i) {\n        part = _ref[num];\n        if (!this.parts.hasOwnProperty(num)) {\n          continue;\n        }\n        if (!part) {\n          break;\n        }\n        delete this.parts[num];\n        this.log.set(num, part.string);\n      }\n      return this.schedule();\n    },\n    schedule: function() {\n      var _this = this;\n      return setTimeout((function() {\n        return _this.flush();\n      }), this.options.interval);\n    }\n  });\n\n}).call(this);\n\n})();\n//@ sourceURL=log/buffer");minispade.register('log/deansi', "(function() {(function() {\nminispade.require('ansiparse');\n\n  Log.Deansi = {\n    apply: function(string) {\n      var result,\n        _this = this;\n      string = string.replace(/.*(\\033\\[K\\n|\\r(?!\\n))/gm, '');\n      result = [];\n      ansiparse(string).forEach(function(part) {\n        return result.push(_this.node(part));\n      });\n      return result;\n    },\n    classes: function(part) {\n      var result;\n      result = [];\n      if (part.foreground) {\n        result.push(part.foreground);\n      }\n      if (part.background) {\n        result.push(\"bg-\" + part.background);\n      }\n      if (part.bold) {\n        result.push('bold');\n      }\n      if (part.italic) {\n        result.push('italic');\n      }\n      if (result.length > 0) {\n        return result;\n      }\n    },\n    node: function(part) {\n      var classes;\n      if (classes = this.classes(part)) {\n        return {\n          type: 'span',\n          \"class\": classes,\n          text: part.text\n        };\n      } else {\n        return {\n          type: 'text',\n          text: part.text\n        };\n      }\n    }\n  };\n\n}).call(this);\n\n})();\n//@ sourceURL=log/deansi");minispade.register('log/engine/live', "(function() {(function() {\n\n  Log.Live = function(log) {\n    this.log = log;\n    this.parts = [];\n    return this;\n  };\n\n  $.extend(Log.Live.prototype, {\n    set: function(num, string) {\n      var part;\n      if (this.parts[num]) {\n        return;\n      }\n      part = new Log.Live.Part(this, num, string);\n      this.parts[num] = part;\n      return this.parts[num].insert();\n    },\n    trigger: function() {\n      return this.log.trigger.apply(this.log, arguments);\n    }\n  });\n\n  Log.Live.Part = function(log, num, string) {\n    var ix, line;\n    this.log = log;\n    this.num = num;\n    this.lines = (function() {\n      var _i, _len, _ref, _results;\n      _ref = string.replace(/\\r\\n/gm, \"\\n\").split(/^/m);\n      _results = [];\n      for (ix = _i = 0, _len = _ref.length; _i < _len; ix = ++_i) {\n        line = _ref[ix];\n        _results.push(new Log.Live.Line(this, ix, line));\n      }\n      return _results;\n    }).call(this);\n    return this;\n  };\n\n  $.extend(Log.Live.Part.prototype, {\n    insert: function() {\n      return new Log.Live.Context(this.log, this).insert();\n    },\n    head: function() {\n      var head, line;\n      head = [];\n      line = this.lines[0];\n      while ((line = line != null ? line.prev() : void 0) && !line.isNewline()) {\n        head.unshift(line);\n      }\n      return head;\n    },\n    tail: function() {\n      var line, tail;\n      tail = [];\n      line = this.lines[this.lines.length - 1];\n      while (line = line != null ? line.next() : void 0) {\n        tail.push(line);\n        if (line != null ? line.isNewline() : void 0) {\n          break;\n        }\n      }\n      return tail;\n    },\n    prev: function() {\n      var num, prev;\n      num = this.num;\n      while (!(prev || num < 0)) {\n        prev = this.log.parts[num -= 1];\n      }\n      return prev;\n    },\n    next: function() {\n      var next, num;\n      num = this.num;\n      while (!(next || num >= this.log.parts.length)) {\n        next = this.log.parts[num += 1];\n      }\n      return next;\n    }\n  });\n\n  Log.Live.Line = function(part, num, string) {\n    this.part = part;\n    this.num = num;\n    this.id = \"\" + part.num + \"-\" + num;\n    this.string = string;\n    return this;\n  };\n\n  $.extend(Log.Live.Line.prototype, {\n    prev: function() {\n      var line, _ref;\n      line = this.part.lines[this.num - 1];\n      return line || ((_ref = this.part.prev()) != null ? _ref.lines.slice(-1)[0] : void 0);\n    },\n    next: function() {\n      var line, _ref;\n      line = this.part.lines[this.num + 1];\n      return line || ((_ref = this.part.next()) != null ? _ref.lines[0] : void 0);\n    },\n    isNewline: function() {\n      return this.string[this.string.length - 1] === \"\\n\";\n    },\n    clone: function() {\n      return new Log.Live.Line(this.part, this.num, this.string);\n    }\n  });\n\n  Log.Live.Context = function(log, part) {\n    this.log = log;\n    this.part = part;\n    this.head = part.head();\n    this.tail = part.tail();\n    this.lines = this.join(this.head.concat(part.lines).concat(this.tail));\n    return this;\n  };\n\n  $.extend(Log.Live.Context.prototype, {\n    insert: function() {\n      var ids;\n      ids = this.head.concat(this.tail).map(function(line) {\n        return line.id;\n      });\n      if (ids.length !== 0) {\n        this.log.trigger('remove', ids);\n      }\n      return this.log.trigger('insert', this.after(), this.nodes());\n    },\n    nodes: function() {\n      var _this = this;\n      return this.lines.map(function(line) {\n        var fold, string;\n        string = line.string;\n        if (fold = _this.defold(string)) {\n          return $.extend(fold, {\n            id: line.id\n          });\n        } else {\n          return {\n            id: line.id,\n            nodes: _this.deansi(string),\n            hidden: string === ''\n          };\n        }\n      });\n    },\n    join: function(all) {\n      var line, lines;\n      lines = [];\n      while (line = all.pop()) {\n        if (lines.length === 0 || line.isNewline()) {\n          lines.unshift(line.clone());\n        } else {\n          lines[0].string = line.string + lines[0].string;\n        }\n      }\n      return lines;\n    },\n    after: function() {\n      var line, _ref;\n      line = (_ref = this.part.lines[0]) != null ? _ref.prev() : void 0;\n      while (line && !line.isNewline()) {\n        line = line.prev();\n      }\n      return line != null ? line.id : void 0;\n    },\n    defold: function(string) {\n      var matches;\n      if (matches = string.match(/fold:(start|end):([\\w]+)/)) {\n        return {\n          type: 'fold',\n          event: matches[1],\n          name: matches[2]\n        };\n      }\n    },\n    deansi: function(string) {\n      return Log.Deansi.apply(string);\n    }\n  });\n\n}).call(this);\n\n})();\n//@ sourceURL=log/engine/live");minispade.register('log/folds', "(function() {(function() {\n\n  Log.Folds = function() {\n    this.folds = {};\n    return this;\n  };\n\n  Log.Folds.prototype = $.extend(new Log.Listener, {\n    insert: function(log, after, datas) {\n      var data, fold, _i, _len, _results;\n      _results = [];\n      for (_i = 0, _len = datas.length; _i < _len; _i++) {\n        data = datas[_i];\n        if (data.type === 'fold') {\n          fold = this.merge(data.name, data.event, data.id);\n          if (fold.start && fold.end) {\n            _results.push(this.activate(fold.start));\n          } else {\n            _results.push(void 0);\n          }\n        } else {\n          _results.push(void 0);\n        }\n      }\n      return _results;\n    },\n    merge: function(name, event, id) {\n      var _base;\n      (_base = this.folds)[name] || (_base[name] = {});\n      this.folds[name][event] = id;\n      return this.folds[name];\n    },\n    activate: function(id) {\n      var node;\n      node = document.getElementById(id);\n      return node.setAttribute('class', \"\" + (node.getAttribute('class')) + \" active\");\n    }\n  });\n\n}).call(this);\n\n})();\n//@ sourceURL=log/folds");minispade.register('log/instrument', "(function() {(function() {\n\n  Log.Metrics = function() {\n    this.values = {};\n    return this;\n  };\n\n  $.extend(Log.Metrics.prototype, {\n    start: function(name) {\n      return this.started = (new Date).getTime();\n    },\n    stop: function(name) {\n      var _base;\n      (_base = this.values)[name] || (_base[name] = []);\n      return this.values[name].push((new Date).getTime() - this.started);\n    },\n    summary: function() {\n      var metrics, name, values, _ref;\n      metrics = {};\n      _ref = this.values;\n      for (name in _ref) {\n        values = _ref[name];\n        metrics[name] = {\n          avg: values.reduce(function(a, b) {\n            return a + b;\n          }) / values.length,\n          count: values.length\n        };\n      }\n      return metrics;\n    }\n  });\n\n  Log.Instrumenter = function() {};\n\n  Log.Instrumenter.prototype = $.extend(new Log.Listener, {\n    start: function(log, event) {\n      log.metrics || (log.metrics = new Log.Metrics);\n      return log.metrics.start(event);\n    },\n    stop: function(log, event) {\n      return log.metrics.stop(event);\n    }\n  });\n\n  Log.Log = function() {};\n\n  Log.Log.prototype = $.extend(new Log.Listener, {\n    receive: function(log, num, string) {\n      return this.log(\"<b><span>rcv \" + num + \"</span> \" + (JSON.stringify(string)) + \"</b>\");\n    },\n    insert: function(log, after, datas) {\n      return this.log(\"<span>ins \" + (datas.map(function(data) {\n        return data.id;\n      }).join(', ')) + \",</span> after: \" + (after || '?') + \", \" + (JSON.stringify(datas)));\n    },\n    remove: function(log, id) {\n      return this.log(\"<span>rem \" + id + \"</span>\");\n    },\n    log: function(line) {\n      return $('#events').append(\"\" + line + \"\\n\");\n    }\n  });\n\n}).call(this);\n\n})();\n//@ sourceURL=log/instrument");minispade.register('log/renderer/fragment', "(function() {(function() {\n\n  Log.FragmentRenderer = function() {\n    this.frag = document.createDocumentFragment();\n    this.para = this.createParagraph();\n    this.span = this.createSpan();\n    this.text = document.createTextNode('');\n    this.fold = document.createElement('div');\n    return this;\n  };\n\n  Log.FragmentRenderer.prototype = $.extend(new Log.Listener, {\n    remove: function(log, ids) {\n      var id, node, _i, _len, _results;\n      _results = [];\n      for (_i = 0, _len = ids.length; _i < _len; _i++) {\n        id = ids[_i];\n        node = document.getElementById(id);\n        if (node) {\n          _results.push(node.parentNode.removeChild(node));\n        } else {\n          _results.push(void 0);\n        }\n      }\n      return _results;\n    },\n    insert: function(log, after, datas) {\n      var node;\n      node = this.render(datas);\n      if (after) {\n        after = document.getElementById(after);\n        return this.insertAfter(node, after);\n      } else {\n        log = document.getElementById('log');\n        return log.insertBefore(node, log.firstChild);\n      }\n    },\n    render: function(datas) {\n      var data, frag, node, _i, _len;\n      frag = this.frag.cloneNode(true);\n      for (_i = 0, _len = datas.length; _i < _len; _i++) {\n        data = datas[_i];\n        node = data.type === 'fold' ? this.renderFold(data) : this.renderParagraph(data);\n        frag.appendChild(node);\n      }\n      return frag;\n    },\n    renderParagraph: function(data) {\n      var node, para, type, _i, _len, _ref;\n      para = this.para.cloneNode(true);\n      para.setAttribute('id', data.id);\n      if (data.hidden) {\n        para.setAttribute('style', 'display: none;');\n      }\n      _ref = data.nodes;\n      for (_i = 0, _len = _ref.length; _i < _len; _i++) {\n        node = _ref[_i];\n        type = node.type[0].toUpperCase() + node.type.slice(1);\n        node = this[\"render\" + type](node);\n        para.appendChild(node);\n      }\n      return para;\n    },\n    renderFold: function(data) {\n      var fold;\n      fold = this.fold.cloneNode(true);\n      fold.setAttribute('id', data.id);\n      fold.setAttribute('class', \"fold-\" + data.event);\n      fold.setAttribute('name', data.name);\n      return fold;\n    },\n    renderSpan: function(data) {\n      var span;\n      span = this.span.cloneNode(true);\n      span.setAttribute('class', data[\"class\"]);\n      span.lastChild.nodeValue = data.text.replace(/\\n/gm, '');\n      return span;\n    },\n    renderText: function(data) {\n      var text;\n      text = this.text.cloneNode(true);\n      text.nodeValue = (data.text || '').replace(/\\n/gm, '');\n      return text;\n    },\n    createParagraph: function() {\n      var para;\n      para = document.createElement('p');\n      para.appendChild(document.createElement('a'));\n      return para;\n    },\n    createSpan: function() {\n      var span;\n      span = document.createElement('span');\n      span.appendChild(document.createTextNode(''));\n      return span;\n    },\n    insertAfter: function(node, after) {\n      if (after.nextSibling) {\n        return after.parentNode.insertBefore(node, after.nextSibling);\n      } else {\n        return after.parentNode.appendChild(node);\n      }\n    }\n  });\n\n}).call(this);\n\n})();\n//@ sourceURL=log/renderer/fragment");minispade.register('log/renderer/jquery', "(function() {(function() {\n\n  Log.JqueryRenderer = function() {};\n\n  Log.JqueryRenderer.prototype = $.extend(new Log.Listener, {\n    remove: function(log, ids) {\n      var id, _i, _len, _results;\n      _results = [];\n      for (_i = 0, _len = ids.length; _i < _len; _i++) {\n        id = ids[_i];\n        _results.push($(\"#log #\" + id).remove());\n      }\n      return _results;\n    },\n    insert: function(log, after, datas) {\n      var html,\n        _this = this;\n      html = datas.map(function(data) {\n        return _this.render(data);\n      });\n      return after && $(\"#log #\" + after).after(html) || $('#log').prepend(html);\n    },\n    render: function(data) {\n      var node, nodes, text;\n      nodes = (function() {\n        var _i, _len, _ref, _results;\n        _ref = data.nodes;\n        _results = [];\n        for (_i = 0, _len = _ref.length; _i < _len; _i++) {\n          node = _ref[_i];\n          text = node.text.replace(/\\n/gm, '');\n          if (node.type === 'span') {\n            text = \"<span class=\\\"\" + node[\"class\"] + \"\\\">\" + text + \"</span>\";\n          }\n          _results.push(\"<p id=\\\"\" + data.id + \"\\\"\" + (this.style(data)) + \"><a id=\\\"\\\"></a>\" + text + \"</p>\");\n        }\n        return _results;\n      }).call(this);\n      return nodes.join(\"\\n\");\n    },\n    style: function(data) {\n      return data.hidden && 'display: none;' || '';\n    }\n  });\n\n}).call(this);\n\n})();\n//@ sourceURL=log/renderer/jquery");