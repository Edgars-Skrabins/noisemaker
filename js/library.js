import { formatEdited } from './maps.js';

function span(className, text) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

export function mapCard({ name, meta, thumb, current = false }) {
  const item = document.createElement('li');
  item.className = 'map-card';
  item.classList.toggle('current', current);
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'map-open';
  thumb.classList.add('map-thumb');
  thumb.setAttribute('aria-hidden', 'true');
  open.append(thumb, span('map-name', name));
  if (meta) open.append(span('map-meta', meta));
  if (current) open.append(span('map-badge', 'Open'));
  item.append(open);
  return { item, open };
}

function savedThumb(src) {
  if (!src) return document.createElement('span');
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.width = 128;
  img.height = 128;
  img.decoding = 'async';
  return img;
}

export function renderSavedList(list, maps, { currentId = null, now = Date.now(), onOpen, onDelete } = {}) {
  list.replaceChildren();
  if (!maps.length) {
    const empty = document.createElement('li');
    empty.className = 'map-empty';
    empty.textContent = 'No saved maps yet. Use Save or Ctrl+S to keep the current map.';
    list.append(empty);
    return;
  }
  maps.forEach((map) => {
    const { item, open } = mapCard({
      name: map.name,
      meta: `Edited ${formatEdited(map.updated, now)}`,
      thumb: savedThumb(map.thumb),
      current: map.id === currentId,
    });
    open.title = map.name;
    open.addEventListener('click', () => onOpen(map, open));
    if (onDelete) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'tool icon-only map-delete';
      del.title = `Delete ${map.name}`;
      del.setAttribute('aria-label', `Delete ${map.name}`);
      del.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>';
      del.addEventListener('click', () => onDelete(map, del));
      item.append(del);
    }
    list.append(item);
  });
}

export function renderTemplateList(list, templates, { size = 128, onOpen } = {}) {
  list.replaceChildren();
  return templates.map((template, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const { item, open } = mapCard({ name: template.name, thumb: canvas });
    open.addEventListener('click', () => onOpen(i, open));
    list.append(item);
    return canvas;
  });
}
