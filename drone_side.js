var selfEasyrtcid = "";


function connect_gcs() {
    easyrtc.setSocketUrl("http://vtol.xuhao1.me:8081");
    easyrtc.setUsername("DefaultDrone");
    // easyrtc.enableDebug(true);
    easyrtc.setVideoDims(1280,720);
    console.log("Initializing.");
    easyrtc.enableAudio(false);
    easyrtc.enableVideoReceive(false);
    easyrtc.enableAudioReceive(false);
    easyrtc.enableDataChannels(true);
    easyrtc.initMediaSource(
        function () {        // success callback
            console.log("Media inited!Will start stream");
            var selfVideo = document.getElementById("selfVideo");
            easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
            // easyrtc.setAudioSource(selfVideo)
            easyrtc.connect("easyrtc.videoOnly", loginSuccess, loginFailure);
        },
        function (errorCode, errmesg) {
            easyrtc.showError("MEDIA-ERROR", errmesg);
        }  // failure callback
    );
}


function terminatePage() {
    easyrtc.disconnect();
}


function hangup() {
    easyrtc.hangupAll();
    disable('hangupButton');
}


function loginSuccess(easyrtcid) {
    selfEasyrtcid = easyrtcid;
    document.getElementById('self_code').innerText = easyrtcid;
}


function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}

var gcs_easyrtcid = 0;

function send_msg_to_gcs(msg) {
    if (gcs_easyrtcid == 0)
        return;
    easyrtc.sendDataP2P(gcs_easyrtcid, 'mavlink', msg);

}

function send_term_data(msg) {
    if (gcs_easyrtcid == 0)
        return;
    console.log("Send xterm"+msg);
    easyrtc.sendDataP2P(gcs_easyrtcid, 'xterm', msg);
}

easyrtc.setOnStreamClosed(function (easyrtcid) {
    easyrtc.setVideoObjectSrc(document.getElementById('callerVideo'), "");
});


easyrtc.setAcceptChecker(function (easyrtcid, callback) {
    gcs_easyrtcid = easyrtcid;
    console.log("Got gcs id");
    console.log(gcs_easyrtcid);
    start_terminal(80,80);
    callback(true);
});

easyrtc.setPeerListener(function (who, msgType, content) {
        // console.log(content);
        if (msgType == "mavlink") {
            send_mavlink2drone(Buffer.from(content));
        }
        else if (msgType=="xterm")
        {
            on_xterm_data(Buffer.from(content));
        }

    }
);