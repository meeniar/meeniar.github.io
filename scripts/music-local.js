'use strict';

const fs = require('fs');
const path = require('path');

const audioExtensions = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav']);

function buildLocalMusicIndex(directory) {
  if (!fs.existsSync(directory)) return {};

  return fs.readdirSync(directory, { withFileTypes: true }).reduce((index, entry) => {
    if (!entry.isFile()) return index;

    const extension = path.extname(entry.name).toLowerCase();
    const songId = path.basename(entry.name, extension);
    if (!audioExtensions.has(extension) || !/^\d+$/.test(songId)) return index;

    index[songId] = `/medias/music/${entry.name}`;
    return index;
  }, {});
}

hexo.extend.generator.register('local_music_index', function () {
  const directory = path.join(hexo.base_dir, 'source', 'medias', 'music');

  return {
    path: 'medias/music/index.json',
    data: JSON.stringify(buildLocalMusicIndex(directory)),
  };
});

hexo.extend.filter.register('after_render:html', function (html) {
  if (!html.includes('<meting-js') || html.includes('/js/music-local-fallback.js')) return html;

  const fallbackScript = '<script src="/js/music-local-fallback.js"></script>';
  const metingScript = /<script\b[^>]*\bsrc=(['"])[^'"]*Meting(?:\.min)?\.js[^'"]*\1[^>]*><\/script>/i;

  return html.replace(metingScript, function (match) {
    return `${fallbackScript}\n${match}`;
  });
});
