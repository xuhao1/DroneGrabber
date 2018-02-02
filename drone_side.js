var selfEasyrtcid = "";


function connect_gcs() {
    console.log("Will connect to VTOL.XUHAO1.ME");
    easyrtc.setSocketUrl("http://vtol.xuhao1.me:8081");
    easyrtc.setUsername("DefaultDrone");
    // easyrtc.enableDebug(true);
    easyrtc.setVideoDims(1280,720);
    console.log("Initializing.");
    easyrtc.enableAudio(false);
    easyrtc.enableVideoReceive(false);
    easyrtc.enableAudioReceive(false);
    easyrtc.enableDataChannels(true);
    easyrtc.getDatachannelConstraints = function() {
        console.log("Create Data Channellllllllllllllllllllllllllllllllllllllllllll!");
        return {
                ordered: false, // do not guarantee order
                maxRetransmitTime: 3000, // in milliseconds
                maxRetransmits:0
        }};
    var remoteFilter = easyrtc.buildRemoteSdpFilter({
        audioSendBitrate: 20, videoSendBitrate:400
    });
    var localFilter = easyrtc.buildLocalSdpFilter( {
        audioRecvBitrate:20, videoRecvBitrate:30
    });
    easyrtc.setSdpFilters(localFilter, remoteFilter);
    easyrtc.initMediaSource(
        function () {        // success callback
            console.log("Media inited!Will start stream");
            easyrtc.connect("easyrtc.videoOnly", loginSuccess, loginFailure);
        },
        function (errorCode, errmesg) {
            easyrtc.showError("MEDIA-ERROR", errmesg);
        }  // failure callback
    );
    console.log("Finish connect to GCS");
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
    console.log("Login to Server successful : "+easyrtcid);
    // document.getElementById('self_code').innerText = easyrtcid;
}


function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}

var gcs_easyrtcid = 0;

function send_msg_to_gcs_by_peer(msg) {
    if (gcs_easyrtcid == 0)
        return;
    var ret = easyrtc.sendDataP2P(gcs_easyrtcid, 'mavlink', msg);
}

function send_term_data(msg) {
    if (gcs_easyrtcid == 0)
        return;
    console.log("Send xterm"+msg);
    easyrtc.sendDataP2P(gcs_easyrtcid, 'xterm', msg);
}

easyrtc.setOnStreamClosed(function (easyrtcid) {
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

            window.mavpro.process_gcs_income_dram(Buffer.from(content));
        }
        else if (msgType=="xterm")
        {
            on_xterm_data(Buffer.from(content));
        }

    }
);