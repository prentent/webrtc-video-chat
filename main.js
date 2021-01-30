(function () {

  var connectButton = null;
  var connectanserButton = null;
  var disconnectButton = null;

  var iceButton = null;
  var icetextarea = null;

  var offerButton = null;
  var offertextarea = null;

  var anserButton = null;
  var ansertextarea = null;

  var sendButton = null;
  var messageInputBox = null;

  var receiveBox = null;

  var localConnection = null;

  var sendChannel = null;
  var receiveChannel = null;

  var webcamStream = null;
  var mediaConstraints = {
    audio: false,            // We want an audio track
    video: {
      aspectRatio: {
        ideal: 1.333333     // 3:2 aspect is preferred
      }
    }
  };
  var configuration = {
    //配置打洞服务器
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
        username: "webrtc",
        credential: "stunserver"
      }, {
        urls: "turn:numb.viagenie.ca",
        username: "webrtclive",
        credential: "turnserver"
      }
    ],
    // sdpSemantics: 'plan-b'
  };

  function startup() {
    connectButton = document.getElementById('connectButton');
    //connectanserButton
    connectanserButton = document.getElementById('connectanserButton');
    disconnectButton = document.getElementById('disconnectButton');

    iceButton = document.getElementById('iceButton');
    icetextarea = document.getElementById('icetextarea');

    offerButton = document.getElementById('offerButton');
    offertextarea = document.getElementById('offertextarea');

    anserButton = document.getElementById('anserButton');
    ansertextarea = document.getElementById('ansertextarea');

    sendButton = document.getElementById('sendButton');
    messageInputBox = document.getElementById('message');
    receiveBox = document.getElementById('receivebox');

    connectButton.addEventListener('click', connectPeers('offer'), false);
    connectanserButton.addEventListener('click', connectPeers('anser'), false);
    disconnectButton.addEventListener('click', disconnectPeers, false);

    iceButton.addEventListener('click', setIce, false);

    offerButton.addEventListener('click', setOfferSdp, false);

    anserButton.addEventListener('click', setAnserSdp, false);

    sendButton.addEventListener('click', sendMessage, false);
  }

  async function connectPeers(type) {
    iceButton.disabled = false;
    icetextarea.disabled = false;
    offerButton.disabled = false;
    offertextarea.disabled = false;
    anserButton.disabled = false;
    ansertextarea.disabled = false;

    localConnection = new RTCPeerConnection(configuration);
    localConnection.ondatachannel = receiveChannelCallback;
    localConnection.oniceconnectionstatechange = e => console.log('oniceconnectionstatechange', localConnection.iceConnectionState, e);
    localConnection.onicegatheringstatechange = e => console.log('onicegatheringstatechange', localConnection.iceGatheringState, e);
    localConnection.onsignalingstatechange = e => console.log('onsignalingstatechange', localConnection.signalingState, e);
    // localConnection.ontrack = handleTrackEvent;

    localConnection.onaddstream = function (obj) {
      document.getElementById("received_video").srcObject = obj.stream;
    };

    sendChannel = localConnection.createDataChannel("sendChannel");
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;

    localConnection.onicecandidate = e => {
      if (e.candidate) {
        //这个就是我们需要的ICE
        console.log('localConnection', JSON.stringify(e.candidate));
        // remoteConnection.addIceCandidate(e.candidate).catch(handleAddCandidateError);
      }
    }

    //发送者需要
    if (type == "offer") {
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        document.getElementById("local_video").srcObject = webcamStream;
        console.log(webcamStream);
      } catch (err) {
        console.error(err);
        return;
      }

      localConnection.addStream(webcamStream);

      await localConnection.setLocalDescription(await localConnection.createOffer());
      //这个是发送者的本地描述
      console.log('offer', JSON.stringify(localConnection.localDescription));
    }
  }

  function handleTrackEvent(event) {
    console.log("-------handleTrackEvent");
    console.log("-------handleTrackEvent", event.streams[0]);
    document.getElementById("received_video").srcObject = event.streams[0];
  }

  function handleCreateDescriptionError(error) {
    console.log("Unable to create an offer: " + error.toString());
  }

  function handleAddCandidateError() {
    console.log("Oh noes! addICECandidate failed!");
  }

  function sendMessage() {
    var message = messageInputBox.value;
    sendChannel.send(message);

    messageInputBox.value = "";
    messageInputBox.focus();
  }

  function handleSendChannelStatusChange(event) {
    if (sendChannel) {
      var state = sendChannel.readyState;
      if (state === "open") {
        messageInputBox.disabled = false;
        messageInputBox.focus();
        sendButton.disabled = false;
        disconnectButton.disabled = false;
        connectButton.disabled = true;
      } else {
        messageInputBox.disabled = true;
        sendButton.disabled = true;
        connectButton.disabled = false;
        disconnectButton.disabled = true;
      }
    }
  }

  function receiveChannelCallback(event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
  }

  function handleReceiveMessage(event) {
    var el = document.createElement("p");
    var txtNode = document.createTextNode(event.data);

    el.appendChild(txtNode);
    receiveBox.appendChild(el);
  }

  function handleReceiveChannelStatusChange(event) {
    if (receiveChannel) {
      console.log("Receive channel's status has changed to " +
        receiveChannel.readyState);
    }
  }

  function setIce() {
    if (!icetextarea.value) {
      alert("请输入");
      return;
    }
    var obj = JSON.parse(icetextarea.value);
    console.log(obj);
    var candidate = new RTCIceCandidate(obj);
    localConnection.addIceCandidate(candidate)
      .catch(error => console.log('ice-------', error));
  }

  function setOfferSdp() {
    if (!offertextarea.value) {
      alert("请输入");
      return;
    }
    var obj = JSON.parse(offertextarea.value);
    console.log(obj);
    var desc = new RTCSessionDescription(obj);
    localConnection.setRemoteDescription(desc)
      .catch(error => console.log('spd-------', error));
  }

  async function setAnserSdp() {
    if (!ansertextarea.value) {
      alert("请输入");
      return;
    }
    var obj = JSON.parse(ansertextarea.value);
    console.log(obj);
    var desc = new RTCSessionDescription(obj);
    await localConnection.setRemoteDescription(desc);

    if (!webcamStream) {
      console.log("ss2222222");
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        document.getElementById("local_video").srcObject = webcamStream;
        console.log('--------', webcamStream);
      } catch (err) {
        console.error(err);
        return;
      }
      localConnection.addStream(webcamStream);
    }
    // Add the camera stream to the RTCPeerConnection

    await localConnection.setLocalDescription(await localConnection.createAnswer());
    //这个是接受者的本地描述
    console.log('anser', JSON.stringify(localConnection.localDescription));
  }

  function disconnectPeers() {

    sendChannel.close();
    receiveChannel.close();

    localConnection.close();

    sendChannel = null;
    receiveChannel = null;
    localConnection = null;

    iceButton.disabled = true;
    icetextarea.disabled = true;
    offerButton.disabled = true;
    offertextarea.disabled = true;
    anserButton.disabled = true;
    ansertextarea.disabled = true;
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    sendButton.disabled = true;

    messageInputBox.value = "";
    messageInputBox.disabled = true;
  }

  window.addEventListener('load', startup, false);
})();
