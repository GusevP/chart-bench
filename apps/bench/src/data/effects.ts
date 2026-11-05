const query = new URLSearchParams(location.search);

export const EFFECTS = query.get('embed') === 'display' && query.has('effects');
