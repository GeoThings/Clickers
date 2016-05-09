geo = {};

//EVENT_API_URL = "http://gis.micromappers.org/ClickerTrainerAPI/rest/deployment/active/mobile";
EVENT_API_URL = "http://gis.micromappers.org/AIDRTrainerAPI/rest/deployment/active/mobile";

geo.text_queue = [];
geo.img_queue = [];

function p(s) {
    return s < 10 ? "0" + s : s;
}

function imgError(image) {
    image.onerror = "";
    image.src = "img/no_image.png";
    return true;
}

geo.getDateTime = function() {
    var now = new Date();
    var year = now.getFullYear();
    var month = p(now.getMonth() + 1);
    var day = p(now.getDate());
    var hour = p(now.getHours());
    var minute = p(now.getMinutes());
    var second = p(now.getSeconds());
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
};

geo.replaceURLWithHTMLLinks = function(text) {
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp, '<a href="#" onclick="window.open(\'$1\',\'_blank\',\'location=yes\');">$1</a>');
};

geo.getTextOrTweet = function(text, tweet) {
    if(typeof(tweet) == "undefined") {
        return text;
    }
    else {
        return tweet;
    }
};

geo.parseText = function(text) {
    //hash tag
    text = geo.replaceURLWithHTMLLinks(text);
    return text.replace(/ (#[a-z\d]+)([.?!,]*)/gi, ' <span class="hashtag">$1</span>$2');
};

geo.showLoading = function() {
    $.mobile.loading("show", {
        text: "",
        textVisible: false,
        theme: "a",
        html: ""
    });
};

geo.hideLoading = function() {
    $.mobile.loading("hide");
};

geo.displayErrorMessage = function() {
    navigator.notification.confirm("Something went wrong, please check our website:\nhttp://clickers.micromappers.org/", function(idx) {
        if(idx == 1) {
            window.open("http://clickers.micromappers.org", "_system");
        }
    }, "Clickers", ["Ok", "Cancel"]);
};

geo.saveEventDataToSession = function(event) {
    for(var i in event) {
        //var event_id = event[i]["platformAppID"];
        var event_id = event[i]["clientAppID"];
        var event_detail = {
            "name": event[i]["clientAppName"],
            "label": []
        };
        var labels = JSON.parse(event[i]["choices"]);
        for(var j in labels) {
            event_detail['label'].push(labels[j]["qa"]);
        }
        sessionStorage.setItem(event_id, JSON.stringify(event_detail));
    }
    sessionStorage["csrf_token"] = event["csrf_token"];
};

geo.displayLabel = function() {
    var event = JSON.parse(sessionStorage[sessionStorage['current_event']]);
    var label_num = event['label'].length;
    var grid_class = label_num > 3 ? "ui-grid-b" : "ui-grid-" + String.fromCharCode(label_num + 95);
    var label_list = ['<div class="button-panel ' + grid_class + '">'];
    var class_index = 0;
    for(var i in event['label']) {
        var name = event['label'][i].replace(/\n/g, "");
        var class_theme = "";
        if(event['label'].length == 3) {
            if(i == 0) {
                class_theme = "e";
            } else if(i == 1) {
                class_theme = "d";
            } else if(i == 2) {
                class_theme = "c";
            }
        }
        else {
            if(i < 3) {
                class_theme = "d";
            } else {
                class_theme = "c";
            }
        }
        label_list.push('',
            '<div class="ui-block-' + String.fromCharCode(parseInt(class_index, 10) + 97) + '">',
            '    <a href="#" data-theme="c" data-corners="false" class="ui-btn ui-btn-' + class_theme + '" style="margin: 0;">' + name + '</a>',
            '</div>'
        );
        if(i == 2) {
            label_list.push('</div><div class="button-panel ' + grid_class + '">');
            class_index = -1;
        }
        class_index++;
    }
    label_list.push("</div>");
    $(".footer-panel").html(label_list.join("\n"));
};


//=================
// Page Event
//=================

$(document).delegate("#index_page", "pageshow", function() {
    //StatusBar.overlaysWebView(false);
    geo.getEvents();
    geo.setEventClickCallback();
});

$(document).delegate("#image_clicker", "pageshow", function() {
    geo.displayLabel();
    geo.initialImageQueue();
    geo.setImageSaveButtonClickCallback();
    geo.setImageShareClickCallback();
});

$(document).delegate("#text_clicker", "pageshow", function() {
    geo.displayLabel();
    geo.initialTextQueue();
    geo.setTextSaveButtonClickCallback();
    geo.setTextShareClickCallback();
});


//=================
// Index Page
//=================

geo.displayEvents = function(event) {
    var event_list = [];
    for(var i in event) {
        var html = "";
        if(event[i]["appType"] == 1) {
            html = "text_clicker.html";
        }
        else if(event[i]["appType"] == 2) {
            html = "image_clicker.html";
        }
        else {
            html = "";
        }
        if(html !== "") {
            event_list.push('',
                '<li class="event-li">',
                '    <a href="' + html + '" class="event-item" event_id="' + event[i]['clientAppID'] + '">' + event[i]['clientAppName'] + '</a>',
                '</li>'
            );
        }
    }
    if(event.length === 0) {
        event_list.push('',
            '<li class="event-li">',
            '    No event.',
            '</li>'
        );
    }
    $("#index_page .event-li").remove();
    $("#index_page .event-list").append(event_list.join("\n")).listview("refresh");
};

geo.getEvents = function() {
    geo.showLoading();
    $.ajax({
        url: EVENT_API_URL,
        type: "GET"
    }).done(function(res) {
        if($.isEmptyObject(res)) {
            navigator.notification.alert("Congratulations! You have participated in all available events!");
        }
        else {
            geo.saveEventDataToSession(res);
            geo.displayEvents(res);
        }
        geo.hideLoading();
    }).fail(function() {
        geo.displayErrorMessage();
    });
};

geo.setEventClickCallback = function() {
    $("#index_page .event-list").delegate(".event-item", "click", function() {
        sessionStorage.setItem("current_event", $(this).attr("event_id"));
    });
};


//=================
// Text Clicker
//=================

geo.initialTextQueue = function() {
    geo.showLoading();
    geo.text_queue = [];
    geo.getText(0);
};

geo.displayText = function() {
    var text = geo.text_queue[0];
    var text_or_tweet = geo.getTextOrTweet(text['info']['text'], text['info']['tweet']);
    $(".text-panel").html(geo.parseText(text_or_tweet));
};

geo.getText = function(offset) {
    var url = "http://clickers.micromappers.org/api/project/" + sessionStorage["current_event"] + "/newtask?offset=" + offset.toString();
    $.ajax({
        url: url,
        type: "GET"
    }).done(function(res) {
        if($.isEmptyObject(res)) {
            $(".text-panel").html("Congratulations! You have participated in all available tasks!");
            $(".button-panel").hide();
        }
        else {
            if(offset === 0) {
                var text_or_tweet = geo.getTextOrTweet(res['info']['text'], res['info']['tweet']);
                $(".text-panel").html(geo.parseText(text_or_tweet));
                geo.getText(1);
            }
            geo.text_queue.push(res);
        }
        geo.hideLoading();
    }).fail(function() {
        geo.displayErrorMessage();
    });
};

geo.setTextSaveButtonClickCallback = function() {
    $(".footer-panel").delegate(".ui-btn", "click", function() {
        var result = $(this).text();
        var text = geo.text_queue[0];
        var text_or_tweet = geo.getTextOrTweet(text['info']['text'], text['info']['tweet']);
        var answer = {
            "project_id": parseInt(sessionStorage["current_event"], 10),
            "task_id": text["id"],
            "info": {
                "platform": device.platform,
                "category": result,
                "tweet": text_or_tweet,
                "tweetid": text["info"]["tweetid"],
                "taskid": text["id"],
                "timestamp": geo.getDateTime(),
                "author": text["info"]["author"],
                "lon": "0",
                "lat": "0",
                "url": text["info"]["url"]
            }
        };
        geo.showLoading();
        geo.saveTextResult(answer);
    });
};

geo.saveTextResult = function(answer) {
    $.ajax({
        url: "http://clickers.micromappers.org/api/taskrun",
        type: "POST",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(answer)
    }).done(function() {
        geo.text_queue.shift();
        geo.displayText();
        geo.getText(1);
    }).fail(function() {
        geo.displayErrorMessage();
        geo.hideLoading();
    });
};

geo.setTextShareClickCallback = function() {
    $(".share-text").click(function() {
        window.plugins.socialsharing.share($("#text_clicker .text-panel").text());
        return false;
    });
};


//=================
// Image Clicker
//=================

geo.initialImageQueue = function() {
    geo.showLoading();
    geo.img_queue = [];
    geo.getImage(0);
};

geo.displayImage = function() {
    var img = geo.img_queue[0];
    $(".image-panel img").attr("src", img['info']['imgurl']);
};

geo.getImage = function(offset) {
    var url = "http://clickers.micromappers.org/api/project/" + sessionStorage["current_event"] + "/newtask?offset=" + offset.toString();
    $.ajax({
        url: url,
        type: "GET"
    }).done(function(res) {
        if($.isEmptyObject(res)) {
            $(".image-panel").hide();
            $(".text-panel").html("Congratulations! You have participated in all available tasks!");
            $(".button-panel").hide();
        }
        else {
            var image_url = res['info']['imgurl'];
            if(offset === 0) {
                $(".image-panel img").attr("src", image_url);
                $(".image-panel").show();
                geo.getImage(1);
            }
            else {
                $("<img/>")[0].src = image_url;
            }
            geo.img_queue.push(res);
        }
        geo.hideLoading();
    }).fail(function() {
        geo.displayErrorMessage();
    });
};

geo.setImageSaveButtonClickCallback = function() {
    $(".footer-panel").delegate(".ui-btn", "click", function() {
        var result = $(this).text();
        var img = geo.img_queue[0];
        var text_or_tweet = geo.getTextOrTweet(img['info']['text'], img['info']['tweet']);
        var answer = {
            "project_id": parseInt(sessionStorage["current_event"], 10),
            "task_id": img["id"],
            "info": {
                "category": result,
                "platform": device.platform,
                "tweet": text_or_tweet,
                "tweetid": img["info"]["tweetid"],
                "taskid": img["id"],
                "author": img["info"]["author"],
                "url": img["info"]["url"],
                "timestamp": geo.getDateTime(),
                "lon": "0",
                "lat": "0",
                "imgurl": img["info"]["imgurl"]
            }
        };
        geo.showLoading();
        geo.saveImageResult(answer);
    });
};

geo.saveImageResult = function(answer) {
    $.ajax({
        url: "http://clickers.micromappers.org/api/taskrun",
        type: "POST",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(answer)
    }).done(function() {
        geo.img_queue.shift();
        geo.displayImage();
        geo.getImage(1);
    }).fail(function() {
        geo.displayErrorMessage();
        geo.hideLoading();
    });
};

geo.setImageShareClickCallback = function() {
    $(".share-image").click(function() {
        window.plugins.socialsharing.share(null, null, $("#image_clicker .image-panel img").attr("src"));
        return false;
    });
};
