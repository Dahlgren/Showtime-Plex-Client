/**
 *  Plex for showtime by Björn Dahlgren (bjorn@dahlgren.at)
 *
 *  Copyright 2011 Björn Dahlgren
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */
 
(function(plugin) {

    // URL to backend, changed and populated by settings
    var baseUrl;
    
    var settings = plugin.createSettings("Plex", plugin.path + "plex-logo.png", "Plex Client");
    settings.createString("baseUrl", "Backend Url including Port", "", function(v) {
        baseUrl = v;
    });
    
    /**
     * Display title for video during playback
     *
     * @param url URL to video
     * @param title Title of video (to display in controls)
     */
    function getVideo(url, title) {
        return "videoparams:" + showtime.JSONEncode({
            title: title,
            canonicalUrl: url,
            sources: [{
                url: url
            }]
        });
    }

    /**
     * Get available icon from backend or use the Plex logo
     *
     * @param item XML element to search for an image
     */
    function getIcon(item) {
        if (item.@thumb != null && item.@thumb.toString() != "")
            return baseUrl + item.@thumb;
        if (item.@art != null && item.@art.toString() != "")
            return baseUrl + item.@art;
        if (item.@banner != null && item.@banner.toString() != "")
            return baseUrl + item.@banner;
        return plugin.path + "plex-logo.png";
    }

    /*
     * View for a TV Show, lists seasons
     */
    plugin.addURI("plex:show:([a-z0-9\/]*)", function(page, key) {            
        page.contents = "items";
        page.type = "directory";

        var doc = new XML(showtime.httpGet(baseUrl + key).toString());

        page.metadata.logo = getIcon(doc);
        page.metadata.title = doc.@title2.toString();

        for each (var season in doc.Directory) {
            var metadata = {
                title: season.@title.toString(),
                description: season.@summary.toString(),
                icon: getIcon(season)
            };
            page.appendItem("plex:season:" + season.@key, "directory", metadata);
        }
        page.loading = false;
    });

    /*
     * View for a TV seasion, lists episodes
     */
    plugin.addURI("plex:season:([A-Za-z0-9\/]*)", function(page, key) {            
        page.contents = "video";
        page.type = "directory";

        var doc = new XML(showtime.httpGet(baseUrl + key).toString());

        page.metadata.logo = getIcon(doc);
        page.metadata.title = doc.@title2.toString();
        
        var showName;
        if (doc.@parentTitle != "")
            showName = doc.@parentTitle.toString();
        else
            showName = doc.@title2.toString();

        for each (var video in doc.Video) {
            var numbering;
            if (video.@parentIndex != null && video.@parentIndex.toString() != "")
                numbering = video.@parentIndex + "x" + video.@index;
            else
                numbering = doc.@parentIndex + "x" + video.@index;
            
            var title = numbering + " - " + video.@title;
            var metadata = {
                title: title,
                description: video.@summary,
                icon: getIcon(video)
            };
            var url = baseUrl + video.Media.Part[0].@key;
            page.appendItem(getVideo(url, showName + " - " + title), "video", metadata);
        }
        page.loading = false;
    });

    plugin.addURI("plex:section:([0-9]*)", function(page, section) {            

        page.type = "directory";

        var doc = new XML(showtime.httpGet(baseUrl + "/library/sections/" + section + "/all/").toString());

        page.metadata.logo = plugin.path + "plex-logo.png";
        page.metadata.title = doc.@title1;

        if (doc.@viewGroup == "movie") {
            page.contents = "video";

            for each (var video in doc.Video) {
                var metadata = {
                    title: video.@title.toString(),
                    description: video.@summary.toString(),
                    icon: getIcon(video)
                };
                var url = baseUrl + video.Media.Part[0].@key;
                page.appendItem(getVideo(url, video.@title.toString()), "video", metadata);
            }
        } else if (doc.@viewGroup == "show") {
            page.contents = "items";
            for each (var show in doc.Directory) {
                var metadata = {
                    title: show.@title.toString(),
                    description: show.@summary.toString(),
                    icon: getIcon(show)
                };
                page.appendItem("plex:show:" + show.@key, "directory", metadata);
            }
        }
        page.loading = false;
    });

    plugin.addURI("plex:start", function(page) {            
        page.type = "directory";
        page.contents = "items";

        var doc = new XML(showtime.httpGet(baseUrl + "/library/sections/").toString());

        page.metadata.logo = plugin.path + "plex-logo.png";
        page.metadata.title = doc.@title1.toString();

        for each (var section in doc.Directory) {
            var metadata = {
                title: section.@title.toString(),
                icon: plugin.path + "plex-logo.png"
            };
            page.appendItem("plex:section:" + section.@key, "directory", metadata);
        }
        page.loading = false;
    });

    plugin.createService("Plex", "plex:start", "video", true, plugin.path + "plex-logo.png");

})(this);
