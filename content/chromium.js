chromium_compat = {}
chromium_compat.subprocess = {
  call: function(args){
    var badidea = chrome.runtime.connectNative('com.pterosaur.badidea');
    badidea.onMessage.addListener(function(data){
      if (data.type === "stdout") {
        args.stdout(data.value);
      } else if (data.type === "stderr") {
        args.stderr(data.value);
      } else {
        console.log("Unknown data type: " + data.type);
      }
    });
    badidea.onDisconnect.addListener(args.done);
    badidea.postMessage({async: 1, type: "start", command: [args.command].concat(args.arguments), "environment": args.environment});
    args.stdin({
        write: function(data){
          badidea.postMessage({async: 1, type: "stdin", value: data});
        },
        close: function(){
          badidea.postMessage({async: 1, type: "kill"});
        }
    });
  }
}

var commandRunner = chrome.runtime.connectNative('com.pterosaur.badidea');
var messageHandler = {}
commandRunner.onMessage.addListener(function(data) {
  if (data["key"] && messageHandler.indexOf(data["key"]) != -1) {
    messageHandler[data["key"]]();
  }
})

chromium_compat.singleProc =  function(uid){
  messageHandler[uid + "_vim"] = function(){
    this.isRunning = false;
  };

  this.isRunning = false;
  this.init = function(file) {
    this.file = file
  }
  this.run = function(ignore, args) {
    this.isRunning = true;
    commandRunner.postMessage({command: [this.file].concat(args), key: uid + "_vim"})
  }
}

chromium_compat.wrappedFile = function(name) {
  this.write = function(text) {
    commandRunner.postMessage({command: ["tee", name], stdin: text})
  }
  this.read = function(text) {
    commandRunner.postMessage({command: ["cat", name]})
  }
  this.path = name;
}

chromium_compat.createDir = function(path){
  commandRunner.postMessage({command: ["mkdir", path]});
}

chromium_compat.pathSearch = function(name, uid) {
  var path = null;
  /*return new Promise(function(resolve, reject) {
    messageHandler[uid + "_pathsearch"] = function(data){
      if(data.type = "stdout" && data!="")
      {
        resolve(data)
      } else if(data.type = "stderr") {
        resolve("")
      }
    }
    commandRunner.postMessage({command:["which", name] , key: uid + "_pathsearch"});
  });
*/
  return {path:"/usr/bin/vim", exists:function(){return true}};
}

chromium_compat.stringify = function() {
  //TODO
  return "";
}

chromium_compat.dispatchEvent = function() {
  return "";
}
