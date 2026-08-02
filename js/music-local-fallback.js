(function () {
    'use strict';

    var originalFetch = window.fetch && window.fetch.bind(window);
    var localMusicIndex;
    var localAudioUrls = {};

    if (!originalFetch) return;

    function isNeteaseListRequest(input) {
        var requestUrl = typeof input === 'string' ? input : input && input.url;
        if (!requestUrl) return false;

        try {
            var url = new URL(requestUrl, window.location.href);
            return url.searchParams.get('server') === 'netease' &&
                ['playlist', 'album', 'artist', 'search', 'song'].indexOf(url.searchParams.get('type')) !== -1;
        } catch (error) {
            return false;
        }
    }

    function getSongId(track) {
        if (track.id && /^\d+$/.test(String(track.id))) return String(track.id);

        var match = String(track.url || '').match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }

    function getLocalMusicIndex() {
        if (!localMusicIndex) {
            localMusicIndex = originalFetch('/medias/music/index.json')
                .then(function (response) {
                    return response.ok ? response.json() : {};
                })
                .catch(function () {
                    return {};
                });
        }

        return localMusicIndex;
    }

    function getLocalAudioUrl(path) {
        if (!localAudioUrls[path]) {
            localAudioUrls[path] = originalFetch(path)
                .then(function (response) {
                    if (!response.ok) throw new Error('Unable to load local audio');
                    return response.blob();
                })
                .then(function (blob) {
                    return URL.createObjectURL(blob);
                })
                .catch(function () {
                    return null;
                });
        }

        return localAudioUrls[path];
    }

    window.fetch = function (input, init) {
        return originalFetch(input, init).then(function (response) {
            if (!isNeteaseListRequest(input) || !response.ok) return response;

            return response.clone().json().then(function (tracks) {
                if (!Array.isArray(tracks)) return response;

                return getLocalMusicIndex().then(function (index) {
                    var hasLocalTrack = false;

                    return Promise.all(tracks.map(function (track) {
                        var songId = getSongId(track);
                        if (!songId || !index[songId]) return null;

                        return getLocalAudioUrl(index[songId]).then(function (localUrl) {
                            if (localUrl) {
                                track.url = localUrl;
                                hasLocalTrack = true;
                            }
                        });
                    })).then(function () {
                        if (!hasLocalTrack) return response;

                        return new Response(JSON.stringify(tracks), {
                            status: response.status,
                            statusText: response.statusText,
                            headers: { 'Content-Type': 'application/json' },
                        });
                    });
                });
            }).catch(function () {
                return response;
            });
        });
    };
})();
