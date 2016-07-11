"use strict";
/*
This module exports a thing that will upload files ot the server.
We should consolidate this with the checkpoint code.

*/
var {Cc, Ci, Cu} = require('chrome');

var UPLOAD_URL = 'https://contextgraph.stage.mozaws.net/';
var simple_prefs = require("sdk/simple-prefs");
//
// Blargh. We need NetUtil.jsm to read inputstreams into strings.
// Not actually networking. at all.
Cu.import("resource://gre/modules/NetUtil.jsm");

// TODO: use a library import thing
var PR_RDONLY = 1;

function readStringFromFile(short_filename) {
    var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

    file.append(short_filename);

    if (!file.exists()) {
        return null;
    }
    console.log("Read string from :["+file+"]");
    var stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    stream.init(file, PR_RDONLY, 1092, 0);

    var value = NetUtil.readInputStreamToString(stream, 
                                                stream.available());
                                                stream.close();
                                                return value;
}

function getUUID() {
    /*
     * Ok, this is probably a terrible idea - but we're just going to nab
     * the user ID out of the sync preferences under the 
     * 'services.sync.account' pref. That ought to give us the user's
     * email address.
     *
     * If no email address can be found, return an empty string.
     */
    var uuid = simple_prefs.prefs.heatmap_uuid;
    if (uuid === undefined) {
        // Generate a UUID if we don't have a user ID yet and
        // stuff it into prefs
        uuid = makeGUID();
        simple_prefs.prefs.heatmap_uuid = uuid;
    }
    return uuid;
}

function makeGUID() {
    /* 
     * Generate a URL friendly 10 character UUID.
     * This code is lifted out of the sync client code in Firefox.
     */
    // 70 characters that are not-escaped URL-friendly
    const code =
        "!()*-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~";

    let guid = "";
    let num = 0;
    let val;

    // Generate ten 70-value characters for a 70^10 (~61.29-bit) GUID
    for (let i = 0; i < 10; i++) {
        // Refresh the number source after using it a few times
        if (i === 0 || i === 5)
            num = Math.random();

        // Figure out which code to use for the next GUID character
        num *= 70;
        val = Math.floor(num);
        guid += code[val];
        num -= val;
    }

    return guid;
}

function uploadFile(short_filename, uploadAttempt) {
    /*
     * Uploads file to the context graph ingestion server
     */

    console.log("uploadFile invoked!");
    var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    var data = readStringFromFile(short_filename);
    var headers = {'X-User': getUUID()};

    var Request = require("sdk/request").Request;

    console.log("Posting with data : " + data);
    var heatmapRequest = Request({
      url: UPLOAD_URL,
      headers: headers,
      content: data,
      overrideMimeType: 'application/json',
      onComplete: function (response) {
          console.log("Got response status: ["+response.status+"]");
          console.log("Got response status: ["+response.statusText+"]");
          for (var headerName in response.headers) {
              console.log(headerName + ":" + response.headers[headerName]);
          }
          console.log("Got response text: ["+response.text+"]");
      }
    });

    // Be a good consumer and check for rate limiting before doing more.
    heatmapRequest.post();
    console.log("upload is done!");
}

exports.uploadFile = uploadFile;